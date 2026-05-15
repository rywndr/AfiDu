import { Label } from "@/components/ui/label";

// Shared FormField wrapper
export interface FormFieldProps {
    label: string;
    error?: string;
    children: React.ReactNode;
}

export function FormField({ label, error, children }: FormFieldProps) {
    return (
        <div className="grid gap-2">
            <Label>{label}</Label>
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}
