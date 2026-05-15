"use client";

import { ALL_ROLES, type Role } from "@/lib/permissions";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

function formatRoleLabel(role: string): string {
    return role
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function getRoleDescription(role: Role): string {
    switch (role) {
        case "super-admin":
            return "Full access to all pages and actions";
        case "admin":
            return "Dashboard, payments, reports, documents (read-only students & scores)";
        case "teacher":
            return "Dashboard, students, scores, materials, reports";
    }
}

interface RoleSelectProps {
    value: Role | undefined;
    onValueChange: (value: Role) => void;
    disabled?: boolean;
}

export function RoleSelect({
    value,
    onValueChange,
    disabled,
}: RoleSelectProps) {
    return (
        <Select
            value={value ?? ""}
            onValueChange={(val) => onValueChange(val as Role)}
            disabled={disabled}
        >
            <SelectTrigger className="w-full">
                <span className="truncate">
                    {value ? formatRoleLabel(value) : "Select a role"}
                </span>
            </SelectTrigger>
            <SelectContent>
                {ALL_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                        <div className="flex flex-col">
                            <span>{formatRoleLabel(role)}</span>
                            <span className="text-xs text-muted-foreground">
                                {getRoleDescription(role)}
                            </span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
