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

      // An explicit "off" has to be written out, or a word un-bolded inside a
      // bold heading would look bold in the editor and print plain.
      if (run.bold === false) styles.push('font-weight:400');
      if (run.italic === false) styles.push('font-style:normal');
      if (run.underline === false && !run.strike) styles.push('text-decoration:none');

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

  // Tri-state on purpose. A block can be bold on its own account - a heading
  // always is - so "not mentioned" and "explicitly switched off" have to be
  // different answers, or taking bold off one word inside a heading does
  // nothing at all.
  const weight = style.fontWeight;
  if (weight === 'bold' || Number(weight) >= 600) marks.bold = true;
  else if (weight === 'normal' || (weight !== '' && Number(weight) < 600)) marks.bold = false;

  if (style.fontStyle === 'italic') marks.italic = true;
  else if (style.fontStyle === 'normal') marks.italic = false;

  // Browsers write the shorthand as often as the longhand, and Word writes both.
  const decoration = `${style.textDecorationLine ?? ''} ${style.textDecoration ?? ''}`;
  if (decoration.includes('underline')) marks.underline = true;
  else if (decoration.includes('none')) marks.underline = false;
  if (decoration.includes('line-through')) marks.strike = true;

  // <font color> is what execCommand('foreColor') emits when the browser is not
  // in CSS mode, and what a paste from an older editor arrives as. Without this
  // the colour is applied in the DOM and then silently dropped on commit.
  if (element.tagName === 'FONT') {
    const attribute = normaliseColor(element.getAttribute('color') ?? '');
    if (attribute) marks.color = attribute;
  }

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
  if (marks.bold !== undefined) out.bold = marks.bold;
  if (marks.italic !== undefined) out.italic = marks.italic;
  if (marks.underline !== undefined) out.underline = marks.underline;
  if (marks.strike) out.strike = true;
  if (marks.color) out.color = marks.color;
  if (marks.highlight) out.highlight = marks.highlight;
  if (marks.script) out.script = marks.script;
  if (marks.letterSpacing) out.letterSpacing = marks.letterSpacing;
  return out;
};

const sameStyle = (a: Run, b: Run) =>
  // Compared exactly, not loosely: a run that says "not bold" is not the same
  // as one that says nothing, and merging them would lose the override.
  a.bold === b.bold &&
  a.italic === b.italic &&
  a.underline === b.underline &&
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
