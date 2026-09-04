from django.contrib import admin
from .models import Customer, Transaction, DebtPayment, PasswordResetOTP, UserPreference, Purchase, PurchaseItem


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'shop', 'total_balance', 'created_at')
    list_filter = ('shop', 'created_at')
    search_fields = ('name', 'phone')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Shop Info', {
            'fields': ('shop',)
        }),
        ('Customer Details', {
            'fields': ('name', 'phone', 'total_balance')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'borrower_name', 'product_name', 'type', 'amount', 'date_created', 'entered_by')
    list_filter = ('type', 'date_created', 'customer__shop')
    search_fields = ('customer__name', 'borrower_name', 'product_name', 'description')
    readonly_fields = ('date_created', 'date_updated')
    fieldsets = (
        ('Transaction Details', {
            'fields': ('customer', 'borrower_name', 'product_name', 'type', 'amount', 'description')
        }),
        ('User Info', {
            'fields': ('entered_by',)
        }),
        ('Timestamps', {
            'fields': ('date_created', 'date_updated'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.entered_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(DebtPayment)
class DebtPaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'debt', 'amount', 'date_created', 'recorded_by')
    list_filter = ('date_created', 'recorded_by')
    search_fields = ('debt__borrower_name', 'description')
    readonly_fields = ('date_created',)


@admin.register(PasswordResetOTP)
class PasswordResetOTPAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_used', 'attempts', 'created_at', 'expires_at')
    list_filter = ('is_used', 'created_at')
    readonly_fields = ('otp_hash', 'created_at')


@admin.register(UserPreference)
class UserPreferenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'language', 'updated_at')
    list_filter = ('language',)


class PurchaseItemInline(admin.TabularInline):
    model = PurchaseItem
    extra = 0
    readonly_fields = ('total_amount',)


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ('id', 'owner', 'purchase_date', 'total_amount', 'created_at')
    list_filter = ('owner', 'purchase_date')
    search_fields = ('description', 'items__product_name')
    readonly_fields = ('total_amount', 'created_at', 'updated_at')
    inlines = [PurchaseItemInline]

    def save_formset(self, request, form, formset, change):
        super().save_formset(request, form, formset, change)
        instance = form.instance
        instance.recalculate_total()


@admin.register(PurchaseItem)
class PurchaseItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'purchase', 'product_name', 'quantity', 'unit_purchase_price', 'total_amount')
    list_filter = ('purchase__owner',)
