"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PaymentFormDialog } from "@/components/payments/payment-form-dialog";
import { InstallmentSection } from "@/components/payments/installment-section";
import { deletePayment } from "@/lib/actions/payments";
import { formatRupiah, getMonthName } from "@/lib/utils";
import {
    ArrowLeft,
    Plus,
    Pencil,
    Trash2,
    CreditCard,
    ChevronDown,
    ChevronRight,
} from "lucide-react";
import type {
    Student,
    Payment,
    PaymentWithStudent,
    PaymentWithInstallments,
} from "@/lib/types";

// Types
interface StudentPaymentsClientProps {
    student: Student;
    payments: PaymentWithInstallments[];
    defaultAmount: number;
    years: number[];
    selectedYear: number;
}

// Main Component
export function StudentPaymentsClient({
    student,
    payments,
    defaultAmount,
    years,
    selectedYear,
}: StudentPaymentsClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingPayment, setEditingPayment] =
        useState<PaymentWithStudent | null>(null);
    const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(
        null,
    );

    const handleOpenCreate = useCallback(() => {
        setEditingPayment(null);
        setDialogOpen(true);
    }, []);

    const handleEdit = useCallback(
        (payment: Payment) => {
            const paymentWithStudent: PaymentWithStudent = {
                ...payment,
                student,
            };
            setEditingPayment(paymentWithStudent);
            setDialogOpen(true);
        },
        [student],
    );

    const handleDialogClose = useCallback((open: boolean) => {
        setDialogOpen(open);
        if (!open) {
            setEditingPayment(null);
        }
    }, []);

    const handleDelete = useCallback(
        async (id: string) => {
            const result = await deletePayment({ id });
            if (result.success) {
                toast.success("Pembayaran berhasil dihapus");
                router.refresh();
            } else {
                toast.error(result.error ?? "Gagal menghapus pembayaran");
            }
        },
        [router],
    );

    const handleToggleExpand = useCallback((paymentId: string) => {
        setExpandedPaymentId((prev) => (prev === paymentId ? null : paymentId));
    }, []);

    const handleYearChange = useCallback(
        (value: string | null) => {
            if (!value) return;
            const params = new URLSearchParams(searchParams.toString());
            params.set("year", value);
            router.push(`/payments/${student.id}?${params.toString()}`);
        },
        [searchParams, router, student.id],
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title={`Pembayaran — ${student.name}`}
                description={`No. Siswa: ${student.studentNumber}`}
            >
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => router.push("/payments")}
                    >
                        <ArrowLeft className="mr-1" />
                        Kembali
                    </Button>
                    <Button onClick={handleOpenCreate}>
                        <Plus className="mr-1" />
                        Tambah Pembayaran
                    </Button>
                </div>
            </PageHeader>

            {/* Year Filter */}
            <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Tahun:</span>
                <Select
                    value={String(selectedYear)}
                    onValueChange={handleYearChange}
                >
                    <SelectTrigger className="w-32">
                        <span className="truncate">{selectedYear}</span>
                    </SelectTrigger>
                    <SelectContent>
                        {years.map((year) => (
                            <SelectItem key={year} value={String(year)}>
                                {year}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {payments.length === 0 ? (
                <EmptyState
                    icon={CreditCard}
                    title="Belum ada data pembayaran"
                    description={`Tidak ada pembayaran untuk tahun ${selectedYear}. Tambahkan pembayaran untuk ${student.name}.`}
                />
            ) : (
                <PaymentsTable
                    payments={payments}
                    expandedPaymentId={expandedPaymentId}
                    onToggleExpand={handleToggleExpand}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}

            <PaymentFormDialog
                open={dialogOpen}
                onOpenChange={handleDialogClose}
                payment={editingPayment}
                students={[student]}
                defaultAmount={defaultAmount}
                fixedStudentId={student.id}
                fixedYear={selectedYear}
            />
        </div>
    );
}

// PaymentsTable
interface PaymentsTableProps {
    payments: PaymentWithInstallments[];
    expandedPaymentId: string | null;
    onToggleExpand: (paymentId: string) => void;
    onEdit: (payment: Payment) => void;
    onDelete: (id: string) => Promise<void>;
}

function PaymentsTable({
    payments,
    expandedPaymentId,
    onToggleExpand,
    onEdit,
    onDelete,
}: PaymentsTableProps) {
    return (
        <div className="rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-10" />
                        <TableHead>Bulan</TableHead>
                        <TableHead>Tahun</TableHead>
                        <TableHead>Jumlah Tagihan</TableHead>
                        <TableHead>Jumlah Dibayar</TableHead>
                        <TableHead>Sisa</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Cicilan</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {payments.map((payment) => (
                        <PaymentRowGroup
                            key={payment.id}
                            payment={payment}
                            isExpanded={expandedPaymentId === payment.id}
                            onToggleExpand={() => onToggleExpand(payment.id)}
                            onEdit={() => onEdit(payment)}
                            onDelete={() => onDelete(payment.id)}
                        />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

// PaymentRowGroup
interface PaymentRowGroupProps {
    payment: PaymentWithInstallments;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onEdit: () => void;
    onDelete: () => Promise<void>;
}

function PaymentRowGroup({
    payment,
    isExpanded,
    onToggleExpand,
    onEdit,
    onDelete,
}: PaymentRowGroupProps) {
    const remaining = payment.amount - payment.paidAmount;
    const installmentCount = payment.installments?.length ?? 0;

    return (
        <>
            <TableRow className="cursor-pointer" onClick={onToggleExpand}>
                <TableCell>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand();
                        }}
                        aria-label={
                            isExpanded
                                ? "Tutup detail cicilan"
                                : "Lihat detail cicilan"
                        }
                    >
                        {isExpanded ? <ChevronDown /> : <ChevronRight />}
                    </Button>
                </TableCell>
                <TableCell>{getMonthName(payment.month)}</TableCell>
                <TableCell>
                    <Badge variant="secondary">{payment.year}</Badge>
                </TableCell>
                <TableCell>{formatRupiah(payment.amount)}</TableCell>
                <TableCell>{formatRupiah(payment.paidAmount)}</TableCell>
                <TableCell>
                    <span
                        className={
                            remaining > 0
                                ? "text-destructive font-medium"
                                : "text-green-600 font-medium"
                        }
                    >
                        {formatRupiah(Math.max(0, remaining))}
                    </span>
                </TableCell>
                <TableCell>
                    <StatusBadge status={payment.status} />
                </TableCell>
                <TableCell>
                    <Badge variant="outline" className="text-xs">
                        {installmentCount} cicilan
                    </Badge>
                </TableCell>
                <TableCell className="text-right">
                    <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={onEdit}
                            aria-label="Edit pembayaran"
                        >
                            <Pencil />
                        </Button>
                        <ConfirmDialog
                            title="Hapus Pembayaran"
                            description={`Hapus pembayaran ${getMonthName(payment.month)} ${payment.year}? Semua data cicilan juga akan dihapus.`}
                            onConfirm={onDelete}
                            trigger={
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Hapus pembayaran"
                                >
                                    <Trash2 className="text-destructive" />
                                </Button>
                            }
                        />
                    </div>
                </TableCell>
            </TableRow>

            {isExpanded && (
                <TableRow>
                    <TableCell colSpan={9} className="bg-muted/30 p-0">
                        <InstallmentSection
                            paymentId={payment.id}
                            paymentAmount={payment.amount}
                            paidAmount={payment.paidAmount}
                            installments={payment.installments ?? []}
                        />
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}
