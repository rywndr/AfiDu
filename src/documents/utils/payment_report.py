import io
import os
import zipfile
from datetime import datetime
from decimal import Decimal

from payments.models import PaymentInstallment
from django.utils.text import slugify
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def generate_payment_report_pdf(student, payments, config):
    """
    generate PDF payment report for student.
    
    args:
        student: Student object
        payments: queryeet of Payment objects for student
        config: dict with config options
        
    returns:
        PDF content as bytes
    """
    # set in-memory buffer for PDF
    pdf_buffer = io.BytesIO()
    
    # set document with A4 page size and margins
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=A4,
        rightMargin=72,  
        leftMargin=72,  
        topMargin=72,   
        bottomMargin=72 
    )
    
    # list to hold document elements
    elements = []
    
    # define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=16,
        alignment=1,
        spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=12,
        spaceAfter=6
    )
    normal_style = styles['Normal']
    
    # header
    elements.append(Paragraph("PAYMENT REPORT", title_style))
    elements.append(Spacer(1, 0.25*inch))
    
    # student info
    elements.append(Paragraph("Student Information", subtitle_style))
    
    # personal data
    personal_data = [
        ["Name:", student.name, "Gender:", student.gender],
        ["Class:", student.assigned_class.name if student.assigned_class else "Not assigned", "Level:", student.level]
    ]
    
    # table with 4 columns
    personal_table = Table(personal_data, colWidths=[65, 150, 65, 150])
    
    # style personal information
    personal_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (0, -1), 10), 
        ('RIGHTPADDING', (1, 0), (1, -1), 15), 
        ('RIGHTPADDING', (2, 0), (2, -1), 10),  
    ]))
    
    elements.append(personal_table)
    elements.append(Spacer(1, 0.25*inch))
    
    # payment summary if requested
    if config.get('include_summary', True):
        elements.append(Paragraph("Payment Summary", subtitle_style))
        
        total_paid = sum(payment.amount_paid for payment in payments)
        total_due = sum(
            Decimal(payment.amount_paid) + Decimal(payment.remaining_amount) 
            for payment in payments
        )
        total_remaining = sum(payment.remaining_amount for payment in payments)
        
        # 2-column summary table
        summary_data = [
            ["Period", f"{config.get('start_date')} - {config.get('end_date')}"],
            ["Total Payments", str(len(payments))],
            ["Total Paid Amount", f"Rp {total_paid:,.0f}"],
            ["Total Payment Due", f"Rp {total_due:,.0f}"],
            ["Total Remaining", f"Rp {total_remaining:,.0f}"],
        ]
        
        summary_table = Table(summary_data, colWidths=[150, 300])
        summary_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("ALIGN", (0, 0), (0, -1), "LEFT"),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
            ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 0.25*inch))
    
    # payment details
    if config.get('include_details', False) and payments:
        elements.append(Paragraph("Payment Details", subtitle_style))
        
        # load installment data if available
        show_installments = config.get('show_installments', True)
        
        if show_installments:
            try:
                # group installments by payment
                installments_map = {}
                for payment in payments:
                    # check if payment is an installment or partial payment
                    if payment.is_installment or (not payment.paid and payment.amount_paid > 0):
                        # get installments for this payment
                        installments = list(PaymentInstallment.objects.filter(payment=payment).order_by('payment_date'))
                        installments_map[payment.id] = installments
            except ImportError:
                show_installments = False
                installments_map = {}
        else:
            installments_map = {}
        
        # details table
        details_data = [
            ["Month/Year", "Amount Due", "Amount Paid", "Remaining", "Status", "Payment Date"]
        ]
        
        for payment in payments:
            month_name = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ][payment.month - 1]
            
            payment_date = payment.payment_date.strftime("%d/%m/%Y") if payment.payment_date else "N/A"
            due_amount = payment.amount_paid + payment.remaining_amount
            payment_status = "Paid" if payment.paid else ("Partial" if payment.amount_paid > 0 else "Unpaid")
            
            details_data.append([
                f"{month_name}/{payment.year}",
                f"Rp {due_amount:,.0f}",
                f"Rp {payment.amount_paid:,.0f}",
                f"Rp {payment.remaining_amount:,.0f}",
                payment_status,
                payment_date
            ])
            
            # add installment details if available and requested
            if show_installments and payment.id in installments_map and installments_map[payment.id]:
                installments = installments_map[payment.id]
                for i, installment in enumerate(installments):
                    installment_date = installment.payment_date.strftime("%d/%m/%Y") if installment.payment_date else "N/A"
                    
                    details_data.append([
                        f"   ↳ Installment {i + 1}",
                        "",
                        f"Rp {installment.amount:,.0f}",
                        "",
                        f"Installment {i + 1}/{payment.current_installment}",
                        installment_date
                    ])
        
        # add total row
        total_due = sum(payment.amount_paid + payment.remaining_amount for payment in payments)
        total_paid = sum(payment.amount_paid for payment in payments)
        total_remaining = sum(payment.remaining_amount for payment in payments)
        
        details_data.append([
            "Total",
            f"Rp {total_due:,.0f}",
            f"Rp {total_paid:,.0f}",
            f"Rp {total_remaining:,.0f}",
            "",
            ""
        ])
        
        col_widths = [80, 80, 80, 80, 80, 80]
        details_table = Table(details_data, colWidths=col_widths)

        table_style = [
            # header row
            ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("ALIGN", (0, 0), (-1, 0), "CENTER"),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8), 
            ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
            
            # total row
            ("BACKGROUND", (0, -1), (-1, -1), colors.lightgrey),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            
            # all row
            ("ALIGN", (1, 0), (3, -1), "RIGHT"), 
            ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
            
            # data row
            ("FONTSIZE", (0, 1), (-1, -2), 9), 
            ("BACKGROUND", (0, 1), (-1, -2), colors.beige), 
        ]
        
        # track rows with installment details
        installment_rows = []
        row_idx = 1
        
        # find all installment rows to style differently
        for payment in payments:
            row_idx += 1 
            if payment.id in installments_map:
                num_installments = len(installments_map[payment.id])
                for i in range(num_installments):
                    installment_rows.append(row_idx + i)
                row_idx += num_installments
        
        # add special styling for installment rows
        for row in installment_rows:
            table_style.extend([
                ("FONTNAME", (0, row), (0, row), "Helvetica-Oblique"),  
                ("TEXTCOLOR", (0, row), (-1, row), colors.blue), 
                ("FONTSIZE", (0, row), (-1, row), 8), 
                ("BACKGROUND", (0, row), (-1, row), colors.Color(0.95, 0.95, 1.0)), 
            ])
        
        details_table.setStyle(TableStyle(table_style))
        elements.append(details_table)
    
    def add_page_number(canvas, doc):
        # curr date for footer
        current_date = datetime.now().strftime('%d %B %Y')
        footer_text = f"Printed on: {current_date}"
        
        canvas.saveState()
        
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.gray)
        canvas.drawRightString(
            doc.pagesize[0] - 72, 
            30,
            footer_text
        )
        
        canvas.restoreState()
    
    # build document with footer function
    doc.build(elements, onFirstPage=add_page_number, onLaterPages=add_page_number)
    
    # get PDF content
    pdf = pdf_buffer.getvalue()
    pdf_buffer.close()
    
    return pdf


def generate_payment_reports_zip(students, payments_by_student, config):
    """
    generate ZIP file containing payment reports for multiple students.
    
    args:
        students: list of Student objects
        payments_by_student: dict mapping student IDs to their payments
        config: dict with config options
        
    returns:
        ZIP content as bytes
    """
    # create BytesIO buffer for ZIP file
    zip_buffer = io.BytesIO()
    
    # create ZipFile object
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for student in students:
            # get payments for this student
            student_payments = payments_by_student.get(student.id, [])
            
            # generate PDF for this student (even if no payments)
            pdf_content = generate_payment_report_pdf(student, student_payments, config)
            
            # create filename based on student name
            safe_name = slugify(student.name)
            today = datetime.now().strftime('%Y%m%d')
            filename = f"payment_report_{safe_name}_{today}.pdf"
            
            # add PDF to ZIP file
            zip_file.writestr(filename, pdf_content)
    
    # get ZIP content
    zip_content = zip_buffer.getvalue()
    zip_buffer.close()
    
    return zip_content