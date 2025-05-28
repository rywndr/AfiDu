from django.core.validators import RegexValidator
from django.db import models
from django.core.exceptions import ValidationError

# Create your models here.

GENDER = [
    ("Male", "Male"),
    ("Female", "Female"),
]

LEVELS = [
    ("Mix Class", "Mix Class"),
    ("Beginner 1", "Beginner 1"),
    ("Beginner 2", "Beginner 2"),
    ("Elementary 1", "Elementary 1"),
    ("Elementary 2", "Elementary 2"),
    ("Elementary 3", "Elementary 3"),
    ("Junior 1", "Junior 1"),
    ("Junior 2", "Junior 2"),
    ("Junior 3", "Junior 3"),
    ("Senior 1", "Senior 1"),
    ("Senior 2", "Senior 2"),
    ("Senior 3", "Senior 3"),
]

phone_validator = RegexValidator(
    regex=r"^\+62\d{9,13}$",
    message="Phone number must start with +62 and contain 9-13 digits.",
)


class StudentClass(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    start_time = models.TimeField(help_text="Class start time")
    end_time = models.TimeField(help_text="Class end time")
    max_students = models.PositiveIntegerField(default=20, help_text="Maximum number of students allowed in this class")
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
        return self.student_set.count()

    @property
    def is_full(self):
        return self.current_student_count >= self.max_students

    @property
    def available_spots(self):
        return max(0, self.max_students - self.current_student_count)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.start_time.strftime('%H:%M')} - {self.end_time.strftime('%H:%M')})"


class Student(models.Model):
    profile_photo = models.ImageField(
        upload_to="profile_photos/", blank=True, null=True
    )
    name = models.CharField(max_length=100)
    gender = models.CharField(max_length=10, choices=GENDER)
    age = models.PositiveIntegerField()
    date_of_birth = models.DateField()
    contact_number = models.CharField(max_length=20, validators=[phone_validator])
    address = models.CharField(max_length=255)
    assigned_class = models.ForeignKey(
        StudentClass, on_delete=models.SET_NULL, null=True, blank=True
    )
    level = models.CharField(max_length=20, choices=LEVELS)

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
