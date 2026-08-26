from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase

from .models import Assignment, Question


class AssignmentScoreTargetTests(SimpleTestCase):
    def test_score_target_requires_a_complete_period(self):
        assignment = Assignment(
            title="Reading check",
            category="reading",
            level="Beginner 1",
            score_target="exercise_1",
        )

        with self.assertRaises(ValidationError) as raised:
            assignment.full_clean(
                exclude=["student_class", "material", "created_by"],
                validate_unique=False,
                validate_constraints=False,
            )

        self.assertIn("score_target", raised.exception.message_dict)

    def test_score_target_accepts_an_exercise_or_exam_field(self):
        for target in ("exercise_3", "mid_term", "finals"):
            with self.subTest(target=target):
                assignment = Assignment(
                    title="Reading check",
                    category="reading",
                    level="Beginner 1",
                    year=2026,
                    semester="mid",
                    score_target=target,
                )

                assignment.full_clean(
                    exclude=["student_class", "material", "created_by"],
                    validate_unique=False,
                    validate_constraints=False,
                )


class QuestionAudioTests(SimpleTestCase):
    def test_recorded_audio_is_manually_graded(self):
        question = Question(kind=Question.KIND_AUDIO_RECORDING)

        self.assertFalse(question.has_choices)
        self.assertFalse(question.is_auto_gradable)

    def test_question_audio_accepts_only_mp3(self):
        question = Question(
            prompt="Listen",
            audio=SimpleUploadedFile("prompt.wav", b"audio", content_type="audio/wav"),
        )

        with self.assertRaises(ValidationError):
            question.full_clean(exclude=["assignment"])
