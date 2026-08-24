import Link from 'next/link';
import {
  BookOpen,
  CircleCheck,
  ClipboardCheck,
  Clock,
  Inbox,
  Upload,
  type LucideIcon,
} from 'lucide-react';

import { EmptyState } from '@/components/dashboard/empty-state';
import { DashboardSection } from '@/components/dashboard/surfaces';
import { formatTimeAgo, pluralize } from '@/lib/format';
import {
  ACTIVITY_WINDOW_DAYS,
  activityEventKey,
  type TeacherActivityEvent,
} from '@/lib/teacher-activity';
import { cn } from '@/lib/utils';

type ActivityLine = {
  icon: LucideIcon;
  iconClass: string;
  summary: string;
  className: string;
  href: string;
};

function describe(event: TeacherActivityEvent): ActivityLine {
  switch (event.kind) {
    case 'submissions_received': {
      const { assignment } = event;
      return {
        icon: Inbox,
        iconClass: 'text-accent-warm-strong',
        summary: `${pluralize(event.count, 'submission')} received for ${assignment.title}`,
        className: assignment.className,
        href: `/teacher/assignment/${assignment.classId}/${assignment.id}`,
      };
    }
    case 'submissions_marked': {
      const { assignment } = event;
      return {
        icon: CircleCheck,
        iconClass: 'text-accent-primary',
        summary: `${pluralize(event.count, 'submission')} marked for ${assignment.title}`,
        className: assignment.className,
        href: `/teacher/assignment/${assignment.classId}/${assignment.id}`,
      };
    }
    case 'assignment_added': {
      const { assignment } = event;
      return {
        icon: ClipboardCheck,
        iconClass: 'text-accent-cool',
        summary: `${assignment.title} added`,
        className: assignment.className,
        href: `/teacher/assignment/${assignment.classId}/${assignment.id}`,
      };
    }
    case 'module_published': {
      const { material } = event;
      return {
        icon: BookOpen,
        iconClass: 'text-accent-primary',
        summary: `${material.title} published`,
        className: material.className,
        href: `/teacher/module/${material.classId}`,
      };
    }
    case 'module_added': {
      const { material } = event;
      return {
        icon: Upload,
        iconClass: 'text-ink-subtle',
        summary: `${material.title} uploaded`,
        className: material.className,
        href: `/teacher/module/${material.classId}`,
      };
    }
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

function ActivityRow({ event, now }: { event: TeacherActivityEvent; now: Date }) {
  const { icon: Icon, iconClass, summary, className, href } = describe(event);

  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-shell/60 focus-visible:ring-3 focus-visible:ring-accent-warm/50 sm:gap-3.5 sm:px-7"
    >
      <Icon
        aria-hidden="true"
        strokeWidth={1.8}
        className={cn('size-4 shrink-0', iconClass)}
      />

      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink-strong">{summary}</p>
        <p className="mt-0.5 truncate text-xs text-ink-subtle">{className}</p>
      </div>

      <span className="shrink-0 text-xs text-ink-muted">
        {formatTimeAgo(event.at, now)}
      </span>
    </Link>
  );
}

export function RecentActivity({
  events,
  now,
}: {
  events: TeacherActivityEvent[];
  now: Date;
}) {
  return (
    <DashboardSection
      title="Recent activity"
      aside={
        <span className="shrink-0 pt-1 text-xs font-semibold tracking-wide text-ink-subtle uppercase sm:text-sm">
          Last {ACTIVITY_WINDOW_DAYS} days
        </span>
      }
    >
      {events.length === 0 ? (
        <EmptyState icon={Clock} title="Quiet week" tone="neutral">
          Nothing has been handed in, marked or shared in the last{' '}
          {ACTIVITY_WINDOW_DAYS} days.
        </EmptyState>
      ) : (
        <ol className="divide-y divide-shell-divider overflow-hidden rounded-2xl bg-white shadow-card">
          {events.map((event) => (
            <li key={activityEventKey(event)}>
              <ActivityRow event={event} now={now} />
            </li>
          ))}
        </ol>
      )}
    </DashboardSection>
  );
}
