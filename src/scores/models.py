from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

SCORE_CATEGORIES = [
    ("reading", "Reading"),
    ("writing", "Writing"),
    ("listening", "Listening"),
    ("speaking", "Speaking"),
]

SEMESTER_CHOICES = [
    ("mid", "MID"),
    ("final", "FINAL"),
]


class ScoreConfig(models.Model):
    year = models.PositiveIntegerField(null=True, blank=True)
    semester = models.CharField(
        max_length=5, choices=SEMESTER_CHOICES, null=True, blank=True
    )
    category = models.CharField(
        max_length=10, choices=SCORE_CATEGORIES, null=True, blank=True
    )
    num_exercises = models.PositiveIntegerField(default=5)
    # formula to calc final score
    formula = models.TextField(
        default="0.30 * (ex_sum / num_exercises) + 0.30 * mid_term + 0.40 * finals"
    )

    def __str__(self):
        if self.year is None and self.semester is None and self.category is None:
            return "Global Default"
        elif self.year is not None and self.semester is None and self.category is None:
            return f"Year {self.year}"
        elif (
            self.year is not None
            and self.semester is not None
            and self.category is None
        ):
            return f"Year {self.year} - {self.get_semester_display()}"
        else:
            return f"Year {self.year} - {self.get_semester_display()} - {self.get_category_display()}"


class Score(models.Model):
    student = models.ForeignKey("students.Student", on_delete=models.CASCADE)
    year = models.PositiveIntegerField()
    semester = models.CharField(max_length=5, choices=SEMESTER_CHOICES)
    category = models.CharField(max_length=10, choices=SCORE_CATEGORIES)

    # store exercise scores as a JSON field
    exercise_scores = models.JSONField(default=list, blank=True)
    mid_term = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MaxValueValidator(100), MinValueValidator(0)],
    )
    finals = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MaxValueValidator(100), MinValueValidator(0)],
    )

    def get_config(self):
        """Get the most specific config applicable to this score"""
        # try get specific config for year, semester and category
        try:
            return ScoreConfig.objects.get(
                year=self.year, semester=self.semester, category=self.category
            )
        except ScoreConfig.DoesNotExist:
            pass

        # try get config for year and semester
        try:
            return ScoreConfig.objects.get(
                year=self.year, semester=self.semester, category=None
            )
        except ScoreConfig.DoesNotExist:
            pass

        # try get config for just year
        try:
            return ScoreConfig.objects.get(year=self.year, semester=None, category=None)
        except ScoreConfig.DoesNotExist:
            pass

        # get/create default config
        config, _ = ScoreConfig.objects.get_or_create(
            year=None,
            semester=None,
            category=None,
            defaults={
                "num_exercises": 5,
                "formula": "0.30 * (ex_sum / num_exercises) + 0.30 * mid_term + 0.40 * finals",
            },
        )
        return config

    def save(self, *args, **kwargs):
        # get applicable config
        config = self.get_config()
        # if there's more ex scores than configured, trim the list
        if self.exercise_scores and len(self.exercise_scores) > config.num_exercises:
            self.exercise_scores = self.exercise_scores[: config.num_exercises]
        super().save(*args, **kwargs)

    @property
    def score_sum(self):
        # get config
        config = self.get_config()
        ex_scores = (
            self.exercise_scores[: config.num_exercises] if self.exercise_scores else []
        )
        mid_term = self.mid_term if self.mid_term is not None else 0
        finals = self.finals if self.finals is not None else 0
        return sum(ex_scores) + mid_term + finals

    @property
    def final_score(self):
        config = self.get_config()
        ex_scores = (
            self.exercise_scores[: config.num_exercises] if self.exercise_scores else []
        )
        ex_sum = float(sum(ex_scores))
        mid_term = float(self.mid_term) if self.mid_term is not None else 0.0
        finals = float(self.finals) if self.finals is not None else 0.0

        allowed_names = {
            "ex_sum": ex_sum,
            "mid_term": mid_term,
            "finals": finals,
            "num_exercises": config.num_exercises,
        }
        try:
            result = eval(config.formula, {"__builtins__": {}}, allowed_names)
            return result
        except Exception:
            return 0

    def __str__(self):
        return f"{self.student.name} - {self.category} ({self.year} {self.semester})"
