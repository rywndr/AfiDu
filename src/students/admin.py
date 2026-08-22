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
        "level",
        "contact_number",
        "has_login",
    )
    list_filter = ("assigned_class", "gender", "level")
    search_fields = ("name", "contact_number", "address", "email")
    ordering = ("name",)
    raw_id_fields = ("user",)
    readonly_fields = ("has_login",)

    fieldsets = (
        (
            "Basic Info",
            {"fields": ("profile_photo", "name", "gender", "age", "date_of_birth")},
        ),
        (
            "Contact & Class",
            {"fields": ("contact_number", "address", "assigned_class", "level")},
        ),
        (
            "E-learning login",
            {
                "fields": ("email", "user", "has_login"),
                "description": (
                    "Provisioned with the <code>provision_student_logins</code> "
                    "management command. The password hash lives on the linked "
                    "account's credential row, not on the student."
                ),
            },
        ),
    )

    @admin.display(boolean=True, description="Has login")
    def has_login(self, obj):
        return obj.has_login
