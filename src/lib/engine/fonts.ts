import type { FontFamily } from '@/lib/model/types';

export type FontStyleName = 'Regular' | 'Bold' | 'Italic' | 'BoldItalic';

export interface VerticalMetrics {
  /** All values are fractions of the em square. */
  ascent: number;
  descent: number;
  lineGap: number;
  capHeight: number;
  xHeight: number;
}

/**
 * Vertical metrics read straight out of the shipped TTFs (hhea table, which is
 * what browsers use for these faces since none sets USE_TYPO_METRICS). Baking
 * them in keeps the on-screen baseline and the PDF baseline identical without
 * having to introspect the font at runtime.
 */
export const FONT_METRICS: Record<FontFamily, VerticalMetrics> = {
  Inter: { ascent: 1984 / 2048, descent: 494 / 2048, lineGap: 0, capHeight: 1490 / 2048, xHeight: 1118 / 2048 },
  Arimo: { ascent: 1854 / 2048, descent: 434 / 2048, lineGap: 67 / 2048, capHeight: 1409 / 2048, xHeight: 1082 / 2048 },
  Tinos: { ascent: 1825 / 2048, descent: 443 / 2048, lineGap: 87 / 2048, capHeight: 1341 / 2048, xHeight: 940 / 2048 },
  Lora: { ascent: 1.006, descent: 0.274, lineGap: 0, capHeight: 0.7, xHeight: 0.5 },
  Cousine: { ascent: 1705 / 2048, descent: 615 / 2048, lineGap: 0, capHeight: 1349 / 2048, xHeight: 1082 / 2048 },
};

export const FONT_FILES: Record<FontFamily, Record<FontStyleName, string>> = (() => {
  const fams: FontFamily[] = ['Inter', 'Arimo', 'Tinos', 'Lora', 'Cousine'];
  const styles: FontStyleName[] = ['Regular', 'Bold', 'Italic', 'BoldItalic'];
  const out = {} as Record<FontFamily, Record<FontStyleName, string>>;
  for (const f of fams) {
    out[f] = {} as Record<FontStyleName, string>;
    for (const s of styles) out[f][s] = `/fonts/${f}-${s}.ttf`;
  }
  return out;
})();

export const styleName = (bold?: boolean, italic?: boolean): FontStyleName =>
  bold && italic ? 'BoldItalic' : bold ? 'Bold' : italic ? 'Italic' : 'Regular';

/** A fully resolved character-level font, the unit both measurement and drawing work with. */
export interface ResolvedFont {
  family: FontFamily;
  size: number;
  bold: boolean;
  italic: boolean;
  letterSpacing: number;
}

export const fontKey = (f: ResolvedFont) =>
  `${f.family}/${f.size}/${f.bold ? 1 : 0}${f.italic ? 1 : 0}/${f.letterSpacing}`;

export const metricsOf = (f: ResolvedFont) => FONT_METRICS[f.family] ?? FONT_METRICS.Tinos;

export const ascentPt = (f: ResolvedFont) => metricsOf(f).ascent * f.size;
export const descentPt = (f: ResolvedFont) => metricsOf(f).descent * f.size;

/** Natural (unleaded) line height for a font, matching `line-height: normal`. */
export const naturalLineHeight = (f: ResolvedFont) => {
  const m = metricsOf(f);
  return (m.ascent + m.descent + m.lineGap) * f.size;
};
