import { uid } from '@/lib/utils/id';
import {
  defaultMaster,
  defaultNumbering,
  defaultPageSetup,
  defaultTheme,
} from './defaults';
import type {
  Block,
  BlockType,
  BoxBorder,
  Margins,
  Overlay,
  OverlayKind,
  PaperDoc,
  Run,
  TableBlock,
  TableCell,
  TableRow,
} from './types';
import { SCHEMA_VERSION } from './types';

export const text = (s: string, extra: Partial<Run> = {}): Run[] => [{ text: s, ...extra }];

export const runsToPlain = (runs: Run[] | undefined): string =>
  (runs ?? []).map((r) => r.text).join('');

export const pad = (v: number): Margins => ({ top: v, right: v, bottom: v, left: v });

export const thinBorder = (color = '#111827', width = 0.75): BoxBorder => ({
  color,
  width,
  style: 'solid',
});

export function makeCell(content: string | Run[], extra: Partial<TableCell> = {}): TableCell {
  return {
    id: uid('c'),
    runs: typeof content === 'string' ? text(content) : content,
    ...extra,
  };
}

export function makeRow(cells: (string | Run[] | TableCell)[], extra: Partial<TableRow> = {}): TableRow {
  return {
    id: uid('r'),
    cells: cells.map((c) =>
      c && typeof c === 'object' && 'id' in c ? (c as TableCell) : makeCell(c as string | Run[]),
    ),
    ...extra,
  };
}

export function makeTable(
  columns: number[],
  rows: TableRow[],
  extra: Partial<Omit<TableBlock, 'id' | 'type' | 'columns' | 'rows'>> = {},
): TableBlock {
  return {
    id: uid('t'),
    type: 'table',
    columns,
    rows,
    border: thinBorder(),
    innerBorder: thinBorder('#374151', 0.5),
    repeatHeader: true,
    cellPadding: { top: 4, right: 6, bottom: 4, left: 6 },
    widthFactor: 1,
    ...extra,
  };
}

/** A sensible starting block for each type, used by the "add element" palette. */
export function createBlock(type: BlockType): Block {
  const id = uid('b');
  switch (type) {
    case 'heading':
      return { id, type: 'heading', level: 2, runs: text('Heading') };
    case 'paragraph':
      return { id, type: 'paragraph', runs: text('Type your paragraph here.') };
    case 'section':
      return {
        id,
        type: 'section',
        runs: text('Section A'),
        instructions: text('All questions in this section are compulsory.'),
        restartNumbering: false,
        rule: true,
      };
    case 'question':
      return { id, type: 'question', runs: text('Write your question here.'), marks: 1 };
    case 'list':
      return {
        id,
        type: 'list',
        variant: 'bullet',
        items: [text('First item'), text('Second item'), text('Third item')],
      };
    case 'checklist':
      return {
        id,
        type: 'checklist',
        items: [
          { runs: text('First option') },
          { runs: text('Second option') },
        ],
        columns: 1,
      };
    case 'image':
      return { id, type: 'image', src: '', fit: 'contain', width: 220 };
    case 'divider':
      return { id, type: 'divider', thickness: 0.75, color: '#9ca3af', dash: 'solid', width: 1 };
    case 'spacer':
      return { id, type: 'spacer', height: 18 };
    case 'answerLines':
      return { id, type: 'answerLines', count: 4, gap: 22, color: '#cbd5e1', dash: 'solid' };
    case 'pageBreak':
      return { id, type: 'pageBreak' };
    case 'table':
      return {
        ...makeTable(
          [1, 1, 1],
          [
            makeRow(['Column 1', 'Column 2', 'Column 3'], { isHeader: true }),
            makeRow(['', '', '']),
            makeRow(['', '', '']),
          ],
        ),
        id,
      };
  }
}

export function createOverlay(kind: OverlayKind, page: number, x: number, y: number): Overlay {
  const base = {
    id: uid('o'),
    page,
    x,
    y,
    rotation: 0,
    opacity: 1,
    locked: false,
    z: Date.now() % 100000,
  };
  switch (kind) {
    case 'text':
      return {
        ...base,
        kind: 'text',
        width: 200,
        height: 40,
        runs: text('Text'),
        style: { size: 12, align: 'left' },
        vAlign: 'top',
        autoHeight: true,
      };
    case 'image':
      return { ...base, kind: 'image', width: 180, height: 120, src: '', fit: 'contain', radius: 0 };
    case 'shape':
      return {
        ...base,
        kind: 'shape',
        width: 140,
        height: 100,
        shape: 'rect',
        fill: '#e0e7ff',
        stroke: '#4f46e5',
        strokeWidth: 1,
        radius: 6,
        dash: 'solid',
      };
    case 'line':
      return {
        ...base,
        kind: 'line',
        width: 180,
        height: 0,
        stroke: '#111827',
        strokeWidth: 1,
        dash: 'solid',
      };
    case 'checkbox':
      return {
        ...base,
        kind: 'checkbox',
        width: 120,
        height: 16,
        checked: false,
        stroke: '#111827',
        label: text('Option'),
        style: { size: 11 },
      };
    case 'table': {
      const t = makeTable(
        [1, 1],
        [makeRow(['Header 1', 'Header 2'], { isHeader: true }), makeRow(['', ''])],
      );
      const { id: _id, type: _type, ...rest } = t;
      void _id;
      void _type;
      return { ...base, kind: 'table', width: 260, height: 70, table: rest };
    }
  }
}

export function createDocument(title = 'Untitled document', flow: Block[] = []): PaperDoc {
  const now = new Date().toISOString();
  return {
    id: uid('doc'),
    title,
    page: defaultPageSetup(),
    theme: defaultTheme(),
    numbering: defaultNumbering(),
    master: defaultMaster(),
    flow,
    overlays: [],
    fields: {},
    createdAt: now,
    updatedAt: now,
    schema: SCHEMA_VERSION,
  };
}

/** Deep clone that also re-keys every id, used by duplicate actions. */
export function cloneBlock(block: Block): Block {
  const copy = structuredClone(block) as Block;
  copy.id = uid('b');
  if (copy.type === 'table') {
    copy.rows = copy.rows.map((r) => ({
      ...r,
      id: uid('r'),
      cells: r.cells.map((c) => ({ ...c, id: uid('c') })),
    }));
  }
  if (copy.type === 'question' && copy.parts) {
    copy.parts = copy.parts.map((p) => ({ ...p, id: uid('p') }));
  }
  return copy;
}

export function cloneOverlay(overlay: Overlay, offset = 12): Overlay {
  const copy = structuredClone(overlay) as Overlay;
  copy.id = uid('o');
  copy.x += offset;
  copy.y += offset;
  copy.z = overlay.z + 1;
  if (copy.kind === 'table') {
    copy.table.rows = copy.table.rows.map((r) => ({
      ...r,
      id: uid('r'),
      cells: r.cells.map((c) => ({ ...c, id: uid('c') })),
    }));
  }
  return copy;
}
