'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  FileText,
  HelpCircle,
  Layers,
  LayoutTemplate,
  ListTree,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react';
import { useAutosave } from '@/lib/store/autosave';
import { useEditor, type SidePanel } from '@/lib/store/editorStore';
import { useCompactLayout } from '@/lib/utils/useMedia';
import { cx } from '@/lib/utils/cx';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { CanvasArea } from './canvas/CanvasArea';
import { SelectionToolbar } from './canvas/SelectionToolbar';
import { BackgroundDecoration } from '@/components/workspace/layout/BackgroundDecoration';
import { CommandLayer } from './CommandLayer';
import { ImportNotice } from './ImportNotice';
import { BottomBar } from './BottomBar';
import { TopToolbar } from './TopToolbar';
import { ContentPanel } from './panels/ContentPanel';
import { DocumentPanel } from './panels/DocumentPanel';
import { ElementsPanel } from './panels/ElementsPanel';
import { GuidePanel } from './panels/GuidePanel';
import { PagesPanel } from './panels/PagesPanel';
import { RightPanel } from './panels/RightPanel';
import { TemplatesPanel } from './panels/TemplatesPanel';

/** The panel tabs, plus the properties inspector which is its own tab on mobile. */
type Tab = SidePanel | 'properties';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'elements', label: 'Elements', icon: <Layers size={17} /> },
  { id: 'content', label: 'Content', icon: <ListTree size={17} /> },
  { id: 'templates', label: 'Templates', icon: <LayoutTemplate size={17} /> },
  { id: 'pages', label: 'Pages', icon: <FileText size={17} /> },
  { id: 'document', label: 'Document', icon: <Settings2 size={17} /> },
  { id: 'guide', label: 'Help', icon: <HelpCircle size={17} /> },
];

const MOBILE_TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  ...TABS.slice(0, 1),
  { id: 'properties', label: 'Edit', icon: <SlidersHorizontal size={17} /> },
  ...TABS.slice(1),
];

function panelFor(tab: Tab) {
  switch (tab) {
    case 'elements':
      return <ElementsPanel />;
    case 'content':
      return <ContentPanel />;
    case 'templates':
      return <TemplatesPanel />;
    case 'pages':
      return <PagesPanel />;
    case 'document':
      return <DocumentPanel />;
    case 'guide':
      return <GuidePanel />;
    case 'properties':
      return <RightPanel />;
  }
}

const TAB_TITLE: Record<Tab, string> = {
  elements: 'Add an element',
  content: 'Content',
  templates: 'Templates',
  pages: 'Pages',
  document: 'Document settings',
  guide: 'How to use Docraft',
  properties: 'Properties',
};

export function EditorShell() {
  const compact = useCompactLayout();
  return compact ? <CompactShell /> : <DesktopShell />;
}

/* ------------------------------------------------------------------ *
 * Desktop
 * ------------------------------------------------------------------ */

function DesktopShell() {
  const panel = useEditor((s) => s.panel);
  const mode = useEditor((s) => s.mode);
  useAutosave();
  useShortcuts();

  const [leftOpen, setLeftOpen] = useState(true);

  // A command that needs a whole panel reveals it rather than failing quietly.
  const openPanel = useCallback((next: SidePanel) => {
    useEditor.getState().setPanel(next);
    setLeftOpen(true);
  }, []);

  return (
    <CommandLayer onOpenPanel={openPanel}>
      <BackgroundDecoration />
      <div className="relative flex h-dvh flex-col overflow-hidden">
        <TopToolbar />
        <ImportNotice />

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
                          useEditor.getState().setPanel(tab.id as SidePanel);
                          setLeftOpen(true);
                        }
                      }}
                      className={cx(
                        'flex h-11 w-11 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors',
                        active ? 'bg-ink text-white' : 'text-muted hover:bg-[#f1ede6] hover:text-ink',
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
                  {panelFor(panel)}
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
    </CommandLayer>
  );
}

/* ------------------------------------------------------------------ *
 * Phones and small tablets
 * ------------------------------------------------------------------ */

function CompactShell() {
  const mode = useEditor((s) => s.mode);
  const selection = useEditor((s) => s.selection);
  const editingId = useEditor((s) => s.editingId);
  const [sheet, setSheet] = useState<Tab | null>(null);
  useAutosave();
  useShortcuts();

  const openPanel = useCallback((next: SidePanel) => setSheet(next), []);

  // Selecting something on the page is the moment you want its properties, but
  // opening the sheet automatically would cover the thing you just tapped.
  // A badge on the Edit tab points at it instead.
  const hasSelection = selection.kind === 'block' || selection.kind === 'overlay';

  // Preview hides the chrome, so no panel can be open in it.
  const openSheet = mode === 'preview' ? null : sheet;

  return (
    <CommandLayer onOpenPanel={openPanel}>
      <BackgroundDecoration />
      <div className="relative flex h-dvh flex-col overflow-hidden">
        <TopToolbar compact />
        <ImportNotice />

        <main className="min-h-0 flex-1">
          <CanvasArea />
        </main>

        {/* On a phone the element's own controls dock above the tab bar: a
            floating bar would cover the very thing being edited. */}
        {mode === 'design' && hasSelection && !openSheet && !editingId ? (
          <SelectionToolbar variant="docked" onOpenInspector={() => setSheet('properties')} />
        ) : null}

        <BottomBar compact />

        {mode === 'design' ? (
          <nav
            className="flex shrink-0 items-stretch overflow-x-auto border-t border-line bg-panel pb-[env(safe-area-inset-bottom)]"
            aria-label="Editor panels"
          >
            {MOBILE_TABS.map((tab) => {
              const active = openSheet === tab.id;
              const flagged = tab.id === 'properties' && hasSelection && !active;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-label={tab.label}
                  aria-pressed={active}
                  onClick={() => setSheet(active ? null : tab.id)}
                  className={cx(
                    'relative flex min-w-[50px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 transition-colors',
                    active ? 'text-ink' : 'text-muted',
                  )}
                >
                  <span
                    className={cx(
                      'flex h-7 w-9 items-center justify-center rounded-lg transition-colors',
                      active && 'bg-ink text-white',
                    )}
                  >
                    {tab.icon}
                  </span>
                  <span className="text-[9px] font-medium">{tab.label}</span>
                  {flagged ? (
                    <span className="absolute top-1.5 right-1/2 h-1.5 w-1.5 translate-x-4 rounded-full bg-question-hue" />
                  ) : null}
                </button>
              );
            })}
          </nav>
        ) : null}

        <BottomSheet
          key={openSheet ?? 'none'}
          open={openSheet !== null}
          title={openSheet ? TAB_TITLE[openSheet] : ''}
          onClose={() => setSheet(null)}
        >
          {openSheet ? panelFor(openSheet) : null}
        </BottomSheet>
      </div>
    </CommandLayer>
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
