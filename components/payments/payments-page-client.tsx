"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchBar } from "@/components/shared/search-bar";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { PaymentTable } from "@/components/payments/payment-table";
import { PaymentFormDialog } from "@/components/payments/payment-form-dialog";
import { formatRupiah, getMonthName } from "@/lib/utils";
import { Plus } from "lucide-react";
import type { PaymentWithStudent, Student, PaginatedResult } from "@/lib/types";

// Types
interface PaymentsPageClientProps {
    result: PaginatedResult<PaymentWithStudent>;
    students: Student[];
    defaultAmount: number;
    years: number[];
    initialSearch: string;
    initialYear: string;
    initialMonth: string;
    initialStatus: string;
}

// Main Component
export function PaymentsPageClient({
    result,
    students,
    defaultAmount,
    years,
    initialSearch,
    initialYear,
    initialMonth,
    initialStatus,
}: PaymentsPageClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingPayment, setEditingPayment] =
        useState<PaymentWithStudent | null>(null);
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

    const handleOpenCreate = useCallback(() => {
        setEditingPayment(null);
        setDialogOpen(true);
    }, []);

    const handleEdit = useCallback((payment: PaymentWithStudent) => {
        setEditingPayment(payment);
        setDialogOpen(true);
    }, []);

    const handleDialogClose = useCallback((open: boolean) => {
        setDialogOpen(open);
        if (!open) {
            setEditingPayment(null);
        }
    }, []);

    const handlePageChange = useCallback(
        (page: number) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("page", String(page));
            router.push(`/payments?${params.toString()}`);
        },
        [searchParams, router],
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title="Pembayaran"
                description={`Pembayaran bulanan: ${formatRupiah(defaultAmount)} per siswa`}
            >
                <Button onClick={handleOpenCreate}>
                    <Plus className="mr-1" />
                    Tambah Pembayaran
                </Button>
            </PageHeader>

            <PaymentFilters
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                onSearchSubmit={handleSearch}
                selectedYear={initialYear}
                selectedMonth={initialMonth}
                selectedStatus={initialStatus}
                years={years}
                onFilterChange={handleFilterChange}
            />

            <PaymentTable payments={result.data} onEdit={handleEdit} />

            <PaginationControls
                page={result.page}
                totalPages={result.totalPages}
                onPageChange={handlePageChange}
            />

            <PaymentFormDialog
                open={dialogOpen}
                onOpenChange={handleDialogClose}
                payment={editingPayment}
                students={students}
                defaultAmount={defaultAmount}
            />
        </div>
    );
}

// Payment Filters
interface PaymentFiltersProps {
    searchValue: string;
    onSearchChange: (value: string) => void;
    onSearchSubmit: (e: React.FormEvent) => void;
    selectedYear: string;
    selectedMonth: string;
    selectedStatus: string;
    years: number[];
    onFilterChange: (key: string, value: string) => void;
}

function PaymentFilters({
    searchValue,
    onSearchChange,
    onSearchSubmit,
    selectedYear,
    selectedMonth,
    selectedStatus,
    years,
    onFilterChange,
}: PaymentFiltersProps) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <SearchBar
                value={searchValue}
                onChange={onSearchChange}
                onSubmit={onSearchSubmit}
                placeholder="Cari nama atau no. siswa..."
                className="flex-1 max-w-sm"
            />

            <div className="flex items-center gap-2 flex-wrap">
                <Select
                    value={selectedYear || "all"}
                    onValueChange={(val: string | null) =>
                        onFilterChange("year", val ?? "all")
                    }
                >
                    <SelectTrigger className="w-28">
                        <span className="truncate">
                            {selectedYear
                                ? years.find((y) => String(y) === selectedYear)
                                    ? selectedYear
                                    : "Tahun"
                                : "Semua Tahun"}
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

                <Select
                    value={selectedMonth || "all"}
                    onValueChange={(val: string | null) =>
                        onFilterChange("month", val ?? "all")
                    }
                >
                    <SelectTrigger className="w-32">
                        <span className="truncate">
                            {selectedMonth && selectedMonth !== "all"
                                ? getMonthName(parseInt(selectedMonth, 10))
                                : "Semua Bulan"}
                        </span>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Bulan</SelectItem>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(
                            (month) => (
                                <SelectItem key={month} value={String(month)}>
                                    {getMonthName(month)}
                                </SelectItem>
                            ),
                        )}
                    </SelectContent>
                </Select>

                <Select
                    value={selectedStatus || "all"}
                    onValueChange={(val: string | null) =>
                        onFilterChange("status", val ?? "all")
                    }
                >
                    <SelectTrigger className="w-32">
                        <span className="truncate">
                            {selectedStatus === "paid"
                                ? "Lunas"
                                : selectedStatus === "partial"
                                  ? "Sebagian"
                                  : selectedStatus === "unpaid"
                                    ? "Belum Bayar"
                                    : "Semua Status"}
                        </span>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Status</SelectItem>
                        <SelectItem value="paid">Lunas</SelectItem>
                        <SelectItem value="partial">Sebagian</SelectItem>
                        <SelectItem value="unpaid">Belum Bayar</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
