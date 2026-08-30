'use client';

import { useEffect, useRef } from 'react';
import { useEditor } from './editorStore';
import { saveDocument, writeRecovery } from './storage';

const DEBOUNCE_MS = 900;

/**
 * Write the document out now.
 *
 * Autosave already does this a moment after you stop typing, but a person who
 * has just finished something wants to press a button and be told it is safe -
 * so the Save control calls this and reports what happened.
 */
export async function saveNow(): Promise<void> {
  const { doc, laid, setSaveState } = useEditor.getState();
  setSaveState('saving');
  try {
    await saveDocument(doc, laid.pages.length);
    writeRecovery(doc);
    setSaveState('saved');
  } catch (error) {
    setSaveState('error', error instanceof Error ? error.message : undefined);
  }
}

/**
 * Autosave. Persists to IndexedDB shortly after edits stop, and mirrors to the
 * synchronous recovery slot on the way out of the tab so a crash or an
 * accidental close never costs more than the last few keystrokes.
 */
export function useAutosave(enabled = true) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const flush = async () => {
      pending.current = false;
      await saveNow();
    };

    const unsubscribe = useEditor.subscribe((state, previous) => {
      if (state.doc === previous.doc) return;
      pending.current = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, DEBOUNCE_MS);
    });

    const onLeave = () => {
      if (!pending.current) return;
      writeRecovery(useEditor.getState().doc);
    };
    window.addEventListener('beforeunload', onLeave);
    document.addEventListener('visibilitychange', onLeave);

    return () => {
      unsubscribe();
      window.removeEventListener('beforeunload', onLeave);
      document.removeEventListener('visibilitychange', onLeave);
      if (timer.current) clearTimeout(timer.current);
      if (pending.current) void flush();
    };
  }, [enabled]);
}
