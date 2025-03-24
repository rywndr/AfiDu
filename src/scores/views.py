from django.shortcuts import redirect, render
from django.views import View
from django.core.paginator import Paginator
from datetime import datetime

from students.models import Student
from .forms import ScoreForm
from .models import Score

# Create your views here.
class ScoreListView(View):
    template_name = "scores/score_list.html"

    def get_context_data(self, year, semester, category):
        # get filter params dari url
        search_query = self.request.GET.get("q", "")
        class_filter = self.request.GET.get("class_filter", "")
        
        # filter murid based on search query and class
        students = Student.objects.all()
        if search_query:
            students = students.filter(name__icontains=search_query)
        if class_filter:
            students = students.filter(assigned_class=class_filter)

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
        
        # pagination, get params default to 5
        per_page_str = self.request.GET.get("per_page", "5")
        try:
            per_page = int(per_page_str)
        except ValueError:
            per_page = 5

        paginator = Paginator(forms, per_page)
        page_number = self.request.GET.get("page")
        page_obj = paginator.get_page(page_number)

        context = {
            "forms": page_obj.object_list,
            "page_obj": page_obj,
            "is_paginated": page_obj.has_other_pages(),
            "current_per_page": str(per_page),
            "year": year,
            "semester": semester,
            "category": category,
            "years": range(2025, 2033),
            "semesters": [("odd", "Odd Semester"), ("even", "Even Semester")],
            "categories": [
                ("reading", "Reading"),
                ("writing", "Writing"),
                ("listening", "Listening"),
                ("speaking", "Speaking"),
            ],
            "search_query": search_query,
            "class_filter": class_filter,
            "class_choices": Student._meta.get_field("assigned_class").choices,
            "active_tab_title": "Scores",
            "active_tab_icon": "fa-chart-bar",
        }
        return context

    def get(self, request, *args, **kwargs):
        # default filter params: pake current year if not provided
        current_year = str(datetime.now().year)
        year = request.GET.get("year", current_year)
        semester = request.GET.get("semester", "odd")
        category = request.GET.get("category", "reading")
        context = self.get_context_data(year, semester, category)
        return render(request, self.template_name, context)

    def post(self, request, *args, **kwargs):
        # ambil filter params dari form: pake current year if not provided
        current_year = str(datetime.now().year)
        year = request.POST.get("year", current_year)
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