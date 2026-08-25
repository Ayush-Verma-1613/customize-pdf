import type { Run } from '@/lib/model/types';

/**
 * Lightweight inline markup so a teacher can type emphasis without leaving the
 * keyboard. Deliberately a small, closed set: every marker is unambiguous and
 * the round-trip back to plain text is lossless.
 *
 *   **bold**   *italic*   __underline__   ~~strike~~   ==highlight==
 *   ^{super}   _{sub}
 */

interface Marker {
  open: string;
  close: string;
  apply: (run: Run) => Run;
}

const MARKERS: Marker[] = [
  { open: '**', close: '**', apply: (r) => ({ ...r, bold: true }) },
  { open: '__', close: '__', apply: (r) => ({ ...r, underline: true }) },
  { open: '~~', close: '~~', apply: (r) => ({ ...r, strike: true }) },
  { open: '==', close: '==', apply: (r) => ({ ...r, highlight: '#fef08a' }) },
  { open: '^{', close: '}', apply: (r) => ({ ...r, script: 'super' }) },
  { open: '_{', close: '}', apply: (r) => ({ ...r, script: 'sub' }) },
  { open: '*', close: '*', apply: (r) => ({ ...r, italic: true }) },
];

export function parseInline(input: string, base: Partial<Run> = {}): Run[] {
  const out: Run[] = [];
  let buffer = '';
  let i = 0;

  const flush = () => {
    if (buffer) {
      out.push({ ...base, text: buffer });
      buffer = '';
    }
  };

  while (i < input.length) {
    const marker = MARKERS.find((m) => input.startsWith(m.open, i));
    if (marker) {
      const end = input.indexOf(marker.close, i + marker.open.length);
      if (end > i) {
        const inner = input.slice(i + marker.open.length, end);
        if (inner) {
          flush();
          for (const run of parseInline(inner, base)) out.push(marker.apply(run));
        }
        i = end + marker.close.length;
        continue;
      }
    }
    buffer += input[i];
    i += 1;
  }
  flush();
  return out.length ? out : [{ ...base, text: '' }];
}

/** Turn runs back into the markup a teacher typed, for round-tripping. */
export function runsToMarkup(runs: Run[]): string {
  return (runs ?? [])
    .map((run) => {
      let t = run.text ?? '';
      if (!t) return '';
      if (run.script === 'super') t = `^{${t}}`;
      if (run.script === 'sub') t = `_{${t}}`;
      if (run.highlight) t = `==${t}==`;
      if (run.strike) t = `~~${t}~~`;
      if (run.underline) t = `__${t}__`;
      if (run.italic) t = `*${t}*`;
      if (run.bold) t = `**${t}**`;
      return t;
    })
    .join('');
}
