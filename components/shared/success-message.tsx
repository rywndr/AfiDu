import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuccessMessageProps {
    title: string;
    description: React.ReactNode;
    /** Label for reset / "do another" button. If omitted, no button is shown */
    resetLabel?: string;
    onReset?: () => void;
}

export function SuccessMessage({
    title,
    description,
    resetLabel,
    onReset,
}: SuccessMessageProps) {
    return (
        <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-green-500/10">
                    <CheckCircle className="size-5 text-green-600" />
                </div>
                <div>
                    <h3 className="text-base font-semibold">{title}</h3>
                    <p className="text-sm text-muted-foreground">
                        {description}
                    </p>
                </div>
            </div>
            {onReset && resetLabel && (
                <Button onClick={onReset} variant="outline" className="w-full">
                    {resetLabel}
                </Button>
            )}
        </div>
    );
}
