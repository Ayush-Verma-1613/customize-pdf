'use client';

import { useEffect, useState } from 'react';
import {
  FileText,
  Layers,
  LayoutTemplate,
  ListTree,
  Settings2,
} from 'lucide-react';
import { useAutosave } from '@/lib/store/autosave';
import { useEditor, type SidePanel } from '@/lib/store/editorStore';
import { cx } from '@/lib/utils/cx';
import { CanvasArea } from './canvas/CanvasArea';
import { BottomBar } from './BottomBar';
import { TopToolbar } from './TopToolbar';
import { ContentPanel } from './panels/ContentPanel';
import { DocumentPanel } from './panels/DocumentPanel';
import { ElementsPanel } from './panels/ElementsPanel';
import { PagesPanel } from './panels/PagesPanel';
import { RightPanel } from './panels/RightPanel';
import { TemplatesPanel } from './panels/TemplatesPanel';

const TABS: { id: SidePanel; label: string; icon: React.ReactNode }[] = [
  { id: 'elements', label: 'Elements', icon: <Layers size={17} /> },
  { id: 'content', label: 'Content', icon: <ListTree size={17} /> },
  { id: 'templates', label: 'Templates', icon: <LayoutTemplate size={17} /> },
  { id: 'pages', label: 'Pages', icon: <FileText size={17} /> },
  { id: 'document', label: 'Document', icon: <Settings2 size={17} /> },
];

export function EditorShell() {
  const panel = useEditor((s) => s.panel);
  const mode = useEditor((s) => s.mode);
  useAutosave();
  useShortcuts();

  const [leftOpen, setLeftOpen] = useState(true);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-shell">
      <TopToolbar />

      <div className="flex min-h-0 flex-1">
        {mode === 'design' ? (
          <>
            <nav className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-line bg-panel py-2">
              {TABS.map((tab) => {
                const active = panel === tab.id && leftOpen;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    title={tab.label}
                    aria-label={tab.label}
                    aria-pressed={active}
                    onClick={() => {
                      if (panel === tab.id) setLeftOpen((open) => !open);
                      else {
                        useEditor.getState().setPanel(tab.id);
                        setLeftOpen(true);
                      }
                    }}
                    className={cx(
                      'flex h-11 w-11 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors',
                      active ? 'bg-ink text-white' : 'text-muted hover:bg-slate-100 hover:text-ink',
                    )}
                  >
                    {tab.icon}
                    <span className="text-[9px] font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {leftOpen ? (
              <aside className="w-[290px] shrink-0 overflow-y-auto border-r border-line bg-panel">
                {panel === 'elements' ? <ElementsPanel /> : null}
                {panel === 'content' ? <ContentPanel /> : null}
                {panel === 'templates' ? <TemplatesPanel /> : null}
                {panel === 'pages' ? <PagesPanel /> : null}
                {panel === 'document' ? <DocumentPanel /> : null}
              </aside>
            ) : null}
          </>
        ) : null}

        <main className="min-w-0 flex-1">
          <CanvasArea />
        </main>

        {mode === 'design' ? (
          <aside className="w-[300px] shrink-0 overflow-y-auto border-l border-line bg-panel">
            <RightPanel />
          </aside>
        ) : null}
      </div>

      <BottomBar />
    </div>
  );
}

/**
 * Keyboard shortcuts. Anything typed into a field or a contentEditable is left
 * alone - a teacher pressing Delete mid-sentence should not lose a question.
 */
function useShortcuts() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

      const store = useEditor.getState();
      const meta = event.metaKey || event.ctrlKey;

      if (meta && event.key.toLowerCase() === 'z') {
        if (typing) return;
        event.preventDefault();
        if (event.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (meta && event.key.toLowerCase() === 'y') {
        if (typing) return;
        event.preventDefault();
        store.redo();
        return;
      }
      if (meta && event.key.toLowerCase() === 'd') {
        if (typing) return;
        event.preventDefault();
        const selection = store.selection;
        if (selection.kind === 'block') selection.ids.forEach(store.duplicateBlockById);
        if (selection.kind === 'overlay') selection.ids.forEach(store.duplicateOverlayById);
        return;
      }
      if (meta && event.key.toLowerCase() === 'c' && !typing) {
        store.copySelection();
        return;
      }
      if (meta && event.key.toLowerCase() === 'v' && !typing) {
        event.preventDefault();
        store.pasteClipboard();
        return;
      }

      if (typing) return;

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        store.deleteSelection();
        return;
      }
      if (event.key === 'Escape') {
        store.clearSelection();
        return;
      }
      if (event.key.startsWith('Arrow') && store.selection.kind === 'overlay') {
        event.preventDefault();
        const distance = event.shiftKey ? 10 : 1;
        const dx = event.key === 'ArrowLeft' ? -distance : event.key === 'ArrowRight' ? distance : 0;
        const dy = event.key === 'ArrowUp' ? -distance : event.key === 'ArrowDown' ? distance : 0;
        store.nudgeSelection(dx, dy);
        return;
      }
      if (event.key === 'Enter' && store.selection.kind !== 'none') {
        const selection = store.selection;
        if (selection.kind === 'block' || selection.kind === 'overlay') {
          event.preventDefault();
          store.beginEditing(selection.ids[0]);
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
