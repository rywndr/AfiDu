from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models

from students.models import Student


class PaymentConfig(models.Model):
    # monthly fee in IDR
    monthly_fee = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Monthly payment fee in IDR",
    )

    # mid sem (star and end)
    mid_semester_start = models.IntegerField(
        default=1, validators=[MinValueValidator(1)]
    )
    mid_semester_end = models.IntegerField(default=3, validators=[MinValueValidator(1)])

    # final sem (start and end)
    final_semester_start = models.IntegerField(
        default=7, validators=[MinValueValidator(1)]
    )
    final_semester_end = models.IntegerField(
        default=9, validators=[MinValueValidator(1)]
    )

    # ensure only one active payment config
    is_active = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        if self.is_active:
            # deactivate other payment configs
            PaymentConfig.objects.exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)

    @classmethod
    def get_active(cls):
        """get active config or defaults"""
        config = cls.objects.filter(is_active=True).first()
        if not config:
            config = cls.objects.create(
                monthly_fee=150000,
                mid_semester_start=1,
                mid_semester_end=3,
                final_semester_start=7,
                final_semester_end=9,
                is_active=True,
            )
        return config

    def __str__(self):
        return f"Payment Config (Monthly: {self.monthly_fee} IDR)"


class Payment(models.Model):
    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name="payments"
    )
    year = models.IntegerField()
    month = models.IntegerField()
    paid = models.BooleanField(default=False)

    # fields for payment tracking
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_installment = models.BooleanField(default=False)
    remaining_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ["student", "year", "month"]
        ordering = ["year", "month"]

    def __str__(self):
        status = "Paid" if self.paid else "Unpaid"
        return f"{self.student.name} - {self.month}/{self.year} - {status}"

    def save(self, *args, **kwargs):
        config = PaymentConfig.get_active()

        # calc how much student owes
        diff = config.monthly_fee - self.amount_paid
        # remain == 0 if student overpaid
        self.remaining_amount = diff if diff > Decimal("0.00") else Decimal("0.00")

        # cicilan == student paid some but not full
        self.is_installment = (
            self.amount_paid > Decimal("0.00") and self.amount_paid < config.monthly_fee
        )

        # paid == student paid full
        self.paid = self.amount_paid >= config.monthly_fee

        super().save(*args, **kwargs)
