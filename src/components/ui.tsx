import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { keepFocus } from '@/lib/accessibility/keepFocus';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-ink-text shadow-sm hover:opacity-90',
  secondary: 'bg-surface-2 text-text hover:bg-surface-3',
  ghost: 'text-text hover:bg-surface-2',
  danger: 'bg-danger text-white hover:brightness-105',
};

export function Button({
  variant = 'secondary',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-[filter,background-color,opacity,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={keepFocus}
      className={`grid size-10 place-items-center rounded-full text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text active:scale-95 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span className="min-w-0">
        <span className="block font-semibold">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50 ${
          checked ? 'bg-accent' : 'bg-surface-3'
        }`}
      >
        <span
          className={`absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = 'md',
}: {
  value: T;
  options: { value: T; label: ReactNode; ariaLabel?: string }[];
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-border bg-surface-2 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.ariaLabel}
            onMouseDown={keepFocus}
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-1.5 rounded-full font-semibold transition-all duration-200 ${
              size === 'sm' ? 'px-3 py-1.5 text-[0.8rem]' : 'px-4 py-2 text-sm'
            } ${active ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
