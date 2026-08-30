'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';

/**
 * A settings section. Closed it is a row - icon, title, what lives inside it;
 * open it grows to fit its own content rather than a fixed height, so nothing
 * jumps when a field wraps.
 */
export function SettingsAccordion({
  icon,
  tint,
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  icon: ReactNode;
  /** Background of the icon tile, matched to the section. */
  tint: string;
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  return (
    <div
      className={cx(
        'overflow-hidden rounded-[13px] border transition-colors duration-200',
        open ? 'border-forge-line bg-white' : 'border-forge-line bg-[#FCFBF9] hover:bg-white',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
      >
        <span
          className={cx(
            'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px]',
            tint,
          )}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-semibold text-forge-ink">{title}</span>
          <span className="block truncate text-[12px] text-forge-ink-soft">{subtitle}</span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="shrink-0 text-forge-muted"
        >
          <ChevronDown size={16} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && children ? (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
