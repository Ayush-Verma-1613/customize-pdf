import { makeRow, makeTable, pad, text } from '@/lib/model/factory';
import type {
  Block,
  BlockStyle,
  FontFamily,
  PaperDoc,
  Run,
  TableBlock,
} from '@/lib/model/types';
import { uid } from '@/lib/utils/id';

/** Small builders shared by every template, so they stay visually consistent. */

export const heading = (
  value: string | Run[],
  level: 1 | 2 | 3 | 4 = 2,
  style?: BlockStyle,
): Block => ({
  id: uid('b'),
  type: 'heading',
  level,
  runs: typeof value === 'string' ? text(value) : value,
  style,
});

export const para = (value: string | Run[], style?: BlockStyle): Block => ({
  id: uid('b'),
  type: 'paragraph',
  runs: typeof value === 'string' ? text(value) : value,
  style,
});

export const divider = (color = '#9ca3af', thickness = 0.75, style?: BlockStyle): Block => ({
  id: uid('b'),
  type: 'divider',
  thickness,
  color,
  dash: 'solid',
  width: 1,
  style,
});

export const spacer = (height: number): Block => ({ id: uid('b'), type: 'spacer', height });

export const section = (title: string, instructions?: string): Block => ({
  id: uid('b'),
  type: 'section',
  runs: text(title),
  instructions: instructions ? text(instructions) : undefined,
  rule: true,
});

export const bullets = (items: string[], style?: BlockStyle): Block => ({
  id: uid('b'),
  type: 'list',
  variant: 'bullet',
  items: items.map((i) => text(i)),
  style,
});

export const numbered = (items: string[], style?: BlockStyle): Block => ({
  id: uid('b'),
  type: 'list',
  variant: 'number',
  items: items.map((i) => text(i)),
  style,
});

export const answerLines = (count: number): Block => ({
  id: uid('b'),
  type: 'answerLines',
  count,
  gap: 24,
  color: '#cbd5e1',
  dash: 'solid',
});

/** A borderless two-column strip, used for "Subject: ... | Time: ..." rows. */
export function infoStrip(
  rows: [string, string][],
  opts: { bold?: boolean; size?: number } = {},
): TableBlock {
  const table = makeTable(
    [1, 1],
    rows.map(([left, right]) =>
      makeRow([
        text(left, { bold: opts.bold }),
        text(right, { bold: opts.bold }),
      ]),
    ),
    {
      border: { color: 'transparent', width: 0, style: 'solid' },
      innerBorder: null,
      cellPadding: { top: 1.5, right: 0, bottom: 1.5, left: 0 },
      repeatHeader: false,
    },
  );
  table.rows.forEach((r) => {
    r.cells[1].align = 'right';
  });
  if (opts.size) table.style = { size: opts.size };
  return table;
}

/** Labelled blanks such as "Name: ______  Roll No: ______  Date: ______". */
export function fillInStrip(labels: string[]): TableBlock {
  const table = makeTable(
    labels.map(() => 1),
    [makeRow(labels.map((l) => text(`${l}: ${'_'.repeat(14)}`)))],
    {
      border: { color: 'transparent', width: 0, style: 'solid' },
      innerBorder: null,
      cellPadding: { top: 4, right: 4, bottom: 4, left: 0 },
      repeatHeader: false,
    },
  );
  return table;
}

export function boxedNote(title: string, items: string[]): Block[] {
  return [
    para(text(title, { bold: true }), { spaceBefore: 4, spaceAfter: 2, size: 10.5 }),
    {
      id: uid('b'),
      type: 'list',
      variant: 'number',
      items: items.map((i) => text(i)),
      style: {
        size: 10,
        lineHeight: 1.35,
        border: { color: '#cbd5e1', width: 0.75, style: 'solid', radius: 3 },
        padding: pad(8),
        spaceAfter: 10,
      },
    },
  ];
}

export interface TemplateField {
  key: string;
  label: string;
  placeholder?: string;
  default?: string;
  multiline?: boolean;
  /** Turns the field into a picker. Free text when omitted. */
  options?: string[];
}

export interface TemplateInput {
  title: string;
  fields: Record<string, string>;
  /** Blocks parsed from the teacher's pasted content, inserted into the body. */
  body: Block[];
  /** Which of the template's body layouts to build. Defaults to the first. */
  variant?: string;
}

/**
 * One of the body layouts a template can build.
 *
 * The masthead, page setup and typography are the template; the arrangement of
 * the body underneath is a variant. Splitting them means somebody can try a
 * different layout for the same document without starting again.
 */
export interface TemplateVariant {
  id: string;
  name: string;
  description: string;
  /** Two-line sketch drawn on the variant chip. */
  preview: string[];
}

export interface TemplateDef {
  id: string;
  name: string;
  category: 'Teaching' | 'School admin' | 'Business' | 'Personal';
  description: string;
  /** Two-line preview drawn on the template card. */
  preview: string[];
  /** Short tagline on the card, saying what this one is for. */
  badge: string;
  accent: string;
  fields: TemplateField[];
  /** Whether pasted content is merged into the template body. */
  acceptsContent: boolean;
  /** Alternative body layouts. Omitted when the template has only one. */
  variants?: TemplateVariant[];
  build: (input: TemplateInput) => PaperDoc;
}

export const field = (
  fields: Record<string, string>,
  key: string,
  fallback = '',
): string => (fields[key]?.trim() ? fields[key].trim() : fallback);

export const fontOf = (name: FontFamily) => name;
