from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.shortcuts import redirect, render
from django.urls import reverse, reverse_lazy
from django.views.generic import (
    CreateView,
    DeleteView,
    DetailView,
    ListView,
    UpdateView,
)

from .forms import StudentForm, StudentClassForm
from .models import Student, StudentClass


# Create your views here.
class ClassContextMixin:
    def get_class_context(self):
        return {
            "active_tab_title": "Classes",
            "active_tab_icon": "fa-chalkboard",
        }

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update(self.get_class_context())
        return context


class StudentContextMixin:
    def get_student_context(self):
        return {
            "active_tab_title": "Students",
            "active_tab_icon": "fa-user-graduate",
            "available_classes": StudentClass.objects.all(),
            "level_choices": Student._meta.get_field("level").choices,
        }

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update(self.get_student_context())
        return context


class SuperuserRequiredMixin(UserPassesTestMixin):
    def test_func(self):
        return self.request.user.is_superuser

    def handle_no_permission(self):
        """
        custom handler for when user doesn't have permission.
        renders our custom 403 template instead of default.
        """
        if self.request.user.is_authenticated:
            return render(self.request, '403.html', status=403)
        else:
            return super().handle_no_permission()


class StudentListView(LoginRequiredMixin, StudentContextMixin, ListView):
    model = Student
    template_name = "students/student_list.html"
    context_object_name = "students"

    def get_queryset(self):
        queryset = super().get_queryset()

        # get filters from request or session
        query = self.request.GET.get("q")
        class_filter = self.request.GET.get("class_filter")
        level_filter = self.request.GET.get("level_filter")
        per_page = self.request.GET.get("per_page")
        sort_by = self.request.GET.get("sort_by")

        # store filters in session if provided in request
        if query is not None:
            self.request.session["student_search_query"] = query
        elif "student_search_query" in self.request.session:
            query = self.request.session["student_search_query"]

        if class_filter is not None:
            self.request.session["student_class_filter"] = class_filter
        elif "student_class_filter" in self.request.session:
            class_filter = self.request.session["student_class_filter"]

        if level_filter is not None:
            self.request.session["student_level_filter"] = level_filter
        elif "student_level_filter" in self.request.session:
            level_filter = self.request.session["student_level_filter"]

        if per_page is not None:
            self.request.session["student_per_page"] = per_page
        elif "student_per_page" in self.request.session:
            per_page = self.request.session["student_per_page"]
            
        if sort_by is not None:
            self.request.session["student_sort_by"] = sort_by
        elif "student_sort_by" in self.request.session:
            sort_by = self.request.session["student_sort_by"]

        # apply filters to queryset
        if query:
            queryset = queryset.filter(name__icontains=query)
        if class_filter:
            queryset = queryset.filter(assigned_class=class_filter)
        if level_filter:
            queryset = queryset.filter(level=level_filter)
            
        # apply sorting only if specified
        if sort_by == "name_asc":
            queryset = queryset.order_by("name")
        elif sort_by == "name_desc":
            queryset = queryset.order_by("-name")

        return queryset

    def get_paginate_by(self, queryset):
        per_page = self.request.GET.get("per_page")
        if per_page is None and "student_per_page" in self.request.session:
            per_page = self.request.session["student_per_page"]
        if per_page in ["5", "10", "15"]:
            return int(per_page)
        return 5

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # cet filters from request or session
        query = self.request.GET.get(
            "q", self.request.session.get("student_search_query", "")
        )
        class_filter = self.request.GET.get(
            "class_filter", self.request.session.get("student_class_filter", "")
        )
        level_filter = self.request.GET.get(
            "level_filter", self.request.session.get("student_level_filter", "")
        )
        per_page = self.request.GET.get(
            "per_page", self.request.session.get("student_per_page", "5")
        )
        sort_by = self.request.GET.get(
            "sort_by", self.request.session.get("student_sort_by", "")
        )

        # pass student count context to list view
        context["student_count"] = self.get_queryset().count()

        # add filter values to context
        context["current_query"] = query
        context["current_class_filter"] = class_filter
        context["current_level_filter"] = level_filter
        context["current_per_page"] = per_page
        context["current_sort_by"] = sort_by

        return context

class StudentDetailView(LoginRequiredMixin, StudentContextMixin, DetailView):
    model = Student
    template_name = "students/student_detail.html"
    context_object_name = "student"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # figure out where "next" should point, prefer ?next=... but fall back to the Referer header
        next_url = self.request.GET.get("next") or self.request.META.get(
            "HTTP_REFERER", ""
        )

        # if it's pointing at score‑list, re‑attach all session filters
        if next_url and "scores:score-list" in next_url:
            params = {
                "year": self.request.session.get("scores_year", ""),
                "semester": self.request.session.get("scores_semester", ""),
                "category": self.request.session.get("scores_category", ""),
                "q": self.request.session.get("scores_search_query", ""),
                "class_filter": self.request.session.get("scores_class_filter", ""),
                "level_filter": self.request.session.get("scores_level_filter", ""),
                "per_page": self.request.session.get("scores_per_page", "5"),
            }
            # re‑serialize into a querystring
            query_string = "&".join(f"{k}={v}" for k, v in params.items() if v != "")
            next_url = f"{next_url.split('?')[0]}?{query_string}"

        # If coming from payment list, use stored payment_list_url
        elif next_url and "payments:payment_list" in next_url:
            stored_url = self.request.session.get("payment_list_url")
            if stored_url:
                next_url = stored_url

        elif next_url and "reports:report-list" in next_url:
            next_url = f"{next_url.split('?')[0]}?anchor_redirected=true"

        context["next"] = next_url

        # build "edit" link that bounces back to the same "next"
        edit_base = reverse("students:student-edit", args=[self.object.pk])
        context["edit_url"] = f"{edit_base}?next={next_url}"

        return context


class StudentCreateView(LoginRequiredMixin, SuperuserRequiredMixin, StudentContextMixin, CreateView):
    model = Student
    form_class = StudentForm
    template_name = "students/student_form.html"
    success_url = reverse_lazy("students:student-list")

    def form_valid(self, form):
        messages.success(self.request, "Student created successfully.")
        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, "Failed to create student. Please try again.")
        return super().form_invalid(form)


class StudentUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, StudentContextMixin, UpdateView):
    model = Student
    form_class = StudentForm
    template_name = "students/student_form.html"
    success_url = reverse_lazy("students:student-list")

    def get_success_url(self):
        next_url = self.request.GET.get("next")
        if next_url:
            return next_url
        return reverse_lazy("students:student-list")

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["next"] = self.request.GET.get("next")
        return context

    def form_valid(self, form):
        messages.success(self.request, "Student updated successfully.")
        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, "Failed to update student. Please try again.")
        return super().form_invalid(form)


class StudentDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, StudentContextMixin, DeleteView):
    model = Student
    template_name = "students/student_confirm_delete.html"
    success_url = reverse_lazy("students:student-list")

    def form_valid(self, form):
        messages.success(self.request, "Student deleted successfully.")
        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, "Failed to delete student. Please try again.")
        return super().form_invalid(form)


# classes
class StudentClassListView(LoginRequiredMixin, ClassContextMixin, ListView):
    model = StudentClass
    template_name = "students/class_list.html"
    context_object_name = "classes"


class StudentClassCreateView(LoginRequiredMixin, SuperuserRequiredMixin, ClassContextMixin, CreateView):
    model = StudentClass
    form_class = StudentClassForm
    template_name = "students/class_form.html"
    success_url = reverse_lazy("students:class-list")

    def form_valid(self, form):
        messages.success(self.request, "Class created successfully.")
        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, "Failed to create class. Please try again.")
        return super().form_invalid(form)


class StudentClassUpdateView(LoginRequiredMixin, SuperuserRequiredMixin, ClassContextMixin, UpdateView):
    model = StudentClass
    form_class = StudentClassForm
    template_name = "students/class_form.html"
    success_url = reverse_lazy("students:class-list")

    def form_valid(self, form):
        messages.success(self.request, "Class updated successfully.")
        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, "Failed to update class. Please try again.")
        return super().form_invalid(form)


class StudentClassDeleteView(LoginRequiredMixin, SuperuserRequiredMixin, ClassContextMixin, DeleteView):
    model = StudentClass
    template_name = "students/class_confirm_delete.html"
    success_url = reverse_lazy("students:class-list")

    def form_valid(self, form):
        messages.success(self.request, "Class deleted successfully.")
        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, "Failed to delete class. Please try again.")
        return super().form_invalid(form)
