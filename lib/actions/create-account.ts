"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema/auth";
import { eq } from "drizzle-orm";
import { ALL_ROLES, type Role } from "@/lib/permissions";

interface CreateAccountInput {
    name: string;
    email: string;
    password: string;
    role: Role;
}

interface CreateAccountResult {
    success: boolean;
    error?: string;
}

function isValidRole(role: string): role is Role {
    return (ALL_ROLES as readonly string[]).includes(role);
}

export async function createAccountAction(
    input: CreateAccountInput,
): Promise<CreateAccountResult> {
    const { name, email, password, role } = input;

    if (!name || !email || !password || !role) {
        return { success: false, error: "All fields are required." };
    }

    if (!isValidRole(role)) {
        return { success: false, error: "Invalid role selected." };
    }

    if (password.length < 8) {
        return {
            success: false,
            error: "Password must be at least 8 characters.",
        };
    }

    try {
        const signUpResult = await auth.api.signUpEmail({
            body: {
                name,
                email,
                password,
            },
        });

        if (!signUpResult) {
            return { success: false, error: "Failed to create account." };
        }

        await db.update(user).set({ role }).where(eq(user.email, email));

        return { success: true };
    } catch (err: unknown) {
        // better-auth throws if email is already taken, etc.
        const message =
            err instanceof Error
                ? err.message
                : "An unexpected error occurred.";

        if (
            message.toLowerCase().includes("already") ||
            message.toLowerCase().includes("exist")
        ) {
            return {
                success: false,
                error: "An account with this email already exists.",
            };
        }

        return { success: false, error: message };
    }
}
