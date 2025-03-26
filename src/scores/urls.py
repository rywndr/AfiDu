from django.urls import path

from .views import ScoreListView, ScoreConfigView

app_name = "scores"

urlpatterns = [
    path("", ScoreListView.as_view(), name="score-list"),
    path("config/", ScoreConfigView.as_view(), name="score-config"),
]
