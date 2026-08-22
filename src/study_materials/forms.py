from django import forms
from django.core.exceptions import ValidationError

from .models import StudyMaterial


class StudyMaterialForm(forms.ModelForm):
    MAX_UPLOAD_SIZE_MB = 10
    ALLOWED_EXTENSIONS = ["pdf"]

    class Meta:
        model = StudyMaterial
        fields = [
            "title",
            "description",
            "file",
            "category",
            "level",
            "student_class",
            "status",
            "position",
        ]
        widgets = {
            "title": forms.TextInput(
                attrs={
                    "class": "mt-1 focus:ring-[#ff4f25] focus:border-[#ff4f25] block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2",
                    "placeholder": "Enter study material title...",
                }
            ),
            "description": forms.Textarea(
                attrs={
                    "class": "mt-1 focus:ring-[#ff4f25] focus:border-[#ff4f25] block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2",
                    "placeholder": "Optional description shown to students...",
                    "rows": 3,
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
            "student_class": forms.Select(
                attrs={
                    "class": "mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-[#ff4f25] focus:border-[#ff4f25] sm:text-sm"
                }
            ),
            "status": forms.Select(
                attrs={
                    "class": "mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-[#ff4f25] focus:border-[#ff4f25] sm:text-sm"
                }
            ),
            "position": forms.NumberInput(
                attrs={
                    "class": "mt-1 focus:ring-[#ff4f25] focus:border-[#ff4f25] block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2",
                    "min": "0",
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
        # optional targeting/ordering fields must not block the existing flow
        self.fields["description"].required = False
        self.fields["student_class"].required = False
        self.fields["position"].required = False
        self.fields["student_class"].empty_label = "All classes in this level"
        for field_name, field in self.fields.items():
            if field.required:
                field.widget.attrs['data-required'] = 'true'

    def clean_position(self):
        position = self.cleaned_data.get("position")
        return 0 if position is None else position

    def clean_file(self):
        file = self.cleaned_data.get("file")
        if file and file.size > self.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
            raise ValidationError(
                f"The file size should not exceed {self.MAX_UPLOAD_SIZE_MB}MB."
            )
        return file
