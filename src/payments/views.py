import calendar
import datetime
from decimal import Decimal, InvalidOperation
from urllib.parse import urlencode

import pytz
from django.contrib import messages
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse, reverse_lazy
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views.generic import DetailView, ListView, UpdateView, View

from students.models import LEVELS, Student, StudentClass

from .forms import PaymentConfigForm
from .models import Payment, PaymentConfig, PaymentInstallment


def is_superuser(user):
    return user.is_superuser


class PaymentContextMixin:
    def get_payment_context(self):
        # set jarak tahun untuk filter dan data bulan
        months = list(range(1, 13))
        current_year = datetime.date.today().year
        years_range = list(range(current_year, current_year + 8))

        # get selected year from request, defaults to current year
        selected_year = self.request.GET.get("config_year")
        if not (
            selected_year
            and selected_year.isdigit()
            and int(selected_year) in years_range
        ):
            selected_year = current_year
        else:
            selected_year = int(selected_year)

        return {
            "available_classes": StudentClass.objects.all(),
            "level_choices": LEVELS,
            "years": years_range,
            "selected_year": selected_year,
            "months": months,
            "month_names": {i: calendar.month_abbr[i] for i in months},
            "active_tab_title": "Payments",
            "active_tab_icon": "fa-money-bill-wave",
            "payment_config": PaymentConfig.get_active(selected_year),
        }

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update(self.get_payment_context())
        return context


class PaymentListView(LoginRequiredMixin, UserPassesTestMixin, PaymentContextMixin, ListView):
    model = Student
    template_name = "payments/payment_list.html"
    context_object_name = "students"
    paginate_by = 5

    def test_func(self):
        return self.request.user.is_superuser

    def get_paginate_by(self, queryset):
        per_page = self.request.GET.get("per_page", self.request.session.get("payments_per_page", str(self.paginate_by)))
        if per_page and per_page.isdigit():
            return int(per_page)
        return self.paginate_by

    def get_queryset(self):
        qs = super().get_queryset()
        
        # Get filters from request or session
        q = self.request.GET.get("q")
        class_filter = self.request.GET.get("class_filter")
        level_filter = self.request.GET.get("level_filter")
        sort_by = self.request.GET.get("sort_by")
        current_month_filter = self.request.GET.get("current_month_filter")
        
        # store filters in session if provided in request
        if q is not None:
            self.request.session["payments_q"] = q
        elif "payments_q" in self.request.session:
            q = self.request.session["payments_q"]
            
        if class_filter is not None:
            self.request.session["payments_class_filter"] = class_filter
        elif "payments_class_filter" in self.request.session:
            class_filter = self.request.session["payments_class_filter"]
            
        if level_filter is not None:
            self.request.session["payments_level_filter"] = level_filter
        elif "payments_level_filter" in self.request.session:
            level_filter = self.request.session["payments_level_filter"]
            
        if sort_by is not None:
            self.request.session["payments_sort_by"] = sort_by
        elif "payments_sort_by" in self.request.session:
            sort_by = self.request.session["payments_sort_by"]
            
        if current_month_filter is not None:
            self.request.session["payments_current_month_filter"] = current_month_filter
        elif "payments_current_month_filter" in self.request.session:
            current_month_filter = self.request.session["payments_current_month_filter"]
        
        # filter by search q
        if q:
            qs = qs.filter(name__icontains=q)
        # filter by class
        if class_filter:
            qs = qs.filter(assigned_class=class_filter)
        # filter by level
        if level_filter:
            qs = qs.filter(level=level_filter)
        # sort by name
        if sort_by == "name_asc":
            qs = qs.order_by("name")
        elif sort_by == "name_desc":
            qs = qs.order_by("-name")
            
        # filter by current month payment status
        if current_month_filter:
            year = self.get_year()
            current_month = datetime.date.today().month
            current_year = datetime.date.today().year
            
            if year == current_year:
                if current_month_filter == "paid":
                    # students who paid for current month
                    qs = qs.filter(
                        payments__year=year,
                        payments__month=current_month,
                        payments__paid=True
                    ).distinct()
                elif current_month_filter == "unpaid":
                    # students who haven't paid for current month
                    paid_student_ids = Payment.objects.filter(
                        year=year,
                        month=current_month,
                        paid=True
                    ).values_list('student_id', flat=True)
                    qs = qs.exclude(id__in=paid_student_ids)
        
        return qs

    def get_year(self):
        year = self.request.GET.get("year")
        if year is not None:
            self.request.session["payments_year"] = year
        elif "payments_year" in self.request.session:
            year = self.request.session["payments_year"]
        
        if not (year and year.isdigit()):
            return datetime.date.today().year
        return int(year)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        year = self.get_year()
        context["year"] = year

        # get payment config for the year
        payment_config = PaymentConfig.get_active(year)
        context["payment_config"] = payment_config

        # calculate detailed payment status for each student
        student_payment_details = {}
        
        # calculate total months for the year
        mid_sem_months = list(range(payment_config.mid_semester_start, payment_config.mid_semester_end + 1))
        final_sem_months = list(range(payment_config.final_semester_start, payment_config.final_semester_end + 1))
        total_months = len(mid_sem_months) + len(final_sem_months)
        
        # get current month and check if it's in semester
        current_month = datetime.date.today().month
        current_year = datetime.date.today().year
        is_current_semester_month = current_month in mid_sem_months or current_month in final_sem_months
        
        # Create a date object for the current month to use with date filter
        current_month_date = datetime.date(current_year, current_month, 1)
        
        context["current_month"] = current_month
        context["current_month_date"] = current_month_date
        context["current_year"] = current_year
        context["is_current_semester_month"] = is_current_semester_month

        for student in context["students"]:
            # get all payments for this student in the selected year
            payments = Payment.objects.filter(student=student, year=year)
            
            # calculate payment status
            months_paid = payments.filter(paid=True).count()
            months_partial = payments.filter(amount_paid__gt=0, paid=False).count()
            
            # check if any payment has reached max installments but isn't fully paid
            has_maxed_installments = payments.filter(
                current_installment=payment_config.max_installments,
                paid=False,
                amount_paid__gt=0
            ).exists()
            
            # check current month payment status
            current_month_paid = False
            if is_current_semester_month and year == current_year:
                current_month_payment = payments.filter(month=current_month).first()
                current_month_paid = current_month_payment and current_month_payment.paid
            
            # determine status based on completion
            if months_paid == total_months:
                status_label = "Fully Paid"
                status_color = "green"
            elif has_maxed_installments:
                status_label = "Installment Limit Reached"
                status_color = "purple"
            elif months_paid + months_partial >= total_months * 0.75:
                status_label = "Nearly Complete"
                status_color = "blue"
            elif months_paid + months_partial >= total_months * 0.25:
                status_label = "Partially Paid"
                status_color = "yellow"
            elif months_paid + months_partial > 0:
                status_label = "Minimal Payment"
                status_color = "orange"
            else:
                status_label = "No Payment"
                status_color = "red"
            
            student_payment_details[student.id] = {
                "months_paid": months_paid,
                "months_partial": months_partial,
                "total_months": total_months,
                "status_label": status_label,
                "status_color": status_color,
                "current_month_paid": current_month_paid,
                "has_maxed_installments": has_maxed_installments,
                "has_any_payments": months_paid > 0 or months_partial > 0,
            }

        context["student_payment_details"] = student_payment_details
        context["current_per_page"] = self.request.GET.get("per_page", self.request.session.get("payments_per_page", str(self.paginate_by)))
        return context

    def get(self, request, *args, **kwargs):
        # Store per_page in session if provided
        if "per_page" in request.GET:
            request.session["payments_per_page"] = request.GET.get("per_page", str(self.paginate_by))
        
        # Check if URL parameters are present, if not, use session values if available
        if not any(
            key in request.GET
            for key in ["q", "class_filter", "level_filter", "year", "per_page", "sort_by", "current_month_filter"]
        ) and any(
            key in request.session
            for key in [
                "payments_q",
                "payments_class_filter",
                "payments_level_filter",
                "payments_year",
                "payments_per_page",
                "payments_sort_by",
                "payments_current_month_filter",
            ]
        ):
            # build URL from session values
            params = {
                "q": request.session.get("payments_q", ""),
                "class_filter": request.session.get("payments_class_filter", ""),
                "level_filter": request.session.get("payments_level_filter", ""),
                "year": request.session.get("payments_year", str(datetime.date.today().year)),
                "per_page": request.session.get("payments_per_page", str(self.paginate_by)),
                "sort_by": request.session.get("payments_sort_by", ""),
                "current_month_filter": request.session.get("payments_current_month_filter", ""),
            }
            # remove empty params
            params = {k: v for k, v in params.items() if v}
            # redirect to the filtered URL
            if params:
                return redirect(f"{request.path}?{urlencode(params)}")

        # store current URL with all filters in session
        self.request.session["payment_list_url"] = self.request.get_full_path()

        # remove the automatic redirect to #payment-table anchor
        return super().get(request, *args, **kwargs)

    def handle_no_permission(self):
        # Custom handling for when user doesn't have permission
        return render(self.request, '403.html', status=403)


class PaymentConfigView(LoginRequiredMixin, PaymentContextMixin, UpdateView):
    model = PaymentConfig
    form_class = PaymentConfigForm
    template_name = "payments/payment_config.html"
    success_url = reverse_lazy("payments:payment_config")

    def get_object(self, queryset=None):
        selected_year = self.request.GET.get("config_year")
        if selected_year and selected_year.isdigit():
            year = int(selected_year)
        else:
            year = datetime.date.today().year
        return PaymentConfig.get_active(year)

    def get_success_url(self):
        # keep year parameter when redirecting after save
        year = self.object.year
        return f"{reverse('payments:payment_config')}?config_year={year}"

    def form_valid(self, form):
        messages.success(self.request, "Payment configuration updated successfully!")
        return super().form_valid(form)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # Use payment_list_url from session or reconstruct it
        payment_list_url = self.request.session.get("payment_list_url")
        if not payment_list_url:
            # Reconstruct URL from session parameters
            params = {
                "q": self.request.session.get("payments_q", ""),
                "class_filter": self.request.session.get("payments_class_filter", ""),
                "level_filter": self.request.session.get("payments_level_filter", ""),
                "year": self.request.session.get(
                    "payments_year", str(datetime.date.today().year)
                ),
                "per_page": self.request.session.get("payments_per_page", "5"),
            }
            # Remove empty params
            params = {k: v for k, v in params.items() if v}
            # Build query string
            query_string = "&".join([f"{k}={v}" for k, v in params.items()])
            payment_list_url = f"{reverse('payments:payment_list')}?{query_string}"

        context["payment_list_url"] = payment_list_url

        return context


class StudentPaymentDetailView(LoginRequiredMixin, PaymentContextMixin, DetailView):
    model = Student
    template_name = "payments/payment_detail.html"
    context_object_name = "student"

    def get_year(self):
        year = self.request.GET.get("year")
        if not (year and year.isdigit()):
            return datetime.date.today().year
        return int(year)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        year = self.get_year()
        student = self.get_object()

        # get payment config
        payment_config = PaymentConfig.get_active(year)
        context.update({
            "year": year,
            "payment_config": payment_config,
        })

        # semester months
        mid_sem_months = list(range(payment_config.mid_semester_start, payment_config.mid_semester_end + 1))
        final_sem_months = list(range(payment_config.final_semester_start, payment_config.final_semester_end + 1))

        # semester data structure
        semesters = {
            "mid": {"name": "Mid Semester", "months": mid_sem_months, "payments": []},
            "final": {"name": "Final Semester", "months": final_sem_months, "payments": []},
        }

        # get/create payments for each semester and check installment limits
        for semester_data in semesters.values():
            for month in semester_data["months"]:
                payment, created = Payment.objects.get_or_create(
                    student=student, year=year, month=month,
                    defaults={"amount_paid": 0}
                )
                
                # Add flag for installment limit reached
                payment.installment_limit_reached = (
                    payment.current_installment >= payment_config.max_installments 
                    and not payment.paid 
                    and payment.amount_paid > 0
                )
                
                semester_data["payments"].append(payment)

        context["semesters"] = semesters

        # calculate totals
        all_payments = sum([sem["payments"] for sem in semesters.values()], [])
        context.update({
            "total_due": payment_config.monthly_fee * len(all_payments),
            "total_paid": sum(p.amount_paid for p in all_payments),
        })
        context["total_remaining"] = context["total_due"] - context["total_paid"]

        # payment list URL
        context["payment_list_url"] = self.request.session.get("payment_list_url") or reverse("payments:payment_list")

        return context


@method_decorator(csrf_exempt, name="dispatch")
class UpdatePaymentView(LoginRequiredMixin, View):
    def post(self, request, payment_id):
        payment = get_object_or_404(Payment, id=payment_id)
        try:
            raw = request.POST.get("amount_paid", "0").strip()
            is_installment = request.POST.get("is_installment") == "true"
            auto_convert_to_installment = request.POST.get("auto_convert_to_installment") == "true"
            
            try:
                amount_paid = Decimal(raw)
            except InvalidOperation:
                return JsonResponse(
                    {"success": False, "message": f"Invalid amount: {raw}"}, status=400
                )

            old_amount = payment.amount_paid
            config = PaymentConfig.get_active(payment.year)
            
            # Handle auto-conversion to installment if payment is less than monthly fee
            if auto_convert_to_installment and amount_paid < config.monthly_fee and amount_paid > 0:
                is_installment = True
            
            # For installment payments, check if we're within the maximum allowed installments
            installment_count = int(request.POST.get("installment_count", "1"))
            if is_installment and installment_count > config.max_installments:
                return JsonResponse(
                    {"success": False, 
                     "message": f"Maximum number of installments ({config.max_installments}) reached for this payment period."},
                    status=400
                )

            # Validate individual installment amounts for installment payments
            if is_installment and amount_paid > 0:
                total_installment_amount = Decimal('0')
                for i in range(1, installment_count + 1):
                    key = f"installment_{i}"
                    if key in request.POST:
                        try:
                            inst_amount = Decimal(request.POST.get(key, '0'))
                            if inst_amount > 0 and inst_amount < config.minimum_payment_amount:
                                return JsonResponse(
                                    {"success": False, 
                                     "message": f"Each installment must be at least Rp {config.minimum_payment_amount:,.0f}."},
                                    status=400
                                )
                            total_installment_amount += inst_amount
                        except InvalidOperation:
                            continue
                
                # Validate that the total installment amount matches the total amount paid
                if abs(total_installment_amount - amount_paid) > Decimal('0.01'):
                    return JsonResponse(
                        {"success": False, 
                         "message": "Total installment amounts must equal the total amount paid."},
                        status=400
                    )
            
            # For non-installment payments, validate minimum amount
            elif not is_installment and amount_paid > 0 and amount_paid < config.minimum_payment_amount and amount_paid < config.monthly_fee:
                return JsonResponse(
                    {"success": False, 
                     "message": f"Payment amount must be at least Rp {config.minimum_payment_amount:,.0f} or the full monthly fee of Rp {config.monthly_fee:,.0f}."},
                    status=400
                )

            # Set the payment amount and date
            payment.amount_paid = amount_paid
            payment.payment_date = timezone.now() if amount_paid > 0 else None
            
            # Explicitly manage installment fields
            if is_installment:
                payment.is_installment = True
                payment.current_installment = installment_count
            elif amount_paid == 0:
                # Only reset installment status if the payment is being reset to zero
                payment.is_installment = False
                payment.current_installment = 0
            # If not installment but amount > 0, it's a full/partial payment
            elif amount_paid > 0:
                payment.is_installment = False
                payment.current_installment = 0
            
            # Store individual installment records when handling installment payments
            installment_details = {}
            if is_installment and amount_paid > 0:
                # Clear existing installments first
                payment.installments.all().delete()
                
                # Process each installment from the form
                for i in range(1, installment_count + 1):
                    key = f"installment_{i}"
                    if key in request.POST:
                        # Get the installment amount
                        try:
                            inst_amount = Decimal(request.POST.get(key))
                        except InvalidOperation:
                            inst_amount = Decimal('0')
                        
                        # If there's an amount, create installment record
                        if inst_amount > 0:
                            PaymentInstallment.objects.create(
                                payment=payment,
                                installment_number=i,
                                amount=inst_amount
                            )
                            installment_details[key] = str(inst_amount)
            elif not is_installment:
                # Clear installment data for non-installment payments
                payment.installments.all().delete()
                if f"payment_{payment_id}_installment_data" in request.session:
                    del request.session[f"payment_{payment_id}_installment_data"]
            
            # Save with skip_auto_installment flag to prevent the model from overriding our installment management
            payment.save(skip_auto_installment=True)

            # Add a message to the session
            if amount_paid > old_amount:
                if payment.is_installment:
                    if payment.paid:
                        messages.success(
                            request,
                            f"Final installment for {payment.student.name} completed. Full payment of Rp {amount_paid:,.0f} received via {payment.current_installment} installments.",
                        )
                    else:
                        if auto_convert_to_installment:
                            messages.info(
                                request,
                                f"Payment for {payment.student.name} (Rp {amount_paid:,.0f}) was automatically converted to installment payment as it's less than the monthly fee.",
                            )
                        else:
                            messages.success(
                                request,
                                f"Installment {payment.current_installment}/{config.max_installments} for {payment.student.name} recorded: Rp {amount_paid:,.0f}.",
                            )
                else:
                    messages.success(
                        request,
                        f"Payment for {payment.student.name} updated to Rp {amount_paid:,.0f}.",
                    )
            elif amount_paid < old_amount:
                messages.info(
                    request,
                    f"Payment for {payment.student.name} reduced to Rp {amount_paid:,.0f}.",
                )

            # Get all installment records for this payment to return to the frontend
            installment_records = []
            if is_installment:
                for inst in payment.installments.all().order_by("installment_number"):
                    # Convert to Jakarta timezone (Asia/Jakarta)
                    jakarta_time = timezone.localtime(inst.payment_date, pytz.timezone('Asia/Jakarta'))
                    installment_records.append({
                        "number": inst.installment_number,
                        "amount": float(inst.amount),
                        "date": jakarta_time.strftime("%d %b %Y"),  # Format as day month year without time
                    })

            return JsonResponse(
                {
                    "success": True,
                    "paid": payment.paid,
                    "is_installment": payment.is_installment,
                    "remaining_amount": float(payment.remaining_amount),
                    "current_installment": payment.current_installment,
                    "installment_details": installment_details,
                    "installment_records": installment_records,
                    "auto_converted_to_installment": auto_convert_to_installment,
                    "message": f"Payment updated for {payment.student.name}",
                }
            )
        except Exception as e:
            return JsonResponse({"success": False, "message": str(e)}, status=400)


class TogglePaymentView(View):
    def post(self, request, student_id, month, year):
        student = get_object_or_404(Student, id=student_id)
        payment = Payment.objects.get(student=student, year=year, month=month)
        previous_state = payment.paid
        payment.paid = not payment.paid

        # if marked as paid, set amount to full fee
        if payment.paid:
            config = PaymentConfig.get_active()
            payment.amount_paid = config.monthly_fee
            payment.remaining_amount = 0
            payment.payment_date = timezone.now()
            # Reset installment information when fully paid
            payment.is_installment = False
            payment.current_installment = 0
            messages.success(
                request,
                f"Payment for {student.name} for {calendar.month_name[month]} {year} marked as paid.",
            )
        else:
            payment.amount_paid = 0
            payment.remaining_amount = PaymentConfig.get_active().monthly_fee
            payment.payment_date = None
            # Reset installment information when marked as unpaid
            payment.is_installment = False
            payment.current_installment = 0
            messages.info(
                request,
                f"Payment for {student.name} for {calendar.month_name[month]} {year} marked as unpaid.",
            )

        payment.save()

        # Redirect to the referring page
        return redirect(
            request.META.get("HTTP_REFERER", reverse("payments:payment_list"))
        )


@method_decorator(csrf_exempt, name="dispatch")
class GetInstallmentDataView(LoginRequiredMixin, View):
    def get(self, request, payment_id):
        payment = get_object_or_404(Payment, id=payment_id)
        
        # Check if we have installment data in the session
        session_key = f"payment_{payment_id}_installment_data"
        installment_details = request.session.get(session_key, {})
        
        # Get actual installment records from database
        installment_records = []
        for installment in payment.installments.all().order_by('installment_number'):
            # Convert to Jakarta timezone (Asia/Jakarta)
            jakarta_time = timezone.localtime(installment.payment_date, pytz.timezone('Asia/Jakarta'))
            installment_records.append({
                "number": installment.installment_number,
                "amount": float(installment.amount),
                "date": jakarta_time.strftime("%d %b %Y"),  # Format as day month year without time
            })
        
        # If no installment data in session and this is an installment payment,
        # create a default set of equal installments for the input fields
        if not installment_details and payment.is_installment and payment.current_installment > 0:
            if installment_records:
                # If we have actual records, use those values
                for installment in installment_records:
                    installment_details[f"installment_{installment['number']}"] = str(installment['amount'])
            else:
                # Otherwise create equal installments for display purposes
                average_amount = payment.amount_paid / payment.current_installment
                for i in range(1, payment.current_installment + 1):
                    installment_details[f"installment_{i}"] = str(average_amount)
                
        return JsonResponse({
            "success": True, 
            "installment_details": installment_details,
            "installment_records": installment_records,
        })
