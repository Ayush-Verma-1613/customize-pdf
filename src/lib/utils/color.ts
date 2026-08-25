export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parse #rgb, #rrggbb, #rrggbbaa or rgb()/rgba() into 0..1 components. */
export function parseColor(input: string | undefined | null): { rgb: Rgb; alpha: number } {
  const fallback = { rgb: { r: 0, g: 0, b: 0 }, alpha: 1 };
  if (!input) return fallback;
  const s = input.trim().toLowerCase();
  if (s === 'transparent' || s === 'none') return { rgb: { r: 0, g: 0, b: 0 }, alpha: 0 };

  if (s.startsWith('#')) {
    let hex = s.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    if (hex.length !== 6 && hex.length !== 8) return fallback;
    const n = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255;
    return {
      rgb: { r: n(0), g: n(2), b: n(4) },
      alpha: hex.length === 8 ? n(6) : 1,
    };
  }

  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    if (parts.length >= 3) {
      return {
        rgb: { r: parts[0] / 255, g: parts[1] / 255, b: parts[2] / 255 },
        alpha: parts.length > 3 ? parts[3] : 1,
      };
    }
  }
  return fallback;
}

export const isTransparent = (c?: string | null) => !c || parseColor(c).alpha === 0;

export function withAlpha(color: string, alpha: number): string {
  const { rgb } = parseColor(color);
  const to = (v: number) => Math.round(v * 255);
  return `rgba(${to(rgb.r)}, ${to(rgb.g)}, ${to(rgb.b)}, ${alpha})`;
}

/** Perceived luminance, used to pick readable foregrounds. */
export function luminance(color: string): number {
  const { rgb } = parseColor(color);
  const f = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(rgb.r) + 0.7152 * f(rgb.g) + 0.0722 * f(rgb.b);
}

export const readableOn = (bg: string) => (luminance(bg) > 0.55 ? '#111827' : '#ffffff');
