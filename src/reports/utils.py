import io
from datetime import date

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

SCORE_CATEGORIES = [
    ("reading", "Reading"),
    ("writing", "Writing"),
    ("listening", "Listening"),
    ("speaking", "Speaking"),
]


def generate_student_report_pdf(student, year, semester):
    """
    generate a PDF report for student
    returns the PDF as bytes.
    """

    def get_score_comment(score):
        try:
            score = int(float(score)) if score not in [None, "N/A", ""] else 0
        except (ValueError, TypeError):
            return "(N/A)"

        if score >= 96:
            return "(Excellent)"
        elif score >= 91:
            return "(Very good)"
        elif score >= 81:
            return "(Good)"
        elif score >= 71:
            return "(Fairly Good)"
        elif score >= 56:
            return "(Average)"
        else:
            return "(Poor)"

    # calculate avg score
    scores = []
    if hasattr(student, "scores_dict"):
        for key in ["writing", "reading", "speaking", "listening"]:
            if key in student.scores_dict and student.scores_dict[key] not in [
                None,
                "N/A",
                "",
            ]:
                try:
                    scores.append(float(student.scores_dict[key]))
                except (ValueError, TypeError):
                    pass

    avg_score = sum(scores) / len(scores) if scores else 0

    # overall comment based on avg score
    overall_comment = "Good!! Tingkatkan terus nak"
    if avg_score < 60:
        overall_comment = "Perlu lebih banyak latihan"
    elif avg_score > 90:
        overall_comment = "Excellent!! Pertahankan prestasimu"

    # in memory buffer for PDF
    pdf_buffer = io.BytesIO()

    # set up reportlab PDF document
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=A4,
        rightMargin=30,
        leftMargin=30,
        topMargin=30,
        bottomMargin=30,
    )

    elements = []

    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import Paragraph

    report_style = ParagraphStyle(
        "ReportTitle",
        fontName="Helvetica-Bold",
        fontSize=14,
        alignment=1,  # center
        spaceAfter=6,
        spaceBefore=6,
    )

    header_text = Paragraph("<u>REPORT SHEET</u>", report_style)
    header_data = [[header_text]]
    header_table = Table(header_data, colWidths=[540])
    header_table.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    elements.append(header_table)
    elements.append(Spacer(1, 10))

    student_info_data = [
        ["NAME", ":", student.name, "", "", ""],
        ["LEVEL", ":", student.level, "", "", ""],
        ["DATE", ":", date.today().strftime("%d %B %Y").upper(), "", "", ""],
    ]
    student_info_table = Table(student_info_data, colWidths=[60, 10, 200, 50, 10, 210])
    student_info_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (1, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("ALIGN", (0, 0), (0, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    elements.append(student_info_table)
    elements.append(Spacer(1, 10))

    writing_score = student.scores_dict.get("writing", 0)
    reading_score = student.scores_dict.get("reading", 0)
    speaking_score = student.scores_dict.get("speaking", 0)
    listening_score = student.scores_dict.get("listening", 0)

    writing_text = f"{writing_score}\n{get_score_comment(writing_score)}"
    reading_text = f"{reading_score}\n{get_score_comment(reading_score)}"
    speaking_text = f"{speaking_score}\n{get_score_comment(speaking_score)}"
    listening_text = f"{listening_score}\n{get_score_comment(listening_score)}"

    scores_data = [
        ["WRITING", "READING", "SPEAKING", "LISTENING"],
        [writing_text, reading_text, speaking_text, listening_text],
    ]

    scores_table = Table(scores_data, colWidths=[135, 135, 135, 135])
    scores_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, 1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, 0), 10),
                ("FONTSIZE", (0, 1), (-1, 1), 11),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 5),
                ("TOPPADDING", (0, 0), (-1, 0), 5),
                (
                    "BOTTOMPADDING",
                    (0, 1),
                    (-1, 1),
                    10,
                ),
                ("TOPPADDING", (0, 1), (-1, 1), 10),
            ]
        )
    )
    elements.append(scores_table)
    elements.append(Spacer(1, 15))

    comment_data = [
        ["COMMENT", ":", overall_comment],
        ["SUGGESTION", ":", ""],
    ]
    comment_table = Table(comment_data, colWidths=[90, 10, 440])
    comment_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (1, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("ALIGN", (0, 0), (0, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 20),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    elements.append(comment_table)
    elements.append(Spacer(1, 50))

    range_data = [
        ["RANGE:"],
        ["1.100 - 96", "(Excellent)"],
        ["2.95 - 91", "(Very good)"],
        ["3.90 - 81", "(Good)"],
        ["4.80 - 71", "(Fairly good)"],
        ["5.70 - 56", "(Average)"],
        ["6.55 - Below", "(Poor)"],
    ]

    range_table = Table(range_data, colWidths=[80, 120])
    range_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, 0), "Helvetica-Bold"),
                (
                    "FONTNAME",
                    (0, 1),
                    (0, -1),
                    "Helvetica-Bold",
                ),
                ("FONTNAME", (1, 1), (1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                (
                    "ALIGN",
                    (0, 0),
                    (0, -1),
                    "LEFT",
                ),
                ("ALIGN", (1, 1), (1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("SPAN", (0, 0), (1, 0)),
            ]
        )
    )

    positioning_table = Table([[range_table, ""]], colWidths=[200, 340])
    positioning_table.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (0, 0), "LEFT"),
                ("VALIGN", (0, 0), (0, 0), "TOP"),
            ]
        )
    )
    elements.append(positioning_table)
    elements.append(Spacer(1, 30))

    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import Paragraph

    teacher_style = ParagraphStyle(
        "Teacher",
        fontName="Helvetica-Bold",
        fontSize=10,
        alignment=1,
    )

    parent_style = ParagraphStyle(
        "Parent",
        fontName="Helvetica-Bold",
        fontSize=10,
        alignment=1,
    )

    name_style = ParagraphStyle(
        "Name",
        fontName="Helvetica",
        fontSize=10,
        alignment=1,
    )

    teacher_text = Paragraph("<u>TEACHER</u>", teacher_style)
    parent_text = Paragraph("<u>PARENT</u>", parent_style)
    ista_text = Paragraph("<u>ISTA SASTAFIANA S.Pd.I</u>", name_style)

    signature_data = [
        [teacher_text, "", parent_text],
        ["", "", ""],
        ["", "", ""],
        ["", "", ""],
        [ista_text, "", "____________________"],
    ]

    elements.append(Spacer(1, 170))

    signature_table = Table(signature_data, colWidths=[180, 180, 180])
    signature_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, -1), (0, -1), "CENTER"),
                ("ALIGN", (2, -1), (2, -1), "CENTER"),
            ]
        )
    )
    elements.append(signature_table)

    # build PDF document
    doc.build(elements)

    # get PDF content
    pdf = pdf_buffer.getvalue()
    pdf_buffer.close()

    return pdf
