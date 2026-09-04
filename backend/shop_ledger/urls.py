"""
URL configuration for shop_ledger project.
"""
from django.contrib import admin
from django.contrib.auth.decorators import login_required
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('ledger.urls')),
    path('', login_required(
        TemplateView.as_view(template_name='index.html'),
        login_url='/login/',
    ), name='home'),
    path('login/', TemplateView.as_view(template_name='auth.html'), name='login-page'),
    path('register/', TemplateView.as_view(template_name='auth.html'), name='register-page'),
    path('sw.js', serve, {'path': 'sw.js', 'document_root': settings.PROJECT_ROOT / 'frontend' / 'static'}),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
