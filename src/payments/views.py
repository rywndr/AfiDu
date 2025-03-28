import calendar
import datetime

from django.shortcuts import get_object_or_404, redirect
from django.views.generic import ListView, View
from django.contrib.auth.mixins import LoginRequiredMixin

from students.models import Student, StudentClass
from .models import Payment

# Create your views here.
class PaymentContextMixin:
    def get_payment_context(self):
        # set jarak tahun untuk filter dan data bulan
        months = list(range(1, 13))
        return {
            "available_classes": StudentClass.objects.all(),
            "years": list(range(2025, 2033)),
            "months": months,
            "month_names": {i: calendar.month_abbr[i] for i in months},
            "active_tab_title": "Payments",
            "active_tab_icon": "fa-money-bill-wave",
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

        # payment dicts untuk tiap murid
        student_payments = {}
        for student in context["students"]:
            monthly_payments = {}
            for month in range(1, 13):
                payment, _ = Payment.objects.get_or_create(
                    student=student, year=year, month=month
                )
                monthly_payments[month] = payment
            student_payments[student.id] = monthly_payments
        context["student_payments"] = student_payments

        # persist filter params
        context["current_per_page"] = self.request.GET.get("per_page", str(self.paginate_by))
        return context
    
    def get(self, request, *args, **kwargs):
        if "anchor_redirected" not in request.GET:
            query_params = request.GET.copy()
            query_params["anchor_redirected"] = "true"
            redirect_url = f"{request.path}?{query_params.urlencode()}#payment-table"
            return redirect(redirect_url)
        return super().get(request, *args, **kwargs)

class TogglePaymentView(View):
    def post(self, request, student_id, month, year):
        student = get_object_or_404(Student, id=student_id)
        payment = Payment.objects.get(student=student, year=year, month=month)
        payment.paid = not payment.paid
        payment.save()
        # redirect ke halaman sebelumnya/fallback ke payment list
        return redirect(request.META.get("HTTP_REFERER", "payments:payment_list"))