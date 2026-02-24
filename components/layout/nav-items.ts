import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  BookOpen,
  BarChart3,
  CreditCard,
  FileText,
  type LucideIcon,
} from "lucide-react";

import type { Page } from "@/lib/permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  page: Page;
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    page: "dashboard",
  },
  {
    label: "Students",
    href: "/students",
    icon: Users,
    page: "students",
  },
  {
    label: "Scores",
    href: "/scores",
    icon: ClipboardCheck,
    page: "scores",
  },
  {
    label: "Materials",
    href: "/materials",
    icon: BookOpen,
    page: "materials",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    page: "reports",
  },
  {
    label: "Payments",
    href: "/payments",
    icon: CreditCard,
    page: "payments",
  },
  {
    label: "Documents",
    href: "/documents",
    icon: FileText,
    page: "documents",
  },
] as const;
