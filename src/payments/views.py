import calendar
import datetime
from decimal import Decimal, InvalidOperation

from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse_lazy
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views.generic import DetailView, ListView, UpdateView, View

from students.models import LEVELS, Student, StudentClass

from .forms import PaymentConfigForm
from .models import Payment, PaymentConfig


class PaymentContextMixin:
    def get_payment_context(self):
        # set jarak tahun untuk filter dan data bulan
        months = list(range(1, 13))
        return {
            "available_classes": StudentClass.objects.all(),
            "level_choices": LEVELS,
            "years": list(range(2025, 2033)),
            "months": months,
            "month_names": {i: calendar.month_abbr[i] for i in months},
            "active_tab_title": "Payments",
            "active_tab_icon": "fa-money-bill-wave",
            "payment_config": PaymentConfig.get_active(),
        }

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)  # <-- use parent's context
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

        # payment dicts untuk tiap murid - only check if any payments exist
        student_payment_status = {}
        for student in context["students"]:
            payments = Payment.objects.filter(student=student, year=year)
            has_payments = payments.filter(paid=True).exists()
            student_payment_status[student.id] = has_payments

        context["student_payment_status"] = student_payment_status

        # persist filter params
        context["current_per_page"] = self.request.GET.get(
            "per_page", str(self.paginate_by)
        )
        return context

    def get(self, request, *args, **kwargs):
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
        return PaymentConfig.get_active()

    def form_valid(self, form):
        messages.success(self.request, "Payment configuration updated successfully!")
        return super().form_valid(form)


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
        payment_config = PaymentConfig.get_active()
        context["payment_config"] = payment_config

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

        return context


@method_decorator(csrf_exempt, name="dispatch")
class UpdatePaymentView(LoginRequiredMixin, View):
    def post(self, request, payment_id):
        payment = get_object_or_404(Payment, id=payment_id)
        try:
            raw = request.POST.get("amount_paid", "0").strip()
            try:
                amount_paid = Decimal(raw)
            except InvalidOperation:
                return JsonResponse(
                    {"success": False, "message": f"Invalid amount: {raw}"}, status=400
                )

            payment.amount_paid = amount_paid
            payment.payment_date = timezone.now() if amount_paid > 0 else None
            payment.save()

            return JsonResponse(
                {
                    "success": True,
                    "paid": payment.paid,
                    "is_installment": payment.is_installment,
                    "remaining_amount": float(payment.remaining_amount),
                }
            )
        except Exception as e:
            return JsonResponse({"success": False, "message": str(e)}, status=400)


class TogglePaymentView(View):
    def post(self, request, student_id, month, year):
        student = get_object_or_404(Student, id=student_id)
        payment = Payment.objects.get(student=student, year=year, month=month)
        payment.paid = not payment.paid

        # if marked as paid, set amount to full fee
        if payment.paid:
            config = PaymentConfig.get_active()
            payment.amount_paid = config.monthly_fee
            payment.remaining_amount = 0
            payment.payment_date = timezone.now()
        else:
            payment.amount_paid = 0
            payment.remaining_amount = PaymentConfig.get_active().monthly_fee
            payment.payment_date = None

        payment.save()
        # redirect ke halaman sebelumnya/fallback ke payment list
        return redirect(request.META.get("HTTP_REFERER", "payments:payment_list"))
