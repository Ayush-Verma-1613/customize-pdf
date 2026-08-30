'use client';

import { useCallback, useEffect, useState } from 'react';
import { downloadPdf } from '@/lib/export/pdf';
import { useEditor } from '@/lib/store/editorStore';
import { downloadDocumentFile } from '@/lib/store/storage';

export interface ExportProgress {
  done: number;
  total: number;
}

/**
 * Getting the document out of the app. One instance owns the progress and the
 * error, so the toolbar button, the command palette and the finish bar all
 * report the same export rather than each starting its own.
 */
export function useExportPdf() {
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(timer);
  }, [error]);

  const exportPdf = useCallback(async () => {
    const { doc, laid } = useEditor.getState();
    if (!laid.pages.length || progress) return;
    setError(null);
    setProgress({ done: 0, total: laid.pages.length });
    try {
      await downloadPdf(doc, laid, {
        onProgress: (done, total) => setProgress({ done, total }),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The export failed.');
    } finally {
      setProgress(null);
    }
  }, [progress]);

  const saveCopy = useCallback(() => {
    downloadDocumentFile(useEditor.getState().doc);
  }, []);

  return { progress, error, exportPdf, saveCopy, dismissError: () => setError(null) };
}
