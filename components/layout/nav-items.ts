import {
    LayoutDashboard,
    Users,
    GraduationCap,
    BookOpen,
    BookText,
    CreditCard,
    FileText,
    Settings,
    UserPlus,
    type LucideIcon,
} from "lucide-react";

import type { Page } from "@/lib/permissions";

export interface NavItem {
    label: string;
    href: string;
    icon: LucideIcon;
    page: Page;
    /** If set, the item is only visible to users with one of these roles */
    visibleTo?: string[];
}

export interface NavGroup {
    label: string;
    collapsible: boolean;
    items: readonly NavItem[];
}

// Ungrouped items
export const DASHBOARD_ITEM: NavItem = {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    page: "dashboard",
};

export const PAYMENTS_ITEM: NavItem = {
    label: "Payments",
    href: "/payments",
    icon: CreditCard,
    page: "payments",
};

export const DOCUMENTS_ITEM: NavItem = {
    label: "Documents",
    href: "/documents",
    icon: FileText,
    page: "documents",
};

// Grouped items
export const ACADEMICS_GROUP: NavGroup = {
    label: "Academics",
    collapsible: true,
    items: [
        {
            label: "Students",
            href: "/students",
            icon: Users,
            page: "students",
        },
        {
            label: "Classes",
            href: "/classes",
            icon: GraduationCap,
            page: "classes",
        },
        {
            label: "Subjects",
            href: "/subjects",
            icon: BookText,
            page: "subjects",
        },
        {
            label: "Materials",
            href: "/materials",
            icon: BookOpen,
            page: "materials",
        },
    ],
};

export const OTHERS_GROUP: NavGroup = {
    label: "Others",
    collapsible: false,
    items: [
        {
            label: "Create Account",
            href: "/admin/create-account",
            icon: UserPlus,
            page: "settings",
            visibleTo: ["super-admin"],
        },
        {
            label: "Settings",
            href: "/settings",
            icon: Settings,
            page: "settings",
        },
    ],
};

// Ordered sidebar sections
// Each section is either:
//   - { type: "item", item: NavItem }             → single link, no group
//   - { type: "group", group: NavGroup }           → group with label
//   - { type: "label", label: string }             → section label (no link)
export type SidebarSection =
    | { type: "item"; item: NavItem }
    | { type: "group"; group: NavGroup }
    | { type: "label"; label: string };

export const SIDEBAR_SECTIONS: readonly SidebarSection[] = [
    { type: "label", label: "Menus" },
    { type: "item", item: DASHBOARD_ITEM },
    { type: "group", group: ACADEMICS_GROUP },
    { type: "item", item: PAYMENTS_ITEM },
    { type: "item", item: DOCUMENTS_ITEM },
    { type: "group", group: OTHERS_GROUP },
];

// Flat list of all nav items (useful for permission checks, etc.)
export const NAV_ITEMS: readonly NavItem[] = [
    DASHBOARD_ITEM,
    ...ACADEMICS_GROUP.items,
    PAYMENTS_ITEM,
    DOCUMENTS_ITEM,
    ...OTHERS_GROUP.items,
];
