'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { InlineCheckbox, TextField } from '@/components/form/field';
import { FormAlert } from '@/components/form/form-shell';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { loginSchema, type LoginValues } from '@/lib/form-schemas';
import { dashboardPathFor } from '@/lib/roles';

export function LoginForm() {
  const router = useRouter();
  const [requestError, setRequestError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: true },
  });

  const onSubmit = handleSubmit(async (values) => {
    setRequestError(null);
    try {
      const result = await authClient.signIn.email(values);
      if (result.error) {
        setRequestError('Incorrect email or password.');
        return;
      }

      const role = (result.data.user as { role?: string }).role;
      router.replace(dashboardPathFor(role));
      router.refresh();
    } catch (error) {
      console.error('sign-in failed', error);
      setRequestError('Something went wrong. Please try again.');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <TextField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        autoFocus
        disabled={isSubmitting}
        error={errors.email?.message}
        placeholder="you@example.com"
        {...register('email')}
      />

      <TextField
        id="password"
        label="Password"
        labelAction={
          // placeholder
          <a
            href="#"
            className="text-xs font-semibold text-accent-primary transition-colors hover:text-accent-primary-strong"
          >
            Forgot password?
          </a>
        }
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        disabled={isSubmitting}
        error={errors.password?.message}
        {...register('password')}
      />

      <label
        htmlFor="rememberMe"
        className="flex w-fit cursor-pointer items-center gap-2 text-sm text-ink-soft"
      >
        <InlineCheckbox id="rememberMe" disabled={isSubmitting} {...register('rememberMe')} />
        Remember me
      </label>

      <FormAlert message={requestError} />

      <Button type="submit" size="lg" disabled={isSubmitting} className="mt-1 h-11 w-full">
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
