from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models, transaction
from django.db.models.signals import post_delete
from django.dispatch import receiver
from django.utils import timezone
from django.utils.text import slugify

from core.constants import LEVELS, SEMESTER_CHOICES, SUBJECT_CATEGORIES


class Assignment(models.Model):
    """
    A piece of work handed to a level or a single class.

    An assignment has no type of its own: it carries whatever mix of questions a
    teacher adds, and each ``Question.kind`` decides whether that answer is
    scored from an answer key or marked by hand.
    """

    STATUS_DRAFT = "draft"
    STATUS_PUBLISHED = "published"
    STATUS_ARCHIVED = "archived"
    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_PUBLISHED, "Published"),
        (STATUS_ARCHIVED, "Archived"),
    ]

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    description = models.TextField(blank=True)

    category = models.CharField(max_length=20, choices=SUBJECT_CATEGORIES)
    level = models.CharField(max_length=20, choices=LEVELS)
    student_class = models.ForeignKey(
        "students.StudentClass",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assignments",
        help_text="Restrict to a single class. Leave empty to target the whole level.",
    )
    material = models.ForeignKey(
        "study_materials.StudyMaterial",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assignments",
        help_text="Reference material students should read for this assignment.",
    )

    # which score column this assignment feeds, if any
    year = models.PositiveIntegerField(null=True, blank=True)
    semester = models.CharField(
        max_length=5, choices=SEMESTER_CHOICES, null=True, blank=True
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assignments_created",
    )

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT
    )
    open_at = models.DateTimeField(null=True, blank=True)
    due_at = models.DateTimeField(null=True, blank=True)

    time_limit_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Minutes allowed once started. Leave empty for untimed work.",
    )
    max_attempts = models.PositiveSmallIntegerField(default=1)
    allow_late = models.BooleanField(default=False)
    allow_file_upload = models.BooleanField(default=False)
    auto_grade = models.BooleanField(
        default=False, help_text="Score objective questions on submit."
    )
    shuffle_questions = models.BooleanField(default=False)
    reveal_answers_after_submit = models.BooleanField(default=False)

    max_points = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=Decimal("100.00"),
        validators=[MinValueValidator(Decimal("0"))],
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["status", "level", "category"], name="assignment_visible_idx"
            ),
            models.Index(fields=["due_at"], name="assignment_due_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(due_at__isnull=True)
                | models.Q(open_at__isnull=True)
                | models.Q(due_at__gt=models.F("open_at")),
                name="assignment_due_after_open",
            ),
            models.CheckConstraint(
                condition=models.Q(time_limit_minutes__isnull=True)
                | models.Q(time_limit_minutes__gt=0),
                name="assignment_time_limit_positive",
            ),
            models.CheckConstraint(
                condition=models.Q(max_attempts__gte=1),
                name="assignment_max_attempts_min",
            ),
        ]

    def __str__(self):
        return self.title

    @property
    def is_timed(self):
        return self.time_limit_minutes is not None

    @property
    def is_open(self):
        """Whether students can start or submit an attempt right now."""
        if self.status != self.STATUS_PUBLISHED:
            return False
        now = timezone.now()
        if self.open_at and now < self.open_at:
            return False
        if self.due_at and now > self.due_at and not self.allow_late:
            return False
        return True

    def is_visible_to(self, student):
        if self.status != self.STATUS_PUBLISHED or student is None:
            return False
        if self.student_class_id is not None:
            return student.assigned_class_id == self.student_class_id
        return student.level == self.level

    def clean(self):
        super().clean()
        errors = {}

        if self.due_at and self.open_at and self.due_at <= self.open_at:
            errors["due_at"] = "Due date must be after the open date."

        if self.max_attempts is not None and self.max_attempts < 1:
            errors["max_attempts"] = "At least one attempt must be allowed."

        if errors:
            raise ValidationError(errors)

    def _build_slug(self):
        base = slugify(self.title)[:250] or "assignment"
        slug = base
        suffix = 2
        qs = Assignment.objects.exclude(pk=self.pk) if self.pk else Assignment.objects.all()
        while qs.filter(slug=slug).exists():
            slug = f"{base}-{suffix}"
            suffix += 1
        return slug

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._build_slug()
        super().save(*args, **kwargs)


class Question(models.Model):
    KIND_MULTIPLE_CHOICE = "multiple_choice"
    KIND_MULTI_SELECT = "multi_select"
    KIND_TRUE_FALSE = "true_false"
    KIND_SHORT_TEXT = "short_text"
    KIND_ESSAY = "essay"
    KIND_FILE_UPLOAD = "file_upload"
    KIND_AUDIO_RECORDING = "audio_recording"
    KIND_CHOICES = [
        (KIND_MULTIPLE_CHOICE, "Multiple choice"),
        (KIND_MULTI_SELECT, "Multi select"),
        (KIND_TRUE_FALSE, "True / false"),
        (KIND_SHORT_TEXT, "Short text"),
        (KIND_ESSAY, "Essay"),
        (KIND_FILE_UPLOAD, "File upload"),
        (KIND_AUDIO_RECORDING, "Recorded audio"),
    ]
    # question kinds that carry QuestionChoice rows and can be auto-scored
    CHOICE_KINDS = {KIND_MULTIPLE_CHOICE, KIND_MULTI_SELECT, KIND_TRUE_FALSE}

    assignment = models.ForeignKey(
        Assignment, on_delete=models.CASCADE, related_name="questions"
    )
    order = models.PositiveSmallIntegerField(default=1)
    kind = models.CharField(
        max_length=20, choices=KIND_CHOICES, default=KIND_MULTIPLE_CHOICE
    )
    prompt = models.TextField()
    audio = models.FileField(
        upload_to="questions/%Y/%m/",
        blank=True,
        validators=[FileExtensionValidator(["mp3"])],
        help_text="Optional MP3 played with the question.",
    )
    points = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=Decimal("1.00"),
        validators=[MinValueValidator(Decimal("0"))],
    )
    explanation = models.TextField(
        blank=True, help_text="Shown after submission when answers are revealed."
    )
    is_required = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["assignment", "order"]
        constraints = [
            models.UniqueConstraint(
                fields=["assignment", "order"], name="question_assignment_order_uniq"
            ),
        ]

    def __str__(self):
        return f"Q{self.order}: {self.prompt[:50]}"

    def save(self, *args, **kwargs):
        old_audio = None
        if self.pk:
            old_audio = type(self).objects.filter(pk=self.pk).values_list(
                "audio", flat=True
            ).first()
        super().save(*args, **kwargs)
        if old_audio and old_audio != self.audio.name:
            self.audio.storage.delete(old_audio)

    @property
    def has_choices(self):
        return self.kind in self.CHOICE_KINDS

    @property
    def is_auto_gradable(self):
        return self.has_choices


@receiver(post_delete, sender=Question)
def delete_question_audio(sender, instance, **kwargs):
    if instance.audio:
        instance.audio.delete(save=False)


class QuestionChoice(models.Model):
    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="choices"
    )
    order = models.PositiveSmallIntegerField(default=1)
    text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)

    class Meta:
        ordering = ["question", "order"]
        constraints = [
            models.UniqueConstraint(
                fields=["question", "order"], name="choice_question_order_uniq"
            ),
        ]

    def __str__(self):
        return self.text[:50]


class Submission(models.Model):
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_SUBMITTED = "submitted"
    STATUS_GRADED = "graded"
    STATUS_RETURNED = "returned"
    STATUS_CHOICES = [
        (STATUS_IN_PROGRESS, "In progress"),
        (STATUS_SUBMITTED, "Submitted"),
        (STATUS_GRADED, "Graded"),
        (STATUS_RETURNED, "Returned"),
    ]

    assignment = models.ForeignKey(
        Assignment, on_delete=models.CASCADE, related_name="submissions"
    )
    student = models.ForeignKey(
        "students.Student", on_delete=models.CASCADE, related_name="submissions"
    )
    attempt_number = models.PositiveSmallIntegerField(default=1)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_IN_PROGRESS
    )

    started_at = models.DateTimeField(default=timezone.now)
    submitted_at = models.DateTimeField(null=True, blank=True)
    graded_at = models.DateTimeField(null=True, blank=True)
    graded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="submissions_graded",
    )

    time_spent_seconds = models.PositiveIntegerField(null=True, blank=True)
    auto_score = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True
    )
    manual_score = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True
    )
    total_score = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True
    )
    feedback = models.TextField(blank=True)
    is_late = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-started_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["assignment", "student", "attempt_number"],
                name="submission_attempt_uniq",
            ),
            models.CheckConstraint(
                condition=models.Q(attempt_number__gte=1),
                name="submission_attempt_min",
            ),
        ]
        indexes = [
            models.Index(fields=["assignment", "status"], name="submission_asg_status_idx"),
            models.Index(fields=["student", "status"], name="submission_stu_status_idx"),
        ]

    def __str__(self):
        return f"{self.student} - {self.assignment} (attempt {self.attempt_number})"

    def clean(self):
        super().clean()
        if self.attempt_number and self.assignment_id:
            if self.attempt_number > self.assignment.max_attempts:
                raise ValidationError(
                    {
                        "attempt_number": (
                            f"{self.assignment} allows only "
                            f"{self.assignment.max_attempts} attempt(s)."
                        )
                    }
                )

    @transaction.atomic
    def grade_objective(self):
        """
        Score every auto-gradable answer, then refresh ``auto_score``.

        Answers to essay/short-text/file questions are left untouched for a
        human to mark. Returns the computed ``auto_score``.
        """
        answers = self.answers.select_related("question", "selected_choice").prefetch_related(
            "question__choices", "selected_choices"
        )

        total = Decimal("0.00")
        to_update = []

        for answer in answers:
            question = answer.question
            if not question.is_auto_gradable:
                continue

            correct_ids = {c.pk for c in question.choices.all() if c.is_correct}

            if question.kind == Question.KIND_MULTI_SELECT:
                chosen_ids = {c.pk for c in answer.selected_choices.all()}
            else:
                chosen_ids = (
                    {answer.selected_choice_id}
                    if answer.selected_choice_id is not None
                    else set()
                )

            # a choice question with no correct answer configured cannot be
            # graded; treat it as unanswered rather than silently awarding 0
            if not correct_ids:
                answer.is_correct = None
                answer.awarded_points = None
            else:
                answer.is_correct = chosen_ids == correct_ids
                answer.awarded_points = (
                    question.points if answer.is_correct else Decimal("0.00")
                )
                total += answer.awarded_points

            to_update.append(answer)

        if to_update:
            SubmissionAnswer.objects.bulk_update(
                to_update, ["is_correct", "awarded_points"]
            )

        self.auto_score = total
        self.recalculate_total(save=False)
        self.save(update_fields=["auto_score", "total_score", "updated_at"])
        return self.auto_score

    def recalculate_total(self, save=True):
        """``total_score`` is auto + manual, or None when neither is set."""
        if self.auto_score is None and self.manual_score is None:
            self.total_score = None
        else:
            self.total_score = (self.auto_score or Decimal("0.00")) + (
                self.manual_score or Decimal("0.00")
            )
        if save:
            self.save(update_fields=["total_score", "updated_at"])
        return self.total_score

    def mark_submitted(self, when=None):
        """Close the attempt, flagging lateness against the assignment due date."""
        when = when or timezone.now()
        self.submitted_at = when
        self.status = self.STATUS_SUBMITTED
        due = self.assignment.due_at
        self.is_late = bool(due and when > due)
        if self.started_at:
            self.time_spent_seconds = max(
                0, int((when - self.started_at).total_seconds())
            )
        self.save(
            update_fields=[
                "submitted_at",
                "status",
                "is_late",
                "time_spent_seconds",
                "updated_at",
            ]
        )
        if self.assignment.auto_grade:
            self.grade_objective()
        return self


class SubmissionAnswer(models.Model):
    submission = models.ForeignKey(
        Submission, on_delete=models.CASCADE, related_name="answers"
    )
    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="answers"
    )

    # single-choice questions use selected_choice; multi_select uses selected_choices
    selected_choice = models.ForeignKey(
        QuestionChoice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="answers",
    )
    selected_choices = models.ManyToManyField(
        QuestionChoice, blank=True, related_name="multi_answers"
    )
    text_answer = models.TextField(blank=True)

    is_correct = models.BooleanField(null=True, blank=True)
    awarded_points = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True
    )
    feedback = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["submission", "question"]
        constraints = [
            models.UniqueConstraint(
                fields=["submission", "question"], name="answer_submission_question_uniq"
            ),
        ]

    def __str__(self):
        return f"answer to {self.question_id}"


class SubmissionFile(models.Model):
    submission = models.ForeignKey(
        Submission, on_delete=models.CASCADE, related_name="files"
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="files",
        help_text="Set when the upload answers one specific question.",
    )
    file = models.FileField(upload_to="submissions/%Y/%m/")
    original_filename = models.CharField(max_length=255, blank=True)
    size_bytes = models.PositiveBigIntegerField(null=True, blank=True)
    mime_type = models.CharField(max_length=100, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]
        indexes = [
            models.Index(fields=["submission"], name="submission_file_sub_idx"),
        ]

    def __str__(self):
        return self.original_filename or self.file.name

    def save(self, *args, **kwargs):
        if self.file:
            if not self.original_filename:
                self.original_filename = self.file.name.rsplit("/", 1)[-1][:255]
            if self.size_bytes is None:
                try:
                    self.size_bytes = self.file.size
                except (OSError, ValueError):
                    pass
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        self.file.delete(save=False)
        super().delete(*args, **kwargs)
