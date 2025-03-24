from django.urls import path

from .views import ReportListView, ExportReportPDFView, ExportReportsZipView

app_name = "reports"

urlpatterns = [
    path("", ReportListView.as_view(), name="report-list"),
    path("export/<int:student_id>/", ExportReportPDFView.as_view(), name="export-report-pdf"),
    path('export-zip/', ExportReportsZipView.as_view(), name='export-reports-zip'),
]
