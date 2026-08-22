import type { Metadata } from 'next';

import { SignOutButton } from '@/components/sign-out-button';
import { ROLE_STUDENT, getStudentProfile, requireRole } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Student dashboard | Afidu',
};

export default async function StudentDashboardPage() {
  const session = await requireRole([ROLE_STUDENT]);
  const { user } = session;
  const profile = await getStudentProfile(user.id);

  return (
    <main className="flex flex-1 flex-col gap-8 px-6 py-10 sm:px-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Student dashboard</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Hi, {profile?.name || user.name || user.email}
          </h1>
        </div>
        <SignOutButton />
      </header>

      {profile ? (
        <dl className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5">
            <dt className="text-sm text-muted-foreground">Level</dt>
            <dd className="mt-1 font-medium">{profile.level}</dd>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <dt className="text-sm text-muted-foreground">Class</dt>
            <dd className="mt-1 font-medium">
              {profile.className ?? 'Not assigned'}
            </dd>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <dt className="text-sm text-muted-foreground">Signed in as</dt>
            <dd className="mt-1 font-medium break-all">{user.email}</dd>
          </div>
        </dl>
      ) : (
        <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          This login is not linked to a student record yet, so your class and
          level are unknown. Ask your school to link it in the admin app.
        </p>
      )}

      <p className="text-sm text-muted-foreground">
        Your study materials and assignments will appear here.
      </p>
    </main>
  );
}
