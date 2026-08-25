/**
 * The field primitives the teacher forms are built from.
 *
 * Every field on these pages is the same three things stacked -- a label, a
 * control, and the error the resolver put on it -- so that layout lives here
 * once. The controls take a `register()` spread straight through, including the
 * `ref`, which React 19 passes as an ordinary prop.
 */
import type { ReactNode } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const controlClass =
  'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50';

export const labelClass = 'text-xs font-semibold tracking-wide text-ink-soft uppercase';

const textareaClass = cn(controlClass, 'h-auto resize-y py-2');

const checkboxClass =
  'size-4 shrink-0 cursor-pointer rounded border-border accent-accent-primary disabled:opacity-50';

export function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className={labelClass}>
      {children}
    </label>
  );
}

export function FieldError({ id, message }: { id?: string; message?: string }) {
  return message ? (
    <p id={id} role="alert" className="text-xs font-semibold text-destructive">
      {message}
    </p>
  ) : null;
}

export function FieldHint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-ink-subtle">{children}</p>;
}

export function Field({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn('flex flex-col gap-1.5', className)}>{children}</div>;
}

type FieldShellProps = {
  id: string;
  label: ReactNode;
  labelAction?: ReactNode;
  hint?: ReactNode;
  error?: string;
  className?: string;
};

function errorId(id: string): string {
  return `${id}-error`;
}

function FieldShell({
  id,
  label,
  labelAction,
  hint,
  error,
  className,
  children,
}: FieldShellProps & { children: ReactNode }) {
  return (
    <Field className={className}>
      {labelAction === undefined ? (
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          {labelAction}
        </div>
      )}
      {children}
      <FieldError id={errorId(id)} message={error} />
      {hint ? <FieldHint>{hint}</FieldHint> : null}
    </Field>
  );
}

export function TextField({
  id,
  label,
  labelAction,
  hint,
  error,
  className,
  ...props
}: React.ComponentProps<'input'> & FieldShellProps) {
  return (
    <FieldShell
      id={id}
      label={label}
      labelAction={labelAction}
      hint={hint}
      error={error}
      className={className}
    >
      <Input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId(id) : undefined}
        {...props}
      />
    </FieldShell>
  );
}

export function TextareaField({
  id,
  label,
  labelAction,
  hint,
  error,
  className,
  rows = 3,
  ...props
}: React.ComponentProps<'textarea'> & FieldShellProps) {
  return (
    <FieldShell
      id={id}
      label={label}
      labelAction={labelAction}
      hint={hint}
      error={error}
      className={className}
    >
      <textarea
        id={id}
        rows={rows}
        className={textareaClass}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId(id) : undefined}
        {...props}
      />
    </FieldShell>
  );
}

export type SelectOption =
  | string
  | { readonly value: string; readonly label: string; readonly disabled?: boolean };

function optionValue(option: SelectOption): string {
  return typeof option === 'string' ? option : option.value;
}

export function SelectField({
  id,
  label,
  labelAction,
  hint,
  error,
  className,
  options,
  placeholder,
  ...props
}: React.ComponentProps<'select'> &
  FieldShellProps & {
    options: readonly SelectOption[];
    placeholder?: string;
  }) {
  return (
    <FieldShell
      id={id}
      label={label}
      labelAction={labelAction}
      hint={hint}
      error={error}
      className={className}
    >
      <select
        id={id}
        className={controlClass}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId(id) : undefined}
        {...props}
      >
        {placeholder === undefined ? null : <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option
            key={optionValue(option)}
            value={optionValue(option)}
            disabled={typeof option === 'string' ? undefined : option.disabled}
          >
            {typeof option === 'string' ? option : option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function CheckboxField({
  id,
  label,
  hint,
  error,
  className,
  ...props
}: React.ComponentProps<'input'> &
  Omit<FieldShellProps, 'label' | 'labelAction'> & { label: string }) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="flex cursor-pointer items-start gap-2.5 text-sm text-ink"
      >
        <input
          id={id}
          type="checkbox"
          className={cn('mt-0.5', checkboxClass)}
          {...props}
        />
        <span>
          <span className="font-medium">{label}</span>
          {hint ? (
            <span className="mt-0.5 block text-xs text-ink-subtle">{hint}</span>
          ) : null}
        </span>
      </label>
      <FieldError message={error} />
    </div>
  );
}

export function InlineCheckbox({
  className,
  ...props
}: React.ComponentProps<'input'>) {
  return (
    <input
      type="checkbox"
      className={cn(checkboxClass, className)}
      {...props}
    />
  );
}
