"use client";

import { useSession } from "@/lib/auth-client";
import {
    hasPermission,
    ACTIONS,
    type Role,
    type Page,
    type Action,
} from "@/lib/permissions";

/**
 * Extract the current user's role from better-auth session
 * Falls back to "teacher" when the session hasn't loaded yet
 */
export function useUserRole(): Role {
    const { data: session } = useSession();
    const role =
        ((session?.user as Record<string, unknown> | undefined)?.role as
            | string
            | undefined) ?? "teacher";
    return role as Role;
}

/**
 * Check whether the current user can perform `action` on `page`
 *
 * Usage:
 * const canCreate = usePermission("students", "create");
 */
export function usePermission(page: Page, action: Action): boolean {
    const role = useUserRole();
    return hasPermission(role, page, action);
}

/**
 * Check whether the current user can **view** a page
 *
 * Shorthand for `usePermission(page, "view")`
 */
export function useCanView(page: Page): boolean {
    return usePermission(page, ACTIONS.VIEW);
}

/**
 * Check whether the current user can **create** on a page
 *
 * Shorthand for `usePermission(page, "create")`
 */
export function useCanCreate(page: Page): boolean {
    return usePermission(page, ACTIONS.CREATE);
}

/**
 * Check whether the current user can **update** on a page
 *
 * Shorthand for `usePermission(page, "update")`
 */
export function useCanUpdate(page: Page): boolean {
    return usePermission(page, ACTIONS.UPDATE);
}

/**
 * Check whether the current user can **delete** on a page
 *
 * Shorthand for `usePermission(page, "delete")`
 */
export function useCanDelete(page: Page): boolean {
    return usePermission(page, ACTIONS.DELETE);
}
