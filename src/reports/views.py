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

        # Get filters from request or session
        try:
            year = int(self.request.GET.get("year", self.request.session.get("reports_year", current_year)))
        except ValueError:
            year = current_year
        semester = self.request.GET.get("semester", self.request.session.get("reports_semester", "mid"))
        search_query = self.request.GET.get("q", self.request.session.get("reports_search_query", ""))
        class_filter = self.request.GET.get("class_filter", self.request.session.get("reports_class_filter", ""))
        level_filter = self.request.GET.get("level_filter", self.request.session.get("reports_level_filter", ""))
        sort_by = self.request.GET.get("sort_by", self.request.session.get("reports_sort_by", ""))
        per_page_str = self.request.GET.get("per_page", self.request.session.get("reports_per_page", "5"))
        
        try:
            per_page = int(per_page_str)
        except ValueError:
            per_page = 5

        # Store filters in session if provided in request
        if "year" in self.request.GET:
            self.request.session["reports_year"] = year
        if "semester" in self.request.GET:
            self.request.session["reports_semester"] = semester
        if "q" in self.request.GET:
            self.request.session["reports_search_query"] = search_query
        if "class_filter" in self.request.GET:
            self.request.session["reports_class_filter"] = class_filter
        if "level_filter" in self.request.GET:
            self.request.session["reports_level_filter"] = level_filter
        if "sort_by" in self.request.GET:
            self.request.session["reports_sort_by"] = sort_by
        if "per_page" in self.request.GET:
            self.request.session["reports_per_page"] = per_page_str

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
        # Check if URL parameters are present, if not, use session values if available
        if not any(
            key in request.GET
            for key in ["year", "semester", "q", "class_filter", "level_filter", "sort_by", "per_page"]
        ) and any(
            key in request.session
            for key in [
                "reports_year",
                "reports_semester",
                "reports_search_query",
                "reports_class_filter",
                "reports_level_filter",
                "reports_sort_by",
                "reports_per_page",
            ]
        ):
            # Build URL from session values
            from urllib.parse import urlencode
            params = {
                "year": request.session.get("reports_year", str(datetime.now().year)),
                "semester": request.session.get("reports_semester", "mid"),
                "q": request.session.get("reports_search_query", ""),
                "class_filter": request.session.get("reports_class_filter", ""),
                "level_filter": request.session.get("reports_level_filter", ""),
                "sort_by": request.session.get("reports_sort_by", ""),
                "per_page": request.session.get("reports_per_page", "5"),
            }
            # Remove empty params
            params = {k: v for k, v in params.items() if v}
            # Redirect to the filtered URL
            if params:
                return redirect(f"{request.path}?{urlencode(params)}")

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
