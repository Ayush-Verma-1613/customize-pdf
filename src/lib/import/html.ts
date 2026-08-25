'use client';

import { makeRow, makeTable } from '@/lib/model/factory';
import type { Block, Run, TableRow } from '@/lib/model/types';
import { htmlToRuns, runsToPlainText } from '@/lib/parse/richtext';
import { extractMarks, parseContent } from '@/lib/parse/content';
import { uid } from '@/lib/utils/id';

/**
 * HTML - from a Word file or a saved web page - into flow blocks.
 *
 * Structure is taken from the tags, but the *text* of every paragraph is still
 * run through the plain-text parser, so a Word document whose questions are
 * typed as "1. ... [2]" arrives as numbered questions with marks rather than as
 * a wall of paragraphs.
 */
export function htmlToBlocks(html: string): Block[] {
  if (typeof document === 'undefined') return [];
  const host = document.createElement('div');
  host.innerHTML = html;

  const blocks: Block[] = [];
  /** Paragraph text queued up so consecutive lines can be parsed together. */
  let pending: string[] = [];

  const flushPending = () => {
    if (!pending.length) return;
    const parsed = parseContent(pending.join('\n'));
    blocks.push(...parsed.blocks);
    pending = [];
  };

  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      const tag = child.tagName;

      if (/^H[1-6]$/.test(tag)) {
        flushPending();
        const level = Math.min(4, Number(tag.slice(1))) as 1 | 2 | 3 | 4;
        const runs = htmlToRuns(child.innerHTML);
        if (runsToPlainText(runs).trim()) {
          blocks.push({ id: uid('b'), type: 'heading', level, runs });
        }
        continue;
      }

      if (tag === 'UL' || tag === 'OL') {
        flushPending();
        const items = Array.from(child.querySelectorAll(':scope > li')).map((li) =>
          htmlToRuns(li.innerHTML),
        );
        if (items.length) {
          blocks.push({
            id: uid('b'),
            type: 'list',
            variant: tag === 'OL' ? 'number' : 'bullet',
            items,
          });
        }
        continue;
      }

      if (tag === 'TABLE') {
        flushPending();
        const table = tableFrom(child as HTMLTableElement);
        if (table) blocks.push(table);
        continue;
      }

      if (tag === 'HR') {
        flushPending();
        blocks.push({
          id: uid('b'),
          type: 'divider',
          thickness: 0.75,
          color: '#9ca3af',
          dash: 'solid',
          width: 1,
        });
        continue;
      }

      if (tag === 'IMG') {
        flushPending();
        const src = (child as HTMLImageElement).getAttribute('src') ?? '';
        if (src) {
          blocks.push({ id: uid('b'), type: 'image', src, fit: 'contain', width: 240 });
        }
        continue;
      }

      if (tag === 'P' || tag === 'DIV' || tag === 'SECTION' || tag === 'ARTICLE') {
        // A wrapper with block children is a container, not a paragraph.
        const hasBlockChildren = Array.from(child.children).some((c) =>
          /^(P|DIV|H[1-6]|UL|OL|TABLE|SECTION|ARTICLE)$/.test(c.tagName),
        );
        if (hasBlockChildren) {
          walk(child);
          continue;
        }
        const runs = htmlToRuns(child.innerHTML);
        const text = runsToPlainText(runs).replace(/\s+/g, ' ').trim();
        if (!text) continue;

        // Formatting that survives (bold, italic) is kept only when the line is
        // plain prose; a question line goes to the parser so it can be numbered.
        if (isPlainProse(runs) || !looksStructured(text)) {
          blocks.push({ id: uid('b'), type: 'paragraph', runs });
        } else {
          pending.push(text);
        }
        continue;
      }

      walk(child);
    }
  };

  walk(host);
  flushPending();
  return blocks;
}

const STRUCTURED = /^\s*(?:Q\.?\s*)?\d+\s*[.)\]]\s+|^\s*\([a-z]|^\s*[a-z]\s*[.)]\s+|^\s*(?:section|part)\s+[A-Za-z0-9]+\b|^\s*[-*•]\s+|^\s*\[[ xX]\]\s+/i;

const looksStructured = (text: string) => STRUCTURED.test(text) || !!extractMarks(text).marks;

/** True when the run list carries formatting worth keeping verbatim. */
const isPlainProse = (runs: Run[]) =>
  runs.length > 1 && runs.some((r) => r.bold || r.italic || r.underline || r.highlight);

function tableFrom(element: HTMLTableElement) {
  const htmlRows = Array.from(element.querySelectorAll('tr'));
  if (!htmlRows.length) return null;

  const width = Math.max(
    ...htmlRows.map((row) =>
      Array.from(row.cells).reduce((sum, cell) => sum + (cell.colSpan || 1), 0),
    ),
  );
  if (!width) return null;

  const rows: TableRow[] = htmlRows.map((row, index) => {
    const cells = Array.from(row.cells).map((cell) => ({
      id: uid('c'),
      runs: htmlToRuns(cell.innerHTML),
      colSpan: cell.colSpan > 1 ? cell.colSpan : undefined,
      rowSpan: cell.rowSpan > 1 ? cell.rowSpan : undefined,
      bold: cell.tagName === 'TH' || undefined,
    }));
    const isHeader = index === 0 && Array.from(row.cells).every((c) => c.tagName === 'TH');
    return { ...makeRow([]), id: uid('r'), cells, isHeader: isHeader || undefined };
  });

  return makeTable(new Array(width).fill(1), rows);
}
