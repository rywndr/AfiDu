import datetime
from decimal import Decimal, InvalidOperation

from django import forms
from django.core.exceptions import ValidationError

from .models import PaymentConfig


class PaymentConfigForm(forms.ModelForm):
    class Meta:
        model = PaymentConfig
        fields = [
            "year",
            "monthly_fee",
            "minimum_payment_amount",
            "max_installments",
            "mid_semester_start",
            "mid_semester_end",
            "final_semester_start",
            "final_semester_end",
        ]
        widgets = {
            "year": forms.HiddenInput(),
            "monthly_fee": forms.NumberInput(
                attrs={
                    "class": (
                        "mt-1 block w-full pl-10 border-gray-300 rounded-md shadow-sm "
                        "focus:ring-[#ff4f25] focus:border-[#ff4f25] sm:text-sm"
                    ),
                    "placeholder": "150000",
                }
            ),
            "minimum_payment_amount": forms.NumberInput(
                attrs={
                    "class": (
                        "mt-1 block w-full pl-10 border-gray-300 rounded-md shadow-sm "
                        "focus:ring-[#ff4f25] focus:border-[#ff4f25] sm:text-sm"
                    ),
                    "placeholder": "50000",
                }
            ),
            "max_installments": forms.NumberInput(
                attrs={
                    "class": (
                        "mt-1 block w-full border-gray-300 rounded-md shadow-sm "
                        "focus:ring-[#ff4f25] focus:border-[#ff4f25] sm:text-sm"
                    ),
                    "min": "1",
                }
            ),
            "mid_semester_start": forms.Select(
                attrs={
                    "class": (
                        "mt-1 block w-full border-gray-300 rounded-md shadow-sm "
                        "focus:ring-[#ff4f25] focus:border-[#ff4f25] sm:text-sm"
                    ),
                }
            ),
            "mid_semester_end": forms.Select(
                attrs={
                    "class": (
                        "mt-1 block w-full border-gray-300 rounded-md shadow-sm "
                        "focus:ring-[#ff4f25] focus:border-[#ff4f25] sm:text-sm"
                    ),
                }
            ),
            "final_semester_start": forms.Select(
                attrs={
                    "class": (
                        "mt-1 block w-full border-gray-300 rounded-md shadow-sm "
                        "focus:ring-[#ff4f25] focus:border-[#ff4f25] sm:text-sm"
                    ),
                }
            ),
            "final_semester_end": forms.Select(
                attrs={
                    "class": (
                        "mt-1 block w-full border-gray-300 rounded-md shadow-sm "
                        "focus:ring-[#ff4f25] focus:border-[#ff4f25] sm:text-sm"
                    ),
                }
            ),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Month choices for semester fields
        month_choices = [
            (1, "January"),
            (2, "February"),
            (3, "March"),
            (4, "April"),
            (5, "May"),
            (6, "June"),
            (7, "July"),
            (8, "August"),
            (9, "September"),
            (10, "October"),
            (11, "November"),
            (12, "December"),
        ]

        self.fields["mid_semester_start"].widget.choices = month_choices
        self.fields["mid_semester_end"].widget.choices = month_choices
        self.fields["final_semester_start"].widget.choices = month_choices
        self.fields["final_semester_end"].widget.choices = month_choices

    def clean_monthly_fee(self):
        raw = self.cleaned_data.get("monthly_fee")
        # accept string and convert to decimal
        if isinstance(raw, str):
            cleaned = raw.replace(".", "")
            try:
                raw = Decimal(cleaned)
            except InvalidOperation:
                raise ValidationError("Masukkan jumlah yang valid (contoh: 150.000)")
        if raw <= 0:
            raise ValidationError("Jumlah pembayaran bulanan harus lebih dari nol")
        return raw

    def clean_minimum_payment_amount(self):
        minimum_payment = self.cleaned_data.get("minimum_payment_amount")
        monthly_fee = self.cleaned_data.get("monthly_fee")

        if minimum_payment and monthly_fee and minimum_payment >= monthly_fee:
            raise ValidationError("Minimum payment amount must be less than the monthly fee.")

        return minimum_payment

    def clean(self):
        cleaned = super().clean()
        ms, me = cleaned.get("mid_semester_start"), cleaned.get("mid_semester_end")
        fs, fe = cleaned.get("final_semester_start"), cleaned.get("final_semester_end")

        # basic validation for start/end months
        if ms is not None and me is not None and ms > me:
            self.add_error(
                "mid_semester_end",
                "Mid semester end month cannot be before start month",
            )

        if fs is not None and fe is not None and fs > fe:
            self.add_error(
                "final_semester_end",
                "Final semester end month cannot be before start month",
            )

        # check for overlapping semesters
        if all(v is not None for v in [ms, me, fs, fe]):
            # create range for both semesters
            mid_semester_range = set(range(ms, me + 1))
            final_semester_range = set(range(fs, fe + 1))

            # check ovverlap
            overlap = mid_semester_range.intersection(final_semester_range)
            if overlap:
                # generate month names for err msg
                month_names = [
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                ]
                overlapping_months = [month_names[m - 1] for m in overlap]

                error_msg = f"Semesters cannot overlap. Overlapping month(s): {', '.join(overlapping_months)}"

                # add detailed error to both semester end fields
                self.add_error("mid_semester_end", error_msg)
                self.add_error("final_semester_end", error_msg)

        return cleaned
