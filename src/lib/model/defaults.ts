import type {
  FontFamily,
  Margins,
  MasterConfig,
  NumberingConfig,
  PageSetup,
  PageSizeName,
  Theme,
} from './types';

/** Portrait dimensions in points. */
export const PAGE_SIZES: Record<Exclude<PageSizeName, 'Custom'>, { width: number; height: number; label: string }> = {
  A3: { width: 841.89, height: 1190.55, label: 'A3  297 × 420 mm' },
  A4: { width: 595.28, height: 841.89, label: 'A4  210 × 297 mm' },
  A5: { width: 419.53, height: 595.28, label: 'A5  148 × 210 mm' },
  Letter: { width: 612, height: 792, label: 'Letter  8.5 × 11 in' },
  Legal: { width: 612, height: 1008, label: 'Legal  8.5 × 14 in' },
};

export const MM_PER_PT = 25.4 / 72;
export const PT_PER_MM = 72 / 25.4;
export const PT_PER_IN = 72;
/** CSS pixels per point at 100% zoom. */
export const PX_PER_PT = 96 / 72;

export const mmToPt = (mm: number) => mm * PT_PER_MM;
export const ptToMm = (pt: number) => pt * MM_PER_PT;

export const FONT_FAMILIES: { id: FontFamily; label: string; hint: string; stack: string }[] = [
  { id: 'Tinos', label: 'Tinos', hint: 'Serif · Times-compatible', stack: `'Tinos', 'Times New Roman', serif` },
  { id: 'Arimo', label: 'Arimo', hint: 'Sans · Arial-compatible', stack: `'Arimo', Arial, sans-serif` },
  { id: 'Inter', label: 'Inter', hint: 'Sans · modern UI', stack: `'Inter', system-ui, sans-serif` },
  { id: 'Lora', label: 'Lora', hint: 'Serif · elegant', stack: `'Lora', Georgia, serif` },
  { id: 'Cousine', label: 'Cousine', hint: 'Mono · Courier-compatible', stack: `'Cousine', 'Courier New', monospace` },
];

export const fontStack = (f: FontFamily | undefined): string =>
  FONT_FAMILIES.find((x) => x.id === f)?.stack ?? FONT_FAMILIES[0].stack;

export const defaultMargins = (): Margins => ({ top: 48, right: 48, bottom: 48, left: 48 });

export const defaultPageSetup = (): PageSetup => ({
  size: 'A4',
  width: PAGE_SIZES.A4.width,
  height: PAGE_SIZES.A4.height,
  orientation: 'portrait',
  margins: defaultMargins(),
  columns: 1,
  columnGap: 24,
});

export const defaultTheme = (): Theme => ({
  bodyFamily: 'Tinos',
  headingFamily: 'Tinos',
  bodySize: 11,
  lineHeight: 1.35,
  textColor: '#111827',
  accent: '#1d4ed8',
  muted: '#6b7280',
  headingScale: [2.0, 1.45, 1.2, 1.05],
});

export const defaultNumbering = (): NumberingConfig => ({
  questionFormat: '{n}.',
  partFormat: '({n})',
  partStyle: 'alpha',
  gutter: 0,
  marksFormat: '[{n}]',
  showMarks: true,
  restartEachSection: false,
});

export const emptySlots = () => ({ left: [], center: [], right: [] });

export const defaultMaster = (): MasterConfig => ({
  header: {
    enabled: false,
    slots: emptySlots(),
    offset: 24,
    style: { size: 9, color: '#6b7280', family: 'Arimo' },
    rule: false,
    ruleColor: '#d1d5db',
    showOnFirstPage: false,
  },
  footer: {
    enabled: true,
    slots: {
      left: [],
      center: [{ text: 'Page {{page}} of {{pages}}' }],
      right: [],
    },
    offset: 24,
    style: { size: 9, color: '#6b7280', family: 'Arimo' },
    rule: false,
    ruleColor: '#d1d5db',
    showOnFirstPage: true,
  },
  watermark: {
    enabled: false,
    text: 'DRAFT',
    color: '#94a3b8',
    opacity: 0.14,
    size: 96,
    rotation: -35,
  },
});

/** Effective page box after applying orientation. */
export function pageBox(page: PageSetup) {
  const portrait = page.orientation === 'portrait';
  return {
    width: portrait ? page.width : page.height,
    height: portrait ? page.height : page.width,
  };
}

export function contentBox(page: PageSetup) {
  const { width, height } = pageBox(page);
  const m = page.margins;
  return {
    x: m.left,
    y: m.top,
    width: Math.max(1, width - m.left - m.right),
    height: Math.max(1, height - m.top - m.bottom),
  };
}

export const HEADING_SPACING: Record<number, { before: number; after: number }> = {
  1: { before: 0, after: 8 },
  2: { before: 14, after: 6 },
  3: { before: 10, after: 4 },
  4: { before: 8, after: 3 },
};

export const PALETTE = [
  '#111827', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#ffffff',
  '#b91c1c', '#dc2626', '#ea580c', '#d97706', '#ca8a04', '#65a30d',
  '#16a34a', '#059669', '#0d9488', '#0891b2', '#0284c7', '#1d4ed8',
  '#4f46e5', '#7c3aed', '#9333ea', '#c026d3', '#db2777', '#e11d48',
];

export const HIGHLIGHTS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#e9d5ff'];
