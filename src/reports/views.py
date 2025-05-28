import io
import zipfile
from datetime import datetime

from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.paginator import Paginator
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.generic import TemplateView

from scores.models import SCORE_CATEGORIES, Score
from students.models import LEVELS, Student, StudentClass

from .utils import SCORE_CATEGORIES, generate_student_report_pdf


class ReportContextMixin:
    def get_report_context(self):
        current_year = datetime.now().year
        return {
            "years": range(current_year, current_year + 8),
            "semesters": [("mid", "MID"), ("final", "FINAL")],
            "score_categories": SCORE_CATEGORIES,
            "active_tab_title": "Reports",
            "active_tab_icon": "fa-chart-bar",
            "class_choices": Student._meta.get_field("assigned_class").choices,
            "available_classes": StudentClass.objects.only('id', 'name'),
            "level_choices": LEVELS,
        }

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update(self.get_report_context())
        return context

    def get_student_scores(self, student, year, semester):
        scores_dict = {}
        for key, _ in SCORE_CATEGORIES:
            try:
                score_obj = Score.objects.get(
                    student=student, year=year, semester=semester, category=key
                )
                scores_dict[key] = f"{score_obj.final_score:.2f}"
            except Score.DoesNotExist:
                scores_dict[key] = "N/A"
        return scores_dict


class ReportListView(LoginRequiredMixin, ReportContextMixin, TemplateView):
    template_name = "reports/report_list.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        current_year = datetime.now().year
        coming_back = self.request.GET.get("anchor_redirected") == "true" and not any(
            param in self.request.GET
            for param in [
                "year",
                "semester",
                "q",
                "class_filter",
                "level_filter",
                "sort_by",
                "per_page",
            ]
            if param != "anchor_redirected"
        )

        if coming_back and "reports_filters" in self.request.session:
            filters = self.request.session.get("reports_filters", {})
            year = filters.get("year", current_year)
            semester = filters.get("semester", "mid")
            search_query = filters.get("q", "")
            class_filter = filters.get("class_filter", "")
            level_filter = filters.get("level_filter", "")
            sort_by = filters.get("sort_by", "")
            per_page = filters.get("per_page", 5)
        else:
            try:
                year = int(self.request.GET.get("year", current_year))
            except ValueError:
                year = current_year
            semester = self.request.GET.get("semester", "mid")
            search_query = self.request.GET.get("q", "")
            class_filter = self.request.GET.get("class_filter", "")
            level_filter = self.request.GET.get("level_filter", "")
            sort_by = self.request.GET.get("sort_by", "")
            per_page_str = self.request.GET.get("per_page", "5")
            try:
                per_page = int(per_page_str)
            except ValueError:
                per_page = 5

            self.request.session["reports_filters"] = {
                "year": year,
                "semester": semester,
                "q": search_query,
                "class_filter": class_filter,
                "level_filter": level_filter,
                "per_page": per_page,
                "sort_by": sort_by,
            }

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

        paginator = Paginator(students, per_page)
        page_number = self.request.GET.get("page")
        page_obj = paginator.get_page(page_number)
        current_page_students = page_obj.object_list

        # Optimize score fetching with a single query
        scores_by_student = {}
        if current_page_students:
            student_ids = [s.id for s in current_page_students]
            
            # Get all scores for current page students in one query
            all_scores = Score.objects.filter(
                student_id__in=student_ids,
                year=year,
                semester=semester
            ).select_related('student')
            
            # Organize scores by student and category using the model's final_score property
            for score in all_scores:
                student_id = score.student_id
                if student_id not in scores_by_student:
                    scores_by_student[student_id] = {}
                scores_by_student[student_id][score.category] = score.final_score

        # Prepare students data efficiently
        students_data = []
        for student in current_page_students:
            scores = {}
            student_scores = scores_by_student.get(student.id, {})
            
            for key, label in SCORE_CATEGORIES:
                scores[key] = student_scores.get(key)
                
            students_data.append({
                "student": student,
                "scores": scores,
            })

        context.update({
            "students_data": students_data,
            "page_obj": page_obj,
            "is_paginated": page_obj.has_other_pages(),
            "current_per_page": str(per_page),
            "year": year,
            "semester": semester,
            "q": search_query,
            "class_filter": class_filter,
            "level_filter": level_filter,
            "sort_by": sort_by,
            "level_choices": Student._meta.get_field("level").choices,
        })
        return context

    def get(self, request, *args, **kwargs):
        explicit_filter_change = any(
            param in request.GET
            for param in [
                "year",
                "semester",
                "q",
                "class_filter",
                "level_filter",
                "sort_by",
                "per_page",
            ]
        )

        if explicit_filter_change:
            pass

        context = self.get_context_data()
        return render(request, self.template_name, context)


class ExportReportPDFView(ReportContextMixin, TemplateView):
    def get(self, request, student_id, *args, **kwargs):
        current_year = datetime.now().year
        year = request.GET.get("year", str(current_year))
        semester = request.GET.get("semester", "mid")
        student = get_object_or_404(Student, id=student_id)

        student.scores_dict = self.get_student_scores(student, year, semester)

        pdf = generate_student_report_pdf(student, year, semester)

        safe_name = student.name.replace(" ", "_")
        filename = f"{safe_name}_report.pdf"
        response = HttpResponse(pdf, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class ExportReportsZipView(ReportContextMixin, TemplateView):
    def get(self, request, *args, **kwargs):
        current_year = datetime.now().year
        year = request.GET.get("year", str(current_year))
        semester = request.GET.get("semester", "mid")
        search_query = request.GET.get("q", "")
        class_filter = request.GET.get("class_filter", "")

        students = Student.objects.select_related('assigned_class')
        if search_query:
            students = students.filter(name__icontains=search_query)
        if class_filter:
            students = students.filter(assigned_class=class_filter)

        in_memory = io.BytesIO()
        with zipfile.ZipFile(
            in_memory, mode="w", compression=zipfile.ZIP_DEFLATED
        ) as zipf:
            for student in students:
                student.scores_dict = self.get_student_scores(student, year, semester)
                pdf = generate_student_report_pdf(student, year, semester)
                safe_name = student.name.replace(" ", "_")
                filename = f"{safe_name}_report.pdf"
                zipf.writestr(filename, pdf)

        in_memory.seek(0)
        response = HttpResponse(in_memory.read(), content_type="application/zip")
        response["Content-Disposition"] = 'attachment; filename="reports.zip"'
        return response
