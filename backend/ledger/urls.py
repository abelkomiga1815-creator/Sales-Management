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
    path('auth/register/', views.register, name='register'),
    path('auth/login/', views.login_user, name='login'),
    path('auth/logout/', views.logout_user, name='logout'),
    path('auth/me/', views.current_user, name='current-user'),
    path('auth/forgot-password/', views.request_password_reset, name='request-password-reset'),
    path('auth/verify-otp/', views.verify_password_otp, name='verify-otp'),
    path('auth/reset-password/', views.complete_password_reset, name='complete-password-reset'),
    path('preferences/', views.user_preferences, name='user-preferences'),
    path('backup/google/start/', views.google_backup_start, name='google-backup-start'),
    path('backup/google/callback/', views.google_backup_callback, name='google-backup-callback'),
    path('transactions/create/', views.create_transaction, name='create-transaction'),
    path('debts/<int:debt_id>/payments/', views.debt_payments, name='debt-payments'),
    path('debts/pay/', views.create_debt_payment, name='create-debt-payment'),
    path('purchases/', views.purchase_list, name='purchase-list'),
    path('purchases/create/', views.create_purchase, name='create-purchase'),
    path('purchases/<int:purchase_id>/', views.purchase_detail, name='purchase-detail'),
    path('purchases/<int:purchase_id>/delete/', views.purchase_delete, name='purchase-delete'),
    path('', include(router.urls)),
    path('customers/<int:customer_id>/history/', views.customer_history, name='customer-history'),
    path('daily-summary/', views.daily_summary, name='daily-summary'),
    path('activity-report/', views.activity_report, name='activity-report'),
]
