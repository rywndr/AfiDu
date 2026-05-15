import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
    hasPermission,
    ACTIONS,
    type Role,
    type Page,
    type Action,
} from "@/lib/permissions";

export type SessionUser = {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    role: Role;
};

export type GuardedSession = {
    user: SessionUser;
    session: {
        id: string;
        expiresAt: Date;
        userId: string;
    };
};

/**
 * Require an authenticated session. If no session exists, redirect to /login.
 *
 * This should be called at the top of every protected server component page.
 */
export async function requireAuth(): Promise<GuardedSession> {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/login");
    }

    const user = session.user as Record<string, unknown>;
    const role = (
        typeof user.role === "string" ? user.role : "teacher"
    ) as Role;

    return {
        user: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
            role,
        },
        session: {
            id: session.session.id,
            expiresAt: session.session.expiresAt,
            userId: session.session.userId,
        },
    };
}

/**
 * Require an authenticated session AND verify the user has `view` permission
 * for the given page. If the user lacks permission, redirect to /dashboard.
 *
 * Usage:
 * ```ts
 * const { user } = await requirePageAccess("settings");
 * ```
 */
export async function requirePageAccess(page: Page): Promise<GuardedSession> {
    const guarded = await requireAuth();

    if (!hasPermission(guarded.user.role, page, ACTIONS.VIEW)) {
        redirect("/dashboard");
    }

    return guarded;
}

/**
 * Require an authenticated session AND verify the user can perform a specific
 * action on a page. If not, redirect to /dashboard.
 *
 * Usage:
 * ```ts
 * const { user } = await requirePermission("classes", "create");
 * ```
 */
export async function requirePermission(
    page: Page,
    action: Action,
): Promise<GuardedSession> {
    const guarded = await requireAuth();

    if (!hasPermission(guarded.user.role, page, action)) {
        redirect("/dashboard");
    }

    return guarded;
}

/**
 * Check if the current user has a specific permission without redirecting.
 * Useful for conditionally rendering UI in server components.
 *
 * Returns `null` if not authenticated (instead of redirecting).
 */
export async function checkPermission(
    page: Page,
    action: Action,
): Promise<boolean | null> {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) return null;

    const user = session.user as Record<string, unknown>;
    const role = (
        typeof user.role === "string" ? user.role : "teacher"
    ) as Role;

    return hasPermission(role, page, action);
}

/**
 * Get the current session without enforcing anything.
 * Returns `null` if not authenticated.
 */
export async function getOptionalSession(): Promise<GuardedSession | null> {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) return null;

    const user = session.user as Record<string, unknown>;
    const role = (
        typeof user.role === "string" ? user.role : "teacher"
    ) as Role;

    return {
        user: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
            role,
        },
        session: {
            id: session.session.id,
            expiresAt: session.session.expiresAt,
            userId: session.session.userId,
        },
    };
}
