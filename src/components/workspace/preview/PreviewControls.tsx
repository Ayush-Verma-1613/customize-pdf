'use client';

import { motion } from 'framer-motion';
import { Maximize2, Minus, Plus, ZoomIn } from 'lucide-react';

/**
 * The zoom controls float over the foot of the sheet rather than sitting in a
 * bar of their own, so the paper stays the tallest thing in the column.
 */
export function PreviewControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onFit,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}) {
  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="forge-float pointer-events-auto absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-[14px] px-2 py-1.5"
    >
      <span className="flex h-8 w-8 items-center justify-center text-forge-ink-soft">
        <ZoomIn size={16} />
      </span>
      <Control label="Zoom out" onClick={onZoomOut}>
        <Minus size={16} />
      </Control>
      <span className="w-[52px] text-center text-[13px] font-medium text-forge-ink tabular-nums">
        {Math.round(zoom * 100)}%
      </span>
      <Control label="Zoom in" onClick={onZoomIn}>
        <Plus size={16} />
      </Control>
      <span className="mx-0.5 h-5 w-px bg-forge-line" />
      <Control label="Fit the page" onClick={onFit}>
        <Maximize2 size={15} />
      </Control>
    </motion.div>
  );
}

function Control({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 460, damping: 26 }}
      className="touch-target flex h-8 w-8 items-center justify-center rounded-lg text-forge-ink-soft transition-colors hover:bg-forge-cream"
    >
      {children}
    </motion.button>
  );
}
