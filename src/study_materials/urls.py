from django.urls import path

from .views import (
    StudyMaterialCreateView,
    StudyMaterialDeleteView,
    StudyMaterialListView,
    StudyMaterialUpdateView,
)

app_name = "study_materials"

urlpatterns = [
    path("", StudyMaterialListView.as_view(), name="list"),
    path("upload/", StudyMaterialCreateView.as_view(), name="upload"),
    path("edit/<int:pk>/", StudyMaterialUpdateView.as_view(), name="edit"),
    path("delete/<int:pk>/", StudyMaterialDeleteView.as_view(), name="delete"),
]
