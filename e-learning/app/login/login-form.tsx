'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signInAction, type SignInState } from './actions';

const initialState: SignInState = {};

type FieldProps = React.ComponentProps<typeof Input> & {
  id: string;
  label: string;
};

function Field({ id, label, ...props }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <Input id={id} {...props} />
    </div>
  );
}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    signInAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field
        id="email"
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        disabled={pending}
        placeholder="you@example.com"
      />

      <Field
        id="password"
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        disabled={pending}
      />

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
