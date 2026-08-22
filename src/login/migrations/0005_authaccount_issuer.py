"""
Add the ``issuer`` column better-auth 1.7 requires on account rows.

better-auth matches a credential account on
``(providerId == 'credential', issuer == 'local:credential', accountId == user.id)``
and enforces uniqueness on ``(issuer, accountId)`` rather than
``(providerId, accountId)``. Without the column, every e-learning sign-in fails
with "User not found".
"""

from django.db import migrations, models

CREDENTIAL_PROVIDER_ID = "credential"
CREDENTIAL_ISSUER = "local:credential"


def backfill_issuer(apps, schema_editor):
    AuthAccount = apps.get_model("login", "AuthAccount")

    updated = AuthAccount.objects.filter(
        provider_id=CREDENTIAL_PROVIDER_ID
    ).update(issuer=CREDENTIAL_ISSUER)
    if updated:
        print(f"  set issuer on {updated} credential account(s)")

    # any other provider gets the same synthetic scheme better-auth uses for
    # providers without an issuer of their own
    for account in AuthAccount.objects.exclude(provider_id=CREDENTIAL_PROVIDER_ID):
        account.issuer = f"local:{account.provider_id}"
        account.save(update_fields=["issuer"])


def clear_issuer(apps, schema_editor):
    """Reverse: the column is dropped right after, so just blank it."""
    AuthAccount = apps.get_model("login", "AuthAccount")
    AuthAccount.objects.update(issuer="")


class Migration(migrations.Migration):

    dependencies = [
        ("login", "0004_backfill_user_timestamps"),
    ]

    operations = [
        # one-off default for existing rows; the model itself has no default
        migrations.AddField(
            model_name="authaccount",
            name="issuer",
            field=models.CharField(
                default=CREDENTIAL_ISSUER,
                help_text="better-auth account issuer, e.g. 'local:credential'.",
                max_length=255,
            ),
            preserve_default=False,
        ),
        migrations.RunPython(backfill_issuer, clear_issuer),
        migrations.RemoveConstraint(
            model_name="authaccount",
            name="auth_account_provider_account_uniq",
        ),
        migrations.AddConstraint(
            model_name="authaccount",
            constraint=models.UniqueConstraint(
                fields=("issuer", "account_id"),
                name="auth_account_issuer_account_uniq",
            ),
        ),
        migrations.AddIndex(
            model_name="authaccount",
            index=models.Index(
                fields=["provider_id"], name="auth_account_provider_idx"
            ),
        ),
    ]
