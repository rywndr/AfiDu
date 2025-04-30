from django.urls import path

from . import views

app_name = "payments"

urlpatterns = [
    path("", views.PaymentListView.as_view(), name="payment_list"),
    path("config/", views.PaymentConfigView.as_view(), name="payment_config"),
    path(
        "student/<int:pk>/",
        views.StudentPaymentDetailView.as_view(),
        name="payment_detail",
    ),
    path(
        "update/<int:payment_id>/",
        views.UpdatePaymentView.as_view(),
        name="update_payment",
    ),
    path(
        "toggle/<int:student_id>/<int:month>/<int:year>/",
        views.TogglePaymentView.as_view(),
        name="toggle-payment",
    ),
    path(
        "get-installment-data/<int:payment_id>/",
        views.GetInstallmentDataView.as_view(),
        name="get-installment-data",
    ),
]
