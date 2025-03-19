from django.contrib import admin

from .models import StudyMaterial

# Register your models here.


@admin.register(StudyMaterial)
class StudyMaterialAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "category",
        "uploaded_by__email",
        "uploaded_by__first_name",
        "uploaded_at",
        "edited_at",
    )
    list_filter = ("category", "uploaded_at")
    search_fields = (
        "title",
        "category",
        "uploaded_by__email",
        "uploaded_by__first_name",
    )
