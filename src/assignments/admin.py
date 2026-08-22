from django.contrib import admin

from .models import (
    Assignment,
    Question,
    QuestionChoice,
    Submission,
    SubmissionAnswer,
    SubmissionFile,
)


class QuestionChoiceInline(admin.TabularInline):
    model = QuestionChoice
    extra = 4
    fields = ("order", "text", "is_correct")


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 1
    fields = ("order", "kind", "prompt", "points", "is_required")
    show_change_link = True


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "kind",
        "category",
        "level",
        "student_class",
        "status",
        "open_at",
        "due_at",
        "question_count",
    )
    list_filter = ("status", "kind", "category", "level", "student_class")
    search_fields = ("title", "slug", "description")
    prepopulated_fields = {"slug": ("title",)}
    raw_id_fields = ("created_by", "material", "student_class")
    date_hierarchy = "created_at"
    readonly_fields = ("created_at", "updated_at")
    inlines = [QuestionInline]

    fieldsets = (
        (None, {"fields": ("title", "slug", "description", "kind")}),
        ("Targeting", {"fields": ("category", "level", "student_class", "material")}),
        ("Score linkage", {"fields": ("year", "semester", "max_points")}),
        (
            "Availability",
            {"fields": ("status", "open_at", "due_at", "allow_late", "max_attempts")},
        ),
        (
            "Behaviour",
            {
                "fields": (
                    "time_limit_minutes",
                    "auto_grade",
                    "allow_file_upload",
                    "shuffle_questions",
                    "reveal_answers_after_submit",
                )
            },
        ),
        (
            "Metadata",
            {
                "classes": ("collapse",),
                "fields": ("created_by", "created_at", "updated_at"),
            },
        ),
    )

    @admin.display(description="Questions")
    def question_count(self, obj):
        return obj.questions.count()


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("assignment", "order", "kind", "points", "is_required")
    list_filter = ("kind", "is_required", "assignment__level")
    search_fields = ("prompt", "assignment__title")
    raw_id_fields = ("assignment",)
    inlines = [QuestionChoiceInline]


class SubmissionAnswerInline(admin.TabularInline):
    model = SubmissionAnswer
    extra = 0
    fields = ("question", "selected_choice", "text_answer", "is_correct", "awarded_points")
    readonly_fields = ("question", "selected_choice", "text_answer")
    raw_id_fields = ("question", "selected_choice")


class SubmissionFileInline(admin.TabularInline):
    model = SubmissionFile
    extra = 0
    fields = ("question", "file", "original_filename", "size_bytes", "uploaded_at")
    readonly_fields = ("original_filename", "size_bytes", "uploaded_at")
    raw_id_fields = ("question",)


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = (
        "assignment",
        "student",
        "attempt_number",
        "status",
        "is_late",
        "auto_score",
        "manual_score",
        "total_score",
        "submitted_at",
    )
    list_filter = ("status", "is_late", "assignment__category", "assignment__level")
    search_fields = ("student__name", "assignment__title")
    raw_id_fields = ("assignment", "student", "graded_by")
    date_hierarchy = "started_at"
    readonly_fields = (
        "started_at",
        "submitted_at",
        "time_spent_seconds",
        "auto_score",
        "total_score",
        "is_late",
        "created_at",
        "updated_at",
    )
    inlines = [SubmissionAnswerInline, SubmissionFileInline]
    actions = ["regrade_objective"]

    @admin.action(description="Re-grade objective answers")
    def regrade_objective(self, request, queryset):
        graded = 0
        for submission in queryset.select_related("assignment"):
            if submission.assignment.is_auto_gradable:
                submission.grade_objective()
                graded += 1
        self.message_user(request, f"Re-graded {graded} submission(s).")


@admin.register(SubmissionFile)
class SubmissionFileAdmin(admin.ModelAdmin):
    list_display = ("submission", "question", "original_filename", "size_bytes", "uploaded_at")
    search_fields = ("original_filename", "submission__student__name")
    raw_id_fields = ("submission", "question")
    readonly_fields = ("original_filename", "size_bytes", "mime_type", "uploaded_at")
