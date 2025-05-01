import io
import os
import zipfile
from datetime import datetime
from decimal import Decimal

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
    Generate a PDF payment report for a student.
    
    Args:
        student: Student object
        payments: QuerySet of Payment objects for the student
        config: Dictionary with configuration options
        
    Returns:
        PDF content as bytes
    """
    # Set up in-memory buffer for PDF
    pdf_buffer = io.BytesIO()
    
    # Set up the document with A4 page size and margins
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=A4,
        rightMargin=72,  # 1 inch margins (72 points)
        leftMargin=72,   # 1 inch margins (72 points)
        topMargin=72,    # 1 inch margins (72 points)
        bottomMargin=72  # 1 inch margins (72 points)
    )
    
    # List to hold document elements
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=16,
        alignment=1,  # Center
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
    
    # Add header
    elements.append(Paragraph("PAYMENT REPORT", title_style))
    elements.append(Spacer(1, 0.25*inch))
    
    # Student information - similar to student_summary format
    elements.append(Paragraph("Student Information", subtitle_style))
    
    # Format personal data in two columns - without using a table with borders
    personal_data = [
        ["Name:", student.name, "Gender:", student.gender],
        ["Class:", student.assigned_class.name if student.assigned_class else "Not assigned", "Level:", student.level]
    ]
    
    # Create a table with 4 columns but no borders
    personal_table = Table(personal_data, colWidths=[65, 150, 65, 150])
    
    # Style the personal information table - without borders
    personal_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (0, -1), 10),  # Add padding between label and value
        ('RIGHTPADDING', (1, 0), (1, -1), 15),  # Add padding between columns
        ('RIGHTPADDING', (2, 0), (2, -1), 10),  # Add padding between label and value
    ]))
    
    elements.append(personal_table)
    elements.append(Spacer(1, 0.25*inch))
    
    # Payment summary section if requested
    if config.get('include_summary', True):
        elements.append(Paragraph("Payment Summary", subtitle_style))
        
        total_paid = sum(payment.amount_paid for payment in payments)
        total_due = sum(
            Decimal(payment.amount_paid) + Decimal(payment.remaining_amount) 
            for payment in payments
        )
        total_remaining = sum(payment.remaining_amount for payment in payments)
        
        # Create 2-column summary table (label, value) without the unused 3rd column
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
    
    # Payment details section if requested
    if config.get('include_details', False) and payments:
        elements.append(Paragraph("Payment Details", subtitle_style))
        
        # Load installment data if available
        show_installments = config.get('show_installments', True)
        
        # Import PaymentInstallment model if needed
        if show_installments:
            try:
                from payments.models import PaymentInstallment
                # Group installments by payment
                installments_map = {}
                for payment in payments:
                    # Check if payment is an installment or partial payment
                    if payment.is_installment or (not payment.paid and payment.amount_paid > 0):
                        # Get installments for this payment
                        installments = list(PaymentInstallment.objects.filter(payment=payment).order_by('payment_date'))
                        installments_map[payment.id] = installments
            except ImportError:
                show_installments = False
                installments_map = {}
        else:
            installments_map = {}
        
        # Create the details table
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
            
            # Add installment details if available and requested
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
        
        # Add total row like in student summary
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
        
        # Create table with column widths like student summary report
        col_widths = [80, 80, 80, 80, 80, 80]
        details_table = Table(details_data, colWidths=col_widths)
        
        # Define table styles similar to student summary report
        table_style = [
            # Header row styling
            ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("ALIGN", (0, 0), (-1, 0), "CENTER"),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8),  # Smaller font size for headers
            ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
            
            # Total row styling
            ("BACKGROUND", (0, -1), (-1, -1), colors.lightgrey),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            
            # All rows
            ("ALIGN", (1, 0), (3, -1), "RIGHT"),  # Right-align monetary values
            ("GRID", (0, 0), (-1, -1), 0.5, colors.black),  # Grid for all cells
            
            # Data rows
            ("FONTSIZE", (0, 1), (-1, -2), 9),  # Slightly smaller font for data
            ("BACKGROUND", (0, 1), (-1, -2), colors.beige),  # Light background for data rows
        ]
        
        # Track rows with installment details
        installment_rows = []
        row_idx = 1
        
        # Find all installment rows to style them differently
        for payment in payments:
            row_idx += 1  # Skip the payment row
            if payment.id in installments_map:
                num_installments = len(installments_map[payment.id])
                for i in range(num_installments):
                    installment_rows.append(row_idx + i)
                row_idx += num_installments
        
        # Add special styling for installment rows
        for row in installment_rows:
            table_style.extend([
                ("FONTNAME", (0, row), (0, row), "Helvetica-Oblique"),  # Italic for first column
                ("TEXTCOLOR", (0, row), (-1, row), colors.blue),  # Blue text
                ("FONTSIZE", (0, row), (-1, row), 8),  # Smaller text
                ("BACKGROUND", (0, row), (-1, row), colors.Color(0.95, 0.95, 1.0)),  # Light blue background
            ])
        
        details_table.setStyle(TableStyle(table_style))
        elements.append(details_table)
    
    # Define a function to add the generated-on date at bottom right
    def add_page_number(canvas, doc):
        # Current date for footer
        current_date = datetime.now().strftime('%d %B %Y')
        footer_text = f"Printed on: {current_date}"
        
        canvas.saveState()
        
        # Draw the footer text in bottom right
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.gray)
        # Position at bottom right with 1 inch margin
        canvas.drawRightString(
            doc.pagesize[0] - 72,  # Right margin (1 inch from right)
            30,  # Bottom position (slightly above bottom margin)
            footer_text
        )
        
        canvas.restoreState()
    
    # Build document with the footer function
    doc.build(elements, onFirstPage=add_page_number, onLaterPages=add_page_number)
    
    # Get PDF content
    pdf = pdf_buffer.getvalue()
    pdf_buffer.close()
    
    return pdf


def generate_payment_reports_zip(students, payments_by_student, config):
    """
    Generate ZIP file containing payment reports for multiple students.
    
    Args:
        students: List of Student objects
        payments_by_student: Dictionary mapping student IDs to their payments
        config: Dictionary with configuration options
        
    Returns:
        ZIP content as bytes
    """
    # Create a BytesIO buffer for the ZIP file
    zip_buffer = io.BytesIO()
    
    # Create a ZipFile object
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for student in students:
            # Get payments for this student
            student_payments = payments_by_student.get(student.id, [])
            
            # Generate PDF for this student (even if no payments)
            pdf_content = generate_payment_report_pdf(student, student_payments, config)
            
            # Create filename based on student name
            safe_name = slugify(student.name)
            today = datetime.now().strftime('%Y%m%d')
            filename = f"payment_report_{safe_name}_{today}.pdf"
            
            # Add PDF to ZIP file
            zip_file.writestr(filename, pdf_content)
    
    # Get the ZIP content
    zip_content = zip_buffer.getvalue()
    zip_buffer.close()
    
    return zip_content