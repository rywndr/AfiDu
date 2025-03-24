import calendar

from django.db import models

from students.models import Student

# Create your models here.


class Payment(models.Model):
    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name="payments"
    )
    year = models.PositiveIntegerField()
    month = models.PositiveSmallIntegerField(
        choices=[(i, calendar.month_name[i]) for i in range(1, 13)]
    )
    paid = models.BooleanField(default=False)

    class Meta:
        unique_together = (
            "student",
            "year",
            "month",
        )  # ensure one record per student/month/year

    def __str__(self):
        return f"{self.student.name} - {calendar.month_name[self.month]} {self.year}"
