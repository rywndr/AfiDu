"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchBar } from "@/components/shared/search-bar";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EditClassDialog } from "@/components/classes/edit-class-dialog";
import { deleteClass } from "@/lib/actions/classes";
import {
    useCanCreate,
    useCanUpdate,
    useCanDelete,
} from "@/lib/hooks/use-permission";
import {
    Plus,
    GraduationCap,
    Eye,
    Pencil,
    Trash2,
    Users,
    BarChart3,
    AlertTriangle,
} from "lucide-react";
import type {
    ClassWithDetails,
    AcademicYear,
    PaginatedResult,
} from "@/lib/types";

// Main Component
interface ClassesPageClientProps {
    result: PaginatedResult<ClassWithDetails>;
    academicYears: AcademicYear[];
    teachers: { id: string; name: string; email: string }[];
    initialSearch: string;
    initialAcademicYearId: string;
}

export function ClassesPageClient({
    result,
    academicYears,
    teachers,
    initialSearch,
    initialAcademicYearId,
}: ClassesPageClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const canCreate = useCanCreate("classes");
    const canUpdate = useCanUpdate("classes");
    const canDelete = useCanDelete("classes");

    const [searchValue, setSearchValue] = useState(initialSearch);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassWithDetails | null>(
        null,
    );

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
            router.push(`/classes?${params.toString()}`);
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
            router.push(`/classes?${params.toString()}`);
        },
        [searchParams, router],
    );

    const handlePageChange = useCallback(
        (page: number) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("page", String(page));
            router.push(`/classes?${params.toString()}`);
        },
        [searchParams, router],
    );

    const handleEdit = useCallback((cls: ClassWithDetails) => {
        setEditingClass(cls);
        setEditDialogOpen(true);
    }, []);

    const handleEditDialogClose = useCallback((open: boolean) => {
        setEditDialogOpen(open);
        if (!open) {
            setEditingClass(null);
        }
    }, []);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Daftar Kelas"
                description={`Total ${result.total} kelas terdaftar`}
            >
                {canCreate && (
                    <Button onClick={() => router.push("/classes/new")}>
                        <Plus className="mr-1" />
                        Buat Kelas
                    </Button>
                )}
            </PageHeader>

            <ClassFilters
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                onSearchSubmit={handleSearch}
                selectedAcademicYearId={initialAcademicYearId}
                academicYears={academicYears}
                onFilterChange={handleFilterChange}
            />

            <ClassTable
                classes={result.data}
                onEdit={canUpdate ? handleEdit : undefined}
                canDelete={canDelete}
            />

            <PaginationControls
                page={result.page}
                totalPages={result.totalPages}
                onPageChange={handlePageChange}
            />

            {canUpdate && editingClass && (
                <EditClassDialog
                    open={editDialogOpen}
                    onOpenChange={handleEditDialogClose}
                    classRecord={editingClass}
                    academicYears={academicYears}
                    allTeachers={teachers}
                />
            )}
        </div>
    );
}

// Class Table
interface ClassTableProps {
    classes: ClassWithDetails[];
    /** When undefined, the edit button is hidden (read-only mode). */
    onEdit?: (cls: ClassWithDetails) => void;
    /** When false, the delete button is hidden. Defaults to true. */
    canDelete?: boolean;
}

function ClassTable({ classes, onEdit, canDelete = true }: ClassTableProps) {
    const router = useRouter();

    if (classes.length === 0) {
        return (
            <EmptyState
                icon={GraduationCap}
                title="Belum ada kelas"
                description="Buat kelas pertama untuk mulai mengelola proses belajar mengajar."
            />
        );
    }

    const handleDelete = async (id: string) => {
        const result = await deleteClass({ id });
        if (result.success) {
            router.refresh();
        }
    };

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Nama Kelas</TableHead>
                    <TableHead>Tahun Ajaran</TableHead>
                    <TableHead>Guru</TableHead>
                    <TableHead>Siswa</TableHead>
                    <TableHead>Kapasitas</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {classes.map((cls) => (
                    <ClassTableRow
                        key={cls.id}
                        classRecord={cls}
                        onView={() => router.push(`/classes/${cls.id}`)}
                        onEdit={onEdit ? () => onEdit(cls) : undefined}
                        onReports={() =>
                            router.push(`/classes/${cls.id}/reports`)
                        }
                        onDelete={
                            canDelete ? () => handleDelete(cls.id) : undefined
                        }
                    />
                ))}
            </TableBody>
        </Table>
    );
}

// Class Table Row
interface ClassTableRowProps {
    classRecord: ClassWithDetails;
    onView: () => void;
    onEdit?: () => void;
    onReports: () => void;
    onDelete?: () => void;
}

function ClassTableRow({
    classRecord,
    onView,
    onEdit,
    onReports,
    onDelete,
}: ClassTableRowProps) {
    const capacityPercent =
        classRecord.capacity > 0
            ? Math.round(
                  (classRecord.studentCount / classRecord.capacity) * 100,
              )
            : 0;

    const capacityVariant =
        capacityPercent >= 90
            ? "destructive"
            : capacityPercent >= 70
              ? "secondary"
              : "outline";

    return (
        <TableRow>
            <TableCell className="font-medium">{classRecord.name}</TableCell>
            <TableCell>
                <Badge variant="secondary">
                    {classRecord.academicYear.year}
                </Badge>
            </TableCell>
            <TableCell>{classRecord.teacher.name}</TableCell>
            <TableCell>
                <div className="flex items-center gap-1.5">
                    <Users className="size-3.5 text-muted-foreground" />
                    <span>{classRecord.studentCount}</span>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-1.5">
                    <Badge variant={capacityVariant}>
                        {classRecord.studentCount}/{classRecord.capacity}
                    </Badge>
                    {classRecord.studentCount > classRecord.capacity && (
                        <Badge
                            variant="destructive"
                            className="flex items-center gap-1"
                        >
                            <AlertTriangle className="size-3" />
                            Overloaded
                        </Badge>
                    )}
                </div>
            </TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={onView}
                        aria-label="Lihat detail kelas"
                    >
                        <Eye />
                    </Button>
                    {onEdit && (
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={onEdit}
                            aria-label="Edit kelas"
                        >
                            <Pencil />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={onReports}
                        aria-label="Lihat rapor kelas"
                    >
                        <BarChart3 />
                    </Button>
                    {onDelete && (
                        <ConfirmDialog
                            title="Hapus Kelas"
                            description={`Apakah Anda yakin ingin menghapus kelas "${classRecord.name}"? Tindakan ini tidak dapat dibatalkan.`}
                            onConfirm={onDelete}
                            trigger={
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Hapus kelas"
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

// Class Filters
interface ClassFiltersProps {
    searchValue: string;
    onSearchChange: (value: string) => void;
    onSearchSubmit: (e: React.FormEvent) => void;
    selectedAcademicYearId: string;
    academicYears: AcademicYear[];
    onFilterChange: (key: string, value: string) => void;
}

function ClassFilters({
    searchValue,
    onSearchChange,
    onSearchSubmit,
    selectedAcademicYearId,
    academicYears,
    onFilterChange,
}: ClassFiltersProps) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <SearchBar
                value={searchValue}
                onChange={onSearchChange}
                onSubmit={onSearchSubmit}
                placeholder="Cari kelas atau guru..."
                className="flex-1 max-w-sm"
            />

            {academicYears.length > 0 && (
                <Select
                    value={selectedAcademicYearId || "all"}
                    onValueChange={(val: string | null) =>
                        onFilterChange("academicYearId", val ?? "all")
                    }
                >
                    <SelectTrigger className="w-40">
                        <span className="truncate">
                            {selectedAcademicYearId
                                ? (academicYears.find(
                                      (ay) => ay.id === selectedAcademicYearId,
                                  )?.year ?? "Tahun Ajaran")
                                : "Semua Tahun"}
                        </span>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Tahun</SelectItem>
                        {academicYears.map((ay) => (
                            <SelectItem key={ay.id} value={ay.id}>
                                {ay.year}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </div>
    );
}
