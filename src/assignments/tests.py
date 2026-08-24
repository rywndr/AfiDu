from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase

from .models import Question


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
