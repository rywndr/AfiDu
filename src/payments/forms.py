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
            "mid_semester_start",
            "mid_semester_end",
            "final_semester_start",
            "final_semester_end",
        ]
        widgets = {
            "year": forms.Select(
                attrs={
                    "class": (
                        "mt-1 block w-full py-2 px-3 border border-gray-300 "
                        "bg-white rounded-md shadow-sm focus:outline-none "
                        "focus:ring-[#ff4f25] focus:border-[#ff4f25] sm:text-sm"
                    ),
                }
            ),
            "monthly_fee": forms.TextInput(
                attrs={
                    "placeholder": "0",
                    "aria-label": "Monthly fee amount in IDR",
                    "class": (
                        "block w-full py-2 pl-10 pr-3 "
                        "border border-gray-300 bg-white rounded-md shadow-sm "
                        "focus:outline-none focus:ring-[#ff4f25] focus:border-[#ff4f25] sm:text-sm"
                    ),
                }
            ),
            "mid_semester_start": forms.NumberInput(
                attrs={
                    "min": 1,
                    "max": 12,
                    "aria-label": "Mid semester start month",
                    "class": (
                        "mt-1 block w-full py-2 px-3 border border-gray-300 "
                        "bg-white rounded-md shadow-sm focus:outline-none "
                        "focus:ring-[#ff4f25] focus:border-[#ff4f25] sm:text-sm"
                    ),
                }
            ),
            "mid_semester_end": forms.NumberInput(
                attrs={
                    "min": 1,
                    "max": 12,
                    "aria-label": "Mid semester end month",
                    "class": (
                        "mt-1 block w-full py-2 px-3 border border-gray-300 "
                        "bg-white rounded-md shadow-sm focus:outline-none "
                        "focus:ring-[#ff4f25] focus:border-[#ff4f25] sm:text-sm"
                    ),
                }
            ),
            "final_semester_start": forms.NumberInput(
                attrs={
                    "min": 1,
                    "max": 12,
                    "aria-label": "Final semester start month",
                    "class": (
                        "mt-1 block w-full py-2 px-3 border border-gray-300 "
                        "bg-white rounded-md shadow-sm focus:outline-none "
                        "focus:ring-[#ff4f25] focus:border-[#ff4f25] sm:text-sm"
                    ),
                }
            ),
            "final_semester_end": forms.NumberInput(
                attrs={
                    "min": 1,
                    "max": 12,
                    "aria-label": "Final semester end month",
                    "class": (
                        "mt-1 block w-full py-2 px-3 border border-gray-300 "
                        "bg-white rounded-md shadow-sm focus:outline-none "
                        "focus:ring-[#ff4f25] focus:border-[#ff4f25] sm:text-sm"
                    ),
                }
            ),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        current_year = datetime.date.today().year
        self.fields["year"].widget.choices = [
            (y, str(y)) for y in range(current_year - 2, current_year + 8)
        ]

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

    def clean(self):
        cleaned = super().clean()
        ms, me = cleaned.get("mid_semester_start"), cleaned.get("mid_semester_end")
        fs, fe = cleaned.get("final_semester_start"), cleaned.get("final_semester_end")

        if ms and me and ms > me:
            self.add_error(
                "mid_semester_end",
                "Mid semester end month cannot be before start month",
            )
        if fs and fe and fs > fe:
            self.add_error(
                "final_semester_end",
                "Final semester end month cannot be before start month",
            )

        if ms and me and fs and fe:
            mid_set = set(range(ms, me + 1))
            final_set = set(range(fs, fe + 1))
            if mid_set & final_set:
                self.add_error(
                    None, "Mid semester and final semester months cannot overlap"
                )

        return cleaned
