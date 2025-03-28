from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib import messages
from django.urls import reverse_lazy
from django.views.generic import CreateView, DeleteView, ListView, UpdateView

from .forms import StudyMaterialForm
from .models import StudyMaterial

# Create your views here.
class StudyMaterialContextMixin:
    def get_study_material_context(self):
        return {
            "active_tab_title": "Study Materials",
            "active_tab_icon": "fa-book-open",
        }
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update(self.get_study_material_context())
        return context

class StudyMaterialListView(LoginRequiredMixin, StudyMaterialContextMixin, ListView):
    model = StudyMaterial
    template_name = "study_materials/list.html"
    context_object_name = "materials"

    def get_queryset(self):
        queryset = super().get_queryset()
        q = self.request.GET.get("q", "")
        category_filter = self.request.GET.get("category_filter", "")
        if q:
            queryset = queryset.filter(title__icontains=q)
        if category_filter:
            queryset = queryset.filter(category=category_filter)
        return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # ambil kategori yang ada di database
        categories = StudyMaterial.objects.values_list("category", flat=True).distinct()
        context["categories"] = categories
        context["q"] = self.request.GET.get("q", "")
        context["category_filter"] = self.request.GET.get("category_filter", "")
        return context

class StudyMaterialCreateView(LoginRequiredMixin, StudyMaterialContextMixin, CreateView):
    model = StudyMaterial
    form_class = StudyMaterialForm
    template_name = "study_materials/upload.html"
    success_url = reverse_lazy("study_materials:list")

    def form_valid(self, form):
        # set user yang ter log in sebagai uploader
        form.instance.uploaded_by = self.request.user
        messages.success(self.request, "Study material uploaded successfully.")
        return super().form_valid(form)
    
    def form_invalid(self, form):
        messages.error(self.request, "Failed to upload study material.")
        return super().form_invalid(form)

class StudyMaterialUpdateView(LoginRequiredMixin, StudyMaterialContextMixin, UpdateView):
    model = StudyMaterial
    fields = ["title", "category"]
    template_name = "study_materials/edit.html"
    success_url = reverse_lazy("study_materials:list")

    def form_valid(self, form):
        messages.success(self.request, "Study material updated successfully.")
        return super().form_valid(form)
    
    def form_invalid(self, form):
        messages.error(self.request, "Failed to update study material.")
        return super().form_invalid(form)

class StudyMaterialDeleteView(LoginRequiredMixin, StudyMaterialContextMixin, DeleteView):
    model = StudyMaterial
    template_name = "study_materials/confirm_delete.html"
    success_url = reverse_lazy("study_materials:list")

    def form_valid(self, form):
        messages.success(self.request, "Study material deleted successfully.")
        return super().form_valid(form)
    
    def form_invalid(self, form):
        messages.error(self.request, "Failed to delete study material.")
        return super().form_invalid(form)