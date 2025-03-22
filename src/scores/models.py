from django.db import models

from students.models import Student

# Create your models here.


SCORE_CATEGORIES = [
    ("reading", "Reading"),
    ("writing", "Writing"),
    ("listening", "Listening"),
    ("speaking", "Speaking"),
]

SEMESTER_CHOICES = [
    ("odd", "Odd Semester"),
    ("even", "Even Semester"),
]

class Score(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    year = models.PositiveIntegerField()
    semester = models.CharField(max_length=4, choices=SEMESTER_CHOICES)
    category = models.CharField(max_length=10, choices=SCORE_CATEGORIES)

    e1 = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    e2 = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    e3 = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    e4 = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    e5 = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    e6 = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    mid_term = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    finals = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    @property
    def score_sum(self):
        # jumlahkan semua nilai (anggap None sebagai 0)
        values = [
            self.e1,
            self.e2,
            self.e3,
            self.e4,
            self.e5,
            self.e6,
            self.mid_term,
            self.finals,
        ]
        return sum(v if v is not None else 0 for v in values)

    @property
    def final_score(self):
        # hasil akhir dibagi 8 (sesuaikan aja)
        return self.score_sum / 8 if self.score_sum else 0

    def __str__(self):
        return f"{self.student.name} - {self.category} ({self.year} {self.semester})"
