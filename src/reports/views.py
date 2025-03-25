import os
import io
import tempfile
import pythoncom
import subprocess
import zipfile
from datetime import datetime

from django.conf import settings
from django.core.paginator import Paginator
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, render, redirect
from django.views import View
from docx2pdf import convert
from docxtpl import DocxTemplate

from scores.models import Score
from students.models import Student

# Create your views here.
# kategori tiap nilai
SCORE_CATEGORIES = [
    ("reading", "Reading"),
    ("writing", "Writing"),
    ("listening", "Listening"),
    ("speaking", "Speaking"),
]

def convert_docx_to_pdf(docx_path, output_dir):
    # initialize COM
    pythoncom.CoInitialize()
    command = [
        "docx2pdf",
        docx_path,
        output_dir
    ]
    try:
        subprocess.run(command, check=True)
    except subprocess.CalledProcessError as e:
        raise Exception(f"Error converting DOCX to PDF: {e}")
    # uninitialize COM
    pythoncom.CoUninitialize()
    
    pdf_filename = os.path.basename(docx_path).replace('.docx', '.pdf')
    return os.path.join(output_dir, pdf_filename)

class ReportListView(View):
    template_name = "reports/report_list.html"

    def get_context_data(self, request):
        # pake current year as default if not provided
        current_year = datetime.now().year
        year = request.GET.get("year", str(current_year))
        semester = request.GET.get("semester", "odd")
        search_query = request.GET.get("q", "")
        class_filter = request.GET.get("class_filter", "")
        per_page_str = request.GET.get("per_page", "5")
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
        page_number = request.GET.get("page")
        page_obj = paginator.get_page(page_number)

        context = {
            "students_data": page_obj.object_list,
            "page_obj": page_obj,
            "is_paginated": page_obj.has_other_pages(),
            "current_per_page": str(per_page),
            "year": year,
            "semester": semester,
            "years": range(2025, 2033),
            "semesters": [("odd", "Odd Semester"), ("even", "Even Semester")],
            "score_categories": SCORE_CATEGORIES,
            "q": search_query,
            "class_filter": class_filter,
            "class_choices": Student._meta.get_field("assigned_class").choices,
            "active_tab_title": "Reports",
            "active_tab_icon": "fa-chart-bar",
        }
        return context

    def get(self, request, *args, **kwargs):
        if "anchor_redirected" not in request.GET:
            query_params = request.GET.copy()
            query_params["anchor_redirected"] = "true"
            redirect_url = f"{request.path}?{query_params.urlencode()}#report-table"
            return redirect(redirect_url)
        context = self.get_context_data(request)
        return render(request, self.template_name, context)


class ExportReportPDFView(View):
    def get(self, request, student_id, *args, **kwargs):
        # default ke current year if not provided
        current_year = datetime.now().year
        year = request.GET.get('year', str(current_year))
        semester = request.GET.get('semester', 'odd')
        student = get_object_or_404(Student, id=student_id)
        
        # context data untuk rendering
        data = {
            'student_name': student.name,
            'class': student.assigned_class,
            "year": year,
            "semester": semester,
        }
        for key, label in SCORE_CATEGORIES:
            try:
                score_obj = Score.objects.get(student=student, year=year, semester=semester, category=key)
                data[key] = f"{score_obj.final_score:.2f}"
            except Score.DoesNotExist:
                data[key] = "N/A"
        
        template_path = os.path.join(settings.BASE_DIR, 'templates', 'reports', 'report_template.docx')
        
        with tempfile.TemporaryDirectory() as tmpdirname:
            doc = DocxTemplate(template_path)
            doc.render(data)
            output_docx_path = os.path.join(tmpdirname, f"{student.id}_report.docx")
            doc.save(output_docx_path)
            
            try:
                pdf_path = convert_docx_to_pdf(output_docx_path, tmpdirname)
            except Exception as e:
                return HttpResponse(f"Error converting DOCX to PDF: {e}", content_type="text/plain")
            
            if os.path.exists(pdf_path):
                with open(pdf_path, 'rb') as pdf_file:
                    response = HttpResponse(pdf_file.read(), content_type='application/pdf')
                    response['Content-Disposition'] = f'attachment; filename="{student.name}_report.pdf"'
                    return response
            else:
                return HttpResponse("PDF file was not generated.", content_type="text/plain")


class ExportReportsZipView(View):
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

        # create in-memory zip file tiap murid
        in_memory = io.BytesIO()
        with zipfile.ZipFile(in_memory, mode="w", compression=zipfile.ZIP_DEFLATED) as zipf:
            for student in students:
                data = {
                    'student_name': student.name,
                    'class': student.assigned_class,
                    "year": year,
                    "semester": semester
                }
                for key, label in SCORE_CATEGORIES:
                    try:
                        score_obj = Score.objects.get(student=student, year=year, semester=semester, category=key)
                        data[key] = f"{score_obj.final_score:.2f}"
                    except Score.DoesNotExist:
                        data[key] = "N/A"
                template_path = os.path.join(settings.BASE_DIR, 'templates', 'reports', 'report_template.docx')
                with tempfile.TemporaryDirectory() as tmpdirname:
                    doc = DocxTemplate(template_path)
                    doc.render(data)
                    output_docx_path = os.path.join(tmpdirname, f"{student.id}_report.docx")
                    doc.save(output_docx_path)
                    
                    try:
                        pdf_path = convert_docx_to_pdf(output_docx_path, tmpdirname)
                    except Exception as e:
                        continue  # skip murid kalo error convert ke pdf
                    
                    if os.path.exists(pdf_path):
                        with open(pdf_path, 'rb') as pdf_file:
                            pdf_data = pdf_file.read()
                            zipf.writestr(f"{student.name}_report.pdf", pdf_data)
        in_memory.seek(0)
        response = HttpResponse(in_memory.read(), content_type="application/zip")
        response['Content-Disposition'] = 'attachment; filename="reports.zip"'
        return response