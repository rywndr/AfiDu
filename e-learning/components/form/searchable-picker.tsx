'use client';

import { useId, useState } from 'react';
import { Popover } from '@base-ui/react/popover';
import { Check, ChevronsUpDown, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type PickerValue = string | number;

type SearchablePickerOption<T extends PickerValue> = {
  readonly value: T;
  readonly label: string;
};

type SearchablePickerProps<T extends PickerValue> = {
  id?: string;
  value: T;
  options: readonly SearchablePickerOption<T>[];
  onValueChange: (value: T) => void;
  title: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
};

export function SearchablePicker<T extends PickerValue>({
  id,
  value,
  options,
  onValueChange,
  title,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  disabled = false,
  className,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: SearchablePickerProps<T>) {
  const generatedTriggerId = useId();
  const searchId = useId();
  const triggerId = id ?? generatedTriggerId;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => option.value === value);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredOptions = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(normalizedQuery),
  );

  return (
    <Popover.Root
      open={open}
      triggerId={triggerId}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setQuery('');
      }}
    >
      <Popover.Trigger
        id={triggerId}
        render={
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={disabled}
            aria-label={ariaLabel}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedBy}
            className={cn(
              'h-10 w-full min-w-0 justify-between px-3 font-normal',
              className,
            )}
          />
        }
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronsUpDown aria-hidden="true" className="text-muted-foreground" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner
          sideOffset={4}
          align="start"
          className="z-50 max-w-[calc(100vw-2rem)]"
        >
          <Popover.Popup className="w-(--anchor-width) min-w-72 rounded-lg bg-popover p-2 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none">
            <Popover.Title className="sr-only">{title}</Popover.Title>
            <div className="relative">
              <label htmlFor={searchId} className="sr-only">
                {searchPlaceholder}
              </label>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id={searchId}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9"
              />
            </div>

            <div className="mt-1 max-h-60 overflow-y-auto overscroll-contain">
              {filteredOptions.length > 0 ? (
                <ul className="space-y-0.5">
                  {filteredOptions.map((option) => {
                    const isSelected = option.value === value;

                    return (
                      <li key={option.value}>
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => {
                            onValueChange(option.value);
                            setOpen(false);
                            setQuery('');
                          }}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          <span className="min-w-0 flex-1 break-words">
                            {option.label}
                          </span>
                          <Check
                            aria-hidden="true"
                            className={cn(
                              'size-4 shrink-0',
                              !isSelected && 'invisible',
                            )}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </p>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
