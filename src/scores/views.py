from django.shortcuts import redirect, render
from django.views.generic import TemplateView, UpdateView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib import messages
from django.core.paginator import Paginator
from django.urls import reverse_lazy
from datetime import datetime

from students.models import Student, StudentClass
from .forms import ScoreForm, ScoreConfigForm
from .models import Score, ScoreConfig

# Create your views here.
class ScoreContextMixin:
    def get_score_context(self):
        return {
            "available_classes": StudentClass.objects.all(),
            "active_tab_title": "Scores",
            "active_tab_icon": "fa-chart-bar",
            "years": range(2025, 2033),
            "semesters": [("odd", "Odd Semester"), ("even", "Even Semester")],
            "categories": [
                ("reading", "Reading"),
                ("writing", "Writing"),
                ("listening", "Listening"),
                ("speaking", "Speaking"),
            ],
        }
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update(self.get_score_context())
        return context

class ScoreListView(LoginRequiredMixin, ScoreContextMixin, TemplateView):
    template_name = "scores/score_list.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # get filter params dari url
        search_query = self.request.GET.get("q", "")
        class_filter = self.request.GET.get("class_filter", "")
        current_year = str(datetime.now().year)
        year = self.request.GET.get("year", current_year)
        semester = self.request.GET.get("semester", "odd")
        category = self.request.GET.get("category", "reading")
        
        # get config
        config = ScoreConfig.objects.first() or ScoreConfig.objects.create(
            num_exercises=6,
            formula="(ex_sum + mid_term + finals) / (num_exercises + 2)"
        )
        
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
        
        context.update({
            "forms": page_obj.object_list,
            "page_obj": page_obj,
            "is_paginated": page_obj.has_other_pages(),
            "current_per_page": str(per_page),
            "year": year,
            "semester": semester,
            "category": category,
            "search_query": search_query,
            "class_filter": class_filter,
            "class_choices": Student._meta.get_field("assigned_class").choices,
            "exercise_range": range(config.num_exercises),
            "score_formula": config.formula,
        })
        return context

    def post(self, request, *args, **kwargs):
        current_year = str(datetime.now().year)
        year = request.POST.get("year", current_year)
        semester = request.POST.get("semester", "odd")
        category = request.POST.get("category", "reading")
        search_query = request.POST.get("q", "")
        class_filter = request.POST.get("class_filter", "")
        per_page = self.request.GET.get("per_page", "5")
        page = self.request.GET.get("page", "")
        
        config = ScoreConfig.objects.first() or ScoreConfig.objects.create(
            num_exercises=6,
            formula="(ex_sum + mid_term + finals) / (num_exercises + 2)"
        )
        
        for student in Student.objects.all():
            prefix = f"student_{student.id}"
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

class ScoreConfigView(LoginRequiredMixin, ScoreContextMixin, UpdateView):
    model = ScoreConfig
    form_class = ScoreConfigForm
    template_name = "scores/config.html"
    success_url = reverse_lazy("scores:score-list")

    def get_object(self, queryset=None):
        obj, created = ScoreConfig.objects.get_or_create(
            id=1,
            defaults={"num_exercises": 6, "formula": "(ex_sum + mid_term + finals) / (num_exercises + 2)"}
        )
        return obj

    def form_valid(self, form):
        messages.success(self.request, "Configuration saved successfully.")
        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, "Failed to save configuration. Please try again.")
        return super().form_invalid(form)