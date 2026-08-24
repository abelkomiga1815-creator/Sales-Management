"""
URL configuration for ledger app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'customers', views.CustomerViewSet, basename='customer')
router.register(r'transactions', views.TransactionViewSet, basename='transaction')

urlpatterns = [
    path('transactions/create/', views.create_transaction, name='create-transaction'),
    path('', include(router.urls)),
    path('customers/<int:customer_id>/history/', views.customer_history, name='customer-history'),
    path('daily-summary/', views.daily_summary, name='daily-summary'),
    path('activity-report/', views.activity_report, name='activity-report'),
]
