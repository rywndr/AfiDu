from django import forms
from django.core.validators import MaxValueValidator, MinValueValidator

from .models import (
    SCORE_CATEGORIES,
    SCORE_SOURCE_MANUAL,
    SEMESTER_CHOICES,
    Score,
    ScoreConfig,
    ScoreEntry,
    percentage_formula,
)


class ScoreForm(forms.ModelForm):
    class Meta:
        model = Score
        fields = ["mid_term", "mid_term_note", "finals", "finals_note"]

    def __init__(
        self, *args, year=None, semester=None, category=None, config=None, **kwargs
    ):
        self.year = year
        self.semester = semester
        self.category = category

        # use most specific config; callers rendering a page of rows resolve it
        # once and pass it in rather than paying for a lookup per form
        if config is None:
            config = ScoreConfig.resolve(year, semester, category)

        self.config = config
        super().__init__(*args, **kwargs)
        self.exercise_fields = []
        self.exercise_items = []

        # read the existing entries once rather than per field
        if self.instance and self.instance.pk:
            existing_points = self.instance.exercise_points(config.num_exercises)
            existing_entries = {
                entry.slot: entry for entry in self.instance.entries.all()
            }
        else:
            existing_points = []
            existing_entries = {}

        for i in range(1, self.config.num_exercises + 1):
            field_name = f"exercise_{i}"
            note_field_name = f"exercise_{i}_note"
            entry = existing_entries.get(i)
            self.fields[field_name] = forms.DecimalField(
                max_digits=5,
                decimal_places=2,
                required=False,
                max_value=100,
                widget=forms.NumberInput(
                    attrs={
                        min: "0",
                        "oninput": "this.value = this.value.replace(/[^0-9.]/g, '');",
                    },
                ),
            )
            self.fields[field_name].disabled = bool(
                entry and entry.source != SCORE_SOURCE_MANUAL
            )
            self.fields[note_field_name] = forms.CharField(
                required=False,
                max_length=255,
                initial=entry.note if entry else "",
                widget=forms.TextInput(
                    attrs={
                        "placeholder": "Add note",
                        "aria-label": f"Exercise {i} note",
                    }
                ),
            )

            try:
                value = existing_points[i - 1]
                self.fields[field_name].initial = f"{value:.2f}"
            except IndexError:
                self.fields[field_name].initial = "0.00"

            self.exercise_fields.append(self[field_name])
            self.exercise_items.append(
                {
                    "field": self[field_name],
                    "note_field": self[note_field_name],
                    "is_automatic": bool(
                        entry and entry.source != SCORE_SOURCE_MANUAL
                    ),
                    "assignment": entry.assignment if entry else None,
                }
            )

        for field in ["mid_term", "finals"]:
            self.fields[field].max_value = 100
            self.fields[field].min_value = 0
            self.fields[field].initial = "0.00"
            self.fields[field].widget.attrs.update(
                {
                    "max": "100",
                    "min": "0",
                }
            )
            source = getattr(self.instance, f"{field}_source", SCORE_SOURCE_MANUAL)
            self.fields[field].disabled = source != SCORE_SOURCE_MANUAL

        for field in ["mid_term_note", "finals_note"]:
            self.fields[field].required = False
            self.fields[field].widget.attrs.update(
                {"placeholder": "Add note", "aria-label": field.replace("_", " ")}
            )

        self.mid_term_item = {
            "field": self["mid_term"],
            "note_field": self["mid_term_note"],
            "source": getattr(self.instance, "mid_term_source", SCORE_SOURCE_MANUAL),
            "assignment": getattr(self.instance, "mid_term_assignment", None),
            "is_automatic": (
                getattr(self.instance, "mid_term_source", SCORE_SOURCE_MANUAL)
                != SCORE_SOURCE_MANUAL
            ),
        }
        self.finals_item = {
            "field": self["finals"],
            "note_field": self["finals_note"],
            "source": getattr(self.instance, "finals_source", SCORE_SOURCE_MANUAL),
            "assignment": getattr(self.instance, "finals_assignment", None),
            "is_automatic": (
                getattr(self.instance, "finals_source", SCORE_SOURCE_MANUAL)
                != SCORE_SOURCE_MANUAL
            ),
        }

    def save(self, commit=True):
        instance = super().save(commit=False)
        exercise_scores = []
        for i in range(1, self.config.num_exercises + 1):
            field_name = f"exercise_{i}"
            score = self.cleaned_data.get(field_name)
            exercise_scores.append(score if score is not None else 0)
        instance.set_exercise_scores(exercise_scores)
        instance.mid_term = self.cleaned_data.get("mid_term") or 0
        instance.finals = self.cleaned_data.get("finals") or 0
        if commit:
            instance.save()
            self.save_entry_notes(instance)
        return instance

    def save_entry_notes(self, instance=None):
        instance = instance or self.instance
        notes = {
            slot: self.cleaned_data.get(f"exercise_{slot}_note", "")
            for slot in range(1, self.config.num_exercises + 1)
        }
        entries = list(instance.entries.filter(slot__in=notes))
        changed = []
        for entry in entries:
            if entry.note != notes[entry.slot]:
                entry.note = notes[entry.slot]
                changed.append(entry)
        if changed:
            ScoreEntry.objects.bulk_update(changed, ["note", "updated_at"])


class ScoreConfigForm(forms.ModelForm):
    exercise_weight = forms.DecimalField(
        label="Exercises", min_value=0, max_value=100, decimal_places=2
    )
    mid_term_weight = forms.DecimalField(
        label="Midterm", min_value=0, max_value=100, decimal_places=2
    )
    finals_weight = forms.DecimalField(
        label="Final exam", min_value=0, max_value=100, decimal_places=2
    )

    class Meta:
        model = ScoreConfig
        fields = ["year", "semester", "category", "num_exercises"]
        widgets = {
            "year": forms.Select(),
            "semester": forms.Select(choices=[("", "-------")] + SEMESTER_CHOICES),
            "category": forms.Select(choices=[("", "-------")] + SCORE_CATEGORIES),
        }

    def __init__(self, *args, **kwargs):
        years = kwargs.pop("years", [])
        super().__init__(*args, **kwargs)
        weights = self.instance.weight_percentages()
        for field, value in zip(
            ("exercise_weight", "mid_term_weight", "finals_weight"), weights
        ):
            self.fields[field].initial = value
        if years:
            self.fields["year"].widget.choices = [("", "-------")] + [
                (y, y) for y in years
            ]

        self.fields["year"].required = False
        self.fields["semester"].required = False
        self.fields["category"].required = False
        self.fields["num_exercises"].validators = [
            MinValueValidator(1, "Number of exercises must be at least 1"),
            MaxValueValidator(10, "Number of exercises cannot exceed 10"),
        ]

    def clean_num_exercises(self):
        num_exercises = self.cleaned_data.get("num_exercises")
        if num_exercises is None:
            raise forms.ValidationError("Number of exercises is required")
        if num_exercises < 1:
            raise forms.ValidationError("Number of exercises must be at least 1")
        if num_exercises > 10:
            raise forms.ValidationError("Number of exercises cannot exceed 10")
        return num_exercises

    def clean(self):
        cleaned_data = super().clean()
        weights = [
            cleaned_data.get("exercise_weight"),
            cleaned_data.get("mid_term_weight"),
            cleaned_data.get("finals_weight"),
        ]
        if all(weight is not None for weight in weights):
            total = sum(weights)
            if total != 100:
                raise forms.ValidationError(
                    f"Grade weights must total 100%. Current total: {total:g}%."
                )
            self.instance.formula = percentage_formula(*weights)
        return cleaned_data
