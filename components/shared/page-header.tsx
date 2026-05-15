interface PageHeaderProps {
    title: string;
    description?: string;
    children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
                {description && (
                    <p className="text-sm text-muted-foreground mt-1">
                        {description}
                    </p>
                )}
            </div>
            {children && (
                <div className="flex items-center gap-2 shrink-0">
                    {children}
                </div>
            )}
        </div>
    );
}
