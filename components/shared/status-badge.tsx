import { Badge } from "@/components/ui/badge";

type PaymentStatus = "paid" | "unpaid" | "partial";
type CompletionStatus = "complete" | "incomplete";

type StatusType = PaymentStatus | CompletionStatus;

interface StatusConfig {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
}

const STATUS_MAP: Record<StatusType, StatusConfig> = {
    paid: { label: "Lunas", variant: "default" },
    unpaid: { label: "Belum Bayar", variant: "destructive" },
    partial: { label: "Sebagian", variant: "secondary" },
    complete: { label: "Lengkap", variant: "default" },
    incomplete: { label: "Belum Lengkap", variant: "outline" },
};

interface StatusBadgeProps {
    status: StatusType;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = STATUS_MAP[status];

    return (
        <Badge variant={config.variant} className={className}>
            {config.label}
        </Badge>
    );
}
