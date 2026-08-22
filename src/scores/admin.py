from django.contrib import admin

from .models import Score, ScoreConfig, ScoreEntry


# Register your models here.
@admin.register(ScoreConfig)
class ScoreConfigAdmin(admin.ModelAdmin):
    list_display = ("__str__", "year", "semester", "category", "num_exercises")
    list_filter = ("year", "semester", "category")
    search_fields = ("year", "formula")


class ScoreEntryInline(admin.TabularInline):
    model = ScoreEntry
    extra = 0
    fields = ("slot", "points", "source", "assignment", "material", "submission", "note")
    raw_id_fields = ("assignment", "material", "submission")
    ordering = ("slot",)


@admin.register(Score)
class ScoreAdmin(admin.ModelAdmin):
    list_display = (
        "student",
        "year",
        "semester",
        "category",
        "mid_term",
        "finals",
        "final_score",
    )
    list_filter = ("year", "semester", "category")
    search_fields = ("student__name",)
    raw_id_fields = ("student",)
    readonly_fields = ("final_score",)
    exclude = ("legacy_exercise_scores",)
    inlines = [ScoreEntryInline]

    def get_queryset(self, request):
        # final_score reads the entries
        return super().get_queryset(request).prefetch_related("entries")


@admin.register(ScoreEntry)
class ScoreEntryAdmin(admin.ModelAdmin):
    list_display = ("score", "slot", "points", "source", "assignment", "material")
    list_filter = ("source",)
    search_fields = ("score__student__name", "note")
    raw_id_fields = ("score", "assignment", "material", "submission")
