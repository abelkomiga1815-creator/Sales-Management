from rest_framework import serializers
from .models import Customer, Transaction


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

    class Meta:
        model = Transaction
        fields = ['id', 'customer', 'customer_name', 'product_name', 'type', 'amount', 'description', 
                  'date_created', 'date_updated', 'entered_by', 'entered_by_name']
        read_only_fields = ['id', 'date_created', 'date_updated', 'entered_by']


class TransactionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating transactions."""
    class Meta:
        model = Transaction
        fields = ['customer', 'product_name', 'type', 'amount', 'description']
        extra_kwargs = {
            'customer': {'required': False, 'allow_null': True},
            'product_name': {'required': False, 'allow_blank': True},
        }

    def validate(self, attrs):
        transaction_type = attrs.get('type')
        if transaction_type == 'SALE' and not attrs.get('product_name'):
            raise serializers.ValidationError({'product_name': 'Enter the product sold.'})
        if transaction_type in ('CREDIT', 'DEBIT') and not attrs.get('customer'):
            raise serializers.ValidationError({'customer': 'Select a customer for credit or debit.'})
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
