'use client';

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CloudOff,
  Download,
  Eye,
  Grid3x3,
  Loader2,
  Magnet,
  Pencil,
  Redo2,
  Save,
  Search,
  Undo2,
} from 'lucide-react';
import { saveNow } from '@/lib/store/autosave';
import { useEditor } from '@/lib/store/editorStore';
import { cx } from '@/lib/utils/cx';
import { Button, IconButton, Segmented } from '@/components/ui/primitives';
import { useCommands } from './CommandLayer';
import { DocumentMenu } from './DocumentMenu';
import { useLeaveGuard } from './LeaveGuard';

export function TopToolbar({ compact = false }: { compact?: boolean }) {
  const doc = useEditor((s) => s.doc);
  const laid = useEditor((s) => s.laid);
  const mode = useEditor((s) => s.mode);
  const showGrid = useEditor((s) => s.showGrid);
  const snapEnabled = useEditor((s) => s.snapEnabled);
  const saveState = useEditor((s) => s.saveState);
  const fontsReady = useEditor((s) => s.fontsReady);
  const fontProblem = useEditor((s) => s.fontProblem);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const store = useEditor;

  const { host, openPalette, exporting, exportError } = useCommands();
  const { leaveTo, dialog: leaveDialog } = useLeaveGuard();

  return (
    <header
      className={cx(
        // Below 640px the controls need more width than a phone has, so the
        // row wraps and the title keeps a line of its own instead of being
        // squeezed to nothing.
        'relative z-40 flex min-h-14 shrink-0 flex-wrap items-center border-b border-line bg-panel px-3 py-1.5',
        'sm:h-14 sm:flex-nowrap sm:py-0',
        compact ? 'gap-1' : 'gap-2',
      )}
    >
      {/* A button rather than a link: the way out has to be able to stop and
          ask first, and a real <a> would have navigated before it could. */}
      <button
        type="button"
        onClick={() => leaveTo('/')}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-[#f1ede6] hover:text-ink"
        title="All documents"
        aria-label="All documents"
      >
        <ArrowLeft size={16} />
      </button>
      {leaveDialog}

      <input
        value={doc.title}
        onChange={(e) =>
          store.getState().edit((draft) => {
            draft.title = e.target.value;
          }, { coalesce: 'title' })
        }
        aria-label="Document title"
        className="min-w-0 flex-1 rounded-lg px-2 py-1 text-[14px] font-medium text-ink transition-colors hover:bg-[#f8f5ef] focus:bg-white focus:ring-2 focus:ring-question-hue/20 focus:outline-none sm:max-w-64"
      />

      <SaveButton state={saveState} compact={compact} />

      {/* Forces the wrap on a phone; invisible everywhere else. */}
      <span className="w-full sm:hidden" />

      <div className="mx-1 hidden h-6 w-px bg-line sm:block" />

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

      <div className="mx-1 h-6 w-px bg-line" />

      <button
        type="button"
        onClick={openPalette}
        title="Find any tool (Ctrl+K)"
        aria-label="Find any tool"
        aria-keyshortcuts="Control+K"
        className={cx(
          'flex h-8 items-center gap-2 rounded-lg border border-line bg-[#f8f5ef] text-[12px] text-muted transition-colors hover:border-[#dcd6cc] hover:bg-white hover:text-ink',
          compact ? 'w-8 justify-center' : 'w-52 px-2.5',
        )}
      >
        <Search size={14} className="shrink-0" />
        {compact ? null : (
          <>
            <span className="flex-1 text-left">Find any tool…</span>
            <kbd className="rounded border border-line bg-white px-1.5 py-0.5 text-[10px] text-faint">
              ⌘K
            </kbd>
          </>
        )}
      </button>

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

        <DocumentMenu compact={compact} />

        <Button
          tone="primary"
          icon={
            exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />
          }
          disabled={!!exporting || !laid.pages.length}
          onClick={host.exportPdf}
          title={fontsReady ? undefined : (fontProblem ?? 'Fonts are still loading')}
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

/**
 * Says where the document stands, and saves it when pressed.
 *
 * Editing saves itself a moment after you stop typing, but "it probably saved"
 * is not a thing anybody wants to feel about work they care about - so the
 * status is a button, and pressing it writes the document out there and then.
 *
 * On a phone it is a filled green button rather than the quiet text the desktop
 * toolbar can afford. Dropping the label there left a bare tick, which reads as
 * an icon reporting a fact rather than something you are invited to press - and
 * saving by hand is exactly what somebody wants on the device they are most
 * likely to close mid-sentence. Green for the same reason it is green when the
 * work is safe. The error state keeps its red, which outranks any of that.
 */
function SaveButton({
  state,
  compact,
}: {
  state: ReturnType<typeof useEditor.getState>['saveState'];
  compact: boolean;
}) {
  const map = {
    idle: { icon: <Check size={12} />, label: 'Saved', tone: 'text-faint hover:bg-[#f1ede6]' },
    dirty: { icon: <Save size={12} />, label: 'Save', tone: 'text-ink hover:bg-[#f1ede6]' },
    saving: {
      icon: <Loader2 size={12} className="animate-spin" />,
      label: 'Saving',
      tone: 'text-faint',
    },
    saved: { icon: <Check size={12} />, label: 'Saved', tone: 'text-success hover:bg-[#f1ede6]' },
    error: {
      icon: <CloudOff size={12} />,
      label: 'Not saved - try again',
      tone: 'text-danger hover:bg-danger-wash',
    },
  } as const;
  const entry = map[state];
  const green = compact && state !== 'error';

  return (
    <button
      type="button"
      onClick={() => void saveNow()}
      disabled={state === 'saving'}
      title={
        state === 'error'
          ? 'This document could not be saved. Press to try again.'
          : 'Saves as you type. Press to save now. Your documents live in this browser only.'
      }
      aria-label="Save now"
      className={cx(
        'flex h-7 shrink-0 items-center gap-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors disabled:cursor-default',
        green ? 'bg-success px-2.5 text-white hover:bg-[#349260]' : cx('px-2', entry.tone),
      )}
    >
      {entry.icon}
      {entry.label}
    </button>
  );
}
