'use client';

import type { ReactNode } from 'react';
import { BackgroundDecoration } from './BackgroundDecoration';

/**
 * The workspace frame: a navbar, a body and a footer, as three independent
 * regions rather than one stack of children inside a single card.
 *
 * Nothing is pinned. Everything scrolls together inside one box that is exactly
 * one screen tall - so the page itself never moves, but the navbar rises out of
 * view as you scroll down and the footer arrives at the end. No `position:
 * fixed` or `sticky` is involved anywhere, which also means no stacking-context
 * surprises when something in the body needs to overlap the navbar later.
 *
 * The step strip is a region of its own between the navbar and the body: it
 * belongs to the page, not to the bar, so it can be replaced or removed without
 * touching either.
 *
 * There is no card around them any more. Splitting the frame this way is what
 * makes further components cheap to add: a second toolbar, a breadcrumb, a
 * status strip - each has an obvious region to live in, and none of them has to
 * know about the others.
 */
export function AppShell({
  navbar,
  steps,
  footer,
  children,
}: {
  /** Sits at the top of the content and scrolls away with it. */
  navbar: ReactNode;
  /** Its own strip under the navbar, on the page rather than inside the bar. */
  steps?: ReactNode;
  /** Sits at the end of the content. */
  footer: ReactNode;
  /** The body between them. */
  children: ReactNode;
}) {
  return (
    <>
      <BackgroundDecoration />

      {/* Exactly one screen tall and immovable: `overflow-hidden` here is what
          guarantees the page itself can never scroll, so there is only ever one
          scrollbar on screen and it belongs to the box below. */}
      <div className="app-container h-dvh w-full overflow-hidden">
        {/* The one scroller. The three regions are siblings inside it, which
            keeps each of them a landmark of its own rather than burying the
            header and the footer inside the body. */}
        <div className="forge-scroll h-full overflow-y-auto">
          <header className="forge-bar border-b">{navbar}</header>
          {steps}
          <main>{children}</main>
          <footer className="forge-bar border-t">{footer}</footer>
        </div>
      </div>
    </>
  );
}

/**
 * The three columns: templates, the sheet, and its settings.
 *
 * A definite height rather than whatever is left over, which is what stops the
 * row growing into a screenful. Anything that does not fit inside it scrolls in
 * its own column instead.
 */
export function Workspace({
  left,
  centre,
  right,
}: {
  left: ReactNode;
  centre: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className="grid h-[900px] grid-cols-[28fr_46fr_26fr] gap-6 px-6 pt-5 pb-6">
      {left}
      {centre}
      {right}
    </div>
  );
}
