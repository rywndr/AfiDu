import io
from datetime import date

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

def generate_student_list_pdf(students, config):
    """
    generate a PDF with a list of students based on the provided config.
    
    args:
        students: QuerySet of student objects
        config: Dict with config options (columns, etc.)
        
    returns:
        PDF content as bytes
    """
    # set in-memory buffer for PDF
    pdf_buffer = io.BytesIO()
    
    # set document with A4 page size and margins
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=A4,
        rightMargin=72,  # 1 inch margins (72 points)
        leftMargin=72,   # 1 inch margins (72 points)
        topMargin=72,    # 1 inch margins (72 points)
        bottomMargin=72  # 1 inch margins (72 points)
    )
    
    # list to hold document elements
    elements = []
    
    # header
    title_style = ParagraphStyle(
        "Title",
        fontName="Helvetica-Bold",
        fontSize=16,
        alignment=1, 
        spaceAfter=10,
    )
    
    elements.append(Paragraph("STUDENT LIST", title_style))
    elements.append(Spacer(1, 10))
    
    # Add filters info if any
    if config.get("class_filter") or config.get("level_filter"):
        filters = []
        
        if config.get("class_filter_name"):
            filters.append(f"Class: {config['class_filter_name']}")
        
        if config.get("level_filter_name"):
            filters.append(f"Level: {config['level_filter_name']}")
        
        filter_style = ParagraphStyle(
            "FilterInfo",
            fontName="Helvetica",
            fontSize=10,
            alignment=0,
            textColor=colors.gray,
        )
        
        # Add each filter as a separate line
        for filter_text in filters:
            elements.append(Paragraph(filter_text, filter_style))
        
        elements.append(Spacer(1, 5))
    
    # Add total students count below filters
    total_style = ParagraphStyle(
        "TotalInfo",
        fontName="Helvetica-Bold",
        fontSize=10,
        alignment=0,
    )
    elements.append(Paragraph(f"Total Students: {len(students)}", total_style))
    elements.append(Spacer(1, 15))
    
    # determine which cols to include based on config
    columns = []
    include_fields = {
        "include_name": "Name",
        "include_id": "Student ID",
        "include_age": "Age",
        "include_gender": "Gender",
        "include_contact": "Contact Number",
        "include_address": "Address",
    }
    
    # add columns based on config
    for field, header in include_fields.items():
        if config.get(field, False):
            columns.append(header)
    
    # prepare table data
    data = [columns]  # header is first row
    
    # add student data
    for student in students:
        row = []
        if config.get("include_name", False):
            row.append(student.name)
        if config.get("include_id", False):
            row.append(str(student.id))
        if config.get("include_age", False):
            row.append(str(student.age))
        if config.get("include_gender", False):
            row.append(student.gender)
        if config.get("include_contact", False):
            row.append(student.contact_number)
        if config.get("include_address", False):
            row.append(student.address)
        
        data.append(row)
    
    # calc column widths based on num of columns
    page_width = A4[0] - doc.leftMargin - doc.rightMargin
    col_width = page_width / len(columns)
    
    # address column is wider if included
    if config.get("include_address", False):
        address_idx = columns.index("Address")
        col_widths = [col_width] * len(columns)
        col_widths[address_idx] = col_width * 2
        
        # adjust columns to maintain page width
        remaining_cols = len(columns) - 1
        remaining_width = page_width - (col_width * 2)
        for i in range(len(col_widths)):
            if i != address_idx:
                col_widths[i] = remaining_width / remaining_cols
    else:
        col_widths = [col_width] * len(columns)
    
    # create table
    student_table = Table(data, colWidths=col_widths)
    
    # table styling
    style = [
        # header styling
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        
        # data row styling
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        
        # alternating row colors
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.Color(0.95, 0.95, 0.95)]),
    ]
    
    # apply style
    student_table.setStyle(TableStyle(style))
    elements.append(student_table)
    
    # Define function to add the printed date at bottom right
    def add_page_number(canvas, doc):
        # Current date for footer
        current_date = date.today().strftime('%d %B %Y')
        footer_text = f"Printed on: {current_date}"
        
        canvas.saveState()
        
        # Draw the footer text in bottom right
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.gray)
        # Position at bottom right with proper 1 inch margin
        canvas.drawRightString(
            doc.pagesize[0] - 72,  # Right margin (1 inch from right)
            30,  # Bottom position (slightly above bottom margin)
            footer_text
        )
        
        canvas.restoreState()
    
    # build document with the footer function
    doc.build(elements, onFirstPage=add_page_number, onLaterPages=add_page_number)
    
    # get PDF content
    pdf = pdf_buffer.getvalue()
    pdf_buffer.close()
    
    return pdf


def generate_student_list_excel(students, config):
    """
    generate xlsx file with a list of students based on provided configu.
    
    args:
        students: QuerySet of student objects
        config: dict with config options (columns, etc.)
        
    returns:
        xlsx file content as bytes
    """
    import xlsxwriter
    from io import BytesIO
    
    # create in-memory output file
    output = BytesIO()
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet('Student List')
    
    # header styling
    header_format = workbook.add_format({
        'bold': True,
        'bg_color': '#D3D3D3',
        'align': 'center',
        'border': 1
    })
    
    # data cell formatting
    cell_format = workbook.add_format({
        'border': 1
    })
    
    # Bold format for labels
    bold_format = workbook.add_format({
        'bold': True
    })
    
    # determine which columns to include based on config
    columns = []
    include_fields = {
        "include_name": "Name",
        "include_id": "Student ID",
        "include_age": "Age",
        "include_gender": "Gender",
        "include_contact": "Contact Number",
        "include_address": "Address",
    }
    
    # add columns based on config
    for field, header in include_fields.items():
        if config.get(field, False):
            columns.append(header)
    
    # write headers
    for col_num, column_title in enumerate(columns):
        worksheet.write(0, col_num, column_title, header_format)
    
    # write rows
    row_num = 1
    for student in students:
        col_num = 0
        if config.get("include_name", False):
            worksheet.write(row_num, col_num, student.name, cell_format)
            col_num += 1
        if config.get("include_id", False):
            worksheet.write(row_num, col_num, student.id, cell_format)
            col_num += 1
        if config.get("include_age", False):
            worksheet.write(row_num, col_num, student.age, cell_format)
            col_num += 1
        if config.get("include_gender", False):
            worksheet.write(row_num, col_num, student.gender, cell_format)
            col_num += 1
        if config.get("include_contact", False):
            worksheet.write(row_num, col_num, student.contact_number, cell_format)
            col_num += 1
        if config.get("include_address", False):
            worksheet.write(row_num, col_num, student.address, cell_format)
            col_num += 1
        
        row_num += 1
    
    # auto- adj column widths
    for i, col in enumerate(columns):
        worksheet.set_column(i, i, max(len(col) + 2, 15))
    
    # Start adding footer information with a row gap
    row_num += 2  # Skip a row
    
    # Add filters info if any (with titles and values in separate columns)
    if config.get("class_filter") or config.get("level_filter"):
        if config.get("level_filter_name"):
            worksheet.write(row_num, 0, "Level:", bold_format)
            worksheet.write(row_num, 1, config['level_filter_name'])
            row_num += 1
            
        if config.get("class_filter_name"):
            worksheet.write(row_num, 0, "Class:", bold_format)
            worksheet.write(row_num, 1, config['class_filter_name'])
            row_num += 1
    
    # Add total students count
    worksheet.write(row_num, 0, "Total Students:", bold_format)
    worksheet.write(row_num, 1, len(students))
    row_num += 1
    
    # Change "Generated on" to "Printed on"
    worksheet.write(row_num, 0, "Printed on:", bold_format)
    worksheet.write(row_num, 1, date.today().strftime('%d %B %Y'))
    
    # close workbook
    workbook.close()
    
    # rewind buffer
    output.seek(0)
    
    return output.getvalue()