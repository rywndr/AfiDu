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
import { FormField } from "@/components/shared/form-field";
import { GenderSelect } from "@/components/shared/gender-select";
import { updateStudent } from "@/lib/actions/students";
import { zodResolver } from "@/lib/zod-resolver";
import {
    updateStudentSchema,
    type UpdateStudentInput,
} from "@/lib/validators/students";
import type { Student } from "@/lib/types";

// Props
interface StudentFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    student: Student;
}

export function StudentFormDialog({
    open,
    onOpenChange,
    student,
}: StudentFormDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Edit Siswa</DialogTitle>
                    <DialogDescription>
                        Perbarui informasi siswa di bawah ini.
                    </DialogDescription>
                </DialogHeader>
                <EditStudentForm
                    student={student}
                    onSuccess={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
}

// Edit Form
interface EditStudentFormProps {
    student: Student;
    onSuccess: () => void;
}

function EditStudentForm({ student, onSuccess }: EditStudentFormProps) {
    const router = useRouter();
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<UpdateStudentInput>({
        resolver: zodResolver(updateStudentSchema),
        defaultValues: {
            id: student.id,
            name: student.name,
            studentNumber: student.studentNumber,
            gender: student.gender ?? undefined,
            dateOfBirth: student.dateOfBirth ?? "",
            address: student.address ?? "",
            parentPhone: student.parentPhone ?? "",
        },
    });

    useEffect(() => {
        reset({
            id: student.id,
            name: student.name,
            studentNumber: student.studentNumber,
            gender: student.gender ?? undefined,
            dateOfBirth: student.dateOfBirth ?? "",
            address: student.address ?? "",
            parentPhone: student.parentPhone ?? "",
        });
    }, [student, reset]);

    const onSubmit = useCallback(
        async (data: UpdateStudentInput) => {
            setServerError(null);
            const result = await updateStudent(data);
            if (result.success) {
                toast.success("Siswa berhasil diperbarui!");
                router.refresh();
                onSuccess();
            } else {
                const msg = result.error ?? "Gagal memperbarui siswa";
                setServerError(msg);
                toast.error(msg);
            }
        },
        [router, onSuccess],
    );

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <input type="hidden" {...register("id")} />

            <FormField label="Nama Siswa" error={errors.name?.message}>
                <Input
                    {...register("name")}
                    placeholder="Masukkan nama lengkap"
                    autoFocus
                />
            </FormField>

            <FormField
                label="Nomor Siswa"
                error={errors.studentNumber?.message}
            >
                <Input
                    {...register("studentNumber")}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                    title="Nomor siswa dibuat otomatis dan tidak dapat diubah"
                />
            </FormField>

            <FormField label="Jenis Kelamin" error={errors.gender?.message}>
                <GenderSelect
                    value={watch("gender") ?? undefined}
                    onChange={(val) => setValue("gender", val)}
                />
            </FormField>

            <FormField
                label="Tanggal Lahir"
                error={errors.dateOfBirth?.message}
            >
                <Input type="date" {...register("dateOfBirth")} />
            </FormField>

            <FormField
                label="Alamat (opsional)"
                error={errors.address?.message}
            >
                <Input
                    {...register("address")}
                    placeholder="Alamat tempat tinggal"
                />
            </FormField>

            <FormField
                label="No. Telepon Orang Tua (opsional)"
                error={errors.parentPhone?.message}
            >
                <Input
                    {...register("parentPhone")}
                    placeholder="Contoh: 08123456789"
                    type="tel"
                />
            </FormField>

            {serverError && (
                <p className="text-sm text-destructive">{serverError}</p>
            )}

            <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
            </DialogFooter>
        </form>
    );
}
