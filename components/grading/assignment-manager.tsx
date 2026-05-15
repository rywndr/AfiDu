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
import {
    createAssignment,
    updateAssignment,
    deleteAssignment,
} from "@/lib/actions/classes";
import { Plus, Pencil, Trash2, Save, X, ListChecks } from "lucide-react";
import type { Assignment } from "@/lib/types";

// Props
interface AssignmentManagerProps {
    periodId: string;
    assignments: Assignment[];
}

// Main Component
export function AssignmentManager({
    periodId,
    assignments,
}: AssignmentManagerProps) {
    const router = useRouter();
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const handleCreated = useCallback(() => {
        setShowAddForm(false);
        router.refresh();
    }, [router]);

    const handleUpdated = useCallback(() => {
        setEditingId(null);
        router.refresh();
    }, [router]);

    const handleDeleted = useCallback(() => {
        router.refresh();
    }, [router]);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <ListChecks className="size-5" />
                            Daftar Tugas
                        </CardTitle>
                        <CardDescription>
                            {assignments.length} tugas dalam period ini
                        </CardDescription>
                    </div>
                    {!showAddForm && (
                        <Button size="sm" onClick={() => setShowAddForm(true)}>
                            <Plus className="mr-1" />
                            Tambah Tugas
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {showAddForm && (
                    <AddAssignmentForm
                        periodId={periodId}
                        nextOrder={assignments.length}
                        onSuccess={handleCreated}
                        onCancel={() => setShowAddForm(false)}
                    />
                )}

                {assignments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                            <ListChecks className="size-6 text-muted-foreground" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold">
                            Belum ada tugas
                        </h3>
                        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                            Tambahkan tugas untuk mulai memasukkan nilai siswa
                            pada gradebook.
                        </p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Nama Tugas</TableHead>
                                <TableHead className="w-28 text-center">
                                    Skor Maks
                                </TableHead>
                                <TableHead className="w-24 text-right">
                                    Aksi
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assignments.map((assignment) =>
                                editingId === assignment.id ? (
                                    <EditAssignmentRow
                                        key={assignment.id}
                                        assignment={assignment}
                                        onSuccess={handleUpdated}
                                        onCancel={() => setEditingId(null)}
                                    />
                                ) : (
                                    <AssignmentRow
                                        key={assignment.id}
                                        assignment={assignment}
                                        onEdit={() =>
                                            setEditingId(assignment.id)
                                        }
                                        onDeleted={handleDeleted}
                                    />
                                ),
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

// Add Assignment Form
interface AddAssignmentFormProps {
    periodId: string;
    nextOrder: number;
    onSuccess: () => void;
    onCancel: () => void;
}

function AddAssignmentForm({
    periodId,
    nextOrder,
    onSuccess,
    onCancel,
}: AddAssignmentFormProps) {
    const [name, setName] = useState("");
    const [maxScore, setMaxScore] = useState("100");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();

            const trimmedName = name.trim();
            if (!trimmedName) {
                setError("Nama tugas wajib diisi");
                return;
            }

            const parsedMaxScore = parseFloat(maxScore);
            if (isNaN(parsedMaxScore) || parsedMaxScore < 1) {
                setError("Skor maksimal harus minimal 1");
                return;
            }

            setSubmitting(true);
            setError(null);

            const result = await createAssignment({
                periodId,
                name: trimmedName,
                maxScore: parsedMaxScore,
                order: nextOrder,
            });

            setSubmitting(false);

            if (result.success) {
                onSuccess();
            } else {
                setError(result.error ?? "Gagal membuat tugas");
            }
        },
        [periodId, name, maxScore, nextOrder, onSuccess],
    );

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-3 rounded-lg border bg-muted/30 p-4"
        >
            <p className="text-sm font-medium">Tambah Tugas Baru</p>
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="assignment-name">Nama Tugas</Label>
                    <Input
                        id="assignment-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Contoh: Quiz 1, UTS, Tugas Harian"
                        autoFocus
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="assignment-max-score">Skor Maksimal</Label>
                    <Input
                        id="assignment-max-score"
                        type="number"
                        min={1}
                        max={1000}
                        value={maxScore}
                        onChange={(e) => setMaxScore(e.target.value)}
                        placeholder="100"
                    />
                </div>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={submitting}>
                    {submitting ? "Menambahkan..." : "Tambahkan"}
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onCancel}
                    disabled={submitting}
                >
                    Batal
                </Button>
            </div>
        </form>
    );
}

// Assignment Row (read-only)
interface AssignmentRowProps {
    assignment: Assignment;
    onEdit: () => void;
    onDeleted: () => void;
}

function AssignmentRow({ assignment, onEdit, onDeleted }: AssignmentRowProps) {
    const handleDelete = useCallback(async () => {
        const result = await deleteAssignment({ id: assignment.id });
        if (result.success) {
            onDeleted();
        }
    }, [assignment.id, onDeleted]);

    return (
        <TableRow>
            <TableCell className="text-muted-foreground tabular-nums">
                {assignment.order + 1}
            </TableCell>
            <TableCell className="font-medium">{assignment.name}</TableCell>
            <TableCell className="text-center">
                <Badge variant="secondary" className="tabular-nums">
                    {assignment.maxScore}
                </Badge>
            </TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={onEdit}
                        aria-label="Edit tugas"
                    >
                        <Pencil className="size-3.5" />
                    </Button>
                    <ConfirmDialog
                        title="Hapus Tugas"
                        description={`Apakah Anda yakin ingin menghapus tugas "${assignment.name}"? Semua skor yang terkait akan ikut terhapus.`}
                        confirmLabel="Hapus"
                        onConfirm={handleDelete}
                        trigger={
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Hapus tugas"
                            >
                                <Trash2 className="size-3.5 text-destructive" />
                            </Button>
                        }
                    />
                </div>
            </TableCell>
        </TableRow>
    );
}

// Edit Assignment Row (inline editing)
interface EditAssignmentRowProps {
    assignment: Assignment;
    onSuccess: () => void;
    onCancel: () => void;
}

function EditAssignmentRow({
    assignment,
    onSuccess,
    onCancel,
}: EditAssignmentRowProps) {
    const [name, setName] = useState(assignment.name);
    const [maxScore, setMaxScore] = useState(String(assignment.maxScore));
    const [order, setOrder] = useState(String(assignment.order));
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = useCallback(async () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError("Nama tugas wajib diisi");
            return;
        }

        const parsedMaxScore = parseFloat(maxScore);
        if (isNaN(parsedMaxScore) || parsedMaxScore < 1) {
            setError("Skor maksimal harus minimal 1");
            return;
        }

        const parsedOrder = parseInt(order, 10);
        if (isNaN(parsedOrder) || parsedOrder < 0) {
            setError("Urutan tidak boleh negatif");
            return;
        }

        setSubmitting(true);
        setError(null);

        const result = await updateAssignment({
            id: assignment.id,
            name: trimmedName,
            maxScore: parsedMaxScore,
            order: parsedOrder,
        });

        setSubmitting(false);

        if (result.success) {
            onSuccess();
        } else {
            setError(result.error ?? "Gagal memperbarui tugas");
        }
    }, [assignment.id, name, maxScore, order, onSuccess]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
            }
            if (e.key === "Escape") {
                onCancel();
            }
        },
        [handleSave, onCancel],
    );

    return (
        <TableRow className="bg-muted/30">
            <TableCell>
                <Input
                    type="number"
                    min={0}
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-7 w-14 text-center text-xs"
                />
            </TableCell>
            <TableCell>
                <div className="space-y-1">
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="h-7 text-sm"
                        autoFocus
                    />
                    {error && (
                        <p className="text-[11px] text-destructive">{error}</p>
                    )}
                </div>
            </TableCell>
            <TableCell className="text-center">
                <Input
                    type="number"
                    min={1}
                    max={1000}
                    value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-7 w-20 text-center text-xs mx-auto"
                />
            </TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleSave}
                        disabled={submitting}
                        aria-label="Simpan perubahan"
                    >
                        <Save className="size-3.5 text-green-600" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={onCancel}
                        disabled={submitting}
                        aria-label="Batal edit"
                    >
                        <X className="size-3.5" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
}
