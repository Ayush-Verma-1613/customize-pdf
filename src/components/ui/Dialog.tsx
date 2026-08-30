'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cx } from '@/lib/utils/cx';

/**
 * The modal the app uses when it has to stop and ask, or has to own up to
 * something going wrong.
 *
 * It is deliberately not the `Popup` menu card. A menu is dismissed by looking
 * away from it; these two jobs - "you are about to lose work" and "this broke" -
 * are the only places in the app that are allowed to take the screen and insist
 * on an answer, so they get a backdrop, a focus move and a keyboard trap that a
 * menu must never have.
 *
 * The tone is the message. Each one is tinted by what it means rather than by a
 * single house accent: amber where something is merely unfinished and can still
 * be put right, red where it has already failed. The medallion carries a soft
 * two-stop wash of its own hue so the dialog reads as part of the same palette
 * as the editor behind it instead of a browser alert dropped on top.
 */
export type DialogTone = 'warn' | 'danger';

const TONES: Record<
  DialogTone,
  { medallion: string; ring: string; icon: string; confirm: string }
> = {
  warn: {
    medallion: 'bg-[linear-gradient(150deg,#fef3c7_0%,#fde8bb_55%,#fbdca4_100%)]',
    ring: 'ring-structure-hue/15',
    icon: 'text-structure-hue',
    confirm: 'bg-structure-hue text-white hover:bg-[#9a4708] border-structure-hue',
  },
  danger: {
    medallion: 'bg-[linear-gradient(150deg,#fee2e2_0%,#fdd3d3_55%,#fbc2c2_100%)]',
    ring: 'ring-danger/15',
    icon: 'text-danger',
    confirm: 'bg-danger text-white hover:bg-[#b91c1c] border-danger',
  },
};

export function Dialog({
  open,
  tone = 'warn',
  icon,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  busy,
}: {
  open: boolean;
  tone?: DialogTone;
  icon: ReactNode;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  /** Also what Escape and a click on the backdrop do. Omit to make it unskippable. */
  onCancel?: () => void;
  busy?: boolean;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  /* The answer has to be reachable from the keyboard alone, and pressing Enter
     by reflex should do the safe thing - so focus lands on the confirm button
     but Escape always means cancel. Tab is wrapped inside the panel, because a
     dialog you can Tab out of is one you can leave answered by accident. */
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onCancel) {
        event.preventDefault();
        event.stopPropagation();
        onCancel();
        return;
      }
      if (event.key !== 'Tab' || !panel.current) return;
      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      previous?.focus?.();
    };
  }, [open, onCancel]);

  if (typeof document === 'undefined') return null;
  const palette = TONES[tone];

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-[120] flex items-end justify-center bg-ink/25 p-4 backdrop-blur-[3px] sm:items-center"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) onCancel?.();
          }}
        >
          <motion.div
            ref={panel}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_60px_-12px_rgba(40,30,20,0.28)]"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="flex gap-3.5 p-5 sm:gap-4">
              <span
                className={cx(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-1',
                  palette.medallion,
                  palette.ring,
                  palette.icon,
                )}
              >
                {icon}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <h2 id={titleId} className="text-[15px] leading-snug font-semibold text-ink">
                  {title}
                </h2>
                <div className="mt-1.5 space-y-2 text-[13px] leading-relaxed text-ink-soft">
                  {children}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-line-soft bg-[#faf8f4] px-5 py-3.5 sm:flex-row sm:justify-end">
              {onCancel ? (
                <button
                  type="button"
                  onClick={onCancel}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-white px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-[#f8f5ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-question-hue"
                >
                  {cancelLabel}
                </button>
              ) : null}
              <button
                ref={confirmRef}
                type="button"
                onClick={onConfirm}
                disabled={busy}
                className={cx(
                  'inline-flex h-9 items-center justify-center rounded-lg border px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-question-hue disabled:opacity-50',
                  palette.confirm,
                )}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
