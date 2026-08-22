'use client';

import { Progress as ProgressPrimitive } from '@base-ui/react/progress';

import { cn } from '@/lib/utils';

/** Determinate bar. Pass `value={null}` for an indeterminate state. */
function Progress({
  className,
  ...props
}: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn('w-full', className)}
      {...props}
    >
      <ProgressPrimitive.Track className="h-2 w-full overflow-hidden rounded-full bg-placeholder">
        <ProgressPrimitive.Indicator className="h-full rounded-full bg-accent-warm transition-[width] duration-200 ease-out" />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}

export { Progress };
