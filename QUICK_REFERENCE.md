# Shop Ledger PWA - Quick Reference Guide

## 🎯 Project Overview

A complete Progressive Web App (PWA) for managing shop customer accounts and transactions, built with Django REST Framework, PostgreSQL, and vanilla JavaScript.

**Location**: `/home/abel/LedgerPWD/`

---

## ⚡ Quick Start (5 Minutes)

### With Docker (Recommended)
```bash
cd /home/abel/LedgerPWD
docker-compose up -d
docker-compose exec web python manage.py createsuperuser
# Access: http://localhost:8000
```

### Without Docker
```bash
cd /home/abel/LedgerPWD
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Update .env with your DB credentials
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

---

## 📂 Project Structure at a Glance

```
LedgerPWD/
├── shop_ledger/         # Django project config
├── ledger/              # Django app (models, views, API)
├── templates/           # Single-page app HTML
├── static/              # CSS, JS, PWA files
├── docker-compose.yml   # Docker services
├── manage.py            # Django CLI
├── requirements.txt     # Python packages
└── README.md            # Full documentation
```

---

## 🔌 API Endpoints

### Authentication Required for All

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/customers/` | List all customers |
| POST | `/api/customers/` | Create customer |
| GET | `/api/customers/<id>/history/` | Customer transactions |
| POST | `/api/transactions/` | Create transaction (atomic update) |
| GET | `/api/daily-summary/` | Today's statistics |

---

## 🗄️ Database Models

### Customer
- `id`, `shop` (FK User), `name`, `phone`, `total_balance`, `created_at`, `updated_at`

### Transaction
- `id`, `customer` (FK), `type` (CREDIT/DEBIT/SALE), `amount`, `description`
- `date_created`, `date_updated`, `entered_by` (FK User)

---

## 📱 Frontend Features

- ✅ Daily summary dashboard
- ✅ Customer list with balances
- ✅ Transaction history modal
- ✅ Floating Action Button (FAB) for quick entry
- ✅ Real-time search
- ✅ Dark mode support
- ✅ Mobile-optimized UI
- ✅ Offline support via service worker

---

## 🛠️ Development Commands

```bash
# Run Django development server
python manage.py runserver

# Create database migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Access Django shell
python manage.py shell

# Run tests
python manage.py test ledger

# Collect static files
python manage.py collectstatic

# Access admin
# User: http://localhost:8000/admin
# (Use superuser credentials)
```

### Docker Commands
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f web

# Execute command in container
docker-compose exec web python manage.py shell

# Rebuild containers
docker-compose up -d --build
```

---

## 🔐 Security Checklist

Before deploying to production:

- [ ] Update `DEBUG=False` in `.env`
- [ ] Generate strong `SECRET_KEY`
- [ ] Update `ALLOWED_HOSTS` to your domain
- [ ] Configure database password
- [ ] Set up HTTPS/SSL
- [ ] Configure CORS for production domain
- [ ] Enable Django security headers
- [ ] Set secure cookie flags
- [ ] Regular database backups
- [ ] Monitor logs for suspicious activity

---

## 📊 Key Business Logic

### Transaction Balance Updates
```python
# CREDIT: Increases balance
customer.total_balance += amount

# DEBIT: Decreases balance
customer.total_balance -= amount

# SALE: No balance change
# (Balance remains unchanged)
```

### Daily Summary Calculation
- Uses timezone-aware current time
- Groups transactions by type
- Returns totals for today only
- Uses Django ORM aggregation

---

## 🐛 Troubleshooting

### Port 8000 already in use
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Or use different port
python manage.py runserver 8001
```

### PostgreSQL connection error
- Check `.env` database credentials
- Ensure PostgreSQL is running
- For Docker: `docker-compose logs db`

### Service Worker not updating
```javascript
// Browser console:
navigator.serviceWorker.getRegistrations().then(r => 
  r.forEach(reg => reg.unregister())
);
// Then reload page
```

### Static files not loading
```bash
python manage.py collectstatic --noinput --clear
```

---

## 📖 Documentation Files

| File | Purpose |
|------|---------|
| [README.md](README.md) | Complete documentation |
| [GENERATION_SUMMARY.md](GENERATION_SUMMARY.md) | Project overview |
| [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md) | Requirements verification |

---

## 🔗 External Resources

- [Django Docs](https://docs.djangoproject.com/)
- [DRF Docs](https://www.django-rest-framework.org/)
- [PWA Docs](https://web.dev/progressive-web-apps/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Docker Docs](https://docs.docker.com/)

---

## 💡 Development Tips

### Test API Manually
```bash
# Create transaction
curl -X POST http://localhost:8000/api/transactions/ \
  -H "Content-Type: application/json" \
  -d '{"customer": 1, "type": "CREDIT", "amount": "500", "description": "Test"}'

# Get daily summary
curl http://localhost:8000/api/daily-summary/
```

### Create Sample Data
```bash
python manage.py shell
>>> from django.contrib.auth.models import User
>>> from ledger.models import Customer, Transaction
>>> from decimal import Decimal
>>> user = User.objects.first()
>>> customer = Customer.objects.create(shop=user, name="John", phone="9876543210")
>>> Transaction.objects.create(customer=customer, type="CREDIT", amount=Decimal("1000"), entered_by=user)
```

### Check Database
```bash
# Using Django ORM
python manage.py shell
>>> from ledger.models import Customer, Transaction
>>> Customer.objects.all().count()  # Count customers
>>> Transaction.objects.today()  # Today's transactions

# Or PostgreSQL directly
docker-compose exec db psql -U shop_ledger_user -d shop_ledger_db
psql> SELECT * FROM ledger_customer;
```

---

## 🚀 Production Deployment

### Environment Variables
```
DEBUG=False
SECRET_KEY=<strong-random-key>
DB_NAME=shop_ledger_db
DB_USER=shop_ledger_user
DB_PASSWORD=<strong-password>
DB_HOST=<db-server>
DB_PORT=5432
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
```

### Docker Production
```bash
# Build production image
docker build -t shop-ledger:latest .

# Run with environment file
docker run --env-file .env -p 8000:8000 shop-ledger:latest
```

### Using Gunicorn Directly
```bash
gunicorn shop_ledger.wsgi:application --bind 0.0.0.0:8000
```

### Nginx Configuration
```nginx
upstream django {
    server localhost:8000;
}

server {
    listen 80;
    server_name yourdomain.com;
    
    location /static/ {
        alias /path/to/staticfiles/;
    }
    
    location / {
        proxy_pass http://django;
    }
}
```

---

## 📈 Performance Optimization

### Database
- ✅ Indexes on frequently queried fields
- ✅ Atomic transactions with locking
- ✅ Efficient aggregation queries

### Frontend
- ✅ No external framework dependencies
- ✅ Service worker caching
- ✅ Minimal CSS/JS
- ✅ Optimized images

### Caching Strategy
- Static assets: Cache-first
- API calls: Network-first with offline fallback
- Cache versioning: Easy updates with version bump

---

## 🆘 Support

For detailed information:
1. Check [README.md](README.md) for comprehensive guide
2. Review [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md)
3. Check [GENERATION_SUMMARY.md](GENERATION_SUMMARY.md) for overview
4. Consult framework documentation

---

## 📋 Project Metadata

- **Framework**: Django 5.x
- **Database**: PostgreSQL 15
- **Frontend**: Vanilla JavaScript (ES6+)
- **Deployment**: Docker & Docker Compose
- **Status**: Production Ready ✅
- **Generated**: 2026-08-23

---

**Happy coding! 🚀**
