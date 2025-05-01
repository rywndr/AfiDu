from django.urls import path
from .views import (
    DocumentListView,
    StudentRegistrationFormView,
    StudentPaymentCardView,
    StudentListDocumentView,
    PaymentReportConfigView,
    PaymentReportDownloadView,
    StudentSummaryConfigView,
    StudentSummaryDownloadView,
)

app_name = 'documents'

urlpatterns = [
    path('', DocumentListView.as_view(), name='document_list'),
    path('registration-form/', StudentRegistrationFormView.as_view(), name='registration_form'),
    path('payment-card/', StudentPaymentCardView.as_view(), name='payment_card'),
    path('student-list/', StudentListDocumentView.as_view(), name='student_list'),
    path('payment-report/config/', PaymentReportConfigView.as_view(), name='payment_report_config'),
    path('payment-report/download/', PaymentReportDownloadView.as_view(), name='payment_report_download'),
    path('student-summary/config/', StudentSummaryConfigView.as_view(), name='student_summary_config'),
    path('student-summary/download/', StudentSummaryDownloadView.as_view(), name='student_summary_download'),
]