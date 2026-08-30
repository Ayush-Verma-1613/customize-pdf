'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, ShieldCheck } from 'lucide-react';

/**
 * The footer at the end of the page.
 *
 * It is not pinned to the screen: it sits at the bottom of the scrolling
 * region, so it arrives when somebody has finished looking at their document
 * rather than taking a strip of every screen. Nothing here is an action - the
 * one action lives beside the fields it acts on, in the details panel.
 */

const HINT: Record<number, string> = {
  1: 'Pick the kind of document you are making.',
  2: 'The school, subject, marks — and your questions.',
  3: 'Page size, fonts, numbering and marks.',
  4: 'Happy with it? Create it and carry on in the editor.',
};

export function SiteFooter({ step, templateName }: { step: number; templateName: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:px-6">
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={step}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="min-w-0 flex-1 text-[12.5px] text-forge-ink-soft"
        >
          {step > 1 ? (
            <span className="mr-1.5 inline-flex items-center gap-1 rounded-md bg-[#FBE4CF] px-1.5 py-0.5 text-[11.5px] font-medium text-[#B0541A]">
              <Check size={11} strokeWidth={3} />
              {templateName}
            </span>
          ) : null}
          {HINT[step]}
        </motion.p>
      </AnimatePresence>

      <p className="flex items-center gap-1.5 text-[11.5px] whitespace-nowrap text-forge-muted">
        <ShieldCheck size={13} className="shrink-0 text-forge-green" />
        Everything stays in this browser
      </p>
    </div>
  );
}
