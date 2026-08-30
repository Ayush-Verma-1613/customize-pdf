'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cx } from '@/lib/utils/cx';

/**
 * The panel container on small screens. It snaps between a half and a nearly
 * full height so a teacher can keep an eye on the page while editing its
 * properties, and drag it taller when filling in a long form.
 */

const SNAPS = [0.55, 0.92];

export function BottomSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [snap, setSnap] = useState(0);
  const dragStart = useRef<{ y: number; snap: number } | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const height = `${SNAPS[snap] * 100}dvh`;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 bg-ink/20"
      />
      <div
        ref={sheetRef}
        className="animate-rise absolute inset-x-0 bottom-0 flex flex-col rounded-t-2xl border-t border-line bg-panel shadow-2xl"
        style={{ height }}
      >
        <div
          className="flex shrink-0 touch-none items-center gap-2 px-3 pt-2 pb-1"
          onPointerDown={(e) => {
            dragStart.current = { y: e.clientY, snap };
            (e.target as Element).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => {
            const start = dragStart.current;
            if (!start) return;
            const delta = start.y - e.clientY;
            if (delta > 40 && start.snap === 0) setSnap(1);
            if (delta < -40 && start.snap === 1) setSnap(0);
          }}
          onPointerUp={(e) => {
            const start = dragStart.current;
            dragStart.current = null;
            if (start && Math.abs(start.y - e.clientY) < 6 && snap === 0) onClose();
          }}
        >
          <span className="absolute left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-line" />
          <h2 className="mt-3 text-[13px] font-semibold text-ink">{title}</h2>
          <button
            type="button"
            aria-label="Close panel"
            onClick={onClose}
            className="mt-3 ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-[#f1ede6]"
          >
            <X size={16} />
          </button>
        </div>

        <div className={cx('min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]')}>
          {children}
        </div>
      </div>
    </div>
  );
}
