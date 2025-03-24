"""
URL configuration for afidu project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.auth.views import LoginView, LogoutView
from django.urls import include, path

admin.site.site_header = "AfiDu Admin Dashboard"
admin.site.site_title = "Bimbel AfiDu Admin Panel"
admin.site.index_title = "Welcome to AfiDu Admin Dashboard"


urlpatterns = [
    path("admin/", admin.site.urls),
    # path ke login app
    path("accounts/", include("login.urls")),
    # direct path ke login page
    path("accounts/login/", LoginView.as_view(), name="login"),
    # path logout ke login page
    path("accounts/logout/", LogoutView.as_view(next_page="login"), name="logout"),
    # path ke register app
    path("register/", include("register.urls", namespace="register")),
    # path ke myprofile app
    path("profile/", include("myprofile.urls", namespace="myprofile")),
    # path ke dashboard app
    path("", include(("dashboard.urls", "dashboard"), namespace="dashboard")),
    # path ke students app
    path("students/", include(("students.urls", "students"), namespace="students")),
    # path ke scores app
    path("scores/", include(("scores.urls", "scores"), namespace="scores")),
    # path ke reports app
    path("reports/", include(("reports.urls", "reports"), namespace="reports")),
    # path ke study_materials app
    path("study-materials/", include(("study_materials.urls", "study-materials"), namespace="study-materials")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
