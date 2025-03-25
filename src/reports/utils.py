import os
import io
from datetime import datetime

from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image

SCORE_CATEGORIES = [
    ("reading", "Reading"),
    ("writing", "Writing"),
    ("listening", "Listening"),
    ("speaking", "Speaking"),
]

def generate_student_report_pdf(student, year, semester):
    """
    generate a PDF report for student.
    returns the PDF as bytes.
    """
    # map label semester
    if semester == "odd":
        semester_label = "1 (GANJIL)"
    else:
        semester_label = "2 (GENAP)"
    
    # dict for student data
    data = {
        'student_name': student.name,
        'class': student.assigned_class,
        'year': year,
        'semester_label': semester_label,
    }
    # score data must be added by the calling view,
    # for example by querying the score model for each SCORE_CATEGORIES.
    # for demo, assume that each score has been pre-fetched and added to student.
    # Alternatively, importing the Score model and do the query here is also an option.
    # in this case, the student already has an attribute `scores_dict`
    # that maps each category key to the score value (or "N/A").
    if hasattr(student, 'scores_dict'):
        for key, label in SCORE_CATEGORIES:
            data[key] = student.scores_dict.get(key, "N/A")
    
    # in memory buffer and concat filename with "_"
    pdf_buffer = io.BytesIO()
    safe_name = student.name.replace(" ", "_")
    filename = f"{safe_name}_report.pdf"
    
    # set up reportlab PDF document
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )
    styles = getSampleStyleSheet()
    base_style = ParagraphStyle(
        name='Times12',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=12,
        leading=14
    )
    title_style = ParagraphStyle(
        name='TitleStyle',
        parent=base_style,
        alignment=TA_CENTER,
        fontSize=14,
        spaceAfter=10
    )
    subtitle_style = ParagraphStyle(
        name='SubtitleStyle',
        parent=base_style,
        alignment=TA_CENTER,
        fontSize=12,
        spaceAfter=20
    )
    
    elements = []
    
    # AfiDu logo
    logo_path = os.path.join(settings.BASE_DIR, 'static', 'images', 'logo.png')
    if os.path.exists(logo_path):
        logo = Image(logo_path, width=80, height=80)
        logo.hAlign = 'CENTER'
        elements.append(logo)
    
    # header
    elements.append(Paragraph("Student Report", title_style))
    elements.append(Paragraph("In BIMBEL ARIFIANA", subtitle_style))
    
    # student info
    info_table_data = [
        ["Name:", data['student_name'], "Academic Year:", data['year']],
        ["Class:", data['class'], "Semester:", data['semester_label']],
    ]
    info_table = Table(info_table_data, colWidths=[60, 150, 100, 100])
    info_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Times-Roman"),
        ("FONTSIZE", (0, 0), (-1, -1), 12),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 12))
    
    # final score title
    elements.append(Paragraph("<b>Final Scores:</b>", base_style))
    elements.append(Spacer(1, 6))
    
    # final score table
    score_table_data = [
        [label.upper() for _, label in SCORE_CATEGORIES],
        [data.get(key, "N/A") for key, _ in SCORE_CATEGORIES],
    ]
    score_table = Table(score_table_data, colWidths=[100, 100, 100, 100])
    score_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Times-Roman"),
        ("FONTSIZE", (0, 0), (-1, -1), 12),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("ALIGN", (0, 1), (-1, 1), "CENTER"),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#ff4f25")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("GRID", (0, 0), (-1, -1), 1, colors.black),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
    ]))
    elements.append(score_table)
    
    doc.build(elements)
    pdf = pdf_buffer.getvalue()
    pdf_buffer.close()
    return pdf