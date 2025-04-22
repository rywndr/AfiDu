from django.contrib import admin

from .models import Score, ScoreConfig


# Register your models here.
@admin.register(ScoreConfig)
class ScoreConfigAdmin(admin.ModelAdmin):
    list_display = ("__str__", "year", "semester", "category", "num_exercises")
    list_filter = ("year", "semester", "category")
    search_fields = ("year", "formula")


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
    readonly_fields = ("final_score",)
