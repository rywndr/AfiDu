import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';

import { db } from '@/db';
import { schema } from '@/db/schema';
import { hashDjangoPassword, verifyDjangoPassword } from '@/lib/django-password';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    // maps better-auth's user/account/session/verification models onto the
    // Django-owned tables
    schema,
  }),

  emailAndPassword: {
    enabled: true,
    // Accounts are provisioned by the Django app (see the
    // `create_test_user` / `provision_student_logins` commands). Nobody signs
    // themselves up here -- and the Django user table has NOT NULL columns
    // this app never fills in, so an insert would fail anyway.
    disableSignUp: true,
    password: {
      hash: hashDjangoPassword,
      verify: ({ hash, password }) => verifyDjangoPassword(hash, password),
    },
  },

  user: {
    // Django column names. better-auth resolves each logical field through this
    // map, then indexes the drizzle table by the result.
    fields: {
      // Django splits the name in two; better-auth wants a single `name`
      name: 'first_name',
      emailVerified: 'email_verified',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    additionalFields: {
      // needed to route a signed-in user to the right dashboard
      role: {
        type: 'string',
        required: false,
        input: false,
      },
    },
  },

  account: {
    fields: {
      userId: 'user_id',
      providerId: 'provider_id',
      accountId: 'account_id',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      idToken: 'id_token',
      accessTokenExpiresAt: 'access_token_expires_at',
      refreshTokenExpiresAt: 'refresh_token_expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },

  session: {
    fields: {
      userId: 'user_id',
      expiresAt: 'expires_at',
      ipAddress: 'ip_address',
      userAgent: 'user_agent',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },

  verification: {
    fields: {
      expiresAt: 'expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },

  advanced: {
    database: {
      // Django's primary keys are bigint identity columns, so the database
      // assigns ids rather than better-auth generating strings
      generateId: 'serial',
    },
  },

  // Keeps cookie writes compatible with every Next.js request context.
  plugins: [nextCookies()],
});

export type SessionUser = typeof auth.$Infer.Session.user;
