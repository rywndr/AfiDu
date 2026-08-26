"""
definitions used across apps.

Each app still re-exports them under its historical name
so existing imports keep working.
"""

from django.core.validators import RegexValidator

DAYS_OF_WEEK = [
    ("monday", "Monday"),
    ("tuesday", "Tuesday"),
    ("wednesday", "Wednesday"),
    ("thursday", "Thursday"),
    ("friday", "Friday"),
    ("saturday", "Saturday"),
    ("sunday", "Sunday"),
]

DAYS_SHORT = {
    "monday": "Mon",
    "tuesday": "Tue",
    "wednesday": "Wed",
    "thursday": "Thu",
    "friday": "Fri",
    "saturday": "Sat",
    "sunday": "Sun",
}

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

# reading / writing / listening / speaking. Shared by scores, study materials
# and assignments so a score can be tied to the material that produced it.
SUBJECT_CATEGORIES = [
    ("reading", "Reading"),
    ("writing", "Writing"),
    ("listening", "Listening"),
    ("speaking", "Speaking"),
]

SEMESTER_CHOICES = [
    ("mid", "MID"),
    ("final", "FINAL"),
]

MAX_SCORE_EXERCISES = 10
SCORE_TARGET_CHOICES = [
    *[
        (f"exercise_{slot}", f"Exercise {slot}")
        for slot in range(1, MAX_SCORE_EXERCISES + 1)
    ],
    ("mid_term", "Mid Term"),
    ("finals", "Finals"),
]

phone_validator = RegexValidator(
    regex=r"^\+62\d{9,13}$",
    message="Phone number must start with +62 and contain 9-13 digits.",
)
