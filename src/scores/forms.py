from django.forms import ModelForm

from .models import Score


class ScoreForm(ModelForm):
    class Meta:
        model = Score
        fields = ["e1", "e2", "e3", "e4", "e5", "e6", "mid_term", "finals"]
