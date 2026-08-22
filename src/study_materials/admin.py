from django.contrib import admin

from .models import StudyMaterial

# Register your models here.


@admin.register(StudyMaterial)
class StudyMaterialAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "category",
        "level",
        "student_class",
        "status",
        "position",
        "uploaded_by__email",
        "uploaded_at",
        "edited_at",
    )
    list_filter = ("status", "category", "level", "student_class", "uploaded_at")
    list_editable = ("status", "position")
    search_fields = (
        "title",
        "slug",
        "description",
        "category",
        "uploaded_by__email",
        "uploaded_by__first_name",
    )
    prepopulated_fields = {"slug": ("title",)}
    raw_id_fields = ("uploaded_by",)
    readonly_fields = (
        "thumbnail",
        "original_filename",
        "mime_type",
        "file_size_bytes",
        "page_count",
        "published_at",
        "uploaded_at",
        "edited_at",
    )

    fieldsets = (
        (None, {"fields": ("title", "slug", "description")}),
        ("Targeting", {"fields": ("category", "level", "student_class")}),
        ("Publishing", {"fields": ("status", "published_at", "position")}),
        ("File", {"fields": ("file", "thumbnail")}),
        (
            "Metadata",
            {
                "classes": ("collapse",),
                "fields": (
                    "original_filename",
                    "mime_type",
                    "file_size_bytes",
                    "page_count",
                    "uploaded_by",
                    "uploaded_at",
                    "edited_at",
                ),
            },
        ),
    )
