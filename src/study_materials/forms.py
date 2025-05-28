from django import forms
from django.core.exceptions import ValidationError

from .models import StudyMaterial


class StudyMaterialForm(forms.ModelForm):
    MAX_UPLOAD_SIZE_MB = 10
    ALLOWED_EXTENSIONS = ["pdf"]

    class Meta:
        model = StudyMaterial
        fields = ["title", "file", "category", "level"]
        widgets = {
            "title": forms.TextInput(
                attrs={
                    "class": "mt-1 focus:ring-[#ff4f25] focus:border-[#ff4f25] block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2",
                    "placeholder": "Enter study material title...",
                }
            ),
            "category": forms.Select(
                attrs={
                    "class": "mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-[#ff4f25] focus:border-[#ff4f25] sm:text-sm"
                }
            ),
            "level": forms.Select(
                attrs={
                    "class": "mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-[#ff4f25] focus:border-[#ff4f25] sm:text-sm"
                }
            ),
            "file": forms.FileInput(
                attrs={
                    "class": "mt-1 focus:ring-[#ff4f25] focus:border-[#ff4f25] block w-full shadow-sm sm:text-sm border-gray-300 rounded-md",
                    "accept": ".pdf",
                }
            ),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["file"].help_text = (
            f"Allowed file type: {', '.join(self.ALLOWED_EXTENSIONS)}. "
            f"Max file size: {self.MAX_UPLOAD_SIZE_MB}MB."
        )
        for field_name, field in self.fields.items():
            if field.required:
                field.widget.attrs['data-required'] = 'true'

    def clean_file(self):
        file = self.cleaned_data.get("file")
        if file and file.size > self.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
            raise ValidationError(
                f"The file size should not exceed {self.MAX_UPLOAD_SIZE_MB}MB."
            )
        return file
