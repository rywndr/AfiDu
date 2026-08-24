import { BookOpen, ClipboardCheck, type LucideIcon } from 'lucide-react';

import { Pill } from '@/components/dashboard/pill';
import { cn } from '@/lib/utils';

const linkTargets = {
  module: { icon: BookOpen, one: 'module', many: 'modules' },
  assignment: { icon: ClipboardCheck, one: 'assignment', many: 'assignments' },
} satisfies Record<string, { icon: LucideIcon; one: string; many: string }>;

/** The other kind of thing a card can point at. */
export type LinkTarget = keyof typeof linkTargets;

/**
 * Tells a student that this module and an assignment belong together, so the
 * dashboard feed shows the pair as a pair. Renders nothing without a link, which
 * is why the spacing is the caller's to set.
 */
export function LinkedNotice({
  to,
  titles,
  className,
}: {
  to: LinkTarget;
  titles: readonly string[];
  className?: string;
}) {
  if (titles.length === 0) return null;
  const { icon, one, many } = linkTargets[to];

  return (
    <Pill
      icon={icon}
      className={cn('max-w-full bg-accent-cool-soft text-accent-cool', className)}
    >
      <span className="truncate">
        Linked {titles.length === 1 ? one : many}: {titles.join(', ')}
      </span>
    </Pill>
  );
}
