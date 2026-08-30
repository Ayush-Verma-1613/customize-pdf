'use client';

import { motion } from 'framer-motion';
import { WORKFLOW_STEPS } from '@/data/templates';
import { cx } from '@/lib/utils/cx';

/**
 * Where you are in making the document.
 *
 * Compact on purpose: it is orientation, not navigation furniture, so the
 * connectors are hairlines and only the step you are on carries any colour.
 */
export function WorkflowStepper({
  current,
  onSelect,
}: {
  current: number;
  onSelect: (step: number) => void;
}) {
  return (
    <nav
      aria-label="Document workflow"
      className="flex shrink-0 items-center justify-center gap-0.5 px-3 py-2 sm:gap-1 sm:px-6 sm:py-4"
    >
      {WORKFLOW_STEPS.map((step, index) => {
        const active = step.id === current;
        const done = step.id < current;

        return (
          <span key={step.id} className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => onSelect(step.id)}
              aria-current={active ? 'step' : undefined}
              className="group flex min-h-[40px] items-center gap-1.5 rounded-full py-1 pr-1.5 pl-1 transition-colors hover:bg-black/[0.03] sm:min-h-0 sm:gap-2.5 sm:pr-2"
            >
              <motion.span
                initial={false}
                animate={{
                  backgroundColor: active ? '#C95F18' : done ? '#F3E2D3' : '#F4F1EB',
                  color: active ? '#FFFFFF' : done ? '#B0541A' : '#9A9489',
                }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="flex h-[26px] w-[26px] items-center justify-center rounded-full text-[12.5px] font-semibold"
              >
                {step.id}
              </motion.span>
              {/* A phone has no room for four labels, so only the step you
                  are on names itself; the rest stay as numbers. */}
              <span
                className={cx(
                  'text-[12.5px] whitespace-nowrap transition-colors sm:text-[13.5px]',
                  active
                    ? 'font-semibold text-forge-ink'
                    : 'hidden text-forge-ink-soft md:inline',
                )}
              >
                {step.label}
              </span>
            </button>

            {index < WORKFLOW_STEPS.length - 1 ? (
              <span className="mx-1.5 h-px w-4 shrink-0 bg-forge-connector sm:mx-3 sm:w-10 lg:w-14" />
            ) : null}
          </span>
        );
      })}
    </nav>
  );
}
