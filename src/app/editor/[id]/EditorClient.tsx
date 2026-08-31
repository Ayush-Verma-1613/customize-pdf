'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useEditor } from '@/lib/store/editorStore';
import { clearRecovery, loadDocument, readRecovery } from '@/lib/store/storage';
import { EditorShell } from '@/components/editor/EditorShell';
import { Button } from '@/components/ui/primitives';

type Status = 'loading' | 'ready' | 'missing';

/**
 * Loads a document out of the browser's local store and hands it to the editor.
 * New documents are created and saved on the home screen before navigating
 * here, so this route only ever reads.
 */
export function EditorClient({ id }: { id: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('loading');
  const [recovery, setRecovery] = useState<{ savedAt: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const existing = await loadDocument(id);
      if (cancelled) return;

      if (!existing) {
        setStatus('missing');
        return;
      }

      useEditor.getState().load(existing);

      // A recovery snapshot newer than the stored copy means the tab closed
      // between the last keystroke and the debounced save.
      const snapshot = readRecovery();
      if (snapshot && snapshot.doc.id === id && snapshot.doc.updatedAt > existing.updatedAt) {
        setRecovery({ savedAt: snapshot.savedAt });
      }
      setStatus('ready');
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (status === 'loading') {
    return (
      <div className="flex h-dvh items-center justify-center gap-2 text-muted">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Opening your document…</span>
      </div>
    );
  }

  if (status === 'missing') {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="max-w-sm">
          <h1 className="text-lg font-medium text-ink">That document is not on this device</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Documents live in this browser. If you made it on another computer,
            open it there, or import the file you exported from it.
          </p>
        </div>
        <Button tone="primary" onClick={() => router.push('/workspace')}>
          Back to my documents
        </Button>
      </div>
    );
  }

  return (
    <>
      {recovery ? (
        <RecoveryBanner
          savedAt={recovery.savedAt}
          onRestore={() => {
            const snapshot = readRecovery();
            if (snapshot) useEditor.getState().load(snapshot.doc);
            clearRecovery();
            setRecovery(null);
          }}
          onDismiss={() => {
            clearRecovery();
            setRecovery(null);
          }}
        />
      ) : null}
      <EditorShell />
    </>
  );
}

function RecoveryBanner({
  savedAt,
  onRestore,
  onDismiss,
}: {
  savedAt: string;
  onRestore: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="animate-rise fixed inset-x-0 top-3 z-50 mx-auto flex w-fit items-center gap-3 rounded-xl border border-structure-hue/25 bg-structure-wash px-4 py-2.5 shadow-lg">
      <p className="text-[13px] text-structure-hue">
        Unsaved work was recovered from {new Date(savedAt).toLocaleTimeString()}.
      </p>
      <Button size="sm" tone="primary" onClick={onRestore}>
        Restore it
      </Button>
      <Button size="sm" tone="ghost" onClick={onDismiss}>
        Discard
      </Button>
    </div>
  );
}
