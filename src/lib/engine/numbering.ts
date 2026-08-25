import type { Block, NumberingConfig } from '@/lib/model/types';

const ROMAN: [number, string][] = [
  [1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'],
  [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i'],
];

export function toRoman(n: number): string {
  let rest = Math.max(1, Math.floor(n));
  let out = '';
  for (const [value, sym] of ROMAN) {
    while (rest >= value) {
      out += sym;
      rest -= value;
    }
  }
  return out;
}

export function toAlpha(n: number): string {
  let rest = Math.max(1, Math.floor(n));
  let out = '';
  while (rest > 0) {
    rest -= 1;
    out = String.fromCharCode(97 + (rest % 26)) + out;
    rest = Math.floor(rest / 26);
  }
  return out;
}

export const formatCounter = (n: number, style: 'alpha' | 'roman' | 'number'): string =>
  style === 'alpha' ? toAlpha(n) : style === 'roman' ? toRoman(n) : String(n);

export const applyFormat = (fmt: string, value: string) => fmt.replace('{n}', value);

export interface NumberingResult {
  /** Block id -> rendered question label, e.g. "12." */
  numbers: Record<string, string>;
  /** Part id -> rendered label, e.g. "(a)" */
  partLabels: Record<string, string>;
  /** Sum of every marks value in the document. */
  totalMarks: number;
  /** Section block id -> total marks of the questions it contains. */
  sectionMarks: Record<string, number>;
  /** Ordered list of question block ids, for the outline panel. */
  order: string[];
}

/**
 * Question numbers are never stored on the blocks - they are derived on every
 * layout pass. Reordering, deleting or inserting a question therefore renumbers
 * the whole paper for free, which is the single most requested behaviour when
 * teachers edit an exam the night before.
 */
export function computeNumbering(flow: Block[], cfg: NumberingConfig): NumberingResult {
  const numbers: Record<string, string> = {};
  const partLabels: Record<string, string> = {};
  const sectionMarks: Record<string, number> = {};
  const order: string[] = [];
  let counter = 0;
  let totalMarks = 0;
  let currentSection: string | null = null;

  for (const block of flow) {
    if (block.type === 'section') {
      currentSection = block.id;
      sectionMarks[block.id] = 0;
      if (cfg.restartEachSection || block.restartNumbering) counter = 0;
      continue;
    }
    if (block.type !== 'question') continue;

    counter += 1;
    order.push(block.id);
    numbers[block.id] =
      block.numberOverride ?? applyFormat(cfg.questionFormat, String(counter));

    let blockMarks = block.marks ?? 0;
    block.parts?.forEach((part, i) => {
      partLabels[part.id] = applyFormat(cfg.partFormat, formatCounter(i + 1, cfg.partStyle));
      blockMarks += part.marks ?? 0;
    });

    totalMarks += blockMarks;
    if (currentSection) sectionMarks[currentSection] += blockMarks;
  }

  return { numbers, partLabels, totalMarks, sectionMarks, order };
}

/** Widest number label in the document, used to size the number gutter. */
export function widestNumber(numbers: Record<string, string>): string {
  let best = '';
  for (const v of Object.values(numbers)) if (v.length > best.length) best = v;
  return best || '99.';
}
