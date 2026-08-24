from django.contrib import admin
from .models import Customer, Transaction


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
    list_display = ('id', 'customer', 'product_name', 'type', 'amount', 'date_created', 'entered_by')
    list_filter = ('type', 'date_created', 'customer__shop')
    search_fields = ('customer__name', 'product_name', 'description')
    readonly_fields = ('date_created', 'date_updated')
    fieldsets = (
        ('Transaction Details', {
            'fields': ('customer', 'product_name', 'type', 'amount', 'description')
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
