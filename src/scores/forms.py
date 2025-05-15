from django import forms
from django.core.validators import MaxValueValidator, MinValueValidator

from .models import SCORE_CATEGORIES, SEMESTER_CHOICES, Score, ScoreConfig


class ScoreForm(forms.ModelForm):
    class Meta:
        model = Score
        fields = ["mid_term", "finals"]

    def __init__(self, *args, year=None, semester=None, category=None, **kwargs):
        self.year = year
        self.semester = semester
        self.category = category

        # use most specific config
        config = None
        if year and semester and category:
            try:
                config = ScoreConfig.objects.get(
                    year=year, semester=semester, category=category
                )
            except ScoreConfig.DoesNotExist:
                pass

        if not config and year and semester:
            try:
                config = ScoreConfig.objects.get(
                    year=year, semester=semester, category=None
                )
            except ScoreConfig.DoesNotExist:
                pass

        if not config and year:
            try:
                config = ScoreConfig.objects.get(
                    year=year, semester=None, category=None
                )
            except ScoreConfig.DoesNotExist:
                pass

        if not config:
            config = ScoreConfig.objects.filter(
                year=None, semester=None, category=None
            ).first() or ScoreConfig.objects.create(
                num_exercises=5,
                formula="0.30 * (ex_sum / num_exercises) + 0.30 * mid_term + 0.40 * finals",
            )

        self.config = config
        super().__init__(*args, **kwargs)
        self.exercise_fields = []
        for i in range(1, self.config.num_exercises + 1):
            field_name = f"exercise_{i}"
            self.fields[field_name] = forms.DecimalField(
                max_digits=5,
                decimal_places=2,
                required=False,
                max_value=100,
                widget=forms.NumberInput(
                    attrs={
                        "style": "max-width: 4rem;",
                        min: "0",
                        "oninput": "this.value = this.value.replace(/[^0-9.]/g, '');",
                    },
                ),
            )

            if self.instance and self.instance.pk and self.instance.exercise_scores:
                try:
                    value = self.instance.exercise_scores[i - 1]
                    self.fields[field_name].initial = f"{value:.2f}"
                except IndexError:
                    self.fields[field_name].initial = "0.00"
            else:
                self.fields[field_name].initial = "0.00"

            self.exercise_fields.append(self[field_name])

        for field in ["mid_term", "finals"]:
            self.fields[field].max_value = 100
            self.fields[field].min_value = 0
            self.fields[field].initial = "0.00"
            self.fields[field].widget.attrs.update(
                {
                    "style": "max-width: 4rem;",
                    "max": "100",
                    "min": "0",
                }
            )

    def save(self, commit=True):
        instance = super().save(commit=False)
        exercise_scores = []
        for i in range(1, self.config.num_exercises + 1):
            field_name = f"exercise_{i}"
            score = self.cleaned_data.get(field_name)
            exercise_scores.append(float(score) if score is not None else 0)
        instance.exercise_scores = exercise_scores
        instance.mid_term = self.cleaned_data.get("mid_term") or 0
        instance.finals = self.cleaned_data.get("finals") or 0
        if commit:
            instance.save()
        return instance


class ScoreConfigForm(forms.ModelForm):
    class Meta:
        model = ScoreConfig
        fields = ["year", "semester", "category", "num_exercises", "formula"]
        widgets = {
            "year": forms.Select(),
            "semester": forms.Select(choices=[("", "-------")] + SEMESTER_CHOICES),
            "category": forms.Select(choices=[("", "-------")] + SCORE_CATEGORIES),
        }

    def __init__(self, *args, **kwargs):
        years = kwargs.pop("years", [])
        super().__init__(*args, **kwargs)
        if years:
            self.fields["year"].widget.choices = [("", "-------")] + [
                (y, y) for y in years
            ]

        self.fields["year"].required = False
        self.fields["semester"].required = False
        self.fields["category"].required = False
        self.fields["num_exercises"].validators = [
            MinValueValidator(1, "Number of exercises must be at least 1"),
            MaxValueValidator(10, "Number of exercises cannot exceed 10")
        ]
        
    def clean_num_exercises(self):
        num_exercises = self.cleaned_data.get('num_exercises')
        if num_exercises is None:
            raise forms.ValidationError("Number of exercises is required")
        if num_exercises < 1:
            raise forms.ValidationError("Number of exercises must be at least 1")
        if num_exercises > 10:
            raise forms.ValidationError("Number of exercises cannot exceed 10")
        return num_exercises
