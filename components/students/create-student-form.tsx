"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { FormField } from "@/components/shared/form-field";
import { GenderSelect } from "@/components/shared/gender-select";
import { createStudent } from "@/lib/actions/students";
import { zodResolver } from "@/lib/zod-resolver";
import {
    createStudentSchema,
    type CreateStudentInput,
} from "@/lib/validators/students";
import { ArrowLeft } from "lucide-react";
import type { Level, Semester } from "@/lib/types";

// Props
interface CreateStudentFormProps {
    levels: Level[];
    semesters: Semester[];
}

// Component
export function CreateStudentForm({
    levels,
    semesters,
}: CreateStudentFormProps) {
    const router = useRouter();
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<CreateStudentInput>({
        resolver: zodResolver(createStudentSchema),
        defaultValues: {
            name: "",
            gender: undefined,
            dateOfBirth: "",
            address: "",
            parentPhone: "",
            levelId: undefined,
            semesterId: undefined,
        },
    });

    const selectedGender = watch("gender");
    const selectedLevelId = watch("levelId");
    const selectedSemesterId = watch("semesterId");

    const onSubmit = useCallback(
        async (data: CreateStudentInput) => {
            setServerError(null);
            const result = await createStudent(data);
            if (result.success) {
                toast.success("Siswa berhasil ditambahkan!");
                router.push("/students");
                router.refresh();
            } else {
                const msg = result.error ?? "Gagal membuat siswa";
                setServerError(msg);
                toast.error(msg);
            }
        },
        [router],
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title="Tambah Siswa Baru"
                description="Isi informasi siswa baru di bawah ini. Nomor siswa akan dibuat otomatis."
            >
                <Button
                    variant="outline"
                    onClick={() => router.push("/students")}
                >
                    <ArrowLeft className="mr-1" />
                    Kembali
                </Button>
            </PageHeader>

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="max-w-lg space-y-6"
            >
                <FormField label="Nama Siswa" error={errors.name?.message}>
                    <Input
                        {...register("name")}
                        placeholder="Masukkan nama lengkap"
                        autoFocus
                    />
                </FormField>

                <FormField label="Jenis Kelamin" error={errors.gender?.message}>
                    <GenderSelect
                        value={selectedGender}
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

                {levels.length > 0 && semesters.length > 0 && (
                    <LevelSemesterFields
                        levels={levels}
                        semesters={semesters}
                        selectedLevelId={selectedLevelId}
                        selectedSemesterId={selectedSemesterId}
                        onLevelChange={(val) =>
                            setValue("levelId", val || undefined)
                        }
                        onSemesterChange={(val) =>
                            setValue("semesterId", val || undefined)
                        }
                    />
                )}

                {serverError && (
                    <p className="text-sm text-destructive">{serverError}</p>
                )}

                <div className="flex items-center gap-3 pt-2">
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Menyimpan..." : "Tambah Siswa"}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push("/students")}
                    >
                        Batal
                    </Button>
                </div>
            </form>
        </div>
    );
}

// LevelSemesterFields
interface LevelSemesterFieldsProps {
    levels: Level[];
    semesters: Semester[];
    selectedLevelId: string | undefined;
    selectedSemesterId: string | undefined;
    onLevelChange: (value: string) => void;
    onSemesterChange: (value: string) => void;
}

function LevelSemesterFields({
    levels,
    semesters,
    selectedLevelId,
    selectedSemesterId,
    onLevelChange,
    onSemesterChange,
}: LevelSemesterFieldsProps) {
    return (
        <>
            <FormField label="Level Awal (opsional)">
                <Select
                    value={selectedLevelId ?? ""}
                    onValueChange={(val: string | null) => {
                        if (val) onLevelChange(val);
                    }}
                >
                    <SelectTrigger className="w-full">
                        <span className="truncate">
                            {selectedLevelId
                                ? (levels.find((l) => l.id === selectedLevelId)
                                      ?.name ?? "Pilih level")
                                : "Pilih level"}
                        </span>
                    </SelectTrigger>
                    <SelectContent>
                        {levels.map((level) => (
                            <SelectItem key={level.id} value={level.id}>
                                {level.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FormField>

            {selectedLevelId && (
                <FormField label="Semester">
                    <Select
                        value={selectedSemesterId ?? ""}
                        onValueChange={(val: string | null) => {
                            if (val) onSemesterChange(val);
                        }}
                    >
                        <SelectTrigger className="w-full">
                            <span className="truncate">
                                {selectedSemesterId
                                    ? (semesters.find(
                                          (s) => s.id === selectedSemesterId,
                                      )?.name ?? "Pilih semester")
                                    : "Pilih semester"}
                            </span>
                        </SelectTrigger>
                        <SelectContent>
                            {semesters.map((sem) => (
                                <SelectItem key={sem.id} value={sem.id}>
                                    {sem.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>
            )}
        </>
    );
}
