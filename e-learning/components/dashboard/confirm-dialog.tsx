'use client';

import type { ReactNode } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/ui/icon-tile';

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  icon?: LucideIcon;
  tone?: 'primary' | 'warm' | 'cool';
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'default' | 'destructive';
  pending?: boolean;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  tone = 'warm',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'destructive',
  pending = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton={false} className="gap-5 sm:max-w-md">
        <DialogHeader className="items-center text-center sm:items-start sm:text-left">
          {Icon ? (
            <IconTile tone={tone}>
              <Icon aria-hidden="true" strokeWidth={1.8} />
            </IconTile>
          ) : null}
          <DialogTitle className="mt-4 text-base font-bold text-ink-strong sm:text-lg">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-ink-muted">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose
            disabled={pending}
            render={<Button type="button" variant="outline" size="lg" />}
          >
            {cancelLabel}
          </DialogClose>
          <Button
            type="button"
            variant={confirmVariant}
            size="lg"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
