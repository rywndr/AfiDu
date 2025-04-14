from django import forms
from django.core.exceptions import ValidationError

from .models import StudyMaterial


class StudyMaterialForm(forms.ModelForm):
    class Meta:
        model = StudyMaterial
        fields = ["title", "file", "category"]

    def clean_file(self):
        file = self.cleaned_data.get("file")
        max_size_mb = 10  # set your desired limit here (e.g., 10MB)

        if file and file.size > max_size_mb * 1024 * 1024:
            raise ValidationError(f"The file size should not exceed {max_size_mb}MB.")

        return file
