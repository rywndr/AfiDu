"use client";

import { useState, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "destructive" | "default";
    onConfirm: () => void | Promise<void>;
    trigger: React.ReactNode;
}

export function ConfirmDialog({
    title,
    description,
    confirmLabel = "Hapus",
    cancelLabel = "Batal",
    variant = "destructive",
    onConfirm,
    trigger,
}: ConfirmDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleConfirm = useCallback(async () => {
        setLoading(true);
        try {
            await onConfirm();
            setOpen(false);
        } finally {
            setLoading(false);
        }
    }, [onConfirm]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<span />}>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={loading}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={variant}
                        onClick={handleConfirm}
                        disabled={loading}
                    >
                        {loading ? "Memproses..." : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
