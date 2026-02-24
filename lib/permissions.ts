/**
 * Perms config
 *
 * Roles:
 *  - super-admin : Full access to every page and action (default better-auth admin provided role).
 *  - admin       : Dashboard, profile, payments, reports, documents CRUD,
 *                  read-only to students & scores.
 *  - teacher     : Dashboard, profile, students, scores, reports,
 *                  materials CRUD.
 *
 * To change access rules, edit arrays below.
 */

// Roles
export const ROLES = {
    SUPER_ADMIN: "super-admin",
    ADMIN: "admin",
    TEACHER: "teacher",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: readonly Role[] = [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.TEACHER,
];

// Action types
export const ACTIONS = {
    VIEW: "view",
    CREATE: "create",
    UPDATE: "update",
    DELETE: "delete",
} as const;

export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];

// Page identifiers (must match route segments)
export const PAGES = {
    DASHBOARD: "dashboard",
    PROFILE: "profile",
    STUDENTS: "students",
    SCORES: "scores",
    MATERIALS: "materials",
    REPORTS: "reports",
    PAYMENTS: "payments",
    DOCUMENTS: "documents",
} as const;

export type Page = (typeof PAGES)[keyof typeof PAGES];

// Perms map
//
// Structure: Record<Page, Partial<Record<Action, readonly Role[]>>>
//
// super-admin is implicitly allowed everything but is still listed for
// explicitness and easy auditing.  If you want to rely on an implicit
// "super-admin can do anything" rule, see `hasPermission` below.

type PermissionsMap = Record<Page, Partial<Record<Action, readonly Role[]>>>;

export const PERMISSIONS: PermissionsMap = {
    dashboard: {
        view: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER],
    },

    profile: {
        view: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER],
        create: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER],
        update: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER],
        delete: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER],
    },

    students: {
        view: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER],
        create: [ROLES.SUPER_ADMIN, ROLES.TEACHER],
        update: [ROLES.SUPER_ADMIN, ROLES.TEACHER],
        delete: [ROLES.SUPER_ADMIN, ROLES.TEACHER],
    },

    scores: {
        view: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER],
        create: [ROLES.SUPER_ADMIN, ROLES.TEACHER],
        update: [ROLES.SUPER_ADMIN, ROLES.TEACHER],
        delete: [ROLES.SUPER_ADMIN, ROLES.TEACHER],
    },

    materials: {
        view: [ROLES.SUPER_ADMIN, ROLES.TEACHER],
        create: [ROLES.SUPER_ADMIN, ROLES.TEACHER],
        update: [ROLES.SUPER_ADMIN, ROLES.TEACHER],
        delete: [ROLES.SUPER_ADMIN, ROLES.TEACHER],
    },

    reports: {
        view: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER],
        create: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER],
        update: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER],
        delete: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER],
    },

    payments: {
        view: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
        create: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
        update: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
        delete: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    },

    documents: {
        view: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
        create: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
        update: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
        delete: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    },
};

// Helpers

/**
 * Check whether a given role is allowed to perform `action` on `page`.
 *
 * `super-admin` is always allowed regardless of what the map says so
 * never have to worry about accidentally locking out the super-admin.
 */
export function hasPermission(role: Role, page: Page, action: Action): boolean {
    if (role === ROLES.SUPER_ADMIN) return true;

    const pagePermissions = PERMISSIONS[page];
    const allowedRoles = pagePermissions[action];

    if (!allowedRoles) return false;

    return allowedRoles.includes(role);
}

/**
 * Return every page a role is allowed to **view**.
 */
export function getViewablePages(role: Role): Page[] {
    return (Object.keys(PERMISSIONS) as Page[]).filter((page) =>
        hasPermission(role, page, ACTIONS.VIEW),
    );
}

/**
 * Return every action a role can perform on a specific page.
 */
export function getAllowedActions(role: Role, page: Page): Action[] {
    return (Object.values(ACTIONS) as Action[]).filter((action) =>
        hasPermission(role, page, action),
    );
}
