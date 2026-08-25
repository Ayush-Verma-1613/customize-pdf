import type { Align, FontFamily, Run } from '@/lib/model/types';
import { ascentPt, descentPt, fontKey, type ResolvedFont } from './fonts';
import { measurer } from './measure';
import type { LineBox, TextItem } from './types';

/** Character defaults a run inherits from its block. */
export interface BaseTextStyle {
  family: FontFamily;
  size: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string;
  letterSpacing: number;
  lineHeight: number;
}

export const SCRIPT_SCALE = 0.62;
const SUPER_RISE = 0.34;
const SUB_RISE = -0.16;

export function resolveFont(run: Run, base: BaseTextStyle): ResolvedFont {
  const size = (run.size ?? base.size) * (run.script ? SCRIPT_SCALE : 1);
  return {
    family: run.family ?? base.family,
    size,
    bold: run.bold ?? base.bold,
    italic: run.italic ?? base.italic,
    letterSpacing: run.letterSpacing ?? base.letterSpacing,
  };
}

const riseOf = (run: Run, base: BaseTextStyle) =>
  run.script === 'super' ? base.size * SUPER_RISE : run.script === 'sub' ? base.size * SUB_RISE : 0;

interface Token {
  text: string;
  kind: 'word' | 'space' | 'break';
  font: ResolvedFont;
  color: string;
  underline: boolean;
  strike: boolean;
  highlight?: string;
  rise: number;
  width: number;
  styleKey: string;
}

const SPLIT = /(\s+)/;

export function tokenize(runs: Run[], base: BaseTextStyle): Token[] {
  const out: Token[] = [];
  for (const run of runs ?? []) {
    if (!run || run.text === undefined || run.text === null) continue;
    const font = resolveFont(run, base);
    const color = run.color ?? base.color;
    const underline = run.underline ?? base.underline;
    const rise = riseOf(run, base);
    const styleKey = `${fontKey(font)}|${color}|${underline ? 1 : 0}|${run.strike ? 1 : 0}|${run.highlight ?? ''}|${rise}`;

    for (const chunk of run.text.split('\n')) {
      for (const piece of chunk.split(SPLIT)) {
        if (!piece) continue;
        const isSpace = /^\s+$/.test(piece);
        out.push({
          text: piece,
          kind: isSpace ? 'space' : 'word',
          font,
          color,
          underline,
          strike: run.strike ?? false,
          highlight: run.highlight,
          rise,
          width: measurer.width(piece, font),
          styleKey,
        });
      }
      out.push({
        text: '',
        kind: 'break',
        font,
        color,
        underline,
        strike: false,
        rise,
        width: 0,
        styleKey,
      });
    }
    // The trailing break belongs to the run boundary, not to a real newline.
    if (out.length && out[out.length - 1].kind === 'break') out.pop();
  }
  return out;
}

export interface WrapOptions {
  /** Available text width for a given zero-based line index. */
  widthAt: (line: number) => number;
  /** Extra left offset for a given line, used for first-line indents. */
  indentAt?: (line: number) => number;
  align: Align;
  /** Multiplier applied to the font size. */
  lineHeight: number;
  /** Floor for the line box height, in pt. */
  minLineHeight?: number;
}

/** Split a word that cannot fit on any line into character-level chunks. */
function breakLongWord(token: Token, maxWidth: number): Token[] {
  const chars = [...token.text];
  const parts: Token[] = [];
  let buf = '';
  let bufW = 0;
  for (const ch of chars) {
    const w = measurer.width(ch, token.font);
    if (buf && bufW + w > maxWidth) {
      parts.push({ ...token, text: buf, width: bufW });
      buf = ch;
      bufW = w;
    } else {
      buf += ch;
      bufW += w;
    }
  }
  if (buf) parts.push({ ...token, text: buf, width: bufW });
  return parts.length ? parts : [token];
}

interface PendingLine {
  tokens: Token[];
  width: number;
}

/**
 * Greedy line breaker. Greedy (rather than Knuth-Plass) is the right call here:
 * teachers reflow content constantly while typing, so predictable, local and
 * fast beats globally optimal - a changed word never reshuffles earlier lines.
 */
export function wrapRuns(runs: Run[], base: BaseTextStyle, opts: WrapOptions): LineBox[] {
  const tokens = tokenize(runs, base);
  const indentAt = opts.indentAt ?? (() => 0);
  const lines: LineBox[] = [];

  let current: PendingLine = { tokens: [], width: 0 };
  let lineIndex = 0;
  let forced = false;

  const avail = (i: number) => Math.max(1, opts.widthAt(i) - indentAt(i));

  const flush = (isForced: boolean, isLast: boolean) => {
    lines.push(
      finaliseLine(current.tokens, {
        base,
        index: lineIndex,
        x: indentAt(lineIndex),
        available: avail(lineIndex),
        align: opts.align,
        lineHeight: opts.lineHeight,
        minLineHeight: opts.minLineHeight ?? 0,
        justify: opts.align === 'justify' && !isForced && !isLast,
        y: 0,
      }),
    );
    lineIndex += 1;
    current = { tokens: [], width: 0 };
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];

    if (token.kind === 'break') {
      forced = true;
      flush(true, false);
      continue;
    }

    if (token.kind === 'space' && current.tokens.length === 0) continue;

    const limit = avail(lineIndex);
    if (current.width + token.width <= limit || current.tokens.length === 0) {
      if (token.kind === 'word' && token.width > limit && current.tokens.length === 0) {
        const parts = breakLongWord(token, limit);
        // Place the first chunk, push the remainder back onto the queue.
        current.tokens.push(parts[0]);
        current.width += parts[0].width;
        tokens.splice(i + 1, 0, ...parts.slice(1));
        flush(false, false);
        continue;
      }
      current.tokens.push(token);
      current.width += token.width;
    } else {
      flush(false, false);
      if (token.kind === 'space') continue;
      current.tokens.push(token);
      current.width += token.width;
    }
  }

  if (current.tokens.length || lines.length === 0) flush(forced, true);

  // Stack the line boxes vertically.
  let y = 0;
  for (const line of lines) {
    line.y = y;
    y += line.height;
  }
  return lines;
}

interface FinaliseOpts {
  base: BaseTextStyle;
  index: number;
  x: number;
  y: number;
  available: number;
  align: Align;
  lineHeight: number;
  minLineHeight: number;
  justify: boolean;
}

function finaliseLine(tokens: Token[], o: FinaliseOpts): LineBox {
  // Trailing whitespace never contributes to the visible line width.
  const trimmed = [...tokens];
  while (trimmed.length && trimmed[trimmed.length - 1].kind === 'space') trimmed.pop();

  const items: TextItem[] = [];
  const spaceIdx: number[] = [];

  let i = 0;
  while (i < trimmed.length) {
    const start = trimmed[i];
    const isSpace = start.kind === 'space';
    let text = start.text;
    let j = i + 1;
    // Merge neighbouring tokens that share a style so the DOM and the PDF both
    // get a handful of runs per line rather than one node per word. Spaces stay
    // separate while justifying because their advance is about to change.
    while (
      j < trimmed.length &&
      trimmed[j].styleKey === start.styleKey &&
      !(o.justify && (trimmed[j].kind === 'space' || isSpace))
    ) {
      text += trimmed[j].text;
      j += 1;
    }
    if (o.justify && isSpace) spaceIdx.push(items.length);
    items.push({
      text,
      x: 0,
      width: measurer.width(text, start.font),
      font: start.font,
      color: start.color,
      underline: start.underline || undefined,
      strike: start.strike || undefined,
      highlight: start.highlight,
      rise: start.rise,
    });
    i = j;
  }

  let width = items.reduce((s, it) => s + it.width, 0);

  if (o.justify && spaceIdx.length && width < o.available) {
    const extra = (o.available - width) / spaceIdx.length;
    for (const idx of spaceIdx) items[idx].width += extra;
    width = o.available;
  }

  let offset = 0;
  if (o.align === 'center') offset = Math.max(0, (o.available - width) / 2);
  else if (o.align === 'right') offset = Math.max(0, o.available - width);

  let cursor = offset;
  for (const item of items) {
    item.x = cursor;
    cursor += item.width;
  }

  // Vertical metrics: half-leading around the tallest inline box, which is how
  // browsers position text inside a line box.
  const fonts = trimmed.length
    ? trimmed.map((t) => ({ font: t.font, rise: t.rise }))
    : [
        {
          font: {
            family: o.base.family,
            size: o.base.size,
            bold: o.base.bold,
            italic: o.base.italic,
            letterSpacing: o.base.letterSpacing,
          } as ResolvedFont,
          rise: 0,
        },
      ];

  const height = Math.max(
    o.minLineHeight,
    ...fonts.map((f) => f.font.size * o.lineHeight),
  );
  const maxAscent = Math.max(...fonts.map((f) => ascentPt(f.font) + f.rise));
  const maxDescent = Math.max(...fonts.map((f) => descentPt(f.font) - f.rise));
  const leading = height - (maxAscent + maxDescent);
  const baseline = leading / 2 + maxAscent;

  return { x: o.x, y: o.y, width, height, baseline, items, index: o.index };
}

/** Total height of a wrapped block. */
export const linesHeight = (lines: LineBox[]) =>
  lines.reduce((sum, l) => sum + l.height, 0);

/** Re-stack lines from y = 0 after a slice, keeping their intrinsic heights. */
export function restack(lines: LineBox[]): LineBox[] {
  let y = 0;
  return lines.map((l) => {
    const copy = { ...l, y };
    y += l.height;
    return copy;
  });
}

/** Convenience wrapper for single-line, non-wrapping text such as page numbers. */
export function measureRuns(runs: Run[], base: BaseTextStyle): number {
  return tokenize(runs, base).reduce((sum, t) => sum + t.width, 0);
}
