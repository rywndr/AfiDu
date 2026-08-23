/**
 * The chrome around a form: the white section cards, the request error banner
 * and the submit row. Shared by the module and assignment forms so they stay
 * the same shape as each other.
 */
import type { ReactNode } from 'react';

import { AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-sm font-bold tracking-wide text-ink-strong uppercase">
      {children}
    </h2>
  );
}

/** One white card of a multi-section form, with an optional header action. */
export function FormSection({
  title,
  action,
  children,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-card sm:p-6 lg:p-8">
      {action ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeading>{title}</SectionHeading>
          {action}
        </div>
      ) : (
        <SectionHeading>{title}</SectionHeading>
      )}
      {children}
    </section>
  );
}

/** The two column field grid a section's fields sit in. */
export function FormGrid({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('mt-4 grid gap-4 sm:grid-cols-2', className)}>{children}</div>
  );
}

/** The dashed note that stands in for an empty list inside a section. */
export function FormEmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 rounded-xl border border-dashed border-shell-outline px-4 py-8 text-center text-sm text-ink-muted">
      {children}
    </p>
  );
}

const noticeClass = 'flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm';

/** Whatever went wrong with the request, as opposed to with a field. */
export function FormAlert({
  message,
  className,
}: {
  message: string | null;
  className?: string;
}) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className={cn(noticeClass, 'bg-destructive/10 text-destructive', className)}
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  );
}

/**
 * A standing caveat about the form itself rather than a failure, such as a
 * deployment where uploads are switched off.
 */
export function FormNotice({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        noticeClass,
        'bg-accent-warm-soft text-accent-warm-strong',
        className,
      )}
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {children}
    </p>
  );
}

export function FormSubmitRow({
  busy,
  className,
  children,
}: {
  busy: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('flex justify-stretch sm:justify-end', className)}>
      <Button type="submit" size="lg" disabled={busy} className="w-full sm:w-auto">
        {children}
      </Button>
    </div>
  );
}
