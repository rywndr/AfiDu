from django.urls import path

from . import views

app_name = "scores"

urlpatterns = [
    path("", views.score_list, name="score-list"),
]
