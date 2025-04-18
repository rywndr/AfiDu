from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        """
        create and save regular user (defaults to teacher role).
        """
        if not email:
            raise ValueError("The Email must be set")
        email = self.normalize_email(email)

        # default role and active
        extra_fields.setdefault("role", CustomUser.ROLE_TEACHER)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_staff", False)

        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra_fields):
        """
        create and save a superuser.
        """
        extra_fields.setdefault("role", CustomUser.ROLE_SUPERUSER)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if not extra_fields.get("is_staff"):
            raise ValueError("Superuser must have is_staff=True.")
        if not extra_fields.get("is_superuser"):
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    ROLE_TEACHER = "teacher"
    ROLE_SUPERUSER = "superuser"
    ROLE_CHOICES = [
        (ROLE_TEACHER, "Teacher"),
        (ROLE_SUPERUSER, "Superuser"),
    ]

    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=30, blank=True)

    # built‑in flags
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default=ROLE_TEACHER,
        help_text="Select whether this user is a Teacher (staff) or a Superuser.",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []  # email is already required

    objects = CustomUserManager()

    class Meta:
        verbose_name = "user"

    def __str__(self):
        return self.email
