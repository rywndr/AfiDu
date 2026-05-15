import { type LucideIcon, InboxIcon } from "lucide-react";

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    children?: React.ReactNode;
}

export function EmptyState({
    icon: Icon = InboxIcon,
    title,
    description,
    children,
}: EmptyStateProps) {
    return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Icon className="size-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            {description && (
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    {description}
                </p>
            )}
            {children && (
                <div className="mt-6 flex items-center gap-2">{children}</div>
            )}
        </div>
    );
}
