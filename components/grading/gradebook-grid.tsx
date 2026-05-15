"use client";

import { useState, useCallback, useMemo } from "react";
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
import { EmptyState } from "@/components/shared/empty-state";
import { ScoreCell } from "@/components/grading/score-cell";
import { ClipboardCheck, Save } from "lucide-react";
import { saveScoresBatch } from "@/lib/actions/classes";
import type { Assignment, Student, GradebookRow } from "@/lib/types";

// Types
interface PendingScore {
    assignmentId: string;
    studentId: string;
    score: number | null;
}

interface GradebookGridProps {
    periodName: string;
    assignments: Assignment[];
    rows: GradebookRow[];
}

// GradebookGrid
export function GradebookGrid({
    periodName,
    assignments,
    rows,
}: GradebookGridProps) {
    const [localRows, setLocalRows] = useState<GradebookRow[]>(rows);
    const [pendingScores, setPendingScores] = useState<PendingScore[]>([]);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const handleScoreChange = useCallback(
        (assignmentId: string, studentId: string, score: number | null) => {
            setLocalRows((prev) =>
                prev.map((row) => {
                    if (row.student.id !== studentId) return row;
                    return {
                        ...row,
                        scores: {
                            ...row.scores,
                            [assignmentId]: score,
                        },
                    };
                }),
            );

            setPendingScores((prev) => {
                const filtered = prev.filter(
                    (p) =>
                        !(
                            p.assignmentId === assignmentId &&
                            p.studentId === studentId
                        ),
                );
                return [...filtered, { assignmentId, studentId, score }];
            });
        },
        [],
    );

    const handleSaveAll = useCallback(async () => {
        if (pendingScores.length === 0) return;

        setSaving(true);
        setSaveError(null);
        setSaveSuccess(false);

        const result = await saveScoresBatch({ scores: pendingScores });

        setSaving(false);

        if (result.success) {
            setPendingScores([]);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } else {
            setSaveError(result.error ?? "Gagal menyimpan semua skor");
        }
    }, [pendingScores]);

    if (rows.length === 0 || assignments.length === 0) {
        return (
            <EmptyState
                icon={ClipboardCheck}
                title="Gradebook belum siap"
                description={
                    assignments.length === 0
                        ? "Belum ada tugas yang dibuat untuk period ini. Tambahkan tugas terlebih dahulu."
                        : "Belum ada siswa yang terdaftar di kelas ini."
                }
            />
        );
    }

    return (
        <div className="space-y-4">
            <GradebookToolbar
                periodName={periodName}
                pendingCount={pendingScores.length}
                saving={saving}
                saveError={saveError}
                saveSuccess={saveSuccess}
                onSaveAll={handleSaveAll}
            />

            <div className="overflow-x-auto rounded-lg border">
                <Table>
                    <GradebookTableHeader assignments={assignments} />
                    <TableBody>
                        {localRows.map((row) => (
                            <GradebookTableRow
                                key={row.student.id}
                                student={row.student}
                                scores={row.scores}
                                assignments={assignments}
                                onScoreChange={handleScoreChange}
                            />
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

// GradebookToolbar
interface GradebookToolbarProps {
    periodName: string;
    pendingCount: number;
    saving: boolean;
    saveError: string | null;
    saveSuccess: boolean;
    onSaveAll: () => void;
}

function GradebookToolbar({
    periodName,
    pendingCount,
    saving,
    saveError,
    saveSuccess,
    onSaveAll,
}: GradebookToolbarProps) {
    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{periodName}</h3>
                {pendingCount > 0 && (
                    <Badge variant="secondary">
                        {pendingCount} perubahan belum disimpan
                    </Badge>
                )}
            </div>

            <div className="flex items-center gap-3">
                {saveError && (
                    <span className="text-sm text-destructive">
                        {saveError}
                    </span>
                )}
                {saveSuccess && (
                    <span className="text-sm text-green-600">
                        Semua skor berhasil disimpan!
                    </span>
                )}
                <Button
                    onClick={onSaveAll}
                    disabled={saving || pendingCount === 0}
                    size="sm"
                >
                    <Save className="mr-1" />
                    {saving ? "Menyimpan..." : `Simpan Semua (${pendingCount})`}
                </Button>
            </div>
        </div>
    );
}

// GradebookTableHeader
interface GradebookTableHeaderProps {
    assignments: Assignment[];
}

function GradebookTableHeader({ assignments }: GradebookTableHeaderProps) {
    return (
        <TableHeader>
            <TableRow>
                <TableHead className="sticky left-0 z-10 bg-background min-w-[160px]">
                    Nama Siswa
                </TableHead>
                <TableHead className="sticky left-[160px] z-10 bg-background min-w-[100px]">
                    No. Siswa
                </TableHead>
                {assignments.map((assignment) => (
                    <TableHead
                        key={assignment.id}
                        className="text-center min-w-[80px]"
                    >
                        <div className="flex flex-col items-center gap-0.5">
                            <span className="text-xs font-medium truncate max-w-[80px]">
                                {assignment.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                                /{assignment.maxScore}
                            </span>
                        </div>
                    </TableHead>
                ))}
                <TableHead className="text-center min-w-[80px] bg-muted/50">
                    Total
                </TableHead>
                <TableHead className="text-center min-w-[80px] bg-muted/50">
                    Rata-rata
                </TableHead>
            </TableRow>
        </TableHeader>
    );
}

// GradebookTableRow
// auto-calculated total/average (client-rendered)
interface GradebookTableRowProps {
    student: Student;
    scores: Record<string, number | null>;
    assignments: Assignment[];
    onScoreChange: (
        assignmentId: string,
        studentId: string,
        score: number | null,
    ) => void;
}

function GradebookTableRow({
    student,
    scores,
    assignments,
    onScoreChange,
}: GradebookTableRowProps) {
    const { total, average, scoredCount } = useMemo(() => {
        let sum = 0;
        let count = 0;

        for (const assignment of assignments) {
            const score = scores[assignment.id];
            if (score !== null && score !== undefined) {
                sum += score;
                count++;
            }
        }

        return {
            total: count > 0 ? sum : null,
            average: count > 0 ? sum / count : null,
            scoredCount: count,
        };
    }, [scores, assignments]);

    return (
        <TableRow>
            <TableCell className="sticky left-0 z-10 bg-background font-medium">
                {student.name}
            </TableCell>
            <TableCell className="sticky left-[160px] z-10 bg-background font-mono text-xs text-muted-foreground">
                {student.studentNumber}
            </TableCell>
            {assignments.map((assignment) => (
                <TableCell key={assignment.id} className="text-center p-1">
                    <ScoreCell
                        assignmentId={assignment.id}
                        studentId={student.id}
                        maxScore={assignment.maxScore}
                        initialScore={scores[assignment.id] ?? null}
                        onScoreChange={onScoreChange}
                    />
                </TableCell>
            ))}
            <CalculatedCell
                value={total}
                label={
                    scoredCount < assignments.length
                        ? `${scoredCount}/${assignments.length}`
                        : undefined
                }
            />
            <CalculatedCell
                value={
                    average !== null ? Math.round(average * 100) / 100 : null
                }
            />
        </TableRow>
    );
}

// CalculatedCell
interface CalculatedCellProps {
    value: number | null;
    label?: string;
}

function CalculatedCell({ value, label }: CalculatedCellProps) {
    return (
        <TableCell className="text-center bg-muted/30 tabular-nums">
            {value !== null ? (
                <div className="flex flex-col items-center">
                    <span className="text-sm font-medium">{value}</span>
                    {label && (
                        <span className="text-[10px] text-muted-foreground">
                            {label}
                        </span>
                    )}
                </div>
            ) : (
                <span className="text-xs text-muted-foreground">—</span>
            )}
        </TableCell>
    );
}
