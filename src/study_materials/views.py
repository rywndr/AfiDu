from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib import messages
from django.urls import reverse_lazy
from django.views.generic import CreateView, DeleteView, ListView, UpdateView
from django.shortcuts import redirect

from .forms import StudyMaterialForm
from .models import StudyMaterial

# Create your views here.
class StudyMaterialContextMixin:
    def get_study_material_context(self):
        return {
            "active_tab_title": "Study Materials",
            "active_tab_icon": "fa-book",
            "level_choices": StudyMaterial._meta.get_field("level").choices,
            "category_choices": StudyMaterial._meta.get_field("category").choices,
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
        
        # Get filters from request or session
        q = self.request.GET.get("q")
        category_filter = self.request.GET.get("category_filter")
        level_filter = self.request.GET.get("level_filter")
        sort_by = self.request.GET.get("sort_by")
        
        # Store filters in session if provided in request
        if q is not None:
            self.request.session["materials_search_query"] = q
        elif "materials_search_query" in self.request.session:
            q = self.request.session["materials_search_query"]
            
        if category_filter is not None:
            self.request.session["materials_category_filter"] = category_filter
        elif "materials_category_filter" in self.request.session:
            category_filter = self.request.session["materials_category_filter"]
            
        if level_filter is not None:
            self.request.session["materials_level_filter"] = level_filter
        elif "materials_level_filter" in self.request.session:
            level_filter = self.request.session["materials_level_filter"]
            
        if sort_by is not None:
            self.request.session["materials_sort_by"] = sort_by
        elif "materials_sort_by" in self.request.session:
            sort_by = self.request.session["materials_sort_by"]
        
        # Apply filters
        if q:
            queryset = queryset.filter(title__icontains=q)
        if category_filter:
            queryset = queryset.filter(category=category_filter)
        if level_filter:
            queryset = queryset.filter(level=level_filter)
            
        # Apply sorting
        if sort_by == "title_asc":
            queryset = queryset.order_by("title")
        elif sort_by == "title_desc":
            queryset = queryset.order_by("-title")
            
        return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Get search/filter values from request or session
        q = self.request.GET.get("q", self.request.session.get("materials_search_query", ""))
        category_filter = self.request.GET.get("category_filter", self.request.session.get("materials_category_filter", ""))
        level_filter = self.request.GET.get("level_filter", self.request.session.get("materials_level_filter", ""))
        sort_by = self.request.GET.get("sort_by", self.request.session.get("materials_sort_by", ""))
        
        # Get categories and levels that exist in database
        categories = StudyMaterial.objects.values_list("category", flat=True).distinct()
        levels = StudyMaterial.objects.values_list("level", flat=True).distinct()
        
        context["categories"] = categories
        context["levels"] = levels
        context["q"] = q
        context["category_filter"] = category_filter
        context["level_filter"] = level_filter
        context["current_sort_by"] = sort_by
        return context

class StudyMaterialCreateView(LoginRequiredMixin, StudyMaterialContextMixin, CreateView):
    model = StudyMaterial
    form_class = StudyMaterialForm
    template_name = "study_materials/upload.html"
    success_url = reverse_lazy("study_materials:list")

    def form_valid(self, form):
        form.instance.uploaded_by = self.request.user
        messages.success(self.request, "Study material uploaded successfully.")
        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, "Failed to upload study material. Please check the form and try again.")
        return super().form_invalid(form)

class StudyMaterialUpdateView(LoginRequiredMixin, StudyMaterialContextMixin, UpdateView):
    model = StudyMaterial
    form_class = StudyMaterialForm
    template_name = "study_materials/edit.html"
    success_url = reverse_lazy("study_materials:list")

    def get_form(self, form_class=None):
        form = super().get_form(form_class)
        # rm the file field requirement for editing
        form.fields['file'].required = False
        form.fields['file'].help_text = "Leave empty to keep current file. Upload a new file to replace it."
        return form

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