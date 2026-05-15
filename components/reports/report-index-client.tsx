"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { BarChart3, Printer, Eye, Filter } from "lucide-react";
import type { Semester, Subject, ReportIndexRow } from "@/lib/types";

// Main Component
interface ReportIndexClientProps {
    classId: string;
    semesters: Semester[];
    selectedSemesterId: string;
    subjects: Subject[];
    rows: ReportIndexRow[];
}

export function ReportIndexClient({
    classId,
    semesters,
    selectedSemesterId,
    subjects,
    rows,
}: ReportIndexClientProps) {
    const router = useRouter();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [filterMode, setFilterMode] = useState<
        "all" | "complete" | "incomplete"
    >("all");

    const handleSemesterChange = useCallback(
        (semesterId: string) => {
            router.push(`/classes/${classId}/reports?semesterId=${semesterId}`);
        },
        [classId, router],
    );

    const filteredRows = useMemo(() => {
        if (filterMode === "all") return rows;
        if (filterMode === "complete") return rows.filter((r) => r.isComplete);
        return rows.filter((r) => !r.isComplete);
    }, [rows, filterMode]);

    const handleToggle = useCallback((studentId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(studentId)) {
                next.delete(studentId);
            } else {
                next.add(studentId);
            }
            return next;
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        if (selectedIds.size === filteredRows.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredRows.map((r) => r.student.id)));
        }
    }, [filteredRows, selectedIds.size]);

    const handlePrintSelected = useCallback(() => {
        const ids = Array.from(selectedIds).join(",");
        const url = `/classes/${classId}/reports/print?semesterId=${selectedSemesterId}&studentIds=${ids}`;
        window.open(url, "_blank");
    }, [classId, selectedSemesterId, selectedIds]);

    const handleViewStudent = useCallback(
        (studentId: string) => {
            router.push(
                `/classes/${classId}/reports/${studentId}?semesterId=${selectedSemesterId}`,
            );
        },
        [classId, selectedSemesterId, router],
    );

    const allSelected =
        filteredRows.length > 0 && selectedIds.size === filteredRows.length;

    return (
        <div className="space-y-4">
            <ReportToolbar
                semesters={semesters}
                selectedSemesterId={selectedSemesterId}
                onSemesterChange={handleSemesterChange}
                filterMode={filterMode}
                onFilterChange={setFilterMode}
                selectedCount={selectedIds.size}
                onPrintSelected={handlePrintSelected}
            />

            <ReportTable
                subjects={subjects}
                rows={filteredRows}
                selectedIds={selectedIds}
                allSelected={allSelected}
                onToggle={handleToggle}
                onSelectAll={handleSelectAll}
                onViewStudent={handleViewStudent}
            />
        </div>
    );
}

// ReportToolbar
interface ReportToolbarProps {
    semesters: Semester[];
    selectedSemesterId: string;
    onSemesterChange: (semesterId: string) => void;
    filterMode: "all" | "complete" | "incomplete";
    onFilterChange: (mode: "all" | "complete" | "incomplete") => void;
    selectedCount: number;
    onPrintSelected: () => void;
}

function ReportToolbar({
    semesters,
    selectedSemesterId,
    onSemesterChange,
    filterMode,
    onFilterChange,
    selectedCount,
    onPrintSelected,
}: ReportToolbarProps) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 flex-wrap">
                {semesters.length > 0 && (
                    <Select
                        value={selectedSemesterId}
                        onValueChange={(val: string | null) => {
                            if (val) onSemesterChange(val);
                        }}
                    >
                        <SelectTrigger className="w-48">
                            <span className="truncate">
                                {selectedSemesterId
                                    ? (semesters
                                          .find(
                                              (sem) =>
                                                  sem.id === selectedSemesterId,
                                          )
                                          ?.name.replace(/\s+\d{4}$/, "") ??
                                      "Pilih Semester")
                                    : "Pilih Semester"}
                            </span>
                        </SelectTrigger>
                        <SelectContent>
                            {semesters.map((sem) => (
                                <SelectItem key={sem.id} value={sem.id}>
                                    {sem.name.replace(/\s+\d{4}$/, "")}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                <Select
                    value={filterMode}
                    onValueChange={(val: string | null) => {
                        if (val)
                            onFilterChange(
                                val as "all" | "complete" | "incomplete",
                            );
                    }}
                >
                    <SelectTrigger className="w-40">
                        <Filter className="mr-1 size-3.5" />
                        <span className="truncate">
                            {filterMode === "complete"
                                ? "Nilai Lengkap"
                                : filterMode === "incomplete"
                                  ? "Belum Lengkap"
                                  : "Semua Siswa"}
                        </span>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Siswa</SelectItem>
                        <SelectItem value="complete">Nilai Lengkap</SelectItem>
                        <SelectItem value="incomplete">
                            Belum Lengkap
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center gap-2">
                {selectedCount > 0 && (
                    <Badge variant="secondary">
                        {selectedCount} siswa dipilih
                    </Badge>
                )}
                <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedCount === 0}
                    onClick={onPrintSelected}
                >
                    <Printer className="mr-1" />
                    Cetak Terpilih
                </Button>
            </div>
        </div>
    );
}

// ReportTable
interface ReportTableProps {
    subjects: Subject[];
    rows: ReportIndexRow[];
    selectedIds: Set<string>;
    allSelected: boolean;
    onToggle: (studentId: string) => void;
    onSelectAll: () => void;
    onViewStudent: (studentId: string) => void;
}

function ReportTable({
    subjects,
    rows,
    selectedIds,
    allSelected,
    onToggle,
    onSelectAll,
    onViewStudent,
}: ReportTableProps) {
    if (rows.length === 0) {
        return (
            <EmptyState
                icon={BarChart3}
                title="Belum ada data rapor"
                description="Belum ada siswa terdaftar atau belum ada nilai yang diisi untuk semester ini."
            />
        );
    }

    return (
        <div className="overflow-x-auto rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-10">
                            <Checkbox
                                checked={allSelected}
                                onCheckedChange={onSelectAll}
                                aria-label="Pilih semua siswa"
                            />
                        </TableHead>
                        <TableHead className="min-w-[160px]">
                            Nama Siswa
                        </TableHead>
                        <TableHead className="min-w-[100px]">
                            No. Siswa
                        </TableHead>
                        {subjects.map((subject) => (
                            <TableHead
                                key={subject.id}
                                className="text-center min-w-[100px]"
                            >
                                {subject.name}
                            </TableHead>
                        ))}
                        <TableHead className="text-center min-w-[100px]">
                            Status
                        </TableHead>
                        <TableHead className="text-right min-w-[60px]">
                            Aksi
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row) => (
                        <ReportTableRow
                            key={row.student.id}
                            row={row}
                            subjects={subjects}
                            isSelected={selectedIds.has(row.student.id)}
                            onToggle={() => onToggle(row.student.id)}
                            onView={() => onViewStudent(row.student.id)}
                        />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

// ReportTableRow
interface ReportTableRowProps {
    row: ReportIndexRow;
    subjects: Subject[];
    isSelected: boolean;
    onToggle: () => void;
    onView: () => void;
}

function ReportTableRow({
    row,
    subjects,
    isSelected,
    onToggle,
    onView,
}: ReportTableRowProps) {
    return (
        <TableRow data-state={isSelected ? "selected" : undefined}>
            <TableCell>
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={onToggle}
                    aria-label={`Pilih ${row.student.name}`}
                />
            </TableCell>
            <TableCell>
                <button
                    type="button"
                    onClick={onView}
                    className="font-medium text-left hover:underline underline-offset-2 focus:outline-none focus:underline"
                >
                    {row.student.name}
                </button>
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
                {row.student.studentNumber}
            </TableCell>
            {subjects.map((subject) => (
                <SubjectScoreCell
                    key={subject.id}
                    score={row.subjectScores[subject.id] ?? null}
                />
            ))}
            <TableCell className="text-center">
                <StatusBadge
                    status={row.isComplete ? "complete" : "incomplete"}
                />
            </TableCell>
            <TableCell className="text-right">
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={onView}
                    aria-label={`Lihat rapor ${row.student.name}`}
                >
                    <Eye />
                </Button>
            </TableCell>
        </TableRow>
    );
}

// SubjectScoreCell
interface SubjectScoreCellProps {
    score: number | null;
}

function SubjectScoreCell({ score }: SubjectScoreCellProps) {
    if (score === null) {
        return (
            <TableCell className="text-center">
                <span className="text-xs text-muted-foreground">—</span>
            </TableCell>
        );
    }

    const rounded = Math.round(score * 100) / 100;

    return (
        <TableCell className="text-center tabular-nums">
            <span className="text-sm font-medium">{rounded}</span>
        </TableCell>
    );
}
