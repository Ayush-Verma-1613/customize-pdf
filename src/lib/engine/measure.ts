import { fontStack } from '@/lib/model/defaults';
import { FONT_FILES, fontKey, type ResolvedFont } from './fonts';

/**
 * Text measurement is the foundation of every layout decision in the app, so it
 * has exactly one implementation per environment and both are cached hard.
 *
 * In the browser we measure with Canvas2D against the very same TTF that gets
 * embedded into the exported PDF, which is why wrapped line breaks are identical
 * on screen and on paper.
 */
export interface Measurer {
  width(text: string, font: ResolvedFont): number;
  ready(): boolean;
}

const cssFont = (f: ResolvedFont) =>
  `${f.italic ? 'italic ' : ''}${f.bold ? '700' : '400'} ${f.size}px ${fontStack(f.family)}`;

class CanvasMeasurer implements Measurer {
  private ctx: CanvasRenderingContext2D | null = null;
  private cache = new Map<string, number>();
  private lastFont = '';
  private loaded = false;

  private context(): CanvasRenderingContext2D | null {
    if (this.ctx) return this.ctx;
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    this.ctx = canvas.getContext('2d');
    return this.ctx;
  }

  markLoaded() {
    this.loaded = true;
    this.cache.clear();
  }

  ready() {
    return this.loaded;
  }

  width(text: string, font: ResolvedFont): number {
    if (!text) return 0;
    const key = `${fontKey(font)} ${text}`;
    const hit = this.cache.get(key);
    if (hit !== undefined) return hit;

    const ctx = this.context();
    let w: number;
    if (!ctx) {
      w = approxWidth(text, font);
    } else {
      const css = cssFont(font);
      if (css !== this.lastFont) {
        ctx.font = css;
        this.lastFont = css;
      }
      w = ctx.measureText(text).width;
    }
    // CSS letter-spacing adds tracking after every character, including the last.
    if (font.letterSpacing) w += font.letterSpacing * [...text].length;

    if (this.cache.size > 60000) this.cache.clear();
    this.cache.set(key, w);
    return w;
  }
}

/**
 * Deterministic fallback used during server rendering, before the webfonts have
 * loaded, and in tests. Widths are close enough to keep pagination stable; the
 * layout is recomputed once the real fonts report ready.
 */
const AVG_ADVANCE: Record<string, number> = {
  Inter: 0.52,
  Arimo: 0.52,
  Tinos: 0.48,
  Lora: 0.51,
  Cousine: 0.6,
};

const NARROW = new Set(['i', 'j', 'l', 't', 'f', 'r', '.', ',', ';', ':', '!', '|', "'", '"', '(', ')', '[', ']', '{', '}', 'I', ' ']);
const WIDE = new Set(['M', 'W', 'm', 'w', '@', '%']);

export function approxWidth(text: string, font: ResolvedFont): number {
  const base = AVG_ADVANCE[font.family] ?? 0.5;
  let units = 0;
  for (const ch of text) {
    if (NARROW.has(ch)) units += base * 0.55;
    else if (WIDE.has(ch)) units += base * 1.45;
    else if (ch >= 'A' && ch <= 'Z') units += base * 1.15;
    else units += base;
  }
  const bold = font.bold ? 1.03 : 1;
  return units * font.size * bold + font.letterSpacing * [...text].length;
}

class ApproxMeasurer implements Measurer {
  width(text: string, font: ResolvedFont) {
    return approxWidth(text, font);
  }
  ready() {
    return false;
  }
}

const canvasMeasurer = new CanvasMeasurer();
const approxMeasurer = new ApproxMeasurer();

export const measurer: Measurer =
  typeof document === 'undefined' ? approxMeasurer : canvasMeasurer;

let fontsPromise: Promise<void> | null = null;

/**
 * Registers every shipped face with the browser and resolves once they are all
 * available for measurement. Layout must not be trusted before this settles.
 */
export function ensureFontsLoaded(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  if (fontsPromise) return fontsPromise;

  fontsPromise = (async () => {
    const jobs: Promise<unknown>[] = [];
    for (const [family, styles] of Object.entries(FONT_FILES)) {
      for (const [style, url] of Object.entries(styles)) {
        const face = new FontFace(family, `url(${url})`, {
          weight: style.includes('Bold') ? '700' : '400',
          style: style.includes('Italic') ? 'italic' : 'normal',
          display: 'block',
        });
        jobs.push(
          face.load().then((f) => {
            document.fonts.add(f);
          }),
        );
      }
    }
    await Promise.allSettled(jobs);
    await document.fonts.ready;
    canvasMeasurer.markLoaded();
  })();

  return fontsPromise;
}

export const fontsReady = () => measurer.ready();
