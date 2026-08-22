import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { dashboardPathFor, getSession } from '@/lib/session';

import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Sign in | Afidu',
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(dashboardPathFor(session.user.role));

  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-card-foreground">
            Afidu E-Learning
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in with the account your school provided.
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
