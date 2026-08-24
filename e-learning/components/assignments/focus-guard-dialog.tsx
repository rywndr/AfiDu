'use client';

import { EyeOff } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/ui/icon-tile';
import { useTabAway } from '@/hooks/use-tab-away';
import { pluralize } from '@/lib/format';

export function FocusGuardDialog({ enabled }: { enabled: boolean }) {
  const { isAway, count, dismiss } = useTabAway({ enabled });

  return (
    <Dialog
      open={isAway}
      onOpenChange={(open) => {
        if (!open) dismiss();
      }}
      disablePointerDismissal
    >
      <DialogContent showCloseButton={false} className="gap-5 sm:max-w-md">
        <DialogHeader className="items-center text-center sm:items-start sm:text-left">
          <IconTile tone="warm">
            <EyeOff aria-hidden="true" strokeWidth={1.8} />
          </IconTile>
          <DialogTitle className="mt-4 text-base font-bold text-ink-strong sm:text-lg">
            Stay on this page
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-ink-muted">
            You left the assignment {count === 1 ? 'once' : pluralize(count, 'time')}. Please keep other tabs
            and apps closed until you hand this in.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" size="lg" onClick={dismiss}>
            Back to the assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
