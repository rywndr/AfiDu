"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { PageHeader } from "@/components/shared/page-header";
import { createClass } from "@/lib/actions/classes";
import { zodResolver } from "@/lib/zod-resolver";
import {
    createClassSchema,
    type CreateClassInput,
} from "@/lib/validators/classes";
import type { AcademicYear } from "@/lib/types";
import { ArrowLeft } from "lucide-react";

// Props
interface CreateClassFormProps {
    academicYears: AcademicYear[];
    teachers: { id: string; name: string; email: string }[];
}

export function CreateClassForm({
    academicYears,
    teachers,
}: CreateClassFormProps) {
    const router = useRouter();
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<CreateClassInput>({
        resolver: zodResolver(createClassSchema),
        defaultValues: {
            name: "",
            academicYearId: "",
            teacherId: "",
            capacity: 30,
        },
    });

    const selectedAcademicYearId = watch("academicYearId");
    const selectedTeacherId = watch("teacherId");

    const onSubmit = useCallback(
        async (data: CreateClassInput) => {
            setServerError(null);
            const result = await createClass(data);
            if (result.success) {
                toast.success("Kelas berhasil dibuat!");
                router.push("/classes");
                router.refresh();
            } else {
                const msg = result.error ?? "Gagal membuat kelas";
                setServerError(msg);
                toast.error(msg);
            }
        },
        [router],
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title="Buat Kelas Baru"
                description="Isi informasi kelas baru di bawah ini."
            >
                <Button
                    variant="outline"
                    onClick={() => router.push("/classes")}
                >
                    <ArrowLeft className="mr-1" />
                    Kembali
                </Button>
            </PageHeader>

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="max-w-lg space-y-6"
            >
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
                                          (ay) =>
                                              ay.id === selectedAcademicYearId,
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
                                    ? (teachers.find(
                                          (t) => t.id === selectedTeacherId,
                                      )?.name ?? "Pilih guru")
                                    : "Pilih guru"}
                            </span>
                        </SelectTrigger>
                        <SelectContent>
                            {teachers.map((teacher) => (
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

                <div className="flex items-center gap-3 pt-2">
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Menyimpan..." : "Buat Kelas"}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push("/classes")}
                    >
                        Batal
                    </Button>
                </div>
            </form>
        </div>
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
