from datetime import date
from decimal import Decimal

from django.test import SimpleTestCase, TestCase

from students.models import Student

from .forms import ScoreConfigForm, ScoreForm
from .models import Score, ScoreConfig, ScoreEntry, percentage_formula


class ScoreConfigFormTests(TestCase):
    def test_builds_formula_from_percentages(self):
        form = ScoreConfigForm(
            data={
                "year": "",
                "semester": "",
                "category": "",
                "num_exercises": 4,
                "exercise_weight": "25",
                "mid_term_weight": "20",
                "finals_weight": "55",
            }
        )

        self.assertTrue(form.is_valid(), form.errors)
        self.assertEqual(
            form.instance.formula,
            "0.25 * (ex_sum / num_exercises) + 0.2 * mid_term + 0.55 * finals",
        )

    def test_rejects_weights_that_do_not_total_100(self):
        form = ScoreConfigForm(
            data={
                "year": "",
                "semester": "",
                "category": "",
                "num_exercises": 5,
                "exercise_weight": "25",
                "mid_term_weight": "20",
                "finals_weight": "40",
            }
        )

        self.assertFalse(form.is_valid())
        self.assertIn("must total 100%", form.non_field_errors()[0])

    def test_reads_weights_from_legacy_average_formula(self):
        config = ScoreConfig(
            num_exercises=3,
            formula="(ex_sum + mid_term + finals) / (num_exercises + 2)",
        )

        self.assertEqual(
            config.weight_percentages(),
            (Decimal("60.00"), Decimal("20.00"), Decimal("20.00")),
        )


class ScoreFormulaTests(SimpleTestCase):
    def test_weighted_score_uses_exercise_average(self):
        config = ScoreConfig(
            num_exercises=2,
            formula=percentage_formula(25, 20, 55),
        )
        score = Score(
            year=2026,
            semester="mid",
            category="reading",
            mid_term=Decimal("80"),
            finals=Decimal("90"),
            exercise_scores=[Decimal("100"), Decimal("80")],
        )
        score.set_config(config)

        self.assertEqual(score.final_score, Decimal("88.00"))


class ScoreNoteFormTests(TestCase):
    def test_automatic_score_is_read_only_but_note_can_change(self):
        config = ScoreConfig.objects.create(num_exercises=1)
        student = Student.objects.create(
            name="Test Student",
            gender="male",
            age=10,
            date_of_birth=date(2016, 1, 1),
            contact_number="08123456789",
            address="Test address",
            level="basic",
        )
        score = Score.objects.create(
            student=student,
            year=2026,
            semester="mid",
            category="reading",
            mid_term=Decimal("88"),
            mid_term_source="assignment",
        )
        ScoreEntry.objects.create(
            score=score,
            slot=1,
            points=Decimal("75"),
            source=ScoreEntry.SOURCE_ASSIGNMENT,
        )
        form = ScoreForm(
            data={
                "exercise_1": "10",
                "exercise_1_note": "Needs follow-up",
                "mid_term": "10",
                "mid_term_note": "Imported after review",
                "finals": "0",
                "finals_note": "",
            },
            instance=score,
            year=2026,
            semester="mid",
            category="reading",
            config=config,
        )

        self.assertTrue(form.is_valid(), form.errors)
        saved = form.save()
        entry = saved.entries.get(slot=1)
        self.assertEqual(entry.points, Decimal("75"))
        self.assertEqual(entry.note, "Needs follow-up")
        self.assertEqual(entry.source, ScoreEntry.SOURCE_ASSIGNMENT)
        self.assertEqual(saved.mid_term, Decimal("88"))
        self.assertEqual(saved.mid_term_note, "Imported after review")
        self.assertEqual(saved.mid_term_source, "assignment")
