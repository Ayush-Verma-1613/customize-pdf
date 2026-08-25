'use client';

import { useEffect, useState } from 'react';

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
