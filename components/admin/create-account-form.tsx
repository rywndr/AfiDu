"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Loader2, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RoleSelect } from "@/components/admin/role-select";
import { createAccountAction } from "@/lib/actions/create-account";
import { zodResolver } from "@/lib/zod-resolver";
import {
    createAccountSchema,
    type CreateAccountFormValues,
} from "@/lib/validators/auth";
import type { Role } from "@/lib/permissions";

function FormField({
    label,
    htmlFor,
    error,
    children,
}: {
    label: string;
    htmlFor: string;
    error: string | undefined;
    children: React.ReactNode;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}

function SuccessMessage({
    name,
    email,
    onReset,
}: {
    name: string;
    email: string;
    onReset: () => void;
}) {
    return (
        <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
                <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-green-500/10">
                    <CheckCircle className="size-6 text-green-600" />
                </div>
                <CardTitle className="text-lg md:text-xl">
                    Account Created
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                    The account for{" "}
                    <span className="font-medium text-foreground">{name}</span>{" "}
                    ({email}) has been created successfully.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={onReset} variant="outline" className="w-full">
                    Create Another Account
                </Button>
            </CardContent>
        </Card>
    );
}

export function CreateAccountForm() {
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [createdUser, setCreatedUser] = useState<{
        name: string;
        email: string;
    } | null>(null);

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors },
    } = useForm<CreateAccountFormValues>({
        resolver: zodResolver(createAccountSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
            role: undefined,
        },
    });

    const onSubmit = async (data: CreateAccountFormValues) => {
        setApiError(null);
        setLoading(true);

        try {
            const result = await createAccountAction({
                name: data.name,
                email: data.email,
                password: data.password,
                role: data.role,
            });

            if (!result.success) {
                setApiError(result.error ?? "Failed to create account");
                return;
            }

            setCreatedUser({ name: data.name, email: data.email });
        } catch {
            setApiError("An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setCreatedUser(null);
        setApiError(null);
        reset();
    };

    if (createdUser) {
        return (
            <SuccessMessage
                name={createdUser.name}
                email={createdUser.email}
                onReset={handleReset}
            />
        );
    }

    return (
        <Card className="max-w-lg w-full">
            <CardHeader>
                <CardTitle className="text-lg md:text-xl">
                    Create Account
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                    Create a new user account and assign a role
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
                    <FormField
                        label="Full Name"
                        htmlFor="name"
                        error={errors.name?.message}
                    >
                        <Input
                            id="name"
                            type="text"
                            placeholder="John Doe"
                            aria-invalid={!!errors.name}
                            {...register("name")}
                        />
                    </FormField>

                    <FormField
                        label="Email"
                        htmlFor="email"
                        error={errors.email?.message}
                    >
                        <Input
                            id="email"
                            type="email"
                            placeholder="john@example.com"
                            aria-invalid={!!errors.email}
                            {...register("email")}
                        />
                    </FormField>

                    <FormField
                        label="Password"
                        htmlFor="password"
                        error={errors.password?.message}
                    >
                        <Input
                            id="password"
                            type="password"
                            placeholder="Min. 8 characters"
                            autoComplete="new-password"
                            aria-invalid={!!errors.password}
                            {...register("password")}
                        />
                    </FormField>

                    <FormField
                        label="Confirm Password"
                        htmlFor="confirmPassword"
                        error={errors.confirmPassword?.message}
                    >
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Re-enter password"
                            autoComplete="new-password"
                            aria-invalid={!!errors.confirmPassword}
                            {...register("confirmPassword")}
                        />
                    </FormField>

                    <FormField
                        label="Role"
                        htmlFor="role"
                        error={errors.role?.message}
                    >
                        <Controller
                            name="role"
                            control={control}
                            render={({ field }) => (
                                <RoleSelect
                                    value={field.value as Role | undefined}
                                    onValueChange={field.onChange}
                                    disabled={loading}
                                />
                            )}
                        />
                    </FormField>

                    {apiError && (
                        <p className="text-sm text-destructive text-center">
                            {apiError}
                        </p>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <span>Create Account</span>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
