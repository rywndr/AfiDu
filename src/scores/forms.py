import re

from django import forms

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
                formula="(ex_sum + mid_term + finals) / (num_exercises + 2)",
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
            "formula": forms.TextInput(
                attrs={"class": "formula-input"}
            ),  # Add a class for JS targeting
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

    def clean_formula(self):
        formula = self.cleaned_data.get("formula")
        if formula:
            # Replace 'x' with '*' for multiplication
            formula = formula.replace("x", "*")

            # Remove all whitespace for easier processing
            formula_no_spaces = formula.replace(" ", "")

            # Define valid tokens: variables, operators, parentheses and numbers
            valid_vars = ["ex_sum", "mid_term", "finals", "num_exercises"]
            valid_operators = [
                "+",
                "-",
                "*",
                "/",
                "(",
                ")",
                ".",
                "0",
                "1",
                "2",
                "3",
                "4",
                "5",
                "6",
                "7",
                "8",
                "9",
            ]

            # Extract all variable-like tokens
            var_pattern = re.compile(r"[a-zA-Z_][a-zA-Z0-9_]*")
            variables = var_pattern.findall(formula_no_spaces)

            # Check if all variables are valid
            invalid_vars = [var for var in variables if var not in valid_vars]
            if invalid_vars:
                raise forms.ValidationError(
                    f"Invalid variable(s) in formula: {', '.join(invalid_vars)}. "
                    f"Only these variables are allowed: {', '.join(valid_vars)}"
                )

            # Check for invalid characters
            for char in formula_no_spaces:
                if not char.isalnum() and char not in valid_operators and char != "_":
                    raise forms.ValidationError(
                        f"Invalid character in formula: '{char}'"
                    )

        return formula
