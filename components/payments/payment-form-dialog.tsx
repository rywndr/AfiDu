"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
import { FormField } from "@/components/shared/form-field";
import { upsertPayment, addInstallment } from "@/lib/actions/payments";
import { zodResolver } from "@/lib/zod-resolver";
import {
    upsertPaymentSchema,
    type UpsertPaymentInput,
} from "@/lib/validators/classes";
import { formatRupiah, getMonthName } from "@/lib/utils";
import type { PaymentWithStudent, Student } from "@/lib/types";

// Types
type PaymentType = "full" | "installment";

interface PaymentFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    payment: PaymentWithStudent | null;
    students: Student[];
    defaultAmount: number;
    /** When set, the student selector is hidden and this student is used */
    fixedStudentId?: string;
    /** When set, the year input is hidden and this year is used */
    fixedYear?: number;
}

// Main Component
export function PaymentFormDialog({
    open,
    onOpenChange,
    payment,
    students,
    defaultAmount,
    fixedStudentId,
    fixedYear,
}: PaymentFormDialogProps) {
    const isEditing = payment !== null;

    const fixedStudent = fixedStudentId
        ? students.find((s) => s.id === fixedStudentId)
        : undefined;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Edit Pembayaran" : "Tambah Pembayaran"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? `Edit pembayaran untuk ${payment.student.name}`
                            : fixedStudent
                              ? `Buat catatan pembayaran baru untuk ${fixedStudent.name}.`
                              : "Buat catatan pembayaran baru untuk siswa."}
                    </DialogDescription>
                </DialogHeader>
                <PaymentForm
                    payment={payment}
                    students={students}
                    defaultAmount={defaultAmount}
                    onSuccess={() => onOpenChange(false)}
                    fixedStudentId={fixedStudentId}
                    fixedYear={fixedYear}
                />
            </DialogContent>
        </Dialog>
    );
}

// Payment Form
interface PaymentFormProps {
    payment: PaymentWithStudent | null;
    students: Student[];
    defaultAmount: number;
    onSuccess: () => void;
    fixedStudentId?: string;
    fixedYear?: number;
}

function PaymentForm({
    payment,
    students,
    defaultAmount,
    onSuccess,
    fixedStudentId,
    fixedYear,
}: PaymentFormProps) {
    const router = useRouter();
    const [serverError, setServerError] = useState<string | null>(null);
    const [paymentType, setPaymentType] = useState<PaymentType>(
        payment?.status === "partial" ? "installment" : "full",
    );
    const [initialInstallmentAmount, setInitialInstallmentAmount] =
        useState("");

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const effectiveYear = fixedYear ?? payment?.year ?? currentYear;

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<UpsertPaymentInput>({
        resolver: zodResolver(upsertPaymentSchema),
        defaultValues: {
            studentId: payment?.studentId ?? fixedStudentId ?? "",
            amount: payment?.amount ?? defaultAmount,
            month: payment?.month ?? currentMonth,
            year: effectiveYear,
            status: payment?.status ?? "unpaid",
            paidAmount: payment?.paidAmount ?? 0,
            notes: payment?.notes ?? "",
        },
    });

    useEffect(() => {
        const newYear = fixedYear ?? payment?.year ?? currentYear;
        reset({
            studentId: payment?.studentId ?? fixedStudentId ?? "",
            amount: payment?.amount ?? defaultAmount,
            month: payment?.month ?? currentMonth,
            year: newYear,
            status: payment?.status ?? "unpaid",
            paidAmount: payment?.paidAmount ?? 0,
            notes: payment?.notes ?? "",
        });
        setPaymentType(payment?.status === "partial" ? "installment" : "full");
        setInitialInstallmentAmount("");
        setServerError(null);
    }, [
        payment,
        defaultAmount,
        currentMonth,
        currentYear,
        reset,
        fixedStudentId,
        fixedYear,
    ]);

    const watchedAmount = watch("amount");

    const onSubmit = useCallback(
        async (data: UpsertPaymentInput) => {
            setServerError(null);

            // Determine actual status and paidAmount based on paymentType
            let finalStatus: "paid" | "unpaid" | "partial" = data.status;
            let finalPaidAmount = data.paidAmount;

            if (paymentType === "full") {
                finalStatus = "paid";
                finalPaidAmount = data.amount;
            } else if (paymentType === "installment") {
                // For installment payments, always create the payment record
                // with paidAmount=0 and status="unpaid" first. The actual
                // paid amount will be set by addInstallment which recalculates
                // from all installment records — this avoids the bug where
                // the initial paidAmount gets overwritten on the next
                // installment because addInstallment sums only from
                // the installment table.
                finalPaidAmount = 0;
                finalStatus = "unpaid";
            }

            // Create or update the payment record
            const result = await upsertPayment({
                ...data,
                status: finalStatus,
                paidAmount: finalPaidAmount,
            });

            if (!result.success) {
                const msg = result.error ?? "Gagal menyimpan pembayaran";
                setServerError(msg);
                toast.error(msg);
                return;
            }

            // If installment type with an initial amount, create an
            // installment record via addInstallment so it shows up in history
            // AND the paid total is properly tracked via the installment table.
            if (
                paymentType === "installment" &&
                !payment && // only for new payments, not edits
                result.data?.paymentId
            ) {
                const cleaned = initialInstallmentAmount.replace(/[^\d]/g, "");
                const parsedInstallment = parseInt(cleaned, 10);
                if (!isNaN(parsedInstallment) && parsedInstallment > 0) {
                    const installmentResult = await addInstallment({
                        paymentId: result.data.paymentId,
                        amount: parsedInstallment,
                        notes: "Pembayaran awal",
                    });

                    if (installmentResult.success) {
                        toast.success(
                            "Pembayaran berhasil dibuat! Cicilan pertama tercatat.",
                        );
                    } else {
                        // Payment was created but installment failed
                        toast.success("Pembayaran berhasil dibuat.");
                        toast.error(
                            installmentResult.error ??
                                "Gagal mencatat cicilan pertama. Tambahkan manual.",
                        );
                    }
                } else {
                    toast.success(
                        "Pembayaran berhasil dibuat sebagai cicilan (belum ada pembayaran awal).",
                    );
                }
            } else {
                toast.success("Pembayaran berhasil disimpan!");
            }

            router.refresh();
            onSuccess();
        },
        [router, onSuccess, paymentType, initialInstallmentAmount, payment],
    );

    // Hide student selector when fixedStudentId is set OR when editing
    const showStudentSelector = !payment && !fixedStudentId;
    // Hide year field when fixedYear is provided
    const showYearField = fixedYear === undefined;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            {showStudentSelector && (
                <FormField label="Siswa" error={errors.studentId?.message}>
                    <Select
                        value={watch("studentId")}
                        onValueChange={(val: string | null) => {
                            if (val) setValue("studentId", val);
                        }}
                    >
                        <SelectTrigger className="w-full">
                            <span className="truncate">
                                {watch("studentId")
                                    ? (students.find(
                                          (s) => s.id === watch("studentId"),
                                      )?.name ?? "Pilih siswa")
                                    : "Pilih siswa"}
                            </span>
                        </SelectTrigger>
                        <SelectContent>
                            {students.map((student) => (
                                <SelectItem key={student.id} value={student.id}>
                                    {student.name} ({student.studentNumber})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>
            )}

            <div
                className={`grid gap-4 ${showYearField ? "grid-cols-2" : "grid-cols-1"}`}
            >
                <FormField label="Bulan" error={errors.month?.message}>
                    <Select
                        value={String(watch("month"))}
                        onValueChange={(val: string | null) => {
                            if (val) setValue("month", parseInt(val, 10));
                        }}
                    >
                        <SelectTrigger className="w-full">
                            <span className="truncate">
                                {getMonthName(watch("month"))}
                            </span>
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(
                                (month) => (
                                    <SelectItem
                                        key={month}
                                        value={String(month)}
                                    >
                                        {getMonthName(month)}
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>
                </FormField>

                {showYearField && (
                    <FormField label="Tahun" error={errors.year?.message}>
                        <Input
                            type="number"
                            {...register("year", { valueAsNumber: true })}
                            min={2020}
                            max={2100}
                        />
                    </FormField>
                )}
            </div>

            {fixedYear !== undefined && (
                <div className="rounded-md bg-muted p-2.5 text-sm">
                    <span className="text-muted-foreground">Tahun: </span>
                    <span className="font-medium">{fixedYear}</span>
                </div>
            )}

            <FormField label="Jumlah Tagihan" error={errors.amount?.message}>
                <AmountInput
                    value={watchedAmount}
                    onChange={(val) => setValue("amount", val)}
                />
            </FormField>

            <FormField label="Tipe Pembayaran">
                <Select
                    value={paymentType}
                    onValueChange={(val: string | null) => {
                        if (!val) return;
                        const type = val as PaymentType;
                        setPaymentType(type);

                        if (type === "full") {
                            setValue("status", "paid");
                            setValue("paidAmount", watchedAmount);
                        } else {
                            setValue("status", "unpaid");
                            setValue("paidAmount", 0);
                        }
                    }}
                >
                    <SelectTrigger className="w-full">
                        <span className="truncate">
                            {paymentType === "full" ? "Bayar Lunas" : "Cicilan"}
                        </span>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="full">Bayar Lunas</SelectItem>
                        <SelectItem value="installment">Cicilan</SelectItem>
                    </SelectContent>
                </Select>
            </FormField>

            {paymentType === "installment" && !payment && (
                <FormField label="Pembayaran Awal (opsional)">
                    <AmountInput
                        value={
                            parseInt(
                                initialInstallmentAmount.replace(/[^\d]/g, ""),
                                10,
                            ) || 0
                        }
                        onChange={(val) =>
                            setInitialInstallmentAmount(String(val))
                        }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Jumlah ini akan dicatat sebagai cicilan pertama.
                        Kosongkan jika belum ada pembayaran awal.
                    </p>
                </FormField>
            )}

            {paymentType === "installment" && payment && (
                <div className="rounded-md bg-muted/60 p-3 text-sm">
                    <p className="text-muted-foreground text-xs">
                        Untuk menambah cicilan, tutup dialog ini dan klik baris
                        pembayaran untuk membuka detail cicilan.
                    </p>
                </div>
            )}

            <FormField label="Catatan (opsional)" error={errors.notes?.message}>
                <Input
                    {...register("notes")}
                    placeholder="Catatan tambahan..."
                />
            </FormField>

            {/* Summary */}
            <div className="rounded-md bg-muted p-3 text-sm">
                <span className="text-muted-foreground">Ringkasan: </span>
                <span className="font-medium">
                    {formatRupiah(watchedAmount)}
                </span>
                <span className="text-muted-foreground"> — </span>
                <span className="font-medium">
                    {paymentType === "full" ? (
                        "Bayar Lunas"
                    ) : (
                        <>
                            Cicilan
                            {initialInstallmentAmount &&
                            !payment &&
                            parseInt(
                                initialInstallmentAmount.replace(/[^\d]/g, ""),
                                10,
                            ) > 0
                                ? ` (pembayaran awal: ${formatRupiah(parseInt(initialInstallmentAmount.replace(/[^\d]/g, ""), 10))})`
                                : " (belum ada pembayaran)"}
                        </>
                    )}
                </span>
            </div>

            {serverError && (
                <p className="text-sm text-destructive">{serverError}</p>
            )}

            <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Menyimpan..." : "Simpan Pembayaran"}
                </Button>
            </DialogFooter>
        </form>
    );
}

// ---------------------------------------------------------------------------
// Amount Input (formats to Rupiah display)
// ---------------------------------------------------------------------------

interface AmountInputProps {
    value: number;
    onChange: (value: number) => void;
}

function AmountInput({ value, onChange }: AmountInputProps) {
    const [displayValue, setDisplayValue] = useState(String(value));

    useEffect(() => {
        setDisplayValue(String(value));
    }, [value]);

    const handleBlur = useCallback(() => {
        const cleaned = displayValue.replace(/[^\d]/g, "");
        const parsed = parseInt(cleaned, 10);
        const finalValue = Number.isNaN(parsed) ? 0 : parsed;
        onChange(finalValue);
        setDisplayValue(String(finalValue));
    }, [displayValue, onChange]);

    return (
        <div className="space-y-1">
            <div className="flex items-center gap-0">
                <span className="inline-flex h-8 items-center rounded-l-lg border border-r-0 border-input bg-muted px-2.5 text-sm text-muted-foreground">
                    Rp
                </span>
                <Input
                    value={displayValue}
                    onChange={(e) => setDisplayValue(e.target.value)}
                    onBlur={handleBlur}
                    className="rounded-l-none"
                    placeholder="0"
                />
            </div>
            <span className="block text-xs text-muted-foreground">
                {formatRupiah(value)}
            </span>
        </div>
    );
}
