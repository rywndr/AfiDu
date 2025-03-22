from django.urls import path

from . import views

app_name = "reports"

urlpatterns = [
    path("", views.report_list, name="report-list"),
    path("export/<int:student_id>/", views.export_report_pdf, name="export-report-pdf"),
]
