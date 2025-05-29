import datetime
from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models

from students.models import Student


class PaymentConfig(models.Model):
    year = models.IntegerField(
        default=datetime.date.today().year,
        validators=[MinValueValidator(2020)],
        help_text="Year this configuration applies to",
    )

    # monthly fee in IDR
    monthly_fee = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Monthly payment fee in IDR",
    )
    
    # installment configuration
    max_installments = models.IntegerField(
        default=3,
        validators=[MinValueValidator(1)],
        help_text="Maximum number of installments allowed per payment"
    )
    
    # minimum payment amount
    minimum_payment_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=50000,
        validators=[MinValueValidator(0)],
        help_text="Minimum payment amount per installment in IDR"
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

    # ensure only one active payment config per year
    is_active = models.BooleanField(default=True)

    class Meta:
        # each year has only one active config
        unique_together = ["year", "is_active"]

    def save(self, *args, **kwargs):
        if self.is_active:
            # deactivate other payment configs for the same year
            PaymentConfig.objects.filter(year=self.year).exclude(pk=self.pk).update(
                is_active=False
            )
        super().save(*args, **kwargs)

    @classmethod
    def get_active(cls, year=None):
        """get active config for specified year or defaults"""
        if year is None:
            year = datetime.date.today().year

        config = cls.objects.filter(year=year, is_active=True).first()
        if not config:
            config = cls.objects.create(
                year=year,
                monthly_fee=150000,
                max_installments=2,
                minimum_payment_amount=50000,
                mid_semester_start=1,
                mid_semester_end=3,
                final_semester_start=7,
                final_semester_end=9,
                is_active=True,
            )
        return config

    def __str__(self):
        return f"Payment Config {self.year} (Monthly: {self.monthly_fee} IDR, Min: {self.minimum_payment_amount} IDR)"


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
    current_installment = models.IntegerField(default=0, help_text="Current installment number")
    remaining_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ["student", "year", "month"]
        ordering = ["year", "month"]

    def __str__(self):
        status = "Paid" if self.paid else "Unpaid"
        return f"{self.student.name} - {self.month}/{self.year} - {status}"

    def save(self, *args, **kwargs):
        config = PaymentConfig.get_active(self.year)

        # calc how much student owes
        diff = config.monthly_fee - self.amount_paid
        # remain == 0 if student overpaid
        self.remaining_amount = diff if diff > Decimal("0.00") else Decimal("0.00")

        # Only auto-manage installment fields if they're not being explicitly set
        # Check if this save is coming from the UpdatePaymentView (which manages installments)
        skip_auto_installment = kwargs.pop('skip_auto_installment', False)
        
        if not skip_auto_installment:
            # Keep track of whether this was paid via installments
            # Don't reset is_installment to False if amount_paid reaches the full amount
            # Only set is_installment to True if it's a new installment payment
            if self.amount_paid > Decimal("0.00") and not self.paid:
                if self.current_installment > 0:
                    # If we already have installments recorded, maintain that status
                    self.is_installment = True
                else:
                    # Otherwise, set installment status based on whether it's a partial payment
                    self.is_installment = self.amount_paid < config.monthly_fee

            # Update current installment count if this is an installment payment
            if self.is_installment and self.amount_paid > 0:
                # If this is a new installment, increment the count
                if self.current_installment == 0:
                    self.current_installment = 1
                # If amount_paid changed and is less than monthly_fee, it's another installment
                elif 'amount_paid' in kwargs.get('update_fields', []) and self.amount_paid < config.monthly_fee:
                    self.current_installment += 1
                    if self.current_installment > config.max_installments:
                        self.current_installment = config.max_installments
            elif self.amount_paid == 0:
                # Reset installment count if unpaid
                self.current_installment = 0
                self.is_installment = False

        # paid == student paid full
        self.paid = self.amount_paid >= config.monthly_fee

        super().save(*args, **kwargs)


class PaymentInstallment(models.Model):
    """Model to track individual installment payments."""
    payment = models.ForeignKey(
        Payment, on_delete=models.CASCADE, related_name="installments"
    )
    installment_number = models.IntegerField(
        validators=[MinValueValidator(1)],
        help_text="The installment number (e.g., 1st, 2nd, 3rd installment)"
    )
    amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Amount paid for this specific installment"
    )
    payment_date = models.DateTimeField(
        auto_now_add=True,
        help_text="When this installment was recorded"
    )
    
    class Meta:
        unique_together = ["payment", "installment_number"]
        ordering = ["payment", "installment_number"]
        
    def __str__(self):
        return f"Installment {self.installment_number} for {self.payment} - {self.amount}"
