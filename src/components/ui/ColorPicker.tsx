'use client';

import { useEffect, useRef, useState } from 'react';
import { Ban } from 'lucide-react';
import { HIGHLIGHTS, PALETTE } from '@/lib/model/defaults';
import { cx } from '@/lib/utils/cx';
import { isTransparent } from '@/lib/utils/color';

export function ColorPicker({
  value,
  onChange,
  allowNone,
  palette = PALETTE,
  label,
  className,
}: {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  allowNone?: boolean;
  palette?: string[];
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const empty = isTransparent(value);

  return (
    <div ref={ref} className={cx('relative', className)}>
      <button
        type="button"
        title={label}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-full items-center gap-2 rounded-lg border border-line bg-white px-2 text-[12px] text-ink-soft transition-colors hover:border-[#dcd6cc]"
      >
        <span
          className={cx(
            'h-4 w-4 shrink-0 rounded border border-black/10',
            empty && 'bg-[repeating-linear-gradient(45deg,#fff,#fff_3px,#e7e2da_3px,#e7e2da_6px)]',
          )}
          style={empty ? undefined : { background: value }}
        />
        <span className="truncate">{empty ? 'None' : value}</span>
      </button>

      {open ? (
        <div className="animate-rise absolute right-0 z-50 mt-1 w-[212px] rounded-xl border border-line bg-white p-2.5 shadow-xl">
          <div className="grid grid-cols-6 gap-1.5">
            {palette.map((colour) => (
              <button
                key={colour}
                type="button"
                title={colour}
                aria-label={colour}
                onClick={() => {
                  onChange(colour);
                  setOpen(false);
                }}
                className={cx(
                  'h-6 w-6 rounded-md border border-black/10 transition-transform hover:scale-110',
                  value === colour && 'ring-2 ring-ink ring-offset-1',
                )}
                style={{ background: colour }}
              />
            ))}
          </div>

          {palette === PALETTE ? (
            <>
              <p className="mt-2.5 mb-1.5 text-[10px] font-medium tracking-wide text-faint uppercase">
                Highlights
              </p>
              <div className="grid grid-cols-6 gap-1.5">
                {HIGHLIGHTS.map((colour) => (
                  <button
                    key={colour}
                    type="button"
                    aria-label={colour}
                    onClick={() => {
                      onChange(colour);
                      setOpen(false);
                    }}
                    className="h-6 w-6 rounded-md border border-black/10 transition-transform hover:scale-110"
                    style={{ background: colour }}
                  />
                ))}
              </div>
            </>
          ) : null}

          <div className="mt-2.5 flex items-center gap-2 border-t border-line-soft pt-2.5">
            <input
              type="color"
              value={empty ? '#000000' : (value ?? '#000000')}
              onChange={(e) => onChange(e.target.value)}
              className="h-7 w-9 cursor-pointer rounded border border-line bg-white p-0.5"
              aria-label="Custom colour"
            />
            <input
              type="text"
              value={value ?? ''}
              placeholder="#000000"
              onChange={(e) => onChange(e.target.value || undefined)}
              className="h-7 min-w-0 flex-1 rounded border border-line px-2 text-[12px] focus:border-question-hue focus:outline-none"
            />
            {allowNone ? (
              <button
                type="button"
                title="No colour"
                aria-label="No colour"
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
                className="flex h-7 w-7 items-center justify-center rounded border border-line text-muted hover:bg-[#f8f5ef]"
              >
                <Ban size={13} />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
