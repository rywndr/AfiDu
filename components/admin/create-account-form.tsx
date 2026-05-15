"use client";

import { useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { SuccessMessage } from "@/components/shared/success-message";
import { RoleSelect } from "@/components/admin/role-select";
import { createAccountAction } from "@/lib/actions/create-account";
import { zodResolver } from "@/lib/zod-resolver";
import {
    createAccountSchema,
    type CreateAccountFormValues,
} from "@/lib/validators/auth";
import type { Role } from "@/lib/permissions";

// Main Form
export function CreateAccountForm() {
    const router = useRouter();
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

    const onSubmit = useCallback(async (data: CreateAccountFormValues) => {
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
                const msg = result.error ?? "Gagal membuat akun";
                setApiError(msg);
                toast.error(msg);
                return;
            }

            toast.success(`Akun untuk ${data.name} berhasil dibuat!`);
            setCreatedUser({ name: data.name, email: data.email });
        } catch {
            const msg = "Terjadi kesalahan. Silakan coba lagi.";
            setApiError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleReset = useCallback(() => {
        setCreatedUser(null);
        setApiError(null);
        reset();
    }, [reset]);

    if (createdUser) {
        return (
            <SuccessMessage
                title="Akun Berhasil Dibuat"
                description={
                    <>
                        Akun untuk{" "}
                        <span className="font-medium text-foreground">
                            {createdUser.name}
                        </span>{" "}
                        ({createdUser.email}) telah berhasil dibuat.
                    </>
                }
                resetLabel="Buat Akun Lain"
                onReset={handleReset}
            />
        );
    }

    return (
        <div className="rounded-lg border bg-card p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
                <FormField label="Nama Lengkap" error={errors.name?.message}>
                    <Input
                        id="name"
                        type="text"
                        placeholder="John Doe"
                        aria-invalid={!!errors.name}
                        {...register("name")}
                    />
                </FormField>

                <FormField label="Email" error={errors.email?.message}>
                    <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        aria-invalid={!!errors.email}
                        {...register("email")}
                    />
                </FormField>

                <FormField label="Password" error={errors.password?.message}>
                    <Input
                        id="password"
                        type="password"
                        placeholder="Min. 8 karakter"
                        autoComplete="new-password"
                        aria-invalid={!!errors.password}
                        {...register("password")}
                    />
                </FormField>

                <FormField
                    label="Konfirmasi Password"
                    error={errors.confirmPassword?.message}
                >
                    <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Ketik ulang password"
                        autoComplete="new-password"
                        aria-invalid={!!errors.confirmPassword}
                        {...register("confirmPassword")}
                    />
                </FormField>

                <FormField label="Peran" error={errors.role?.message}>
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
                    <p className="text-sm text-destructive">{apiError}</p>
                )}

                <div className="flex items-center gap-3 pt-2">
                    <Button type="submit" className="flex-1" disabled={loading}>
                        {loading ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            "Buat Akun"
                        )}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        disabled={loading}
                    >
                        <ArrowLeft className="mr-1 size-4" />
                        Kembali
                    </Button>
                </div>
            </form>
        </div>
    );
}
