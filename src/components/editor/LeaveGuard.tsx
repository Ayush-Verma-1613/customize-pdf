'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { useEditor, type SaveState } from '@/lib/store/editorStore';
import { Dialog } from '@/components/ui/Dialog';

/**
 * Work that is in the editor but not yet in the store.
 *
 * `dirty` is the ordinary case - edits made inside the autosave debounce.
 * `saving` counts too, because the write is still in flight and leaving would
 * cut it off. `error` counts most of all: the save has already been attempted
 * and failed, so that is the one state where leaving certainly loses something.
 */
const UNSAVED: SaveState[] = ['dirty', 'saving', 'error'];

export const hasUnsavedWork = (state: SaveState) => UNSAVED.includes(state);

/**
 * Stands between unsaved work and the way out.
 *
 * Autosave means the window is usually less than a second wide, which is
 * exactly why the guard is worth having: somebody who types a last word and
 * immediately hits back has no way of knowing whether they landed inside that
 * window or outside it. The dialog asks rather than guesses, and going is still
 * one press away, so the cost of being wrong about it is a click.
 */
export function useLeaveGuard() {
  const router = useRouter();
  const saveState = useEditor((s) => s.saveState);
  const [asking, setAsking] = useState<string | null>(null);

  /* The browser's own prompt, for closing the tab or reloading. Nothing in the
     page can style or stand in for this one - a page that could invent its own
     would be a page that could refuse to let you go - so the most it can do is
     ask for it, and only while there is genuinely something to lose. */
  useEffect(() => {
    if (!hasUnsavedWork(saveState)) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saveState]);

  /** Call instead of navigating. It either goes, or it asks first. */
  const leaveTo = useCallback(
    (href: string) => {
      if (hasUnsavedWork(useEditor.getState().saveState)) {
        setAsking(href);
        return;
      }
      router.push(href);
    },
    [router],
  );

  const dialog = (
    <Dialog
      open={asking !== null}
      tone="warn"
      icon={<AlertTriangle size={19} />}
      title="Leave without saving?"
      confirmLabel="Yes, leave"
      cancelLabel="Stay here"
      onConfirm={() => {
        const href = asking;
        setAsking(null);
        if (href) router.push(href);
      }}
      onCancel={() => setAsking(null)}
    >
      <p>
        {saveState === 'error'
          ? 'This document could not be saved, so your last changes exist only in this tab. Leaving now loses them.'
          : 'Your last few changes have not been written to this browser yet. Leaving now loses them.'}
      </p>
      <p className="text-muted">Stay here and press Save in the toolbar to keep them.</p>
    </Dialog>
  );

  return { leaveTo, dialog };
}
