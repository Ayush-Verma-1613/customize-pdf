import type { ShapeKind } from '@/lib/model/types';

/**
 * Geometry shared by the two renderers. The SVG canvas and the PDF exporter
 * both draw from these, so a star on screen is the same star on paper.
 */

export type DashStyle = 'solid' | 'dashed' | 'dotted';

export const dashPattern = (dash: DashStyle, width: number): number[] | undefined =>
  dash === 'dashed'
    ? [width * 3, width * 2]
    : dash === 'dotted'
      ? [width, width * 2]
      : undefined;

export const dashAttr = (dash: DashStyle, width: number): string | undefined =>
  dashPattern(dash, width)?.join(' ');

/** Path in a local, y-down coordinate box of `w` x `h`. */
export function shapePath(shape: ShapeKind, w: number, h: number): string {
  switch (shape) {
    case 'triangle':
      return `M ${w / 2} 0 L ${w} ${h} L 0 ${h} Z`;
    case 'star': {
      const cx = w / 2;
      const cy = h / 2;
      const outer = Math.min(w, h) / 2;
      const inner = outer * 0.42;
      const points: string[] = [];
      for (let i = 0; i < 10; i += 1) {
        const r = i % 2 === 0 ? outer : inner;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        points.push(`${(cx + r * Math.cos(a)).toFixed(3)} ${(cy + r * Math.sin(a)).toFixed(3)}`);
      }
      return `M ${points.join(' L ')} Z`;
    }
    case 'arrow': {
      const shaft = h * 0.32;
      const headW = Math.min(w * 0.36, h);
      return [
        `M 0 ${h / 2 - shaft / 2}`,
        `L ${w - headW} ${h / 2 - shaft / 2}`,
        `L ${w - headW} 0`,
        `L ${w} ${h / 2}`,
        `L ${w - headW} ${h}`,
        `L ${w - headW} ${h / 2 + shaft / 2}`,
        `L 0 ${h / 2 + shaft / 2}`,
        'Z',
      ].join(' ');
    }
    case 'ellipse':
      return `M 0 ${h / 2} A ${w / 2} ${h / 2} 0 1 0 ${w} ${h / 2} A ${w / 2} ${h / 2} 0 1 0 0 ${h / 2} Z`;
    default:
      return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
  }
}

/** Tick mark drawn inside a checkbox of side `size`. */
export const checkPath = (size: number) =>
  `M ${size * 0.2} ${size * 0.52} L ${size * 0.42} ${size * 0.75} L ${size * 0.82} ${size * 0.22}`;

/** Baseline offsets for text decorations, as a fraction of the font size. */
export const UNDERLINE_OFFSET = 0.12;
export const STRIKE_OFFSET = -0.28;
export const DECORATION_THICKNESS = 0.055;
