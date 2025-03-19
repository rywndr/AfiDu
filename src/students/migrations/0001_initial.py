# Generated by Django 5.1.7 on 2025-03-19 01:22

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Student',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('profile_photo', models.ImageField(blank=True, null=True, upload_to='profile_photos/')),
                ('name', models.CharField(max_length=100)),
                ('gender', models.CharField(choices=[('M', 'Male'), ('F', 'Female')], max_length=1)),
                ('age', models.PositiveIntegerField()),
                ('date_of_birth', models.DateField()),
                ('contact_number', models.CharField(max_length=20, validators=[django.core.validators.RegexValidator(message='Phone number must start with +62 and contain 9-13 digits.', regex='^\\+62\\d{9,13}$')])),
                ('address', models.CharField(max_length=255)),
                ('assigned_class', models.CharField(choices=[('A', 'Class A'), ('B', 'Class B'), ('C', 'Class C')], max_length=1)),
            ],
        ),
    ]
