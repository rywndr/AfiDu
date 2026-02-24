import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as authSchema from "@/lib/db/schema/auth";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            ...authSchema,
        },
    }),

    emailAndPassword: {
        enabled: true,
        async sendResetPassword() {
            // TODO: Implement password reset email
        },
    },

    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
    },

    plugins: [
        admin({
            defaultRole: "teacher",
        }),
        nextCookies(),
    ],

    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
    },

    user: {
        additionalFields: {
            role: {
                type: "string",
                defaultValue: "teacher",
                required: false,
                input: false,
            },
        },
    },
});

export type Session = typeof auth.$Infer.Session;
