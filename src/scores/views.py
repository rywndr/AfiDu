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


# Create your views here.
class ScoreContextMixin:
    def get_score_context(self):
        return {
            "available_classes": StudentClass.objects.all(),
            "level": Student.level,
            "active_tab_title": "Scores",
            "active_tab_icon": "fa-chart-bar",
            "years": range(2025, 2033),
            "semesters": [("mid", "MID"), ("final", "FINALS")],
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

        # get filter params from URL or session
        search_query = self.request.GET.get("q", "")
        class_filter = self.request.GET.get("class_filter", "")
        level_filter = self.request.GET.get("level_filter", "")
        current_year = str(datetime.now().year)

        # if params exist in GET, update session
        if self.request.GET:
            year = self.request.GET.get("year", current_year)
            semester = self.request.GET.get("semester", "mid")
            category = self.request.GET.get("category", "reading")
            per_page_str = self.request.GET.get("per_page", "5")

            # store filter values in session
            self.request.session["scores_year"] = year
            self.request.session["scores_semester"] = semester
            self.request.session["scores_category"] = category
            self.request.session["scores_search_query"] = search_query
            self.request.session["scores_class_filter"] = class_filter
            self.request.session["scores_level_filter"] = level_filter
            self.request.session["scores_per_page"] = per_page_str
        else:
            # get values from session/use defaults
            year = self.request.session.get("scores_year", current_year)
            semester = self.request.session.get("scores_semester", "mid")
            category = self.request.session.get("scores_category", "reading")
            search_query = self.request.session.get("scores_search_query", "")
            class_filter = self.request.session.get("scores_class_filter", "")
            level_filter = self.request.session.get("scores_level_filter", "")
            per_page_str = self.request.session.get("scores_per_page", "5")

        # get config
        config = None
        try:
            # most specific: year + semester + category
            config = ScoreConfig.objects.get(
                year=year, semester=semester, category=category
            )
        except ScoreConfig.DoesNotExist:
            try:
                # next: year + semester
                config = ScoreConfig.objects.get(
                    year=year, semester=semester, category=None
                )
            except ScoreConfig.DoesNotExist:
                try:
                    # next: year only
                    config = ScoreConfig.objects.get(
                        year=year, semester=None, category=None
                    )
                except ScoreConfig.DoesNotExist:
                    # fallback to global default
                    config = ScoreConfig.objects.filter(
                        year=None, semester=None, category=None
                    ).first() or ScoreConfig.objects.create(
                        num_exercises=5,
                        formula="(ex_sum + mid_term + finals) / (num_exercises + 2)",
                    )

        # filter murid based on search query and class
        students = Student.objects.all()
        if search_query:
            students = students.filter(name__icontains=search_query)
        if class_filter:
            students = students.filter(assigned_class=class_filter)
        if level_filter:
            students = students.filter(level=level_filter)

        forms = []
        for student in students:
            try:
                score = Score.objects.get(
                    student=student,
                    year=year,
                    semester=semester,
                    category=category,
                )
                form = ScoreForm(
                    instance=score,
                    prefix=f"student_{student.id}",
                    year=year,
                    semester=semester,
                    category=category,
                )
            except Score.DoesNotExist:
                form = ScoreForm(
                    prefix=f"student_{student.id}",
                    year=year,
                    semester=semester,
                    category=category,
                )

            forms.append((student, form))

        # pagination, get params default to 5
        try:
            per_page = int(per_page_str)
        except ValueError:
            per_page = 5
        paginator = Paginator(forms, per_page)
        page_number = self.request.GET.get("page")
        page_obj = paginator.get_page(page_number)

        context.update(
            {
                "forms": page_obj.object_list,
                "page_obj": page_obj,
                "is_paginated": page_obj.has_other_pages(),
                "current_per_page": str(per_page),
                "year": year,
                "semester": semester,
                "category": category,
                "search_query": search_query,
                "class_filter": class_filter,
                "current_level_filter": level_filter,
                "class_choices": Student.assigned_class,
                "level_choices": LEVELS,
                "exercise_range": range(config.num_exercises),
                "score_formula": config.formula,
            }
        )
        return context

    def post(self, request, *args, **kwargs):
        current_year = str(datetime.now().year)
        # get values from session first, then fall back to POST data
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

        # update session
        request.session["scores_year"] = year
        request.session["scores_semester"] = semester
        request.session["scores_category"] = category
        request.session["scores_search_query"] = search_query
        request.session["scores_class_filter"] = class_filter
        request.session["scores_level_filter"] = level_filter

        for student in Student.objects.all():
            prefix = f"student_{student.id}"
            try:
                score_instance = Score.objects.get(
                    student=student, year=year, semester=semester, category=category
                )
            except Score.DoesNotExist:
                score_instance = None
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
        # redirect url to the same page with the same filters
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
        # check if in edit mode via POST
        if hasattr(self, "request"):
            if self.request.method == "POST":
                # get params from POST data if exist
                year = self.request.POST.get("edit_year") or None
                semester = self.request.POST.get("edit_semester") or None
                category = self.request.POST.get("edit_category") or None
            else:
                # else from GET as before
                year = self.request.GET.get("year") or None
                semester = self.request.GET.get("semester") or None
                category = self.request.GET.get("category") or None
        else:
            # fallback if request is not available
            year = None
            semester = None
            category = None

        if year == "None" or year == "":
            year = None
        if semester == "None" or semester == "":
            semester = None
        if category == "None" or category == "":
            category = None

        # convert year to integer if it's not None
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
            # return an unsaved instance to back the form
            return ScoreConfig(**filters)
        except ScoreConfig.MultipleObjectsReturned:
            # if your data's bad, just pick the first
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

            # jst dont allow deleting da global default
            if year is None and semester is None and category is None:
                messages.error(request, "Cannot delete global default configuration.")
                return redirect(self.get_success_url())

            try:
                config = ScoreConfig.objects.get(
                    year=year, semester=semester, category=category
                )
                config.delete()
                messages.success(request, "Configuration deleted successfully.")
                return redirect(self.get_success_url())
            except ScoreConfig.DoesNotExist:
                messages.error(request, "Configuration not found.")
                return redirect(self.get_success_url())

        return super().post(request, *args, **kwargs)

    def form_valid(self, form):
        cd = form.cleaned_data

        # check if editing an existing config
        edit_year = self.request.POST.get("edit_year") or None
        edit_semester = self.request.POST.get("edit_semester") or None
        edit_category = self.request.POST.get("edit_category") or None

        # convert to appropriate types
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

        # use edited config's identifiers if exist, otherwise use form data
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

        # check if handling a DELETE action
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

        # check if trying to create another global default
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

        # create-or-update the exact scoped config
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

        # propagate any exercise‐count changes to existing Scores
        filters = {}
        for score in Score.objects.filter(**filters):
            # reset exercise_scores to match exactly the new num_exercises
            # ensures old values are completely removed
            current_scores = score.exercise_scores or []
            # only keep scores needed and add zeros for any new positions
            new_scores = []
            for i in range(config.num_exercises):
                if i < len(current_scores):
                    new_scores.append(current_scores[i])
                else:
                    new_scores.append(0)

            if new_scores != score.exercise_scores:
                score.exercise_scores = new_scores
                score.save(update_fields=["exercise_scores"])

        messages.success(self.request, "Configuration saved successfully.")
        return redirect(self.request.path)

    def form_invalid(self, form):
        existing_messages = False
        if hasattr(self, "request") and hasattr(self.request, "_messages"):
            existing_messages = any(
                m.level == messages.ERROR for m in messages.get_messages(self.request)
            )

        if not existing_messages:
            messages.error(
                self.request, "Failed to save configuration. Please try again."
            )

        return super().form_invalid(form)

    def get_success_url(self):
        # build URL from session values to maintain filters when returning
        year = self.request.session.get("scores_year")
        semester = self.request.session.get("scores_semester")
        category = self.request.session.get("scores_category")
        search_query = self.request.session.get("scores_search_query", "")
        class_filter = self.request.session.get("scores_class_filter", "")
        level_filter = self.request.session.get("scores_level_filter", "")
        per_page = self.request.session.get("scores_per_page", "5")

        # if deleting configuration, return to score list with filters
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
