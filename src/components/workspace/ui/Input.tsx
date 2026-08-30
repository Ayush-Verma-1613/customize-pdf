'use client';

import type { ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';

/**
 * A labelled field. The label is the quiet part - small caps, muted - so the
 * value the teacher typed is the thing the eye lands on.
 */
export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 block text-[11.5px] font-medium text-forge-ink-soft">{label}</span>
      {children}
    </label>
  );
}

export const fieldClass =
  'h-[40px] w-full rounded-[10px] border border-forge-field bg-white px-3 text-[13.5px] ' +
  'text-forge-ink placeholder:text-forge-muted transition-all duration-150 ' +
  'focus:border-forge-accent focus:ring-[3px] focus:ring-forge-accent/12 focus:outline-none';

export function Input({
  value,
  onChange,
  placeholder,
  icon,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Sits inside the field, left of the value. */
  icon?: ReactNode;
  ariaLabel?: string;
}) {
  if (!icon) {
    return (
      <input
        value={value}
        aria-label={ariaLabel}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      />
    );
  }

  return (
    <span className="relative block">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-forge-muted">
        {icon}
      </span>
      <input
        value={value}
        aria-label={ariaLabel}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cx(fieldClass, 'pl-9')}
      />
    </span>
  );
}
