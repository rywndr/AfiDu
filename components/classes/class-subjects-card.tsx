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
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { SubjectRow } from "@/components/classes/subject-row";
import {
    addClassSubject,
    createPeriod,
    removeClassSubject,
    updateClassSubject,
    updatePeriod,
    deletePeriod,
} from "@/lib/actions/classes";
import { BookOpen, Plus } from "lucide-react";
import type {
    ClassSubjectWithDetails,
    Subject,
    Semester,
    Level,
} from "@/lib/types";

// Props
interface ClassSubjectsCardProps {
    classId: string;
    classSubjects: ClassSubjectWithDetails[];
    allSubjects: Subject[];
    semesters: Semester[];
    levels: Level[];
    /** When true, hide add/edit/delete actions (read-only mode for admins). */
    readOnly?: boolean;
}

// ClassSubjectsCard
export function ClassSubjectsCard({
    classId,
    classSubjects,
    allSubjects,
    semesters,
    levels,
    readOnly = false,
}: ClassSubjectsCardProps) {
    const router = useRouter();
    const [addingSubject, setAddingSubject] = useState(false);
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [selectedSemesterId, setSelectedSemesterId] = useState("");
    const [selectedLevelId, setSelectedLevelId] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAddSubject = useCallback(async () => {
        if (!selectedSubjectId || !selectedSemesterId) return;
        setSubmitting(true);
        setError(null);

        const result = await addClassSubject({
            classId,
            subjectId: selectedSubjectId,
            semesterId: selectedSemesterId,
            levelId: selectedLevelId || undefined,
        });

        setSubmitting(false);

        if (result.success) {
            setSelectedSubjectId("");
            setSelectedSemesterId("");
            setSelectedLevelId("");
            setAddingSubject(false);
            router.refresh();
        } else {
            setError(result.error ?? "Gagal menambahkan mata pelajaran");
        }
    }, [
        classId,
        selectedSubjectId,
        selectedSemesterId,
        selectedLevelId,
        router,
    ]);

    const handleAddPeriod = useCallback(
        async (classSubjectId: string, existingCount: number) => {
            const periodNumber = existingCount + 1;
            const result = await createPeriod({
                classSubjectId,
                name: `Period ${periodNumber}`,
                order: periodNumber,
            });

            if (result.success) {
                router.refresh();
            }
        },
        [router],
    );

    const handleRemoveSubject = useCallback(
        async (classSubjectId: string) => {
            const result = await removeClassSubject({ id: classSubjectId });
            if (result.success) {
                router.refresh();
            }
        },
        [router],
    );

    const handleUpdateSubjectFormula = useCallback(
        async (classSubjectId: string, formulaConfig: string) => {
            const result = await updateClassSubject({
                id: classSubjectId,
                formulaConfig,
            });
            if (result.success) {
                router.refresh();
            }
            return result;
        },
        [router],
    );

    const handleUpdateSubjectLevel = useCallback(
        async (classSubjectId: string, levelId: string | null) => {
            const result = await updateClassSubject({
                id: classSubjectId,
                levelId: levelId,
            });
            if (result.success) {
                router.refresh();
            }
        },
        [router],
    );

    const handleUpdatePeriod = useCallback(
        async (
            periodId: string,
            name: string,
            order: number,
            formulaConfig?: string,
        ) => {
            const result = await updatePeriod({
                id: periodId,
                name,
                order,
                formulaConfig,
            });
            if (result.success) {
                router.refresh();
            }
            return result;
        },
        [router],
    );

    const handleDeletePeriod = useCallback(
        async (periodId: string) => {
            const result = await deletePeriod({ id: periodId });
            if (result.success) {
                router.refresh();
            }
        },
        [router],
    );

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="size-5" />
                            Mata Pelajaran & Period
                        </CardTitle>
                        <CardDescription>
                            Mata pelajaran per semester dan period untuk
                            gradebook
                        </CardDescription>
                    </div>
                    {!readOnly && !addingSubject && (
                        <Button
                            size="sm"
                            onClick={() => setAddingSubject(true)}
                        >
                            <Plus className="mr-1" />
                            Tambah
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {!readOnly && addingSubject && (
                    <AddSubjectForm
                        allSubjects={allSubjects}
                        semesters={semesters}
                        levels={levels}
                        selectedSubjectId={selectedSubjectId}
                        selectedSemesterId={selectedSemesterId}
                        selectedLevelId={selectedLevelId}
                        onSelectSubject={setSelectedSubjectId}
                        onSelectSemester={setSelectedSemesterId}
                        onSelectLevel={setSelectedLevelId}
                        onSubmit={handleAddSubject}
                        onCancel={() => {
                            setAddingSubject(false);
                            setError(null);
                        }}
                        submitting={submitting}
                        error={error}
                    />
                )}

                {classSubjects.length === 0 ? (
                    <EmptyState
                        icon={BookOpen}
                        title="Belum ada mata pelajaran"
                        description={
                            readOnly
                                ? "Belum ada mata pelajaran di kelas ini."
                                : "Tambahkan mata pelajaran untuk mulai membuat gradebook."
                        }
                    />
                ) : (
                    <SubjectsList
                        classId={classId}
                        classSubjects={classSubjects}
                        levels={levels}
                        onAddPeriod={readOnly ? undefined : handleAddPeriod}
                        onRemoveSubject={
                            readOnly ? undefined : handleRemoveSubject
                        }
                        onUpdateSubjectLevel={
                            readOnly ? undefined : handleUpdateSubjectLevel
                        }
                        onUpdateSubjectFormula={
                            readOnly ? undefined : handleUpdateSubjectFormula
                        }
                        onUpdatePeriod={
                            readOnly ? undefined : handleUpdatePeriod
                        }
                        onDeletePeriod={
                            readOnly ? undefined : handleDeletePeriod
                        }
                    />
                )}
            </CardContent>
        </Card>
    );
}

// AddSubjectForm
interface AddSubjectFormProps {
    allSubjects: Subject[];
    semesters: Semester[];
    levels: Level[];
    selectedSubjectId: string;
    selectedSemesterId: string;
    selectedLevelId: string;
    onSelectSubject: (id: string) => void;
    onSelectSemester: (id: string) => void;
    onSelectLevel: (id: string) => void;
    onSubmit: () => void;
    onCancel: () => void;
    submitting: boolean;
    error: string | null;
}

function AddSubjectForm({
    allSubjects,
    semesters,
    levels,
    selectedSubjectId,
    selectedSemesterId,
    selectedLevelId,
    onSelectSubject,
    onSelectSemester,
    onSelectLevel,
    onSubmit,
    onCancel,
    submitting,
    error,
}: AddSubjectFormProps) {
    return (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">Tambah Mata Pelajaran</p>
            <div className="grid gap-3 sm:grid-cols-3">
                <Select
                    value={selectedSubjectId}
                    onValueChange={(val: string | null) => {
                        if (val) onSelectSubject(val);
                    }}
                >
                    <SelectTrigger className="w-full">
                        <span className="truncate">
                            {selectedSubjectId
                                ? (allSubjects.find(
                                      (s) => s.id === selectedSubjectId,
                                  )?.name ?? "Mata Pelajaran")
                                : "Mata Pelajaran"}
                        </span>
                    </SelectTrigger>
                    <SelectContent>
                        {allSubjects.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                                {s.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={selectedSemesterId}
                    onValueChange={(val: string | null) => {
                        if (val) onSelectSemester(val);
                    }}
                >
                    <SelectTrigger className="w-full">
                        <span className="truncate">
                            {selectedSemesterId
                                ? (semesters.find(
                                      (s) => s.id === selectedSemesterId,
                                  )?.name ?? "Semester")
                                : "Semester"}
                        </span>
                    </SelectTrigger>
                    <SelectContent>
                        {semesters.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                                {s.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={selectedLevelId}
                    onValueChange={(val: string | null) => {
                        onSelectLevel(val ?? "");
                    }}
                >
                    <SelectTrigger className="w-full">
                        <span className="truncate">
                            {selectedLevelId
                                ? (levels.find((l) => l.id === selectedLevelId)
                                      ?.name ?? "Level (opsional)")
                                : "Level (opsional)"}
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
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    onClick={onSubmit}
                    disabled={
                        !selectedSubjectId || !selectedSemesterId || submitting
                    }
                >
                    {submitting ? "Menambahkan..." : "Tambahkan"}
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={onCancel}
                    disabled={submitting}
                >
                    Batal
                </Button>
            </div>
        </div>
    );
}

// SubjectsList
interface SubjectsListProps {
    classId: string;
    classSubjects: ClassSubjectWithDetails[];
    levels: Level[];
    onAddPeriod?: (classSubjectId: string, existingCount: number) => void;
    onRemoveSubject?: (classSubjectId: string) => void;
    onUpdateSubjectLevel?: (
        classSubjectId: string,
        levelId: string | null,
    ) => void;
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
}

function SubjectsList({
    classId,
    classSubjects,
    levels,
    onAddPeriod,
    onRemoveSubject,
    onUpdateSubjectLevel,
    onUpdateSubjectFormula,
    onUpdatePeriod,
    onDeletePeriod,
}: SubjectsListProps) {
    const grouped = new Map<string, ClassSubjectWithDetails[]>();
    for (const cs of classSubjects) {
        const key = cs.semester.name;
        const existing = grouped.get(key) ?? [];
        existing.push(cs);
        grouped.set(key, existing);
    }

    return (
        <div className="space-y-4">
            {Array.from(grouped.entries()).map(([semesterName, subjects]) => (
                <SemesterGroup
                    key={semesterName}
                    classId={classId}
                    semesterName={semesterName}
                    subjects={subjects}
                    levels={levels}
                    onAddPeriod={onAddPeriod}
                    onRemoveSubject={onRemoveSubject}
                    onUpdateSubjectLevel={onUpdateSubjectLevel}
                    onUpdateSubjectFormula={onUpdateSubjectFormula}
                    onUpdatePeriod={onUpdatePeriod}
                    onDeletePeriod={onDeletePeriod}
                    readOnly={!onAddPeriod}
                />
            ))}
        </div>
    );
}

// SemesterGroup
interface SemesterGroupProps {
    classId: string;
    semesterName: string;
    subjects: ClassSubjectWithDetails[];
    levels: Level[];
    onAddPeriod?: (classSubjectId: string, existingCount: number) => void;
    onRemoveSubject?: (classSubjectId: string) => void;
    onUpdateSubjectLevel?: (
        classSubjectId: string,
        levelId: string | null,
    ) => void;
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
    readOnly?: boolean;
}

function SemesterGroup({
    classId,
    semesterName,
    subjects,
    levels,
    onAddPeriod,
    onRemoveSubject,
    onUpdateSubjectLevel,
    onUpdateSubjectFormula,
    onUpdatePeriod,
    onDeletePeriod,
    readOnly = false,
}: SemesterGroupProps) {
    return (
        <div className="rounded-lg border">
            <div className="border-b bg-muted/40 px-4 py-2">
                <h4 className="text-sm font-medium">{semesterName}</h4>
            </div>
            <div className="divide-y">
                {subjects.map((cs) => (
                    <SubjectRow
                        key={cs.id}
                        classId={classId}
                        classSubject={cs}
                        levels={levels}
                        onAddPeriod={
                            onAddPeriod
                                ? () => onAddPeriod(cs.id, cs.periods.length)
                                : undefined
                        }
                        onRemoveSubject={
                            onRemoveSubject
                                ? () => onRemoveSubject(cs.id)
                                : undefined
                        }
                        onUpdateSubjectLevel={
                            onUpdateSubjectLevel
                                ? (levelId: string | null) =>
                                      onUpdateSubjectLevel(cs.id, levelId)
                                : undefined
                        }
                        onUpdateSubjectFormula={onUpdateSubjectFormula}
                        onUpdatePeriod={onUpdatePeriod}
                        onDeletePeriod={onDeletePeriod}
                        readOnly={readOnly}
                    />
                ))}
            </div>
        </div>
    );
}
