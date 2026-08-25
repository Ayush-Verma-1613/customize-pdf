'use client';

import { useEffect, useRef } from 'react';
import { useEditor } from './editorStore';
import { saveDocument, writeRecovery } from './storage';

const DEBOUNCE_MS = 900;

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
      const { doc, laid, setSaveState } = useEditor.getState();
      pending.current = false;
      setSaveState('saving');
      try {
        await saveDocument(doc, laid.pages.length);
        writeRecovery(doc);
        setSaveState('saved');
      } catch (error) {
        setSaveState('error', error instanceof Error ? error.message : undefined);
      }
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
