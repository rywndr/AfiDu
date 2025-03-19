from django.conf import settings
from django.core.validators import FileExtensionValidator
from django.db import models


# Create your models here.
class StudyMaterial(models.Model):
    CATEGORY_CHOICES = [
        ("reading", "Reading"),
        ("speaking", "Speaking"),
        ("writing", "Writing"),
        ("listening", "Listening"),
    ]

    title = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    file = models.FileField(
        upload_to="study_materials/",
        validators=[
            FileExtensionValidator(
                allowed_extensions=[
                    "pdf",
                ]
            )
        ],  # "ppt", "pptx"])],
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(auto_now=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True
    )

    class Meta:
        verbose_name = "Study Material"
        verbose_name_plural = "Study Materials"

    def __str__(self):
        return self.title

    def get_file_extension(self):
        return self.file.name.split(".")[-1].lower()

    def delete(self, *args, **kwargs):
        # delete uploaded file dari filesystem
        self.file.delete(save=False)
        super().delete(*args, **kwargs)
