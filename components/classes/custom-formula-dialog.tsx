"use client";

import { useState, useCallback, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    evaluateFormula,
    validateFormula,
    generateAutoMapping,
} from "@/lib/formula-engine";
import type { FormulaConfig } from "@/lib/types";
import {
    Calculator,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    HelpCircle,
    FlaskConical,
    Plus,
    Trash2,
    Variable,
} from "lucide-react";

// Types
interface Assignment {
    id: string;
    name: string;
}

interface VariableEntry {
    varName: string;
    assignmentId: string;
}

export interface CustomFormulaDialogProps {
    /** Current formula config (if editing an existing custom formula) */
    currentConfig?: FormulaConfig;
    /** Available assignments for variable mapping (optional – may not exist yet) */
    assignments?: Assignment[];
    /** Called when the user confirms the formula */
    onSave: (config: FormulaConfig) => void;
    /** Trigger element */
    trigger?: React.ReactNode;
    /** Control open state externally */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

// Helpers
function parseExistingVariables(
    config: FormulaConfig | undefined,
    assignments: Assignment[],
): VariableEntry[] {
    if (!config?.variables || Object.keys(config.variables).length === 0) {
        // Auto-generate from assignments
        if (assignments.length > 0) {
            const mapping = generateAutoMapping(assignments);
            return Object.entries(mapping).map(([varName, assignmentId]) => ({
                varName,
                assignmentId,
            }));
        }
        return [];
    }

    return Object.entries(config.variables).map(([varName, assignmentId]) => ({
        varName,
        assignmentId,
    }));
}

const EXAMPLE_FORMULAS = [
    {
        label: "Rata-rata semua tugas",
        expression: "AVG(UH1, UH2, UH3)",
        description: "Menghitung rata-rata dari UH1, UH2, UH3",
    },
    {
        label: "Bobot: 60% UH, 20% UTS, 20% UAS",
        expression: "AVG(UH1, UH2, UH3) * 0.6 + UTS * 0.2 + UAS * 0.2",
        description: "Rumus berbobot dengan UH, UTS, UAS",
    },
    {
        label: "Bobot: 40% Tugas, 30% UTS, 30% UAS",
        expression: "(TUGAS1 + TUGAS2) / 2 * 0.4 + UTS * 0.3 + UAS * 0.3",
        description: "Rumus berbobot untuk tugas harian",
    },
    {
        label: "Nilai terbaik dari 3 UH",
        expression: "MAX(UH1, UH2, UH3)",
        description: "Mengambil nilai tertinggi",
    },
];

const FUNCTION_DOCS = [
    { name: "AVG", desc: "Rata-rata argumen", example: "AVG(UH1, UH2, UH3)" },
    { name: "SUM", desc: "Jumlah total argumen", example: "SUM(UH1, UH2)" },
    { name: "MIN", desc: "Nilai minimum", example: "MIN(UH1, UH2, UH3)" },
    { name: "MAX", desc: "Nilai maksimum", example: "MAX(UH1, UH2, UH3)" },
    { name: "COUNT", desc: "Jumlah argumen", example: "COUNT(UH1, UH2)" },
];

// Inner content
interface CustomFormulaContentProps {
    currentConfig?: FormulaConfig;
    assignments: Assignment[];
    onSave: (config: FormulaConfig) => void;
    onClose: () => void;
}

function CustomFormulaContent({
    currentConfig,
    assignments,
    onSave,
    onClose,
}: CustomFormulaContentProps) {
    const [expression, setExpression] = useState(
        currentConfig?.expression ?? "",
    );
    const [variables, setVariables] = useState<VariableEntry[]>(() =>
        parseExistingVariables(currentConfig, assignments),
    );
    const [testValues, setTestValues] = useState<Record<string, string>>({});
    const [testResult, setTestResult] = useState<{
        value?: number;
        error?: string;
    } | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    const [showExamples, setShowExamples] = useState(false);

    // Validation
    const validation = useMemo(() => {
        if (!expression.trim()) {
            return {
                valid: false,
                error: undefined,
                variables: [] as string[],
            };
        }
        return validateFormula(expression);
    }, [expression]);

    // Variable names found in expression
    const expressionVars = validation.variables;

    // Show unmapped variables warning
    const unmappedVars = useMemo(() => {
        return expressionVars.filter(
            (v) =>
                !variables.some(
                    (entry) => entry.varName.toUpperCase() === v.toUpperCase(),
                ),
        );
    }, [expressionVars, variables]);

    // Test the formula
    const handleTest = useCallback(() => {
        if (!expression.trim()) {
            setTestResult({ error: "Ekspresi formula kosong" });
            return;
        }

        const context: Record<string, number> = {};

        for (const v of expressionVars) {
            const testVal = testValues[v];
            if (testVal !== undefined && testVal !== "") {
                const num = Number(testVal);
                if (Number.isNaN(num)) {
                    setTestResult({
                        error: `Nilai tes untuk "${v}" bukan angka valid`,
                    });
                    return;
                }
                context[v] = num;
            } else {
                context[v] = 0;
            }
        }

        try {
            const value = evaluateFormula(expression, context);
            setTestResult({ value: Math.round(value * 100) / 100 });
        } catch (err) {
            setTestResult({
                error:
                    err instanceof Error
                        ? err.message
                        : "Error evaluasi formula",
            });
        }
    }, [expression, expressionVars, testValues]);

    // Add a manual variable mapping
    const handleAddVariable = useCallback(() => {
        setVariables((prev) => [...prev, { varName: "", assignmentId: "" }]);
    }, []);

    // Update a variable entry
    const handleUpdateVariable = useCallback(
        (index: number, field: "varName" | "assignmentId", value: string) => {
            setVariables((prev) =>
                prev.map((entry, i) =>
                    i === index ? { ...entry, [field]: value } : entry,
                ),
            );
        },
        [],
    );

    // Remove a variable entry
    const handleRemoveVariable = useCallback((index: number) => {
        setVariables((prev) => prev.filter((_, i) => i !== index));
    }, []);

    // Auto-generate variables from assignments
    const handleAutoGenerate = useCallback(() => {
        if (assignments.length === 0) return;
        const mapping = generateAutoMapping(assignments);
        const entries = Object.entries(mapping).map(
            ([varName, assignmentId]) => ({
                varName,
                assignmentId,
            }),
        );
        setVariables(entries);

        if (!expression.trim()) {
            const varNames = entries.map((e) => e.varName);
            if (varNames.length > 0) {
                setExpression(`AVG(${varNames.join(", ")})`);
            }
        }
    }, [assignments, expression]);

    // Save
    const handleSave = useCallback(() => {
        if (!validation.valid) return;

        const variableMap: Record<string, string> = {};
        for (const entry of variables) {
            if (entry.varName.trim() && entry.assignmentId.trim()) {
                variableMap[entry.varName.trim()] = entry.assignmentId.trim();
            }
        }

        const config: FormulaConfig = {
            type: "custom",
            expression: expression.trim(),
            variables:
                Object.keys(variableMap).length > 0 ? variableMap : undefined,
        };

        onSave(config);
    }, [validation.valid, expression, variables, onSave]);

    // Use example
    const handleUseExample = useCallback((exampleExpression: string) => {
        setExpression(exampleExpression);
        setShowExamples(false);
        setTestResult(null);
    }, []);

    return (
        <div className="space-y-5 pt-2">
            {/* Expression Input */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="formula-expression" className="font-medium">
                        Ekspresi Formula
                    </Label>
                    <div className="flex gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setShowExamples(!showExamples)}
                        >
                            <FlaskConical className="mr-1 size-3" />
                            Contoh
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setShowHelp(!showHelp)}
                        >
                            <HelpCircle className="mr-1 size-3" />
                            Bantuan
                        </Button>
                    </div>
                </div>

                <Textarea
                    id="formula-expression"
                    value={expression}
                    onChange={(e) => {
                        setExpression(e.target.value);
                        setTestResult(null);
                    }}
                    placeholder="Contoh: AVG(UH1, UH2, UH3) * 0.6 + UTS * 0.2 + UAS * 0.2"
                    className="font-mono text-sm min-h-15"
                    rows={2}
                />

                {/* Validation feedback */}
                {expression.trim() && (
                    <div className="flex items-center gap-1.5 text-xs">
                        {validation.valid ? (
                            <>
                                <CheckCircle2 className="size-3.5 text-green-600" />
                                <span className="text-green-600">
                                    Formula valid
                                </span>
                                {expressionVars.length > 0 && (
                                    <span className="text-muted-foreground ml-1">
                                        · Variabel: {expressionVars.join(", ")}
                                    </span>
                                )}
                            </>
                        ) : (
                            <>
                                <XCircle className="size-3.5 text-destructive" />
                                <span className="text-destructive">
                                    {validation.error}
                                </span>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Examples */}
            {showExamples && (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Contoh Formula
                    </h4>
                    <div className="space-y-1.5">
                        {EXAMPLE_FORMULAS.map((ex) => (
                            <div
                                key={ex.label}
                                className="flex items-start justify-between gap-2 rounded-md border bg-background p-2"
                            >
                                <div className="space-y-0.5 min-w-0">
                                    <p className="text-xs font-medium">
                                        {ex.label}
                                    </p>
                                    <code className="text-[11px] text-muted-foreground font-mono break-all">
                                        {ex.expression}
                                    </code>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs shrink-0"
                                    onClick={() =>
                                        handleUseExample(ex.expression)
                                    }
                                >
                                    Pakai
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Help / Function reference */}
            {showHelp && (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                    <div className="space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Operator yang Tersedia
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                { op: "+", desc: "Tambah" },
                                { op: "-", desc: "Kurang" },
                                { op: "*", desc: "Kali" },
                                { op: "/", desc: "Bagi" },
                                { op: "( )", desc: "Kelompok" },
                            ].map((item) => (
                                <Badge
                                    key={item.op}
                                    variant="secondary"
                                    className="text-xs font-mono"
                                >
                                    {item.op}{" "}
                                    <span className="font-sans ml-1 text-muted-foreground">
                                        {item.desc}
                                    </span>
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Fungsi Bawaan
                        </h4>
                        <div className="space-y-1">
                            {FUNCTION_DOCS.map((fn) => (
                                <div
                                    key={fn.name}
                                    className="flex items-center gap-2 text-xs"
                                >
                                    <code className="font-mono font-medium text-primary w-16">
                                        {fn.name}
                                    </code>
                                    <span className="text-muted-foreground">
                                        {fn.desc}
                                    </span>
                                    <code className="font-mono text-[10px] text-muted-foreground ml-auto">
                                        {fn.example}
                                    </code>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Tips
                        </h4>
                        <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                            <li>
                                Nama variabel bersifat case-insensitive (UH1 =
                                uh1)
                            </li>
                            <li>
                                Gunakan underscore untuk spasi (contoh: TUGAS_1)
                            </li>
                            <li>
                                Angka desimal menggunakan titik (0.6, bukan 0,6)
                            </li>
                            <li>
                                Variabel yang tidak terpetakan ke tugas akan
                                otomatis dicocokkan berdasarkan nama
                            </li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Variable Mapping */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label className="font-medium flex items-center gap-1.5">
                        <Variable className="size-4" />
                        Pemetaan Variabel
                        <span className="text-xs font-normal text-muted-foreground">
                            (opsional)
                        </span>
                    </Label>
                    <div className="flex gap-1">
                        {assignments.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={handleAutoGenerate}
                            >
                                Auto-generate
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={handleAddVariable}
                        >
                            <Plus className="mr-1 size-3" />
                            Tambah
                        </Button>
                    </div>
                </div>

                {variables.length === 0 ? (
                    <p className="text-xs text-muted-foreground rounded-md border border-dashed p-3 text-center">
                        {assignments.length > 0
                            ? 'Klik "Auto-generate" untuk membuat pemetaan otomatis dari tugas yang ada, atau tambah manual.'
                            : "Belum ada tugas. Variabel akan dicocokkan berdasarkan nama tugas secara otomatis saat tugas sudah dibuat."}
                    </p>
                ) : (
                    <div className="space-y-1.5">
                        {variables.map((entry, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-2"
                            >
                                <Input
                                    value={entry.varName}
                                    onChange={(e) =>
                                        handleUpdateVariable(
                                            index,
                                            "varName",
                                            e.target.value
                                                .replace(/[^a-zA-Z0-9_]/g, "")
                                                .toUpperCase(),
                                        )
                                    }
                                    placeholder="VARIABEL"
                                    className="h-8 w-32 font-mono text-xs"
                                />
                                <span className="text-xs text-muted-foreground">
                                    →
                                </span>
                                {assignments.length > 0 ? (
                                    <select
                                        value={entry.assignmentId}
                                        onChange={(e) =>
                                            handleUpdateVariable(
                                                index,
                                                "assignmentId",
                                                e.target.value,
                                            )
                                        }
                                        className="h-8 flex-1 rounded-md border bg-background px-2 text-xs"
                                    >
                                        <option value="">Pilih tugas...</option>
                                        {assignments.map((a) => (
                                            <option key={a.id} value={a.id}>
                                                {a.name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <Input
                                        value={entry.assignmentId}
                                        onChange={(e) =>
                                            handleUpdateVariable(
                                                index,
                                                "assignmentId",
                                                e.target.value,
                                            )
                                        }
                                        placeholder="ID Tugas (akan diisi otomatis)"
                                        className="h-8 flex-1 text-xs"
                                        disabled
                                    />
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    onClick={() => handleRemoveVariable(index)}
                                >
                                    <Trash2 className="size-3 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Show unmapped variables warning */}
                {unmappedVars.length > 0 && variables.length > 0 && (
                    <div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-500">
                        <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
                        <span>
                            Variabel belum dipetakan: {unmappedVars.join(", ")}.
                            Variabel ini akan dicocokkan otomatis berdasarkan
                            nama tugas.
                        </span>
                    </div>
                )}
            </div>

            {/* Test Section */}
            {validation.valid && expressionVars.length > 0 && (
                <div className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium flex items-center gap-1.5">
                            <FlaskConical className="size-4" />
                            Uji Formula
                        </h4>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={handleTest}
                        >
                            Hitung
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {expressionVars.map((varName) => (
                            <div key={varName} className="space-y-1">
                                <Label className="text-xs font-mono">
                                    {varName}
                                </Label>
                                <Input
                                    type="number"
                                    value={testValues[varName] ?? ""}
                                    onChange={(e) =>
                                        setTestValues((prev) => ({
                                            ...prev,
                                            [varName]: e.target.value,
                                        }))
                                    }
                                    placeholder="0"
                                    className="h-8 text-xs"
                                    step="any"
                                />
                            </div>
                        ))}
                    </div>

                    {testResult && (
                        <div
                            className={`flex items-center gap-1.5 text-sm font-medium rounded-md px-3 py-2 ${
                                testResult.error
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            }`}
                        >
                            {testResult.error ? (
                                <>
                                    <XCircle className="size-4" />
                                    {testResult.error}
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="size-4" />
                                    Hasil: {testResult.value}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={onClose}>
                    Batal
                </Button>
                <Button onClick={handleSave} disabled={!validation.valid}>
                    <Calculator className="mr-1 size-4" />
                    Simpan Formula
                </Button>
            </div>
        </div>
    );
}

// Main Dialog Component
export function CustomFormulaDialog({
    currentConfig,
    assignments = [],
    onSave,
    trigger,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
}: CustomFormulaDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;

    const onOpenChange = useMemo(() => {
        if (isControlled) {
            return controlledOnOpenChange ?? (() => {});
        }
        return setInternalOpen;
    }, [isControlled, controlledOnOpenChange]);

    const handleClose = useCallback(() => {
        onOpenChange(false);
    }, [onOpenChange]);

    const handleSave = useCallback(
        (config: FormulaConfig) => {
            onSave(config);
            onOpenChange(false);
        },
        [onSave, onOpenChange],
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && (
                <DialogTrigger render={<span />}>{trigger}</DialogTrigger>
            )}
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calculator className="size-5" />
                        Formula Kustom
                    </DialogTitle>
                    <DialogDescription>
                        Buat formula penilaian kustom menggunakan ekspresi
                        matematika. Gunakan nama variabel untuk mereferensikan
                        tugas.
                    </DialogDescription>
                </DialogHeader>

                {/* Key by open state so content reinitialises each time dialog opens */}
                {open && (
                    <CustomFormulaContent
                        key={String(open)}
                        currentConfig={currentConfig}
                        assignments={assignments}
                        onSave={handleSave}
                        onClose={handleClose}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
