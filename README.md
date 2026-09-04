# Shop Ledger PWA

A Progressive Web App (PWA) for managing shop customer accounts, balances, and transactions. Built with Django REST Framework, PostgreSQL, and vanilla JavaScript.

## Features

- 📱 **Progressive Web App** - Works offline with service worker caching
- 💳 **Customer Management** - Create and manage customer accounts
- 📊 **Transaction Tracking** - Record credit, debit, and sales transactions
- 📈 **Daily Summary** - View daily cash flow statistics
- 🔒 **Secure API** - Django REST Framework with CSRF protection
- 📞 **Touch-Friendly UI** - Large buttons and inputs optimized for mobile
- 🌙 **Dark Mode Support** - Automatic dark mode based on system preference
- ⚡ **Fast & Responsive** - Mobile-first design with zero external dependencies

## Tech Stack

- **Backend**: Django 5.x + Django REST Framework + PostgreSQL
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Deployment**: Docker & Docker Compose

## Project Structure

```
shop_ledger/
├── docker-compose.yml          # Docker services configuration
├── Dockerfile                  # Django app container
├── requirements.txt            # Python dependencies
├── .env                        # Environment variables (template)
├── backend/                    # Django backend
│   ├── manage.py               # Django management script
│   ├── shop_ledger/            # Main Django project
│   ├── __init__.py
│   ├── settings.py            # Django configuration
│   ├── urls.py                # URL routing
│   ├── asgi.py
│   └── wsgi.py
│   ├── ledger/                 # Django app
│   ├── __init__.py
│   ├── admin.py               # Admin configuration
│   ├── apps.py
│   ├── models.py              # Customer & Transaction models
│   ├── serializers.py         # DRF serializers
│   ├── urls.py                # API endpoints
│   ├── views.py               # API views
│   └── migrations/
└── frontend/                  # Frontend templates and static assets
  ├── templates/
  │   └── index.html          # SPA HTML
  └── static/
    ├── css/style.css       # Main stylesheet
    ├── js/app.js           # Frontend application logic
    ├── manifest.json       # PWA manifest
    ├── sw.js               # Service worker
    └── images/              # Branded PWA install icons
```

## Prerequisites

- Docker & Docker Compose
- Or: Python 3.11+, PostgreSQL 15+, pip

## Quick Start with Docker

### 1. Clone/Setup the Project

```bash
cd shop_ledger
```

### 2. Configure Environment

Copy the `.env` file and update if needed:

```bash
cat .env
```

Default values are:
- `DB_NAME=shop_ledger_db`
- `DB_USER=shop_ledger_user`
- `DB_PASSWORD=shop_ledger_password`
- `DEBUG=True`

### 3. Start Services

```bash
docker-compose up -d
```

This will:
- Start PostgreSQL on port 5432
- Start Django on port 8000
- Run migrations automatically

### 4. Create Superuser

```bash
docker-compose exec web python manage.py createsuperuser
```

Follow the prompts to create an admin account.

### 5. Access the App

- **Main App**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin

### 6. Stop Services

```bash
docker-compose down
```

## Local Development (Without Docker)

### 1. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Setup PostgreSQL

Create a PostgreSQL database and user:

```sql
CREATE DATABASE shop_ledger_db;
CREATE USER shop_ledger_user WITH PASSWORD 'shop_ledger_password';
ALTER ROLE shop_ledger_user SET client_encoding TO 'utf8';
ALTER ROLE shop_ledger_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE shop_ledger_user SET default_transaction_deferrable TO on;
ALTER ROLE shop_ledger_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE shop_ledger_db TO shop_ledger_user;
```

### 4. Configure Environment

Create a `.env` file with:

```
DEBUG=True
SECRET_KEY=your-secret-key-here
DB_NAME=shop_ledger_db
DB_USER=shop_ledger_user
DB_PASSWORD=shop_ledger_password
DB_HOST=localhost
DB_PORT=5432
```

### 5. Run Migrations

```bash
cd backend
python manage.py migrate
```

### 6. Create Superuser

```bash
python manage.py createsuperuser
```

### 7. Run Development Server

```bash
python manage.py runserver
```

Access the app at http://localhost:8000

## API Documentation

### Authentication

All API endpoints require authentication. Implement Django's default authentication (Session or Token).

### Endpoints

#### Customers
- `GET /api/customers/` - List all customers
- `POST /api/customers/` - Create a new customer
- `GET /api/customers/<id>/history/` - Get customer transactions history

#### Transactions
- `POST /api/transactions/` - Create a transaction (with atomic balance update)
- `GET /api/transactions/` - List transactions

#### Summary
- `GET /api/daily-summary/` - Get today's summary (credit given, cash received, net flow)

### Example: Create Transaction

```bash
curl -X POST http://localhost:8000/api/transactions/ \
  -H "Content-Type: application/json" \
  -d '{
    "customer": 1,
    "type": "CREDIT",
    "amount": "500.00",
    "description": "Sold goods"
  }'
```

Response:
```json
{
  "id": 1,
  "customer_id": 1,
  "type": "CREDIT",
  "amount": "500.00",
  "new_balance": "500.00",
  "message": "Transaction created successfully"
}
```

## Database Models

### Customer Model

```python
- id (PK)
- shop (FK to User)
- name (CharField)
- phone (CharField)
- total_balance (DecimalField)
- created_at (DateTimeField)
- updated_at (DateTimeField)
```

Indexes on `shop + created_at` and `date_created` for fast queries.

### Transaction Model

```python
- id (PK)
- customer (FK to Customer)
- type (CREDIT | DEBIT | SALE)
- amount (DecimalField)
- description (TextField)
- date_created (DateTimeField)
- date_updated (DateTimeField)
- entered_by (FK to User)
```

Indexes on `customer_id + date_created` and `date_created`.

## PWA Features

### Offline Support
The service worker caches static assets and the index.html. When offline:
- Static assets are served from cache
- API requests return a 503 error message
- The app remains usable for viewing cached data

### Installation
Users can install the app as a standalone app on mobile:
1. Open the app in Chrome/Firefox
2. Tap "Install" or "Add to Home Screen"
3. The app appears as a native-like icon

### Caching Strategy
- **Cache-first** for static assets (CSS, JS, manifest)
- **Network-first** for API calls with offline fallback

## Security Notes

1. **CSRF Protection**: Enabled for all POST/PUT/DELETE requests
2. **CORS**: Configured for localhost only (update for production)
3. **Authentication**: Use Django's built-in auth system
4. **SECRET_KEY**: Change in production
5. **DEBUG**: Set to False in production
6. **Database**: Use strong passwords and restrict access

## Production Deployment

### Environment Variables

Set these in production:
- `DEBUG=False`
- `SECRET_KEY=<strong-random-key>`
- `ALLOWED_HOSTS=yourdomain.com`
- `DB_PASSWORD=<strong-password>`
- `DB_HOST=<database-server>`

### Static Files

Collect static files:
```bash
python manage.py collectstatic --noinput
```

Use a reverse proxy (Nginx/Apache) to serve static files.

### Database

- Use managed PostgreSQL service
- Enable SSL connections
- Regular backups

### HTTPS

Always use HTTPS in production (required for PWA).

## Troubleshooting

### Database Connection Error

```
django.db.utils.OperationalError: could not translate host name "db" to address
```

**Solution**: Ensure PostgreSQL service is running and .env has correct credentials.

### Port Already in Use

```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Or use a different port
python manage.py runserver 8001
```

### Service Worker Not Updating

```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});
```

## Development Tips

### Django Shell

```bash
python manage.py shell
>>> from ledger.models import Customer, Transaction
>>> customers = Customer.objects.all()
```

### Run Tests

```bash
python manage.py test ledger
```

### Create Sample Data

```bash
python manage.py shell
>>> from django.contrib.auth.models import User
>>> from ledger.models import Customer, Transaction
>>> from decimal import Decimal
>>> user = User.objects.first()
>>> customer = Customer.objects.create(shop=user, name="John Doe", phone="9876543210")
>>> Transaction.objects.create(customer=customer, type="CREDIT", amount=Decimal("1000"), entered_by=user)
```

## License

MIT

## Support

For issues and questions, check the Django and DRF documentation:
- Django: https://docs.djangoproject.com/
- DRF: https://www.django-rest-framework.org/
- PWA: https://web.dev/progressive-web-apps/
