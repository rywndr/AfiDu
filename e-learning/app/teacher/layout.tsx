import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { ROLE_SUPERUSER, ROLE_TEACHER, requireRole } from '@/lib/session';

export default async function TeacherLayout({ children }: LayoutProps<'/teacher'>) {
  const { user } = await requireRole([ROLE_TEACHER, ROLE_SUPERUSER]);

  return (
    <DashboardShell role="teacher" userName={user.name || user.email}>
      {children}
    </DashboardShell>
  );
}
