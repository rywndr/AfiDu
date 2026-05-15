"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar";
import { SidebarUser } from "@/components/layout/sidebar-user";
import {
    SIDEBAR_SECTIONS,
    type NavItem,
    type SidebarSection,
} from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";
import { hasPermission, ACTIONS } from "@/lib/permissions";
import { useUserRole } from "@/lib/hooks/use-permission";

// Logo
function SidebarLogo() {
    return (
        <SidebarHeader>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        size="lg"
                        className="pointer-events-none"
                    >
                        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <span className="text-sm font-bold">A</span>
                        </div>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-semibold">
                                AfiDu
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                                Management
                            </span>
                        </div>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarHeader>
    );
}

// Single nav link
function NavLink({ item }: { item: NavItem }) {
    const pathname = usePathname();
    const isActive =
        pathname === item.href || pathname.startsWith(`${item.href}/`);

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                isActive={isActive}
                render={<Link href={item.href} />}
            >
                <item.icon />
                <span>{item.label}</span>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

// Filter items by permissions
//
// An item is visible when:
//   1. The user's role has "view" permission for item.page, AND
//   2. If visibleTo is set, the role is in that list (extra guard for
//      items like "Create Account" that map to a shared page identifier
//      but should only be visible to specific roles).
function useVisibleItems(items: readonly NavItem[]): NavItem[] {
    const role = useUserRole();

    return items.filter((item) => {
        // Primary gate: check the permissions map
        if (!hasPermission(role, item.page, ACTIONS.VIEW)) return false;

        // Secondary gate: honour explicit visibleTo list if provided
        if (item.visibleTo && item.visibleTo.length > 0) {
            return item.visibleTo.includes(role);
        }

        return true;
    });
}

// Collapsible group
function CollapsibleNavGroup({
    label,
    items,
}: {
    label: string;
    items: readonly NavItem[];
}) {
    // Always start open. Since AppLayout re-mounts the sidebar on every
    // navigation (no persistent layout), using `true` as the default ensures
    // the group never auto-collapses when the user clicks a link outside it.
    const [open, setOpen] = useState(true);

    const visibleItems = useVisibleItems(items);

    if (visibleItems.length === 0) return null;

    return (
        <SidebarGroup>
            <SidebarGroupLabel
                className="cursor-pointer select-none"
                onClick={() => setOpen((prev) => !prev)}
            >
                <span className="flex-1">{label}</span>
                <ChevronRight
                    className={cn(
                        "ml-auto size-4 transition-transform duration-200",
                        open && "rotate-90",
                    )}
                />
            </SidebarGroupLabel>
            {open && (
                <SidebarGroupContent>
                    <SidebarMenu>
                        {visibleItems.map((item) => (
                            <NavLink key={item.href} item={item} />
                        ))}
                    </SidebarMenu>
                </SidebarGroupContent>
            )}
        </SidebarGroup>
    );
}

// Plain group
function PlainNavGroup({
    label,
    items,
}: {
    label: string;
    items: readonly NavItem[];
}) {
    const visibleItems = useVisibleItems(items);

    if (visibleItems.length === 0) return null;

    return (
        <SidebarGroup>
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu>
                    {visibleItems.map((item) => (
                        <NavLink key={item.href} item={item} />
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

// Standalone item section (no group label)
function StandaloneNavItem({ item }: { item: NavItem }) {
    const visibleItems = useVisibleItems([item]);

    if (visibleItems.length === 0) return null;

    return (
        <SidebarGroup>
            <SidebarGroupContent>
                <SidebarMenu>
                    <NavLink item={item} />
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

// Section label
function SectionLabel({ label }: { label: string }) {
    return (
        <SidebarGroup>
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
        </SidebarGroup>
    );
}

// Section renderer
function SidebarSectionComponent({ section }: { section: SidebarSection }) {
    if (section.type === "label") {
        return <SectionLabel label={section.label} />;
    }

    if (section.type === "item") {
        return <StandaloneNavItem item={section.item} />;
    }

    // type === "group"
    if (section.group.collapsible) {
        return (
            <CollapsibleNavGroup
                label={section.group.label}
                items={section.group.items}
            />
        );
    }

    return (
        <PlainNavGroup
            label={section.group.label}
            items={section.group.items}
        />
    );
}

// Navigation
function SidebarNavigation() {
    return (
        <SidebarContent>
            {SIDEBAR_SECTIONS.map((section, index) => {
                let key: string;
                if (section.type === "label") {
                    key = `label-${section.label}`;
                } else if (section.type === "item") {
                    key = section.item.href;
                } else {
                    key = section.group.label;
                }
                return (
                    <SidebarSectionComponent
                        key={`${key}-${index}`}
                        section={section}
                    />
                );
            })}
        </SidebarContent>
    );
}

// Main Sidebar
export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarLogo />
            <SidebarNavigation />
            <SidebarFooter>
                <SidebarUser />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
