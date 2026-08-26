import ast
import operator
from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models, transaction

from core.constants import SEMESTER_CHOICES, SUBJECT_CATEGORIES

# kept for backwards compatibility with existing imports
SCORE_CATEGORIES = SUBJECT_CATEGORIES

ZERO = Decimal("0.00")
HUNDRED = Decimal("100")

SCORE_SOURCE_MANUAL = "manual"
SCORE_SOURCE_ASSIGNMENT = "assignment"
SCORE_SOURCE_QUIZ = "quiz"
SCORE_SOURCE_CHOICES = [
    (SCORE_SOURCE_MANUAL, "Manual"),
    (SCORE_SOURCE_ASSIGNMENT, "Assignment"),
    (SCORE_SOURCE_QUIZ, "Quiz"),
]

FORMULA_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
}


def evaluate_score_formula(formula, values):
    """Evaluate the small arithmetic language used by saved score formulas."""

    def evaluate(node):
        if isinstance(node, ast.Expression):
            return evaluate(node.body)
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return Decimal(str(node.value))
        if isinstance(node, ast.Name) and node.id in values:
            return Decimal(str(values[node.id]))
        if isinstance(node, ast.BinOp) and type(node.op) in FORMULA_OPERATORS:
            return FORMULA_OPERATORS[type(node.op)](
                evaluate(node.left), evaluate(node.right)
            )
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
            value = evaluate(node.operand)
            return value if isinstance(node.op, ast.UAdd) else -value
        raise ValueError("Unsupported score formula")

    return evaluate(ast.parse(formula, mode="eval"))


def percentage_formula(exercises, mid_term, finals):
    """Build the stored formula from teacher-facing percentage weights."""

    def factor(percent):
        return format(Decimal(percent) / HUNDRED, "f")

    return (
        f"{factor(exercises)} * (ex_sum / num_exercises) + "
        f"{factor(mid_term)} * mid_term + {factor(finals)} * finals"
    )


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

    # There are only ever a handful of rows, but resolving one used to cost up
    # to four queries and it is resolved once per Score. Callers that resolve
    # many periods take a snapshot() first and hand it to resolve().
    @classmethod
    def snapshot(cls):
        """The whole (tiny) config table, keyed by period, in one query."""
        return {(c.year, c.semester, c.category): c for c in cls.objects.all()}

    @classmethod
    def resolve(cls, year=None, semester=None, category=None, configs=None):
        """
        The most specific config for a period.

        Pass ``configs`` (a :meth:`snapshot`) when resolving several periods so
        the table is only read once.
        """
        if configs is None:
            configs = cls.snapshot()

        try:
            year = int(year) if year not in (None, "", "None") else None
        except (TypeError, ValueError):
            year = None
        semester = semester or None
        category = category or None

        candidates = [(None, None, None)]
        if year is not None:
            candidates.insert(0, (year, None, None))
            if semester is not None:
                candidates.insert(0, (year, semester, None))
                if category is not None:
                    candidates.insert(0, (year, semester, category))

        for key in candidates:
            config = configs.get(key)
            if config is not None:
                return config

        # no global default yet
        return cls.objects.create(
            num_exercises=5,
            formula="0.30 * (ex_sum / num_exercises) + 0.30 * mid_term + 0.40 * finals",
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

    def weight_percentages(self):
        """Return exercise, midterm, and final contributions on a 0-100 scale."""
        zeroes = {
            "ex_sum": ZERO,
            "mid_term": ZERO,
            "finals": ZERO,
            "num_exercises": self.num_exercises,
        }
        try:
            baseline = evaluate_score_formula(self.formula, zeroes)
            exercises = evaluate_score_formula(
                self.formula,
                {
                    **zeroes,
                    "ex_sum": HUNDRED * self.num_exercises,
                },
            ) - baseline
            mid_term = evaluate_score_formula(
                self.formula, {**zeroes, "mid_term": HUNDRED}
            ) - baseline
            finals = evaluate_score_formula(
                self.formula, {**zeroes, "finals": HUNDRED}
            ) - baseline
            precision = Decimal("0.01")
            total = (exercises + mid_term + finals).quantize(precision)
            exercises = exercises.quantize(precision)
            mid_term = mid_term.quantize(precision)
            return exercises, mid_term, total - exercises - mid_term
        except (ArithmeticError, SyntaxError, TypeError, ValueError):
            return Decimal("30.00"), Decimal("30.00"), Decimal("40.00")


class Score(models.Model):
    student = models.ForeignKey(
        "students.Student", on_delete=models.CASCADE, related_name="scores"
    )
    year = models.PositiveIntegerField()
    semester = models.CharField(max_length=5, choices=SEMESTER_CHOICES)
    category = models.CharField(max_length=10, choices=SCORE_CATEGORIES)

    # Exercise scores now live in ScoreEntry rows so each one can point at the
    # assignment that produced it. This column is kept (unused) so the migration
    # is reversible.
    legacy_exercise_scores = models.JSONField(default=list, blank=True)
    mid_term = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MaxValueValidator(100), MinValueValidator(0)],
    )
    mid_term_source = models.CharField(
        max_length=20, choices=SCORE_SOURCE_CHOICES, default=SCORE_SOURCE_MANUAL
    )
    mid_term_assignment = models.ForeignKey(
        "assignments.Assignment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="mid_term_scores",
    )
    mid_term_note = models.CharField(max_length=255, blank=True)
    finals = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MaxValueValidator(100), MinValueValidator(0)],
    )
    finals_source = models.CharField(
        max_length=20, choices=SCORE_SOURCE_CHOICES, default=SCORE_SOURCE_MANUAL
    )
    finals_assignment = models.ForeignKey(
        "assignments.Assignment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="final_scores",
    )
    finals_note = models.CharField(max_length=255, blank=True)

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
        self._config_cache = None
        if pending is not None:
            self.exercise_scores = pending

    def get_config(self):
        """Get the most specific config applicable to this score"""
        # cached per instance: score_sum/final_score/exercise_points each need it
        if self._config_cache is None:
            self._config_cache = ScoreConfig.resolve(
                self.year, self.semester, self.category
            )
        return self._config_cache

    def set_config(self, config):
        """
        Seed this score's config.

        Lets a caller resolving a whole page of scores read ScoreConfig once
        instead of once per score.
        """
        self._config_cache = config

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
        ex_sum = sum(ex_scores, ZERO)
        mid_term = self.mid_term if self.mid_term is not None else ZERO
        finals = self.finals if self.finals is not None else ZERO

        allowed_names = {
            "ex_sum": ex_sum,
            "mid_term": mid_term,
            "finals": finals,
            "num_exercises": config.num_exercises,
        }
        try:
            return evaluate_score_formula(config.formula, allowed_names)
        except (ArithmeticError, SyntaxError, TypeError, ValueError):
            return ZERO

    def __str__(self):
        return f"{self.student.name} - {self.category} ({self.year} {self.semester})"


class ScoreEntry(models.Model):
    """
    One exercise slot on a Score.

    Slots are 1-indexed and bounded by ``ScoreConfig.num_exercises``. An entry
    may record where its value came from: a graded assignment submission, or
    manual entry by a teacher. Study materials are not graded, so an entry never
    points at one.
    """

    SOURCE_MANUAL = SCORE_SOURCE_MANUAL
    SOURCE_ASSIGNMENT = SCORE_SOURCE_ASSIGNMENT
    SOURCE_QUIZ = SCORE_SOURCE_QUIZ
    SOURCE_CHOICES = SCORE_SOURCE_CHOICES

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
        ]

    def __str__(self):
        return f"{self.score_id} slot {self.slot}: {self.points}"
