from django.contrib import messages
from django.db.models import Count
from django.shortcuts import redirect, render
from django.urls import reverse, reverse_lazy
from django.views.generic import (
    CreateView,
    DeleteView,
    DetailView,
    ListView,
    UpdateView,
)

from core.mixins import StaffRequiredMixin, SuperuserRequiredMixin
from core.pagination import normalize_page_size

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


class StudentListView(StaffRequiredMixin, StudentContextMixin, ListView):
    model = Student
    template_name = "students/student_list.html"
    context_object_name = "students"

    def get_queryset(self):
        queryset = super().get_queryset().select_related("assigned_class")

        query = self.request.GET.get("q", "")
        class_filter = self.request.GET.get("class_filter", "")
        level_filter = self.request.GET.get("level_filter", "")
        sort_by = self.request.GET.get("sort_by", "")

        # apply filters to queryset
        if query:
            queryset = queryset.filter(name__icontains=query)
        if class_filter:
            queryset = queryset.filter(assigned_class=class_filter)
        if level_filter:
            queryset = queryset.filter(level=level_filter)
            
        if sort_by == "name_asc":
            queryset = queryset.order_by("name", "pk")
        elif sort_by == "name_desc":
            queryset = queryset.order_by("-name", "-pk")
        else:
            queryset = queryset.order_by("pk")

        return queryset

    def get_paginate_by(self, queryset):
        return normalize_page_size(self.request.GET.get("per_page"))

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        query = self.request.GET.get("q", "")
        class_filter = self.request.GET.get("class_filter", "")
        level_filter = self.request.GET.get("level_filter", "")
        per_page = str(normalize_page_size(self.request.GET.get("per_page")))
        sort_by = self.request.GET.get("sort_by", "")

        # pass student count context to list view; the paginator already counted
        paginator = context.get("paginator")
        context["student_count"] = (
            paginator.count if paginator is not None else len(context["students"])
        )

        # add filter values to context
        context["current_query"] = query
        context["current_class_filter"] = class_filter
        context["current_level_filter"] = level_filter
        context["current_per_page"] = per_page
        context["current_sort_by"] = sort_by

        return context

class StudentDetailView(StaffRequiredMixin, StudentContextMixin, DetailView):
    model = Student
    template_name = "students/student_detail.html"
    context_object_name = "student"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # figure out where "next" should point, prefer ?next=... but fall back to the Referer header
        next_url = self.request.GET.get("next") or self.request.META.get(
            "HTTP_REFERER", ""
        )

        context["next"] = next_url

        # build "edit" link that bounces back to the same "next"
        edit_base = reverse("students:student-edit", args=[self.object.pk])
        context["edit_url"] = f"{edit_base}?next={next_url}"

        return context


class StudentCreateView(SuperuserRequiredMixin, StudentContextMixin, CreateView):
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


class StudentUpdateView(SuperuserRequiredMixin, StudentContextMixin, UpdateView):
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


class StudentDeleteView(SuperuserRequiredMixin, StudentContextMixin, DeleteView):
    model = Student
    template_name = "students/student_confirm_delete.html"
    success_url = reverse_lazy("students:student-list")

    def form_valid(self, form):
        messages.success(self.request, "Student deleted successfully.")
        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, "Failed to delete student. Please try again.")
        return super().form_invalid(form)


# kelas
class StudentClassListView(StaffRequiredMixin, ClassContextMixin, ListView):
    model = StudentClass
    template_name = "students/class_list.html"
    context_object_name = "classes"

    def get_queryset(self):
        # the template asks each class for its occupancy several times
        return super().get_queryset().annotate(student_count=Count("student"))


class StudentClassCreateView(SuperuserRequiredMixin, ClassContextMixin, CreateView):
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


class StudentClassUpdateView(SuperuserRequiredMixin, ClassContextMixin, UpdateView):
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


class StudentClassDeleteView(SuperuserRequiredMixin, ClassContextMixin, DeleteView):
    model = StudentClass
    template_name = "students/class_confirm_delete.html"
    success_url = reverse_lazy("students:class-list")

    def form_valid(self, form):
        messages.success(self.request, "Class deleted successfully.")
        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, "Failed to delete class. Please try again.")
        return super().form_invalid(form)
