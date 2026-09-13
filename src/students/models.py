from django.db import models, transaction
from django.core.exceptions import ValidationError
from django.utils.text import slugify

from core.constants import (
    DAYS_OF_WEEK,
    DAYS_SHORT,
    GENDER,
    LEVELS,
    phone_validator,
)

from .identifiers import generate_student_public_id

# Create your models here.

__all__ = [
    "DAYS_OF_WEEK",
    "GENDER",
    "LEVELS",
    "phone_validator",
    "StudentClass",
    "Student",
]


class StudentClass(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True, editable=False)
    description = models.TextField(blank=True)
    start_time = models.TimeField(help_text="Class start time")
    end_time = models.TimeField(help_text="Class end time")
    max_students = models.PositiveIntegerField(default=20, help_text="Maximum number of students allowed in this class")
    days = models.JSONField(default=list, blank=True, help_text="Days when this class runs")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        super().clean()
        if self.start_time and self.end_time:
            if self.start_time >= self.end_time:
                raise ValidationError({
                    'end_time': 'End time must be after start time.'
                })

    @property
    def current_student_count(self):
        # `student_count` is supplied by an annotation where the callers render
        # many classes at once; fall back to a COUNT for a lone instance.
        annotated = getattr(self, "student_count", None)
        if annotated is not None:
            return annotated
        return self.student_set.count()

    @property
    def is_full(self):
        return self.current_student_count >= self.max_students

    @property
    def available_spots(self):
        return max(0, self.max_students - self.current_student_count)

    @property
    def days_display(self):
        if not self.days:
            return "No days set"
        
        day_names = []
        days_map = dict(DAYS_OF_WEEK)
        for day in self.days:
            if day in days_map:
                day_names.append(days_map[day])
        
        if not day_names:
            return "No days set"
        
        return ", ".join(day_names)

    @property
    def days_short_display(self):
        if not self.days:
            return "N/A"

        short_names = [DAYS_SHORT[day] for day in self.days if day in DAYS_SHORT]

        if not short_names:
            return "N/A"

        return ", ".join(short_names)

    class Meta:
        ordering = ["name"]

    def _build_slug(self):
        base = slugify(self.name)[:110] or "class"
        slug = base
        suffix = 2
        queryset = type(self).objects.exclude(pk=self.pk) if self.pk else type(self).objects.all()
        while queryset.filter(slug=slug).exists():
            slug = f"{base}-{suffix}"
            suffix += 1
        return slug

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._build_slug()
            update_fields = kwargs.get("update_fields")
            if update_fields is not None and "slug" not in update_fields:
                kwargs["update_fields"] = set(update_fields) | {"slug"}
        super().save(*args, **kwargs)

    def __str__(self):
        days_str = self.days_short_display if self.days else "No schedule"
        return f"{self.name} ({self.start_time.strftime('%H:%M')} - {self.end_time.strftime('%H:%M')}, {days_str})"


class Student(models.Model):
    name = models.CharField(max_length=100)
    public_id = models.CharField(
        max_length=22,
        default=generate_student_public_id,
        editable=False,
        unique=True,
    )
    gender = models.CharField(max_length=10, choices=GENDER)
    age = models.PositiveIntegerField()
    date_of_birth = models.DateField()
    contact_number = models.CharField(max_length=20, validators=[phone_validator])
    address = models.CharField(max_length=255)
    assigned_class = models.ForeignKey(
        StudentClass, on_delete=models.SET_NULL, null=True, blank=True
    )
    level = models.CharField(max_length=20, choices=LEVELS)

    # e-learning login. Provisioned explicitly (see provision_login) rather than
    # created alongside the student record, because not every student needs one.
    email = models.EmailField(
        blank=True,
        help_text="Email used for the student's e-learning login.",
    )
    user = models.OneToOneField(
        "login.CustomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="student_profile",
        help_text="Linked e-learning account, if one has been provisioned.",
    )

    @property
    def has_login(self):
        return self.user_id is not None

    @transaction.atomic
    def provision_login(self, email=None, password=None):
        """
        Create (or re-link) the e-learning account for this student.

        Returns the ``CustomUser``. Raises ``ValidationError`` if no email is
        available or the email is already taken by another account.
        """
        from login.models import CustomUser

        email = (email or self.email or "").strip().lower()
        if not email:
            raise ValidationError(
                {"email": "An email address is required to provision a login."}
            )

        if self.user_id:
            # already provisioned; just rotate the password if one was given
            if password:
                self.user.set_student_password(password)
            return self.user

        clash = CustomUser.objects.filter(email__iexact=email).first()
        if clash is not None:
            raise ValidationError(
                {"email": f"{email} is already used by another account."}
            )

        first_name, _, last_name = self.name.partition(" ")
        user = CustomUser.objects.create_student_user(
            email=email,
            password=password,
            first_name=first_name[:30],
            last_name=last_name[:30],
        )

        self.user = user
        self.email = email
        self.save(update_fields=["user", "email"])
        return user

    def clean(self):
        super().clean()
        if self.assigned_class and self.assigned_class.is_full:
            # chk if new student or changing classes
            if self.pk:
                try:
                    original = Student.objects.get(pk=self.pk)
                    # Allow if staying in the same class
                    if original.assigned_class == self.assigned_class:
                        return
                except Student.DoesNotExist:
                    pass
            
            # prevent assignment to full class
            raise ValidationError({
                'assigned_class': f"Cannot assign to '{self.assigned_class.name}'. Class is at maximum capacity."
            })

    def __str__(self):
        return self.name
