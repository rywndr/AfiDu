"use client";

import { useRouter } from "next/navigation";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deletePayment } from "@/lib/actions/payments";
import { formatRupiah, getMonthName } from "@/lib/utils";
import { Pencil, Trash2, CreditCard } from "lucide-react";
import type { PaymentWithStudent } from "@/lib/types";

interface PaymentTableProps {
    payments: PaymentWithStudent[];
    onEdit: (payment: PaymentWithStudent) => void;
}

export function PaymentTable({ payments, onEdit }: PaymentTableProps) {
    const router = useRouter();

    if (payments.length === 0) {
        return (
            <EmptyState
                icon={CreditCard}
                title="Belum ada data pembayaran"
                description="Tambahkan pembayaran untuk mulai melacak pembayaran siswa."
            />
        );
    }

    const handleDelete = async (id: string) => {
        const result = await deletePayment({ id });
        if (result.success) {
            router.refresh();
        }
    };

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Siswa</TableHead>
                    <TableHead>No. Siswa</TableHead>
                    <TableHead>Bulan</TableHead>
                    <TableHead>Tahun</TableHead>
                    <TableHead>Jumlah Tagihan</TableHead>
                    <TableHead>Jumlah Dibayar</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {payments.map((payment) => (
                    <PaymentTableRow
                        key={payment.id}
                        payment={payment}
                        onEdit={() => onEdit(payment)}
                        onDelete={() => handleDelete(payment.id)}
                    />
                ))}
            </TableBody>
        </Table>
    );
}

interface PaymentTableRowProps {
    payment: PaymentWithStudent;
    onEdit: () => void;
    onDelete: () => void;
}

function PaymentTableRow({ payment, onEdit, onDelete }: PaymentTableRowProps) {
    return (
        <TableRow>
            <TableCell className="font-medium">
                {payment.student.name}
            </TableCell>
            <TableCell className="font-mono text-xs">
                {payment.student.studentNumber}
            </TableCell>
            <TableCell>{getMonthName(payment.month)}</TableCell>
            <TableCell>{payment.year}</TableCell>
            <TableCell>{formatRupiah(payment.amount)}</TableCell>
            <TableCell>{formatRupiah(payment.paidAmount)}</TableCell>
            <TableCell>
                <StatusBadge status={payment.status} />
            </TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
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
                        description={`Apakah Anda yakin ingin menghapus data pembayaran ${payment.student.name} untuk ${getMonthName(payment.month)} ${payment.year}?`}
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
    );
}
