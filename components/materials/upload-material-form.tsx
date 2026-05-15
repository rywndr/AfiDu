"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { createMaterial, assignMaterial } from "@/lib/actions/payments";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { useSession } from "@/lib/auth-client";
import { ArrowLeft, Link as LinkIcon } from "lucide-react";
import type { ClassRecord, Level } from "@/lib/types";

// Google Drive URL validation schema
const GOOGLE_DRIVE_PATTERNS = [
    /^https?:\/\/drive\.google\.com\//,
    /^https?:\/\/docs\.google\.com\//,
];

function isGoogleDriveUrl(url: string): boolean {
    return GOOGLE_DRIVE_PATTERNS.some((pattern) => pattern.test(url));
}

const uploadMaterialSchema = z.object({
    title: z
        .string()
        .min(1, "Judul materi wajib diisi")
        .max(255, "Judul terlalu panjang"),
    description: z
        .string()
        .max(1000, "Deskripsi terlalu panjang")
        .optional()
        .nullable(),
    fileUrl: z
        .string()
        .min(1, "Link Google Drive wajib diisi")
        .url("Harus berupa URL yang valid")
        .refine(isGoogleDriveUrl, {
            message:
                "Hanya link dari Google Drive yang diperbolehkan (drive.google.com atau docs.google.com)",
        }),
});

type UploadMaterialFormValues = z.infer<typeof uploadMaterialSchema>;

// Props
interface UploadMaterialFormProps {
    classes?: ClassRecord[];
    levels?: Level[];
}

// Main Component
export function UploadMaterialForm({
    classes = [],
    levels = [],
}: UploadMaterialFormProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const [serverError, setServerError] = useState<string | null>(null);
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [selectedLevelId, setSelectedLevelId] = useState<string>("");
    const [selectedFileType, setSelectedFileType] = useState<
        "pdf" | "ppt" | "pptx"
    >("pdf");

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<UploadMaterialFormValues>({
        resolver: zodResolver(uploadMaterialSchema),
        defaultValues: {
            title: "",
            description: "",
            fileUrl: "",
        },
    });

    const onSubmit = useCallback(
        async (data: UploadMaterialFormValues) => {
            setServerError(null);

            const userId = session?.user?.id;
            if (!userId) {
                setServerError("Sesi tidak valid. Silakan login ulang.");
                return;
            }

            const result = await createMaterial({
                title: data.title,
                description: data.description,
                fileUrl: data.fileUrl,
                fileType: selectedFileType,
                fileSize: null,
                uploadedBy: userId,
                classId: selectedClassId || undefined,
                levelId: selectedLevelId || undefined,
            });

            if (!result.success) {
                const msg = result.error ?? "Gagal mengupload materi";
                setServerError(msg);
                toast.error(msg);
                return;
            }

            toast.success("Materi berhasil diupload!");
            router.push("/materials");
            router.refresh();
        },
        [router, session, selectedClassId, selectedLevelId, selectedFileType],
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title="Upload Materi Baru"
                description="Isi informasi materi pelajaran yang ingin diupload. Hanya link dari Google Drive yang didukung."
            >
                <Button
                    variant="outline"
                    onClick={() => router.push("/materials")}
                >
                    <ArrowLeft className="mr-1" />
                    Kembali
                </Button>
            </PageHeader>

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="max-w-lg space-y-6"
            >
                <FormField label="Judul Materi" error={errors.title?.message}>
                    <Input
                        {...register("title")}
                        placeholder="Contoh: Modul Listening Bab 1"
                        autoFocus
                    />
                </FormField>

                <FormField
                    label="Deskripsi (opsional)"
                    error={errors.description?.message}
                >
                    <Textarea
                        {...register("description")}
                        placeholder="Deskripsi singkat tentang materi ini..."
                        rows={3}
                    />
                </FormField>

                <FormField
                    label="Link Google Drive"
                    error={errors.fileUrl?.message}
                >
                    <div className="relative">
                        <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            {...register("fileUrl")}
                            placeholder="https://drive.google.com/file/d/..."
                            type="url"
                            className="pl-9"
                        />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Hanya link dari Google Drive (drive.google.com atau
                        docs.google.com) yang diterima.
                    </p>
                </FormField>

                <div className="grid gap-2">
                    <Label>Tipe File</Label>
                    <Select
                        value={selectedFileType}
                        onValueChange={(val: string | null) => {
                            if (val)
                                setSelectedFileType(
                                    val as "pdf" | "ppt" | "pptx",
                                );
                        }}
                    >
                        <SelectTrigger className="w-full">
                            <span className="truncate">
                                {selectedFileType.toUpperCase()}
                            </span>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pdf">PDF</SelectItem>
                            <SelectItem value="ppt">PPT</SelectItem>
                            <SelectItem value="pptx">PPTX</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        Pilih tipe file yang sesuai dengan materi yang diupload.
                    </p>
                </div>

                {/* Assignment fields */}
                {classes.length > 0 && (
                    <FormField label="Ditugaskan ke Kelas (opsional)">
                        <Select
                            value={selectedClassId || "none"}
                            onValueChange={(val: string | null) => {
                                setSelectedClassId(
                                    val === "none" ? "" : (val ?? ""),
                                );
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <span className="truncate">
                                    {selectedClassId
                                        ? (classes.find(
                                              (c) => c.id === selectedClassId,
                                          )?.name ?? "Pilih kelas")
                                        : "Tanpa kelas"}
                                </span>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">
                                    Tanpa kelas
                                </SelectItem>
                                {classes.map((cls) => (
                                    <SelectItem key={cls.id} value={cls.id}>
                                        {cls.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                )}

                {levels.length > 0 && (
                    <FormField label="Ditugaskan ke Level (opsional)">
                        <Select
                            value={selectedLevelId || "none"}
                            onValueChange={(val: string | null) => {
                                setSelectedLevelId(
                                    val === "none" ? "" : (val ?? ""),
                                );
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <span className="truncate">
                                    {selectedLevelId
                                        ? (levels.find(
                                              (l) => l.id === selectedLevelId,
                                          )?.name ?? "Pilih level")
                                        : "Tanpa level"}
                                </span>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">
                                    Tanpa level
                                </SelectItem>
                                {levels.map((level) => (
                                    <SelectItem key={level.id} value={level.id}>
                                        {level.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                )}

                {serverError && (
                    <p className="text-sm text-destructive">{serverError}</p>
                )}

                <div className="flex items-center gap-3 pt-2">
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Mengupload..." : "Upload Materi"}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push("/materials")}
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
