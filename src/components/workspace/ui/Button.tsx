'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';

/* The three weights of action in the workspace, and nothing more. */
export type ButtonVariant = 'dark' | 'outline' | 'ghost' | 'accent';

export interface ButtonProps {
  children?: ReactNode;
  icon?: ReactNode;
  variant?: ButtonVariant;
  /**
   * A square button with no label. The padding is swapped rather than
   * overridden: two padding utilities in one class list is a coin toss decided
   * by stylesheet order, and the loser was making these 74px wide.
   */
  iconOnly?: boolean;
  onClick?: () => void;
  title?: string;
  ariaLabel?: string;
  className?: string;
  type?: 'button' | 'submit';
}

const VARIANTS: Record<ButtonVariant, string> = {
  dark: 'bg-forge-dark text-white border border-forge-dark shadow-[0_1px_2px_rgba(31,31,31,0.24)] hover:bg-black',
  outline:
    'bg-white text-forge-ink border border-forge-line hover:border-[#d8d2c8] hover:bg-forge-cream/70',
  ghost: 'bg-transparent text-forge-ink-soft border border-transparent hover:bg-black/[0.035]',
  accent: 'bg-forge-accent text-white border border-forge-accent hover:bg-[#b8540f]',
};

export function Button({
  children,
  icon,
  variant = 'outline',
  iconOnly,
  onClick,
  title,
  ariaLabel,
  className,
  type = 'button',
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      className={cx(
        'inline-flex h-[42px] shrink-0 items-center justify-center gap-2 rounded-xl',
        iconOnly ? 'w-[42px]' : 'px-4',
        'text-[13.5px] font-medium whitespace-nowrap transition-colors duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge-accent',
        VARIANTS[variant],
        className,
      )}
    >
      {icon}
      {children}
    </motion.button>
  );
}
