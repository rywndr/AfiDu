from django.shortcuts import redirect, render
from django.contrib import messages
from django.views import View
from django.core.paginator import Paginator
from datetime import datetime

from students.models import Student
from .forms import ScoreForm, ScoreConfigForm
from .models import Score, ScoreConfig

# Create your views here.
class ScoreListView(View):
    template_name = "scores/score_list.html"

    def get_context_data(self, year, semester, category):
        # get filter params dari url
        search_query = self.request.GET.get("q", "")
        class_filter = self.request.GET.get("class_filter", "")
        config = ScoreConfig.objects.first() or ScoreConfig.objects.create(num_exercises=6, formula="(ex_sum + mid_term + finals) / (num_exercises + 2)")
        
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
            "exercise_range": range(config.num_exercises),
            "active_tab_title": "Scores",
            "active_tab_icon": "fa-chart-bar",
        }
        return context

    def get(self, request, *args, **kwargs):
        if "anchor_redirected" not in request.GET:
            query_params = request.GET.copy()
            query_params["anchor_redirected"] = "true"
            redirect_url = f"{request.path}?{query_params.urlencode()}#score-table"
            return redirect(redirect_url)

        current_year = str(datetime.now().year)
        year = request.GET.get("year", current_year)
        semester = request.GET.get("semester", "odd")
        category = request.GET.get("category", "reading")
        context = self.get_context_data(year, semester, category)
        return render(request, self.template_name, context)

    def post(self, request, *args, **kwargs):
        current_year = str(datetime.now().year)
        year = request.POST.get("year", current_year)
        semester = request.POST.get("semester", "odd")
        category = request.POST.get("category", "reading")
        students = Student.objects.all()

        search_query = request.POST.get("q", "")
        class_filter = request.POST.get("class_filter", "")
        per_page = request.GET.get("per_page", "5")
        page = request.GET.get("page", "")

        # import scoreconfig to get num_exercises
        from .models import ScoreConfig
        config = ScoreConfig.objects.first() or ScoreConfig.objects.create(
            num_exercises=6,
            formula="(ex_sum + mid_term + finals) / (num_exercises + 2)"
        )

        for student in students:
            prefix = f"student_{student.id}"
            # get existing score instance or create a new one
            try:
                score_instance = Score.objects.get(
                    student=student, year=year, semester=semester, category=category
                )
            except Score.DoesNotExist:
                score_instance = None

            form = ScoreForm(request.POST, instance=score_instance, prefix=prefix)
            if form.is_valid():
                score = form.save(commit=False)
                score.student = student
                score.year = year
                score.semester = semester
                score.category = category
                score.save()
        # redirect url to the same page with the same filters
        redirect_url = (
            f"{request.path}?year={year}"
            f"&semester={semester}"
            f"&category={category}"
            f"&q={search_query}"
            f"&class_filter={class_filter}"
            f"&per_page={per_page}"
        )
        if page:
            redirect_url += f"&page={page}"
        return redirect(redirect_url)

class ScoreConfigView(View):
    template_name = "scores/config.html"

    def get(self, request, *args, **kwargs):
        # pake singleton pattern to avoid multiple config
        config, _ = ScoreConfig.objects.get_or_create(
            id=1,
            defaults={"num_exercises": 6, "formula": "(ex_sum + mid_term + finals) / (num_exercises + 2)"}
        )
        context = {"form": ScoreConfigForm(instance=config), "active_tab_title": "Scores Config", "active_tab_icon": "fa-cogs"}
        return render(request, self.template_name, context)

    def post(self, request, *args, **kwargs):
        config, _ = ScoreConfig.objects.get_or_create(
            id=1,
            defaults={"num_exercises": 6, "formula": "(ex_sum + mid_term + finals) / (num_exercises + 2)"}
        )
        form = ScoreConfigForm(request.POST, instance=config)
        if form.is_valid():
            form.save()
            messages.success(request, "Configuration saved successfully.")
            # redirect ke score-list after saving config
            return redirect("scores:score-list")
        else:
            messages.error(request, "Failed to save configuration. Please try again.")
        return render(request, self.template_name, {"form": form})
