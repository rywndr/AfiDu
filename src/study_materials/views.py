from django.urls import reverse_lazy
from django.views.generic import CreateView, DeleteView, ListView, UpdateView

from .forms import StudyMaterialForm
from .models import StudyMaterial


# Create your views here.
class StudyMaterialListView(ListView):
    model = StudyMaterial
    template_name = "study_materials/list.html"
    context_object_name = "materials"


class StudyMaterialCreateView(CreateView):
    model = StudyMaterial
    form_class = StudyMaterialForm
    template_name = "study_materials/upload.html"
    success_url = reverse_lazy("study_materials:list")

    def form_valid(self, form):
        # set user yang ter log in sebagai uploader
        form.instance.uploaded_by = self.request.user
        return super().form_valid(form)


class StudyMaterialUpdateView(UpdateView):
    model = StudyMaterial
    fields = ["title", "category"]
    template_name = "study_materials/edit.html"
    success_url = reverse_lazy("study_materials:list")


class StudyMaterialDeleteView(DeleteView):
    model = StudyMaterial
    template_name = "study_materials/confirm_delete.html"
    success_url = reverse_lazy("study_materials:list")
