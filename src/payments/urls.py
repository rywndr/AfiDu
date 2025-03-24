from django.urls import path

from .views import PaymentListView, TogglePaymentView

app_name = "payments"

urlpatterns = [
    path("", PaymentListView.as_view(), name="payment_list"),
    path(
        "toggle/<int:student_id>/<int:month>/<int:year>/",
        TogglePaymentView.as_view(),
        name="toggle-payment",
    ),
]
