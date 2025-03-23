from django.shortcuts import redirect, render
from django.views import View

from students.models import Student
from .forms import ScoreForm
from .models import Score

# Create your views here.
class ScoreListView(View):
    template_name = "scores/score_list.html"

    def get_context_data(self, year, semester, category):
        students = Student.objects.all()
        forms = []
        for student in students:
            try:
                score = Score.objects.get(
                    student=student, year=year, semester=semester, category=category
                )
                form = ScoreForm(instance=score, prefix=f"student_{student.id}")
            except Score.DoesNotExist:
                form = ScoreForm(prefix=f"student_{student.id}")
            forms.append((student, form))

        context = {
            "forms": forms,
            "year": year,
            "semester": semester,
            "category": category,
            "years": range(2020, 2031),
            "semesters": [("odd", "Odd Semester"), ("even", "Even Semester")],
            "categories": [
                ("reading", "Reading"),
                ("writing", "Writing"),
                ("listening", "Listening"),
                ("speaking", "Speaking"),
            ],
            "active_tab_title": "Score",
            "active_tab_icon": "fa-chart-bar",
        }
        return context

    def get(self, request, *args, **kwargs):
        # default params
        year = request.GET.get("year", "2025")
        semester = request.GET.get("semester", "odd")
        category = request.GET.get("category", "reading")
        context = self.get_context_data(year, semester, category)
        return render(request, self.template_name, context)

    def post(self, request, *args, **kwargs):
        # get filter params dari hidden input
        year = request.POST.get("year", "2025")
        semester = request.POST.get("semester", "odd")
        category = request.POST.get("category", "reading")
        students = Student.objects.all()

        for student in students:
            prefix = f"student_{student.id}"
            form = ScoreForm(request.POST, prefix=prefix)
            if form.is_valid():
                score, created = Score.objects.get_or_create(
                    student=student,
                    year=year,
                    semester=semester,
                    category=category,
                )
                score.e1 = form.cleaned_data.get("e1")
                score.e2 = form.cleaned_data.get("e2")
                score.e3 = form.cleaned_data.get("e3")
                score.e4 = form.cleaned_data.get("e4")
                score.e5 = form.cleaned_data.get("e5")
                score.e6 = form.cleaned_data.get("e6")
                score.mid_term = form.cleaned_data.get("mid_term")
                score.finals = form.cleaned_data.get("finals")
                score.save()

        return redirect(
            f"{request.path}?year={year}&semester={semester}&category={category}"
        )