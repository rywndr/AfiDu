import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type WarningVariant = "amber" | "destructive" | "yellow";

interface WarningBannerProps {
    title: string;
    description: React.ReactNode;
    variant?: WarningVariant;
    className?: string;
}

const variantStyles: Record<
    WarningVariant,
    {
        container: string;
        icon: string;
        title: string;
        description: string;
    }
> = {
    amber: {
        container:
            "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950",
        icon: "text-amber-600 dark:text-amber-400",
        title: "text-amber-800 dark:text-amber-200",
        description: "text-amber-700 dark:text-amber-300",
    },
    yellow: {
        container:
            "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950",
        icon: "text-yellow-600 dark:text-yellow-400",
        title: "text-yellow-800 dark:text-yellow-200",
        description: "text-yellow-700 dark:text-yellow-300",
    },
    destructive: {
        container: "border-destructive/50 bg-destructive/5",
        icon: "text-destructive",
        title: "text-destructive",
        description: "text-destructive/80",
    },
};

export function WarningBanner({
    title,
    description,
    variant = "amber",
    className,
}: WarningBannerProps) {
    const styles = variantStyles[variant];

    return (
        <div
            className={cn(
                "flex items-start gap-3 rounded-lg border p-4",
                styles.container,
                className,
            )}
        >
            <AlertTriangle
                className={cn("size-5 shrink-0 mt-0.5", styles.icon)}
            />
            <div className="space-y-1">
                <p className={cn("text-sm font-medium", styles.title)}>
                    {title}
                </p>
                <p className={cn("text-xs", styles.description)}>
                    {description}
                </p>
            </div>
        </div>
    );
}
