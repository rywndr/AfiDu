from django.core.validators import RegexValidator
from django.db import models

# Create your models here.
CLASSES = [
    ("A", "Class A"),
    ("B", "Class B"),
    ("C", "Class C"),
]

GENDER = [
    ("M", "Male"),
    ("F", "Female"),
]

phone_validator = RegexValidator(
    regex=r"^\+62\d{9,13}$",
    message="Phone number must start with +62 and contain 9-13 digits.",
)


class Student(models.Model):
    profile_photo = models.ImageField(
        upload_to="profile_photos/", blank=True, null=True
    )
    name = models.CharField(max_length=100)
    gender = models.CharField(max_length=1, choices=GENDER)
    age = models.PositiveIntegerField()
    date_of_birth = models.DateField()
    contact_number = models.CharField(max_length=20, validators=[phone_validator])
    address = models.CharField(max_length=255)
    assigned_class = models.CharField(max_length=1, choices=CLASSES)

    def __str__(self):
        return self.name
