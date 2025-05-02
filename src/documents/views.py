from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView, View
from django.urls import reverse_lazy
from django.contrib import messages
from datetime import date
from django.utils.dateparse import parse_date
from payments.models import Payment
from .utils.payment_report import generate_payment_report_pdf, generate_payment_reports_zip

from students.models import Student, StudentClass
from .utils.student_list import generate_student_list_pdf, generate_student_list_excel

# Create your views here.
class DocumentContextMixin:
    def get_document_context(self):
        return {
            "active_tab_title": "Documents",
            "active_tab_icon": "fa-file-alt",
            "available_classes": StudentClass.objects.all(),
            "level_choices": Student._meta.get_field("level").choices,
        }

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update(self.get_document_context())
        return context


class DocumentListView(LoginRequiredMixin, DocumentContextMixin, TemplateView):
    template_name = "documents/document_list.html"


class StudentRegistrationFormView(LoginRequiredMixin, DocumentContextMixin, View):
    """download student registration form."""
    
    def get(self, request):
        from django.http import HttpResponseRedirect
        from django.templatetags.static import static
        
        # redirect to static file
        return HttpResponseRedirect(static('docs/student_registration_form.pdf'))


class StudentPaymentCardView(LoginRequiredMixin, DocumentContextMixin, View):
    """Download student payment card."""
    
    def get(self, request):
        from django.http import HttpResponseRedirect
        from django.templatetags.static import static
        
        # redirect to static file
        return HttpResponseRedirect(static('docs/student_payment_card.pdf'))


class StudentListDocumentView(LoginRequiredMixin, DocumentContextMixin, TemplateView):
    """download student list."""
    
    template_name = "documents/student_list_config.html"
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["title"] = "Student List Configuration"
        return context
    
    def post(self, request, *args, **kwargs):
        # process form submission and generate the student list
        class_filter = request.POST.get('class_filter', '')
        level_filter = request.POST.get('level_filter', '')
        format_type = request.POST.get('format', 'pdf')
        sort_by = request.POST.get('sort_by', 'name')
        
        # get class and level display names for the report
        class_filter_name = ""
        level_filter_name = ""
        
        # build config dict from form
        config = {
            "class_filter": class_filter,
            "level_filter": level_filter,
            "include_name": "include_name" in request.POST,
            "include_age": "include_age" in request.POST,
            "include_gender": "include_gender" in request.POST,
            "include_contact": "include_contact" in request.POST,
            "sort_by": sort_by,
        }
        
        # get filtered students
        students = Student.objects.all()
        
        # apply filters
        if class_filter:
            students = students.filter(assigned_class_id=class_filter)
            try:
                class_obj = StudentClass.objects.get(id=class_filter)
                class_filter_name = class_obj.name
                config["class_filter_name"] = class_filter_name
            except StudentClass.DoesNotExist:
                pass
            
        if level_filter:
            students = students.filter(level=level_filter)
            # get display name for the level
            for code, name in Student._meta.get_field("level").choices:
                if code == level_filter:
                    level_filter_name = name
                    config["level_filter_name"] = level_filter_name
                    break
        
        # apply sorting
        if sort_by == "name":
            students = students.order_by("name")
        elif sort_by == "age":
            students = students.order_by("age")
        elif sort_by == "class":
            students = students.order_by("assigned_class__name", "name")
        elif sort_by == "level":
            students = students.order_by("level", "name")
            
        # check if any students matching the criteria
        if not students.exists():
            # no students match the filter criteria
            messages.error(request, "No students found matching the selected criteria.")
            
            # add error information to context and re-render the form
            context = self.get_context_data()
            context.update({
                "form_data": request.POST,  # Ssnd back orm data for pre-populating
                "error": "No students found matching the selected criteria."
            })
            return render(request, self.template_name, context)
        
        # at least one column must be selected
        if not any([
            config.get("include_name", False),
            config.get("include_age", False),
            config.get("include_gender", False),
            config.get("include_contact", False),
        ]):
            messages.error(request, "Please select at least one column to display.")
            context = self.get_context_data()
            context.update({
                "form_data": request.POST,
                "error": "Please select at least one column to display."
            })
            return render(request, self.template_name, context)
            
        try:
            # generate and return appropriate document format
            if format_type == 'excel':
                excel_data = generate_student_list_excel(students, config)
                filename = f"student_list_{date.today().strftime('%Y%m%d')}.xlsx"
                
                response = HttpResponse(
                    excel_data,
                    content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
                response['Content-Disposition'] = f'attachment; filename="{filename}"'
                return response
            else:  # defaults to PDF
                pdf_data = generate_student_list_pdf(students, config)
                filename = f"student_list_{date.today().strftime('%Y%m%d')}.pdf"
                
                response = HttpResponse(pdf_data, content_type="application/pdf")
                response['Content-Disposition'] = f'attachment; filename="{filename}"'
                return response
        except Exception as e:
            # handle any unexpected errs during document generation
            messages.error(request, f"Error generating document: {str(e)}")
            context = self.get_context_data()
            context.update({
                "form_data": request.POST,
                "error": f"Error generating document: {str(e)}"
            })
            return render(request, self.template_name, context)


class PaymentReportConfigView(LoginRequiredMixin, DocumentContextMixin, TemplateView):
    """config page for payment report before downloading."""
    
    template_name = "documents/payment_report_config.html"
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["title"] = "Payment Report Configuration"
        context["students"] = Student.objects.all().order_by("name")
        return context
    
    def post(self, request, *args, **kwargs):
        # process form submission and redirect to download
        # store config in session for the download view
        request.session['payment_report_config'] = {
            'start_date': request.POST.get('start_date'),
            'end_date': request.POST.get('end_date'),
            'payment_status': request.POST.get('payment_status'),
            'student_ids': request.POST.get('student_ids', ''),
            'class_filter': request.POST.get('class_filter'),
            'level_filter': request.POST.get('level_filter'),
            'payment_type': request.POST.get('payment_type'),
            'include_details': 'include_details' in request.POST,
            'include_summary': 'include_summary' in request.POST,
            'show_installments': 'show_installments' in request.POST,
            'select_all_students': 'select_all_students' in request.POST,
        }
        return redirect('documents:payment_report_download')


class PaymentReportDownloadView(LoginRequiredMixin, DocumentContextMixin, View):
    """download the configured payment report."""
    
    def get(self, request):
        # get config from session
        config = request.session.get('payment_report_config', {})
        
        try:
            # parse start and end dates
            start_date_str = config.get('start_date')
            end_date_str = config.get('end_date')
            
            if not start_date_str or not end_date_str:
                messages.error(request, "Start date and end date are required.")
                return redirect('documents:payment_report_config')
            
            start_date = parse_date(start_date_str)
            end_date = parse_date(end_date_str)
            
            if not start_date or not end_date:
                messages.error(request, "Invalid date format.")
                return redirect('documents:payment_report_config')
                
            if end_date < start_date:
                messages.error(request, "End date cannot be before start date.")
                return redirect('documents:payment_report_config')
            
            # get requested filters
            student_ids = config.get('student_ids', '')
            class_filter = config.get('class_filter')
            level_filter = config.get('level_filter')
            payment_status = config.get('payment_status')
            payment_type = config.get('payment_type')
            select_all_students = config.get('select_all_students', False)
            
            # get students based on filters
            students = Student.objects.all().order_by('name')
            
            # apply student filter if specified
            if select_all_students:
                # apply class and level filters when "include all students" is checked
                if class_filter:
                    students = students.filter(assigned_class_id=class_filter)
                
                if level_filter:
                    students = students.filter(level=level_filter)
            elif student_ids:
                # otherwise use specific student IDs if provided
                student_id_list = [int(id) for id in student_ids.split(',') if id.strip()]
                students = students.filter(id__in=student_id_list)
            
            # check if have students
            if not students.exists():
                messages.error(request, "No students found matching the selected criteria.")
                return redirect('documents:payment_report_config')
            
            # extract year and month ranges
            start_year = start_date.year
            start_month = start_date.month
            end_year = end_date.year
            end_month = end_date.month
            
            # payments dictionary to store payments by student ID
            payments_by_student = {}
            
            # fetch payments for each student
            for student in students:
                # get payments within date range
                payments_query = Payment.objects.filter(
                    student=student
                )
                
                # filter by year and month
                payments = []
                for payment in payments_query:
                    payment_date = (payment.year, payment.month)
                    start_date_tuple = (start_year, start_month)
                    end_date_tuple = (end_year, end_month)
                    
                    if start_date_tuple <= payment_date <= end_date_tuple:
                        payments.append(payment)
                
                # apply payment status filter
                if payment_status == 'paid':
                    payments = [p for p in payments if p.paid]
                elif payment_status == 'unpaid':
                    payments = [p for p in payments if not p.paid and p.amount_paid == 0]
                elif payment_status == 'partial':
                    payments = [p for p in payments if not p.paid and p.amount_paid > 0]
                
                # apply payment type filter
                if payment_type == 'regular':
                    payments = [p for p in payments if not p.is_installment]
                elif payment_type == 'installment':
                    payments = [p for p in payments if p.is_installment]
                
                # store payments for this student
                payments_by_student[student.id] = payments
            
            # check if have any matching payments
            total_payments = sum(len(payments) for payments in payments_by_student.values())
            if total_payments == 0 and payment_status != 'all':
                messages.error(request, "No payments found within the selected date range and criteria.")
                return redirect('documents:payment_report_config')
            
            # generate report(s)
            if len(students) == 1:
                # single student case - generate a single PDF
                student = students[0]
                payments = payments_by_student.get(student.id, [])
                
                pdf_data = generate_payment_report_pdf(student, payments, config)
                
                # safe filename with student name
                safe_name = student.name.replace(' ', '_').lower()
                filename = f"payment_report_{safe_name}_{start_date_str}_to_{end_date_str}.pdf"
                
                response = HttpResponse(pdf_data, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="{filename}"'
                return response
            else:
                # multiple students case - generate ZIP file
                zip_data = generate_payment_reports_zip(students, payments_by_student, config)
                
                # generate filename with date range
                filename = f"payment_reports_{start_date_str}_to_{end_date_str}.zip"
                
                # return ZIP file
                response = HttpResponse(zip_data, content_type='application/zip')
                response['Content-Disposition'] = f'attachment; filename="{filename}"'
                return response
                
        except Exception as e:
            # handle unexpected errors during document generation
            messages.error(request, f"Error generating payment report: {str(e)}")
            return redirect('documents:payment_report_config')


class StudentSummaryConfigView(LoginRequiredMixin, DocumentContextMixin, TemplateView):
    """config page for student summary."""
    
    template_name = "documents/student_summary_config.html"
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["title"] = "Student Summary Configuration"
        context["students"] = Student.objects.all().order_by("name")
        # get available academic years from scores and payments
        years = set()
        from scores.models import Score
        from payments.models import Payment
        
        score_years = Score.objects.values_list('year', flat=True).distinct()
        payment_years = Payment.objects.values_list('year', flat=True).distinct()
        
        years.update(score_years)
        years.update(payment_years)
        
        context["available_years"] = sorted(years, reverse=True)
        return context
        
    def post(self, request, *args, **kwargs):
        # prrocess form submission and store configuration in session
        request.session['student_summary_config'] = {
            'student_ids': request.POST.get('student_ids', ''),
            'include_personal': 'include_personal' in request.POST,
            'include_academic': 'include_academic' in request.POST,
            'include_payment': 'include_payment' in request.POST,
            'academic_year': request.POST.get('academic_year'),
            'semester_filter': request.POST.get('semester_filter', ''),
            'select_all_students': not request.POST.get('student_ids'),
            'class_filter': request.POST.get('class_filter', ''),  
            'level_filter': request.POST.get('level_filter', ''), 
        }
        return redirect('documents:student_summary_download')


class StudentSummaryDownloadView(LoginRequiredMixin, DocumentContextMixin, View):
    """download configured student summary."""
    
    def get(self, request):
        # get configuration from session
        config = request.session.get('student_summary_config', {})
        
        # import the utility functions for generating student summaries
        from .utils.student_summary import generate_student_summary_pdf, generate_student_summaries_zip
        
        try:
            # get student IDs from config
            student_ids = config.get('student_ids', '')
            select_all_students = config.get('select_all_students', False)
            class_filter = config.get('class_filter', '')
            level_filter = config.get('level_filter', '')
            
            # get the students
            if select_all_students:
                students = Student.objects.all().order_by("name")
                
                # apply class filter if specified
                if class_filter:
                    students = students.filter(assigned_class_id=class_filter)
                
                # apply level filter if specified
                if level_filter:
                    students = students.filter(level=level_filter)
                    
            elif student_ids:
                student_id_list = [int(id) for id in student_ids.split(',') if id.strip()]
                students = Student.objects.filter(id__in=student_id_list).order_by("name")
            else:
                messages.error(request, "No students selected.")
                return redirect('documents:student_summary_config')
            
            # make have students
            if not students.exists():
                messages.error(request, "No students found with the selected criteria.")
                return redirect('documents:student_summary_config')
            
            # check if at least one section is selected
            if not any([
                config.get('include_personal'),
                config.get('include_academic'),
                config.get('include_payment')
            ]):
                messages.error(request, "Please select at least one section to include in the summary.")
                return redirect('documents:student_summary_config')
            
            # check if academic year is selected when academic or payment info is included
            if (config.get('include_academic') or config.get('include_payment')) and not config.get('academic_year'):
                messages.error(request, "Please select an academic year for academic or payment information.")
                return redirect('documents:student_summary_config')
            
            # curr date for filenames
            today = date.today().strftime('%Y%m%d')
            
            # handle single student case
            if students.count() == 1:
                student = students.first()
                
                # generate PDF
                pdf_data = generate_student_summary_pdf(student, config)
                
                # create safe filename using the student's name
                safe_name = student.name.replace(' ', '_').lower()
                filename = f"student_summary_{safe_name}_{today}.pdf"
                
                # return PDF as a response
                response = HttpResponse(pdf_data, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="{filename}"'
                return response
                
            # handle multiple students - generate ZIP file
            else:
                zip_data = generate_student_summaries_zip(students, config)
                
                # create filename for ZIP
                filename = f"student_summaries_{today}.zip"
                
                # return ZIP file as response
                response = HttpResponse(zip_data, content_type='application/zip')
                response['Content-Disposition'] = f'attachment; filename="{filename}"'
                return response
            
        except Exception as e:
            # handle unexpected errors during document generation
            messages.error(request, f"Error generating student summary: {str(e)}")
            return redirect('documents:student_summary_config')
