'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CloudOff,
  Download,
  Eye,
  FileDown,
  Grid3x3,
  Loader2,
  Magnet,
  Pencil,
  Redo2,
  Undo2,
} from 'lucide-react';
import { downloadPdf } from '@/lib/export/pdf';
import { downloadDocumentFile } from '@/lib/store/storage';
import { useEditor } from '@/lib/store/editorStore';
import { cx } from '@/lib/utils/cx';
import { Button, IconButton, Segmented } from '@/components/ui/primitives';

export function TopToolbar({ compact = false }: { compact?: boolean }) {
  const doc = useEditor((s) => s.doc);
  const laid = useEditor((s) => s.laid);
  const mode = useEditor((s) => s.mode);
  const showGrid = useEditor((s) => s.showGrid);
  const snapEnabled = useEditor((s) => s.snapEnabled);
  const saveState = useEditor((s) => s.saveState);
  const fontsReady = useEditor((s) => s.fontsReady);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const store = useEditor;

  const [exporting, setExporting] = useState<null | { done: number; total: number }>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (!exportError) return;
    const timer = setTimeout(() => setExportError(null), 6000);
    return () => clearTimeout(timer);
  }, [exportError]);

  const exportPdf = async () => {
    setExportError(null);
    setExporting({ done: 0, total: laid.pages.length });
    try {
      await downloadPdf(doc, laid, {
        onProgress: (done, total) => setExporting({ done, total }),
      });
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'The export failed.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <header
      className={cx(
        'relative z-40 flex h-14 shrink-0 items-center border-b border-line bg-panel px-3',
        compact ? 'gap-1' : 'gap-2',
      )}
    >
      <Link
        href="/"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-slate-100 hover:text-ink"
        title="All documents"
        aria-label="All documents"
      >
        <ArrowLeft size={16} />
      </Link>

      <input
        value={doc.title}
        onChange={(e) =>
          store.getState().edit((draft) => {
            draft.title = e.target.value;
          }, { coalesce: 'title' })
        }
        aria-label="Document title"
        className="min-w-0 max-w-64 flex-1 rounded-lg px-2 py-1 text-[14px] font-medium text-ink transition-colors hover:bg-slate-50 focus:bg-white focus:ring-2 focus:ring-question-hue/20 focus:outline-none"
      />

      {compact ? null : <SaveBadge state={saveState} />}

      <div className="mx-1 h-6 w-px bg-line" />

      <IconButton label="Undo (Ctrl+Z)" disabled={!canUndo} onClick={() => store.getState().undo()}>
        <Undo2 size={16} />
      </IconButton>
      <IconButton
        label="Redo (Ctrl+Shift+Z)"
        disabled={!canRedo}
        onClick={() => store.getState().redo()}
      >
        <Redo2 size={16} />
      </IconButton>

      {compact ? null : (
        <>
          <div className="mx-1 h-6 w-px bg-line" />
          <IconButton
            label="Show grid"
            active={showGrid}
            onClick={() => store.getState().toggleGrid()}
          >
            <Grid3x3 size={16} />
          </IconButton>
          <IconButton
            label="Snap to guides"
            active={snapEnabled}
            onClick={() => store.getState().toggleSnap()}
          >
            <Magnet size={16} />
          </IconButton>
        </>
      )}

      <div className="ml-auto flex items-center gap-2">
        {laid.warnings.length > 0 && !compact ? (
          <span
            className="flex items-center gap-1.5 rounded-lg bg-structure-wash px-2.5 py-1.5 text-[12px] text-structure-hue"
            title={laid.warnings.map((w) => w.message).join('\n')}
          >
            <AlertTriangle size={13} />
            {laid.warnings.length} layout note{laid.warnings.length === 1 ? '' : 's'}
          </span>
        ) : null}

        <span className="hidden text-[12px] text-faint lg:inline">
          {laid.pages.length} page{laid.pages.length === 1 ? '' : 's'}
          {laid.totalMarks ? ` · ${laid.totalMarks} marks` : ''}
        </span>

        <Segmented
          value={mode}
          onChange={(next) => store.getState().setMode(next)}
          options={[
            { value: 'design', label: <Pencil size={13} />, title: 'Edit' },
            { value: 'preview', label: <Eye size={13} />, title: 'Preview' },
          ]}
        />

        {compact ? null : (
          <IconButton
            label="Download the editable file"
            onClick={() => downloadDocumentFile(doc)}
          >
            <FileDown size={16} />
          </IconButton>
        )}

        <Button
          tone="primary"
          icon={
            exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />
          }
          disabled={!!exporting || !laid.pages.length}
          onClick={exportPdf}
          title={fontsReady ? undefined : 'Fonts are still loading'}
        >
          <span className={compact ? 'sr-only' : undefined}>
            {exporting ? `Page ${exporting.done}/${exporting.total}` : 'Export PDF'}
          </span>
        </Button>
      </div>

      {exportError ? (
        <p className="animate-rise absolute top-full right-3 mt-2 rounded-lg bg-danger-wash px-3 py-2 text-[12px] text-danger shadow-lg">
          {exportError}
        </p>
      ) : null}
    </header>
  );
}

function SaveBadge({ state }: { state: ReturnType<typeof useEditor.getState>['saveState'] }) {
  const map = {
    idle: { icon: null, label: 'Saved locally', tone: 'text-faint' },
    dirty: { icon: null, label: 'Unsaved changes', tone: 'text-faint' },
    saving: {
      icon: <Loader2 size={11} className="animate-spin" />,
      label: 'Saving',
      tone: 'text-faint',
    },
    saved: { icon: <Check size={11} />, label: 'Saved', tone: 'text-success' },
    error: { icon: <CloudOff size={11} />, label: 'Not saved', tone: 'text-danger' },
  } as const;
  const entry = map[state];

  return (
    <span className={cx('flex items-center gap-1 text-[11px] whitespace-nowrap', entry.tone)}>
      {entry.icon}
      {entry.label}
    </span>
  );
}
