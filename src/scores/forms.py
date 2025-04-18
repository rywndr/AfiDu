from django import forms
from .models import Score, ScoreConfig

class ScoreForm(forms.ModelForm):
    class Meta:
        model = Score
        fields = ["mid_term", "finals"]

    def __init__(self, *args, **kwargs):
        self.config = ScoreConfig.objects.first() or ScoreConfig.objects.create(
            num_exercises=5,
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
                max_value=100,
                widget=forms.NumberInput(attrs={"style": "max-width: 4rem;"})
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
            self.fields[field].widget.attrs.update({
                "style": "max-width: 4rem;",
                "max": "100",
                "min": "0"
            })

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
        fields = ["num_exercises", "formula"]

