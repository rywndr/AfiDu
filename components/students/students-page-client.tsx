"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchBar } from "@/components/shared/search-bar";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { StudentTable } from "@/components/students/student-table";
import { StudentFormDialog } from "@/components/students/student-form-dialog";
import {
    useCanCreate,
    useCanUpdate,
    useCanDelete,
} from "@/lib/hooks/use-permission";
import { Plus } from "lucide-react";
import type { Student, Level, ClassRecord, PaginatedResult } from "@/lib/types";
import type { StudentSortField, SortDirection } from "@/lib/queries/students";

// Types
interface StudentRow {
    student: Student;
    currentLevel: Level | null;
    enrolledClasses?: string[];
    enrolledClassIds?: string[];
}

interface StudentsPageClientProps {
    result: PaginatedResult<Student>;
    studentRows: StudentRow[];
    levels: Level[];
    classes: ClassRecord[];
    initialSearch: string;
    initialLevelId: string;
    initialClassId: string;
    initialGender: string;
    initialSortField: StudentSortField;
    initialSortDir: SortDirection;
}

// Sort options config
interface SortOption {
    label: string;
    field: StudentSortField;
    direction: SortDirection;
}

const SORT_OPTIONS: SortOption[] = [
    { label: "Nama (A-Z)", field: "name", direction: "asc" },
    { label: "Nama (Z-A)", field: "name", direction: "desc" },
    { label: "No. Siswa (A-Z)", field: "studentNumber", direction: "asc" },
    { label: "No. Siswa (Z-A)", field: "studentNumber", direction: "desc" },
    { label: "Terdaftar (Terbaru)", field: "enrolledAt", direction: "desc" },
    { label: "Terdaftar (Terlama)", field: "enrolledAt", direction: "asc" },
];

function encodeSortValue(
    field: StudentSortField,
    direction: SortDirection,
): string {
    return `${field}:${direction}`;
}

function decodeSortValue(
    value: string,
): { field: StudentSortField; direction: SortDirection } | null {
    const option = SORT_OPTIONS.find(
        (o) => encodeSortValue(o.field, o.direction) === value,
    );
    return option ? { field: option.field, direction: option.direction } : null;
}

// Main Component
export function StudentsPageClient({
    result,
    studentRows,
    levels,
    classes,
    initialSearch,
    initialLevelId,
    initialClassId,
    initialGender,
    initialSortField,
    initialSortDir,
}: StudentsPageClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const canCreate = useCanCreate("students");
    const canUpdate = useCanUpdate("students");
    const canDelete = useCanDelete("students");

    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [searchValue, setSearchValue] = useState(initialSearch);

    // Navigation helpers
    const pushParams = useCallback(
        (mutate: (params: URLSearchParams) => void) => {
            const params = new URLSearchParams(searchParams.toString());
            mutate(params);
            router.push(`/students?${params.toString()}`);
        },
        [searchParams, router],
    );

    const handleSearch = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            pushParams((params) => {
                if (searchValue.trim()) {
                    params.set("search", searchValue.trim());
                } else {
                    params.delete("search");
                }
                params.delete("page");
            });
        },
        [searchValue, pushParams],
    );

    const handleFilterChange = useCallback(
        (key: string, value: string) => {
            pushParams((params) => {
                if (value && value !== "all") {
                    params.set(key, value);
                } else {
                    params.delete(key);
                }
                params.delete("page");
            });
        },
        [pushParams],
    );

    const handleSortChange = useCallback(
        (encoded: string) => {
            const decoded = decodeSortValue(encoded);
            if (!decoded) return;

            pushParams((params) => {
                params.set("sortField", decoded.field);
                params.set("sortDir", decoded.direction);
                params.delete("page");
            });
        },
        [pushParams],
    );

    const handleEdit = useCallback((student: Student) => {
        setEditingStudent(student);
        setEditDialogOpen(true);
    }, []);

    const handleEditDialogClose = useCallback((open: boolean) => {
        setEditDialogOpen(open);
        if (!open) {
            setEditingStudent(null);
        }
    }, []);

    const handlePageChange = useCallback(
        (page: number) => {
            pushParams((params) => {
                params.set("page", String(page));
            });
        },
        [pushParams],
    );

    const hasActiveFilters =
        !!initialLevelId || !!initialClassId || !!initialGender;

    const handleClearFilters = useCallback(() => {
        const params = new URLSearchParams();
        if (searchValue.trim()) {
            params.set("search", searchValue.trim());
        }
        // Preserve sort when clearing filters
        if (initialSortField !== "name" || initialSortDir !== "asc") {
            params.set("sortField", initialSortField);
            params.set("sortDir", initialSortDir);
        }
        router.push(`/students?${params.toString()}`);
    }, [searchValue, initialSortField, initialSortDir, router]);

    const currentSortEncoded = encodeSortValue(
        initialSortField,
        initialSortDir,
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title="Daftar Siswa"
                description={`Total ${result.total} siswa${hasActiveFilters ? " (difilter)" : " terdaftar"}`}
            >
                {canCreate && (
                    <Button render={<Link href="/students/new" />}>
                        <Plus className="mr-1" />
                        Tambah Siswa
                    </Button>
                )}
            </PageHeader>

            {/* Search + Filters + Sort */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <SearchBar
                    value={searchValue}
                    onChange={setSearchValue}
                    onSubmit={handleSearch}
                    placeholder="Cari nama atau nomor siswa..."
                    className="flex-1 max-w-sm"
                />

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Level Filter */}
                    {levels.length > 0 && (
                        <Select
                            value={initialLevelId || "all"}
                            onValueChange={(val: string | null) =>
                                handleFilterChange("levelId", val ?? "all")
                            }
                        >
                            <SelectTrigger className="w-36">
                                <span className="truncate">
                                    {initialLevelId && initialLevelId !== "all"
                                        ? (levels.find(
                                              (l) => l.id === initialLevelId,
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

                    {/* Class Filter */}
                    {classes.length > 0 && (
                        <Select
                            value={initialClassId || "all"}
                            onValueChange={(val: string | null) =>
                                handleFilterChange("classId", val ?? "all")
                            }
                        >
                            <SelectTrigger className="w-40">
                                <span className="truncate">
                                    {initialClassId && initialClassId !== "all"
                                        ? (classes.find(
                                              (c) => c.id === initialClassId,
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

                    {/* Gender Filter */}
                    <Select
                        value={initialGender || "all"}
                        onValueChange={(val: string | null) =>
                            handleFilterChange("gender", val ?? "all")
                        }
                    >
                        <SelectTrigger className="w-36">
                            <span className="truncate">
                                {initialGender === "male"
                                    ? "Laki-laki"
                                    : initialGender === "female"
                                      ? "Perempuan"
                                      : "Semua Gender"}
                            </span>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Gender</SelectItem>
                            <SelectItem value="male">Laki-laki</SelectItem>
                            <SelectItem value="female">Perempuan</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Sort By */}
                    <Select
                        value={currentSortEncoded}
                        onValueChange={(val: string | null) => {
                            if (val) handleSortChange(val);
                        }}
                    >
                        <SelectTrigger className="w-44">
                            <span className="truncate">
                                {SORT_OPTIONS.find(
                                    (o) =>
                                        encodeSortValue(
                                            o.field,
                                            o.direction,
                                        ) === currentSortEncoded,
                                )?.label ?? "Urutkan"}
                            </span>
                        </SelectTrigger>
                        <SelectContent>
                            {SORT_OPTIONS.map((opt) => {
                                const val = encodeSortValue(
                                    opt.field,
                                    opt.direction,
                                );
                                return (
                                    <SelectItem key={val} value={val}>
                                        {opt.label}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearFilters}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            Hapus Filter
                        </Button>
                    )}
                </div>
            </div>

            <StudentTable
                rows={studentRows}
                onEdit={canUpdate ? handleEdit : undefined}
                canDelete={canDelete}
            />

            {result.totalPages > 1 && (
                <PaginationControls
                    page={result.page}
                    totalPages={result.totalPages}
                    onPageChange={handlePageChange}
                />
            )}

            {canUpdate && editingStudent && (
                <StudentFormDialog
                    open={editDialogOpen}
                    onOpenChange={handleEditDialogClose}
                    student={editingStudent}
                />
            )}
        </div>
    );
}
