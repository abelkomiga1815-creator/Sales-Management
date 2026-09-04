from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal
import secrets
import hashlib


class Business(models.Model):
    """Business profile owned by one login account."""
    owner = models.OneToOneField(User, on_delete=models.CASCADE, related_name='business')
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class GoogleDriveConnection(models.Model):
    """OAuth token for the business owner's Google Drive connection."""
    business = models.OneToOneField(Business, on_delete=models.CASCADE, related_name='google_drive_connection')
    token = models.JSONField()
    connected_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


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
        ('DEBT', 'Debt'),
    ]

    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='transactions', null=True, blank=True)
    borrower_name = models.CharField(max_length=255, blank=True, default='')
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
        subject = self.borrower_name or self.product_name or (self.customer.name if self.customer else 'Unassigned')
        return f"{subject} - {self.type}: {self.amount} ({self.date_created})"

    @property
    def total_paid(self):
        """Sum of all payments made against this debt."""
        return self.payments.aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')

    @property
    def remaining_balance(self):
        """Remaining balance = original amount - total paid."""
        paid = self.total_paid
        remaining = self.amount - paid
        return max(remaining, Decimal('0.00'))

    @property
    def payment_status(self):
        """Return payment status string."""
        if self.type != 'DEBT':
            return None
        paid = self.total_paid
        if paid <= 0:
            return 'UNPAID'
        if paid >= self.amount:
            return 'PAID'
        return 'PARTIALLY_PAID'


class DebtPayment(models.Model):
    """Records individual payments made against a DEBT transaction."""
    debt = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True, default='')
    date_created = models.DateTimeField(auto_now_add=True)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='debt_payments')

    class Meta:
        ordering = ['-date_created']
        indexes = [
            models.Index(fields=['debt', 'date_created']),
        ]

    def __str__(self):
        return f"Payment {self.amount} for debt {self.debt_id} ({self.date_created})"

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.amount <= 0:
            raise ValidationError('Payment amount must be positive.')
        if self.debt_id:
            debt = Transaction.objects.get(id=self.debt_id)
            total_paid = DebtPayment.objects.filter(debt=debt).exclude(pk=self.pk).aggregate(
                total=models.Sum('amount')
            )['total'] or Decimal('0.00')
            if total_paid + self.amount > debt.amount:
                raise ValidationError(
                    f'Payment of {self.amount} exceeds remaining balance of {debt.amount - total_paid}.'
                )


class PasswordResetOTP(models.Model):
    """OTP for password reset flow."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_resets')
    otp_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"OTP for {self.user.username} ({'used' if self.is_used else 'active'})"

    @staticmethod
    def generate_otp():
        """Generate a secure 6-digit OTP."""
        return secrets.token_hex(3)[:6].upper()

    @staticmethod
    def hash_otp(otp):
        """Hash the OTP for secure storage."""
        return hashlib.sha256(otp.encode()).hexdigest()

    def verify(self, otp_input):
        """Verify OTP input against stored hash."""
        if self.is_used:
            return False, 'OTP has already been used.'
        from django.utils import timezone as tz
        if tz.now() > self.expires_at:
            return False, 'OTP has expired.'
        from django.conf import settings
        max_attempts = getattr(settings, 'OTP_MAX_ATTEMPTS', 5)
        if self.attempts >= max_attempts:
            return False, 'Too many failed attempts. Request a new OTP.'
        self.attempts += 1
        self.save(update_fields=['attempts'])
        if self.otp_hash == self.hash_otp(otp_input):
            self.is_used = True
            self.save(update_fields=['is_used'])
            return True, 'OTP verified.'
        return False, 'Invalid OTP.'


class Purchase(models.Model):
    """Records a multi-item purchase made by the shop owner."""
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='purchases')
    purchase_date = models.DateField()
    description = models.TextField(blank=True, default='')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-purchase_date', '-created_at']
        indexes = [
            models.Index(fields=['owner', '-purchase_date']),
            models.Index(fields=['owner', '-created_at']),
        ]

    def __str__(self):
        return f"Purchase {self.id} - {self.total_amount} ({self.purchase_date})"

    def recalculate_total(self):
        """Recalculate total_amount from items."""
        total = sum(item.total_amount for item in self.items.all())
        self.total_amount = total
        self.save(update_fields=['total_amount', 'updated_at'])
        return total


class PurchaseItem(models.Model):
    """A single line item within a Purchase."""
    purchase = models.ForeignKey(Purchase, on_delete=models.CASCADE, related_name='items')
    product_name = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_purchase_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['purchase', 'created_at']),
        ]

    def __str__(self):
        return f"{self.product_name} x{self.quantity} @ {self.unit_purchase_price}"

    def save(self, *args, **kwargs):
        self.total_amount = self.quantity * self.unit_purchase_price
        super().save(*args, **kwargs)


class UserPreference(models.Model):
    """User preferences including language selection."""
    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('sw', 'Kiswahili'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preferences')
    language = models.CharField(max_length=2, choices=LANGUAGE_CHOICES, default='en')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.get_language_display()}"
