from django.contrib import admin

from .models import Payment, PaymentConfig


# Register your models here.
@admin.register(PaymentConfig)
class PaymentConfigAdmin(admin.ModelAdmin):
    list_display = (
        "year",
        "monthly_fee",
        "is_active",
        "mid_semester_start",
        "mid_semester_end",
        "final_semester_start",
        "final_semester_end",
    )
    list_filter = ("year", "is_active")
    search_fields = ("year",)
    list_editable = ("is_active",)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "student",
        "year",
        "month",
        "amount_paid",
        "remaining_amount",
        "paid",
        "is_installment",
        "payment_date",
    )
    list_filter = ("year", "month", "paid", "is_installment")
    search_fields = ("student__name",)
    readonly_fields = ("remaining_amount", "is_installment")
    date_hierarchy = "payment_date"

    # Optional: Add actions for bulk operations
    actions = ["mark_as_paid"]

    def mark_as_paid(self, request, queryset):
        for payment in queryset:
            # Get the payment config for the payment's year
            config = PaymentConfig.get_active(payment.year)
            # Set amount_paid to full payment
            payment.amount_paid = config.monthly_fee
            payment.save()
        self.message_user(request, f"{queryset.count()} payments marked as paid.")

    mark_as_paid.short_description = "Mark selected payments as fully paid"
