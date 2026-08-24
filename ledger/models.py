from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal


class Customer(models.Model):
    """Customer model for shop ledger."""
    shop = models.ForeignKey(User, on_delete=models.CASCADE, related_name='customers')
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, blank=True, null=True)
    total_balance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['shop', 'created_at']),
            models.Index(fields=['shop', '-created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.phone or 'No Phone'})"


class Transaction(models.Model):
    """Transaction model for ledger entries."""
    TRANSACTION_TYPES = [
        ('CREDIT', 'Credit'),
        ('DEBIT', 'Debit'),
        ('SALE', 'Sale'),
    ]

    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='transactions', null=True, blank=True)
    product_name = models.CharField(max_length=255, blank=True)
    type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True)
    date_created = models.DateTimeField(auto_now_add=True)
    date_updated = models.DateTimeField(auto_now=True)
    entered_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='transactions')

    class Meta:
        indexes = [
            models.Index(fields=['customer_id', 'date_created']),
            models.Index(fields=['date_created']),
            models.Index(fields=['customer_id', '-date_created']),
        ]
        ordering = ['-date_created']

    def __str__(self):
        subject = self.product_name or (self.customer.name if self.customer else 'Unassigned')
        return f"{subject} - {self.type}: {self.amount} ({self.date_created})"
