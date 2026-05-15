"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    useCanCreate,
    useCanUpdate,
    useCanDelete,
} from "@/lib/hooks/use-permission";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import {
    createSubject,
    updateSubject,
    deleteSubject,
} from "@/lib/actions/settings";
import { Plus, Pencil, Trash2, BookOpen, Save, X } from "lucide-react";
import type { Subject } from "@/lib/types";

// Props
interface SubjectsCardProps {
    subjects: Subject[];
}

// SubjectsCard
export function SubjectsCard({ subjects }: SubjectsCardProps) {
    const router = useRouter();
    const canCreate = useCanCreate("subjects");
    const canUpdate = useCanUpdate("subjects");
    const canDelete = useCanDelete("subjects");
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const resetForm = useCallback(() => {
        setName("");
        setDescription("");
        setError(null);
        setAdding(false);
        setEditingId(null);
    }, []);

    const handleCreate = useCallback(async () => {
        if (!name.trim()) {
            setError("Nama mata pelajaran wajib diisi");
            return;
        }
        setLoading(true);
        setError(null);

        const result = await createSubject({
            name: name.trim(),
            description: description.trim() || undefined,
        });

        setLoading(false);

        if (result.success) {
            resetForm();
            router.refresh();
        } else {
            setError(result.error ?? "Gagal membuat mata pelajaran");
        }
    }, [name, description, router, resetForm]);

    const handleStartEdit = useCallback((subject: Subject) => {
        setEditingId(subject.id);
        setName(subject.name);
        setDescription(subject.description ?? "");
        setError(null);
        setAdding(false);
    }, []);

    const handleUpdate = useCallback(async () => {
        if (!editingId || !name.trim()) {
            setError("Nama mata pelajaran wajib diisi");
            return;
        }
        setLoading(true);
        setError(null);

        const result = await updateSubject({
            id: editingId,
            name: name.trim(),
            description: description.trim() || undefined,
        });

        setLoading(false);

        if (result.success) {
            resetForm();
            router.refresh();
        } else {
            setError(result.error ?? "Gagal memperbarui mata pelajaran");
        }
    }, [editingId, name, description, router, resetForm]);

    const handleDelete = useCallback(
        async (id: string) => {
            const result = await deleteSubject({ id });
            if (result.success) {
                router.refresh();
            }
        },
        [router],
    );

    const handleStartAdd = useCallback(() => {
        setAdding(true);
        setEditingId(null);
        setName("");
        setDescription("");
        setError(null);
    }, []);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="size-5" />
                            Kelola Mata Pelajaran
                        </CardTitle>
                    </div>
                    {canCreate && !adding && !editingId && (
                        <Button size="sm" onClick={handleStartAdd}>
                            <Plus className="mr-1" />
                            Tambah
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {(canCreate || canUpdate) && (adding || editingId) && (
                    <SubjectFormInline
                        isEditing={!!editingId}
                        name={name}
                        description={description}
                        error={error}
                        loading={loading}
                        onNameChange={setName}
                        onDescriptionChange={setDescription}
                        onSubmit={editingId ? handleUpdate : handleCreate}
                        onCancel={resetForm}
                    />
                )}

                {subjects.length === 0 ? (
                    <EmptyState
                        icon={BookOpen}
                        title="Belum ada mata pelajaran"
                        description="Tambahkan mata pelajaran untuk dapat menetapkannya ke kelas."
                    />
                ) : (
                    <SubjectsTable
                        subjects={subjects}
                        onEdit={canUpdate ? handleStartEdit : undefined}
                        onDelete={canDelete ? handleDelete : undefined}
                    />
                )}
            </CardContent>
        </Card>
    );
}

// SubjectFormInline
interface SubjectFormInlineProps {
    isEditing: boolean;
    name: string;
    description: string;
    error: string | null;
    loading: boolean;
    onNameChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onSubmit: () => void;
    onCancel: () => void;
}

function SubjectFormInline({
    isEditing,
    name,
    description,
    error,
    loading,
    onNameChange,
    onDescriptionChange,
    onSubmit,
    onCancel,
}: SubjectFormInlineProps) {
    return (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">
                {isEditing
                    ? "Edit Mata Pelajaran"
                    : "Tambah Mata Pelajaran Baru"}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label>Nama</Label>
                    <Input
                        value={name}
                        onChange={(e) => onNameChange(e.target.value)}
                        placeholder="Contoh: Speaking"
                        autoFocus
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Deskripsi (opsional)</Label>
                    <Input
                        value={description}
                        onChange={(e) => onDescriptionChange(e.target.value)}
                        placeholder="Deskripsi singkat..."
                    />
                </div>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    onClick={onSubmit}
                    disabled={loading || !name.trim()}
                >
                    {isEditing ? (
                        <>
                            <Save className="mr-1" />
                            {loading ? "Menyimpan..." : "Simpan Perubahan"}
                        </>
                    ) : (
                        <>
                            <Plus className="mr-1" />
                            {loading ? "Menambahkan..." : "Tambahkan"}
                        </>
                    )}
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={onCancel}
                    disabled={loading}
                >
                    <X className="mr-1" />
                    Batal
                </Button>
            </div>
        </div>
    );
}

// SubjectsTable
interface SubjectsTableProps {
    subjects: Subject[];
    onEdit?: (subject: Subject) => void;
    onDelete?: (id: string) => void;
}

function SubjectsTable({ subjects, onEdit, onDelete }: SubjectsTableProps) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    {(onEdit || onDelete) && (
                        <TableHead className="text-right">Aksi</TableHead>
                    )}
                </TableRow>
            </TableHeader>
            <TableBody>
                {subjects.map((subject) => (
                    <TableRow key={subject.id}>
                        <TableCell className="font-medium">
                            {subject.name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                            {subject.description || "—"}
                        </TableCell>
                        {(onEdit || onDelete) && (
                            <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                    {onEdit && (
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            aria-label="Edit mata pelajaran"
                                            onClick={() => onEdit(subject)}
                                        >
                                            <Pencil />
                                        </Button>
                                    )}
                                    {onDelete && (
                                        <ConfirmDialog
                                            title="Hapus Mata Pelajaran"
                                            description={`Apakah Anda yakin ingin menghapus "${subject.name}"? Mata pelajaran yang sudah ditetapkan ke kelas tidak dapat dihapus.`}
                                            onConfirm={() =>
                                                onDelete(subject.id)
                                            }
                                            trigger={
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    aria-label="Hapus mata pelajaran"
                                                >
                                                    <Trash2 className="text-destructive" />
                                                </Button>
                                            }
                                        />
                                    )}
                                </div>
                            </TableCell>
                        )}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
