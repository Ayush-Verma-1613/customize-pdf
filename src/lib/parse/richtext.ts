import type { Run } from '@/lib/model/types';

/**
 * Bridge between the run array the layout engine consumes and the HTML a
 * contentEditable produces. Only the formatting the model can represent
 * survives the round trip; everything else - pasted fonts, sizes, spans from
 * Word - is deliberately discarded so a paste can never smuggle in styling the
 * document model cannot render or export.
 */

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export function runsToHtml(runs: Run[]): string {
  if (!runs?.length) return '';
  return runs
    .map((run) => {
      const text = escapeHtml(run.text ?? '').replace(/\n/g, '<br>');
      if (!text) return '';
      const styles: string[] = [];
      if (run.color) styles.push(`color:${run.color}`);
      if (run.highlight) styles.push(`background-color:${run.highlight}`);
      if (run.letterSpacing) styles.push(`letter-spacing:${run.letterSpacing}px`);

      let html = text;
      if (run.script === 'super') html = `<sup>${html}</sup>`;
      if (run.script === 'sub') html = `<sub>${html}</sub>`;
      if (run.strike) html = `<s>${html}</s>`;
      if (run.underline) html = `<u>${html}</u>`;
      if (run.italic) html = `<em>${html}</em>`;
      if (run.bold) html = `<strong>${html}</strong>`;
      if (styles.length) html = `<span style="${styles.join(';')}">${html}</span>`;
      return html;
    })
    .join('');
}

interface Marks {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  highlight?: string;
  script?: 'super' | 'sub';
  letterSpacing?: number;
}

const TAG_MARKS: Record<string, Marks> = {
  B: { bold: true },
  STRONG: { bold: true },
  I: { italic: true },
  EM: { italic: true },
  U: { underline: true },
  INS: { underline: true },
  S: { strike: true },
  STRIKE: { strike: true },
  DEL: { strike: true },
  SUP: { script: 'super' },
  SUB: { script: 'sub' },
  MARK: { highlight: '#fef08a' },
};

const normaliseColor = (value: string): string | undefined => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed === 'transparent' || trimmed.startsWith('rgba(0, 0, 0, 0')) return undefined;
  const rgb = trimmed.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgb) {
    const hex = [rgb[1], rgb[2], rgb[3]]
      .map((n) => Number(n).toString(16).padStart(2, '0'))
      .join('');
    return `#${hex}`;
  }
  return trimmed.startsWith('#') ? trimmed : undefined;
};

function marksFromElement(element: HTMLElement): Marks {
  const marks: Marks = { ...(TAG_MARKS[element.tagName] ?? {}) };
  const style = element.style;

  if (style.fontWeight === 'bold' || Number(style.fontWeight) >= 600) marks.bold = true;
  if (style.fontStyle === 'italic') marks.italic = true;
  if (style.textDecorationLine?.includes('underline')) marks.underline = true;
  if (style.textDecorationLine?.includes('line-through')) marks.strike = true;

  const color = normaliseColor(style.color ?? '');
  if (color) marks.color = color;
  const highlight = normaliseColor(style.backgroundColor ?? '');
  if (highlight && highlight !== '#ffffff') marks.highlight = highlight;
  const spacing = parseFloat(style.letterSpacing ?? '');
  if (Number.isFinite(spacing) && spacing !== 0) marks.letterSpacing = spacing;

  return marks;
}

/** Parse contentEditable HTML into runs, merging neighbours that match. */
export function htmlToRuns(html: string): Run[] {
  if (typeof document === 'undefined') return [{ text: stripTags(html) }];
  const host = document.createElement('div');
  host.innerHTML = html;

  const runs: Run[] = [];

  const push = (text: string, marks: Marks) => {
    if (!text) return;
    const previous = runs[runs.length - 1];
    const candidate: Run = { text, ...cleanMarks(marks) };
    if (previous && sameStyle(previous, candidate)) {
      previous.text += text;
      return;
    }
    runs.push(candidate);
  };

  const walk = (node: Node, inherited: Marks) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        push((child.textContent ?? '').replace(/ /g, ' '), inherited);
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      const element = child as HTMLElement;

      if (element.tagName === 'BR') {
        push('\n', inherited);
        continue;
      }
      // Block-level children inside a single-paragraph editor become newlines.
      const isBlock = /^(DIV|P|LI|TR)$/.test(element.tagName);
      if (isBlock && runs.length) push('\n', inherited);

      walk(element, { ...inherited, ...marksFromElement(element) });
    }
  };

  walk(host, {});
  return runs.length ? runs : [{ text: '' }];
}

const cleanMarks = (marks: Marks): Partial<Run> => {
  const out: Partial<Run> = {};
  if (marks.bold) out.bold = true;
  if (marks.italic) out.italic = true;
  if (marks.underline) out.underline = true;
  if (marks.strike) out.strike = true;
  if (marks.color) out.color = marks.color;
  if (marks.highlight) out.highlight = marks.highlight;
  if (marks.script) out.script = marks.script;
  if (marks.letterSpacing) out.letterSpacing = marks.letterSpacing;
  return out;
};

const sameStyle = (a: Run, b: Run) =>
  !!a.bold === !!b.bold &&
  !!a.italic === !!b.italic &&
  !!a.underline === !!b.underline &&
  !!a.strike === !!b.strike &&
  a.color === b.color &&
  a.highlight === b.highlight &&
  a.script === b.script &&
  a.letterSpacing === b.letterSpacing &&
  a.family === b.family &&
  a.size === b.size;

export const stripTags = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

export const runsToPlainText = (runs: Run[] | undefined) =>
  (runs ?? []).map((r) => r.text ?? '').join('');

/** Character marks the run-level toolbar can switch on and off. */
export type BooleanMark = 'bold' | 'italic' | 'underline' | 'strike';

export const marksActive = (runs: Run[], mark: BooleanMark) =>
  runs.length > 0 && runs.every((run) => Boolean(run[mark]));

/** Toggle a boolean mark across every run in a block. */
export function toggleMark(runs: Run[], mark: BooleanMark): Run[] {
  const turnOff = marksActive(runs, mark);
  return runs.map((run) => {
    const next: Run = { ...run };
    if (turnOff) delete next[mark];
    else next[mark] = true;
    return next;
  });
}

/** Set (or clear, when value is undefined) a valued attribute on every run. */
export function setRunAttribute<K extends keyof Run>(
  runs: Run[],
  key: K,
  value: Run[K] | undefined,
): Run[] {
  return runs.map((run) => {
    const next: Run = { ...run };
    if (value === undefined) delete next[key];
    else next[key] = value;
    return next;
  });
}
