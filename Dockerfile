FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Collect static files
RUN cd backend && python manage.py collectstatic --noinput || true

EXPOSE 8000

CMD ["gunicorn", "--chdir", "backend", "shop_ledger.wsgi:application", "--bind", "0.0.0.0:8000"]
