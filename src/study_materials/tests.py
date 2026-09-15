import uuid

from django.test import SimpleTestCase

from .models import StudyMaterial


class PublicIdentifierTests(SimpleTestCase):
    def test_study_materials_get_distinct_uuid_public_ids(self):
        first = StudyMaterial()
        second = StudyMaterial()

        self.assertIsInstance(first.public_id, uuid.UUID)
        self.assertIsInstance(second.public_id, uuid.UUID)
        self.assertNotEqual(first.public_id, second.public_id)
