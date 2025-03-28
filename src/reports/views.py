import io
import zipfile
from datetime import datetime

from django.core.paginator import Paginator
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, render, redirect
from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin

from scores.models import Score, SCORE_CATEGORIES
from students.models import Student, StudentClass

from .utils import generate_student_report_pdf, SCORE_CATEGORIES

# Create your views here.
class ReportContextMixin:
    def get_report_context(self):
        current_year = datetime.now().year
        return {
            "years": range(current_year, current_year + 8),
            "semesters": [("odd", "Odd Semester"), ("even", "Even Semester")],
            "score_categories": SCORE_CATEGORIES,
            "active_tab_title": "Reports",
            "active_tab_icon": "fa-chart-bar",
            "class_choices": Student._meta.get_field("assigned_class").choices,
            "available_classes": StudentClass.objects.all(),
        }
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update(self.get_report_context())
        return context

    # helper to get each student score dict
    def get_student_scores(self, student, year, semester):
        scores_dict = {}
        for key, _ in SCORE_CATEGORIES:
            try:
                score_obj = Score.objects.get(student=student, year=year, semester=semester, category=key)
                scores_dict[key] = f"{score_obj.final_score:.2f}"
            except Score.DoesNotExist:
                scores_dict[key] = "N/A"
        return scores_dict

class ReportListView(LoginRequiredMixin, ReportContextMixin, TemplateView):
    template_name = "reports/report_list.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # get filter params dari url
        current_year = datetime.now().year
        try:
            year = int(self.request.GET.get("year", current_year))
        except ValueError:
            year = current_year
        semester = self.request.GET.get("semester", "odd")
        search_query = self.request.GET.get("q", "")
        class_filter = self.request.GET.get("class_filter", "")
        per_page_str = self.request.GET.get("per_page", "5")
        try:
            per_page = int(per_page_str)
        except ValueError:
            per_page = 5

        # queryset students
        students = Student.objects.all()
        if search_query:
            students = students.filter(name__icontains=search_query)
        if class_filter:
            students = students.filter(assigned_class=class_filter)

        # prepare list dict for each student
        students_data = []
        for student in students:
            scores = {}
            for key, label in SCORE_CATEGORIES:
                try:
                    score_obj = Score.objects.get(
                        student=student, year=year, semester=semester, category=key
                    )
                    final_score = score_obj.final_score
                except Score.DoesNotExist:
                    final_score = None
                scores[key] = final_score
            students_data.append({
                "student": student,
                "scores": scores,
            })

        # paginate result
        paginator = Paginator(students_data, per_page)
        page_number = self.request.GET.get("page")
        page_obj = paginator.get_page(page_number)

        context.update({
            "students_data": page_obj.object_list,
            "page_obj": page_obj,
            "is_paginated": page_obj.has_other_pages(),
            "current_per_page": str(per_page),
            "year": year,
            "semester": semester,
            "q": search_query,
            "class_filter": class_filter,
        })
        return context

    def get(self, request, *args, **kwargs):
        if "anchor_redirected" not in request.GET:
            query_params = request.GET.copy()
            query_params["anchor_redirected"] = "true"
            redirect_url = f"{request.path}?{query_params.urlencode()}#report-table"
            return redirect(redirect_url)
        context = self.get_context_data()
        return render(request, self.template_name, context)

class ExportReportPDFView(ReportContextMixin, TemplateView):
    def get(self, request, student_id, *args, **kwargs):
        current_year = datetime.now().year
        year = request.GET.get('year', str(current_year))
        semester = request.GET.get('semester', 'odd')
        student = get_object_or_404(Student, id=student_id)
        
        # pass data ke helper with query score dan tambahkan ke dict attribute untuk student
        student.scores_dict = self.get_student_scores(student, year, semester)
        
        # generate pdf report dengan helper
        pdf = generate_student_report_pdf(student, year, semester)
        
        safe_name = student.name.replace(" ", "_")
        filename = f"{safe_name}_report.pdf"
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
    
class ExportReportsZipView(ReportContextMixin, TemplateView):
    def get(self, request, *args, **kwargs):
        current_year = datetime.now().year
        year = request.GET.get("year", str(current_year))
        semester = request.GET.get("semester", "odd")
        search_query = request.GET.get("q", "")
        class_filter = request.GET.get("class_filter", "")
        
        students = Student.objects.all()
        if search_query:
            students = students.filter(name__icontains=search_query)
        if class_filter:
            students = students.filter(assigned_class=class_filter)
        
        in_memory = io.BytesIO()
        with zipfile.ZipFile(in_memory, mode="w", compression=zipfile.ZIP_DEFLATED) as zipf:
            for student in students:
                student.scores_dict = self.get_student_scores(student, year, semester)
                # generate pdf report dengan helper
                pdf = generate_student_report_pdf(student, year, semester)
                safe_name = student.name.replace(" ", "_")
                filename = f"{safe_name}_report.pdf"
                zipf.writestr(filename, pdf)
        
        in_memory.seek(0)
        response = HttpResponse(in_memory.read(), content_type="application/zip")
        response['Content-Disposition'] = 'attachment; filename="reports.zip"'
        return response