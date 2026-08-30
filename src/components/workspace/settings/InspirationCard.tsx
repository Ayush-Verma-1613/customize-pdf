'use client';

import { motion } from 'framer-motion';
import { ChevronRight, Lightbulb } from 'lucide-react';

export function InspirationCard({ onOpen }: { onOpen: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.995 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="flex w-full items-center gap-3 rounded-[13px] border border-[#F0D3B4] bg-[#FEF6EF] px-3.5 py-3 text-left transition-colors hover:bg-[#FDEEE1]"
    >
      <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-[#FBE4CF] text-forge-accent">
        <Lightbulb size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold text-forge-ink">Need inspiration?</span>
        <span className="block text-[12px] text-forge-ink-soft">See sample papers</span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-forge-accent" />
    </motion.button>
  );
}
