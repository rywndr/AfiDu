"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchBar } from "@/components/shared/search-bar";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteMaterial, updateMaterial } from "@/lib/actions/payments";
import {
    useCanCreate,
    useCanUpdate,
    useCanDelete,
} from "@/lib/hooks/use-permission";
import { formatDate } from "@/lib/utils";
import {
    Plus,
    FileText,
    Presentation,
    Trash2,
    Pencil,
    BookOpen,
    ExternalLink,
    Link as LinkIcon,
} from "lucide-react";
import type {
    StudyMaterialWithAssignments,
    ClassRecord,
    Level,
    PaginatedResult,
} from "@/lib/types";

// Main Component
interface MaterialsPageClientProps {
    result: PaginatedResult<StudyMaterialWithAssignments>;
    classes: ClassRecord[];
    levels: Level[];
    initialSearch: string;
    initialFileType: string;
    initialClassId: string;
    initialLevelId: string;
}

export function MaterialsPageClient({
    result,
    classes,
    levels,
    initialSearch,
    initialFileType,
    initialClassId,
    initialLevelId,
}: MaterialsPageClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const canCreate = useCanCreate("materials");
    const canUpdate = useCanUpdate("materials");
    const canDelete = useCanDelete("materials");
    const [searchValue, setSearchValue] = useState(initialSearch);

    // Edit dialog state
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] =
        useState<StudyMaterialWithAssignments | null>(null);

    const handleSearch = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            const params = new URLSearchParams(searchParams.toString());
            if (searchValue.trim()) {
                params.set("search", searchValue.trim());
            } else {
                params.delete("search");
            }
            params.delete("page");
            router.push(`/materials?${params.toString()}`);
        },
        [searchValue, searchParams, router],
    );

    const handleFilterChange = useCallback(
        (key: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value && value !== "all") {
                params.set(key, value);
            } else {
                params.delete(key);
            }
            params.delete("page");
            router.push(`/materials?${params.toString()}`);
        },
        [searchParams, router],
    );

    const handlePageChange = useCallback(
        (page: number) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("page", String(page));
            router.push(`/materials?${params.toString()}`);
        },
        [searchParams, router],
    );

    const handleEdit = useCallback((material: StudyMaterialWithAssignments) => {
        setEditingMaterial(material);
        setEditDialogOpen(true);
    }, []);

    const handleEditDialogClose = useCallback((open: boolean) => {
        setEditDialogOpen(open);
        if (!open) {
            setEditingMaterial(null);
        }
    }, []);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Materi Pelajaran"
                description={`Total ${result.total} materi tersedia`}
            >
                {canCreate && (
                    <Button onClick={() => router.push("/materials/upload")}>
                        <Plus className="mr-1" />
                        Upload Materi
                    </Button>
                )}
            </PageHeader>

            <MaterialFilters
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                onSearchSubmit={handleSearch}
                selectedFileType={initialFileType}
                selectedClassId={initialClassId}
                selectedLevelId={initialLevelId}
                classes={classes}
                levels={levels}
                onFilterChange={handleFilterChange}
            />

            <MaterialTable
                materials={result.data}
                classes={classes}
                levels={levels}
                canUpdate={canUpdate}
                canDelete={canDelete}
                onEdit={handleEdit}
            />

            <PaginationControls
                page={result.page}
                totalPages={result.totalPages}
                onPageChange={handlePageChange}
            />

            {canUpdate && editingMaterial && (
                <EditMaterialDialog
                    key={editingMaterial.id}
                    open={editDialogOpen}
                    onOpenChange={handleEditDialogClose}
                    material={editingMaterial}
                />
            )}
        </div>
    );
}

// Material Table
interface MaterialTableProps {
    materials: StudyMaterialWithAssignments[];
    classes: ClassRecord[];
    levels: Level[];
    canUpdate?: boolean;
    canDelete?: boolean;
    onEdit?: (material: StudyMaterialWithAssignments) => void;
}

function MaterialTable({
    materials,
    classes,
    levels,
    canUpdate = false,
    canDelete = true,
    onEdit,
}: MaterialTableProps) {
    const router = useRouter();

    if (materials.length === 0) {
        return (
            <EmptyState
                icon={BookOpen}
                title="Belum ada materi"
                description="Upload materi pelajaran pertama untuk mulai membagikan ke kelas."
            />
        );
    }

    const handleDelete = async (id: string) => {
        const result = await deleteMaterial({ id });
        if (result.success) {
            toast.success("Materi berhasil dihapus");
            router.refresh();
        } else {
            toast.error(result.error ?? "Gagal menghapus materi");
        }
    };

    // Build lookup maps for class and level names
    const classMap = new Map(classes.map((c) => [c.id, c.name]));
    const levelMap = new Map(levels.map((l) => [l.id, l.name]));

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Judul</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Diupload Oleh</TableHead>
                    <TableHead>Ditugaskan Ke</TableHead>
                    <TableHead>Tanggal Upload</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {materials.map((material) => (
                    <MaterialTableRow
                        key={material.id}
                        material={material}
                        classMap={classMap}
                        levelMap={levelMap}
                        onEdit={
                            canUpdate && onEdit
                                ? () => onEdit(material)
                                : undefined
                        }
                        onDelete={
                            canDelete
                                ? () => handleDelete(material.id)
                                : undefined
                        }
                    />
                ))}
            </TableBody>
        </Table>
    );
}

// Material Table Row
interface MaterialTableRowProps {
    material: StudyMaterialWithAssignments;
    classMap: Map<string, string>;
    levelMap: Map<string, string>;
    onEdit?: () => void;
    onDelete?: () => void;
}

function MaterialTableRow({
    material,
    classMap,
    levelMap,
    onEdit,
    onDelete,
}: MaterialTableRowProps) {
    return (
        <TableRow>
            <TableCell>
                <div className="flex items-center gap-2">
                    <FileTypeIcon fileType={material.fileType} />
                    <div>
                        <p className="font-medium">{material.title}</p>
                        {material.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                                {material.description}
                            </p>
                        )}
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <FileTypeBadge fileType={material.fileType} />
            </TableCell>
            <TableCell className="text-sm">{material.uploader.name}</TableCell>
            <TableCell>
                <AssignmentDetails
                    assignments={material.assignments}
                    classMap={classMap}
                    levelMap={levelMap}
                />
            </TableCell>
            <TableCell className="text-sm">
                {formatDate(material.createdAt)}
            </TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Buka file"
                        onClick={() => window.open(material.fileUrl, "_blank")}
                    >
                        <ExternalLink />
                    </Button>
                    {onEdit && (
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Edit materi"
                            onClick={onEdit}
                        >
                            <Pencil />
                        </Button>
                    )}
                    {onDelete && (
                        <ConfirmDialog
                            title="Hapus Materi"
                            description={`Apakah Anda yakin ingin menghapus materi "${material.title}"? Tindakan ini tidak dapat dibatalkan.`}
                            onConfirm={onDelete}
                            trigger={
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Hapus materi"
                                >
                                    <Trash2 className="text-destructive" />
                                </Button>
                            }
                        />
                    )}
                </div>
            </TableCell>
        </TableRow>
    );
}

// File Type Icon
function FileTypeIcon({ fileType }: { fileType: string }) {
    if (fileType === "pdf") {
        return <FileText className="size-5 text-red-500 shrink-0" />;
    }
    return <Presentation className="size-5 text-orange-500 shrink-0" />;
}

// File Type Badge
function FileTypeBadge({ fileType }: { fileType: string }) {
    const label = fileType.toUpperCase();
    const variant = fileType === "pdf" ? "destructive" : "secondary";
    return <Badge variant={variant}>{label}</Badge>;
}

// Assignment Details
interface AssignmentDetailsProps {
    assignments: StudyMaterialWithAssignments["assignments"];
    classMap: Map<string, string>;
    levelMap: Map<string, string>;
}

function AssignmentDetails({
    assignments,
    classMap,
    levelMap,
}: AssignmentDetailsProps) {
    if (assignments.length === 0) {
        return (
            <span className="text-xs text-muted-foreground">
                Belum ditugaskan
            </span>
        );
    }

    const items: { label: string; variant: "outline" | "secondary" }[] = [];

    for (const assignment of assignments) {
        if (assignment.classId) {
            const className = classMap.get(assignment.classId);
            if (className) {
                items.push({ label: className, variant: "outline" });
            }
        }
        if (assignment.levelId) {
            const levelName = levelMap.get(assignment.levelId);
            if (levelName) {
                items.push({ label: levelName, variant: "secondary" });
            }
        }
    }

    // If found named assignments, show them
    if (items.length > 0) {
        return (
            <div className="flex flex-wrap gap-1">
                {items.map((item, idx) => (
                    <Badge key={idx} variant={item.variant} className="text-xs">
                        {item.label}
                    </Badge>
                ))}
            </div>
        );
    }

    // Fallback: show count if assignments exist but names couldn't be resolved
    return <Badge variant="outline">{assignments.length} penugasan</Badge>;
}

// Edit Material Dialog
interface EditMaterialDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    material: StudyMaterialWithAssignments;
}

function EditMaterialDialog({
    open,
    onOpenChange,
    material,
}: EditMaterialDialogProps) {
    const router = useRouter();
    const [serverError, setServerError] = useState<string | null>(null);
    const [fileType, setFileType] = useState<"pdf" | "ppt" | "pptx">(
        material.fileType,
    );

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({
        defaultValues: {
            title: material.title,
            description: material.description ?? "",
            fileUrl: material.fileUrl,
        },
    });

    const onSubmit = useCallback(
        async (data: {
            title: string;
            description: string;
            fileUrl: string;
        }) => {
            setServerError(null);

            const result = await updateMaterial({
                id: material.id,
                title: data.title,
                description: data.description || null,
                fileUrl: data.fileUrl,
                fileType,
                fileSize: material.fileSize,
            });

            if (result.success) {
                toast.success("Materi berhasil diperbarui!");
                router.refresh();
                onOpenChange(false);
            } else {
                const msg = result.error ?? "Gagal memperbarui materi";
                setServerError(msg);
                toast.error(msg);
            }
        },
        [material.id, material.fileSize, fileType, router, onOpenChange],
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Materi</DialogTitle>
                    <DialogDescription>
                        Perbarui informasi materi pelajaran.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="edit-title">Judul Materi</Label>
                        <Input
                            id="edit-title"
                            {...register("title", {
                                required: "Judul materi wajib diisi",
                            })}
                            placeholder="Contoh: Modul Listening Bab 1"
                        />
                        {errors.title && (
                            <p className="text-xs text-destructive">
                                {errors.title.message}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="edit-description">
                            Deskripsi (opsional)
                        </Label>
                        <Textarea
                            id="edit-description"
                            {...register("description")}
                            placeholder="Deskripsi singkat tentang materi ini..."
                            rows={3}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="edit-fileUrl">Link Google Drive</Label>
                        <div className="relative">
                            <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                                id="edit-fileUrl"
                                {...register("fileUrl", {
                                    required: "Link Google Drive wajib diisi",
                                })}
                                placeholder="https://drive.google.com/file/d/..."
                                type="url"
                                className="pl-9"
                            />
                        </div>
                        {errors.fileUrl && (
                            <p className="text-xs text-destructive">
                                {errors.fileUrl.message}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label>Tipe File</Label>
                        <Select
                            value={fileType}
                            onValueChange={(val: string | null) => {
                                if (val)
                                    setFileType(val as "pdf" | "ppt" | "pptx");
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <span className="truncate">
                                    {fileType.toUpperCase()}
                                </span>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pdf">PDF</SelectItem>
                                <SelectItem value="ppt">PPT</SelectItem>
                                <SelectItem value="pptx">PPTX</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {serverError && (
                        <p className="text-sm text-destructive">
                            {serverError}
                        </p>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// Material Filters
interface MaterialFiltersProps {
    searchValue: string;
    onSearchChange: (value: string) => void;
    onSearchSubmit: (e: React.FormEvent) => void;
    selectedFileType: string;
    selectedClassId: string;
    selectedLevelId: string;
    classes: ClassRecord[];
    levels: Level[];
    onFilterChange: (key: string, value: string) => void;
}

function MaterialFilters({
    searchValue,
    onSearchChange,
    onSearchSubmit,
    selectedFileType,
    selectedClassId,
    selectedLevelId,
    classes,
    levels,
    onFilterChange,
}: MaterialFiltersProps) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <SearchBar
                value={searchValue}
                onChange={onSearchChange}
                onSubmit={onSearchSubmit}
                placeholder="Cari judul materi..."
                className="flex-1 max-w-sm"
            />

            <div className="flex items-center gap-2 flex-wrap">
                <Select
                    value={selectedFileType || "all"}
                    onValueChange={(val: string | null) =>
                        onFilterChange("fileType", val ?? "all")
                    }
                >
                    <SelectTrigger className="w-28">
                        <span className="truncate">
                            {selectedFileType && selectedFileType !== "all"
                                ? selectedFileType.toUpperCase()
                                : "Semua Tipe"}
                        </span>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Tipe</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="ppt">PPT</SelectItem>
                        <SelectItem value="pptx">PPTX</SelectItem>
                    </SelectContent>
                </Select>

                {classes.length > 0 && (
                    <Select
                        value={selectedClassId || "all"}
                        onValueChange={(val: string | null) =>
                            onFilterChange("classId", val ?? "all")
                        }
                    >
                        <SelectTrigger className="w-36">
                            <span className="truncate">
                                {selectedClassId && selectedClassId !== "all"
                                    ? (classes.find(
                                          (cls) => cls.id === selectedClassId,
                                      )?.name ?? "Kelas")
                                    : "Semua Kelas"}
                            </span>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Kelas</SelectItem>
                            {classes.map((cls) => (
                                <SelectItem key={cls.id} value={cls.id}>
                                    {cls.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {levels.length > 0 && (
                    <Select
                        value={selectedLevelId || "all"}
                        onValueChange={(val: string | null) =>
                            onFilterChange("levelId", val ?? "all")
                        }
                    >
                        <SelectTrigger className="w-32">
                            <span className="truncate">
                                {selectedLevelId && selectedLevelId !== "all"
                                    ? (levels.find(
                                          (l) => l.id === selectedLevelId,
                                      )?.name ?? "Level")
                                    : "Semua Level"}
                            </span>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Level</SelectItem>
                            {levels.map((level) => (
                                <SelectItem key={level.id} value={level.id}>
                                    {level.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
        </div>
    );
}
