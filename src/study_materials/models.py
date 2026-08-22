import logging
import mimetypes
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver
from django.utils import timezone
from django.utils.text import slugify
from core.constants import LEVELS, SUBJECT_CATEGORIES
from core.storage import study_material_storage

logger = logging.getLogger(__name__)

# kept for backwards compatibility with existing imports
CATEGORY_CHOICES = SUBJECT_CATEGORIES
LEVEL_CHOICES = LEVELS


def study_material_upload_to(instance, filename):
    """Generate a collision-resistant B2 key while preserving the extension."""
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    date_path = timezone.now().strftime("%Y/%m")
    return f"study_materials/{date_path}/{uuid.uuid4().hex}.{extension}"


def study_material_thumbnail_upload_to(instance, filename):
    date_path = timezone.now().strftime("%Y/%m")
    return f"study_material_thumbnails/{date_path}/{uuid.uuid4().hex}.jpg"


# Create your models here.
class StudyMaterial(models.Model):
    TYPE_PDF = "pdf"
    TYPE_VIDEO = "video"
    TYPE_WRITE_UP = "write_up"
    TYPE_CHOICES = [
        (TYPE_PDF, "PDF document"),
        (TYPE_VIDEO, "Video"),
        (TYPE_WRITE_UP, "Write-up"),
    ]
    PDF_EXTENSIONS = ("pdf",)
    VIDEO_EXTENSIONS = ("mp4", "webm", "mov", "m4v")
    FILE_EXTENSIONS = PDF_EXTENSIONS + VIDEO_EXTENSIONS

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
    material_type = models.CharField(
        max_length=20, choices=TYPE_CHOICES, default=TYPE_PDF
    )
    content = models.TextField(
        blank=True,
        help_text="The lesson content for a write-up material.",
    )
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
        upload_to=study_material_upload_to,
        storage=study_material_storage,
        blank=True,
        validators=[FileExtensionValidator(allowed_extensions=FILE_EXTENSIONS)],
    )
    thumbnail = models.ImageField(
        upload_to=study_material_thumbnail_upload_to,
        storage=study_material_storage,
        blank=True,
        null=True,
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

    @property
    def is_write_up(self):
        return self.material_type == self.TYPE_WRITE_UP

    @property
    def is_video(self):
        return self.material_type == self.TYPE_VIDEO

    def get_file_extension(self):
        if not self.file or "." not in self.file.name:
            return ""
        return self.file.name.rsplit(".", 1)[-1].lower()

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

    def clean(self):
        super().clean()
        errors = {}
        extension = self.get_file_extension()

        if self.is_write_up:
            if not self.content.strip():
                errors["content"] = "Write-up materials must include content."
        else:
            if not self.file:
                errors["file"] = "PDF and video materials require a file."
            elif self.material_type == self.TYPE_PDF and extension not in self.PDF_EXTENSIONS:
                errors["file"] = "PDF materials require a .pdf file."
            elif (
                self.material_type == self.TYPE_VIDEO
                and extension not in self.VIDEO_EXTENSIONS
            ):
                errors["file"] = (
                    "Video materials must use MP4, WebM, MOV, or M4V format."
                )

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        previous_file_name = ""
        previous_thumbnail_name = ""
        if self.pk:
            previous = (
                StudyMaterial.objects.filter(pk=self.pk)
                .only("file", "thumbnail")
                .first()
            )
            if previous:
                previous_file_name = previous.file.name
                previous_thumbnail_name = previous.thumbnail.name

        new_upload = bool(
            self.file and not getattr(self.file, "_committed", True)
        )

        if not self.slug:
            self.slug = self._build_slug()

        if self.status == self.STATUS_PUBLISHED and self.published_at is None:
            self.published_at = timezone.now()
        elif self.status != self.STATUS_PUBLISHED:
            self.published_at = None

        # Capture metadata while a new upload is still in memory. These values
        # let both apps render listings without issuing storage HEAD requests.
        if new_upload:
            self.original_filename = self.file.name.rsplit("/", 1)[-1][:255]
            self.mime_type = (
                getattr(self.file.file, "content_type", "")
                or mimetypes.guess_type(self.file.name)[0]
                or "application/octet-stream"
            )
            try:
                self.file_size_bytes = self.file.size
            except (OSError, ValueError):
                pass
            self.page_count = None

        # Thumbnails are legacy metadata. The material library now uses compact
        # type icons, so saving a material removes any old generated image.
        self.thumbnail = None

        if self.is_write_up:
            self.file = None
            self.thumbnail = None
            self.original_filename = ""
            self.mime_type = "text/plain"
            self.file_size_bytes = None
            self.page_count = None
        elif self.material_type == self.TYPE_VIDEO:
            self.thumbnail = None
            self.page_count = None

        super().save(*args, **kwargs)

        file_storage = self._meta.get_field("file").storage
        thumbnail_storage = self._meta.get_field("thumbnail").storage
        if previous_file_name and previous_file_name != self.file.name:
            try:
                file_storage.delete(previous_file_name)
            except Exception as exc:
                logger.warning("Could not delete replaced material file %s: %s", previous_file_name, exc)
        if previous_thumbnail_name and previous_thumbnail_name != self.thumbnail.name:
            try:
                thumbnail_storage.delete(previous_thumbnail_name)
            except Exception as exc:
                logger.warning(
                    "Could not delete replaced material thumbnail %s: %s",
                    previous_thumbnail_name,
                    exc,
                )

@receiver(post_delete, sender=StudyMaterial)
def delete_study_material_objects(sender, instance, **kwargs):
    """Remove media objects for individual and bulk/queryset deletions."""
    for field_name in ("file", "thumbnail"):
        field_file = getattr(instance, field_name)
        if not field_file:
            continue
        try:
            field_file.storage.delete(field_file.name)
        except Exception as exc:
            logger.warning(
                "Could not delete %s for study material %s: %s",
                field_name,
                instance.pk,
                exc,
            )
