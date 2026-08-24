import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const iconTileVariants = cva(
  'grid size-12 shrink-0 place-items-center rounded-2xl sm:size-14 [&_svg]:size-6 [&_svg]:shrink-0 sm:[&_svg]:size-7',
  {
    variants: {
      tone: {
        primary: 'bg-accent-primary-soft text-accent-primary',
        warm: 'bg-accent-warm-soft text-accent-warm-strong',
        cool: 'bg-accent-cool-soft text-accent-cool',
        danger: 'bg-destructive/10 text-destructive',
        neutral: 'bg-placeholder text-ink-soft',
      },
    },
    defaultVariants: {
      tone: 'primary',
    },
  },
);

/** Rounded, tinted square that holds a single icon. */
function IconTile({
  className,
  tone,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof iconTileVariants>) {
  return (
    <div
      data-slot="icon-tile"
      className={cn(iconTileVariants({ tone }), className)}
      {...props}
    />
  );
}

export { IconTile, iconTileVariants };
