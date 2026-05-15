"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PeriodBadge } from "@/components/classes/period-badge";
import { CustomFormulaDialog } from "@/components/classes/custom-formula-dialog";
import {
    ClipboardCheck,
    Plus,
    Trash2,
    Pencil,
    Save,
    X,
    Calculator,
    Sigma,
} from "lucide-react";
import type {
    ClassSubjectWithDetails,
    Level,
    FormulaConfig,
} from "@/lib/types";

// Helpers
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
export interface SubjectRowProps {
    classId: string;
    classSubject: ClassSubjectWithDetails;
    levels: Level[];
    onAddPeriod?: () => void;
    onRemoveSubject?: () => void;
    onUpdateSubjectLevel?: (levelId: string | null) => void;
    onUpdateSubjectFormula?: (
        classSubjectId: string,
        formulaConfig: string,
    ) => Promise<{ success: boolean; error?: string }>;
    onUpdatePeriod?: (
        periodId: string,
        name: string,
        order: number,
        formulaConfig?: string,
    ) => Promise<{ success: boolean; error?: string }>;
    onDeletePeriod?: (periodId: string) => void;
    /** When true, hide all add/edit/delete actions (read-only mode for admins). */
    readOnly?: boolean;
}

// Component
export function SubjectRow({
    classId,
    classSubject,
    levels,
    onAddPeriod,
    onRemoveSubject,
    onUpdateSubjectLevel,
    onUpdateSubjectFormula,
    onUpdatePeriod,
    onDeletePeriod,
    readOnly = false,
}: SubjectRowProps) {
    const [editingLevel, setEditingLevel] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState<string>(
        classSubject.levelId ?? "",
    );

    const handleSaveLevel = useCallback(() => {
        onUpdateSubjectLevel?.(selectedLevel || null);
        setEditingLevel(false);
    }, [selectedLevel, onUpdateSubjectLevel]);

    return (
        <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                    <ClipboardCheck className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                        {classSubject.subject.name}
                    </span>

                    <LevelDisplay
                        classSubject={classSubject}
                        editingLevel={!readOnly && editingLevel}
                        selectedLevel={selectedLevel}
                        levels={levels}
                        onSelectedLevelChange={setSelectedLevel}
                        onSaveLevel={handleSaveLevel}
                        onCancelEdit={() => {
                            setSelectedLevel(classSubject.levelId ?? "");
                            setEditingLevel(false);
                        }}
                    />

                    {/* Subject-level formula badge */}
                    <SubjectFormulaBadge
                        classSubject={classSubject}
                        onUpdateSubjectFormula={
                            readOnly ? undefined : onUpdateSubjectFormula
                        }
                        readOnly={readOnly}
                    />
                </div>

                {!readOnly && (
                    <SubjectActions
                        editingLevel={editingLevel}
                        onStartEditLevel={
                            onUpdateSubjectLevel
                                ? () => setEditingLevel(true)
                                : undefined
                        }
                        onAddPeriod={onAddPeriod}
                        onRemoveSubject={onRemoveSubject}
                        subjectName={classSubject.subject.name}
                    />
                )}
            </div>

            <PeriodsSection
                classId={classId}
                subjectId={classSubject.subjectId}
                periods={classSubject.periods}
                onUpdatePeriod={readOnly ? undefined : onUpdatePeriod}
                onDeletePeriod={readOnly ? undefined : onDeletePeriod}
                readOnly={readOnly}
            />
        </div>
    );
}

// Subject Formula Badge
interface SubjectFormulaBadgeProps {
    classSubject: ClassSubjectWithDetails;
    onUpdateSubjectFormula?: (
        classSubjectId: string,
        formulaConfig: string,
    ) => Promise<{ success: boolean; error?: string }>;
    readOnly?: boolean;
}

function SubjectFormulaBadge({
    classSubject,
    onUpdateSubjectFormula,
    readOnly = false,
}: SubjectFormulaBadgeProps) {
    const currentFormula = parseFormulaConfig(classSubject.formulaConfig);
    const [editing, setEditing] = useState(false);
    const [formulaType, setFormulaType] = useState<FormulaConfig["type"]>(
        currentFormula.type,
    );
    const [customFormulaConfig, setCustomFormulaConfig] =
        useState<FormulaConfig | null>(
            currentFormula.type === "custom" ? currentFormula : null,
        );
    const [customDialogOpen, setCustomDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = useCallback(async () => {
        if (!onUpdateSubjectFormula) return;

        setSaving(true);
        setError(null);

        let formulaConfigStr: string;
        if (formulaType === "custom" && customFormulaConfig) {
            formulaConfigStr = JSON.stringify(customFormulaConfig);
        } else if (formulaType === "custom" && !customFormulaConfig) {
            formulaConfigStr = JSON.stringify({ type: "average" });
        } else {
            formulaConfigStr = JSON.stringify({ type: formulaType });
        }

        const result = await onUpdateSubjectFormula(
            classSubject.id,
            formulaConfigStr,
        );
        setSaving(false);

        if (result.success) {
            setEditing(false);
        } else {
            setError(result.error ?? "Gagal memperbarui formula");
        }
    }, [
        classSubject.id,
        formulaType,
        customFormulaConfig,
        onUpdateSubjectFormula,
    ]);

    const handleCancel = useCallback(() => {
        const parsed = parseFormulaConfig(classSubject.formulaConfig);
        setFormulaType(parsed.type);
        setCustomFormulaConfig(parsed.type === "custom" ? parsed : null);
        setEditing(false);
        setError(null);
    }, [classSubject.formulaConfig]);

    const handleFormulaTypeChange = useCallback((val: string | null) => {
        if (!val) return;
        const newType = val as FormulaConfig["type"];
        setFormulaType(newType);
        if (newType === "custom") {
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
            <div className="flex flex-wrap items-center gap-1 rounded-md border bg-muted/30 px-1.5 py-1">
                <Sigma className="size-3 text-muted-foreground" />
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
                    aria-label="Simpan formula"
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
                {error && (
                    <span className="text-[10px] text-destructive">
                        {error}
                    </span>
                )}
                {formulaType === "custom" &&
                    customFormulaConfig?.expression && (
                        <code className="text-[10px] text-muted-foreground font-mono break-all">
                            {customFormulaConfig.expression}
                        </code>
                    )}
            </div>
        );
    }

    return (
        <div className="group/formula inline-flex items-center gap-0.5">
            <Badge
                variant="secondary"
                className={`text-[10px] px-1.5 py-0 gap-1 ${
                    currentFormula.type === "custom"
                        ? "border-primary/50 text-primary"
                        : ""
                }`}
                title={
                    currentFormula.type === "custom" &&
                    currentFormula.expression
                        ? `Formula Mata Pelajaran: ${currentFormula.expression}`
                        : `Formula Mata Pelajaran: ${FORMULA_LABELS[currentFormula.type]}`
                }
            >
                <Sigma className="size-2.5" />
                {currentFormula.type === "custom" && (
                    <Calculator className="size-2.5" />
                )}
                {FORMULA_LABELS[currentFormula.type]}
            </Badge>
            {!readOnly && onUpdateSubjectFormula && (
                <Button
                    variant="ghost"
                    size="icon-xs"
                    className="opacity-0 group-hover/formula:opacity-100 transition-opacity"
                    onClick={() => setEditing(true)}
                    aria-label="Edit formula mata pelajaran"
                >
                    <Pencil className="size-2.5" />
                </Button>
            )}
        </div>
    );
}

// Level Display
interface LevelDisplayProps {
    classSubject: ClassSubjectWithDetails;
    editingLevel: boolean;
    selectedLevel: string;
    levels: Level[];
    onSelectedLevelChange: (value: string) => void;
    onSaveLevel: () => void;
    onCancelEdit: () => void;
}

function LevelDisplay({
    classSubject,
    editingLevel,
    selectedLevel,
    levels,
    onSelectedLevelChange,
    onSaveLevel,
    onCancelEdit,
}: LevelDisplayProps) {
    if (editingLevel) {
        return (
            <div className="flex items-center gap-1">
                <Select
                    value={selectedLevel}
                    onValueChange={(val: string | null) => {
                        onSelectedLevelChange(val ?? "");
                    }}
                >
                    <SelectTrigger className="h-7 w-36 text-xs">
                        <span className="truncate">
                            {selectedLevel
                                ? (levels.find((l) => l.id === selectedLevel)
                                      ?.name ?? "Pilih level")
                                : "Tanpa Level"}
                        </span>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="">Tanpa Level</SelectItem>
                        {levels.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                                {l.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={onSaveLevel}
                    aria-label="Simpan level"
                >
                    <Save className="size-3 text-green-600" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={onCancelEdit}
                    aria-label="Batal edit level"
                >
                    <X className="size-3" />
                </Button>
            </div>
        );
    }

    if (classSubject.level) {
        return (
            <Badge variant="outline" className="text-xs">
                {classSubject.level.name}
            </Badge>
        );
    }

    return <span className="text-xs text-muted-foreground">(tanpa level)</span>;
}

// Subject Actions
interface SubjectActionsProps {
    editingLevel: boolean;
    onStartEditLevel?: () => void;
    onAddPeriod?: () => void;
    onRemoveSubject?: () => void;
    subjectName: string;
}

function SubjectActions({
    editingLevel,
    onStartEditLevel,
    onAddPeriod,
    onRemoveSubject,
    subjectName,
}: SubjectActionsProps) {
    return (
        <div className="flex items-center gap-1">
            {!editingLevel && onStartEditLevel && (
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={onStartEditLevel}
                    aria-label="Edit level"
                >
                    <Pencil className="size-3.5" />
                </Button>
            )}
            {onAddPeriod && (
                <Button variant="ghost" size="sm" onClick={onAddPeriod}>
                    <Plus className="mr-1 size-3" />
                    Period
                </Button>
            )}
            {onRemoveSubject && (
                <ConfirmDialog
                    title="Hapus Mata Pelajaran"
                    description={`Apakah Anda yakin ingin menghapus "${subjectName}" dari kelas ini? Semua period dan nilai yang terkait akan ikut terhapus.`}
                    confirmLabel="Hapus"
                    onConfirm={onRemoveSubject}
                    trigger={
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Hapus mata pelajaran"
                        >
                            <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                    }
                />
            )}
        </div>
    );
}

// Periods Section
interface PeriodsSectionProps {
    classId: string;
    subjectId: string;
    periods: ClassSubjectWithDetails["periods"];
    onUpdatePeriod?: (
        periodId: string,
        name: string,
        order: number,
        formulaConfig?: string,
    ) => Promise<{ success: boolean; error?: string }>;
    onDeletePeriod?: (periodId: string) => void;
    readOnly?: boolean;
}

function PeriodsSection({
    classId,
    subjectId,
    periods,
    onUpdatePeriod,
    onDeletePeriod,
    readOnly = false,
}: PeriodsSectionProps) {
    if (periods.length === 0) {
        return (
            <p className="pl-6 text-xs text-muted-foreground">
                {readOnly
                    ? "Belum ada period."
                    : "Belum ada period. Tambahkan period untuk membuka gradebook."}
            </p>
        );
    }

    return (
        <div className="flex flex-wrap gap-2 pl-6">
            {periods.map((period) => (
                <PeriodBadge
                    key={period.id}
                    classId={classId}
                    subjectId={subjectId}
                    period={period}
                    onUpdatePeriod={onUpdatePeriod}
                    onDeletePeriod={onDeletePeriod}
                    readOnly={readOnly}
                />
            ))}
        </div>
    );
}
