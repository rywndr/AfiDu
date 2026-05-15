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
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { updateClass } from "@/lib/actions/classes";
import { zodResolver } from "@/lib/zod-resolver";
import {
    updateClassSchema,
    type UpdateClassInput,
} from "@/lib/validators/classes";
import type { ClassWithDetails, AcademicYear } from "@/lib/types";

// Props
interface EditClassDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classRecord: ClassWithDetails;
    academicYears: AcademicYear[];
    allTeachers: { id: string; name: string; email: string }[];
}

// Main Component
export function EditClassDialog({
    open,
    onOpenChange,
    classRecord,
    academicYears,
    allTeachers,
}: EditClassDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Kelas</DialogTitle>
                    <DialogDescription>
                        Perbarui informasi kelas di bawah ini.
                    </DialogDescription>
                </DialogHeader>
                <EditClassForm
                    classRecord={classRecord}
                    academicYears={academicYears}
                    allTeachers={allTeachers}
                    onSuccess={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
}

// Edit Form
interface EditClassFormProps {
    classRecord: ClassWithDetails;
    academicYears: AcademicYear[];
    allTeachers: { id: string; name: string; email: string }[];
    onSuccess: () => void;
}

function EditClassForm({
    classRecord,
    academicYears,
    allTeachers,
    onSuccess,
}: EditClassFormProps) {
    const router = useRouter();
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<UpdateClassInput>({
        resolver: zodResolver(updateClassSchema),
        defaultValues: {
            id: classRecord.id,
            name: classRecord.name,
            academicYearId: classRecord.academicYearId,
            teacherId: classRecord.teacherId,
            capacity: classRecord.capacity,
        },
    });

    useEffect(() => {
        reset({
            id: classRecord.id,
            name: classRecord.name,
            academicYearId: classRecord.academicYearId,
            teacherId: classRecord.teacherId,
            capacity: classRecord.capacity,
        });
    }, [classRecord, reset]);

    const selectedAcademicYearId = watch("academicYearId");
    const selectedTeacherId = watch("teacherId");

    const onSubmit = useCallback(
        async (data: UpdateClassInput) => {
            setServerError(null);
            const result = await updateClass(data);
            if (result.success) {
                toast.success("Kelas berhasil diperbarui!");
                router.refresh();
                onSuccess();
            } else {
                const msg = result.error ?? "Gagal memperbarui kelas";
                setServerError(msg);
                toast.error(msg);
            }
        },
        [router, onSuccess],
    );

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <input type="hidden" {...register("id")} />

            <FormField label="Nama Kelas" error={errors.name?.message}>
                <Input
                    {...register("name")}
                    placeholder="Contoh: Kelas A1"
                    autoFocus
                />
            </FormField>

            <FormField
                label="Tahun Ajaran"
                error={errors.academicYearId?.message}
            >
                <Select
                    value={selectedAcademicYearId || ""}
                    onValueChange={(val: string | null) => {
                        if (val) {
                            setValue("academicYearId", val, {
                                shouldValidate: true,
                            });
                        }
                    }}
                >
                    <SelectTrigger className="w-full">
                        <span className="truncate">
                            {selectedAcademicYearId
                                ? (academicYears.find(
                                      (ay) => ay.id === selectedAcademicYearId,
                                  )?.year ?? "Pilih tahun ajaran")
                                : "Pilih tahun ajaran"}
                        </span>
                    </SelectTrigger>
                    <SelectContent>
                        {academicYears.map((ay) => (
                            <SelectItem key={ay.id} value={ay.id}>
                                {ay.year}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FormField>

            <FormField label="Guru" error={errors.teacherId?.message}>
                <Select
                    value={selectedTeacherId || ""}
                    onValueChange={(val: string | null) => {
                        if (val) {
                            setValue("teacherId", val, {
                                shouldValidate: true,
                            });
                        }
                    }}
                >
                    <SelectTrigger className="w-full">
                        <span className="truncate">
                            {selectedTeacherId
                                ? (allTeachers.find(
                                      (t) => t.id === selectedTeacherId,
                                  )?.name ?? "Pilih guru")
                                : "Pilih guru"}
                        </span>
                    </SelectTrigger>
                    <SelectContent>
                        {allTeachers.map((teacher) => (
                            <SelectItem key={teacher.id} value={teacher.id}>
                                {teacher.name} ({teacher.email})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FormField>

            <FormField label="Kapasitas" error={errors.capacity?.message}>
                <Input
                    type="number"
                    {...register("capacity", { valueAsNumber: true })}
                    placeholder="30"
                    min={1}
                    max={100}
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

// Shared form field wrapper
interface FormFieldProps {
    label: string;
    error?: string;
    children: React.ReactNode;
}

function FormField({ label, error, children }: FormFieldProps) {
    return (
        <div className="grid gap-2">
            <Label>{label}</Label>
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}
