import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { BrandMark } from '@/components/dashboard/brand-mark';
import { DoodleBackdrop } from '@/components/dashboard/doodle-backdrop';
import { dashboardPathFor, getSession } from '@/lib/session';

import { LoginForm } from './login-form';
import { LoginIllustration } from './login-illustration';

export const metadata: Metadata = {
  title: 'Sign in | AfiDu E-Learning',
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(dashboardPathFor(session.user.role));

  return (
    <main className="isolate flex flex-1 flex-col items-center justify-center gap-6 bg-shell px-4 py-10">
      <DoodleBackdrop />

      <div className="grid w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-card sm:rounded-3xl md:grid-cols-2">
        <aside className="hidden flex-col bg-accent-primary p-8 text-white md:flex lg:p-10">
          <p className="text-xl font-bold tracking-[-0.02em] lg:text-2xl">
            Everything for class, in one place.
          </p>
          <div className="mt-8 flex flex-1 items-end justify-center">
            <LoginIllustration />
          </div>
        </aside>

        <div className="flex flex-col justify-center gap-8 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-7">
            <BrandMark size="sm" />

            <div>
              <p className="text-xs font-semibold tracking-wide text-accent-primary uppercase">
                Welcome back
              </p>
              <p className="mt-1.5 text-sm text-ink-muted">
                Use the account that is provided to you.
              </p>
            </div>
          </div>

          <LoginForm />
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 text-[0.7rem] text-ink-subtle">
        <p>Trouble signing in? Contact your teacher/admin.</p>
        <p>&copy; {new Date().getFullYear()} AfiDu. All rights reserved.</p>
      </div>
    </main>
  );
}
