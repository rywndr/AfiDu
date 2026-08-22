from io import BytesIO
import logging

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.validators import FileExtensionValidator
from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from pdf2image import convert_from_bytes, pdfinfo_from_bytes

from core.constants import LEVELS, SUBJECT_CATEGORIES

logger = logging.getLogger(__name__)

# kept for backwards compatibility with existing imports
CATEGORY_CHOICES = SUBJECT_CATEGORIES
LEVEL_CHOICES = LEVELS


# Create your models here.
class StudyMaterial(models.Model):
    STATUS_DRAFT = "draft"
    STATUS_PUBLISHED = "published"
    STATUS_ARCHIVED = "archived"
    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_PUBLISHED, "Published"),
        (STATUS_ARCHIVED, "Archived"),
    ]

    CATEGORY_CHOICES = SUBJECT_CATEGORIES
    LEVEL_CHOICES = LEVELS

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES)
    # optional narrower targeting: a specific class within the level
    student_class = models.ForeignKey(
        "students.StudentClass",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="study_materials",
        help_text="Restrict to a single class. Leave empty to target the whole level.",
    )

    file = models.FileField(
        upload_to="study_materials/",
        validators=[FileExtensionValidator(allowed_extensions=["pdf"])],
    )
    thumbnail = models.ImageField(
        upload_to="study_material_thumbnails/", blank=True, null=True
    )

    # file metadata, captured on save so listings don't have to touch storage
    original_filename = models.CharField(max_length=255, blank=True)
    mime_type = models.CharField(max_length=100, blank=True)
    file_size_bytes = models.PositiveBigIntegerField(null=True, blank=True)
    page_count = models.PositiveIntegerField(null=True, blank=True)

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT
    )
    published_at = models.DateTimeField(null=True, blank=True)
    position = models.PositiveIntegerField(
        default=0, help_text="Manual ordering within a level and category."
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
        indexes = [
            models.Index(
                fields=["status", "level", "category"],
                name="study_material_visible_idx",
            ),
            models.Index(fields=["position"], name="study_material_position_idx"),
        ]

    def __str__(self):
        return self.title

    @property
    def is_published(self):
        return self.status == self.STATUS_PUBLISHED

    def get_file_extension(self):
        return self.file.name.split(".")[-1].lower()

    def is_visible_to(self, student):
        """
        Whether ``student`` should see this material in the e-learning app.

        Published only, matching level, and -- when the material targets a
        specific class -- matching class.
        """
        if not self.is_published:
            return False
        if student is None:
            return False
        if self.student_class_id is not None:
            return student.assigned_class_id == self.student_class_id
        return student.level == self.level

    def _build_slug(self):
        base = slugify(self.title)[:250] or "material"
        slug = base
        suffix = 2
        qs = StudyMaterial.objects.exclude(pk=self.pk) if self.pk else StudyMaterial.objects.all()
        while qs.filter(slug=slug).exists():
            slug = f"{base}-{suffix}"
            suffix += 1
        return slug

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._build_slug()

        if self.status == self.STATUS_PUBLISHED and self.published_at is None:
            self.published_at = timezone.now()
        elif self.status != self.STATUS_PUBLISHED:
            self.published_at = None

        # capture metadata while the uploaded file is still in memory
        if self.file:
            if not self.original_filename:
                self.original_filename = self.file.name.rsplit("/", 1)[-1][:255]
            if not self.mime_type:
                self.mime_type = "application/pdf"
            try:
                self.file_size_bytes = self.file.size
            except (OSError, ValueError):
                pass

        # save file dulu
        super().save(*args, **kwargs)

        # generate thumbnail pakai pdf2image jika file nya == PDF dan thumbnail nya belum ada.
        # read/write through the storage API so this works on remote backends
        # (Cloudflare R2) as well as local disk.
        if self.file and self.get_file_extension() == "pdf" and not self.thumbnail:
            try:
                self.file.open("rb")
                try:
                    pdf_bytes = self.file.read()
                finally:
                    self.file.close()

                # ubah page pertama dari PDF ke jpeg
                pages = convert_from_bytes(pdf_bytes, first_page=1, last_page=1)

                update_fields = []
                try:
                    self.page_count = pdfinfo_from_bytes(pdf_bytes).get("Pages")
                    update_fields.append("page_count")
                except Exception:
                    pass

                if pages:
                    buffer = BytesIO()
                    pages[0].convert("RGB").save(buffer, "JPEG", quality=85)
                    self.thumbnail.save(
                        f"{self.pk}_thumb.jpg",
                        ContentFile(buffer.getvalue()),
                        save=False,
                    )
                    update_fields.append("thumbnail")

                if update_fields:
                    super().save(update_fields=update_fields)
            except Exception as e:
                # a missing poppler install or an unreadable PDF must not block
                # the upload itself
                logger.warning(
                    "Could not generate thumbnail for study material %s: %s",
                    self.pk,
                    e,
                )

    def delete(self, *args, **kwargs):
        # delete file dan thumbnail dari storage
        self.file.delete(save=False)
        if self.thumbnail:
            self.thumbnail.delete(save=False)
        super().delete(*args, **kwargs)
