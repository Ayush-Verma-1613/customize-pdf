'use client';

import type { ReactNode } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Award,
  Bold,
  BringToFront,
  CheckSquare,
  Circle,
  Columns2,
  Columns3,
  Copy,
  Download,
  Eye,
  FileStack,
  FileText,
  Grid3x3,
  Hash,
  Heading1,
  Image as ImageIcon,
  Italic,
  Layers,
  LayoutTemplate,
  ListOrdered,
  Lock,
  Magnet,
  Maximize,
  Minus,
  MoveVertical,
  PenLine,
  Pencil,
  Plus,
  Redo2,
  RectangleHorizontal,
  RectangleVertical,
  Rows3,
  Ruler,
  Scan,
  Scissors,
  SendToBack,
  Settings2,
  Slash,
  Square,
  Star,
  Stamp,
  Table2,
  TextCursorInput,
  Trash2,
  Triangle,
  Type,
  Underline,
  Undo2,
  Unlock,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { FONT_FAMILIES, PAGE_SIZES } from '@/lib/model/defaults';
import { activeVariant, TEMPLATES } from '@/lib/templates';
import type {
  Align,
  BlockStyle,
  BlockType,
  Overlay,
  OverlayKind,
  PageSizeName,
} from '@/lib/model/types';
import { hasEditableText, useEditor, type EditorState, type SidePanel } from '@/lib/store/editorStore';
import { clamp } from '@/lib/utils/geom';

/**
 * Every action in the editor, in one searchable list.
 *
 * The panels on the left are a fine way to browse, but browsing only works once
 * you already know which drawer a thing lives in. This catalogue is the other
 * half: it lets somebody who knows *what they want* find it by name, and it is
 * the single definition behind the command palette, the search box in the
 * toolbar and the right-click menu - so a feature added here shows up in all
 * three at once.
 */

export type CommandGroup =
  | 'Insert'
  | 'Format'
  | 'Arrange'
  | 'Page'
  | 'Document'
  | 'Design'
  | 'View'
  | 'File';

/** Services the palette lends to commands that need more than the store. */
export interface CommandHost {
  /** Opens the file picker and places the chosen picture on the page. */
  pickImage: () => void;
  /** Reveals a side panel, for the few settings too big to fit in a menu. */
  openPanel: (panel: SidePanel) => void;
  /** Builds and downloads the PDF. */
  exportPdf: () => void;
  /** Writes the document to the user's computer as a .docraft.json file. */
  saveCopy: () => void;
}

export interface Command {
  id: string;
  label: string;
  group: CommandGroup;
  icon: ReactNode;
  /** Extra words to match on, for people who call it something else. */
  keywords?: string;
  /** Shown greyed at the end of the row: a shortcut, or the current value. */
  hint?: string;
  danger?: boolean;
  /** Hidden when this returns false - used for selection-specific actions. */
  when?: (state: EditorState) => boolean;
  /** True when the command is already in effect, so the row can show a tick. */
  active?: (state: EditorState) => boolean;
  run: (host: CommandHost) => void;
}

const store = () => useEditor.getState();

/* ------------------------------------------------------------------ *
 * Selection helpers
 * ------------------------------------------------------------------ */

const hasSelection = (s: EditorState) =>
  s.selection.kind === 'block' || s.selection.kind === 'overlay';

const oneBlock = (s: EditorState) => s.selection.kind === 'block' && s.selection.ids.length === 1;
const anyOverlay = (s: EditorState) => s.selection.kind === 'overlay';

/** The style record behind whatever is selected, for reading current values. */
function selectionStyle(s: EditorState): BlockStyle | null {
  const selection = s.selection;
  if (selection.kind === 'block') {
    return s.doc.flow.find((b) => b.id === selection.ids[0])?.style ?? {};
  }
  if (selection.kind === 'overlay') {
    const overlay = s.doc.overlays.find((o) => o.id === selection.ids[0]);
    if (overlay && (overlay.kind === 'text' || overlay.kind === 'checkbox')) {
      return overlay.style ?? {};
    }
  }
  return null;
}

/** Whatever is selected can carry text styling. */
const styleable = (s: EditorState) => selectionStyle(s) !== null;

/**
 * Applies a typography patch to every selected element. Blocks and text boxes
 * both style themselves through BlockStyle, so one path covers both.
 */
export function patchSelectionStyle(patch: Partial<BlockStyle>, label = 'Format') {
  const state = store();
  const selection = state.selection;

  if (selection.kind === 'block') {
    for (const id of selection.ids) {
      state.updateBlock(
        id,
        (draft) => {
          draft.style = { ...draft.style, ...patch };
        },
        { label },
      );
    }
    return;
  }

  if (selection.kind === 'overlay') {
    for (const id of selection.ids) {
      const overlay = state.doc.overlays.find((o) => o.id === id);
      if (!overlay || (overlay.kind !== 'text' && overlay.kind !== 'checkbox')) continue;
      state.updateOverlay(
        id,
        { style: { ...overlay.style, ...patch } } as Partial<Overlay>,
        { label },
      );
    }
  }
}

/** Toggles a boolean typography flag against its current value. */
function toggleStyle(key: 'bold' | 'italic' | 'underline') {
  const current = selectionStyle(store()) ?? {};
  patchSelectionStyle({ [key]: !current[key] });
}

/** The point size in force on the selection, falling back to the theme. */
function effectiveSize(s: EditorState): number {
  return selectionStyle(s)?.size ?? s.doc.theme.bodySize;
}

function nudgeSize(delta: number) {
  const state = store();
  patchSelectionStyle({ size: clamp(effectiveSize(state) + delta, 5, 96) }, 'Text size');
}

function placeOverlay(kind: OverlayKind, patch?: Partial<Overlay>) {
  const id = store().addOverlay(kind);
  if (patch) store().updateOverlay(id, patch, { label: 'Add element' });
}

/* ------------------------------------------------------------------ *
 * Insert
 * ------------------------------------------------------------------ */

/** The insertable content blocks, shared with the quick-insert menu. */
export const INSERTABLE: {
  type: BlockType;
  label: string;
  icon: ReactNode;
  keywords: string;
  hint: string;
}[] = [
  {
    type: 'heading',
    label: 'Heading',
    icon: <Heading1 size={16} />,
    keywords: 'title h1 h2 subheading',
    hint: 'Section title',
  },
  {
    type: 'paragraph',
    label: 'Paragraph',
    icon: <AlignLeft size={16} />,
    keywords: 'text body prose write',
    hint: 'Body text',
  },
  {
    type: 'question',
    label: 'Question',
    icon: <TextCursorInput size={16} />,
    keywords: 'numbered marks exam paper q',
    hint: 'Numbered automatically',
  },
  {
    type: 'section',
    label: 'Section',
    icon: <Rows3 size={16} />,
    keywords: 'section a b part group heading',
    hint: 'Section A, B, C',
  },
  {
    type: 'list',
    label: 'List',
    icon: <ListOrdered size={16} />,
    keywords: 'bullet numbered points items',
    hint: 'Bullets or numbers',
  },
  {
    type: 'checklist',
    label: 'Checkboxes',
    icon: <CheckSquare size={16} />,
    keywords: 'tick box todo checklist',
    hint: 'Tick boxes',
  },
  {
    type: 'table',
    label: 'Table',
    icon: <Table2 size={16} />,
    keywords: 'grid rows columns data',
    hint: 'Splits across pages',
  },
  {
    type: 'image',
    label: 'Picture in the flow',
    icon: <ImageIcon size={16} />,
    keywords: 'photo diagram figure picture',
    hint: 'Sits between blocks',
  },
  {
    type: 'answerLines',
    label: 'Answer lines',
    icon: <PenLine size={16} />,
    keywords: 'ruled writing space lines blank',
    hint: 'Ruled space to write in',
  },
  {
    type: 'divider',
    label: 'Divider',
    icon: <Minus size={16} />,
    keywords: 'rule line separator horizontal',
    hint: 'Horizontal rule',
  },
  {
    type: 'spacer',
    label: 'Spacer',
    icon: <MoveVertical size={16} />,
    keywords: 'gap space blank vertical',
    hint: 'Vertical gap',
  },
  {
    type: 'pageBreak',
    label: 'Page break',
    icon: <Scissors size={16} />,
    keywords: 'new page split break',
    hint: 'Start a new page',
  },
];

/** The free-floating things you place by hand, shared with quick insert. */
export const PLACEABLE: {
  id: string;
  label: string;
  icon: ReactNode;
  keywords: string;
  place: () => void;
}[] = [
  {
    id: 'text',
    label: 'Text box',
    icon: <Type size={16} />,
    keywords: 'label caption floating stamp',
    place: () => placeOverlay('text'),
  },
  {
    id: 'image',
    label: 'Picture',
    icon: <ImageIcon size={16} />,
    keywords: 'logo photo crest upload',
    place: () => {},
  },
  {
    id: 'line',
    label: 'Line',
    icon: <Slash size={16} />,
    keywords: 'rule stroke arrow',
    place: () => placeOverlay('line'),
  },
  {
    id: 'rect',
    label: 'Rectangle',
    icon: <Square size={16} />,
    keywords: 'box square shape frame',
    place: () => placeOverlay('shape', { shape: 'rect' } as Partial<Overlay>),
  },
  {
    id: 'ellipse',
    label: 'Ellipse',
    icon: <Circle size={16} />,
    keywords: 'circle oval shape',
    place: () => placeOverlay('shape', { shape: 'ellipse' } as Partial<Overlay>),
  },
  {
    id: 'triangle',
    label: 'Triangle',
    icon: <Triangle size={16} />,
    keywords: 'shape',
    place: () => placeOverlay('shape', { shape: 'triangle' } as Partial<Overlay>),
  },
  {
    id: 'star',
    label: 'Star',
    icon: <Star size={16} />,
    keywords: 'shape award sticker',
    place: () => placeOverlay('shape', { shape: 'star' } as Partial<Overlay>),
  },
  {
    id: 'checkbox',
    label: 'Tick box',
    icon: <CheckSquare size={16} />,
    keywords: 'checkbox tick square',
    place: () => placeOverlay('checkbox'),
  },
  {
    id: 'table',
    label: 'Floating table',
    icon: <Table2 size={16} />,
    keywords: 'grid marks box placed',
    place: () => placeOverlay('table'),
  },
];

function insertCommands(): Command[] {
  const blocks: Command[] = INSERTABLE.map((item) => ({
    id: `insert.${item.type}`,
    label: item.label,
    group: 'Insert',
    icon: item.icon,
    keywords: `add insert ${item.keywords}`,
    hint: item.hint,
    run: () => store().addBlock(item.type),
  }));

  const placed: Command[] = PLACEABLE.filter((item) => item.id !== 'image').map((item) => ({
    id: `place.${item.id}`,
    label: `${item.label} (placed by hand)`,
    group: 'Insert',
    icon: item.icon,
    keywords: `add insert draw floating ${item.keywords}`,
    hint: 'Pinned to this page',
    run: () => item.place(),
  }));

  return [
    ...blocks,
    {
      id: 'insert.image.upload',
      label: 'Picture from my computer',
      group: 'Insert',
      icon: <ImageIcon size={16} />,
      keywords: 'add upload photo logo crest image file',
      hint: 'Pinned to this page',
      run: (host) => host.pickImage(),
    },
    ...placed,
  ];
}

/* ------------------------------------------------------------------ *
 * Format
 * ------------------------------------------------------------------ */

const ALIGNMENTS: { value: Align; label: string; icon: ReactNode }[] = [
  { value: 'left', label: 'Align left', icon: <AlignLeft size={16} /> },
  { value: 'center', label: 'Centre', icon: <AlignCenter size={16} /> },
  { value: 'right', label: 'Align right', icon: <AlignRight size={16} /> },
  { value: 'justify', label: 'Justify', icon: <AlignJustify size={16} /> },
];

function formatCommands(): Command[] {
  return [
    {
      id: 'format.bold',
      label: 'Bold',
      group: 'Format',
      icon: <Bold size={16} />,
      keywords: 'strong heavy weight',
      hint: '⌘B',
      when: styleable,
      active: (s) => !!selectionStyle(s)?.bold,
      run: () => toggleStyle('bold'),
    },
    {
      id: 'format.italic',
      label: 'Italic',
      group: 'Format',
      icon: <Italic size={16} />,
      keywords: 'slant oblique emphasis',
      hint: '⌘I',
      when: styleable,
      active: (s) => !!selectionStyle(s)?.italic,
      run: () => toggleStyle('italic'),
    },
    {
      id: 'format.underline',
      label: 'Underline',
      group: 'Format',
      icon: <Underline size={16} />,
      keywords: 'line under',
      hint: '⌘U',
      when: styleable,
      active: (s) => !!selectionStyle(s)?.underline,
      run: () => toggleStyle('underline'),
    },
    ...ALIGNMENTS.map(
      (a): Command => ({
        id: `format.align.${a.value}`,
        label: a.label,
        group: 'Format',
        icon: a.icon,
        keywords: `alignment ${a.value} text position`,
        when: styleable,
        active: (s) => selectionStyle(s)?.align === a.value,
        run: () => patchSelectionStyle({ align: a.value }, 'Alignment'),
      }),
    ),
    {
      id: 'format.bigger',
      label: 'Bigger text',
      group: 'Format',
      icon: <Plus size={16} />,
      keywords: 'font size increase larger grow',
      when: styleable,
      run: () => nudgeSize(1),
    },
    {
      id: 'format.smaller',
      label: 'Smaller text',
      group: 'Format',
      icon: <Minus size={16} />,
      keywords: 'font size decrease shrink',
      when: styleable,
      run: () => nudgeSize(-1),
    },
    {
      id: 'format.clear',
      label: 'Clear formatting',
      group: 'Format',
      icon: <Undo2 size={16} />,
      keywords: 'reset default plain remove style theme',
      when: styleable,
      run: () =>
        patchSelectionStyle(
          {
            bold: undefined,
            italic: undefined,
            underline: undefined,
            size: undefined,
            family: undefined,
            color: undefined,
            align: undefined,
            background: undefined,
          },
          'Clear formatting',
        ),
    },
  ];
}

/* ------------------------------------------------------------------ *
 * Arrange
 * ------------------------------------------------------------------ */

function arrangeCommands(): Command[] {
  const selectedId = (s: EditorState) =>
    s.selection.kind === 'block' || s.selection.kind === 'overlay' ? s.selection.ids[0] : null;

  return [
    {
      id: 'arrange.edit',
      label: 'Edit this text',
      group: 'Arrange',
      icon: <Pencil size={16} />,
      keywords: 'type write change words',
      hint: 'Enter',
      when: (s) => {
        const id = selectedId(s);
        if (!id) return false;
        return hasEditableText(
          s.doc.flow.find((b) => b.id === id) ?? s.doc.overlays.find((o) => o.id === id),
        );
      },
      run: () => {
        const id = selectedId(store());
        if (id) store().beginEditing(id);
      },
    },
    {
      id: 'arrange.up',
      label: 'Move up',
      group: 'Arrange',
      icon: <ArrowUp size={16} />,
      keywords: 'reorder earlier before raise',
      when: oneBlock,
      run: () => store().moveSelectedBlock(-1),
    },
    {
      id: 'arrange.down',
      label: 'Move down',
      group: 'Arrange',
      icon: <ArrowDown size={16} />,
      keywords: 'reorder later after lower',
      when: oneBlock,
      run: () => store().moveSelectedBlock(1),
    },
    {
      id: 'arrange.break',
      label: 'Start a new page here',
      group: 'Arrange',
      icon: <Scissors size={16} />,
      keywords: 'page break split before push',
      when: oneBlock,
      run: () => {
        const id = selectedId(store());
        if (id) store().breakBefore(id);
      },
    },
    {
      id: 'arrange.front',
      label: 'Bring to front',
      group: 'Arrange',
      icon: <BringToFront size={16} />,
      keywords: 'stack order above top layer',
      when: anyOverlay,
      run: () => {
        const id = selectedId(store());
        if (id) store().reorderOverlay(id, 'front');
      },
    },
    {
      id: 'arrange.back',
      label: 'Send to back',
      group: 'Arrange',
      icon: <SendToBack size={16} />,
      keywords: 'stack order below bottom layer behind',
      when: anyOverlay,
      run: () => {
        const id = selectedId(store());
        if (id) store().reorderOverlay(id, 'back');
      },
    },
    {
      id: 'arrange.lock',
      label: 'Lock in place',
      group: 'Arrange',
      icon: <Lock size={16} />,
      keywords: 'freeze pin protect stop moving',
      when: (s) => anyOverlay(s) && !isLocked(s),
      run: () => {
        const id = selectedId(store());
        if (id) store().updateOverlay(id, { locked: true }, { label: 'Lock' });
      },
    },
    {
      id: 'arrange.unlock',
      label: 'Unlock',
      group: 'Arrange',
      icon: <Unlock size={16} />,
      keywords: 'unfreeze release move again',
      when: (s) => anyOverlay(s) && isLocked(s),
      run: () => {
        const id = selectedId(store());
        if (id) store().updateOverlay(id, { locked: false }, { label: 'Unlock' });
      },
    },
    {
      id: 'arrange.duplicate',
      label: 'Duplicate',
      group: 'Arrange',
      icon: <Copy size={16} />,
      keywords: 'copy clone repeat again',
      hint: '⌘D',
      when: hasSelection,
      run: () => {
        const state = store();
        const selection = state.selection;
        if (selection.kind === 'block') selection.ids.forEach(state.duplicateBlockById);
        if (selection.kind === 'overlay') selection.ids.forEach(state.duplicateOverlayById);
      },
    },
    {
      id: 'arrange.delete',
      label: 'Delete',
      group: 'Arrange',
      icon: <Trash2 size={16} />,
      keywords: 'remove erase get rid',
      hint: 'Del',
      danger: true,
      when: hasSelection,
      run: () => store().deleteSelection(),
    },
    {
      id: 'edit.undo',
      label: 'Undo',
      group: 'Arrange',
      icon: <Undo2 size={16} />,
      keywords: 'back mistake revert step',
      hint: '⌘Z',
      when: (s) => s.past.length > 0,
      run: () => store().undo(),
    },
    {
      id: 'edit.redo',
      label: 'Redo',
      group: 'Arrange',
      icon: <Redo2 size={16} />,
      keywords: 'forward again repeat',
      hint: '⌘⇧Z',
      when: (s) => s.future.length > 0,
      run: () => store().redo(),
    },
  ];
}

function isLocked(s: EditorState): boolean {
  const selection = s.selection;
  if (selection.kind !== 'overlay') return false;
  return !!s.doc.overlays.find((o) => o.id === selection.ids[0])?.locked;
}

/* ------------------------------------------------------------------ *
 * Page
 * ------------------------------------------------------------------ */

function pageCommands(): Command[] {
  const sizes = (Object.keys(PAGE_SIZES) as Exclude<PageSizeName, 'Custom'>[]).map(
    (size): Command => ({
      id: `page.size.${size}`,
      label: `Page size: ${size}`,
      group: 'Page',
      icon: <FileText size={16} />,
      keywords: `paper ${PAGE_SIZES[size].label.toLowerCase()} dimensions`,
      hint: PAGE_SIZES[size].label.replace(/^\S+\s+/, ''),
      active: (s) => s.doc.page.size === size,
      run: () =>
        store().setPageSetup({
          size,
          width: PAGE_SIZES[size].width,
          height: PAGE_SIZES[size].height,
        }),
    }),
  );

  const margins: { label: string; value: number; keywords: string }[] = [
    { label: 'Narrow margins', value: 24, keywords: 'tight small edge more room' },
    { label: 'Normal margins', value: 48, keywords: 'default standard' },
    { label: 'Wide margins', value: 72, keywords: 'roomy generous large' },
  ];

  return [
    ...sizes,
    {
      id: 'page.portrait',
      label: 'Portrait',
      group: 'Page',
      icon: <RectangleVertical size={16} />,
      keywords: 'orientation upright tall vertical',
      active: (s) => s.doc.page.orientation === 'portrait',
      run: () => store().setPageSetup({ orientation: 'portrait' }),
    },
    {
      id: 'page.landscape',
      label: 'Landscape',
      group: 'Page',
      icon: <RectangleHorizontal size={16} />,
      keywords: 'orientation sideways wide horizontal',
      active: (s) => s.doc.page.orientation === 'landscape',
      run: () => store().setPageSetup({ orientation: 'landscape' }),
    },
    ...margins.map(
      (m): Command => ({
        id: `page.margins.${m.value}`,
        label: m.label,
        group: 'Page',
        icon: <Ruler size={16} />,
        keywords: `margin padding border space ${m.keywords}`,
        hint: `${Math.round(m.value * (25.4 / 72))} mm`,
        active: (s) => s.doc.page.margins.top === m.value,
        run: () =>
          store().setPageSetup({
            margins: { top: m.value, right: m.value, bottom: m.value, left: m.value },
          }),
      }),
    ),
    {
      id: 'page.columns.1',
      label: 'One column',
      group: 'Page',
      icon: <FileText size={16} />,
      keywords: 'single column layout',
      active: (s) => s.doc.page.columns === 1,
      run: () => store().setPageSetup({ columns: 1 }),
    },
    {
      id: 'page.columns.2',
      label: 'Two columns',
      group: 'Page',
      icon: <Columns2 size={16} />,
      keywords: 'double column newspaper split',
      active: (s) => s.doc.page.columns === 2,
      run: () => store().setPageSetup({ columns: 2 }),
    },
    {
      id: 'page.columns.3',
      label: 'Three columns',
      group: 'Page',
      icon: <Columns3 size={16} />,
      keywords: 'triple column split',
      active: (s) => s.doc.page.columns === 3,
      run: () => store().setPageSetup({ columns: 3 }),
    },
    {
      id: 'page.border',
      label: 'Border around the page',
      group: 'Page',
      icon: <Square size={16} />,
      keywords: 'frame outline edge decorative',
      active: (s) => !!s.doc.page.border,
      run: () =>
        store().setPageSetup({
          border: store().doc.page.border
            ? undefined
            : { color: '#374151', width: 0.9, inset: 24, style: 'solid', radius: 2 },
        }),
    },
    {
      id: 'page.add',
      label: 'Add a page',
      group: 'Page',
      icon: <Plus size={16} />,
      keywords: 'new blank extra insert page',
      run: () => store().addPage(store().activePage),
    },
    {
      id: 'page.duplicate',
      label: 'Duplicate this page',
      group: 'Page',
      icon: <FileStack size={16} />,
      keywords: 'copy clone repeat page',
      run: () => store().duplicatePageAt(store().activePage),
    },
    {
      id: 'page.delete',
      label: 'Delete this page',
      group: 'Page',
      icon: <Trash2 size={16} />,
      keywords: 'remove page erase',
      danger: true,
      when: (s) => s.laid.pages.length > 1,
      run: () => store().removePage(store().activePage),
    },
  ];
}

/* ------------------------------------------------------------------ *
 * Document furniture and typography
 * ------------------------------------------------------------------ */

/** Whether the footer is currently printing "Page 1 of 2" or similar. */
const hasPageNumber = (s: EditorState) =>
  s.doc.master.footer.enabled &&
  s.doc.master.footer.slots.center.some((run) => run.text.includes('{{page}}'));

function documentCommands(): Command[] {
  const fonts = FONT_FAMILIES.map(
    (font): Command => ({
      id: `design.font.${font.id}`,
      label: `Body font: ${font.label}`,
      group: 'Design',
      icon: <Type size={16} />,
      keywords: `typeface family ${font.hint.toLowerCase()} ${font.label.toLowerCase()}`,
      hint: font.hint,
      active: (s) => s.doc.theme.bodyFamily === font.id,
      run: () => store().setTheme({ bodyFamily: font.id }),
    }),
  );

  const headingFonts = FONT_FAMILIES.map(
    (font): Command => ({
      id: `design.headingFont.${font.id}`,
      label: `Heading font: ${font.label}`,
      group: 'Design',
      icon: <Heading1 size={16} />,
      keywords: `typeface family titles ${font.hint.toLowerCase()} ${font.label.toLowerCase()}`,
      hint: font.hint,
      active: (s) => s.doc.theme.headingFamily === font.id,
      run: () => store().setTheme({ headingFamily: font.id }),
    }),
  );

  return [
    {
      id: 'doc.header',
      label: 'Header on every page',
      group: 'Document',
      icon: <Layers size={16} />,
      keywords: 'running head top masthead repeat',
      active: (s) => s.doc.master.header.enabled,
      run: (host) => {
        store().edit(
          (draft) => {
            draft.master.header.enabled = !draft.master.header.enabled;
          },
          { label: 'Header' },
        );
        if (store().doc.master.header.enabled) host.openPanel('document');
      },
    },
    {
      id: 'doc.footer',
      label: 'Footer on every page',
      group: 'Document',
      icon: <Layers size={16} />,
      keywords: 'running foot bottom page number repeat',
      active: (s) => s.doc.master.footer.enabled,
      run: (host) => {
        store().edit(
          (draft) => {
            draft.master.footer.enabled = !draft.master.footer.enabled;
          },
          { label: 'Footer' },
        );
        if (store().doc.master.footer.enabled) host.openPanel('document');
      },
    },
    {
      id: 'doc.watermark',
      label: 'Watermark',
      group: 'Document',
      icon: <Stamp size={16} />,
      keywords: 'draft specimen sample confidential background diagonal',
      active: (s) => s.doc.master.watermark.enabled,
      run: (host) => {
        store().edit(
          (draft) => {
            draft.master.watermark.enabled = !draft.master.watermark.enabled;
          },
          { label: 'Watermark' },
        );
        if (store().doc.master.watermark.enabled) host.openPanel('document');
      },
    },
    {
      id: 'doc.pageNumber',
      label: 'Page number at the bottom',
      group: 'Document',
      icon: <Hash size={16} />,
      keywords: 'page 1 of 1 number footer bottom remove hide delete numbering',
      active: hasPageNumber,
      run: () =>
        store().edit(
          (draft) => {
            const footer = draft.master.footer;
            if (hasPageNumber({ doc: draft } as EditorState)) {
              footer.slots.center = [];
              // An empty footer is just a band of nothing; take it away too.
              if (!footer.slots.left.length && !footer.slots.right.length) {
                footer.enabled = false;
              }
            } else {
              footer.enabled = true;
              footer.slots.center = [{ text: 'Page {{page}} of {{pages}}' }];
            }
          },
          { label: 'Page number' },
        ),
    },
    {
      id: 'doc.marks',
      label: 'Show marks beside questions',
      group: 'Document',
      icon: <Award size={16} />,
      keywords: 'marks score points total grading',
      active: (s) => s.doc.numbering.showMarks,
      run: () =>
        store().edit(
          (draft) => {
            draft.numbering.showMarks = !draft.numbering.showMarks;
          },
          { label: 'Marks' },
        ),
    },
    {
      id: 'doc.restart',
      label: 'Restart numbering in each section',
      group: 'Document',
      icon: <ListOrdered size={16} />,
      keywords: 'question numbers restart section count from one',
      active: (s) => s.doc.numbering.restartEachSection,
      run: () =>
        store().edit(
          (draft) => {
            draft.numbering.restartEachSection = !draft.numbering.restartEachSection;
          },
          { label: 'Numbering' },
        ),
    },
    {
      id: 'design.bigger',
      label: 'Bigger text everywhere',
      group: 'Design',
      icon: <Plus size={16} />,
      keywords: 'font size document whole increase readable',
      hint: 'Whole document',
      run: () => store().setTheme({ bodySize: clamp(store().doc.theme.bodySize + 0.5, 6, 36) }),
    },
    {
      id: 'design.smaller',
      label: 'Smaller text everywhere',
      group: 'Design',
      icon: <Minus size={16} />,
      keywords: 'font size document whole decrease fit more',
      hint: 'Whole document',
      run: () => store().setTheme({ bodySize: clamp(store().doc.theme.bodySize - 0.5, 6, 36) }),
    },
    {
      id: 'design.looser',
      label: 'More space between lines',
      group: 'Design',
      icon: <MoveVertical size={16} />,
      keywords: 'line height leading spacing airy loose',
      run: () => store().setTheme({ lineHeight: clamp(store().doc.theme.lineHeight + 0.1, 0.9, 3) }),
    },
    {
      id: 'design.tighter',
      label: 'Less space between lines',
      group: 'Design',
      icon: <MoveVertical size={16} />,
      keywords: 'line height leading spacing tight compact fit',
      run: () => store().setTheme({ lineHeight: clamp(store().doc.theme.lineHeight - 0.1, 0.9, 3) }),
    },
    ...fonts,
    ...headingFonts,
    {
      id: 'doc.settings',
      label: 'All document settings',
      group: 'Document',
      icon: <Settings2 size={16} />,
      keywords: 'panel options preferences everything more',
      run: (host) => host.openPanel('document'),
    },
  ];
}

/* ------------------------------------------------------------------ *
 * Templates
 * ------------------------------------------------------------------ */

function templateCommands(): Command[] {
  const out: Command[] = [];

  for (const template of TEMPLATES) {
    out.push({
      id: `template.${template.id}`,
      label: `Restyle as ${template.name}`,
      group: 'Design',
      icon: <Layers size={16} />,
      keywords: `template design layout ${template.category.toLowerCase()} ${template.description.toLowerCase()}`,
      hint: 'Keeps your content',
      active: (s) => s.doc.templateId === template.id,
      run: () => store().applyTemplate(template.id, true),
    });

    // A body layout only means something while its own template is in use.
    for (const variant of template.variants ?? []) {
      out.push({
        id: `template.${template.id}.${variant.id}`,
        label: `Body layout: ${variant.name}`,
        group: 'Design',
        icon: <LayoutTemplate size={16} />,
        keywords: `body layout variant arrangement ${template.name.toLowerCase()} ${variant.description.toLowerCase()}`,
        hint: 'Keeps your content',
        when: (s) => s.doc.templateId === template.id,
        active: (s) => activeVariant(s.doc) === variant.id,
        run: () => store().applyVariant(variant.id),
      });
    }
  }

  return out;
}

/* ------------------------------------------------------------------ *
 * View and file
 * ------------------------------------------------------------------ */

function viewCommands(): Command[] {
  return [
    {
      id: 'view.preview',
      label: 'Preview - hide the editing marks',
      group: 'View',
      icon: <Eye size={16} />,
      keywords: 'clean print look final check proof',
      active: (s) => s.mode === 'preview',
      run: () => store().setMode(store().mode === 'preview' ? 'design' : 'preview'),
    },
    {
      id: 'view.grid',
      label: 'Show the grid',
      group: 'View',
      icon: <Grid3x3 size={16} />,
      keywords: 'guides squares align ruler',
      active: (s) => s.showGrid,
      run: () => store().toggleGrid(),
    },
    {
      id: 'view.snap',
      label: 'Snap to guides',
      group: 'View',
      icon: <Magnet size={16} />,
      keywords: 'align magnet stick guides',
      active: (s) => s.snapEnabled,
      run: () => store().toggleSnap(),
    },
    {
      id: 'view.fitWidth',
      label: 'Fit the page width',
      group: 'View',
      icon: <Maximize size={16} />,
      keywords: 'zoom fit width fill',
      run: () => store().setZoom(store().zoom, 'width'),
    },
    {
      id: 'view.fitPage',
      label: 'Fit the whole page',
      group: 'View',
      icon: <Scan size={16} />,
      keywords: 'zoom fit page whole see all',
      run: () => store().setZoom(store().zoom, 'page'),
    },
    {
      id: 'view.zoomIn',
      label: 'Zoom in',
      group: 'View',
      icon: <ZoomIn size={16} />,
      keywords: 'bigger closer magnify',
      run: () => store().setZoom(store().zoom * 1.25, 'manual'),
    },
    {
      id: 'view.zoomOut',
      label: 'Zoom out',
      group: 'View',
      icon: <ZoomOut size={16} />,
      keywords: 'smaller further away',
      run: () => store().setZoom(store().zoom / 1.25, 'manual'),
    },
  ];
}

function fileCommands(): Command[] {
  return [
    {
      id: 'file.export',
      label: 'Export as PDF',
      group: 'File',
      icon: <Download size={16} />,
      keywords: 'download print save pdf share send finish',
      run: (host) => host.exportPdf(),
    },
    {
      id: 'file.save',
      label: 'Save a copy to my computer',
      group: 'File',
      icon: <FileText size={16} />,
      keywords: 'download backup json file export editable',
      run: (host) => host.saveCopy(),
    },
    {
      id: 'file.content',
      label: 'Paste in content',
      group: 'File',
      icon: <TextCursorInput size={16} />,
      keywords: 'import type text questions word bulk paste',
      run: (host) => host.openPanel('content'),
    },
    {
      id: 'file.pages',
      label: 'All pages',
      group: 'File',
      icon: <FileStack size={16} />,
      keywords: 'thumbnails reorder overview navigate',
      run: (host) => host.openPanel('pages'),
    },
    {
      id: 'file.templates',
      label: 'Browse templates',
      group: 'File',
      icon: <Layers size={16} />,
      keywords: 'design restyle look change template gallery',
      run: (host) => host.openPanel('templates'),
    },
  ];
}

/* ------------------------------------------------------------------ *
 * The catalogue
 * ------------------------------------------------------------------ */

const ALL: Command[] = [
  ...insertCommands(),
  ...formatCommands(),
  ...arrangeCommands(),
  ...pageCommands(),
  ...documentCommands(),
  ...templateCommands(),
  ...viewCommands(),
  ...fileCommands(),
];

/** Every command that makes sense for the document as it stands right now. */
export function availableCommands(state: EditorState): Command[] {
  return ALL.filter((command) => !command.when || command.when(state));
}

/** The commands that act on the current selection, for the right-click menu. */
export function selectionCommands(state: EditorState): Command[] {
  if (!hasSelection(state)) return [];
  const wanted = [
    'arrange.edit',
    'format.bold',
    'format.italic',
    'arrange.up',
    'arrange.down',
    'arrange.front',
    'arrange.back',
    'arrange.break',
    'arrange.lock',
    'arrange.unlock',
    'arrange.duplicate',
    'arrange.delete',
  ];
  const available = availableCommands(state);
  return wanted
    .map((id) => available.find((command) => command.id === id))
    .filter((command): command is Command => !!command);
}

/* ------------------------------------------------------------------ *
 * Search
 * ------------------------------------------------------------------ */

/**
 * Nobody reaches for the accent key when they are searching, so "resume" has to
 * find "Résumé" and "cafe" has to find "Café".
 */
const plain = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/**
 * Subsequence matching, so "pgbrk" still finds "Page break". Scores prefer a
 * match on the label over one buried in the keywords, and an earlier match over
 * a later one, which keeps the obvious answer at the top.
 */
function score(command: Command, query: string): number {
  const label = plain(command.label);
  const haystack = `${label} ${plain(command.group)} ${plain(command.keywords ?? '')}`;

  if (label.startsWith(query)) return 1000 - label.length;
  const direct = label.indexOf(query);
  if (direct >= 0) return 800 - direct * 4 - label.length / 10;
  const inKeywords = haystack.indexOf(query);
  if (inKeywords >= 0) return 500 - inKeywords / 8;

  // Fall back to letters in order, anywhere in the label.
  let cursor = 0;
  for (const char of query) {
    const next = label.indexOf(char, cursor);
    if (next < 0) return -1;
    cursor = next + 1;
  }
  return 200 - cursor;
}

export function searchCommands(state: EditorState, query: string): Command[] {
  const available = availableCommands(state);
  const trimmed = plain(query.trim());
  if (!trimmed) return available;

  return available
    .map((command) => ({ command, rank: score(command, trimmed) }))
    .filter((entry) => entry.rank >= 0)
    .sort((a, b) => b.rank - a.rank)
    .map((entry) => entry.command);
}

export const GROUP_ORDER: CommandGroup[] = [
  'Arrange',
  'Format',
  'Insert',
  'Page',
  'Design',
  'Document',
  'View',
  'File',
];
