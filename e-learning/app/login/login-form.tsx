'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth-client';
import { loginSchema, type LoginValues } from '@/lib/form-schemas';

type FieldProps = React.ComponentProps<typeof Input> & {
  id: string;
  label: string;
  error?: string;
};

function Field({ id, label, error, ...props }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <Input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [requestError, setRequestError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
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
      router.replace(role === 'student' ? '/student' : '/teacher');
      router.refresh();
    } catch (error) {
      console.error('sign-in failed', error);
      setRequestError('Something went wrong. Please try again.');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        disabled={isSubmitting}
        error={errors.email?.message}
        placeholder="you@example.com"
        {...register('email')}
      />

      <Field
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        disabled={isSubmitting}
        error={errors.password?.message}
        {...register('password')}
      />

      {requestError ? (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {requestError}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
