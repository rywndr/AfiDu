import re
import shutil
import tempfile
from unittest.mock import patch

from botocore.exceptions import ClientError
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse

from assignments.models import Assignment

from .forms import StudyMaterialForm
from .models import StudyMaterial


class StudyMaterialFormTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.media_root = tempfile.mkdtemp(prefix="afidu-study-materials-")
        cls.storage_override = override_settings(MEDIA_ROOT=cls.media_root)
        cls.storage_override.enable()

    @classmethod
    def tearDownClass(cls):
        cls.storage_override.disable()
        shutil.rmtree(cls.media_root, ignore_errors=True)
        super().tearDownClass()

    def base_data(self, **overrides):
        data = {
            "title": "Present perfect",
            "description": "Lesson notes",
            "material_type": StudyMaterial.TYPE_WRITE_UP,
            "content": "Use has or have with the past participle.",
            "category": "writing",
            "level": "Beginner 1",
            "student_class": "",
            "status": StudyMaterial.STATUS_DRAFT,
            "position": 0,
            "assignments": [],
        }
        data.update(overrides)
        return data

    def test_write_up_does_not_require_a_file(self):
        form = StudyMaterialForm(data=self.base_data())

        self.assertTrue(form.is_valid(), form.errors)
        material = form.save()

        self.assertFalse(material.file)
        self.assertEqual(material.mime_type, "text/plain")

    def test_pdf_upload_captures_metadata(self):
        upload = SimpleUploadedFile(
            "lesson.pdf", b"%PDF-1.4 test", content_type="application/pdf"
        )
        form = StudyMaterialForm(
            data=self.base_data(
                material_type=StudyMaterial.TYPE_PDF,
                content="",
            ),
            files={"file": upload},
        )

        self.assertTrue(form.is_valid(), form.errors)
        material = form.save()

        self.assertEqual(material.original_filename, "lesson.pdf")
        self.assertEqual(material.mime_type, "application/pdf")
        self.assertEqual(material.file_size_bytes, len(b"%PDF-1.4 test"))
        self.assertRegex(
            material.file.name,
            re.compile(r"^study_materials/\d{4}/\d{2}/[0-9a-f]{32}\.pdf$"),
        )

    def test_video_rejects_a_pdf(self):
        upload = SimpleUploadedFile(
            "lesson.pdf", b"%PDF-1.4 test", content_type="application/pdf"
        )
        form = StudyMaterialForm(
            data=self.base_data(
                material_type=StudyMaterial.TYPE_VIDEO,
                content="",
            ),
            files={"file": upload},
        )

        self.assertFalse(form.is_valid())
        self.assertIn("file", form.errors)

    def test_selected_assignments_are_linked_through_existing_foreign_key(self):
        assignment = Assignment.objects.create(
            title="Grammar exercise",
            category="writing",
            level="Beginner 1",
        )
        form = StudyMaterialForm(
            data=self.base_data(assignments=[str(assignment.pk)])
        )

        self.assertTrue(form.is_valid(), form.errors)
        material = form.save()
        assignment.refresh_from_db()

        self.assertEqual(assignment.material, material)

    def test_staff_can_render_write_up_list_and_detail(self):
        user = get_user_model().objects.create_user(
            email="teacher@afidu.test",
            password="test-password",
            first_name="Teacher",
        )
        material = StudyMaterial.objects.create(
            title="Rendered lesson",
            material_type=StudyMaterial.TYPE_WRITE_UP,
            content="A safe plain-text lesson.",
            category="reading",
            level="Beginner 1",
            uploaded_by=user,
        )
        self.client.force_login(user)

        list_response = self.client.get(reverse("study_materials:list"))
        detail_response = self.client.get(
            reverse("study_materials:detail", args=[material.pk])
        )

        self.assertContains(list_response, "Rendered lesson")
        self.assertContains(detail_response, "A safe plain-text lesson.")

    def test_storage_rejection_is_shown_as_a_form_error(self):
        user = get_user_model().objects.create_user(
            email="storage-error@afidu.test",
            password="test-password",
            first_name="Teacher",
        )
        self.client.force_login(user)
        error = ClientError(
            {
                "Error": {"Code": "403", "Message": "Forbidden"},
                "ResponseMetadata": {"HTTPStatusCode": 403},
            },
            "PutObject",
        )

        with self.assertLogs("study_materials.views", level="ERROR"), patch(
            "study_materials.models.StudyMaterial.save", side_effect=error
        ):
            response = self.client.post(
                reverse("study_materials:upload"),
                data=self.base_data(),
            )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "standard (non-master) application key")
        self.assertFalse(StudyMaterial.objects.filter(title="Present perfect").exists())

    def test_progress_upload_returns_json_redirect(self):
        user = get_user_model().objects.create_user(
            email="progress@afidu.test",
            password="test-password",
            first_name="Teacher",
        )
        self.client.force_login(user)

        response = self.client.post(
            reverse("study_materials:upload"),
            data=self.base_data(title="Progress lesson"),
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["redirect_url"], reverse("study_materials:list"))
        self.assertTrue(StudyMaterial.objects.filter(title="Progress lesson").exists())

    def test_switching_to_write_up_removes_the_stored_file(self):
        material = StudyMaterial.objects.create(
            title="Old PDF",
            material_type=StudyMaterial.TYPE_PDF,
            file=SimpleUploadedFile("old.pdf", b"%PDF-1.4 old"),
            category="reading",
            level="Beginner 1",
        )
        old_name = material.file.name
        storage = material.file.storage
        self.assertTrue(storage.exists(old_name))

        form = StudyMaterialForm(
            data=self.base_data(title="Old PDF"),
            instance=material,
        )

        self.assertTrue(form.is_valid(), form.errors)
        material = form.save()

        self.assertFalse(material.file)
        self.assertFalse(storage.exists(old_name))
