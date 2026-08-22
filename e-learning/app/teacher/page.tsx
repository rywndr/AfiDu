import type { Metadata } from 'next';

import { SignOutButton } from '@/components/sign-out-button';
import { ROLE_SUPERUSER, ROLE_TEACHER, requireRole } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Teacher dashboard | Afidu',
};

export default async function TeacherDashboardPage() {
  const session = await requireRole([ROLE_TEACHER, ROLE_SUPERUSER]);
  const { user } = session;

  return (
    <main className="flex flex-1 flex-col gap-8 px-6 py-10 sm:px-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Teacher dashboard</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {user.name || user.email}
          </h1>
        </div>
        <SignOutButton />
      </header>

      <dl className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <dt className="text-sm text-muted-foreground">Signed in as</dt>
          <dd className="mt-1 font-medium break-all">{user.email}</dd>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <dt className="text-sm text-muted-foreground">Role</dt>
          <dd className="mt-1 font-medium capitalize">{user.role}</dd>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <dt className="text-sm text-muted-foreground">Account</dt>
          <dd className="mt-1 font-medium">
            {user.emailVerified ? 'Verified' : 'Unverified'}
          </dd>
        </div>
      </dl>

      <p className="text-sm text-muted-foreground">
        Assignments, materials and grading will live here. Student records,
        scores and reports are managed in the internal admin app.
      </p>
    </main>
  );
}
