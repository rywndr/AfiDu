import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";

const GENDER_LABELS: Record<string, string> = {
    male: "Laki-laki",
    female: "Perempuan",
};

interface GenderSelectProps {
    value: "male" | "female" | undefined;
    onChange: (value: "male" | "female" | undefined) => void;
    disabled?: boolean;
}

export function GenderSelect({ value, onChange, disabled }: GenderSelectProps) {
    return (
        <Select
            value={value ?? ""}
            onValueChange={(val) =>
                onChange((val as "male" | "female") || undefined)
            }
            disabled={disabled}
        >
            <SelectTrigger className="w-full">
                <span className="truncate">
                    {value ? GENDER_LABELS[value] : "Pilih jenis kelamin"}
                </span>
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="male">Laki-laki</SelectItem>
                <SelectItem value="female">Perempuan</SelectItem>
            </SelectContent>
        </Select>
    );
}
