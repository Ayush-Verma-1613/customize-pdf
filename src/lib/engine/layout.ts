import { contentBox, pageBox } from '@/lib/model/defaults';
import type {
  Block,
  HeaderFooter,
  Overlay,
  PaperDoc,
  Run,
  TextOverlay,
} from '@/lib/model/types';
import {
  baseStyle,
  buildFlowItem,
  computeGutter,
  warningSink,
  type BuildContext,
  type FlowItem,
  type Placement,
} from './blocks';
import { measurer } from './measure';
import { computeNumbering } from './numbering';
import { measureTable, sliceCells } from './table';
import { linesHeight, wrapRuns } from './text';
import type { Frame, LaidOutDoc, LaidOutPage, LayoutWarning } from './types';

/* ------------------------------------------------------------------ *
 * Flow item cache
 * ------------------------------------------------------------------ */

interface CacheEntry {
  signature: string;
  item: FlowItem;
  warnings: LayoutWarning[];
}

/**
 * Measuring text dominates layout cost, so compiled flow items are memoised
 * against the block object itself. Immutable updates give every edited block a
 * fresh identity, which invalidates exactly the blocks that actually changed.
 */
const itemCache = new WeakMap<Block, CacheEntry>();

const contextSignature = (ctx: BuildContext) =>
  [
    ctx.width.toFixed(3),
    ctx.gutter.toFixed(3),
    ctx.theme.bodyFamily,
    ctx.theme.headingFamily,
    ctx.theme.bodySize,
    ctx.theme.lineHeight,
    ctx.theme.textColor,
    ctx.theme.muted,
    ctx.theme.headingScale.join(','),
    ctx.numbering.questionFormat,
    ctx.numbering.partFormat,
    ctx.numbering.partStyle,
    ctx.numbering.marksFormat,
    ctx.numbering.showMarks ? 1 : 0,
    ctx.numbering.marksPosition,
    measurer.ready() ? 'exact' : 'approx',
  ].join('|');

function flowItemFor(block: Block, ctx: BuildContext, sink: LayoutWarning[]): FlowItem {
  const numberSig = `${ctx.numbers.numbers[block.id] ?? ''}|${ctx.numbers.sectionMarks[block.id] ?? ''}`;
  const signature = `${contextSignature(ctx)}|${numberSig}`;
  const hit = itemCache.get(block);
  if (hit && hit.signature === signature) {
    sink.push(...hit.warnings);
    return hit.item;
  }
  const local: LayoutWarning[] = [];
  const item = buildFlowItem(block, { ...ctx, warnings: local });
  itemCache.set(block, { signature, item, warnings: local });
  sink.push(...local);
  return item;
}

/* ------------------------------------------------------------------ *
 * Header / footer tokens
 * ------------------------------------------------------------------ */

const TOKEN = /\{\{\s*([\w.-]+)\s*\}\}/g;

export function resolveTokens(
  runs: Run[],
  vars: Record<string, string>,
): Run[] {
  return (runs ?? []).map((run) => ({
    ...run,
    text: (run.text ?? '').replace(TOKEN, (_, key: string) => vars[key] ?? ''),
  }));
}

function headerFooterFrames(
  hf: HeaderFooter,
  doc: PaperDoc,
  pageIndex: number,
  totalPages: number,
  isFooter: boolean,
): Frame[] {
  if (!hf.enabled) return [];
  if (pageIndex === 0 && !hf.showOnFirstPage) return [];

  const box = pageBox(doc.page);
  const content = contentBox(doc.page);
  const base = baseStyle(doc.theme, hf.style, { size: doc.theme.bodySize * 0.82 });

  const vars: Record<string, string> = {
    page: String(pageIndex + 1),
    pages: String(totalPages),
    title: doc.title,
    date: new Date(doc.updatedAt).toLocaleDateString(),
    ...doc.fields,
  };

  const frames: Frame[] = [];
  const bandHeight = base.size * base.lineHeight;
  const y = isFooter ? box.height - hf.offset - bandHeight : hf.offset;

  (['left', 'center', 'right'] as const).forEach((slot) => {
    const runs = resolveTokens(hf.slots[slot], vars);
    if (!runs.length || !runs.some((r) => r.text)) return;
    const lines = wrapRuns(runs, base, {
      widthAt: () => content.width,
      align: slot,
      lineHeight: base.lineHeight,
    });
    frames.push({
      kind: 'text',
      id: `${isFooter ? 'footer' : 'header'}-${slot}-${pageIndex}`,
      source: { kind: 'master', id: isFooter ? 'footer' : 'header' },
      x: content.x,
      y,
      width: content.width,
      height: linesHeight(lines),
      lines,
    });
  });

  if (hf.rule && frames.length) {
    frames.push({
      kind: 'rule',
      id: `${isFooter ? 'footer' : 'header'}-rule-${pageIndex}`,
      source: { kind: 'master', id: isFooter ? 'footer' : 'header' },
      x: content.x,
      y: isFooter ? y - 5 : y + bandHeight + 4,
      width: content.width,
      height: 0.6,
      color: hf.ruleColor,
      thickness: 0.6,
      dash: 'solid',
    });
  }

  return frames;
}

function pageFurniture(doc: PaperDoc, pageIndex: number, totalPages: number): Frame[] {
  const frames: Frame[] = [];
  const box = pageBox(doc.page);
  const border = doc.page.border;

  if (border && border.width > 0) {
    frames.push({
      kind: 'shape',
      id: `page-border-${pageIndex}`,
      source: { kind: 'master', id: 'border' },
      x: border.inset,
      y: border.inset,
      width: box.width - border.inset * 2,
      height: box.height - border.inset * 2,
      shape: 'rect',
      fill: 'transparent',
      stroke: border.color,
      strokeWidth: border.width,
      radius: border.radius,
      dash: border.style === 'double' ? 'solid' : border.style,
    });
    if (border.style === 'double') {
      const gap = border.width + 2.5;
      frames.push({
        kind: 'shape',
        id: `page-border2-${pageIndex}`,
        source: { kind: 'master', id: 'border' },
        x: border.inset + gap,
        y: border.inset + gap,
        width: box.width - (border.inset + gap) * 2,
        height: box.height - (border.inset + gap) * 2,
        shape: 'rect',
        fill: 'transparent',
        stroke: border.color,
        strokeWidth: Math.max(0.5, border.width * 0.5),
        radius: Math.max(0, border.radius - gap),
        dash: 'solid',
      });
    }
  }

  const wm = doc.master.watermark;
  if (wm.enabled && wm.text.trim()) {
    const base = baseStyle(doc.theme, undefined, {
      size: wm.size,
      bold: true,
      color: wm.color,
      lineHeight: 1,
    });
    const lines = wrapRuns([{ text: wm.text }], base, {
      widthAt: () => box.width * 2,
      align: 'left',
      lineHeight: 1,
    });
    const w = lines[0]?.width ?? 0;
    const h = lines[0]?.height ?? wm.size;
    frames.push({
      kind: 'text',
      id: `watermark-${pageIndex}`,
      source: { kind: 'master', id: 'watermark' },
      x: (box.width - w) / 2,
      y: (box.height - h) / 2,
      width: w,
      height: h,
      rotation: wm.rotation,
      opacity: wm.opacity,
      lines,
      selectable: false,
    });
  }

  frames.push(...headerFooterFrames(doc.master.header, doc, pageIndex, totalPages, false));
  frames.push(...headerFooterFrames(doc.master.footer, doc, pageIndex, totalPages, true));
  return frames;
}

/* ------------------------------------------------------------------ *
 * Overlays
 * ------------------------------------------------------------------ */

function overlayFrames(overlay: Overlay, doc: PaperDoc): Frame[] {
  const shared = {
    id: overlay.id,
    source: { kind: 'overlay' as const, id: overlay.id },
    x: overlay.x,
    y: overlay.y,
    width: overlay.width,
    height: overlay.height,
    rotation: overlay.rotation,
    opacity: overlay.opacity,
    selectable: true,
  };

  switch (overlay.kind) {
    case 'text': {
      const o = overlay as TextOverlay;
      const base = baseStyle(doc.theme, o.style);
      const pad = 2;
      const lines = wrapRuns(o.runs, base, {
        widthAt: () => Math.max(8, o.width - pad * 2),
        align: o.style.align ?? 'left',
        lineHeight: base.lineHeight,
      });
      const textHeight = linesHeight(lines);
      const height = o.autoHeight ? textHeight + pad * 2 : o.height;
      const free = Math.max(0, height - pad * 2 - textHeight);
      const shift = o.vAlign === 'middle' ? free / 2 : o.vAlign === 'bottom' ? free : 0;
      return [
        {
          ...shared,
          kind: 'text',
          height,
          lines: lines.map((l) => ({ ...l, x: l.x + pad, y: l.y + pad + shift })),
          background: o.style.background,
          border: o.style.border,
        },
      ];
    }
    case 'image':
      return [
        {
          ...shared,
          kind: 'image',
          src: overlay.src,
          fit: overlay.fit,
          radius: overlay.radius,
          crop: overlay.crop,
        },
      ];
    case 'shape':
      return [
        {
          ...shared,
          kind: 'shape',
          shape: overlay.shape,
          fill: overlay.fill,
          stroke: overlay.stroke,
          strokeWidth: overlay.strokeWidth,
          radius: overlay.radius,
          dash: overlay.dash,
        },
      ];
    case 'line':
      return [
        {
          ...shared,
          kind: 'line',
          x2: overlay.x + overlay.width,
          y2: overlay.y + overlay.height,
          stroke: overlay.stroke,
          strokeWidth: overlay.strokeWidth,
          dash: overlay.dash,
          arrowEnd: overlay.arrowEnd,
        },
      ];
    case 'checkbox': {
      const base = baseStyle(doc.theme, overlay.style);
      const size = Math.min(overlay.height, base.size * 0.9);
      const frames: Frame[] = [
        {
          ...shared,
          kind: 'checkbox',
          width: size,
          height: size,
          size,
          checked: overlay.checked,
          stroke: overlay.stroke,
        },
      ];
      if (overlay.label?.length) {
        const lines = wrapRuns(overlay.label, base, {
          widthAt: () => Math.max(8, overlay.width - size - 6),
          align: 'left',
          lineHeight: base.lineHeight,
        });
        frames.push({
          kind: 'text',
          id: `${overlay.id}#label`,
          source: { kind: 'overlay', id: overlay.id },
          x: overlay.x + size + 6,
          y: overlay.y,
          width: overlay.width - size - 6,
          height: linesHeight(lines),
          rotation: overlay.rotation,
          opacity: overlay.opacity,
          lines,
          selectable: false,
        });
      }
      return frames;
    }
    case 'table': {
      const base = baseStyle(doc.theme, undefined);
      const measured = measureTable(overlay.table, overlay.width, base);
      const rows = overlay.table.rows.map((_, i) => i);
      const { cells, height } = sliceCells(measured, overlay.table, rows, overlay.id);
      return [
        {
          ...shared,
          kind: 'table',
          width: measured.width,
          height,
          cells: cells.map((c) => ({ ...c, source: { kind: 'overlay', id: overlay.id, rowId: c.source.rowId, cellId: c.source.cellId } })),
          outerBorder: overlay.table.border,
        },
      ];
    }
  }
}

/* ------------------------------------------------------------------ *
 * Pagination
 * ------------------------------------------------------------------ */

const MAX_PAGES = 400;

export function layoutDocument(doc: PaperDoc): LaidOutDoc {
  const warnings: LayoutWarning[] = [];
  warningSink.current = warnings;

  const box = pageBox(doc.page);
  const content = contentBox(doc.page);

  // Reserve room for header / footer bands so they never collide with the text.
  const bandFor = (hf: HeaderFooter) =>
    hf.enabled ? hf.offset + (hf.style.size ?? doc.theme.bodySize * 0.82) * 1.4 + 8 : 0;
  const top = Math.max(content.y, bandFor(doc.master.header));
  const bottomLimit = box.height - Math.max(doc.page.margins.bottom, bandFor(doc.master.footer));
  const columnCount = Math.max(1, Math.min(4, doc.page.columns));
  const columnGap = doc.page.columnGap;
  const columnWidth =
    (content.width - columnGap * (columnCount - 1)) / columnCount;

  const numbers = computeNumbering(doc.flow, doc.numbering);
  const ctx: BuildContext = {
    theme: doc.theme,
    numbering: doc.numbering,
    numbers,
    width: columnWidth,
    warnings,
    gutter: computeGutter(numbers, doc.numbering, doc.theme),
  };

  const items = doc.flow.map((block) => flowItemFor(block, ctx, warnings));

  const pages: LaidOutPage[] = [];
  const blockPages: Record<string, number[]> = {};

  const newPage = (): LaidOutPage => {
    const page: LaidOutPage = {
      index: pages.length,
      width: box.width,
      height: box.height,
      background: doc.page.background,
      content: { x: content.x, y: top, width: content.width, height: bottomLimit - top },
      frames: [],
      masterFrames: [],
    };
    pages.push(page);
    return page;
  };

  let page = newPage();
  let column = 0;
  let cursor = top;
  let previousSpaceAfter = 0;
  let columnEmpty = true;

  const columnX = () => content.x + column * (columnWidth + columnGap);

  const nextColumn = () => {
    column += 1;
    if (column >= columnCount) {
      column = 0;
      if (pages.length >= MAX_PAGES) return false;
      page = newPage();
    }
    cursor = top;
    previousSpaceAfter = 0;
    columnEmpty = true;
    return true;
  };

  const noteBlockPage = (blockId: string) => {
    const list = (blockPages[blockId] ??= []);
    if (!list.includes(page.index)) list.push(page.index);
  };

  for (let i = 0; i < items.length; i += 1) {
    let item: FlowItem | null = items[i];

    if (item.breakBefore && !(columnEmpty && page.index === 0 && column === 0)) {
      if (!nextColumn()) break;
    }

    let guard = 0;
    while (item && guard < MAX_PAGES * 4) {
      guard += 1;
      const gap: number = columnEmpty ? 0 : Math.max(previousSpaceAfter, item.spaceBefore);
      const available: number = bottomLimit - (cursor + gap);

      // "Keep with next" reserves room for the first chunk of the following
      // block, which is what stops a heading being stranded at a page foot.
      let required = 0;
      if (item.keepWithNext && i + 1 < items.length) {
        required = Math.min(items[i + 1].firstChunk, (bottomLimit - top) * 0.35);
      }

      const placement: Placement | null =
        available > 0
          ? item.place(available - (item.height <= available ? required : 0), columnEmpty)
          : null;

      if (!placement) {
        if (columnEmpty) break;
        if (!nextColumn()) {
          item = null;
          break;
        }
        continue;
      }

      const y = cursor + gap;
      page.frames.push(...placement.render(columnX(), y, columnWidth, page.index));
      noteBlockPage(item.blockId);

      cursor = y + placement.height;
      columnEmpty = false;

      if (placement.rest) {
        previousSpaceAfter = 0;
        if (!nextColumn()) {
          item = null;
          break;
        }
        item = placement.rest;
      } else {
        previousSpaceAfter = item.spaceAfter;
        item = null;
      }
    }
  }

  // Overlays can pin themselves to pages beyond the end of the flow.
  const maxOverlayPage = doc.overlays.reduce((m, o) => Math.max(m, o.page), -1);
  while (pages.length <= maxOverlayPage && pages.length < MAX_PAGES) newPage();

  const sorted = [...doc.overlays].sort((a, b) => a.z - b.z);
  for (const overlay of sorted) {
    const target = pages[overlay.page];
    if (!target) continue;
    target.frames.push(...overlayFrames(overlay, doc));
  }

  for (const p of pages) {
    p.masterFrames = pageFurniture(doc, p.index, pages.length);
  }

  warningSink.current = [];

  return {
    pages,
    blockPages,
    numbers: numbers.numbers,
    warnings,
    exact: measurer.ready(),
    totalMarks: numbers.totalMarks,
  };
}

/** Number of pages a document currently occupies. */
export const pageCount = (laid: LaidOutDoc) => laid.pages.length;
