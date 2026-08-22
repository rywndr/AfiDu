from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models, transaction

from core.constants import SEMESTER_CHOICES, SUBJECT_CATEGORIES

# kept for backwards compatibility with existing imports
SCORE_CATEGORIES = SUBJECT_CATEGORIES

ZERO = Decimal("0.00")


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
    student = models.ForeignKey(
        "students.Student", on_delete=models.CASCADE, related_name="scores"
    )
    year = models.PositiveIntegerField()
    semester = models.CharField(max_length=5, choices=SEMESTER_CHOICES)
    category = models.CharField(max_length=10, choices=SCORE_CATEGORIES)

    # Exercise scores now live in ScoreEntry rows so each one can point at the
    # assignment or material that produced it. This column is kept (unused) so
    # the migration is reversible.
    legacy_exercise_scores = models.JSONField(default=list, blank=True)
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

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["student", "year", "semester", "category"],
                name="score_student_period_category_uniq",
            ),
        ]
        indexes = [
            models.Index(
                fields=["year", "semester", "category"], name="score_period_idx"
            ),
        ]

    def __init__(self, *args, **kwargs):
        # `exercise_scores` is a property now, so it cannot be passed to the
        # model constructor the way a concrete field could be.
        pending = kwargs.pop("exercise_scores", None)
        super().__init__(*args, **kwargs)
        self._pending_entries = None
        if pending is not None:
            self.exercise_scores = pending

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

    # ------------------------------------------------------------------
    # exercise scores
    #
    # Callers keep treating this as a plain list of numbers; underneath it is a
    # set of ScoreEntry rows. Writes are buffered so a caller can assign to an
    # unsaved instance and then save it (which is what ScoreForm does).
    # ------------------------------------------------------------------

    def exercise_points(self, num_exercises=None):
        """The ordered exercise scores, padded to the configured length."""
        if num_exercises is None:
            num_exercises = self.get_config().num_exercises

        if self._pending_entries is not None:
            values = list(self._pending_entries)
        elif self.pk:
            # uses the prefetch cache when `entries` was prefetched
            by_slot = {e.slot: e.points for e in self.entries.all()}
            values = [by_slot.get(slot) for slot in range(1, num_exercises + 1)]
        else:
            values = []

        values = values[:num_exercises]
        values += [None] * (num_exercises - len(values))
        # historically the JSON column stored 0 rather than null for a blank
        # exercise, and every consumer relies on that
        return [ZERO if v is None else v for v in values]

    def set_exercise_scores(self, values):
        """Buffer new exercise scores; they are written on ``save()``."""
        self._pending_entries = [
            None if v is None else (v if isinstance(v, Decimal) else Decimal(str(v)))
            for v in (values or [])
        ]

    @property
    def exercise_scores(self):
        return self.exercise_points()

    @exercise_scores.setter
    def exercise_scores(self, values):
        self.set_exercise_scores(values)

    @transaction.atomic
    def _flush_pending_entries(self, num_exercises):
        values = self._pending_entries[:num_exercises]
        existing = {e.slot: e for e in self.entries.all()}

        to_create, to_update = [], []
        for index, value in enumerate(values, start=1):
            entry = existing.get(index)
            if entry is None:
                to_create.append(
                    ScoreEntry(score=self, slot=index, points=value)
                )
            elif entry.points != value:
                entry.points = value
                to_update.append(entry)

        if to_create:
            ScoreEntry.objects.bulk_create(to_create)
        if to_update:
            ScoreEntry.objects.bulk_update(to_update, ["points", "updated_at"])

        # drop slots beyond the configured exercise count
        stale = [slot for slot in existing if slot > len(values)]
        if stale:
            self.entries.filter(slot__in=stale).delete()

        self._pending_entries = None

    def save(self, *args, **kwargs):
        # get applicable config
        config = self.get_config()
        # if there's more ex scores than configured, trim the list
        if (
            self._pending_entries is not None
            and len(self._pending_entries) > config.num_exercises
        ):
            self._pending_entries = self._pending_entries[: config.num_exercises]

        super().save(*args, **kwargs)

        if self._pending_entries is not None:
            self._flush_pending_entries(config.num_exercises)

    @property
    def score_sum(self):
        # get config
        config = self.get_config()
        ex_scores = self.exercise_points(config.num_exercises)
        mid_term = self.mid_term if self.mid_term is not None else ZERO
        finals = self.finals if self.finals is not None else ZERO
        return sum(ex_scores, ZERO) + mid_term + finals

    @property
    def final_score(self):
        config = self.get_config()
        ex_scores = self.exercise_points(config.num_exercises)
        ex_sum = float(sum(ex_scores, ZERO))
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


class ScoreEntry(models.Model):
    """
    One exercise slot on a Score.

    Slots are 1-indexed and bounded by ``ScoreConfig.num_exercises``. An entry
    may record where its value came from: a graded assignment submission, a
    study material, or manual entry by a teacher.
    """

    SOURCE_MANUAL = "manual"
    SOURCE_ASSIGNMENT = "assignment"
    SOURCE_MATERIAL = "material"
    SOURCE_QUIZ = "quiz"
    SOURCE_CHOICES = [
        (SOURCE_MANUAL, "Manual"),
        (SOURCE_ASSIGNMENT, "Assignment"),
        (SOURCE_MATERIAL, "Study material"),
        (SOURCE_QUIZ, "Quiz"),
    ]

    score = models.ForeignKey(Score, on_delete=models.CASCADE, related_name="entries")
    slot = models.PositiveSmallIntegerField(help_text="1-indexed exercise position.")
    points = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MaxValueValidator(100), MinValueValidator(0)],
    )
    source = models.CharField(
        max_length=20, choices=SOURCE_CHOICES, default=SOURCE_MANUAL
    )

    assignment = models.ForeignKey(
        "assignments.Assignment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="score_entries",
    )
    material = models.ForeignKey(
        "study_materials.StudyMaterial",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="score_entries",
    )
    submission = models.ForeignKey(
        "assignments.Submission",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="score_entries",
    )

    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["score", "slot"]
        verbose_name = "score entry"
        verbose_name_plural = "score entries"
        constraints = [
            models.UniqueConstraint(
                fields=["score", "slot"], name="score_entry_slot_uniq"
            ),
            models.CheckConstraint(
                condition=models.Q(slot__gte=1), name="score_entry_slot_min"
            ),
            # an entry is sourced from an assignment or a material, not both
            models.CheckConstraint(
                condition=models.Q(assignment__isnull=True)
                | models.Q(material__isnull=True),
                name="score_entry_single_source",
            ),
        ]

    def __str__(self):
        return f"{self.score_id} slot {self.slot}: {self.points}"
