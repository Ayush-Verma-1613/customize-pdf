/**
 * Core document model.
 *
 * Everything is stored as structured data - never as a flattened image - so any
 * element stays editable after it has been laid out, saved, reloaded or exported.
 *
 * Units: all geometry is in PostScript points (1pt = 1/72in). A4 = 595.28 x 841.89.
 * Origin is the top-left of the page, y grows downwards.
 */

export type Align = 'left' | 'center' | 'right' | 'justify';
export type VAlign = 'top' | 'middle' | 'bottom';

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type PageSizeName = 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal' | 'Custom';
export type Orientation = 'portrait' | 'landscape';

export interface PageSetup {
  size: PageSizeName;
  /** Portrait-oriented width/height in pt. Orientation is applied on top. */
  width: number;
  height: number;
  orientation: Orientation;
  margins: Margins;
  /** Number of text columns for the flow content. */
  columns: number;
  columnGap: number;
  /** Optional decorative border drawn just outside the content area. */
  border?: PageBorder;
  background?: string;
}

export interface PageBorder {
  color: string;
  width: number;
  /** Distance from the page edge. */
  inset: number;
  style: 'solid' | 'dashed' | 'dotted' | 'double';
  radius: number;
}

/* ------------------------------------------------------------------ *
 * Inline text
 * ------------------------------------------------------------------ */

export type FontFamily = 'Inter' | 'Arimo' | 'Tinos' | 'Lora' | 'Cousine';

/** A contiguous span of text sharing one set of character-level attributes. */
export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  /** Highlight colour painted behind the glyphs. */
  highlight?: string;
  family?: FontFamily;
  /** Absolute size in pt; falls back to the block size. */
  size?: number;
  letterSpacing?: number;
  script?: 'super' | 'sub';
  /**
   * Where the words point. The address itself is never drawn - it sits behind
   * the text it was attached to and travels with it, into the PDF as a real
   * clickable region.
   */
  link?: string;
}

/* ------------------------------------------------------------------ *
 * Block-level styling
 * ------------------------------------------------------------------ */

export interface BlockStyle {
  align?: Align;
  family?: FontFamily;
  size?: number;
  /** Multiplier of font size. */
  lineHeight?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  letterSpacing?: number;
  /** Vertical space reserved before / after the block, in pt. */
  spaceBefore?: number;
  spaceAfter?: number;
  indentLeft?: number;
  indentRight?: number;
  firstLineIndent?: number;
  background?: string;
  border?: BoxBorder;
  padding?: Partial<Margins>;
  /** Force the block to start on a fresh page. */
  breakBefore?: boolean;
  /** Try to keep this block on the same page as the following one. */
  keepWithNext?: boolean;
  /** Never split this block across a page boundary. */
  keepTogether?: boolean;
  /** Minimum lines left behind / carried over when splitting. */
  widows?: number;
  orphans?: number;
}

export interface BoxBorder {
  color: string;
  width: number;
  style: 'solid' | 'dashed' | 'dotted';
  radius?: number;
  sides?: { top?: boolean; right?: boolean; bottom?: boolean; left?: boolean };
}

/* ------------------------------------------------------------------ *
 * Flow blocks - the auto-laid-out content stream
 * ------------------------------------------------------------------ */

interface BlockBase {
  id: string;
  style?: BlockStyle;
  locked?: boolean;
  /** Collapsed in the outline panel. */
  note?: string;
  /**
   * Written by a template rather than by the person using it, and therefore
   * safe to regenerate. Cleared the moment anybody edits the block, because
   * from then on the words are theirs.
   */
  generated?: boolean;
}

export interface HeadingBlock extends BlockBase {
  type: 'heading';
  level: 1 | 2 | 3 | 4;
  runs: Run[];
}

export interface ParagraphBlock extends BlockBase {
  type: 'paragraph';
  runs: Run[];
}

/** "Section A", with optional instruction line and section marks. */
export interface SectionBlock extends BlockBase {
  type: 'section';
  runs: Run[];
  instructions?: Run[];
  /** Restart question numbering from 1 inside this section. */
  restartNumbering?: boolean;
  marks?: number;
  rule?: boolean;
}

export interface QuestionPart {
  id: string;
  runs: Run[];
  marks?: number;
  /** Ruled answer lines rendered under this part. */
  answerLines?: number;
}

export interface QuestionBlock extends BlockBase {
  type: 'question';
  runs: Run[];
  marks?: number;
  parts?: QuestionPart[];
  /** Multiple-choice options rendered in a grid. */
  options?: Run[][];
  optionColumns?: number;
  answerLines?: number;
  /** Overrides the computed number when the teacher wants a fixed label. */
  numberOverride?: string;
}

export interface ListBlock extends BlockBase {
  type: 'list';
  variant: 'bullet' | 'number' | 'alpha' | 'roman' | 'none';
  items: Run[][];
  /** Nesting depth per item, 0-based. */
  levels?: number[];
}

export interface CheckboxListBlock extends BlockBase {
  type: 'checklist';
  items: { runs: Run[]; checked?: boolean }[];
  columns?: number;
}

export interface ImageBlock extends BlockBase {
  type: 'image';
  src: string;
  alt?: string;
  /** Natural pixel dimensions, used to preserve aspect ratio. */
  naturalWidth?: number;
  naturalHeight?: number;
  /** Rendered width in pt; height derives from the aspect ratio unless set. */
  width?: number;
  height?: number;
  fit: 'contain' | 'cover' | 'fill';
  caption?: Run[];
  radius?: number;
  crop?: CropRect;
}

export interface CropRect {
  /** Normalised 0..1 crop window into the source image. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DividerBlock extends BlockBase {
  type: 'divider';
  thickness: number;
  color: string;
  dash: 'solid' | 'dashed' | 'dotted';
  /** Fraction of the content width, 0..1. */
  width: number;
}

export interface SpacerBlock extends BlockBase {
  type: 'spacer';
  height: number;
}

export interface AnswerLinesBlock extends BlockBase {
  type: 'answerLines';
  count: number;
  gap: number;
  color: string;
  dash: 'solid' | 'dashed' | 'dotted';
}

export interface PageBreakBlock extends BlockBase {
  type: 'pageBreak';
}

/* Tables ----------------------------------------------------------- */

export interface TableCell {
  id: string;
  runs: Run[];
  /** Column span / row span. Cells covered by a span are omitted. */
  colSpan?: number;
  rowSpan?: number;
  align?: Align;
  vAlign?: VAlign;
  background?: string;
  bold?: boolean;
  padding?: Partial<Margins>;
  /** Per-cell border overrides. */
  border?: Partial<Record<'top' | 'right' | 'bottom' | 'left', BoxBorder | null>>;
}

export interface TableRow {
  id: string;
  cells: TableCell[];
  /** Minimum height in pt; the row grows to fit its content. */
  minHeight?: number;
  isHeader?: boolean;
}

export interface TableBlock extends BlockBase {
  type: 'table';
  /** Relative column widths; normalised against the available width. */
  columns: number[];
  rows: TableRow[];
  border: BoxBorder;
  /** Draw grid lines between cells. */
  innerBorder: BoxBorder | null;
  /** Repeat header rows when the table continues onto the next page. */
  repeatHeader: boolean;
  zebra?: string;
  cellPadding: Margins;
  /** Fraction of content width, 0..1. */
  widthFactor?: number;
}

export type Block =
  | HeadingBlock
  | ParagraphBlock
  | SectionBlock
  | QuestionBlock
  | ListBlock
  | CheckboxListBlock
  | ImageBlock
  | DividerBlock
  | SpacerBlock
  | AnswerLinesBlock
  | PageBreakBlock
  | TableBlock;

export type BlockType = Block['type'];

/* ------------------------------------------------------------------ *
 * Overlay elements - free, absolutely positioned, per page
 * ------------------------------------------------------------------ */

interface OverlayBase {
  id: string;
  /** Zero-based index of the page this element is pinned to. */
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  z: number;
  name?: string;
}

export interface TextOverlay extends OverlayBase {
  kind: 'text';
  runs: Run[];
  style: BlockStyle;
  vAlign: VAlign;
  /** Grow the box height to fit the text instead of clipping. */
  autoHeight: boolean;
}

export interface ImageOverlay extends OverlayBase {
  kind: 'image';
  src: string;
  fit: 'contain' | 'cover' | 'fill';
  radius: number;
  crop?: CropRect;
  naturalWidth?: number;
  naturalHeight?: number;
}

export type ShapeKind = 'rect' | 'ellipse' | 'triangle' | 'star' | 'arrow';

export interface ShapeOverlay extends OverlayBase {
  kind: 'shape';
  shape: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
  dash: 'solid' | 'dashed' | 'dotted';
}

export interface LineOverlay extends OverlayBase {
  kind: 'line';
  stroke: string;
  strokeWidth: number;
  dash: 'solid' | 'dashed' | 'dotted';
  /** Line runs from (x,y) to (x+width, y+height). */
  arrowEnd?: boolean;
}

export interface TableOverlay extends OverlayBase {
  kind: 'table';
  table: Omit<TableBlock, 'id' | 'type'>;
}

export interface CheckboxOverlay extends OverlayBase {
  kind: 'checkbox';
  checked: boolean;
  stroke: string;
  label?: Run[];
  style?: BlockStyle;
}

export type Overlay =
  | TextOverlay
  | ImageOverlay
  | ShapeOverlay
  | LineOverlay
  | TableOverlay
  | CheckboxOverlay;

export type OverlayKind = Overlay['kind'];

/* ------------------------------------------------------------------ *
 * Master page furniture - header, footer, page numbers, watermark
 * ------------------------------------------------------------------ */

export interface HeaderFooterSlot {
  left: Run[];
  center: Run[];
  right: Run[];
}

export interface HeaderFooter {
  enabled: boolean;
  slots: HeaderFooterSlot;
  /** Distance from the page edge to the baseline band, in pt. */
  offset: number;
  style: BlockStyle;
  rule: boolean;
  ruleColor: string;
  showOnFirstPage: boolean;
}

export interface Watermark {
  enabled: boolean;
  text: string;
  color: string;
  opacity: number;
  size: number;
  rotation: number;
}

export interface MasterConfig {
  header: HeaderFooter;
  footer: HeaderFooter;
  watermark: Watermark;
}

/* ------------------------------------------------------------------ *
 * Theme + document
 * ------------------------------------------------------------------ */

export interface Theme {
  bodyFamily: FontFamily;
  headingFamily: FontFamily;
  bodySize: number;
  lineHeight: number;
  textColor: string;
  accent: string;
  muted: string;
  /** Scale factors applied to bodySize for h1..h4. */
  headingScale: [number, number, number, number];
}

export interface NumberingConfig {
  /** Format string; {n} is the question number. */
  questionFormat: string;
  partFormat: string;
  partStyle: 'alpha' | 'roman' | 'number';
  /** Reserved width for the number gutter, in pt. 0 = auto. */
  gutter: number;
  /** How marks are rendered next to a question. */
  marksFormat: string;
  showMarks: boolean;
  /**
   * Where the marks label sits: out at the right margin, which is how a
   * printed exam paper reads, or hard against the end of the text it belongs
   * to, which suits a worksheet or a short-answer sheet.
   */
  marksPosition: 'margin' | 'inline';
  /** Restart numbering at every section block. */
  restartEachSection: boolean;
}

export interface PaperDoc {
  id: string;
  title: string;
  templateId?: string;
  /** Which of the template's body layouts built this document. */
  variantId?: string;
  page: PageSetup;
  theme: Theme;
  numbering: NumberingConfig;
  master: MasterConfig;
  /** The auto-laid-out content stream. */
  flow: Block[];
  /** Free-floating elements pinned to specific pages. */
  overlays: Overlay[];
  /** Arbitrary key/values available to header/footer tokens. */
  fields: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  /** Bumped on every schema change so old saves can be migrated. */
  schema: number;
}

export const SCHEMA_VERSION = 1;
