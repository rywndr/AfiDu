from django.urls import path

from .views import ScoreListView

app_name = "scores"

urlpatterns = [
    path("", ScoreListView.as_view(), name="score-list"),
]
