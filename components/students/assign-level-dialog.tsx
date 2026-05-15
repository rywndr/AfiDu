"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
import { assignLevel } from "@/lib/actions/students";
import type { Level, Semester } from "@/lib/types";

// Props
interface AssignLevelDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    studentId: string;
    studentName: string;
    levels: Level[];
    semesters: Semester[];
}

// Component
export function AssignLevelDialog({
    open,
    onOpenChange,
    studentId,
    studentName,
    levels,
    semesters,
}: AssignLevelDialogProps) {
    const router = useRouter();
    const [selectedLevelId, setSelectedLevelId] = useState("");
    const [selectedSemesterId, setSelectedSemesterId] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();

            if (!selectedLevelId) {
                setError("Level wajib dipilih");
                return;
            }
            if (!selectedSemesterId) {
                setError("Semester wajib dipilih");
                return;
            }

            setSubmitting(true);
            setError(null);

            const result = await assignLevel({
                studentId,
                levelId: selectedLevelId,
                semesterId: selectedSemesterId,
            });

            setSubmitting(false);

            if (result.success) {
                setSelectedLevelId("");
                setSelectedSemesterId("");
                setError(null);
                router.refresh();
                onOpenChange(false);
            } else {
                setError(result.error ?? "Gagal menetapkan level");
            }
        },
        [studentId, selectedLevelId, selectedSemesterId, router, onOpenChange],
    );

    const handleOpenChange = useCallback(
        (nextOpen: boolean) => {
            if (!nextOpen) {
                setSelectedLevelId("");
                setSelectedSemesterId("");
                setError(null);
            }
            onOpenChange(nextOpen);
        },
        [onOpenChange],
    );

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Tetapkan Level</DialogTitle>
                    <DialogDescription>
                        Tetapkan level baru untuk{" "}
                        <span className="font-medium text-foreground">
                            {studentName}
                        </span>{" "}
                        pada semester tertentu.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label>Level</Label>
                        {levels.length > 0 ? (
                            <Select
                                value={selectedLevelId}
                                onValueChange={(val: string | null) => {
                                    if (val) setSelectedLevelId(val);
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <span className="truncate">
                                        {selectedLevelId
                                            ? (levels.find(
                                                  (l) =>
                                                      l.id === selectedLevelId,
                                              )?.name ?? "Pilih level")
                                            : "Pilih level"}
                                    </span>
                                </SelectTrigger>
                                <SelectContent>
                                    {levels.map((level) => (
                                        <SelectItem
                                            key={level.id}
                                            value={level.id}
                                        >
                                            {level.name}
                                            {level.description
                                                ? ` — ${level.description}`
                                                : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-3 text-center">
                                Belum ada level. Buat level terlebih dahulu di
                                halaman Pengaturan.
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label>Semester</Label>
                        {semesters.length > 0 ? (
                            <Select
                                value={selectedSemesterId}
                                onValueChange={(val: string | null) => {
                                    if (val) setSelectedSemesterId(val);
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <span className="truncate">
                                        {selectedSemesterId
                                            ? (semesters.find(
                                                  (s) =>
                                                      s.id ===
                                                      selectedSemesterId,
                                              )?.name ?? "Pilih semester")
                                            : "Pilih semester"}
                                    </span>
                                </SelectTrigger>
                                <SelectContent>
                                    {semesters.map((sem) => (
                                        <SelectItem key={sem.id} value={sem.id}>
                                            {sem.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-3 text-center">
                                Belum ada semester. Buat tahun ajaran dan
                                semester terlebih dahulu di halaman Pengaturan.
                            </p>
                        )}
                    </div>

                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            disabled={submitting}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                submitting ||
                                !selectedLevelId ||
                                !selectedSemesterId
                            }
                        >
                            {submitting ? "Menyimpan..." : "Tetapkan Level"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
