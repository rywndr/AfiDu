from django.core.validators import RegexValidator
from django.db import models

# Create your models here.

GENDER = [
    ("Male", "Male"),
    ("Female", "Female"),
]

LEVELS = [
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
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Class"
        verbose_name_plural = "Classes"

    def __str__(self):
        return self.name

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

    def __str__(self):
        return self.name
