"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { formatRupiah } from "@/lib/utils";

interface PaymentAmountInputProps {
    value: number;
    onChange: (value: number) => void;
    disabled?: boolean;
}

export function PaymentAmountInput({
    value,
    onChange,
    disabled,
}: PaymentAmountInputProps) {
    const [displayValue, setDisplayValue] = useState(String(value));

    const handleBlur = useCallback(() => {
        const cleaned = displayValue.replace(/[^\d]/g, "");
        const parsed = parseInt(cleaned, 10);
        const finalValue = Number.isNaN(parsed) ? 0 : parsed;
        onChange(finalValue);
        setDisplayValue(String(finalValue));
    }, [displayValue, onChange]);

    return (
        <div className="space-y-1">
            <div className="flex items-center gap-0">
                <span className="inline-flex h-8 items-center rounded-l-lg border border-r-0 border-input bg-muted px-2.5 text-sm text-muted-foreground">
                    Rp
                </span>
                <Input
                    value={displayValue}
                    onChange={(e) => setDisplayValue(e.target.value)}
                    onBlur={handleBlur}
                    className="rounded-l-none"
                    placeholder="0"
                    disabled={disabled}
                />
            </div>
            <p className="text-xs text-muted-foreground">
                {formatRupiah(value)}
            </p>
        </div>
    );
}
