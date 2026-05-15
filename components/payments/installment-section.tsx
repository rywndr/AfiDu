"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { addInstallment, deleteInstallment } from "@/lib/actions/payments";
import { formatRupiah, formatDate } from "@/lib/utils";
import { Plus, Trash2, Receipt } from "lucide-react";
import type { PaymentInstallment } from "@/lib/types";

// Props
interface InstallmentSectionProps {
    paymentId: string;
    paymentAmount: number;
    paidAmount: number;
    installments: PaymentInstallment[];
}

// InstallmentSection
export function InstallmentSection({
    paymentId,
    paymentAmount,
    paidAmount,
    installments,
}: InstallmentSectionProps) {
    const remaining = Math.max(0, paymentAmount - paidAmount);

    return (
        <div className="p-4 space-y-4">
            <InstallmentSummary
                paymentAmount={paymentAmount}
                paidAmount={paidAmount}
                remaining={remaining}
                installmentCount={installments.length}
            />

            {installments.length > 0 && (
                <InstallmentTable
                    installments={installments}
                    paymentId={paymentId}
                />
            )}

            {remaining > 0 && (
                <AddInstallmentForm
                    paymentId={paymentId}
                    remainingAmount={remaining}
                />
            )}

            {remaining <= 0 && installments.length > 0 && (
                <p className="text-sm text-green-600 font-medium text-center py-2">
                    ✓ Pembayaran sudah lunas
                </p>
            )}
        </div>
    );
}

// InstallmentSummary
interface InstallmentSummaryProps {
    paymentAmount: number;
    paidAmount: number;
    remaining: number;
    installmentCount: number;
}

function InstallmentSummary({
    paymentAmount,
    paidAmount,
    remaining,
    installmentCount,
}: InstallmentSummaryProps) {
    const percentage =
        paymentAmount > 0
            ? Math.min(100, Math.round((paidAmount / paymentAmount) * 100))
            : 0;

    return (
        <div className="rounded-lg border bg-background p-3">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Receipt className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Riwayat Cicilan</span>
                </div>
                <Badge variant="outline" className="text-xs">
                    {installmentCount} cicilan
                </Badge>
            </div>

            <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
                <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${percentage}%` }}
                />
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
                <SummaryItem
                    label="Tagihan"
                    value={formatRupiah(paymentAmount)}
                />
                <SummaryItem
                    label="Terbayar"
                    value={formatRupiah(paidAmount)}
                />
                <SummaryItem
                    label="Sisa"
                    value={formatRupiah(remaining)}
                    className={
                        remaining > 0 ? "text-destructive" : "text-green-600"
                    }
                />
            </div>
        </div>
    );
}

// SummaryItem
interface SummaryItemProps {
    label: string;
    value: string;
    className?: string;
}

function SummaryItem({ label, value, className }: SummaryItemProps) {
    return (
        <div className="text-center">
            <p className="text-muted-foreground">{label}</p>
            <p className={`font-medium ${className ?? ""}`}>{value}</p>
        </div>
    );
}

// InstallmentTable
interface InstallmentTableProps {
    installments: PaymentInstallment[];
    paymentId: string;
}

function InstallmentTable({ installments, paymentId }: InstallmentTableProps) {
    const router = useRouter();

    const handleDelete = useCallback(
        async (installmentId: string) => {
            const result = await deleteInstallment({
                id: installmentId,
                paymentId,
            });
            if (result.success) {
                toast.success("Cicilan berhasil dihapus");
                router.refresh();
            } else {
                toast.error(result.error ?? "Gagal menghapus cicilan");
            }
        },
        [paymentId, router],
    );

    return (
        <div className="rounded-md border overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-xs">No</TableHead>
                        <TableHead className="text-xs">Tanggal</TableHead>
                        <TableHead className="text-xs">Jumlah</TableHead>
                        <TableHead className="text-xs">Catatan</TableHead>
                        <TableHead className="text-xs text-right w-16">
                            Aksi
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {installments.map((inst, index) => (
                        <InstallmentRow
                            key={inst.id}
                            installment={inst}
                            index={index + 1}
                            onDelete={() => handleDelete(inst.id)}
                        />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

// InstallmentRow
interface InstallmentRowProps {
    installment: PaymentInstallment;
    index: number;
    onDelete: () => Promise<void>;
}

function InstallmentRow({ installment, index, onDelete }: InstallmentRowProps) {
    return (
        <TableRow>
            <TableCell className="text-xs tabular-nums">{index}</TableCell>
            <TableCell className="text-xs">
                {formatDate(installment.paidAt)}
            </TableCell>
            <TableCell className="text-xs font-medium tabular-nums">
                {formatRupiah(installment.amount)}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                {installment.notes || "—"}
            </TableCell>
            <TableCell className="text-right">
                <ConfirmDialog
                    title="Hapus Cicilan"
                    description={`Hapus cicilan sebesar ${formatRupiah(installment.amount)}? Sisa tagihan akan dihitung ulang secara otomatis.`}
                    onConfirm={onDelete}
                    trigger={
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Hapus cicilan"
                        >
                            <Trash2 className="text-destructive size-3.5" />
                        </Button>
                    }
                />
            </TableCell>
        </TableRow>
    );
}

// AddInstallmentForm
interface AddInstallmentFormProps {
    paymentId: string;
    remainingAmount: number;
}

function AddInstallmentForm({
    paymentId,
    remainingAmount,
}: AddInstallmentFormProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [amount, setAmount] = useState("");
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            setError(null);

            const parsed = parseInt(amount.replace(/[^\d]/g, ""), 10);
            if (isNaN(parsed) || parsed <= 0) {
                setError("Jumlah cicilan harus lebih dari 0");
                return;
            }

            setIsSubmitting(true);
            const result = await addInstallment({
                paymentId,
                amount: parsed,
                notes: notes.trim() || null,
            });
            setIsSubmitting(false);

            if (result.success) {
                toast.success("Cicilan berhasil ditambahkan!");
                setAmount("");
                setNotes("");
                setIsOpen(false);
                router.refresh();
            } else {
                const msg = result.error ?? "Gagal menambahkan cicilan";
                setError(msg);
                toast.error(msg);
            }
        },
        [paymentId, amount, notes, router],
    );

    if (!isOpen) {
        return (
            <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsOpen(true)}
            >
                <Plus className="mr-1 size-3.5" />
                Tambah Cicilan
            </Button>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="rounded-lg border bg-background p-3 space-y-3"
        >
            <p className="text-sm font-medium">Tambah Cicilan Baru</p>
            <p className="text-xs text-muted-foreground">
                Sisa tagihan: {formatRupiah(remainingAmount)}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                    <label
                        className="text-xs font-medium"
                        htmlFor="inst-amount"
                    >
                        Jumlah Cicilan
                    </label>
                    <div className="flex items-center gap-0">
                        <span className="inline-flex h-8 items-center rounded-l-lg border border-r-0 border-input bg-muted px-2 text-xs text-muted-foreground">
                            Rp
                        </span>
                        <Input
                            id="inst-amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder={String(remainingAmount)}
                            className="rounded-l-none h-8 text-sm"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium" htmlFor="inst-notes">
                        Catatan (opsional)
                    </label>
                    <Input
                        id="inst-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Catatan cicilan..."
                        className="h-8 text-sm"
                    />
                </div>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={isSubmitting}>
                    {isSubmitting ? "Menyimpan..." : "Simpan Cicilan"}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        setIsOpen(false);
                        setAmount("");
                        setNotes("");
                        setError(null);
                    }}
                    disabled={isSubmitting}
                >
                    Batal
                </Button>
            </div>
        </form>
    );
}
