"""Isolated settings for tests; never connect a test run to Neon or B2."""

import os

for variable in (
    "B2_ENDPOINT_URL",
    "B2_REGION_NAME",
    "B2_BUCKET_NAME",
    "B2_KEY_ID",
    "B2_APPLICATION_KEY",
    "B2_PUBLIC_URL",
):
    # An existing empty value prevents python-dotenv from loading real B2
    # credentials from the developer's .env while importing base settings.
    os.environ[variable] = ""

from .settings import *  # noqa: E402,F403


DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "study_materials": {
        "BACKEND": "django.core.files.storage.FileSystemStorage"
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"
    },
}

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
