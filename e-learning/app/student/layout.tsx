import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { ROLE_STUDENT, getStudentProfile, requireRole } from '@/lib/session';

export default async function StudentLayout({ children }: LayoutProps<'/student'>) {
  const { user } = await requireRole([ROLE_STUDENT]);
  const profile = await getStudentProfile(user.id);

  return (
    <DashboardShell role="student" userName={profile?.name || user.name || user.email}>
      {children}
    </DashboardShell>
  );
}
