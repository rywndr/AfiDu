from io import BytesIO
import os
import zipfile
from datetime import date

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.units import inch, cm

from django.conf import settings
from students.models import Student
from scores.models import Score
from payments.models import Payment, PaymentConfig, PaymentInstallment


def generate_student_summary_pdf(student, config):
    """Generate a PDF summary for a student including personal, academic, and payment info.
    
    Args:
        student: The Student model instance
        config: Configuration dictionary from the request session
        
    Returns:
        BytesIO object containing the PDF data
    """
    buffer = BytesIO()
    
    # Create PDF document with improved margins for better printability
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=72,  # 1 inch margins (72 points)
        leftMargin=72,   # 1 inch margins (72 points)
        topMargin=72,    # 1 inch margins (72 points)
        bottomMargin=72  # 1 inch margins (72 points)
    )
    
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
    
    # Custom styles
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=colors.navy,
        spaceAfter=6
    )
    
    # Footer style for the printed date
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        textColor=colors.gray,
        alignment=2  # Right-aligned
    )
    
    # Create content elements
    elements = []
    
    # Title - including the year and semester in the main title if available
    academic_year = config.get('academic_year')
    semester_filter = config.get('semester_filter', '')
    
    if academic_year:
        year = int(academic_year)
        if semester_filter == 'mid':
            elements.append(Paragraph(f"STUDENT SUMMARY REPORT MID {year}", title_style))
        elif semester_filter == 'final':
            elements.append(Paragraph(f"STUDENT SUMMARY REPORT FINAL {year}", title_style))
        else:
            elements.append(Paragraph(f"STUDENT SUMMARY REPORT {year}", title_style))
    else:
        elements.append(Paragraph(f"STUDENT SUMMARY REPORT", title_style))
    elements.append(Spacer(1, 0.25*inch))
    
    # Personal Information Section with photo
    if config.get('include_personal'):
        elements.append(Paragraph("Personal Information", subtitle_style))
        
        # Create a table for the personal info section - 2 columns
        has_photo = False
        photo_path = None
        
        if config.get('include_photo') and student.profile_photo:
            try:
                photo_path = os.path.join(settings.MEDIA_ROOT, student.profile_photo.name)
                if os.path.exists(photo_path):
                    has_photo = True
            except Exception:
                pass
        
        # Format personal data in two columns - fix DOB formatting to avoid overlap
        # Increase column widths for longer fields like Date of Birth
        # Truncate address if it's too long (more than 40 characters)
        address_display = student.address
        if len(address_display) > 40:
            address_display = address_display[:27] + " ..."
            
        personal_data = [
            ["Name:", student.name, "Gender:", student.gender],
            ["Age:", str(student.age), "DOB:", student.date_of_birth.strftime('%d %b %Y')],  # Abbreviated month format
            ["Contact:", student.contact_number, "Address:", address_display],
            ["Class:", student.assigned_class.name if student.assigned_class else "Unassigned", "Level:", student.level]
        ]
        
        if has_photo:
            # Create table with adjusted column widths to prevent overlap
            # Reducing the width of field values to allow more space between columns
            personal_table = Table(personal_data, colWidths=[65, 120, 45, 150])
            
            # Add photo to the right side
            img = Image(photo_path, width=1.5*inch, height=1.5*inch)
            
            # Create a table to place the photo and personal info side by side
            # Adjust widths to ensure proper spacing
            data = [[personal_table, img]]
            main_table = Table(data, colWidths=[380, 100])
            main_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('RIGHTPADDING', (0, 0), (0, 0), 20),  # Increased padding between info and photo
            ]))
            
            elements.append(main_table)
        else:
            # Create a table with 4 columns without photo - with adjusted column widths
            personal_table = Table(personal_data, colWidths=[65, 150, 45, 180])
            elements.append(personal_table)
        
        # Style the personal information table
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
        
    # Academic Information Section
    if config.get('include_academic'):
        elements.append(Paragraph("Academic Information", subtitle_style))
        
        academic_year = config.get('academic_year')
        semester_filter = config.get('semester_filter', '')
        
        if academic_year:
            year = int(academic_year)
            
            # Get all scores for this academic year
            all_scores = Score.objects.filter(student=student, year=year)
            
            # Apply semester filter if specified - using correct string values
            if semester_filter == 'mid':
                filtered_scores = all_scores.filter(semester='mid')
            elif semester_filter == 'final':
                filtered_scores = all_scores.filter(semester='final')
            else:
                filtered_scores = all_scores
                
            filtered_scores = filtered_scores.order_by('semester', 'category')
                
            if filtered_scores.exists():
                # Get the semesters we need to display
                semesters = []
                if semester_filter == 'mid':
                    semesters.append({"id": 'mid', "display": "Mid"})
                elif semester_filter == 'final':
                    semesters.append({"id": 'final', "display": "Final"})
                else:
                    # Both semesters - Mid first, then Final
                    semesters.append({"id": 'mid', "display": "Mid"})
                    semesters.append({"id": 'final', "display": "Final"})
                
                # Display scores by semester - Mid first, then Final
                for semester in semesters:
                    semester_scores = filtered_scores.filter(semester=semester["id"])
                    
                    if semester_scores.exists():
                        # Only show semester header when no semester filter is selected
                        # (When showing both semesters, we need the headers to distinguish them)
                        if not semester_filter:
                            elements.append(Paragraph(f"{semester['display']} Semester", header_style))
                        
                        # Create table header
                        scores_data = [["Category", "Mid-Term", "Final", "Final Score"]]
                        
                        # Add rows for each category
                        for score in semester_scores:
                            mid_term = f"{score.mid_term:.0f}" if score.mid_term is not None else "-"
                            finals = f"{score.finals:.0f}" if score.finals is not None else "-"
                            
                            scores_data.append([
                                score.get_category_display(),
                                mid_term,
                                finals,
                                f"{score.final_score:.0f}"
                            ])
                        
                        # Create the table with adjusted column widths to fit within margins
                        scores_table = Table(scores_data, colWidths=[100, 100, 100, 100])
                        scores_table.setStyle(TableStyle([
                            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                            ('GRID', (0, 0), (-1, -1), 1, colors.black),
                        ]))
                        
                        elements.append(scores_table)
                        elements.append(Spacer(1, 0.25*inch))
            else:
                elements.append(Paragraph(f"No scores found for academic year {year}", normal_style))
        else:
            elements.append(Paragraph("No academic year selected", normal_style))
    
    semester_filter = config.get('semester_filter', '')
    
    # Add page break if only year filter is selected (no semester filter)
    if config.get('include_academic') and config.get('include_payment') and not semester_filter:
        elements.append(PageBreak())
    
    # Payment Information Section
    if config.get('include_payment'):
        elements.append(Paragraph("Payment Information", subtitle_style))
        
        academic_year = config.get('academic_year')
        
        if academic_year:
            try:
                payment_config = PaymentConfig.get_active(year)
                monthly_fee = payment_config.monthly_fee
                
                # Add year info text
                elements.append(Spacer(1, 0.1*inch))
                
                # Get all payments for this academic year directly
                all_payments = list(Payment.objects.filter(student=student, year=year).order_by('month'))
                
                # Determine semester months based on the payment config and semester filter
                if semester_filter == 'mid':
                    relevant_months = list(range(payment_config.mid_semester_start, payment_config.mid_semester_end + 1))
                    semester_ranges = [
                        {"semester": "Mid", "months": relevant_months}
                    ]
                elif semester_filter == 'final':
                    relevant_months = list(range(payment_config.final_semester_start, payment_config.final_semester_end + 1))
                    semester_ranges = [
                        {"semester": "Final", "months": relevant_months}
                    ]
                else:
                    # Both semesters - separate them for display
                    mid_sem_months = list(range(payment_config.mid_semester_start, payment_config.mid_semester_end + 1))
                    final_sem_months = list(range(payment_config.final_semester_start, payment_config.final_semester_end + 1))
                    relevant_months = sorted(mid_sem_months + final_sem_months)
                    semester_ranges = [
                        {"semester": "Mid", "months": mid_sem_months},
                        {"semester": "Final", "months": final_sem_months}
                    ]
                
                # Filter payments to only include relevant months
                payments = [p for p in all_payments if p.month in relevant_months]
                
                if payments:
                    # Load installment data if available
                    installments_map = {}
                    for payment in payments:
                        if payment.is_installment or (not payment.paid and payment.amount_paid > 0):
                            # Get installments for this payment
                            installments = list(PaymentInstallment.objects.filter(payment=payment).order_by('payment_date'))
                            if installments:
                                installments_map[payment.id] = installments
                    
                    # For multiple semesters, organize payments by semester
                    for semester_data in semester_ranges:
                        semester_name = semester_data["semester"]
                        semester_months = semester_data["months"]
                        
                        # Add semester header only if no semester filter is selected
                        # (When showing both semesters, we need the headers to distinguish them)
                        if not semester_filter:
                            elements.append(Paragraph(f"{semester_name} Semester", header_style))
                        
                        # Create payment summary table header for this semester
                        payment_data = [["Month", "Amount Due", "Amount Paid", "Remaining", "Status", "Installment"]]
                        
                        # Fill in payment data for this semester
                        semester_total_due = 0
                        semester_total_paid = 0
                        semester_total_remaining = 0
                        
                        # Populate payment table rows for this semester
                        for month in semester_months:
                            # Find payment for this month
                            payment_for_month = next((p for p in payments if p.month == month), None)
                            
                            if payment_for_month:
                                payment = payment_for_month
                                amount_due = monthly_fee
                                amount_paid = payment.amount_paid
                                remaining = payment.remaining_amount
                                status = "Paid" if payment.paid else "Unpaid" if payment.amount_paid == 0 else "Partial"
                                installment = f"({payment.current_installment}/{payment_config.max_installments})" if payment.is_installment else "-"
                                
                                month_name = date(year, month, 1).strftime("%B")
                                payment_data.append([
                                    month_name,
                                    f"Rp {int(amount_due):,}",  # IDR format
                                    f"Rp {int(amount_paid):,}",  # IDR format
                                    f"Rp {int(remaining):,}",  # IDR format
                                    status,
                                    installment
                                ])
                                
                                # Add installment details if available
                                if payment.id in installments_map:
                                    installments = installments_map[payment.id]
                                    for i, installment in enumerate(installments):
                                        inst_date = installment.payment_date.strftime("%d/%m/%Y") if installment.payment_date else "N/A"
                                        
                                        payment_data.append([
                                            f"   ↳ Installment {i + 1}",
                                            "",
                                            f"Rp {int(installment.amount):,}",  # IDR format
                                            "",
                                            f"Installment {i + 1}/{payment.current_installment}",
                                            inst_date
                                        ])
                                
                                semester_total_due += amount_due
                                semester_total_paid += amount_paid
                                semester_total_remaining += remaining
                                
                            else:
                                # No payment record for this month
                                month_name = date(year, month, 1).strftime("%B")
                                payment_data.append([
                                    month_name,
                                    f"Rp {int(monthly_fee):,}",  # IDR format
                                    "Rp 0",  # IDR format
                                    f"Rp {int(monthly_fee):,}",  # IDR format
                                    "Unpaid",
                                    "No"
                                ])
                                semester_total_due += monthly_fee
                                semester_total_remaining += monthly_fee
                        
                        # Add semester totals row - simplified text
                        payment_data.append([
                            "Total",  # Simplified text
                            f"Rp {int(semester_total_due):,}",  # IDR format
                            f"Rp {int(semester_total_paid):,}",  # IDR format
                            f"Rp {int(semester_total_remaining):,}",  # IDR format
                            "",
                            ""
                        ])
                        
                        # Create the table with adjusted column widths to fit within margins
                        col_widths = [70, 85, 85, 85, 70, 55]
                        payment_table = Table(payment_data, colWidths=col_widths)
                        
                        # Define base table styles
                        table_style = [
                            # Header row styling - reduce font size to prevent overlap
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
                            ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                            
                            # Adjust all data cell font size
                            ("FONTSIZE", (0, 1), (-1, -2), 9),  # Slightly smaller font for all data cells
                        ]
                        
                        # Track rows with installment details
                        installment_rows = []
                        row_idx = 1
                        
                        # Find all installment rows to style them differently
                        for payment in [p for p in payments if p.month in semester_months]:
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
                        
                        payment_table.setStyle(TableStyle(table_style))
                        elements.append(payment_table)
                        elements.append(Spacer(1, 0.25*inch))
                    
                    # Add overall total row if more than one semester is shown
                    if len(semester_ranges) > 1:
                        # Calculate totals across all semesters
                        total_due = sum(monthly_fee for _ in payments)
                        total_paid = sum(p.amount_paid for p in payments)
                        total_remaining = sum(p.remaining_amount for p in payments)
                        
                        # Create overall total table with IDR format
                        total_data = [
                            ["", "Total Amount Due", "Total Amount Paid", "Total Remaining", "", ""],
                            ["Overall Total", f"Rp {int(total_due):,}", f"Rp {int(total_paid):,}", f"Rp {int(total_remaining):,}", "", ""]
                        ]
                        
                        total_table = Table(total_data, colWidths=[70, 85, 85, 85, 70, 55])
                        total_table.setStyle(TableStyle([
                            ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                            ("ALIGN", (0, 0), (-1, 0), "CENTER"),
                            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                            ("FONTSIZE", (0, 0), (-1, 0), 8),  # Smaller font for headers
                            ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
                            ("ALIGN", (1, 0), (3, -1), "RIGHT"),
                            ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                            ("BACKGROUND", (0, 1), (-1, 1), colors.Color(0.85, 0.85, 0.85)),
                        ]))
                        elements.append(total_table)
                else:
                    elements.append(Paragraph(f"No payment records found for year {year}", normal_style))
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error generating payment section: {str(e)}")
                elements.append(Paragraph(f"Error retrieving payment data: {str(e)}", normal_style))
        else:
            elements.append(Paragraph("No academic year selected", normal_style))
    
    # Create a function to draw the footer on each page
    def add_page_number(canvas, doc):
        # Current date for footer
        current_date = date.today().strftime('%d %B %Y')
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
    
    # Build PDF with custom page template that includes the footer
    doc.build(elements, onFirstPage=add_page_number, onLaterPages=add_page_number)
    buffer.seek(0)
    
    return buffer.getvalue()


def generate_student_summaries_zip(students, config):
    """Generate a ZIP file containing PDFs for multiple students.
    
    Args:
        students: QuerySet of Student model instances
        config: Configuration dictionary from the request session
        
    Returns:
        BytesIO object containing the ZIP data
    """
    buffer = BytesIO()
    
    # Create ZIP file
    with zipfile.ZipFile(buffer, 'w') as zip_file:
        # Generate PDF for each student
        for student in students:
            try:
                # Generate the PDF for this student
                pdf_data = generate_student_summary_pdf(student, config)
                
                # Create a safe filename using the student's name
                safe_name = student.name.replace(' ', '_').lower()
                today = date.today().strftime('%Y%m%d')
                filename = f"student_summary_{safe_name}_{today}.pdf"
                
                # Add the PDF to the ZIP file
                zip_file.writestr(filename, pdf_data)
            except Exception as e:
                # Log error and continue with next student
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error generating summary for student {student.name} (ID: {student.id}): {str(e)}")
                continue
    
    buffer.seek(0)
    return buffer.getvalue()