from datetime import time

from django.test import TestCase

from .models import Student, StudentClass


class StudentClassSlugTests(TestCase):
    def make_class(self, name):
        return StudentClass.objects.create(
            name=name,
            start_time=time(9),
            end_time=time(10),
            days=["monday"],
        )

    def test_slug_is_generated_from_the_class_name(self):
        student_class = self.make_class("Computer Science 101")

        self.assertEqual(student_class.slug, "computer-science-101")

    def test_slug_collision_gets_a_unique_suffix_and_stays_stable(self):
        first = self.make_class("Mawar Class")
        second = self.make_class("Mawar-Class")

        self.assertEqual(first.slug, "mawar-class")
        self.assertEqual(second.slug, "mawar-class-2")

        first.name = "Renamed Class"
        first.save()
        first.refresh_from_db()
        self.assertEqual(first.slug, "mawar-class")


class StudentPublicIdTests(TestCase):
    def test_students_get_distinct_compact_uuid_public_ids(self):
        first = Student()
        second = Student()

        self.assertNotEqual(first.public_id, second.public_id)
        self.assertRegex(first.public_id, r"^[A-Za-z0-9_-]{22}$")
        self.assertRegex(second.public_id, r"^[A-Za-z0-9_-]{22}$")
