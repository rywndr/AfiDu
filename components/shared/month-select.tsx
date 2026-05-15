import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
import { getMonthName } from "@/lib/utils";

interface MonthSelectProps {
    value: number;
    onChange: (value: number) => void;
    disabled?: boolean;
}

export function MonthSelect({ value, onChange, disabled }: MonthSelectProps) {
    return (
        <Select
            value={String(value)}
            onValueChange={(val: string | null) => {
                if (val) onChange(parseInt(val, 10));
            }}
            disabled={disabled}
        >
            <SelectTrigger className="w-full">
                <span className="truncate">{getMonthName(value)}</span>
            </SelectTrigger>
            <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <SelectItem key={month} value={String(month)}>
                        {getMonthName(month)}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
