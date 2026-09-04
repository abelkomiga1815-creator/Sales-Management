from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from ledger.serializers import TransactionCreateSerializer


class DebtTransactionSerializerTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='seller', password='pass1234')

    def test_debt_requires_borrower_name_and_product_name(self):
        payload = {
            'type': 'DEBT',
            'amount': '2500.00',
            'description': 'Borrowed goods',
        }
        serializer = TransactionCreateSerializer(data=payload, context={'request': type('RequestStub', (), {'user': self.user})()})

        self.assertFalse(serializer.is_valid())
        self.assertIn('borrower_name', serializer.errors)
        self.assertIn('product_name', serializer.errors)

    def test_debt_serializer_accepts_valid_record(self):
        payload = {
            'borrower_name': 'Amina',
            'product_name': 'Rice bags',
            'type': 'DEBT',
            'amount': '2500.00',
            'description': 'Borrowed for household use',
        }
        serializer = TransactionCreateSerializer(data=payload, context={'request': type('RequestStub', (), {'user': self.user})()})

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['borrower_name'], 'Amina')
        self.assertEqual(serializer.validated_data['product_name'], 'Rice bags')
        self.assertEqual(serializer.validated_data['amount'], Decimal('2500.00'))
