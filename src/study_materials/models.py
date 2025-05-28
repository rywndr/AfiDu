import os

from django.conf import settings
from django.core.validators import FileExtensionValidator
from django.db import models
from pdf2image import convert_from_path


# Create your models here.
class StudyMaterial(models.Model):
    CATEGORY_CHOICES = [
        ("reading", "Reading"),
        ("speaking", "Speaking"),
        ("writing", "Writing"),
        ("listening", "Listening"),
    ]
    
    LEVEL_CHOICES = [
        ("Mix Class", "Mix Class"),
        ("Beginner 1", "Beginner 1"),
        ("Beginner 2", "Beginner 2"),
        ("Elementary 1", "Elementary 1"),
        ("Elementary 2", "Elementary 2"),
        ("Elementary 3", "Elementary 3"),
        ("Junior 1", "Junior 1"),
        ("Junior 2", "Junior 2"),
        ("Junior 3", "Junior 3"),
        ("Senior 1", "Senior 1"),
        ("Senior 2", "Senior 2"),
        ("Senior 3", "Senior 3"),
    ]

    title = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES)
    file = models.FileField(
        upload_to="study_materials/",
        validators=[FileExtensionValidator(allowed_extensions=["pdf"])],
    )
    thumbnail = models.ImageField(
        upload_to="study_material_thumbnails/", blank=True, null=True
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(auto_now=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True
    )

    class Meta:
        verbose_name = "Study Material"
        verbose_name_plural = "Study Materials"
        ordering = ["-uploaded_at"]

    def __str__(self):
        return self.title

    def get_file_extension(self):
        return self.file.name.split(".")[-1].lower()

    def save(self, *args, **kwargs):
        # save file dulu
        super().save(*args, **kwargs)
        # generate thumbnail pakai pdf2image jika file nya == PDF dan thumbnail nya belum ada
        if self.file and self.get_file_extension() == "pdf" and not self.thumbnail:
            try:
                pdf_path = self.file.path
                output_dir = os.path.join(
                    settings.MEDIA_ROOT, "study_material_thumbnails"
                )
                os.makedirs(output_dir, exist_ok=True)
                thumb_filename = f"{self.pk}_thumb.jpg"
                thumb_path = os.path.join(output_dir, thumb_filename)
                # ubah page pertama dari PDF ke jpeg
                pages = convert_from_path(pdf_path, first_page=1, last_page=1)
                if pages:
                    pages[0].save(thumb_path, "JPEG")
                    self.thumbnail = os.path.join(
                        "study_material_thumbnails", thumb_filename
                    )
                    super().save(update_fields=["thumbnail"])
            except Exception as e:
                print("Error generating thumbnail:", e)

    def delete(self, *args, **kwargs):
        # delete file dan thumbnail dari filesystem
        self.file.delete(save=False)
        if self.thumbnail:
            self.thumbnail.delete(save=False)
        super().delete(*args, **kwargs)
