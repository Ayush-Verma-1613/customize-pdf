'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

/** Subscribe to a media query, SSR-safe. */
export function useMediaQuery(query: string, fallback = false): boolean {
  const [matches, setMatches] = useState(fallback);

  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);

  return matches;
}

/**
 * Phones and small tablets get the single-column editor: the canvas fills the
 * screen and the panels become a bottom sheet.
 */
export const useCompactLayout = () => useMediaQuery('(max-width: 1023px)');

export const useCoarsePointer = () => useMediaQuery('(pointer: coarse)');

/** Nothing to subscribe to: the answer only changes once, at hydration. */
const noop = () => () => {};

/**
 * False on the server and while hydrating, true once the browser has it.
 *
 * The layout engine measures text against a canvas, which the server has not
 * got - it falls back to approximate widths there, so a centred heading lands
 * on a different x in the two renders. Anything drawn from a measured layout
 * therefore has to wait for the browser, or React finds two documents that
 * disagree and gives up on patching them.
 */
export const useIsBrowser = () => useSyncExternalStore(noop, () => true, () => false);
