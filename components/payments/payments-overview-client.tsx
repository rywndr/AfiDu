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
import { formatRupiah } from "@/lib/utils";
import { Eye, Users } from "lucide-react";
import type { PaginatedResult } from "@/lib/types";
import type { StudentPaymentSummary } from "@/lib/queries/payments";

// Types
interface PaymentsOverviewClientProps {
    result: PaginatedResult<StudentPaymentSummary>;
    defaultAmount: number;
    years: number[];
    initialSearch: string;
    initialYear: string;
}

// Main Component
export function PaymentsOverviewClient({
    result,
    defaultAmount,
    years,
    initialSearch,
    initialYear,
}: PaymentsOverviewClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [searchValue, setSearchValue] = useState(initialSearch);

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
            router.push(`/payments?${params.toString()}`);
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
            router.push(`/payments?${params.toString()}`);
        },
        [searchParams, router],
    );

    const handlePageChange = useCallback(
        (page: number) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("page", String(page));
            router.push(`/payments?${params.toString()}`);
        },
        [searchParams, router],
    );

    // Compute display label for the selected year
    const selectedYearLabel = initialYear
        ? years.find((y) => String(y) === initialYear)
            ? initialYear
            : "Tahun"
        : undefined;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Pembayaran"
                description={`Pembayaran bulanan: ${formatRupiah(defaultAmount)} per siswa`}
            />

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <SearchBar
                    value={searchValue}
                    onChange={setSearchValue}
                    onSubmit={handleSearch}
                    placeholder="Cari nama atau no. siswa..."
                    className="flex-1 max-w-sm"
                />

                {years.length > 0 && (
                    <Select
                        value={initialYear || "all"}
                        onValueChange={(val: string | null) =>
                            handleFilterChange("year", val ?? "all")
                        }
                    >
                        <SelectTrigger className="w-32">
                            <span className="truncate">
                                {selectedYearLabel ?? "Semua Tahun"}
                            </span>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Tahun</SelectItem>
                            {years.map((year) => (
                                <SelectItem key={year} value={String(year)}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {/* Table */}
            {result.data.length === 0 ? (
                <EmptyState
                    icon={Users}
                    title="Belum ada data siswa"
                    description="Data pembayaran akan muncul di sini setelah siswa terdaftar."
                />
            ) : (
                <StudentPaymentTable
                    summaries={result.data}
                    defaultAmount={defaultAmount}
                    onViewStudent={(studentId) => {
                        const yearParam = initialYear
                            ? `?year=${initialYear}`
                            : "";
                        router.push(`/payments/${studentId}${yearParam}`);
                    }}
                />
            )}

            <PaginationControls
                page={result.page}
                totalPages={result.totalPages}
                onPageChange={handlePageChange}
            />
        </div>
    );
}

// Student Payment Summary Table
interface StudentPaymentTableProps {
    summaries: StudentPaymentSummary[];
    defaultAmount: number;
    onViewStudent: (studentId: string) => void;
}

function StudentPaymentTable({
    summaries,
    defaultAmount,
    onViewStudent,
}: StudentPaymentTableProps) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Nama Siswa</TableHead>
                    <TableHead>No. Siswa</TableHead>
                    <TableHead>Tagihan / Bulan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {summaries.map((summary) => (
                    <TableRow key={summary.student.id}>
                        <TableCell className="font-medium">
                            {summary.student.name}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                            {summary.student.studentNumber}
                        </TableCell>
                        <TableCell>{formatRupiah(defaultAmount)}</TableCell>
                        <TableCell className="text-right">
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() =>
                                    onViewStudent(summary.student.id)
                                }
                                aria-label={`Lihat pembayaran ${summary.student.name}`}
                            >
                                <Eye />
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
