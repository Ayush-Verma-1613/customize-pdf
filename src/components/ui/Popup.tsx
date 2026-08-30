'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';

/**
 * A small floating card that closes when you click away or press Escape.
 *
 * Pointer events are stopped at the edge so a menu opened over the document
 * canvas cannot also start a drag on the page underneath it.
 */
export function Popup({
  children,
  onClose,
  className,
  style,
  label,
}: {
  children: ReactNode;
  onClose: () => void;
  className?: string;
  style?: CSSProperties;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };

    // Deferred by a tick so the very click that opened the menu, which is still
    // propagating, does not immediately close it again.
    const timer = setTimeout(() => document.addEventListener('pointerdown', onPointerDown), 0);
    document.addEventListener('keydown', onKey, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      className={cx(
        'animate-rise z-50 rounded-xl border border-line bg-white p-1.5 shadow-xl',
        className,
      )}
      style={style}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}
