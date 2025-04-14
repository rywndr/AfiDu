from django import forms
from django.core.exceptions import ValidationError

from .models import StudyMaterial


class StudyMaterialForm(forms.ModelForm):
    MAX_UPLOAD_SIZE_MB = 10
    ALLOWED_EXTENSIONS = ["pdf"]

    class Meta:
        model = StudyMaterial
        fields = ["title", "file", "category"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["file"].help_text = (
            f"Allowed file type: {', '.join(self.ALLOWED_EXTENSIONS)}. "
            f"Max file size: {self.MAX_UPLOAD_SIZE_MB}MB."
        )

    def clean_file(self):
        file = self.cleaned_data.get("file")
        if file and file.size > self.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
            raise ValidationError(
                f"The file size should not exceed {self.MAX_UPLOAD_SIZE_MB}MB."
            )
        return file
