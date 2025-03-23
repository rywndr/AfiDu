import os
import tempfile
import pythoncom
import subprocess

from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, render
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
    # iniatilize COM 
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
    
    # uninitalize COM
    pythoncom.CoUninitialize()
    
    pdf_filename = os.path.basename(docx_path).replace('.docx', '.pdf')
    return os.path.join(output_dir, pdf_filename)


class ReportListView(View):
    template_name = "reports/report_list.html"

    def get(self, request, *args, **kwargs):
        # params dari URL
        year = request.GET.get("year", "2025")
        semester = request.GET.get("semester", "odd")
        
        # get data nilai akhir siswa tiap kategori
        students_data = []
        students = Student.objects.all()
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
            students_data.append(
                {
                    "student": student,
                    "scores": scores,
                }
            )

        context = {
            "students_data": students_data,
            "year": year,
            "semester": semester,
            "years": range(2020, 2031),
            "semesters": [("odd", "Odd Semester"), ("even", "Even Semester")],
            "score_categories": SCORE_CATEGORIES,
            "active_tab_title": "Report",
            "active_tab_icon": "fa-chart-bar",
        }
        return render(request, self.template_name, context)


class ExportReportPDFView(View):
    def get(self, request, student_id, *args, **kwargs):
        # ambil params filter dari URL
        year = request.GET.get('year', '2025')
        semester = request.GET.get('semester', 'odd')
        student = get_object_or_404(Student, id=student_id)
        
        # siapin data untuk di render ke template
        data = {
            'student_name': student.name,
            'class': student.assigned_class,
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