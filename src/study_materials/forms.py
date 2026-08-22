from django import forms
from django.conf import settings
from django.core.exceptions import ValidationError

from assignments.models import Assignment

from .models import StudyMaterial


class StudyMaterialForm(forms.ModelForm):
    MAX_PDF_SIZE_MB = getattr(settings, "STUDY_MATERIAL_MAX_PDF_SIZE_MB", 25)
    MAX_VIDEO_SIZE_MB = getattr(settings, "STUDY_MATERIAL_MAX_VIDEO_SIZE_MB", 500)

    assignments = forms.ModelMultipleChoiceField(
        queryset=Assignment.objects.none(),
        required=False,
        help_text="Optional assignments that should reference this material.",
    )

    class Meta:
        model = StudyMaterial
        fields = [
            "title",
            "description",
            "material_type",
            "content",
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
            "material_type": forms.Select(
                attrs={
                    "class": "mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-[#ff4f25] focus:border-[#ff4f25] sm:text-sm"
                }
            ),
            "content": forms.Textarea(
                attrs={
                    "class": "mt-1 focus:ring-[#ff4f25] focus:border-[#ff4f25] block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2",
                    "placeholder": "Write the lesson content here...",
                    "rows": 12,
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
                    "accept": ".pdf,.mp4,.webm,.mov,.m4v,application/pdf,video/*",
                }
            ),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["assignments"].queryset = Assignment.objects.order_by(
            "-created_at"
        )
        if self.instance.pk:
            self.fields["assignments"].initial = self.instance.assignments.all()

        self.fields["file"].help_text = (
            "PDF: up to "
            f"{self.MAX_PDF_SIZE_MB}MB. Video (MP4, WebM, MOV, M4V): up to "
            f"{self.MAX_VIDEO_SIZE_MB}MB. Files are stored in Backblaze B2 when configured."
        )
        self.fields["description"].required = False
        self.fields["content"].required = False
        self.fields["file"].required = False
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
        if not file:
            return file

        material_type = self.cleaned_data.get("material_type")
        max_size_mb = (
            self.MAX_VIDEO_SIZE_MB
            if material_type == StudyMaterial.TYPE_VIDEO
            else self.MAX_PDF_SIZE_MB
        )
        if file.size > max_size_mb * 1024 * 1024:
            raise ValidationError(
                f"The file size should not exceed {max_size_mb}MB."
            )
        return file

    def clean(self):
        cleaned_data = super().clean()
        material_type = cleaned_data.get("material_type")

        if material_type == StudyMaterial.TYPE_WRITE_UP:
            # Switching an existing file material to a write-up removes its
            # object from storage in StudyMaterial.save().
            cleaned_data["file"] = False
        else:
            # A material has one canonical payload, never stale text and a file.
            cleaned_data["content"] = ""

        return cleaned_data

    def _save_m2m(self):
        super()._save_m2m()
        selected = self.cleaned_data.get("assignments")
        if selected is None:
            return

        self.instance.assignments.exclude(pk__in=selected).update(material=None)
        selected.update(material=self.instance)
