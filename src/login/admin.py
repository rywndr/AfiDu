from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import AuthAccount, AuthSession, AuthVerification, CustomUser


# Register your models here.
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ["email", "role", "is_staff", "is_active"]
    list_filter = ("role", "is_staff", "is_active")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal Info", {"fields": ("first_name", "last_name", "image")}),
        (
            "Permissions",
            {
                "fields": (
                    "role",
                    "is_staff",
                    "is_active",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("E-learning", {"fields": ("email_verified", "created_at", "updated_at")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "password1",
                    "password2",
                    "first_name",
                    "last_name",
                    "role",
                    "is_staff",
                    "is_active",
                ),
            },
        ),
    )

    readonly_fields = ("created_at", "updated_at")
    search_fields = ("email",)
    ordering = ("email",)


@admin.register(AuthAccount)
class AuthAccountAdmin(admin.ModelAdmin):
    list_display = ("user", "provider_id", "account_id", "updated_at")
    list_filter = ("provider_id",)
    search_fields = ("user__email", "account_id")
    raw_id_fields = ("user",)
    # never surface or hand-edit the hash
    exclude = ("password", "access_token", "refresh_token", "id_token")
    readonly_fields = ("created_at", "updated_at")


@admin.register(AuthSession)
class AuthSessionAdmin(admin.ModelAdmin):
    list_display = ("user", "expires_at", "ip_address", "created_at")
    search_fields = ("user__email", "ip_address")
    raw_id_fields = ("user",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(AuthVerification)
class AuthVerificationAdmin(admin.ModelAdmin):
    list_display = ("identifier", "expires_at", "created_at")
    search_fields = ("identifier",)
    readonly_fields = ("created_at", "updated_at")


admin.site.register(CustomUser, CustomUserAdmin)
