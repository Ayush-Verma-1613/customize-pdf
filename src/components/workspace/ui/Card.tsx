import type { ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';

/**
 * One of the three workspace columns.
 *
 * `hug` sizes the panel to what is inside it and only scrolls once that outgrows
 * the row. Stretching it instead would leave a tall empty white area under short
 * content, which is the one thing a panel should never show.
 */
export function Panel({
  children,
  hug,
  className,
}: {
  children: ReactNode;
  hug?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cx(
        'forge-panel flex min-h-0 flex-col rounded-[18px]',
        hug ? 'max-h-full self-start' : 'h-full',
        className,
      )}
    >
      {children}
    </section>
  );
}

/** The small-caps title strip every panel opens with. */
export function PanelHeading({
  icon,
  title,
  action,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex h-[52px] shrink-0 items-center gap-2 px-3.5 sm:px-4">
      <span className="shrink-0 text-forge-accent">{icon}</span>
      <h2 className="truncate text-[12px] font-semibold tracking-[0.09em] text-forge-ink uppercase">
        {title}
      </h2>
      {action ? <span className="ml-auto shrink-0 pl-2">{action}</span> : null}
    </header>
  );
}
