"use client";

import { SubjectsCard } from "@/components/settings/subjects-card";
import { LevelsCard } from "@/components/settings/levels-card";
import type { Subject, Level } from "@/lib/types";

// Props
interface SubjectsLevelsManagerProps {
    subjects: Subject[];
    levels: Level[];
}

// Main Component
export function SubjectsLevelsManager({
    subjects,
    levels,
}: SubjectsLevelsManagerProps) {
    return (
        <div className="space-y-8">
            <SubjectsCard subjects={subjects} />
            <LevelsCard levels={levels} />
        </div>
    );
}
