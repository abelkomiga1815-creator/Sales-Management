from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('ledger', '0003_business'),
    ]

    operations = [
        migrations.CreateModel(
            name='GoogleDriveConnection',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('token', models.JSONField()),
                ('connected_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('business', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='google_drive_connection', to='ledger.business')),
            ],
        ),
    ]
