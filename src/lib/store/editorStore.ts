'use client';

import { create } from 'zustand';
import { layoutDocument } from '@/lib/engine/layout';
import { ensureFontsLoaded, type FontLoadResult } from '@/lib/engine/measure';
import type { LaidOutDoc } from '@/lib/engine/types';
import { cloneBlock, cloneOverlay, createBlock, createDocument, createOverlay } from '@/lib/model/factory';
import { buildFromTemplate, carriedContent } from '@/lib/templates';
import type {
  Block,
  BlockType,
  Overlay,
  OverlayKind,
  PageSetup,
  PaperDoc,
  Theme,
} from '@/lib/model/types';
import { clamp } from '@/lib/utils/geom';
import {
  deletePage as deletePageOp,
  duplicatePage as duplicatePageOp,
  insertPage as insertPageOp,
  insertPageBreakAt,
  movePage as movePageOp,
  pageRanges,
} from './pages';

/* ------------------------------------------------------------------ *
 * Selection
 * ------------------------------------------------------------------ */

export type Selection =
  | { kind: 'none' }
  | { kind: 'block'; ids: string[] }
  | { kind: 'overlay'; ids: string[] }
  | { kind: 'cell'; blockId: string; rowId: string; cellId: string }
  | { kind: 'master'; id: string }
  | { kind: 'page' };

export const isSelected = (selection: Selection, id: string) =>
  (selection.kind === 'block' || selection.kind === 'overlay') && selection.ids.includes(id);

/* ------------------------------------------------------------------ *
 * History
 * ------------------------------------------------------------------ */

interface Snapshot {
  doc: PaperDoc;
  label: string;
}

const HISTORY_LIMIT = 80;
/** Edits sharing a coalesce key inside this window collapse into one undo step. */
const COALESCE_MS = 700;

interface EditOptions {
  /** Skip the undo stack entirely (selection-only or transient changes). */
  silent?: boolean;
  /** Merge with the previous entry when the key and timing match. */
  coalesce?: string;
  label?: string;
}

/* ------------------------------------------------------------------ *
 * Store
 * ------------------------------------------------------------------ */

export type SidePanel = 'elements' | 'templates' | 'content' | 'pages' | 'document' | 'guide';

/**
 * Where a long press landed, in client coordinates.
 *
 * A finger cannot double-click and has no second button, so on a touch screen
 * holding a word is what opens it for editing. The point travels with the
 * request because only the inline editor can turn it back into a caret - and
 * it has to do that against the text it is about to render, not the SVG the
 * finger actually touched.
 */
export interface EditingSeed {
  x: number;
  y: number;
}
export type EditorMode = 'design' | 'preview';
export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export interface EditorState {
  doc: PaperDoc;
  laid: LaidOutDoc;
  selection: Selection;
  activePage: number;
  zoom: number;
  fitMode: 'manual' | 'width' | 'page';
  mode: EditorMode;
  panel: SidePanel;
  /** Block or overlay currently open for inline text editing. */
  editingId: string | null;
  /** Consumed once by the inline editor to select the word that was held. */
  editingSeed: EditingSeed | null;
  showGrid: boolean;
  snapEnabled: boolean;
  fontsReady: boolean;
  /** Set when a shipped face failed to load, so the UI can stop promising exact output. */
  fontProblem: string | null;
  saveState: SaveState;
  lastSavedAt: string | null;
  errorMessage: string | null;
  past: Snapshot[];
  future: Snapshot[];
  lastEdit: { key: string; at: number } | null;
  clipboard: { blocks: Block[]; overlays: Overlay[] } | null;

  /* lifecycle */
  load: (doc: PaperDoc) => void;
  markFontsReady: (result: FontLoadResult) => void;
  relayout: () => void;
  setSaveState: (state: SaveState, message?: string) => void;

  /* editing */
  edit: (recipe: (draft: PaperDoc) => PaperDoc | void, options?: EditOptions) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  /* view */
  setZoom: (zoom: number, fit?: EditorState['fitMode']) => void;
  setMode: (mode: EditorMode) => void;
  setPanel: (panel: SidePanel) => void;
  setActivePage: (index: number) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;

  /* selection */
  select: (selection: Selection) => void;
  selectBlock: (id: string, additive?: boolean) => void;
  selectOverlay: (id: string, additive?: boolean) => void;
  clearSelection: () => void;
  beginEditing: (id: string | null, seed?: EditingSeed) => void;
  clearEditingSeed: () => void;

  /* blocks */
  addBlock: (type: BlockType, at?: number) => void;
  insertBlocks: (blocks: Block[], at?: number) => void;
  updateBlock: (id: string, patch: (block: Block) => Block | void, options?: EditOptions) => void;
  removeBlock: (id: string) => void;
  duplicateBlockById: (id: string) => void;
  moveBlock: (from: number, to: number) => void;
  moveSelectedBlock: (delta: number) => void;

  /* overlays */
  addOverlay: (kind: OverlayKind, page?: number, x?: number, y?: number) => string;
  updateOverlay: (id: string, patch: Partial<Overlay>, options?: EditOptions) => void;
  removeOverlay: (id: string) => void;
  duplicateOverlayById: (id: string) => void;
  reorderOverlay: (id: string, action: 'front' | 'back' | 'forward' | 'backward') => void;
  nudgeSelection: (dx: number, dy: number) => void;

  /* pages */
  addPage: (after?: number) => void;
  removePage: (index: number) => void;
  duplicatePageAt: (index: number) => void;
  reorderPage: (from: number, to: number) => void;
  breakBefore: (blockId: string) => void;
  setPageSetup: (patch: Partial<PageSetup>) => void;
  setTheme: (patch: Partial<Theme>) => void;
  applyTemplate: (templateId: string, keepContent: boolean, variantId?: string) => void;
  /** Rebuild the current template with a different body layout. */
  applyVariant: (variantId: string) => void;

  /* clipboard */
  copySelection: () => void;
  pasteClipboard: () => void;
  pasteAt: (index: number) => void;
  deleteSelection: () => void;
}

const stamp = (doc: PaperDoc): PaperDoc => ({ ...doc, updatedAt: new Date().toISOString() });

const emptyLayout: LaidOutDoc = {
  pages: [],
  blockPages: {},
  numbers: {},
  warnings: [],
  exact: false,
  totalMarks: 0,
};

const blank = createDocument();

export const useEditor = create<EditorState>((set, get) => {
  /** Recompute the layout for a document and keep the active page in range. */
  const withLayout = (doc: PaperDoc, activePage: number) => {
    const laid = layoutDocument(doc);
    return { laid, activePage: clamp(activePage, 0, Math.max(0, laid.pages.length - 1)) };
  };

  const commit = (next: PaperDoc, options: EditOptions = {}) => {
    const state = get();
    const now = Date.now();
    const coalesce =
      options.coalesce &&
      state.lastEdit?.key === options.coalesce &&
      now - state.lastEdit.at < COALESCE_MS;

    const past = options.silent
      ? state.past
      : coalesce
        ? state.past
        : [...state.past, { doc: state.doc, label: options.label ?? 'Edit' }].slice(-HISTORY_LIMIT);

    const doc = stamp(next);
    set({
      doc,
      ...withLayout(doc, state.activePage),
      past,
      future: options.silent ? state.future : [],
      lastEdit: options.coalesce ? { key: options.coalesce, at: now } : null,
      saveState: 'dirty',
    });
  };

  const currentSelectionIds = () => {
    const { selection } = get();
    return selection.kind === 'block' || selection.kind === 'overlay' ? selection.ids : [];
  };

  return {
    doc: blank,
    laid: emptyLayout,
    selection: { kind: 'none' },
    activePage: 0,
    zoom: 1,
    fitMode: 'width',
    mode: 'design',
    panel: 'elements',
    editingId: null,
    editingSeed: null,
    showGrid: false,
    snapEnabled: true,
    fontsReady: false,
    fontProblem: null,
    saveState: 'idle',
    lastSavedAt: null,
    errorMessage: null,
    past: [],
    future: [],
    lastEdit: null,
    clipboard: null,

    load: (doc) => {
      set({
        doc,
        ...withLayout(doc, 0),
        selection: { kind: 'none' },
        past: [],
        future: [],
        editingId: null,
        saveState: 'idle',
        errorMessage: null,
      });
      void ensureFontsLoaded().then((result) => get().markFontsReady(result));
    },

    markFontsReady: (result) => {
      if (!result.ok) {
        // Leave fontsReady false: the layout is still measured against system
        // fallbacks, so it must not be advertised as matching the export.
        set({
          fontProblem: `${result.failed.length} font ${
            result.failed.length === 1 ? 'file' : 'files'
          } could not be loaded, so line breaks may shift in the exported PDF.`,
        });
        return;
      }
      if (get().fontsReady) return;
      set({ fontsReady: true, fontProblem: null, ...withLayout(get().doc, get().activePage) });
    },

    relayout: () => set(withLayout(get().doc, get().activePage)),

    setSaveState: (state, message) =>
      set({
        saveState: state,
        errorMessage: state === 'error' ? (message ?? 'Could not save.') : null,
        lastSavedAt: state === 'saved' ? new Date().toISOString() : get().lastSavedAt,
      }),

    edit: (recipe, options) => {
      const draft = structuredClone(get().doc);
      const result = recipe(draft);
      commit(result ?? draft, options);
    },

    undo: () => {
      const { past, future, doc, activePage } = get();
      const previous = past[past.length - 1];
      if (!previous) return;
      set({
        doc: previous.doc,
        ...withLayout(previous.doc, activePage),
        past: past.slice(0, -1),
        future: [{ doc, label: previous.label }, ...future].slice(0, HISTORY_LIMIT),
        editingId: null,
        lastEdit: null,
        saveState: 'dirty',
      });
    },

    redo: () => {
      const { past, future, doc, activePage } = get();
      const next = future[0];
      if (!next) return;
      set({
        doc: next.doc,
        ...withLayout(next.doc, activePage),
        past: [...past, { doc, label: next.label }].slice(-HISTORY_LIMIT),
        future: future.slice(1),
        editingId: null,
        lastEdit: null,
        saveState: 'dirty',
      });
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,

    setZoom: (zoom, fit = 'manual') => set({ zoom: clamp(zoom, 0.15, 5), fitMode: fit }),
    setMode: (mode) =>
      set({
        mode,
        editingId: null,
        editingSeed: null,
        selection: mode === 'preview' ? { kind: 'none' } : get().selection,
      }),
    setPanel: (panel) => set({ panel }),
    setActivePage: (index) =>
      set({ activePage: clamp(index, 0, Math.max(0, get().laid.pages.length - 1)) }),
    toggleGrid: () => set({ showGrid: !get().showGrid }),
    toggleSnap: () => set({ snapEnabled: !get().snapEnabled }),

    select: (selection) => set({ selection, editingId: null, editingSeed: null }),

    selectBlock: (id, additive) => {
      const { selection } = get();
      if (additive && selection.kind === 'block') {
        const ids = selection.ids.includes(id)
          ? selection.ids.filter((x) => x !== id)
          : [...selection.ids, id];
        set({ selection: ids.length ? { kind: 'block', ids } : { kind: 'none' } });
        return;
      }
      set({ selection: { kind: 'block', ids: [id] } });
    },

    selectOverlay: (id, additive) => {
      const { selection } = get();
      if (additive && selection.kind === 'overlay') {
        const ids = selection.ids.includes(id)
          ? selection.ids.filter((x) => x !== id)
          : [...selection.ids, id];
        set({ selection: ids.length ? { kind: 'overlay', ids } : { kind: 'none' } });
        return;
      }
      set({ selection: { kind: 'overlay', ids: [id] } });
    },

    clearSelection: () => set({ selection: { kind: 'none' }, editingId: null, editingSeed: null }),

    /**
     * Only things made of words can be typed into. Accepting anything else set
     * an editingId that the inline editor then refused to render, which hid the
     * element's toolbar and stopped it taking clicks - so a line, once
     * double-clicked, could no longer be selected or deleted.
     */
    beginEditing: (id, seed) => {
      if (id === null) {
        set({ editingId: null, editingSeed: null });
        return;
      }
      const { doc } = get();
      const target =
        doc.flow.find((b) => b.id === id) ?? doc.overlays.find((o) => o.id === id) ?? null;
      const editable = hasEditableText(target);
      set({ editingId: editable ? id : null, editingSeed: editable ? (seed ?? null) : null });
    },

    clearEditingSeed: () => {
      if (get().editingSeed) set({ editingSeed: null });
    },

    addBlock: (type, at) => {
      const block = createBlock(type);
      get().insertBlocks([block], at);
      set({ selection: { kind: 'block', ids: [block.id] } });
    },

    insertBlocks: (blocks, at) => {
      if (!blocks.length) return;
      get().edit((draft) => {
        const index = at ?? insertionPoint(draft, get().selection);
        draft.flow.splice(index, 0, ...blocks);
      }, { label: 'Insert content' });
    },

    /**
     * Only the block being changed is copied.
     *
     * Cloning the whole document here would hand every other block a fresh
     * identity, and block identity is exactly what the layout engine memoises
     * its measurements against - so a single keystroke threw away the measured
     * width of every line in the document and re-measured it. Copying one block
     * leaves the rest of the cache warm.
     */
    updateBlock: (id, patch, options) => {
      const doc = get().doc;
      const index = doc.flow.findIndex((b) => b.id === id);
      if (index < 0) return;
      const draft = structuredClone(doc.flow[index]);
      const result = patch(draft);
      const next = result ?? draft;
      // Touching a block the template wrote makes it the user's, so a later
      // restyle carries it across instead of regenerating over the top.
      delete next.generated;
      const flow = doc.flow.slice();
      flow[index] = next;
      commit({ ...doc, flow }, options ?? { coalesce: `block:${id}` });
    },

    removeBlock: (id) => {
      get().edit((draft) => {
        draft.flow = draft.flow.filter((b) => b.id !== id);
      }, { label: 'Delete element' });
      set({ selection: { kind: 'none' } });
    },

    duplicateBlockById: (id) => {
      let newId = '';
      get().edit((draft) => {
        const index = draft.flow.findIndex((b) => b.id === id);
        if (index < 0) return;
        const copy = cloneBlock(draft.flow[index]);
        // A copy somebody asked for is theirs, whatever it was copied from.
        delete copy.generated;
        newId = copy.id;
        draft.flow.splice(index + 1, 0, copy);
      }, { label: 'Duplicate element' });
      if (newId) set({ selection: { kind: 'block', ids: [newId] } });
    },

    moveBlock: (from, to) => {
      get().edit((draft) => {
        if (from < 0 || from >= draft.flow.length) return;
        const [moved] = draft.flow.splice(from, 1);
        // Deliberately placing a block is a claim on it.
        delete moved.generated;
        draft.flow.splice(clamp(to, 0, draft.flow.length), 0, moved);
      }, { label: 'Reorder content' });
    },

    moveSelectedBlock: (delta) => {
      const ids = currentSelectionIds();
      const { doc } = get();
      if (get().selection.kind !== 'block' || ids.length !== 1) return;
      const index = doc.flow.findIndex((b) => b.id === ids[0]);
      if (index < 0) return;
      get().moveBlock(index, index + delta);
    },

    addOverlay: (kind, page, x, y) => {
      const state = get();
      const target = page ?? state.activePage;
      const laidPage = state.laid.pages[target];
      const overlay = createOverlay(
        kind,
        target,
        x ?? (laidPage ? laidPage.content.x + 24 : 60),
        y ?? (laidPage ? laidPage.content.y + 24 : 60),
      );
      state.edit((draft) => {
        draft.overlays.push(overlay);
      }, { label: 'Add element' });
      set({ selection: { kind: 'overlay', ids: [overlay.id] } });
      return overlay.id;
    },

    /**
     * Dragging a drawn element writes here on every animation frame, so it
     * takes the same structural-sharing path as updateBlock: the flow is passed
     * through untouched and keeps every measurement the engine has cached.
     */
    updateOverlay: (id, patch, options) => {
      const doc = get().doc;
      const index = doc.overlays.findIndex((o) => o.id === id);
      if (index < 0) return;
      const overlays = doc.overlays.slice();
      overlays[index] = { ...overlays[index], ...patch } as Overlay;
      commit({ ...doc, overlays }, options ?? { coalesce: `overlay:${id}` });
    },

    removeOverlay: (id) => {
      get().edit((draft) => {
        draft.overlays = draft.overlays.filter((o) => o.id !== id);
      }, { label: 'Delete element' });
      set({ selection: { kind: 'none' } });
    },

    duplicateOverlayById: (id) => {
      let newId = '';
      get().edit((draft) => {
        const source = draft.overlays.find((o) => o.id === id);
        if (!source) return;
        const copy = cloneOverlay(source);
        newId = copy.id;
        draft.overlays.push(copy);
      }, { label: 'Duplicate element' });
      if (newId) set({ selection: { kind: 'overlay', ids: [newId] } });
    },

    reorderOverlay: (id, action) => {
      get().edit((draft) => {
        const overlay = draft.overlays.find((o) => o.id === id);
        if (!overlay) return;
        const siblings = draft.overlays.filter((o) => o.page === overlay.page);
        const sorted = [...siblings].sort((a, b) => a.z - b.z);
        const index = sorted.findIndex((o) => o.id === id);
        const target =
          action === 'front'
            ? sorted.length - 1
            : action === 'back'
              ? 0
              : clamp(index + (action === 'forward' ? 1 : -1), 0, sorted.length - 1);
        sorted.splice(index, 1);
        sorted.splice(target, 0, overlay);
        sorted.forEach((o, i) => {
          o.z = i;
        });
      }, { label: 'Change stacking' });
    },

    nudgeSelection: (dx, dy) => {
      const { selection } = get();
      if (selection.kind !== 'overlay') return;
      get().edit((draft) => {
        for (const overlay of draft.overlays) {
          if (selection.ids.includes(overlay.id) && !overlay.locked) {
            overlay.x += dx;
            overlay.y += dy;
          }
        }
      }, { coalesce: 'nudge' });
    },

    addPage: (after) => {
      const state = get();
      const index = after ?? state.activePage;
      state.edit((draft) => insertPageOp(draft, state.laid, index), { label: 'Add page' });
      set({ activePage: index + 1 });
    },

    removePage: (index) => {
      const state = get();
      state.edit((draft) => deletePageOp(draft, state.laid, index), { label: 'Delete page' });
      set({ selection: { kind: 'none' } });
    },

    duplicatePageAt: (index) => {
      const state = get();
      state.edit((draft) => duplicatePageOp(draft, state.laid, index), { label: 'Duplicate page' });
      set({ activePage: index + 1 });
    },

    reorderPage: (from, to) => {
      const state = get();
      state.edit((draft) => movePageOp(draft, state.laid, from, to), { label: 'Reorder pages' });
      set({ activePage: to });
    },

    breakBefore: (blockId) => {
      get().edit((draft) => {
        const index = draft.flow.findIndex((b) => b.id === blockId);
        if (index < 0) return;
        return insertPageBreakAt(draft, index);
      }, { label: 'Insert page break' });
    },

    setPageSetup: (patch) => {
      get().edit((draft) => {
        draft.page = { ...draft.page, ...patch };
      }, { label: 'Page setup' });
    },

    setTheme: (patch) => {
      get().edit((draft) => {
        draft.theme = { ...draft.theme, ...patch };
      }, { coalesce: 'theme' });
    },

    /**
     * Restyling replaces the page setup, typography and furniture while the
     * words the teacher wrote come across untouched. Identity and anything
     * placed by hand are preserved, so a restyle is never a fresh start.
     */
    applyTemplate: (templateId, keepContent, variantId) => {
      const { doc } = get();
      get().edit(() => {
        const next = buildFromTemplate(templateId, {
          title: doc.title,
          fields: doc.fields,
          body: keepContent ? carriedContent(doc.flow) : [],
          variant: variantId,
        });
        return { ...next, id: doc.id, createdAt: doc.createdAt, overlays: doc.overlays };
      }, { label: 'Apply template' });
      set({ selection: { kind: 'none' } });
    },

    /**
     * Swapping the body layout rebuilds the flow and nothing else.
     *
     * Restyling replaces a whole design; choosing a different arrangement of
     * the same one must not. The fonts, margins, header and numbering somebody
     * has set are theirs, and going from one CV layout to another is no reason
     * to hand them back the template's defaults.
     */
    applyVariant: (variantId) => {
      const { doc } = get();
      const templateId = doc.templateId;
      if (!templateId || doc.variantId === variantId) return;

      get().edit((draft) => {
        const rebuilt = buildFromTemplate(templateId, {
          title: draft.title,
          fields: draft.fields,
          body: carriedContent(draft.flow),
          variant: variantId,
        });
        return { ...draft, flow: rebuilt.flow, variantId };
      }, { label: 'Body layout' });

      set({ selection: { kind: 'none' } });
    },

    copySelection: () => {
      const { selection, doc } = get();
      if (selection.kind === 'block') {
        set({
          clipboard: {
            blocks: doc.flow.filter((b) => selection.ids.includes(b.id)),
            overlays: [],
          },
        });
      } else if (selection.kind === 'overlay') {
        set({
          clipboard: {
            blocks: [],
            overlays: doc.overlays.filter((o) => selection.ids.includes(o.id)),
          },
        });
      }
    },

    pasteClipboard: () => {
      const { clipboard, activePage } = get();
      if (!clipboard) return;
      if (clipboard.blocks.length) {
        get().insertBlocks(clipboard.blocks.map(cloneBlock));
        return;
      }
      if (clipboard.overlays.length) {
        const copies = clipboard.overlays.map((o) => ({
          ...cloneOverlay(o),
          page: activePage,
        }));
        get().edit((draft) => {
          draft.overlays.push(...copies);
        }, { label: 'Paste' });
        set({ selection: { kind: 'overlay', ids: copies.map((c) => c.id) } });
      }
    },

    /** Paste into an exact slot in the flow, for the in-between insert points. */
    pasteAt: (index) => {
      const { clipboard } = get();
      if (!clipboard) return;
      if (clipboard.blocks.length) {
        get().insertBlocks(clipboard.blocks.map(cloneBlock), index);
        return;
      }
      // Drawn elements have no place in the flow, so they land on the page as usual.
      get().pasteClipboard();
    },

    deleteSelection: () => {
      const { selection } = get();
      if (selection.kind === 'block') {
        get().edit((draft) => {
          draft.flow = draft.flow.filter((b) => !selection.ids.includes(b.id));
        }, { label: 'Delete' });
      } else if (selection.kind === 'overlay') {
        get().edit((draft) => {
          draft.overlays = draft.overlays.filter((o) => !selection.ids.includes(o.id));
        }, { label: 'Delete' });
      }
      set({ selection: { kind: 'none' }, editingId: null });
    },
  };
});

/**
 * Whether this element holds runs the inline editor can put a caret into.
 * Mirrors `runsOf` in InlineTextEditor, which is the thing that has to render.
 */
export function hasEditableText(target: Block | Overlay | null | undefined): boolean {
  if (!target) return false;
  if ('kind' in target) return target.kind === 'text';
  return (
    target.type === 'heading' ||
    target.type === 'paragraph' ||
    target.type === 'question' ||
    target.type === 'section'
  );
}

/** Where a new block should land given the current selection. */
function insertionPoint(doc: PaperDoc, selection: Selection): number {
  if (selection.kind === 'block' && selection.ids.length) {
    const last = selection.ids[selection.ids.length - 1];
    const index = doc.flow.findIndex((b) => b.id === last);
    if (index >= 0) return index + 1;
  }
  return doc.flow.length;
}

/* Handy selectors ---------------------------------------------------- */

export const selectPageRanges = (state: EditorState) => pageRanges(state.doc, state.laid);

export const selectedBlock = (state: EditorState): Block | null => {
  const selection = state.selection;
  if (selection.kind !== 'block' || selection.ids.length !== 1) return null;
  return state.doc.flow.find((b) => b.id === selection.ids[0]) ?? null;
};

export const selectedOverlay = (state: EditorState): Overlay | null => {
  const selection = state.selection;
  if (selection.kind !== 'overlay' || selection.ids.length !== 1) return null;
  return state.doc.overlays.find((o) => o.id === selection.ids[0]) ?? null;
};
