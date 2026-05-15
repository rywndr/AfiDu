"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CustomFormulaDialog } from "@/components/classes/custom-formula-dialog";
import {
    ExternalLink,
    Pencil,
    Save,
    Trash2,
    X,
    Calculator,
} from "lucide-react";
import type { Period, FormulaConfig } from "@/lib/types";

// NOTE: The `order` field is kept internally but not exposed in the UI.
// When saving, we preserve the existing order value.

function parseFormulaConfig(raw: string | null): FormulaConfig {
    if (!raw) return { type: "average" };
    try {
        return JSON.parse(raw) as FormulaConfig;
    } catch {
        return { type: "average" };
    }
}

const FORMULA_LABELS: Record<FormulaConfig["type"], string> = {
    average: "Rata-rata",
    sum: "Total",
    weighted: "Berbobot",
    custom: "Kustom",
};

// Types
export interface PeriodBadgeProps {
    classId: string;
    subjectId: string;
    period: Period;
    onUpdatePeriod?: (
        periodId: string,
        name: string,
        order: number,
        formulaConfig?: string,
    ) => Promise<{ success: boolean; error?: string }>;
    onDeletePeriod?: (periodId: string) => void;
    /** When true, hide edit/delete actions (read-only mode for admins). */
    readOnly?: boolean;
}

// PeriodBadge
export function PeriodBadge({
    classId,
    subjectId,
    period,
    onUpdatePeriod,
    onDeletePeriod,
    readOnly = false,
}: PeriodBadgeProps) {
    const router = useRouter();
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState(period.name);
    const [formulaType, setFormulaType] = useState<FormulaConfig["type"]>(
        parseFormulaConfig(period.formulaConfig).type,
    );
    const [customFormulaConfig, setCustomFormulaConfig] =
        useState<FormulaConfig | null>(() => {
            const parsed = parseFormulaConfig(period.formulaConfig);
            return parsed.type === "custom" ? parsed : null;
        });
    const [customDialogOpen, setCustomDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = useCallback(async () => {
        const trimmed = editName.trim();
        if (!trimmed) {
            setError("Nama wajib diisi");
            return;
        }

        setSaving(true);
        setError(null);

        if (!onUpdatePeriod) return;

        let formulaConfig: string;
        if (formulaType === "custom" && customFormulaConfig) {
            formulaConfig = JSON.stringify(customFormulaConfig);
        } else if (formulaType === "custom" && !customFormulaConfig) {
            // If user selected custom but hasn't configured it, fall back to average
            formulaConfig = JSON.stringify({ type: "average" });
        } else {
            formulaConfig = JSON.stringify({ type: formulaType });
        }

        const result = await onUpdatePeriod(
            period.id,
            trimmed,
            period.order,
            formulaConfig,
        );
        setSaving(false);

        if (result.success) {
            setEditing(false);
        } else {
            setError(result.error ?? "Gagal memperbarui period");
        }
    }, [
        period.id,
        editName,
        formulaType,
        customFormulaConfig,
        period.order,
        onUpdatePeriod,
    ]);

    const handleCancel = useCallback(() => {
        setEditName(period.name);
        const parsed = parseFormulaConfig(period.formulaConfig);
        setFormulaType(parsed.type);
        setCustomFormulaConfig(parsed.type === "custom" ? parsed : null);
        setEditing(false);
        setError(null);
    }, [period.name, period.formulaConfig]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
            }
            if (e.key === "Escape") {
                handleCancel();
            }
        },
        [handleSave, handleCancel],
    );

    const handleFormulaTypeChange = useCallback((val: string | null) => {
        if (!val) return;
        const newType = val as FormulaConfig["type"];
        setFormulaType(newType);
        if (newType === "custom") {
            // Open custom formula dialog
            setCustomDialogOpen(true);
        } else {
            setCustomFormulaConfig(null);
        }
    }, []);

    const handleCustomFormulaSave = useCallback((config: FormulaConfig) => {
        setCustomFormulaConfig(config);
        setFormulaType("custom");
        setCustomDialogOpen(false);
    }, []);

    if (editing) {
        return (
            <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-muted/30 p-1.5">
                <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-6 w-28 text-xs"
                    autoFocus
                    placeholder="Nama period"
                />
                <Select
                    value={formulaType}
                    onValueChange={handleFormulaTypeChange}
                >
                    <SelectTrigger className="h-6 w-24 text-xs">
                        <span className="truncate text-xs">
                            {FORMULA_LABELS[formulaType]}
                        </span>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="average">Rata-rata</SelectItem>
                        <SelectItem value="sum">Total</SelectItem>
                        <SelectItem value="weighted">Berbobot</SelectItem>
                        <SelectItem value="custom">
                            <span className="flex items-center gap-1">
                                <Calculator className="size-3" />
                                Kustom
                            </span>
                        </SelectItem>
                    </SelectContent>
                </Select>

                {/* Show edit button for custom formula when already configured */}
                {formulaType === "custom" && (
                    <CustomFormulaDialog
                        currentConfig={customFormulaConfig ?? undefined}
                        onSave={handleCustomFormulaSave}
                        open={customDialogOpen}
                        onOpenChange={setCustomDialogOpen}
                        trigger={
                            <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label="Edit formula kustom"
                                title={
                                    customFormulaConfig?.expression
                                        ? `Formula: ${customFormulaConfig.expression}`
                                        : "Atur formula kustom"
                                }
                            >
                                <Calculator className="size-3 text-primary" />
                            </Button>
                        }
                    />
                )}

                <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleSave}
                    disabled={saving}
                    aria-label="Simpan"
                >
                    <Save className="size-3 text-green-600" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleCancel}
                    disabled={saving}
                    aria-label="Batal"
                >
                    <X className="size-3" />
                </Button>
                {onDeletePeriod && (
                    <ConfirmDialog
                        title="Hapus Period"
                        description={`Apakah Anda yakin ingin menghapus "${period.name}"? Semua tugas dan nilai dalam period ini akan ikut terhapus.`}
                        confirmLabel="Hapus"
                        onConfirm={() => onDeletePeriod(period.id)}
                        trigger={
                            <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label="Hapus period"
                            >
                                <Trash2 className="size-3 text-destructive" />
                            </Button>
                        }
                    />
                )}
                {error && (
                    <span className="text-[10px] text-destructive">
                        {error}
                    </span>
                )}
                {/* Show expression preview when custom formula is set */}
                {formulaType === "custom" &&
                    customFormulaConfig?.expression && (
                        <div className="w-full mt-1 pl-1">
                            <code className="text-[10px] text-muted-foreground font-mono break-all">
                                {customFormulaConfig.expression}
                            </code>
                        </div>
                    )}
            </div>
        );
    }

    const currentFormula = parseFormulaConfig(period.formulaConfig);

    return (
        <div className="group flex items-center gap-0.5">
            <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() =>
                    router.push(
                        `/classes/${classId}/subjects/${subjectId}/periods/${period.id}`,
                    )
                }
            >
                <ExternalLink className="mr-1 size-3" />
                {period.name}
            </Button>
            <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 ${
                    currentFormula.type === "custom"
                        ? "border-primary/50 text-primary"
                        : ""
                }`}
                title={
                    currentFormula.type === "custom" &&
                    currentFormula.expression
                        ? `Formula: ${currentFormula.expression}`
                        : undefined
                }
            >
                {currentFormula.type === "custom" && (
                    <Calculator className="size-2.5 mr-0.5 inline-block" />
                )}
                {FORMULA_LABELS[currentFormula.type]}
            </Badge>
            {!readOnly && onUpdatePeriod && (
                <Button
                    variant="ghost"
                    size="icon-xs"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setEditing(true)}
                    aria-label="Edit period"
                >
                    <Pencil className="size-3" />
                </Button>
            )}
        </div>
    );
}
