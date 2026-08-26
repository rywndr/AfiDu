import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, ChevronRight, Clock, Users } from 'lucide-react';

import { EmptyState } from '@/components/dashboard/empty-state';
import { PageHeader } from '@/components/dashboard/page-header';
import { SurfaceCard } from '@/components/dashboard/surfaces';
import { CardContent } from '@/components/ui/card';
import { IconTile } from '@/components/ui/icon-tile';
import { formatDays, formatTimeRange } from '@/lib/format';
import { ROLE_SUPERUSER, ROLE_TEACHER, requireRole } from '@/lib/session';
import { listClasses } from '@/lib/study-materials';

export const metadata: Metadata = {
  title: 'Modules | AfiDu E-Learning',
};

export default async function TeacherModulePage() {
  await requireRole([ROLE_TEACHER, ROLE_SUPERUSER]);

  const classes = await listClasses();

  return (
    <>
      <PageHeader
        title="MODULE"
        description="Pick a class to manage the study materials its students can see."
      />

      {classes.length === 0 ? (
        <EmptyState icon={BookOpen} title="No classes yet">
          Classes are created in the internal AfiDu app. Add one there and it will show
          up here.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {classes.map((studentClass) => (
            <li key={studentClass.id}>
              <Link
                href={`/teacher/module/${studentClass.id}`}
                className="block rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-accent-warm/50"
              >
                <SurfaceCard className="h-full transition-shadow hover:shadow-accent">
                  <CardContent className="flex items-start gap-3.5 p-4 sm:gap-4 sm:p-5">
                    <IconTile tone="warm">
                      <BookOpen aria-hidden="true" strokeWidth={1.8} />
                    </IconTile>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-ink-strong">
                        {studentClass.name}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                        <Clock aria-hidden="true" className="size-3.5 shrink-0" />
                        <span className="truncate">
                          {formatTimeRange(studentClass.startTime, studentClass.endTime)}
                          {' · '}
                          {formatDays(studentClass.days)}
                        </span>
                      </p>
                      <p className="mt-2.5 flex items-center gap-3 text-xs font-semibold text-ink-soft">
                        <span className="flex items-center gap-1.5">
                          <Users aria-hidden="true" className="size-3.5" />
                          {studentClass.studentCount} student
                          {studentClass.studentCount === 1 ? '' : 's'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <BookOpen aria-hidden="true" className="size-3.5" />
                          {studentClass.materialCount} module
                          {studentClass.materialCount === 1 ? '' : 's'}
                        </span>
                      </p>
                    </div>
                    <ChevronRight
                      aria-hidden="true"
                      className="mt-1 size-5 shrink-0 text-ink-subtle"
                    />
                  </CardContent>
                </SurfaceCard>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
