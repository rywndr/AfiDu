import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

// Types
export interface SemesterPreviewCardProps {
    semester: {
        semesterNumber: number;
        name: string;
        startDate: string;
        endDate: string;
    };
}

// SemesterPreviewCard
export function SemesterPreviewCard({ semester }: SemesterPreviewCardProps) {
    return (
        <div className="rounded-md border bg-background p-3 space-y-1">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{semester.name}</span>
                <Badge variant="outline" className="text-xs">
                    Semester {semester.semesterNumber}
                </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
                {formatDate(semester.startDate)} —{" "}
                {formatDate(semester.endDate)}
            </p>
        </div>
    );
}
