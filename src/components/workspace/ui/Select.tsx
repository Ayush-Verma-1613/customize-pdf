'use client';

import { ChevronDown } from 'lucide-react';
import { cx } from '@/lib/utils/cx';
import { fieldClass } from './Input';

export function Select({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  ariaLabel?: string;
}) {
  return (
    <span className="relative block">
      <select
        value={value}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
        className={cx(fieldClass, 'cursor-pointer appearance-none pr-9')}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown
        size={15}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-forge-muted"
      />
    </span>
  );
}
