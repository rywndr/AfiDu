import { z } from "zod";
import { ALL_ROLES, type Role } from "@/lib/permissions";

export const loginSchema = z.object({
    email: z
        .string()
        .min(1, "Email is required")
        .email("Please enter a valid email address"),
    password: z.string().min(1, "Password is required"),
    rememberMe: z.boolean().optional().default(false),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const createAccountSchema = z
    .object({
        name: z.string().min(1, "Full name is required"),
        email: z
            .string()
            .min(1, "Email is required")
            .email("Please enter a valid email address"),
        password: z
            .string()
            .min(8, "Password must be at least 8 characters")
            .regex(/[A-Z]/, "Password must contain an uppercase letter")
            .regex(/[a-z]/, "Password must contain a lowercase letter")
            .regex(/[0-9]/, "Password must contain a number"),
        confirmPassword: z.string().min(1, "Please confirm the password"),
        role: z.enum([...ALL_ROLES] as [Role, ...Role[]], {
            message: "Please select a role",
        }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

export type CreateAccountFormValues = z.infer<typeof createAccountSchema>;
