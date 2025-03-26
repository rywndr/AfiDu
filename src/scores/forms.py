from django import forms
from .models import Score, ScoreConfig

class ScoreForm(forms.ModelForm):
    class Meta:
        model = Score
        fields = ["mid_term", "finals"]

    def __init__(self, *args, **kwargs):
        self.config = ScoreConfig.objects.first() or ScoreConfig.objects.create(
            num_exercises=6,
            formula="(ex_sum + mid_term + finals) / (num_exercises + 2)"
        )
        super().__init__(*args, **kwargs)
        self.exercise_fields = []
        for i in range(1, self.config.num_exercises + 1):
            field_name = f"exercise_{i}"
            self.fields[field_name] = forms.DecimalField(
                max_digits=5,
                decimal_places=2,
                required=False,
                max_value=99.99,
                widget=forms.NumberInput(attrs={"style": "max-width: 4rem;"})
            )

            if self.instance and self.instance.pk and self.instance.exercise_scores:
                try:
                    self.fields[field_name].initial = self.instance.exercise_scores[i - 1]
                except IndexError:
                    self.fields[field_name].initial = 0
            self.exercise_fields.append(self[field_name])
            
        self.fields["mid_term"].max_value = 99.99
        self.fields["finals"].max_value = 99.99
        self.fields["mid_term"].widget.attrs.update({"style": "max-width: 4rem;"})
        self.fields["finals"].widget.attrs.update({"style": "max-width: 4rem;"})

    def save(self, commit=True):
        instance = super().save(commit=False)
        exercise_scores = []
        for i in range(1, self.config.num_exercises + 1):
            field_name = f"exercise_{i}"
            score = self.cleaned_data.get(field_name)
            exercise_scores.append(float(score) if score is not None else 0)
        instance.exercise_scores = exercise_scores
        if commit:
            instance.save()
        return instance

class ScoreConfigForm(forms.ModelForm):
    class Meta:
        model = ScoreConfig
        fields = ["num_exercises", "formula"]
