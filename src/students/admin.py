from django.contrib import admin

from .models import Student

# Register your models here.


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "age",
        "date_of_birth",
        "gender",
        "assigned_class",
        "contact_number",
    )
    list_filter = ("assigned_class", "gender")
    search_fields = ("name", "contact_number", "address")
    ordering = ("name",)
    readonly_fields = ()

    fieldsets = (
        (
            "Basic Info",
            {"fields": ("profile_photo", "name", "gender", "age", "date_of_birth")},
        ),
        (
            "Contact & Class",
            {"fields": ("contact_number", "address", "assigned_class")},
        ),
    )
