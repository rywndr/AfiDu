"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

// SearchBar
interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    placeholder?: string;
    buttonLabel?: string;
    className?: string;
}

export function SearchBar({
    value,
    onChange,
    onSubmit,
    placeholder = "Cari...",
    buttonLabel = "Cari",
    className = "max-w-sm",
}: SearchBarProps) {
    return (
        <form
            onSubmit={onSubmit}
            className={`flex items-center gap-2 ${className}`}
        >
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="pl-8"
                />
            </div>
            <Button type="submit" variant="outline" size="default">
                {buttonLabel}
            </Button>
        </form>
    );
}

export type { SearchBarProps };
