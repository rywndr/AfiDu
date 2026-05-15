"use client";

import { useState, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { saveScore } from "@/lib/actions/classes";

interface ScoreCellProps {
    assignmentId: string;
    studentId: string;
    maxScore: number;
    initialScore: number | null;
    onScoreChange: (
        assignmentId: string,
        studentId: string,
        score: number | null,
    ) => void;
}

/**
 * Inner component that owns the local `value` state.
 * It is keyed externally by `initialScore` so React will
 * remount it whenever the parent-supplied score changes,
 * avoiding the need for a synchronous `setState` inside an effect.
 */
function ScoreCellInner({
    assignmentId,
    studentId,
    maxScore,
    initialScore,
    onScoreChange,
}: ScoreCellProps) {
    const [value, setValue] = useState(
        initialScore !== null ? String(initialScore) : "",
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(false);
    const lastSavedRef = useRef(initialScore);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleBlur = useCallback(async () => {
        const trimmed = value.trim();
        const parsed = trimmed === "" ? null : parseFloat(trimmed);

        if (
            parsed !== null &&
            (isNaN(parsed) || parsed < 0 || parsed > maxScore)
        ) {
            setError(true);
            return;
        }

        setError(false);

        if (parsed === lastSavedRef.current) {
            return;
        }

        setSaving(true);

        const result = await saveScore({
            assignmentId,
            studentId,
            score: parsed,
        });

        setSaving(false);

        if (result.success) {
            lastSavedRef.current = parsed;
            onScoreChange(assignmentId, studentId, parsed);
        } else {
            setError(true);
        }
    }, [value, maxScore, assignmentId, studentId, onScoreChange]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
                e.preventDefault();
                inputRef.current?.blur();
            }
            if (e.key === "Escape") {
                setValue(
                    lastSavedRef.current !== null
                        ? String(lastSavedRef.current)
                        : "",
                );
                setError(false);
                inputRef.current?.blur();
            }
            // Tab: let default behavior proceed; blur will trigger save
        },
        [],
    );

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setError(false);
            setValue(e.target.value);
        },
        [],
    );

    return (
        <div className="relative">
            <Input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={value}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder="—"
                aria-label={`Score for assignment ${assignmentId}`}
                className={cn(
                    "h-8 w-16 text-center text-sm px-1 tabular-nums",
                    error && "border-destructive ring-destructive/20 ring-2",
                    saving && "opacity-60",
                )}
                disabled={saving}
            />
            {saving && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="size-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
            )}
        </div>
    );
}

/**
 * ScoreCell wrapper — keys the inner component on `initialScore`
 * so that whenever the parent changes the score (e.g. after a
 * batch save), the component remounts with the fresh value.
 * This avoids the problematic `useEffect` + `setState` pattern.
 */
export function ScoreCell(props: ScoreCellProps) {
    return (
        <ScoreCellInner
            key={`${props.assignmentId}-${props.studentId}-${props.initialScore}`}
            {...props}
        />
    );
}
