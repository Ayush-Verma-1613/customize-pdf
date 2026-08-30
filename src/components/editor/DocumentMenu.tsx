'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Copy,
  FileDown,
  Grid3x3,
  Loader2,
  Magnet,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { useEditor } from '@/lib/store/editorStore';
import {
  deleteDocument,
  downloadDocumentFile,
  saveDocument,
} from '@/lib/store/storage';
import { cloneOverlay } from '@/lib/model/factory';
import { uid } from '@/lib/utils/id';
import { cx } from '@/lib/utils/cx';
import { Button, IconButton } from '@/components/ui/primitives';

/**
 * Document-level actions that do not belong on the main toolbar: saving a copy
 * to disk, duplicating, and deleting. Delete asks first and says plainly that
 * the document lives only in this browser, because there is no server copy to
 * fall back on.
 */
export function DocumentMenu({ compact }: { compact?: boolean }) {
  const router = useRouter();
  const doc = useEditor((s) => s.doc);
  const showGrid = useEditor((s) => s.showGrid);
  const snapEnabled = useEditor((s) => s.snapEnabled);
  const store = useEditor;

  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const duplicate = async () => {
    const now = new Date().toISOString();
    const copy = {
      ...structuredClone(doc),
      id: uid('doc'),
      title: `${doc.title} (copy)`,
      overlays: doc.overlays.map((o) => cloneOverlay(o, 0)),
      createdAt: now,
      updatedAt: now,
    };
    await saveDocument(copy);
    router.push(`/editor/${copy.id}`);
  };

  const remove = async () => {
    setBusy(true);
    await deleteDocument(doc.id);
    router.push('/');
  };

  return (
    <div ref={ref} className="relative">
      <IconButton
        label="Document actions"
        active={open}
        onClick={() => {
          setOpen((o) => !o);
          setConfirming(false);
        }}
      >
        <MoreVertical size={16} />
      </IconButton>

      {open ? (
        <div className="animate-rise absolute right-0 z-50 mt-1 w-64 overflow-hidden rounded-xl border border-line bg-white p-1 shadow-xl">
          {compact ? (
            <>
              <MenuToggle
                icon={<Grid3x3 size={14} />}
                label="Show grid"
                active={showGrid}
                onClick={() => store.getState().toggleGrid()}
              />
              <MenuToggle
                icon={<Magnet size={14} />}
                label="Snap to guides"
                active={snapEnabled}
                onClick={() => store.getState().toggleSnap()}
              />
              <hr className="my-1 border-line-soft" />
            </>
          ) : null}

          <p className="mx-2 mb-1 rounded-lg bg-[#f8f5ef] px-2.5 py-2 text-[11px] leading-relaxed text-muted">
            This document is saved in this browser only - we keep no copy of it.
            Export a PDF, or save a copy, to keep it or move it elsewhere.
          </p>

          <MenuItem
            icon={<FileDown size={14} />}
            label="Save a copy to my computer"
            hint="An editable .json file you can import again"
            onClick={() => {
              downloadDocumentFile(doc);
              setOpen(false);
            }}
          />
          <MenuItem
            icon={<Copy size={14} />}
            label="Duplicate this document"
            onClick={duplicate}
          />

          <hr className="my-1 border-line-soft" />

          {confirming ? (
            <div className="p-2">
              <p className="text-[12px] leading-relaxed text-danger">
                Delete “{doc.title}”? It is saved only in this browser, so this
                cannot be undone.
              </p>
              <div className="mt-2 flex gap-1.5">
                <Button
                  size="sm"
                  tone="danger"
                  className="flex-1"
                  disabled={busy}
                  icon={busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  onClick={remove}
                >
                  Delete
                </Button>
                <Button size="sm" tone="ghost" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <MenuItem
              icon={<Trash2 size={14} />}
              label="Delete this document"
              danger
              onClick={() => setConfirming(true)}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  hint,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
        danger ? 'text-danger hover:bg-danger-wash' : 'text-ink-soft hover:bg-[#f1ede6]',
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[13px]">{label}</span>
        {hint ? <span className="block text-[11px] text-faint">{hint}</span> : null}
      </span>
    </button>
  );
}

function MenuToggle({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-ink-soft transition-colors hover:bg-[#f1ede6]"
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 text-[13px]">{label}</span>
      <span
        className={cx(
          'relative h-4.5 w-8 shrink-0 rounded-full transition-colors',
          active ? 'bg-ink' : 'bg-[#dcd6cc]',
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
            active ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  );
}
