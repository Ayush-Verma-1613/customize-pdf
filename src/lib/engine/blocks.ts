import { HEADING_SPACING } from '@/lib/model/defaults';
import type {
  Block,
  BlockStyle,
  BoxBorder,
  Margins,
  NumberingConfig,
  Run,
  Theme,
} from '@/lib/model/types';
import { formatCounter, applyFormat, type NumberingResult } from './numbering';
import { measureTable, rowsHeight, sliceCells } from './table';
import { linesHeight, restack, wrapRuns, measureRuns, type BaseTextStyle } from './text';
import type { Frame, FrameSource, LayoutWarning, LineBox, TextItem } from './types';

/* ------------------------------------------------------------------ *
 * Pieces - the unit of pagination
 * ------------------------------------------------------------------ */

export interface PieceCtx {
  /** Absolute page coordinates for the top-left of this piece. */
  x: number;
  y: number;
  width: number;
  pageIndex: number;
  part: number;
}

/** A decoration pinned to the first line of a piece: a number, a bullet, marks. */
export interface Deco {
  items: TextItem[];
  dx: number;
  width: number;
}

export interface LinesPiece {
  kind: 'lines';
  isRepeat?: boolean;
  height: number;
  dx: number;
  width: number;
  lines: LineBox[];
  source: FrameSource;
  background?: string;
  border?: BoxBorder;
  padding?: Margins;
  prefix?: Deco;
  suffix?: Deco;
  splittable: boolean;
  orphans: number;
  widows: number;
}

export interface AtomicPiece {
  kind: 'atomic';
  isRepeat?: boolean;
  height: number;
  build: (c: PieceCtx) => Frame[];
}

export type Piece = LinesPiece | AtomicPiece;

/**
 * Warnings raised while paginating (as opposed to while measuring). Flow items
 * are cached across layout passes, so they cannot hold onto a per-run array.
 */
export const warningSink = { current: [] as LayoutWarning[] };

export interface Placement {
  height: number;
  render: (x: number, y: number, width: number, pageIndex: number) => Frame[];
  rest: FlowItem | null;
}

export interface FlowItem {
  blockId: string;
  breakBefore: boolean;
  keepWithNext: boolean;
  spaceBefore: number;
  spaceAfter: number;
  height: number;
  /** Height of the smallest chunk that can be placed on its own. */
  firstChunk: number;
  place: (avail: number, atTop: boolean) => Placement | null;
}

const pieceHeight = (p: Piece) => p.height;

const linesPieceHeight = (p: Omit<LinesPiece, 'height'>) =>
  linesHeight(p.lines) + (p.padding?.top ?? 0) + (p.padding?.bottom ?? 0);

function splitLinesPiece(piece: LinesPiece, avail: number): [LinesPiece, LinesPiece] | null {
  if (!piece.splittable) return null;
  const padV = (piece.padding?.top ?? 0) + (piece.padding?.bottom ?? 0);
  const room = avail - padV;
  if (room <= 0) return null;

  let used = 0;
  let cut = 0;
  for (const line of piece.lines) {
    if (used + line.height > room) break;
    used += line.height;
    cut += 1;
  }

  const total = piece.lines.length;
  if (cut < piece.orphans) return null;
  if (total - cut < piece.widows) cut = total - piece.widows;
  if (cut < piece.orphans || cut >= total) return null;

  const head: LinesPiece = {
    ...piece,
    lines: restack(piece.lines.slice(0, cut)),
    height: 0,
  };
  head.height = linesPieceHeight(head);
  const tail: LinesPiece = {
    ...piece,
    lines: restack(piece.lines.slice(cut)),
    prefix: undefined,
    suffix: undefined,
    height: 0,
  };
  tail.height = linesPieceHeight(tail);
  return [head, tail];
}

function renderLinesPiece(piece: LinesPiece, c: PieceCtx): Frame[] {
  const frames: Frame[] = [];
  const x = c.x + piece.dx;
  const padTop = piece.padding?.top ?? 0;
  const padLeft = piece.padding?.left ?? 0;
  const padRight = piece.padding?.right ?? 0;

  const source: FrameSource = { ...piece.source, part: c.part };

  frames.push({
    kind: 'text',
    id: `${piece.source.id}#${c.part}#${Math.round(c.y * 100)}`,
    source,
    x,
    y: c.y,
    width: piece.width,
    height: piece.height,
    lines: piece.lines.map((l) => ({ ...l, x: l.x + padLeft })),
    background: piece.background,
    border: piece.border,
    padding: piece.padding
      ? {
          top: padTop,
          right: padRight,
          bottom: piece.padding.bottom ?? 0,
          left: padLeft,
        }
      : undefined,
  });

  const first = piece.lines[0];
  if (first) {
    for (const deco of [piece.prefix, piece.suffix]) {
      if (!deco || !deco.items.length) continue;
      frames.push({
        kind: 'text',
        id: `${piece.source.id}#deco#${deco.dx}#${Math.round(c.y * 100)}`,
        source: { ...source },
        x: c.x + deco.dx,
        y: c.y + padTop,
        width: deco.width,
        height: first.height,
        lines: [
          {
            x: 0,
            y: 0,
            width: deco.width,
            height: first.height,
            baseline: first.baseline,
            items: deco.items,
            index: 0,
          },
        ],
        selectable: false,
      });
    }
  }

  return frames;
}

interface CompositeOpts {
  blockId: string;
  pieces: Piece[];
  spaceBefore: number;
  spaceAfter: number;
  breakBefore: boolean;
  keepWithNext: boolean;
  keepTogether: boolean;
  /** Re-emitted at the top of every continuation, e.g. repeated table headers. */
  repeat?: Piece[];
  part?: number;
}

/**
 * Wraps a list of pieces into a paginatable flow item. All block types funnel
 * through here, so page-break behaviour is defined exactly once.
 */
export function composite(opts: CompositeOpts): FlowItem {
  const { pieces } = opts;
  const part = opts.part ?? 0;
  const total = pieces.reduce((s, p) => s + pieceHeight(p), 0);
  const firstReal = pieces.find((p) => !p.isRepeat);

  const place = (avail: number, atTop: boolean): Placement | null => {
    const taken: Piece[] = [];
    let used = 0;
    let restPieces: Piece[] = [];

    if (opts.keepTogether && total > avail) {
      if (!atTop) return null;
      taken.push(...pieces);
      used = total;
    } else {
      let i = 0;
      for (; i < pieces.length; i += 1) {
        const piece = pieces[i];
        if (used + piece.height <= avail + 0.01) {
          taken.push(piece);
          used += piece.height;
          continue;
        }
        if (piece.kind === 'lines') {
          const split = splitLinesPiece(piece, avail - used);
          if (split) {
            taken.push(split[0]);
            used += split[0].height;
            restPieces = [split[1], ...pieces.slice(i + 1)];
            break;
          }
        }
        restPieces = pieces.slice(i);
        break;
      }
      if (i >= pieces.length) restPieces = [];
    }

    const madeProgress = taken.some((p) => !p.isRepeat);
    if (!madeProgress) {
      if (!atTop) return null;
      // Nothing fits even on an empty page: place the first real piece anyway
      // and let it overflow rather than looping forever.
      const idx = pieces.findIndex((p) => !p.isRepeat);
      if (idx < 0) return null;
      taken.length = 0;
      taken.push(...pieces.slice(0, idx + 1));
      used = taken.reduce((s, p) => s + p.height, 0);
      restPieces = pieces.slice(idx + 1);
      warningSink.current.push({
        blockId: opts.blockId,
        code: 'overflow',
        message: 'An element is taller than one page and had to overflow.',
      });
    }

    const rest = restPieces.length
      ? composite({
          ...opts,
          pieces: [...(opts.repeat ?? []), ...restPieces],
          spaceBefore: 0,
          part: part + 1,
        })
      : null;

    return {
      height: used,
      rest,
      render: (x, y, width, pageIndex) => {
        const frames: Frame[] = [];
        let cursor = y;
        for (const piece of taken) {
          const ctx: PieceCtx = { x, y: cursor, width, pageIndex, part };
          if (piece.kind === 'lines') frames.push(...renderLinesPiece(piece, ctx));
          else frames.push(...piece.build(ctx));
          cursor += piece.height;
        }
        return frames;
      },
    };
  };

  return {
    blockId: opts.blockId,
    breakBefore: opts.breakBefore,
    keepWithNext: opts.keepWithNext,
    spaceBefore: opts.spaceBefore,
    spaceAfter: opts.spaceAfter,
    height: total,
    firstChunk: firstReal?.height ?? total,
    place,
  };
}

/* ------------------------------------------------------------------ *
 * Style resolution
 * ------------------------------------------------------------------ */

export interface BuildContext {
  theme: Theme;
  numbering: NumberingConfig;
  numbers: NumberingResult;
  width: number;
  warnings: LayoutWarning[];
  /** Reserved width for question numbers, computed once per document. */
  gutter: number;
}

export function baseStyle(
  theme: Theme,
  style: BlockStyle | undefined,
  overrides: Partial<BaseTextStyle> = {},
): BaseTextStyle {
  return {
    family: style?.family ?? overrides.family ?? theme.bodyFamily,
    size: style?.size ?? overrides.size ?? theme.bodySize,
    bold: style?.bold ?? overrides.bold ?? false,
    italic: style?.italic ?? overrides.italic ?? false,
    underline: style?.underline ?? overrides.underline ?? false,
    color: style?.color ?? overrides.color ?? theme.textColor,
    letterSpacing: style?.letterSpacing ?? overrides.letterSpacing ?? 0,
    lineHeight: style?.lineHeight ?? overrides.lineHeight ?? theme.lineHeight,
  };
}

const paddingOf = (style?: BlockStyle): Margins | undefined => {
  const p = style?.padding;
  if (!p && !style?.background && !style?.border) return undefined;
  return {
    top: p?.top ?? (style?.background || style?.border ? 6 : 0),
    right: p?.right ?? (style?.background || style?.border ? 8 : 0),
    bottom: p?.bottom ?? (style?.background || style?.border ? 6 : 0),
    left: p?.left ?? (style?.background || style?.border ? 8 : 0),
  };
};

const decoFor = (runs: Run[], base: BaseTextStyle, dx: number): Deco => {
  const lines = wrapRuns(runs, base, {
    widthAt: () => 100000,
    align: 'left',
    lineHeight: base.lineHeight,
  });
  const items = lines[0]?.items ?? [];
  return { items, dx, width: measureRuns(runs, base) };
};

const headingSize = (theme: Theme, level: number) =>
  theme.bodySize * (theme.headingScale[level - 1] ?? 1);

/* ------------------------------------------------------------------ *
 * Block compilers
 * ------------------------------------------------------------------ */

function textPiece(
  source: FrameSource,
  lines: LineBox[],
  dx: number,
  width: number,
  style?: BlockStyle,
  extra: Partial<LinesPiece> = {},
): LinesPiece {
  const padding = paddingOf(style);
  const piece: LinesPiece = {
    kind: 'lines',
    dx,
    width,
    lines,
    source,
    background: style?.background,
    border: style?.border,
    padding,
    splittable: true,
    orphans: style?.orphans ?? 2,
    widows: style?.widows ?? 2,
    height: 0,
    ...extra,
  };
  piece.height = linesPieceHeight(piece);
  return piece;
}

/** Converts one block into a paginatable flow item. */
export function buildFlowItem(block: Block, ctx: BuildContext): FlowItem {
  const style = block.style ?? {};
  const indentL = style.indentLeft ?? 0;
  const indentR = style.indentRight ?? 0;
  const width = Math.max(24, ctx.width - indentL - indentR);
  const common = {
    blockId: block.id,
    breakBefore: !!style.breakBefore,
    keepWithNext: !!style.keepWithNext,
    keepTogether: !!style.keepTogether,
  };

  switch (block.type) {
    case 'pageBreak':
      return {
        blockId: block.id,
        breakBefore: true,
        keepWithNext: false,
        spaceBefore: 0,
        spaceAfter: 0,
        height: 0,
        firstChunk: 0,
        place: () => ({ height: 0, rest: null, render: () => [] }),
      };

    case 'spacer': {
      const h = Math.max(0, block.height);
      return composite({
        ...common,
        spaceBefore: style.spaceBefore ?? 0,
        spaceAfter: style.spaceAfter ?? 0,
        pieces: [{ kind: 'atomic', height: h, build: () => [] }],
      });
    }

    case 'divider': {
      const thickness = Math.max(0.25, block.thickness);
      const lineWidth = width * Math.min(1, Math.max(0.05, block.width));
      const align = style.align ?? 'left';
      const dx =
        align === 'center' ? (width - lineWidth) / 2 : align === 'right' ? width - lineWidth : 0;
      return composite({
        ...common,
        spaceBefore: style.spaceBefore ?? 6,
        spaceAfter: style.spaceAfter ?? 6,
        pieces: [
          {
            kind: 'atomic',
            height: thickness,
            build: (c) => [
              {
                kind: 'rule',
                id: `${block.id}#rule`,
                source: { kind: 'flow', id: block.id },
                x: c.x + indentL + dx,
                y: c.y,
                width: lineWidth,
                height: thickness,
                color: block.color,
                thickness,
                dash: block.dash,
              },
            ],
          },
        ],
      });
    }

    case 'answerLines': {
      const gap = Math.max(8, block.gap);
      const pieces: Piece[] = [];
      for (let i = 0; i < Math.max(1, block.count); i += 1) {
        pieces.push({
          kind: 'atomic',
          height: gap,
          build: (c) => [
            {
              kind: 'rule',
              id: `${block.id}#l${i}`,
              source: { kind: 'flow', id: block.id },
              x: c.x + indentL,
              y: c.y + gap - 1,
              width,
              height: 0.6,
              color: block.color,
              thickness: 0.6,
              dash: block.dash,
            },
          ],
        });
      }
      return composite({
        ...common,
        spaceBefore: style.spaceBefore ?? 4,
        spaceAfter: style.spaceAfter ?? 8,
        pieces,
      });
    }

    case 'heading': {
      const spacing = HEADING_SPACING[block.level] ?? HEADING_SPACING[2];
      const base = baseStyle(ctx.theme, style, {
        family: ctx.theme.headingFamily,
        size: headingSize(ctx.theme, block.level),
        bold: true,
        lineHeight: Math.min(ctx.theme.lineHeight, 1.22),
      });
      const lines = wrapRuns(block.runs, base, {
        widthAt: () => width,
        indentAt: (i) => (i === 0 ? (style.firstLineIndent ?? 0) : 0),
        align: style.align ?? (block.level === 1 ? 'center' : 'left'),
        lineHeight: base.lineHeight,
      });
      return composite({
        ...common,
        keepWithNext: style.keepWithNext ?? true,
        keepTogether: style.keepTogether ?? true,
        spaceBefore: style.spaceBefore ?? spacing.before,
        spaceAfter: style.spaceAfter ?? spacing.after,
        pieces: [textPiece({ kind: 'flow', id: block.id }, lines, indentL, width, style)],
      });
    }

    case 'paragraph': {
      const base = baseStyle(ctx.theme, style);
      const lines = wrapRuns(block.runs, base, {
        widthAt: () => width,
        indentAt: (i) => (i === 0 ? (style.firstLineIndent ?? 0) : 0),
        align: style.align ?? 'left',
        lineHeight: base.lineHeight,
      });
      return composite({
        ...common,
        spaceBefore: style.spaceBefore ?? 0,
        spaceAfter: style.spaceAfter ?? ctx.theme.bodySize * 0.5,
        pieces: [textPiece({ kind: 'flow', id: block.id }, lines, indentL, width, style)],
      });
    }

    case 'section': {
      const base = baseStyle(ctx.theme, style, {
        family: ctx.theme.headingFamily,
        size: style.size ?? ctx.theme.bodySize * 1.15,
        bold: true,
        lineHeight: 1.25,
      });
      const marks = ctx.numbers.sectionMarks[block.id] ?? block.marks ?? 0;
      const marksRuns: Run[] =
        ctx.numbering.showMarks && marks
          ? [{ text: applyFormat(ctx.numbering.marksFormat, String(marks)) }]
          : [];
      const marksDeco = marksRuns.length ? decoFor(marksRuns, base, 0) : undefined;
      const marksWidth = marksDeco ? marksDeco.width + 10 : 0;

      const titleLines = wrapRuns(block.runs, base, {
        widthAt: (i) => (i === 0 ? width - marksWidth : width),
        align: style.align ?? 'center',
        lineHeight: base.lineHeight,
      });

      const pieces: Piece[] = [
        textPiece({ kind: 'flow', id: block.id }, titleLines, indentL, width, undefined, {
          suffix: marksDeco
            ? { ...marksDeco, dx: indentL + width - marksDeco.width }
            : undefined,
          splittable: false,
        }),
      ];

      if (block.rule) {
        pieces.push({
          kind: 'atomic',
          height: 5,
          build: (c) => [
            {
              kind: 'rule',
              id: `${block.id}#rule`,
              source: { kind: 'flow', id: block.id },
              x: c.x + indentL,
              y: c.y + 3,
              width,
              height: 0.8,
              color: ctx.theme.muted,
              thickness: 0.8,
              dash: 'solid',
            },
          ],
        });
      }

      if (block.instructions?.length) {
        const instrBase = baseStyle(ctx.theme, undefined, {
          size: ctx.theme.bodySize * 0.92,
          italic: true,
          color: ctx.theme.muted,
        });
        const instrLines = wrapRuns(block.instructions, instrBase, {
          widthAt: () => width,
          align: style.align ?? 'center',
          lineHeight: instrBase.lineHeight,
        });
        pieces.push({ kind: 'atomic', height: 3, build: () => [] });
        pieces.push(
          textPiece({ kind: 'flow', id: block.id }, instrLines, indentL, width, undefined, {
            splittable: false,
          }),
        );
      }

      return composite({
        ...common,
        keepWithNext: style.keepWithNext ?? true,
        keepTogether: true,
        spaceBefore: style.spaceBefore ?? ctx.theme.bodySize * 1.1,
        spaceAfter: style.spaceAfter ?? ctx.theme.bodySize * 0.7,
        pieces,
      });
    }

    case 'question':
      return buildQuestion(block, ctx, { indentL, width, common, style });

    case 'list': {
      const base = baseStyle(ctx.theme, style);
      const markerFor = (i: number, level: number) =>
        block.variant === 'bullet'
          ? level % 2 === 0
            ? '•'
            : '◦'
          : block.variant === 'none'
            ? ''
            : `${formatCounter(i + 1, block.variant === 'number' ? 'number' : block.variant)}.`;

      // The gutter is sized from the widest marker so "10." never runs into its
      // own text, however many items the list grows to.
      const gutter = block.items.reduce(
        (widest, _, i) =>
          Math.max(widest, measureRuns([{ text: markerFor(i, block.levels?.[i] ?? 0) }], base)),
        base.size * 0.9,
      ) + base.size * 0.5;
      const pieces: Piece[] = [];

      block.items.forEach((item, i) => {
        const level = block.levels?.[i] ?? 0;
        const off = level * gutter;
        const marker = markerFor(i, level);

        const lines = wrapRuns(item, base, {
          widthAt: () => width - off - gutter,
          align: style.align ?? 'left',
          lineHeight: base.lineHeight,
        });
        pieces.push(
          textPiece(
            { kind: 'flow', id: block.id },
            lines,
            indentL + off + gutter,
            width - off - gutter,
            undefined,
            {
              prefix: marker
                ? { ...decoFor([{ text: marker }], base, 0), dx: indentL + off }
                : undefined,
              orphans: 1,
              widows: 1,
            },
          ),
        );
      });

      return composite({
        ...common,
        spaceBefore: style.spaceBefore ?? 4,
        spaceAfter: style.spaceAfter ?? ctx.theme.bodySize * 0.5,
        pieces,
      });
    }

    case 'checklist': {
      const base = baseStyle(ctx.theme, style);
      const boxSize = base.size * 0.82;
      const gutter = boxSize + 7;
      const cols = Math.max(1, block.columns ?? 1);
      const colWidth = (width - (cols - 1) * 14) / cols;
      const pieces: Piece[] = [];

      for (let start = 0; start < block.items.length; start += cols) {
        const rowItems = block.items.slice(start, start + cols);
        const wrapped = rowItems.map((it) =>
          wrapRuns(it.runs, base, {
            widthAt: () => colWidth - gutter,
            align: 'left',
            lineHeight: base.lineHeight,
          }),
        );
        const height = Math.max(...wrapped.map(linesHeight), base.size * base.lineHeight);
        pieces.push({
          kind: 'atomic',
          height,
          build: (c) => {
            const frames: Frame[] = [];
            rowItems.forEach((item, k) => {
              const cx = c.x + indentL + k * (colWidth + 14);
              const first = wrapped[k][0];
              const boxY = c.y + (first ? first.baseline - boxSize * 0.86 : 0);
              frames.push({
                kind: 'checkbox',
                id: `${block.id}#cb${start + k}`,
                source: { kind: 'flow', id: block.id },
                x: cx,
                y: boxY,
                width: boxSize,
                height: boxSize,
                size: boxSize,
                checked: !!item.checked,
                stroke: base.color,
              });
              frames.push({
                kind: 'text',
                id: `${block.id}#cbt${start + k}`,
                source: { kind: 'flow', id: block.id },
                x: cx + gutter,
                y: c.y,
                width: colWidth - gutter,
                height: linesHeight(wrapped[k]),
                lines: wrapped[k],
              });
            });
            return frames;
          },
        });
      }

      return composite({
        ...common,
        spaceBefore: style.spaceBefore ?? 4,
        spaceAfter: style.spaceAfter ?? ctx.theme.bodySize * 0.5,
        pieces,
      });
    }

    case 'image': {
      const natural =
        block.naturalWidth && block.naturalHeight
          ? block.naturalWidth / block.naturalHeight
          : 4 / 3;
      let w = block.width ?? Math.min(width, 260);
      let h = block.height ?? w / natural;
      if (w > width) {
        const scale = width / w;
        w *= scale;
        h *= scale;
      }
      const align = style.align ?? 'center';
      const dx = align === 'center' ? (width - w) / 2 : align === 'right' ? width - w : 0;

      const captionBase = baseStyle(ctx.theme, undefined, {
        size: ctx.theme.bodySize * 0.85,
        italic: true,
        color: ctx.theme.muted,
      });
      const captionLines = block.caption?.length
        ? wrapRuns(block.caption, captionBase, {
            widthAt: () => width,
            align: 'center',
            lineHeight: captionBase.lineHeight,
          })
        : [];

      if (!block.src) {
        ctx.warnings.push({
          blockId: block.id,
          code: 'missing-image',
          message: 'An image placeholder has no picture yet.',
        });
      }

      const pieces: Piece[] = [
        {
          kind: 'atomic',
          height: h,
          build: (c) => [
            {
              kind: 'image',
              id: `${block.id}#img`,
              source: { kind: 'flow', id: block.id },
              x: c.x + indentL + dx,
              y: c.y,
              width: w,
              height: h,
              src: block.src,
              fit: block.fit,
              radius: block.radius ?? 0,
              crop: block.crop,
            },
          ],
        },
      ];
      if (captionLines.length) {
        pieces.push(
          textPiece({ kind: 'flow', id: block.id }, captionLines, indentL, width, undefined, {
            splittable: false,
          }),
        );
      }

      return composite({
        ...common,
        keepTogether: true,
        spaceBefore: style.spaceBefore ?? 6,
        spaceAfter: style.spaceAfter ?? 8,
        pieces,
      });
    }

    case 'table': {
      const base = baseStyle(ctx.theme, style);
      const measured = measureTable(block, width, base);
      const align = style.align ?? 'left';
      const dx =
        align === 'center'
          ? (width - measured.width) / 2
          : align === 'right'
            ? width - measured.width
            : 0;

      const bandPiece = (rows: number[], isRepeat = false): Piece => ({
        kind: 'atomic',
        isRepeat,
        height: rowsHeight(measured, rows),
        build: (c) => {
          const { cells, height } = sliceCells(measured, block, rows, block.id);
          return [
            {
              kind: 'table',
              id: `${block.id}#${rows[0]}`,
              source: { kind: 'flow', id: block.id },
              x: c.x + indentL + dx,
              y: c.y,
              width: measured.width,
              height,
              cells,
              outerBorder: block.border,
            },
          ];
        },
      });

      const headerBands = measured.bands.filter((b) => b.every((r) => block.rows[r]?.isHeader));
      const bodyBands = measured.bands.filter((b) => !b.every((r) => block.rows[r]?.isHeader));
      const repeat =
        block.repeatHeader && headerBands.length
          ? headerBands.map((b) => bandPiece(b, true))
          : undefined;

      return composite({
        ...common,
        spaceBefore: style.spaceBefore ?? 6,
        spaceAfter: style.spaceAfter ?? 8,
        repeat,
        pieces: [...headerBands.map((b) => bandPiece(b)), ...bodyBands.map((b) => bandPiece(b))],
      });
    }
  }
}

/* ------------------------------------------------------------------ *
 * Questions
 * ------------------------------------------------------------------ */

function buildQuestion(
  block: Extract<Block, { type: 'question' }>,
  ctx: BuildContext,
  o: {
    indentL: number;
    width: number;
    common: Omit<CompositeOpts, 'pieces' | 'spaceBefore' | 'spaceAfter'>;
    style: BlockStyle;
  },
): FlowItem {
  const { indentL, width, common, style } = o;
  const base = baseStyle(ctx.theme, style);
  const label = ctx.numbers.numbers[block.id] ?? '';
  const gutter = ctx.gutter;
  const bodyX = indentL + gutter;
  const bodyWidth = width - gutter;

  const marksRuns: Run[] =
    ctx.numbering.showMarks && block.marks
      ? [{ text: applyFormat(ctx.numbering.marksFormat, String(block.marks)) }]
      : [];
  const marksDeco = marksRuns.length ? decoFor(marksRuns, base, 0) : undefined;
  const marksWidth = marksDeco ? marksDeco.width + 12 : 0;

  const lines = wrapRuns(block.runs, base, {
    widthAt: (i) => (i === 0 ? bodyWidth - marksWidth : bodyWidth),
    align: style.align ?? 'left',
    lineHeight: base.lineHeight,
  });

  const pieces: Piece[] = [
    textPiece({ kind: 'flow', id: block.id }, lines, bodyX, bodyWidth, style, {
      prefix: label ? { ...decoFor([{ text: label }], base, 0), dx: indentL } : undefined,
      suffix: marksDeco
        ? { ...marksDeco, dx: indentL + width - marksDeco.width }
        : undefined,
      orphans: style.orphans ?? 2,
      widows: style.widows ?? 2,
    }),
  ];

  // Multiple-choice options laid out in a grid, kept together with the stem.
  if (block.options?.length) {
    const cols = Math.max(1, block.optionColumns ?? 2);
    const colGap = 12;
    const optWidth = (bodyWidth - (cols - 1) * colGap) / cols;
    const optGutter = base.size * 1.6;

    for (let start = 0; start < block.options.length; start += cols) {
      const row = block.options.slice(start, start + cols);
      const wrapped = row.map((opt) =>
        wrapRuns(opt, base, {
          widthAt: () => optWidth - optGutter,
          align: 'left',
          lineHeight: base.lineHeight,
        }),
      );
      const height = Math.max(...wrapped.map(linesHeight)) + 2;
      pieces.push({
        kind: 'atomic',
        height,
        build: (c) => {
          const frames: Frame[] = [];
          row.forEach((_, k) => {
            const idx = start + k;
            const cx = c.x + bodyX + k * (optWidth + colGap);
            const marker = decoFor(
              [{ text: `(${formatCounter(idx + 1, 'alpha')})` }],
              base,
              0,
            );
            const first = wrapped[k][0];
            frames.push({
              kind: 'text',
              id: `${block.id}#om${idx}`,
              source: { kind: 'flow', id: block.id },
              x: cx,
              y: c.y,
              width: optGutter,
              height: first?.height ?? base.size,
              lines: first
                ? [{ ...first, x: 0, y: 0, items: marker.items, width: marker.width }]
                : [],
              selectable: false,
            });
            frames.push({
              kind: 'text',
              id: `${block.id}#ot${idx}`,
              source: { kind: 'flow', id: block.id },
              x: cx + optGutter,
              y: c.y,
              width: optWidth - optGutter,
              height: linesHeight(wrapped[k]),
              lines: wrapped[k],
            });
          });
          return frames;
        },
      });
    }
  }

  // Sub-parts (a), (b), (c) with their own marks column.
  // Sized once from the widest label, e.g. "(viii)" needs more room than "(a)".
  const partIndent = base.size * 0.9;
  const partGutter =
    (block.parts ?? []).reduce(
      (widest, part) =>
        Math.max(
          widest,
          measureRuns([{ text: ctx.numbers.partLabels[part.id] ?? '' }], base),
        ),
      base.size,
    ) + base.size * 0.45;

  block.parts?.forEach((part) => {
    const partLabel = ctx.numbers.partLabels[part.id] ?? '';
    const partX = bodyX + partIndent;
    const partWidth = bodyWidth - partIndent - partGutter;

    const partMarksRuns: Run[] =
      ctx.numbering.showMarks && part.marks
        ? [{ text: applyFormat(ctx.numbering.marksFormat, String(part.marks)) }]
        : [];
    const partMarksDeco = partMarksRuns.length ? decoFor(partMarksRuns, base, 0) : undefined;
    const partMarksWidth = partMarksDeco ? partMarksDeco.width + 12 : 0;

    const partLines = wrapRuns(part.runs, base, {
      widthAt: (i) => (i === 0 ? partWidth - partMarksWidth : partWidth),
      align: style.align ?? 'left',
      lineHeight: base.lineHeight,
    });

    pieces.push(
      textPiece(
        { kind: 'flow', id: block.id },
        partLines,
        partX + partGutter,
        partWidth,
        undefined,
        {
          prefix: partLabel
            ? { ...decoFor([{ text: partLabel }], base, 0), dx: partX }
            : undefined,
          suffix: partMarksDeco
            ? { ...partMarksDeco, dx: indentL + width - partMarksDeco.width }
            : undefined,
          orphans: 1,
          widows: 1,
        },
      ),
    );

    for (let i = 0; i < (part.answerLines ?? 0); i += 1) {
      pieces.push(answerRule(block.id, bodyX, bodyWidth, ctx.theme.muted, i));
    }
  });

  for (let i = 0; i < (block.answerLines ?? 0); i += 1) {
    pieces.push(answerRule(block.id, bodyX, bodyWidth, ctx.theme.muted, i));
  }

  return composite({
    ...common,
    spaceBefore: style.spaceBefore ?? ctx.theme.bodySize * 0.55,
    spaceAfter: style.spaceAfter ?? ctx.theme.bodySize * 0.25,
    pieces,
  });
}

const answerRule = (
  blockId: string,
  dx: number,
  width: number,
  color: string,
  i: number,
): AtomicPiece => ({
  kind: 'atomic',
  height: 22,
  build: (c) => [
    {
      kind: 'rule',
      id: `${blockId}#ans${i}#${Math.round(c.y)}`,
      source: { kind: 'flow', id: blockId },
      x: c.x + dx,
      y: c.y + 21,
      width,
      height: 0.6,
      color,
      thickness: 0.6,
      dash: 'solid',
    },
  ],
});

/** Width of the number gutter, sized from the widest label in the document. */
export function computeGutter(
  numbers: NumberingResult,
  cfg: NumberingConfig,
  theme: Theme,
): number {
  if (cfg.gutter > 0) return cfg.gutter;
  const base: BaseTextStyle = {
    family: theme.bodyFamily,
    size: theme.bodySize,
    bold: false,
    italic: false,
    underline: false,
    color: theme.textColor,
    letterSpacing: 0,
    lineHeight: theme.lineHeight,
  };
  let widest = theme.bodySize * 1.4;
  for (const label of Object.values(numbers.numbers)) {
    widest = Math.max(widest, measureRuns([{ text: label }], base));
  }
  return widest + theme.bodySize * 0.55;
}
