import calendar
import datetime
from decimal import Decimal, InvalidOperation
from urllib.parse import urlencode

import pytz
from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse, reverse_lazy
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views.generic import DetailView, ListView, UpdateView, View

from students.models import LEVELS, Student, StudentClass

from .forms import PaymentConfigForm
from .models import Payment, PaymentConfig, PaymentInstallment


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


class PaymentListView(LoginRequiredMixin, PaymentContextMixin, ListView):
    model = Student
    template_name = "payments/payment_list.html"
    context_object_name = "students"
    paginate_by = 5

    def get_paginate_by(self, queryset):
        per_page = self.request.GET.get("per_page")
        if per_page and per_page.isdigit():
            return int(per_page)
        return self.paginate_by

    def get_queryset(self):
        qs = super().get_queryset()
        # filter by search q
        q = self.request.GET.get("q")
        if q:
            qs = qs.filter(name__icontains=q)
        # filter by class
        class_filter = self.request.GET.get("class_filter")
        if class_filter:
            qs = qs.filter(assigned_class=class_filter)
        level_filter = self.request.GET.get("level_filter")
        if level_filter:
            qs = qs.filter(level=level_filter)
        return qs

    def get_year(self):
        year = self.request.GET.get("year")
        if not (year and year.isdigit()):
            return datetime.date.today().year
        return int(year)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        year = self.get_year()
        context["year"] = year

        # payment dicts untuk tiap murid - check for full or partial payments
        student_payment_status = {}
        for student in context["students"]:
            payments = Payment.objects.filter(student=student, year=year)
            # consider a payment as made when amount_paid is greater than 0
            has_payments = payments.filter(amount_paid__gt=0).exists()
            student_payment_status[student.id] = has_payments

        context["student_payment_status"] = student_payment_status

        # persist filter params
        context["current_per_page"] = self.request.GET.get(
            "per_page", str(self.paginate_by)
        )
        return context

    def get(self, request, *args, **kwargs):
        # Check if URL parameters are present, if not, use session values if available
        if not any(
            key in request.GET
            for key in ["q", "class_filter", "level_filter", "year", "per_page"]
        ) and any(
            key in request.session
            for key in [
                "payments_q",
                "payments_class_filter",
                "payments_level_filter",
                "payments_year",
                "payments_per_page",
            ]
        ):
            # Build URL from session values
            params = {
                "q": request.session.get("payments_q", ""),
                "class_filter": request.session.get("payments_class_filter", ""),
                "level_filter": request.session.get("payments_level_filter", ""),
                "year": request.session.get(
                    "payments_year", str(datetime.date.today().year)
                ),
                "per_page": request.session.get(
                    "payments_per_page", str(self.paginate_by)
                ),
            }
            # Remove empty params
            params = {k: v for k, v in params.items() if v}
            # Redirect to the filtered URL
            return redirect(f"{request.path}?{urlencode(params)}")

        # Store filter parameters in session
        if "q" in request.GET:
            request.session["payments_q"] = request.GET.get("q", "")
        if "class_filter" in request.GET:
            request.session["payments_class_filter"] = request.GET.get(
                "class_filter", ""
            )
        if "level_filter" in request.GET:
            request.session["payments_level_filter"] = request.GET.get(
                "level_filter", ""
            )
        if "year" in request.GET:
            request.session["payments_year"] = request.GET.get(
                "year", str(datetime.date.today().year)
            )
        if "per_page" in request.GET:
            request.session["payments_per_page"] = request.GET.get(
                "per_page", str(self.paginate_by)
            )

        # Store current URL with all filters in session
        self.request.session["payment_list_url"] = self.request.get_full_path()

        if "anchor_redirected" not in request.GET:
            query_params = request.GET.copy()
            query_params["anchor_redirected"] = "true"
            redirect_url = f"{request.path}?{query_params.urlencode()}#payment-table"
            return redirect(redirect_url)
        return super().get(request, *args, **kwargs)


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
        context["year"] = year
        student = self.get_object()

        # get payment config
        payment_config = PaymentConfig.get_active(year)
        context["payment_config"] = payment_config

        # default payment list URL if session URL is not available
        context["payment_list_url"] = reverse("payments:payment_list")
        if year:
            context["payment_list_url"] += f"?year={year}"

        # sem data
        mid_sem_months = list(
            range(
                payment_config.mid_semester_start, payment_config.mid_semester_end + 1
            )
        )
        final_sem_months = list(
            range(
                payment_config.final_semester_start,
                payment_config.final_semester_end + 1,
            )
        )

        # sem data structure
        semesters = {
            "mid": {"name": "Mid Semester", "months": mid_sem_months, "payments": []},
            "final": {
                "name": "Final Semester",
                "months": final_sem_months,
                "payments": [],
            },
        }

        # get / create payments for each sem
        for semester_key, semester_data in semesters.items():
            for month in semester_data["months"]:
                payment, created = Payment.objects.get_or_create(
                    student=student,
                    year=year,
                    month=month,
                    defaults={
                        "amount_paid": 0,
                    },
                )
                if not created:
                    payment.save(
                        update_fields=["remaining_amount", "is_installment", "paid"]
                    )
                semester_data["payments"].append(payment)

        context["semesters"] = semesters

        # calc totals
        context["total_due"] = payment_config.monthly_fee * (
            len(mid_sem_months) + len(final_sem_months)
        )
        context["total_paid"] = sum(
            p.amount_paid
            for p in semesters["mid"]["payments"] + semesters["final"]["payments"]
        )
        context["total_remaining"] = context["total_due"] - context["total_paid"]

        payment_list_url = self.request.session.get("payment_list_url")
        if not payment_list_url:
            # Reconstruct URL from session parameters
            params = {
                "q": self.request.session.get("payments_q", ""),
                "class_filter": self.request.session.get("payments_class_filter", ""),
                "level_filter": self.request.session.get("payments_level_filter", ""),
                "year": self.request.session.get("payments_year", str(year)),
                "per_page": self.request.session.get("payments_per_page", "5"),
            }
            # Remove empty params
            params = {k: v for k, v in params.items() if v}
            # Build query string
            query_string = "&".join([f"{k}={v}" for k, v in params.items()])
            payment_list_url = f"{reverse('payments:payment_list')}?{query_string}"

        context["payment_list_url"] = payment_list_url

        return context


@method_decorator(csrf_exempt, name="dispatch")
class UpdatePaymentView(LoginRequiredMixin, View):
    def post(self, request, payment_id):
        payment = get_object_or_404(Payment, id=payment_id)
        try:
            raw = request.POST.get("amount_paid", "0").strip()
            is_installment = request.POST.get("is_installment") == "true"
            
            try:
                amount_paid = Decimal(raw)
            except InvalidOperation:
                return JsonResponse(
                    {"success": False, "message": f"Invalid amount: {raw}"}, status=400
                )

            old_amount = payment.amount_paid
            config = PaymentConfig.get_active(payment.year)
            
            # For installment payments, check if we're within the maximum allowed installments
            installment_count = int(request.POST.get("installment_count", "1"))
            if is_installment and installment_count > config.max_installments:
                return JsonResponse(
                    {"success": False, 
                     "message": f"Maximum number of installments ({config.max_installments}) reached for this payment period."},
                    status=400
                )

            # Set the payment amount and date
            payment.amount_paid = amount_paid
            payment.payment_date = timezone.now() if amount_paid > 0 else None
            
            # Store individual installment records when handling installment payments
            installment_details = {}
            if is_installment and amount_paid > 0:
                # Get the existing installments to determine what's new
                existing_installments = {
                    i.installment_number: i 
                    for i in payment.installments.all()
                }
                
                # Process each installment from the form
                for i in range(1, installment_count + 1):
                    key = f"installment_{i}"
                    if key in request.POST:
                        # Get the installment amount
                        try:
                            inst_amount = Decimal(request.POST.get(key))
                        except InvalidOperation:
                            inst_amount = Decimal('0')
                        
                        # If there's an amount, create or update the installment record
                        if inst_amount > 0:
                            if i in existing_installments:
                                # Update existing installment amount if it changed
                                installment = existing_installments[i]
                                if installment.amount != inst_amount:
                                    installment.amount = inst_amount
                                    installment.save()
                            else:
                                # Create new installment record
                                installment = PaymentInstallment.objects.create(
                                    payment=payment,
                                    installment_number=i,
                                    amount=inst_amount
                                )
                            
                            installment_details[key] = str(inst_amount)
                
                # Remove any installments that no longer exist
                payment.installments.filter(installment_number__gt=installment_count).delete()
            
            # Important: Set installment flag based on user's choice, not just on amount
            if is_installment:
                payment.is_installment = True
                payment.current_installment = installment_count
            elif amount_paid == 0:
                # Only reset installment status if the payment is being reset to zero
                payment.is_installment = False
                payment.current_installment = 0
                # Clear installment data
                payment.installments.all().delete()
                if f"payment_{payment_id}_installment_data" in request.session:
                    del request.session[f"payment_{payment_id}_installment_data"]
            
            # Paid status still depends on whether the full amount is paid
            # But we no longer affect is_installment when amount_paid reaches the full fee
            payment.save()

            # Add a message to the session
            if amount_paid > old_amount:
                if payment.is_installment:
                    if payment.paid:
                        messages.success(
                            request,
                            f"Final installment for {payment.student.name} completed. Full payment of {amount_paid} received via {payment.current_installment} installments.",
                        )
                    else:
                        messages.success(
                            request,
                            f"Installment {payment.current_installment}/{config.max_installments} for {payment.student.name} recorded: {amount_paid}.",
                        )
                else:
                    messages.success(
                        request,
                        f"Payment for {payment.student.name} updated to {amount_paid}.",
                    )
            elif amount_paid < old_amount:
                messages.info(
                    request,
                    f"Payment for {payment.student.name} reduced to {amount_paid}.",
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
