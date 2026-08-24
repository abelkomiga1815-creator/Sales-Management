from django.db import transaction, models
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from decimal import Decimal
from datetime import timedelta

from .models import Customer, Transaction
from .serializers import (
    CustomerSerializer, TransactionSerializer, TransactionCreateSerializer,
    CustomerDetailSerializer, DailySummarySerializer
)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_transaction(request):
    """
    Create a new transaction and update customer balance.
    
    This endpoint uses select_for_update() and atomic() to safely
    update the customer's balance with database-level locking.
    """
    serializer = TransactionCreateSerializer(data=request.data)
    if serializer.is_valid():
        customer = serializer.validated_data.get('customer')
        customer_id = customer.id if customer else None
        transaction_type = serializer.validated_data['type']
        amount = serializer.validated_data['amount']
        
        try:
            with transaction.atomic():
                # Lock the customer row
                if customer_id:
                    customer = Customer.objects.select_for_update().get(id=customer_id, shop=request.user)
                
                # Create the transaction
                txn = Transaction.objects.create(
                    customer=customer,
                    product_name=serializer.validated_data.get('product_name', ''),
                    type=transaction_type,
                    amount=amount,
                    description=serializer.validated_data.get('description', ''),
                    entered_by=request.user
                )
                
                # Update customer balance based on transaction type
                if transaction_type == 'CREDIT':
                    customer.total_balance += amount
                elif transaction_type == 'DEBIT':
                    customer.total_balance -= amount
                # SALE doesn't change the balance
                
                if customer:
                    customer.save()
                
                return Response({
                    'id': txn.id,
                    'customer_id': customer.id if customer else None,
                    'type': transaction_type,
                    'amount': str(amount),
                    'new_balance': str(customer.total_balance) if customer else None,
                    'message': 'Transaction created successfully'
                }, status=status.HTTP_201_CREATED)
        
        except Customer.DoesNotExist:
            return Response(
                {'error': 'Customer not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomerViewSet(viewsets.ModelViewSet):
    """ViewSet for Customer model."""
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return customers for the current user (shop)."""
        return Customer.objects.filter(shop=self.request.user)
    
    def perform_create(self, serializer):
        """Set the shop to the current user."""
        serializer.save(shop=self.request.user)


class TransactionViewSet(viewsets.ModelViewSet):
    """ViewSet for Transaction model."""
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return transactions for customers of the current user."""
        return Transaction.objects.filter(Q(customer__shop=self.request.user) | Q(customer__isnull=True, entered_by=self.request.user))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_history(request, customer_id):
    """
    Get all transactions for a specific customer.
    """
    try:
        customer = Customer.objects.get(id=customer_id, shop=request.user)
        transactions = customer.transactions.all()
        
        serializer = TransactionSerializer(transactions, many=True)
        return Response({
            'customer': {
                'id': customer.id,
                'name': customer.name,
                'phone': customer.phone,
                'total_balance': str(customer.total_balance),
            },
            'transactions': serializer.data
        })
    
    except Customer.DoesNotExist:
        return Response(
            {'error': 'Customer not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def daily_summary(request):
    """
    Get daily summary statistics.
    
    Calculates total_credit_given, total_cash_received, net_cash_flow, and total_sales
    for today using Django's aggregation functions.
    """
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    # Get today's transactions for the current user's customers
    today_txns = Transaction.objects.filter(
        Q(customer__shop=request.user) | Q(customer__isnull=True, entered_by=request.user),
        date_created__gte=today_start,
        date_created__lt=today_end
    )
    
    # Calculate sums
    credit_given = today_txns.filter(type='CREDIT').aggregate(
        total=models.Sum('amount')
    )['total'] or Decimal('0.00')
    
    cash_received = today_txns.filter(type='DEBIT').aggregate(
        total=models.Sum('amount')
    )['total'] or Decimal('0.00')
    
    total_sales = today_txns.filter(type='SALE').aggregate(
        total=models.Sum('amount')
    )['total'] or Decimal('0.00')
    
    net_cash_flow = cash_received - credit_given
    
    data = {
        'total_credit_given': credit_given,
        'total_cash_received': cash_received,
        'net_cash_flow': net_cash_flow,
        'total_sales': total_sales,
    }
    
    serializer = DailySummarySerializer(data)
    return Response(serializer.data)
