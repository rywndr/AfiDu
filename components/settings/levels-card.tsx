"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { createLevel, updateLevel, deleteLevel } from "@/lib/actions/settings";
import { Plus, Pencil, Trash2, Layers, Save, X } from "lucide-react";
import type { Level } from "@/lib/types";

// Props
interface LevelsCardProps {
    levels: Level[];
}

// LevelsCard
export function LevelsCard({ levels }: LevelsCardProps) {
    const router = useRouter();
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [order, setOrder] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const resetForm = useCallback(() => {
        setName("");
        setDescription("");
        setOrder(0);
        setError(null);
        setAdding(false);
        setEditingId(null);
    }, []);

    const handleCreate = useCallback(async () => {
        if (!name.trim()) {
            setError("Nama level wajib diisi");
            return;
        }
        setLoading(true);
        setError(null);

        const nextOrder =
            levels.length > 0 ? Math.max(...levels.map((l) => l.order)) + 1 : 0;

        const result = await createLevel({
            name: name.trim(),
            description: description.trim() || undefined,
            order: order || nextOrder,
        });

        setLoading(false);

        if (result.success) {
            resetForm();
            router.refresh();
        } else {
            setError(result.error ?? "Gagal membuat level");
        }
    }, [name, description, order, levels, router, resetForm]);

    const handleStartEdit = useCallback((level: Level) => {
        setEditingId(level.id);
        setName(level.name);
        setDescription(level.description ?? "");
        setOrder(level.order);
        setError(null);
        setAdding(false);
    }, []);

    const handleUpdate = useCallback(async () => {
        if (!editingId || !name.trim()) {
            setError("Nama level wajib diisi");
            return;
        }
        setLoading(true);
        setError(null);

        const result = await updateLevel({
            id: editingId,
            name: name.trim(),
            description: description.trim() || undefined,
            order,
        });

        setLoading(false);

        if (result.success) {
            resetForm();
            router.refresh();
        } else {
            setError(result.error ?? "Gagal memperbarui level");
        }
    }, [editingId, name, description, order, router, resetForm]);

    const handleDelete = useCallback(
        async (id: string) => {
            const result = await deleteLevel({ id });
            if (result.success) {
                router.refresh();
            }
        },
        [router],
    );

    const handleStartAdd = useCallback(() => {
        const nextOrder =
            levels.length > 0 ? Math.max(...levels.map((l) => l.order)) + 1 : 0;
        setAdding(true);
        setEditingId(null);
        setName("");
        setDescription("");
        setOrder(nextOrder);
        setError(null);
    }, [levels]);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Layers className="size-5" />
                            Level
                        </CardTitle>
                        <CardDescription>
                            Kelola level kemampuan siswa seperti Beginner,
                            Intermediate, Advanced, dll.
                        </CardDescription>
                    </div>
                    {!adding && !editingId && (
                        <Button size="sm" onClick={handleStartAdd}>
                            <Plus className="mr-1" />
                            Tambah
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {(adding || editingId) && (
                    <LevelForm
                        isEditing={!!editingId}
                        name={name}
                        description={description}
                        order={order}
                        error={error}
                        loading={loading}
                        onNameChange={setName}
                        onDescriptionChange={setDescription}
                        onOrderChange={setOrder}
                        onSubmit={editingId ? handleUpdate : handleCreate}
                        onCancel={resetForm}
                    />
                )}

                {levels.length === 0 ? (
                    <EmptyState
                        icon={Layers}
                        title="Belum ada level"
                        description="Tambahkan level untuk mengelola tingkat kemampuan siswa."
                    />
                ) : (
                    <LevelsTable
                        levels={levels}
                        onEdit={handleStartEdit}
                        onDelete={handleDelete}
                    />
                )}
            </CardContent>
        </Card>
    );
}

// LevelForm
interface LevelFormProps {
    isEditing: boolean;
    name: string;
    description: string;
    order: number;
    error: string | null;
    loading: boolean;
    onNameChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onOrderChange: (value: number) => void;
    onSubmit: () => void;
    onCancel: () => void;
}

function LevelForm({
    isEditing,
    name,
    description,
    order,
    error,
    loading,
    onNameChange,
    onDescriptionChange,
    onOrderChange,
    onSubmit,
    onCancel,
}: LevelFormProps) {
    return (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">
                {isEditing ? "Edit Level" : "Tambah Level Baru"}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-2">
                    <Label>Nama</Label>
                    <Input
                        value={name}
                        onChange={(e) => onNameChange(e.target.value)}
                        placeholder="Contoh: Beginner"
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
                <div className="grid gap-2">
                    <Label>Urutan</Label>
                    <Input
                        type="number"
                        value={order}
                        onChange={(e) =>
                            onOrderChange(parseInt(e.target.value, 10) || 0)
                        }
                        min={0}
                        placeholder="0"
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

// LevelsTable
interface LevelsTableProps {
    levels: Level[];
    onEdit: (level: Level) => void;
    onDelete: (id: string) => void;
}

function LevelsTable({ levels, onEdit, onDelete }: LevelsTableProps) {
    const sorted = levels.slice().sort((a, b) => a.order - b.order);

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-16">Urutan</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sorted.map((level) => (
                    <TableRow key={level.id}>
                        <TableCell>
                            <Badge variant="secondary" className="tabular-nums">
                                {level.order}
                            </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                            {level.name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                            {level.description || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Edit level"
                                    onClick={() => onEdit(level)}
                                >
                                    <Pencil />
                                </Button>
                                <ConfirmDialog
                                    title="Hapus Level"
                                    description={`Apakah Anda yakin ingin menghapus level "${level.name}"? Level yang sedang digunakan tidak dapat dihapus.`}
                                    onConfirm={() => onDelete(level.id)}
                                    trigger={
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            aria-label="Hapus level"
                                        >
                                            <Trash2 className="text-destructive" />
                                        </Button>
                                    }
                                />
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
