from datetime import datetime

from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.paginator import Paginator
from django.shortcuts import redirect
from django.urls import reverse_lazy
from django.views.generic import TemplateView, UpdateView

from students.models import LEVELS, Student, StudentClass

from .forms import ScoreConfigForm, ScoreForm
from .models import Score, ScoreConfig


class ScoreContextMixin:
    def get_score_context(self):
        return {
            "available_classes": StudentClass.objects.only('id', 'name'),
            "level": Student.level,
            "active_tab_title": "Scores",
            "active_tab_icon": "fa-chart-bar",
            "years": range(2025, 2033),
            "semesters": [("mid", "MID"), ("final", "FINAL")],
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

        search_query = self.request.GET.get("q", "")
        class_filter = self.request.GET.get("class_filter", "")
        level_filter = self.request.GET.get("level_filter", "")
        sort_by = self.request.GET.get("sort_by", "")
        current_year = str(datetime.now().year)

        if self.request.GET:
            year = self.request.GET.get("year", current_year)
            semester = self.request.GET.get("semester", "mid")
            category = self.request.GET.get("category", "reading")
            per_page_str = self.request.GET.get("per_page", "5")

            if year in ("", "None"):
                year = current_year
            if semester in ("", "None"):
                semester = "mid"
            if category in ("", "None"):
                category = "reading"

            self.request.session["scores_year"] = year
            self.request.session["scores_semester"] = semester
            self.request.session["scores_category"] = category
            self.request.session["scores_search_query"] = search_query
            self.request.session["scores_class_filter"] = class_filter
            self.request.session["scores_level_filter"] = level_filter
            self.request.session["scores_per_page"] = per_page_str
            self.request.session["scores_sort_by"] = sort_by
        else:
            year = self.request.session.get("scores_year", current_year)
            semester = self.request.session.get("scores_semester", "mid")
            category = self.request.session.get("scores_category", "reading")
            search_query = self.request.session.get("scores_search_query", "")
            class_filter = self.request.session.get("scores_class_filter", "")
            level_filter = self.request.session.get("scores_level_filter", "")
            per_page_str = self.request.session.get("scores_per_page", "5")
            sort_by = self.request.session.get("scores_sort_by", "")

        config = None
        try:
            config = ScoreConfig.objects.get(
                year=year, semester=semester, category=category
            )
        except ScoreConfig.DoesNotExist:
            try:
                config = ScoreConfig.objects.get(
                    year=year, semester=semester, category=None
                )
            except ScoreConfig.DoesNotExist:
                try:
                    config = ScoreConfig.objects.get(
                        year=year, semester=None, category=None
                    )
                except ScoreConfig.DoesNotExist:
                    config = ScoreConfig.objects.filter(
                        year=None, semester=None, category=None
                    ).first() or ScoreConfig.objects.create(
                        num_exercises=5,
                        formula="0.30 * (ex_sum / num_exercises) + 0.30 * mid_term + 0.40 * finals",
                    )

        students = Student.objects.select_related('assigned_class')
        if search_query:
            students = students.filter(name__icontains=search_query)
        if class_filter:
            students = students.filter(assigned_class=class_filter)
        if level_filter:
            students = students.filter(level=level_filter)
            
        if sort_by == "name_asc":
            students = students.order_by("name")
        elif sort_by == "name_desc":
            students = students.order_by("-name")

        try:
            per_page = int(per_page_str)
        except ValueError:
            per_page = 5
        
        paginator = Paginator(students, per_page)
        page_number = self.request.GET.get("page")
        page_obj = paginator.get_page(page_number)
        current_page_students = page_obj.object_list

        existing_scores = {}
        if current_page_students:
            student_ids = [s.id for s in current_page_students]
            scores_qs = Score.objects.filter(
                student_id__in=student_ids,
                year=year,
                semester=semester,
                category=category,
            ).select_related('student')
            
            for score in scores_qs:
                existing_scores[score.student_id] = score

        forms = []
        for student in current_page_students:
            score = existing_scores.get(student.id)
            if score:
                form = ScoreForm(
                    instance=score,
                    prefix=f"student_{student.id}",
                    year=year,
                    semester=semester,
                    category=category,
                )
            else:
                form = ScoreForm(
                    prefix=f"student_{student.id}",
                    year=year,
                    semester=semester,
                    category=category,
                )
            form.student = student
            forms.append((student, form))

        context.update(
            {
                "forms": forms,
                "page_obj": page_obj,
                "is_paginated": page_obj.has_other_pages(),
                "current_per_page": str(per_page),
                "year": year,
                "semester": semester,
                "category": category,
                "search_query": search_query,
                "class_filter": class_filter,
                "current_level_filter": level_filter,
                "current_sort_by": sort_by,
                "class_choices": Student.assigned_class,
                "level_choices": LEVELS,
                "exercise_range": range(config.num_exercises),
                "score_formula": config.formula,
            }
        )
        return context

    def post(self, request, *args, **kwargs):
        current_year = str(datetime.now().year)
        year = request.POST.get(
            "year", request.session.get("scores_year", current_year)
        )
        semester = request.POST.get(
            "semester", request.session.get("scores_semester", "mid")
        )
        category = request.POST.get(
            "category", request.session.get("scores_category", "reading")
        )
        search_query = request.POST.get(
            "q", request.session.get("scores_search_query", "")
        )
        class_filter = request.POST.get(
            "class_filter", request.session.get("scores_class_filter", "")
        )
        level_filter = request.POST.get(
            "level_filter", request.session.get("scores_level_filter", "")
        )
        per_page = request.session.get("scores_per_page", "5")
        page = self.request.GET.get("page", "")

        request.session["scores_year"] = year
        request.session["scores_semester"] = semester
        request.session["scores_category"] = category
        request.session["scores_search_query"] = search_query
        request.session["scores_class_filter"] = class_filter
        request.session["scores_level_filter"] = level_filter

        students = Student.objects.select_related('assigned_class')
        if search_query:
            students = students.filter(name__icontains=search_query)
        if class_filter:
            students = students.filter(assigned_class=class_filter)
        if level_filter:
            students = students.filter(level=level_filter)
            
        sort_by = request.session.get("scores_sort_by", "")
        if sort_by == "name_asc":
            students = students.order_by("name")
        elif sort_by == "name_desc":
            students = students.order_by("-name")

        try:
            per_page_int = int(per_page)
        except ValueError:
            per_page_int = 5
        paginator = Paginator(students, per_page_int)
        page_obj = paginator.get_page(page)
        current_page_students = page_obj.object_list

        student_ids = [s.id for s in current_page_students]
        existing_scores = {}
        scores_qs = Score.objects.filter(
            student_id__in=student_ids, 
            year=year, 
            semester=semester, 
            category=category
        ).select_related('student')
        
        for score in scores_qs:
            existing_scores[score.student_id] = score

        for student in current_page_students:
            prefix = f"student_{student.id}"
            has_form_data = any(key.startswith(prefix) for key in request.POST.keys())
            
            if has_form_data:
                score_instance = existing_scores.get(student.id)
                form = ScoreForm(
                    request.POST,
                    instance=score_instance,
                    prefix=prefix,
                    year=year,
                    semester=semester,
                    category=category,
                )
                if form.is_valid():
                    score = form.save(commit=False)
                    score.student = student
                    score.year = year
                    score.semester = semester
                    score.category = category
                    score.save()

        redirect_url = (
            f"{request.path}?year={year}"
            f"&semester={semester}"
            f"&category={category}"
            f"&q={search_query}"
            f"&class_filter={class_filter}"
            f"&level_filter={level_filter}"
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

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        from datetime import datetime

        start = datetime.now().year
        kwargs["years"] = range(start, start + 8)
        return kwargs

    def get_object(self, queryset=None):
        if hasattr(self, "request"):
            if self.request.method == "POST":
                year = self.request.POST.get("edit_year") or None
                semester = self.request.POST.get("edit_semester") or None
                category = self.request.POST.get("edit_category") or None
            else:
                year = self.request.GET.get("year") or None
                semester = self.request.GET.get("semester") or None
                category = self.request.GET.get("category") or None
        else:
            year = None
            semester = None
            category = None

        if year == "None" or year == "":
            year = None
        if semester == "None" or semester == "":
            semester = None
        if category == "None" or category == "":
            category = None

        if year is not None:
            try:
                year = int(year)
            except ValueError:
                year = None

        filters = {}
        if year is not None:
            filters["year"] = year
        if semester is not None:
            filters["semester"] = semester
        if category is not None:
            filters["category"] = category

        is_global_default = year is None and (
            semester is not None or category is not None
        )
        if is_global_default and hasattr(self, "request"):
            messages.error(
                self.request,
                "Invalid configuration: If year is empty, semester and category must also be empty.",
            )
            return None

        try:
            return ScoreConfig.objects.get(**filters)
        except ScoreConfig.DoesNotExist:
            return ScoreConfig(**filters)
        except ScoreConfig.MultipleObjectsReturned:
            return ScoreConfig.objects.filter(**filters).first()

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx["configs"] = ScoreConfig.objects.all().order_by(
            "year", "semester", "category"
        )
        return ctx

    def post(self, request, *args, **kwargs):
        if request.GET.get("action") == "delete":
            year = request.GET.get("year") or None
            semester = request.GET.get("semester") or None
            category = request.GET.get("category") or None

            if year is None and semester is None and category is None:
                messages.error(request, "Cannot delete global default configuration.")
                return redirect(self.request.path)

            try:
                config = ScoreConfig.objects.get(
                    year=year, semester=semester, category=category
                )
                config.delete()
                messages.success(request, "Configuration deleted successfully.")
                return redirect(self.request.path)
            except ScoreConfig.DoesNotExist:
                messages.error(request, "Configuration not found.")
                return redirect(self.request.path)

        return super().post(request, *args, **kwargs)

    def form_valid(self, form):
        cd = form.cleaned_data

        edit_year = self.request.POST.get("edit_year") or None
        edit_semester = self.request.POST.get("edit_semester") or None
        edit_category = self.request.POST.get("edit_category") or None

        if edit_year == "":
            edit_year = None
        elif edit_year is not None:
            try:
                edit_year = int(edit_year)
            except ValueError:
                edit_year = None

        if edit_semester == "":
            edit_semester = None
        if edit_category == "":
            edit_category = None

        year = (
            edit_year
            if edit_year is not None or edit_year == ""
            else cd.get("year") or None
        )
        semester = (
            edit_semester
            if edit_semester is not None or edit_semester == ""
            else cd.get("semester") or None
        )
        category = (
            edit_category
            if edit_category is not None or edit_category == ""
            else cd.get("category") or None
        )

        if self.request.GET.get("action") == "delete":
            try:
                config = ScoreConfig.objects.get(
                    year=year, semester=semester, category=category
                )
                config.delete()
                messages.success(self.request, "Configuration deleted successfully.")
                return redirect(self.get_success_url())
            except ScoreConfig.DoesNotExist:
                messages.error(self.request, "Configuration not found.")
                return redirect(self.get_success_url())

        if year is None and (semester is not None or category is not None):
            messages.error(
                self.request,
                "Invalid configuration: If year is empty, semester and category must also be empty.",
            )
            return self.form_invalid(form)

        if year is None and semester is None and category is None:
            existing_global = (
                ScoreConfig.objects.filter(year=None, semester=None, category=None)
                .exclude(pk=getattr(self.object, "pk", None))
                .exists()
            )

            if existing_global:
                messages.error(
                    self.request, "There can only be one global default configuration."
                )
                return self.form_invalid(form)

        config, created = ScoreConfig.objects.get_or_create(
            year=year,
            semester=semester,
            category=category,
            defaults={
                "num_exercises": cd["num_exercises"],
                "formula": cd["formula"],
            },
        )
        if not created:
            config.num_exercises = cd["num_exercises"]
            config.formula = cd["formula"]
            config.save()

        filters = {}
        scores_to_update = []
        for score in Score.objects.filter(**filters).only('id', 'exercise_scores'):
            current_scores = score.exercise_scores or []
            new_scores = []
            for i in range(config.num_exercises):
                if i < len(current_scores):
                    new_scores.append(current_scores[i])
                else:
                    new_scores.append(0)

            if new_scores != score.exercise_scores:
                score.exercise_scores = new_scores
                scores_to_update.append(score)
        
        if scores_to_update:
            Score.objects.bulk_update(scores_to_update, ['exercise_scores'])

        messages.success(self.request, "Configuration saved successfully.")
        return redirect(self.request.path)

    def form_invalid(self, form):
        existing_messages = False
        if hasattr(self, "request") and hasattr(self.request, "_messages"):
            existing_messages = any(
                m.level == messages.ERROR for m in messages.get_messages(self.request)
            )

        if not existing_messages:
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(self.request, f"{error}")
            
            if not form.errors:
                messages.error(
                    self.request, "Failed to save configuration. Please try again."
                )

        return super().form_invalid(form)

    def get_success_url(self):
        year = self.request.session.get("scores_year")
        semester = self.request.session.get("scores_semester")
        category = self.request.session.get("scores_category")
        search_query = self.request.session.get("scores_search_query", "")
        class_filter = self.request.session.get("scores_class_filter", "")
        level_filter = self.request.session.get("scores_level_filter", "")
        per_page = self.request.session.get("scores_per_page", "5")

        if self.request.GET.get("action") == "delete":
            return (
                f"{reverse_lazy('scores:score-list')}"
                f"?year={year}"
                f"&semester={semester}"
                f"&category={category}"
                f"&q={search_query}"
                f"&class_filter={class_filter}"
                f"&level_filter={level_filter}"
                f"&per_page={per_page}"
            )

        return self.request.path
