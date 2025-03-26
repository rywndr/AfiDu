from django.db import models

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

class ScoreConfig(models.Model):
    num_exercises = models.PositiveIntegerField(default=6)
    # formula to calc final score
    formula = models.TextField(default="(ex_sum + mid_term + finals) / (num_exercises + 2)")

    def __str__(self):
        return "Score Config"

class Score(models.Model):
    student = models.ForeignKey("students.Student", on_delete=models.CASCADE)
    year = models.PositiveIntegerField()
    semester = models.CharField(max_length=4, choices=SEMESTER_CHOICES)
    category = models.CharField(max_length=10, choices=SCORE_CATEGORIES)

    # store exercise scores as a JSON field
    exercise_scores = models.JSONField(default=list, blank=True)
    mid_term = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    finals = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    @property
    def score_sum(self):
        # sum exercise_scores + mid_term + finals
        ex_sum = sum(self.exercise_scores) if self.exercise_scores else 0
        mid_term = self.mid_term if self.mid_term is not None else 0
        finals = self.finals if self.finals is not None else 0
        return ex_sum + mid_term + finals

    @property
    def final_score(self):
        config, _ = ScoreConfig.objects.get_or_create(
            id=1,
            defaults={
                "num_exercises": 6,
                "formula": "(ex_sum + mid_term + finals) / (num_exercises + 2)",
            }
        )
        # change to float for division
        ex_sum = float(sum(self.exercise_scores)) if self.exercise_scores else 0.0
        mid_term = float(self.mid_term) if self.mid_term is not None else 0.0
        finals = float(self.finals) if self.finals is not None else 0.0
        num_exercises = len(self.exercise_scores) if self.exercise_scores else config.num_exercises
        allowed_names = {
            "ex_sum": ex_sum,
            "mid_term": mid_term,
            "finals": finals,
            "num_exercises": num_exercises
        }
        try:
            result = eval(config.formula, {"__builtins__": {}}, allowed_names)
            return result
        except Exception:
            return 0

    def __str__(self):
        return f"{self.student.name} - {self.category} ({self.year} {self.semester})"
