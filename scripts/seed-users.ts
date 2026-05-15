/**
 * seed script – creates test users for each role.
 *
 * usage:
 *   npx tsx scripts/seed-users.ts
 *
 * prerequisites:
 *   1. a running neon database with the better-auth tables already migrated.
 *      run `npx @better-auth/cli migrate` first if you haven't.
 *   2. a `.env` or `.env.local` file at the project root with DATABASE_URL,
 *      BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID, and GOOGLE_CLIENT_SECRET set.
 *
 * what it does:
 *   - creates three users via better-auth's internal server api so that
 *     passwords are hashed with the exact same algorithm the auth system
 *     uses at runtime.
 *   - after creation it patches each user's `role` column directly in the
 *     database (the sign-up endpoint always assigns the default role).
 *
 * note: if a user with the same email already exists the script skips it.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config({ path: ".env" });
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

// ---------------------------------------------------------------------------
// schema (duplicated here so the script is self-contained and doesn't
// depend on path aliases like @/ which tsx can't resolve)
// ---------------------------------------------------------------------------

const user = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    role: text("role").default("teacher"),
    banned: boolean("banned").default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

const session = pgTable("session", {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

const account = pgTable("account", {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

const verification = pgTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// configuration – edit freely
// ---------------------------------------------------------------------------

interface SeedUser {
    name: string;
    email: string;
    password: string;
    role: "super-admin" | "admin" | "teacher";
}

const SEED_USERS: SeedUser[] = [
    {
        name: "Super Admin",
        email: "superadmin@afidu.test",
        password: "Password123!",
        role: "super-admin",
    },
    {
        name: "Admin User",
        email: "admin@afidu.test",
        password: "Password123!",
        role: "admin",
    },
    {
        name: "Teacher User",
        email: "teacher@afidu.test",
        password: "Password123!",
        role: "teacher",
    },
];

// ---------------------------------------------------------------------------
// bootstrap a standalone auth instance for seeding
// ---------------------------------------------------------------------------

function createSeedAuth(sql: postgres.Sql) {
    const db = drizzle({
        client: sql,
        schema: { user, session, account, verification },
    });

    return betterAuth({
        database: drizzleAdapter(db, {
            provider: "pg",
            schema: { user, session, account, verification },
        }),
        emailAndPassword: { enabled: true },
        plugins: [admin({ defaultRole: "teacher" })],
        user: {
            additionalFields: {
                role: {
                    type: "string" as const,
                    defaultValue: "teacher",
                    required: false,
                    input: false,
                },
            },
        },
    });
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error("❌  DATABASE_URL is not set. create a .env file first.");
        process.exit(1);
    }

    // connect_timeout gives neon time to wake up from suspension
    const sql = postgres(databaseUrl, { connect_timeout: 10 });
    const seedAuth = createSeedAuth(sql);

    console.log("🌱  seeding users …\n");

    for (const seedUser of SEED_USERS) {
        // check if user already exists
        const existing =
            await sql`SELECT id FROM "user" WHERE email = ${seedUser.email} LIMIT 1`;

        if (existing.length > 0) {
            // still update the role in case it changed
            await sql`UPDATE "user" SET role = ${seedUser.role} WHERE email = ${seedUser.email}`;
            console.log(
                `⏭️   ${seedUser.email} already exists – role updated to "${seedUser.role}"`,
            );
            continue;
        }

        // use better-auth's internal api to create the user
        // this ensures the password is hashed correctly
        const signUpResponse = await seedAuth.api.signUpEmail({
            body: {
                name: seedUser.name,
                email: seedUser.email,
                password: seedUser.password,
            },
        });

        if (!signUpResponse) {
            console.error(`❌  failed to create user: ${seedUser.email}`);
            continue;
        }

        // patch the role (signUp always assigns the default role)
        await sql`UPDATE "user" SET role = ${seedUser.role} WHERE email = ${seedUser.email}`;

        console.log(
            `✅  created ${seedUser.role.padEnd(12)} → ${seedUser.email}`,
        );
    }

    console.log("\n🎉  done! you can now log in with these credentials:");
    console.log("─".repeat(60));

    for (const seedUser of SEED_USERS) {
        console.log(
            `   ${seedUser.role.padEnd(14)} │ ${seedUser.email.padEnd(26)} │ ${seedUser.password}`,
        );
    }

    console.log("─".repeat(60));
    console.log("\n💡  tables used by better-auth:");
    console.log('   • "user"         – id, name, email, role, etc.');
    console.log('   • "session"      – active sessions');
    console.log(
        '   • "account"      – credentials & oauth (password stored here)',
    );
    console.log('   • "verification" – email verification tokens');

    // close the connection pool cleanly
    await sql.end();
}

main().catch((err) => {
    console.error("❌  seed failed:", err);
    process.exit(1);
});
