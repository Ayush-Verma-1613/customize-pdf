import { cloneBlock, cloneOverlay } from '@/lib/model/factory';
import type { Block, Overlay, PaperDoc } from '@/lib/model/types';
import type { LaidOutDoc } from '@/lib/engine/types';
import { uid } from '@/lib/utils/id';

/**
 * Pages are a *result* of the layout, not a stored structure - that is what
 * lets content reflow automatically. The page controls a user expects (add,
 * delete, duplicate, reorder) are therefore expressed as edits to the flow:
 * a page maps to the contiguous run of blocks that begins on it.
 */

export interface PageRange {
  page: number;
  /** Inclusive index of the first flow block that starts on this page. */
  start: number;
  /** Exclusive end. Equal to `start` when the page holds no flow content. */
  end: number;
}

export function pageRanges(doc: PaperDoc, laid: LaidOutDoc): PageRange[] {
  const firstPageOf = new Map<string, number>();
  for (const [blockId, pages] of Object.entries(laid.blockPages)) {
    if (pages.length) firstPageOf.set(blockId, Math.min(...pages));
  }

  const ranges: PageRange[] = laid.pages.map((p) => ({ page: p.index, start: -1, end: -1 }));
  doc.flow.forEach((block, i) => {
    const page = firstPageOf.get(block.id);
    if (page === undefined || !ranges[page]) return;
    if (ranges[page].start === -1) ranges[page].start = i;
    ranges[page].end = i + 1;
  });

  // Pages with no flow content (a blank page, or an overlay-only page) inherit
  // the insertion point of the nearest page that does.
  let cursor = 0;
  for (const range of ranges) {
    if (range.start === -1) {
      range.start = cursor;
      range.end = cursor;
    } else {
      cursor = range.end;
    }
  }

  // Page breaks sit between pages; pull a leading break into the page it opens.
  for (const range of ranges) {
    while (range.start > 0 && doc.flow[range.start - 1]?.type === 'pageBreak') {
      range.start -= 1;
    }
  }

  return ranges;
}

const isBreak = (block: Block | undefined) => block?.type === 'pageBreak';

/** Insert a fresh blank page after the given page index. */
export function insertPage(doc: PaperDoc, laid: LaidOutDoc, after: number): PaperDoc {
  const ranges = pageRanges(doc, laid);
  const at = ranges[after]?.end ?? doc.flow.length;
  const flow = [...doc.flow];
  // Two consecutive breaks leave one genuinely empty page between them.
  const breaks: Block[] = [
    { id: uid('b'), type: 'pageBreak' },
    { id: uid('b'), type: 'pageBreak' },
  ];
  flow.splice(at, 0, ...breaks);
  return {
    ...doc,
    flow,
    overlays: shiftOverlays(doc.overlays, after + 1, 1),
  };
}

/** Force a break so the content after `blockIndex` starts on a new page. */
export function insertPageBreakAt(doc: PaperDoc, blockIndex: number): PaperDoc {
  const flow = [...doc.flow];
  flow.splice(Math.max(0, Math.min(blockIndex, flow.length)), 0, {
    id: uid('b'),
    type: 'pageBreak',
  });
  return { ...doc, flow };
}

export function deletePage(doc: PaperDoc, laid: LaidOutDoc, page: number): PaperDoc {
  if (laid.pages.length <= 1) return doc;
  const ranges = pageRanges(doc, laid);
  const range = ranges[page];
  if (!range) return doc;

  const flow = [...doc.flow];
  flow.splice(range.start, range.end - range.start);

  // Collapse a break that is now redundant at the seam.
  if (isBreak(flow[range.start]) && (range.start === 0 || isBreak(flow[range.start - 1]))) {
    flow.splice(range.start, 1);
  }

  return {
    ...doc,
    flow,
    overlays: shiftOverlays(
      doc.overlays.filter((o) => o.page !== page),
      page,
      -1,
    ),
  };
}

export function duplicatePage(doc: PaperDoc, laid: LaidOutDoc, page: number): PaperDoc {
  const ranges = pageRanges(doc, laid);
  const range = ranges[page];
  if (!range) return doc;

  const source = doc.flow.slice(range.start, range.end);
  const copy = source.map(cloneBlock);
  const flow = [...doc.flow];
  const needsBreak = !isBreak(copy[0]) && !isBreak(doc.flow[range.end - 1]);
  flow.splice(
    range.end,
    0,
    ...(needsBreak ? [{ id: uid('b'), type: 'pageBreak' } as Block] : []),
    ...copy,
  );

  const clonedOverlays = doc.overlays
    .filter((o) => o.page === page)
    .map((o) => ({ ...cloneOverlay(o, 0), page: page + 1 }));

  return {
    ...doc,
    flow,
    overlays: [...shiftOverlays(doc.overlays, page + 1, 1), ...clonedOverlays],
  };
}

export function movePage(doc: PaperDoc, laid: LaidOutDoc, from: number, to: number): PaperDoc {
  if (from === to) return doc;
  const ranges = pageRanges(doc, laid);
  const source = ranges[from];
  const target = ranges[to];
  if (!source || !target) return doc;

  const flow = [...doc.flow];
  const moved = flow.splice(source.start, source.end - source.start);
  const shift = source.start < target.start ? -(source.end - source.start) : 0;
  const insertAt = (to > from ? target.end : target.start) + shift;
  flow.splice(Math.max(0, insertAt), 0, ...moved);

  // Both ends of the moved run need a break so it stays a page of its own.
  const normalised = normaliseBreaks(flow);

  return {
    ...doc,
    flow: normalised,
    overlays: doc.overlays.map((o) =>
      o.page === from
        ? { ...o, page: to }
        : from < to && o.page > from && o.page <= to
          ? { ...o, page: o.page - 1 }
          : from > to && o.page >= to && o.page < from
            ? { ...o, page: o.page + 1 }
            : o,
    ),
  };
}

/** Drop leading and doubled-up trailing breaks left behind by a reorder. */
function normaliseBreaks(flow: Block[]): Block[] {
  const out: Block[] = [];
  for (const block of flow) {
    if (block.type === 'pageBreak') {
      const previous = out[out.length - 1];
      // Keep at most two in a row (two is a deliberate blank page).
      const run = out.length >= 2 && isBreak(previous) && isBreak(out[out.length - 2]);
      if (run) continue;
      if (!out.length) continue;
    }
    out.push(block);
  }
  return out;
}

export const shiftOverlays = (overlays: Overlay[], from: number, delta: number): Overlay[] =>
  overlays.map((o) => (o.page >= from ? { ...o, page: Math.max(0, o.page + delta) } : o));
