from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models, transaction

# provider_id used by better-auth for email + password credentials.
CREDENTIAL_PROVIDER_ID = "credential"
# better-auth 1.7 requires an `issuer` on every account row and builds a
# synthetic one for providers that have none of their own
# (see createLocalAccountIssuer). Credential accounts must carry exactly this.
CREDENTIAL_ISSUER = "local:credential"


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        """
        create and save regular user (defaults to teacher role).
        """
        if not email:
            raise ValueError("The Email must be set")
        email = self.normalize_email(email)

        # default role and active
        extra_fields.setdefault("role", CustomUser.ROLE_TEACHER)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_staff", False)

        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra_fields):
        """
        create and save a superuser.
        """
        extra_fields.setdefault("role", CustomUser.ROLE_SUPERUSER)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if not extra_fields.get("is_staff"):
            raise ValueError("Superuser must have is_staff=True.")
        if not extra_fields.get("is_superuser"):
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)

    @transaction.atomic
    def create_student_user(self, email, password=None, **extra_fields):
        """
        Create the login a student uses on the public (Next.js) side.

        Students never sign in to this Django app, so ``CustomUser.password`` is
        left unusable on purpose; the credential hash lives on the
        ``AuthAccount`` row that better-auth reads. That keeps a single source of
        truth for student passwords and avoids two hashes drifting apart.
        """
        if not email:
            raise ValueError("The Email must be set")
        email = self.normalize_email(email)

        extra_fields["role"] = CustomUser.ROLE_STUDENT
        extra_fields["is_staff"] = False
        extra_fields["is_superuser"] = False
        extra_fields.setdefault("is_active", True)

        user = self.model(email=email, **extra_fields)
        user.set_unusable_password()
        user.save(using=self._db)
        user.set_student_password(password)
        return user


class CustomUser(AbstractBaseUser, PermissionsMixin):
    ROLE_TEACHER = "teacher"
    ROLE_SUPERUSER = "superuser"
    ROLE_STUDENT = "student"
    ROLE_CHOICES = [
        (ROLE_TEACHER, "Teacher"),
        (ROLE_SUPERUSER, "Superuser"),
        (ROLE_STUDENT, "Student"),
    ]

    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=30, blank=True)

    # built‑in flags
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default=ROLE_TEACHER,
        help_text=(
            "Teacher (internal staff), Superuser (internal admin), "
            "or Student (public e-learning login only)."
        ),
    )

    # Columns better-auth expects on its user model. Django owns the schema; the
    # Next app maps onto these names in its auth config.
    email_verified = models.BooleanField(default=False, db_column="email_verified")
    image = models.URLField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []  # email is already required

    objects = CustomUserManager()

    class Meta:
        verbose_name = "user"

    def __str__(self):
        return self.email

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # remember the stored hash so save() can tell when it changed
        self._initial_password = self.password

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

        # Staff sign in to both apps. Django owns their hash, so mirror it into
        # the credential account better-auth reads whenever it changes. Students
        # are skipped: their hash only ever lives on AuthAccount (their
        # CustomUser.password is unusable), so there is nothing to mirror.
        if self.has_usable_password() and self.password != self._initial_password:
            self.sync_credential_account()

        self._initial_password = self.password

    @property
    def name(self):
        """Single display name; better-auth requires a ``name`` on its user."""
        return f"{self.first_name} {self.last_name}".strip() or self.email

    @property
    def is_student(self):
        return self.role == self.ROLE_STUDENT

    @property
    def is_teacher(self):
        return self.role == self.ROLE_TEACHER

    def credential_account(self):
        return self.auth_accounts.filter(provider_id=CREDENTIAL_PROVIDER_ID).first()

    def _write_credential_account(self, hashed):
        account, created = AuthAccount.objects.get_or_create(
            user=self,
            provider_id=CREDENTIAL_PROVIDER_ID,
            defaults={
                "account_id": str(self.pk),
                "issuer": CREDENTIAL_ISSUER,
                "password": hashed,
            },
        )
        if not created:
            # better-auth matches on (providerId, issuer, accountId == user.id),
            # so all three have to be right, not just the hash
            account.account_id = str(self.pk)
            account.issuer = CREDENTIAL_ISSUER
            account.password = hashed
            account.save(
                update_fields=["account_id", "issuer", "password", "updated_at"]
            )
        return account

    def sync_credential_account(self):
        """
        Copy this user's Django hash onto the credential account, so the
        e-learning app can verify the same password. Used for staff.
        """
        if not self.has_usable_password():
            return None
        return self._write_credential_account(self.password)

    def set_student_password(self, raw_password):
        """
        Write ``raw_password`` to the credential ``AuthAccount`` using Django's
        configured hasher. The Next app is configured with a matching
        verify/hash pair, so both sides agree on the format.

        Students have no usable Django password, so this is the only place their
        credential is stored -- there is no second copy to drift.
        """
        hashed = make_password(raw_password) if raw_password else ""
        return self._write_credential_account(hashed)


class AuthAccount(models.Model):
    """
    better-auth ``account`` table. Holds the credential hash for students and
    any future OAuth provider links.
    """

    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="auth_accounts",
        db_column="user_id",
    )
    provider_id = models.CharField(max_length=100, db_column="provider_id")
    account_id = models.CharField(max_length=255, db_column="account_id")
    issuer = models.CharField(
        max_length=255,
        help_text="better-auth account issuer, e.g. 'local:credential'.",
    )
    password = models.CharField(max_length=255, blank=True)

    access_token = models.TextField(blank=True, null=True, db_column="access_token")
    refresh_token = models.TextField(blank=True, null=True, db_column="refresh_token")
    id_token = models.TextField(blank=True, null=True, db_column="id_token")
    access_token_expires_at = models.DateTimeField(
        blank=True, null=True, db_column="access_token_expires_at"
    )
    refresh_token_expires_at = models.DateTimeField(
        blank=True, null=True, db_column="refresh_token_expires_at"
    )
    scope = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True, db_column="created_at")
    updated_at = models.DateTimeField(auto_now=True, db_column="updated_at")

    class Meta:
        db_table = "auth_account"
        verbose_name = "auth account"
        constraints = [
            models.UniqueConstraint(
                fields=["issuer", "account_id"],
                name="auth_account_issuer_account_uniq",
            ),
        ]
        indexes = [
            models.Index(fields=["user"], name="auth_account_user_idx"),
            models.Index(fields=["provider_id"], name="auth_account_provider_idx"),
        ]

    def __str__(self):
        return f"{self.provider_id}:{self.account_id}"


class AuthSession(models.Model):
    """better-auth ``session`` table."""

    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="auth_sessions",
        db_column="user_id",
    )
    token = models.CharField(max_length=255, unique=True)
    expires_at = models.DateTimeField(db_column="expires_at")
    ip_address = models.CharField(
        max_length=45, blank=True, null=True, db_column="ip_address"
    )
    user_agent = models.TextField(blank=True, null=True, db_column="user_agent")

    created_at = models.DateTimeField(auto_now_add=True, db_column="created_at")
    updated_at = models.DateTimeField(auto_now=True, db_column="updated_at")

    class Meta:
        db_table = "auth_session"
        verbose_name = "auth session"
        indexes = [
            models.Index(fields=["user"], name="auth_session_user_idx"),
            models.Index(fields=["expires_at"], name="auth_session_expires_idx"),
        ]

    def __str__(self):
        return f"session for {self.user_id}"


class AuthVerification(models.Model):
    """better-auth ``verification`` table (email verification, password reset)."""

    identifier = models.CharField(max_length=255)
    value = models.TextField()
    expires_at = models.DateTimeField(db_column="expires_at")

    created_at = models.DateTimeField(auto_now_add=True, db_column="created_at")
    updated_at = models.DateTimeField(auto_now=True, db_column="updated_at")

    class Meta:
        db_table = "auth_verification"
        verbose_name = "auth verification"
        indexes = [
            models.Index(fields=["identifier"], name="auth_verification_ident_idx"),
            models.Index(fields=["expires_at"], name="auth_verification_expires_idx"),
        ]

    def __str__(self):
        return self.identifier
