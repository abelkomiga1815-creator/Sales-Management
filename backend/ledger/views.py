from django.db import transaction, models
from django.db.models import Q, Sum
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.utils import timezone
from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import ValidationError
from decimal import Decimal
from datetime import timedelta
import io
import json
import os
import secrets
from urllib.parse import quote


from .models import (
    Business, Customer, GoogleDriveConnection, Transaction,
    DebtPayment, PasswordResetOTP, UserPreference, Purchase, PurchaseItem
)
from .serializers import (
    CustomerSerializer, TransactionSerializer, TransactionCreateSerializer,
    CustomerDetailSerializer, DailySummarySerializer,
    DebtPaymentSerializer, DebtPaymentCreateSerializer,
    UserPreferenceSerializer, PurchaseSerializer, PurchaseCreateSerializer
)

GOOGLE_DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.file']


def google_oauth_config():
    client_id = os.getenv('GOOGLE_CLIENT_ID')
    client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
    if not client_id or not client_secret:
        return None
    return {
        'web': {
            'client_id': client_id,
            'client_secret': client_secret,
            'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
            'token_uri': 'https://oauth2.googleapis.com/token',
            'redirect_uris': [os.getenv('GOOGLE_REDIRECT_URI', '')],
        }
    }


def google_oauth_flow(request):
    config = google_oauth_config()
    redirect_uri = os.getenv('GOOGLE_REDIRECT_URI') or request.build_absolute_uri(reverse('google-backup-callback'))
    if not config:
        return None
    try:
        from google_auth_oauthlib.flow import Flow
    except ImportError as exc:
        raise RuntimeError('Google Drive dependencies are not installed. Run pip install -r requirements.txt.') from exc
    flow = Flow.from_client_config(config, scopes=GOOGLE_DRIVE_SCOPES, redirect_uri=redirect_uri)
    return flow


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def google_backup_start(request):
    existing_connection = GoogleDriveConnection.objects.filter(
        business__owner=request.user,
    ).first()
    if existing_connection:
        try:
            from google.oauth2.credentials import Credentials
            credentials = Credentials.from_authorized_user_info(existing_connection.token, GOOGLE_DRIVE_SCOPES)
            if credentials.expired and credentials.refresh_token:
                from google.auth.transport.requests import Request
                credentials.refresh(Request())
                existing_connection.token = json.loads(credentials.to_json())
                existing_connection.save(update_fields=['token', 'updated_at'])
            if credentials.valid:
                upload_user_backup(request.user, credentials)
                return HttpResponseRedirect('/?backup=success')
        except Exception:
            # A stale connection falls through to the normal re-authorization flow.
            pass
    try:
        flow = google_oauth_flow(request)
    except (RuntimeError, ValueError) as exc:
        return HttpResponseRedirect(f'/?backup=error&message={quote(str(exc))}')
    if flow is None:
        return HttpResponseRedirect('/?backup=error&message=Google+Drive+backup+is+not+configured.')
    try:
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent',
        )
    except Exception:
        return HttpResponseRedirect('/?backup=error&message=Google+Drive+OAuth+configuration+is+invalid.')
    request.session['google_oauth_state'] = state
    return HttpResponseRedirect(authorization_url)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def google_backup_callback(request):
    try:
        flow = google_oauth_flow(request)
    except (RuntimeError, ValueError) as exc:
        return HttpResponseRedirect(f'/?backup=error&message={quote(str(exc))}')
    if flow is None:
        return HttpResponseRedirect('/?backup=error&message=Google+Drive+backup+is+not+configured.')
    if request.GET.get('state') != request.session.pop('google_oauth_state', None):
        return Response({'error': 'Invalid Google authorization state.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        business, _ = Business.objects.get_or_create(
            owner=request.user,
            defaults={'name': f"{request.user.username}'s business"},
        )
        flow.fetch_token(authorization_response=request.build_absolute_uri())
        connection, _ = GoogleDriveConnection.objects.get_or_create(
            business=business,
            defaults={'token': json.loads(flow.credentials.to_json())},
        )
        connection.token = json.loads(flow.credentials.to_json())
        connection.save(update_fields=['token', 'updated_at'])
        upload_user_backup(request.user, flow.credentials)
    except Exception:
        return HttpResponseRedirect('/?backup=error&message=Google+Drive+authorization+or+backup+failed.')
    return HttpResponseRedirect('/?backup=success')


def upload_user_backup(user, credentials):
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseUpload

    business, _ = Business.objects.get_or_create(
        owner=user,
        defaults={'name': f"{user.username}'s business"},
    )
    customers = Customer.objects.filter(shop=user).values(
        'id', 'name', 'phone', 'total_balance', 'created_at', 'updated_at'
    )
    transactions = Transaction.objects.filter(
        Q(customer__shop=user) | Q(customer__isnull=True, entered_by=user)
    ).values(
        'id', 'customer_id', 'borrower_name', 'product_name', 'type',
        'amount', 'description', 'date_created', 'date_updated', 'entered_by_id'
    )
    payment_ids = list(transactions.values_list('id', flat=True))
    payments = DebtPayment.objects.filter(debt_id__in=payment_ids).values(
        'id', 'debt_id', 'amount', 'description', 'date_created'
    )
    try:
        pref = UserPreference.objects.get(user=user)
        prefs_data = {'language': pref.language}
    except UserPreference.DoesNotExist:
        prefs_data = {'language': 'en'}

    purchases = Purchase.objects.filter(owner=user)
    purchases_data = []
    for p in purchases:
        purchases_data.append({
            'id': p.id,
            'purchase_date': p.purchase_date.isoformat(),
            'description': p.description,
            'total_amount': str(p.total_amount),
            'items': list(p.items.values('product_name', 'quantity', 'unit_purchase_price', 'total_amount')),
        })

    export = {
        'backup_version': '3.0',
        'backup_date': timezone.now().isoformat(),
        'user_data': {
            'username': user.username,
            'business_name': business.name,
        },
        'customers': list(customers),
        'transactions': list(transactions),
        'payments': list(payments),
        'purchases': purchases_data,
        'settings': prefs_data,
    }
    payload = json.dumps(export, default=str, indent=2).encode('utf-8')
    drive = build('drive', 'v3', credentials=credentials)

    folder_name = 'Shop Ledger Backups'
    query = f"mimeType='application/vnd.google-apps.folder' and name='{folder_name}' and trashed=false"
    results = drive.files().list(q=query, fields='files(id)').execute()
    files = results.get('files', [])
    if files:
        folder_id = files[0]['id']
    else:
        folder_metadata = {'name': folder_name, 'mimeType': 'application/vnd.google-apps.folder'}
        folder = drive.files().create(body=folder_metadata, fields='id').execute()
        folder_id = folder['id']

    metadata = {
        'name': f"{business.name} ledger backup {timezone.now():%Y-%m-%d %H-%M-%S}.json",
        'mimeType': 'application/json',
        'parents': [folder_id],
    }
    drive.files().create(
        body=metadata,
        media_body=MediaIoBaseUpload(io.BytesIO(payload), mimetype='application/json'),
        fields='id'
    ).execute()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    business, _ = Business.objects.get_or_create(
        owner=request.user,
        defaults={'name': f"{request.user.username}'s business"},
    )
    pref, _ = UserPreference.objects.get_or_create(user=request.user)
    return Response({
        'username': request.user.username,
        'business_name': business.name,
        'language': pref.language,
    })


@api_view(['POST'])
def register(request):
    username = str(request.data.get('username', '')).strip()
    password = request.data.get('password', '')
    business_name = str(request.data.get('business_name', '')).strip()

    if not username or not password or not business_name:
        return Response({'error': 'Business name, username, and password are required.'}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(username__iexact=username).exists():
        return Response({'error': 'That username is already in use.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        validate_password(password)
    except DjangoValidationError as exc:
        return Response({'error': exc.messages}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(username=username, password=password)
    Business.objects.create(owner=user, name=business_name)
    login(request, user)
    return Response({'username': user.username, 'business_name': business_name}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def login_user(request):
    user = authenticate(
        request,
        username=request.data.get('username', ''),
        password=request.data.get('password', ''),
    )
    if user is None:
        return Response({'error': 'Invalid username or password.'}, status=status.HTTP_400_BAD_REQUEST)
    login(request, user)
    business, _ = Business.objects.get_or_create(owner=user, defaults={'name': f"{user.username}'s business"})
    return Response({'username': user.username, 'business_name': business.name})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    request.session.flush()
    logout(request)
    response = Response(status=status.HTTP_204_NO_CONTENT)
    response.delete_cookie('sessionid')
    return response


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
                if customer_id:
                    customer = Customer.objects.select_for_update().get(id=customer_id, shop=request.user)

                txn = Transaction.objects.create(
                    customer=customer,
                    borrower_name=(serializer.validated_data.get('borrower_name') or '').strip(),
                    product_name=(serializer.validated_data.get('product_name') or '').strip(),
                    type=transaction_type,
                    amount=amount,
                    description=serializer.validated_data.get('description', ''),
                    entered_by=request.user
                )

                if transaction_type == 'CREDIT':
                    customer.total_balance += amount
                elif transaction_type == 'DEBIT':
                    customer.total_balance -= amount

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
        """Return transactions for customers of the current user, with optional type filtering."""
        queryset = Transaction.objects.filter(Q(customer__shop=self.request.user) | Q(customer__isnull=True, entered_by=self.request.user))
        
        # Filter by transaction type if provided
        transaction_type = self.request.query_params.get('type')
        if transaction_type:
            queryset = queryset.filter(type=transaction_type)
        
        return queryset

    def perform_create(self, serializer):
        serializer.save(entered_by=self.request.user)

    def perform_destroy(self, instance):
        """Delete a transaction and reverse its effect on the customer balance."""
        with transaction.atomic():
            if instance.customer_id and instance.type in ('CREDIT', 'DEBIT'):
                customer = Customer.objects.select_for_update().get(id=instance.customer_id)
                if instance.type == 'CREDIT':
                    customer.total_balance -= instance.amount
                else:
                    customer.total_balance += instance.amount
                customer.save(update_fields=['total_balance', 'updated_at'])

            instance.delete()


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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def activity_report(request):
    """Return lifetime activity and transactions for the current user's shop."""
    transactions = Transaction.objects.filter(
        Q(customer__shop=request.user) | Q(customer__isnull=True, entered_by=request.user)
    ).select_related('customer', 'entered_by')

    totals = transactions.values('type').annotate(total=models.Sum('amount'))
    totals_by_type = {item['type']: item['total'] or Decimal('0.00') for item in totals}
    credit = totals_by_type.get('CREDIT', Decimal('0.00'))
    debit = totals_by_type.get('DEBIT', Decimal('0.00'))

    return Response({
        'total_transactions': transactions.count(),
        'total_credit_given': credit,
        'total_cash_received': debit,
        'net_cash_flow': debit - credit,
        'total_sales': totals_by_type.get('SALE', Decimal('0.00')),
        'transactions': TransactionSerializer(transactions, many=True).data,
    })


# ========================================
# Debt Payment Endpoints
# ========================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_debt_payment(request):
    """Record a payment against a DEBT transaction."""
    serializer = DebtPaymentCreateSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    debt_id = serializer.validated_data['debt_id']
    amount = serializer.validated_data['amount']
    description = serializer.validated_data.get('description', '')

    try:
        with transaction.atomic():
            debt = Transaction.objects.select_for_update().get(id=debt_id, type='DEBT')

            total_paid = DebtPayment.objects.filter(debt=debt).aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
            remaining = debt.amount - total_paid

            if amount > remaining:
                return Response(
                    {'error': f'Payment of {amount} exceeds remaining balance of {remaining}.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            payment = DebtPayment.objects.create(
                debt=debt,
                amount=amount,
                description=description,
                recorded_by=request.user,
            )

            new_total_paid = total_paid + amount
            new_remaining = debt.amount - new_total_paid
            payment_status = 'PAID' if new_remaining <= 0 else 'PARTIALLY_PAID'

            return Response({
                'id': payment.id,
                'debt_id': debt.id,
                'amount': str(payment.amount),
                'original_amount': str(debt.amount),
                'total_paid': str(new_total_paid),
                'remaining_balance': str(max(new_remaining, Decimal('0.00'))),
                'status': payment_status,
                'message': 'Payment recorded successfully.'
            }, status=status.HTTP_201_CREATED)
    except Transaction.DoesNotExist:
        return Response({'error': 'Debt transaction not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debt_payments(request, debt_id):
    """List all payments for a specific debt transaction."""
    try:
        debt = Transaction.objects.get(id=debt_id, type='DEBT')
        if debt.customer_id:
            if debt.customer.shop_id != request.user.id:
                return Response({'error': 'Debt not found.'}, status=status.HTTP_404_NOT_FOUND)
        elif debt.entered_by_id != request.user.id:
            return Response({'error': 'Debt not found.'}, status=status.HTTP_404_NOT_FOUND)

        payments = DebtPayment.objects.filter(debt=debt)
        total_paid = payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        remaining = debt.amount - total_paid

        return Response({
            'debt': {
                'id': debt.id,
                'borrower_name': debt.borrower_name,
                'product_name': debt.product_name,
                'amount': str(debt.amount),
                'description': debt.description,
                'date_created': debt.date_created.isoformat(),
            },
            'payments': DebtPaymentSerializer(payments, many=True).data,
            'total_paid': str(total_paid),
            'remaining_balance': str(max(remaining, Decimal('0.00'))),
            'status': 'PAID' if remaining <= 0 else ('PARTIALLY_PAID' if total_paid > 0 else 'UNPAID'),
        })
    except Transaction.DoesNotExist:
        return Response({'error': 'Debt not found.'}, status=status.HTTP_404_NOT_FOUND)


# ========================================
# Password Reset (OTP) Endpoints
# ========================================

@api_view(['POST'])
@permission_classes([AllowAny])
def request_password_reset(request):
    """Send OTP to the email associated with the username."""
    username = str(request.data.get('username', '')).strip()
    if not username:
        return Response({'error': 'Username is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(username__iexact=username)
    except User.DoesNotExist:
        return Response({'message': 'If an account with that username exists, an OTP has been sent.'}, status=status.HTTP_200_OK)

    if not user.email:
        return Response({'message': 'If an account with that username exists, an OTP has been sent.'}, status=status.HTTP_200_OK)

    PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_used=True)

    otp = PasswordResetOTP.generate_otp()
    otp_hash = PasswordResetOTP.hash_otp(otp)
    expiry_minutes = getattr(settings, 'OTP_EXPIRY_MINUTES', 10)

    PasswordResetOTP.objects.create(
        user=user,
        otp_hash=otp_hash,
        expires_at=timezone.now() + timedelta(minutes=expiry_minutes),
    )

    try:
        from django.core.mail import send_mail
        send_mail(
            subject='Shop Ledger - Password Reset OTP',
            message=f'Your OTP for password reset is: {otp}\n\nThis OTP expires in {expiry_minutes} minutes.',
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@shopledger.com'),
            recipient_list=[user.email],
            fail_silently=True,
        )
    except Exception:
        pass

    return Response({'message': 'If an account with that username exists, an OTP has been sent.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_password_otp(request):
    """Verify the OTP entered by the user."""
    username = str(request.data.get('username', '')).strip()
    otp_input = str(request.data.get('otp', '')).strip()

    if not username or not otp_input:
        return Response({'error': 'Username and OTP are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(username__iexact=username)
    except User.DoesNotExist:
        return Response({'error': 'Invalid request.'}, status=status.HTTP_400_BAD_REQUEST)

    otp_record = PasswordResetOTP.objects.filter(user=user, is_used=False).order_by('-created_at').first()
    if not otp_record:
        return Response({'error': 'No active OTP found. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

    valid, message = otp_record.verify(otp_input)
    if not valid:
        return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

    reset_token = secrets.token_urlsafe(32)
    request.session['password_reset_token'] = reset_token
    request.session['password_reset_user_id'] = user.id
    request.session['password_reset_verified'] = True

    return Response({'message': 'OTP verified. You can now set a new password.', 'reset_token': reset_token}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def complete_password_reset(request):
    """Set a new password after OTP verification."""
    username = str(request.data.get('username', '')).strip()
    new_password = request.data.get('new_password', '')
    reset_token = request.data.get('reset_token', '')

    if not username or not new_password or not reset_token:
        return Response({'error': 'Username, new password, and reset token are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if request.session.get('password_reset_token') != reset_token:
        return Response({'error': 'Invalid or expired reset token.'}, status=status.HTTP_400_BAD_REQUEST)

    if not request.session.get('password_reset_verified'):
        return Response({'error': 'OTP verification required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(username__iexact=username)
    except User.DoesNotExist:
        return Response({'error': 'Invalid request.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        validate_password(new_password, user)
    except DjangoValidationError as exc:
        return Response({'error': exc.messages}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()

    request.session.pop('password_reset_token', None)
    request.session.pop('password_reset_user_id', None)
    request.session.pop('password_reset_verified', None)

    PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_used=True)

    return Response({'message': 'Password updated successfully. You can now log in.'}, status=status.HTTP_200_OK)


# ========================================
# User Preference Endpoints
# ========================================

@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def user_preferences(request):
    """Get or update user preferences (language)."""
    pref, _ = UserPreference.objects.get_or_create(user=request.user)

    if request.method == 'GET':
        return Response({'language': pref.language})

    language = request.data.get('language', pref.language)
    if language not in ('en', 'sw'):
        return Response({'error': 'Language must be "en" or "sw".'}, status=status.HTTP_400_BAD_REQUEST)

    pref.language = language
    pref.save(update_fields=['language', 'updated_at'])
    return Response({'language': pref.language})


# ========================================
# Purchase Endpoints
# ========================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_purchase(request):
    """Create a purchase with its line items. Backend computes all totals."""
    serializer = PurchaseCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    purchase_date = data.get('purchase_date') or timezone.localdate()
    description = data.get('description', '')

    try:
        with transaction.atomic():
            purchase = Purchase.objects.create(
                owner=request.user,
                purchase_date=purchase_date,
                description=description,
                total_amount=Decimal('0.00'),
            )

            items = []
            total = Decimal('0.00')
            for item in data['items']:
                product_name = (item.get('product_name') or '').strip()
                quantity = Decimal(str(item['quantity']))
                unit_price = Decimal(str(item['unit_purchase_price']))
                line_total = quantity * unit_price
                total += line_total
                items.append({
                    'product_name': product_name,
                    'quantity': quantity,
                    'unit_purchase_price': unit_price,
                    'total_amount': line_total,
                })

            for it in items:
                PurchaseItem.objects.create(purchase=purchase, **it)

            purchase.total_amount = total
            purchase.save(update_fields=['total_amount'])

            return Response({
                'id': purchase.id,
                'purchase_date': purchase.purchase_date.isoformat(),
                'description': purchase.description,
                'total_amount': str(total),
                'item_count': len(items),
                'items': items,
                'message': 'Purchase recorded successfully.'
            }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def purchase_list(request):
    """List purchases for the current user."""
    purchases = Purchase.objects.filter(owner=request.user).prefetch_related('items')
    purchase_date = request.query_params.get('date')
    if purchase_date:
        purchases = purchases.filter(purchase_date=purchase_date)
    serializer = PurchaseSerializer(purchases, many=True)
    total_spent = purchases.aggregate(total=models.Sum('total_amount'))['total'] or Decimal('0.00')
    return Response({
        'count': purchases.count(),
        'total_spent': str(total_spent),
        'purchases': serializer.data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def purchase_detail(request, purchase_id):
    """Get a single purchase with items."""
    try:
        purchase = Purchase.objects.get(id=purchase_id, owner=request.user)
    except Purchase.DoesNotExist:
        return Response({'error': 'Purchase not found.'}, status=status.HTTP_404_NOT_FOUND)
    serializer = PurchaseSerializer(purchase)
    return Response(serializer.data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def purchase_delete(request, purchase_id):
    """Delete a purchase and its items."""
    try:
        purchase = Purchase.objects.get(id=purchase_id, owner=request.user)
    except Purchase.DoesNotExist:
        return Response({'error': 'Purchase not found.'}, status=status.HTTP_404_NOT_FOUND)
    purchase.delete()
    return Response({'message': 'Purchase deleted.'}, status=status.HTTP_200_OK)
