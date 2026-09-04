from rest_framework import serializers
from django.db.models import Sum
from .models import Customer, Transaction, DebtPayment, UserPreference, Purchase, PurchaseItem


class CustomerSerializer(serializers.ModelSerializer):
    """Serializer for Customer model."""
    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone', 'total_balance', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'total_balance']


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer for Transaction model."""
    customer_name = serializers.CharField(source='customer.name', read_only=True, allow_null=True)
    entered_by_name = serializers.CharField(source='entered_by.username', read_only=True)
    total_paid = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    remaining_balance = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    payment_status = serializers.CharField(read_only=True)

    class Meta:
        model = Transaction
        fields = ['id', 'customer', 'customer_name', 'borrower_name', 'product_name', 'type', 'amount', 'description',
                  'date_created', 'date_updated', 'entered_by', 'entered_by_name',
                  'total_paid', 'remaining_balance', 'payment_status']
        read_only_fields = ['id', 'date_created', 'date_updated', 'entered_by']

    def validate_customer(self, customer):
        request = self.context.get('request')
        if request and customer and customer.shop_id != request.user.id:
            raise serializers.ValidationError('Customer not found.')
        return customer


class TransactionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating transactions."""
    class Meta:
        model = Transaction
        fields = ['customer', 'borrower_name', 'product_name', 'type', 'amount', 'description']
        extra_kwargs = {
            'customer': {'required': False, 'allow_null': True},
            'borrower_name': {'required': False, 'allow_blank': True, 'default': ''},
            'product_name': {'required': False, 'allow_blank': True},
        }

    def validate(self, attrs):
        customer = attrs.get('customer')
        if customer and customer.shop_id != self.context['request'].user.id:
            raise serializers.ValidationError({'customer': 'Customer not found.'})

        transaction_type = attrs.get('type')
        borrower_name = (attrs.get('borrower_name') or '').strip()
        product_name = (attrs.get('product_name') or '').strip()

        errors = {}
        if transaction_type == 'SALE' and not product_name:
            errors['product_name'] = 'Enter the product sold.'
        if transaction_type == 'DEBT':
            if not borrower_name:
                errors['borrower_name'] = 'Enter the borrower name.'
            if not product_name:
                errors['product_name'] = 'Enter the product borrowed.'
        if transaction_type == 'DEBIT':
            if not borrower_name:
                errors['borrower_name'] = 'Enter the customer name.'
            if not product_name:
                errors['product_name'] = 'Enter the product/service name.'
        if transaction_type == 'CREDIT' and not customer:
            errors['customer'] = 'Select a customer for credit.'
        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class CustomerDetailSerializer(serializers.ModelSerializer):
    """Serializer for customer detail with transactions."""
    transactions = TransactionSerializer(many=True, read_only=True)

    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone', 'total_balance', 'created_at', 'updated_at', 'transactions']
        read_only_fields = ['id', 'created_at', 'updated_at', 'total_balance', 'transactions']


class DailySummarySerializer(serializers.Serializer):
    """Serializer for daily summary statistics."""
    total_credit_given = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_cash_received = serializers.DecimalField(max_digits=10, decimal_places=2)
    net_cash_flow = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_sales = serializers.DecimalField(max_digits=10, decimal_places=2)


class DebtPaymentSerializer(serializers.ModelSerializer):
    """Serializer for DebtPayment model."""
    recorded_by_name = serializers.CharField(source='recorded_by.username', read_only=True, default='')

    class Meta:
        model = DebtPayment
        fields = ['id', 'debt', 'amount', 'description', 'date_created', 'recorded_by', 'recorded_by_name']
        read_only_fields = ['id', 'date_created', 'recorded_by']

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Payment amount must be positive.')
        return value

    def validate(self, attrs):
        debt = attrs.get('debt')
        amount = attrs.get('amount')
        if debt and amount:
            if debt.type != 'DEBT':
                raise serializers.ValidationError({'debt': 'Payments can only be recorded for debt transactions.'})
            total_paid = DebtPayment.objects.filter(debt=debt).aggregate(
                total=Sum('amount')
            )['total'] or 0
            if total_paid + amount > debt.amount:
                remaining = debt.amount - total_paid
                raise serializers.ValidationError({
                    'amount': f'Payment of {amount} exceeds remaining balance of {remaining}.'
                })
        return attrs


class DebtPaymentCreateSerializer(serializers.Serializer):
    """Serializer for creating a debt payment."""
    debt_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    description = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_debt_id(self, value):
        from django.contrib.auth.models import User
        request = self.context.get('request')
        try:
            debt = Transaction.objects.get(id=value, type='DEBT')
        except Transaction.DoesNotExist:
            raise serializers.ValidationError('Debt transaction not found.')
        if debt.customer_id:
            if debt.customer.shop_id != request.user.id:
                raise serializers.ValidationError('Debt not found.')
        elif debt.entered_by_id != request.user.id:
            raise serializers.ValidationError('Debt not found.')
        return value

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Payment amount must be positive.')
        return value

    def validate(self, attrs):
        debt_id = attrs.get('debt_id')
        amount = attrs.get('amount')
        if debt_id and amount:
            debt = Transaction.objects.get(id=debt_id)
            total_paid = DebtPayment.objects.filter(debt=debt).aggregate(
                total=Sum('amount')
            )['total'] or 0
            remaining = debt.amount - total_paid
            if remaining <= 0:
                raise serializers.ValidationError({'debt_id': 'This debt is already fully paid.'})
            if amount > remaining:
                raise serializers.ValidationError({
                    'amount': f'Payment of {amount} exceeds remaining balance of {remaining}.'
                })
        return attrs


class PurchaseItemSerializer(serializers.ModelSerializer):
    """Serializer for PurchaseItem model."""
    class Meta:
        model = PurchaseItem
        fields = ['id', 'product_name', 'quantity', 'unit_purchase_price', 'total_amount']
        read_only_fields = ['id', 'total_amount']


class PurchaseSerializer(serializers.ModelSerializer):
    """Serializer for Purchase model with nested items."""
    items = PurchaseItemSerializer(many=True, read_only=True)

    class Meta:
        model = Purchase
        fields = ['id', 'purchase_date', 'description', 'total_amount', 'items', 'created_at', 'updated_at']
        read_only_fields = ['id', 'total_amount', 'created_at', 'updated_at']


class PurchaseCreateSerializer(serializers.Serializer):
    """Serializer for creating a purchase with items. Backend calculates totals."""
    purchase_date = serializers.DateField(required=False)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    items = serializers.ListField(
        child=serializers.DictField(),
        min_length=1,
        error_messages={'min_length': 'At least one item is required.'},
    )

    def validate_items(self, items):
        for i, item in enumerate(items):
            product_name = (item.get('product_name') or '').strip()
            if not product_name:
                raise serializers.ValidationError(f'Item {i+1}: Product name is required.')
            try:
                quantity = float(item.get('quantity', 0))
            except (TypeError, ValueError):
                raise serializers.ValidationError(f'Item {i+1}: Invalid quantity.')
            if quantity <= 0:
                raise serializers.ValidationError(f'Item {i+1}: Quantity must be positive.')
            try:
                unit_price = float(item.get('unit_purchase_price', 0))
            except (TypeError, ValueError):
                raise serializers.ValidationError(f'Item {i+1}: Invalid unit price.')
            if unit_price <= 0:
                raise serializers.ValidationError(f'Item {i+1}: Unit price must be positive.')
        return items


class UserPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for UserPreference model."""
    class Meta:
        model = UserPreference
        fields = ['language']
        read_only_fields = []
