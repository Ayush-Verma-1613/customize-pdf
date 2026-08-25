import type { BoxBorder, CropRect, Margins, ShapeKind } from '@/lib/model/types';
import type { ResolvedFont } from './fonts';

/**
 * The layout engine turns a PaperDoc into a LaidOutDoc: a flat, fully resolved
 * list of frames per page with absolute geometry and no remaining decisions.
 *
 * Both renderers - the DOM editor and the PDF exporter - consume this exact
 * structure, which is what makes "the PDF matches the editor" true by
 * construction rather than by careful duplication.
 */

/** Where a frame came from, so clicking it can select the right thing. */
export interface FrameSource {
  kind: 'flow' | 'overlay' | 'master';
  /** Block id or overlay id. */
  id: string;
  /** Index of the piece when a block was split across pages. */
  part?: number;
  /** For tables: the row / cell the frame belongs to. */
  rowId?: string;
  cellId?: string;
}

export interface TextItem {
  text: string;
  /** Offset from the line origin. */
  x: number;
  width: number;
  font: ResolvedFont;
  color: string;
  underline?: boolean;
  strike?: boolean;
  highlight?: string;
  /** Baseline shift in pt, positive moves up (superscript). */
  rise: number;
}

export interface LineBox {
  /** Frame-local position of the line box. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Distance from the top of the line box down to the baseline. */
  baseline: number;
  items: TextItem[];
  /** Index of the source line before pagination, useful for caret mapping. */
  index: number;
}

interface FrameBase {
  id: string;
  source: FrameSource;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  /** Frames flagged interactive can be selected and dragged in the editor. */
  selectable?: boolean;
}

export interface TextFrame extends FrameBase {
  kind: 'text';
  lines: LineBox[];
  background?: string;
  border?: BoxBorder;
  padding?: Margins;
}

export interface ImageFrame extends FrameBase {
  kind: 'image';
  src: string;
  fit: 'contain' | 'cover' | 'fill';
  radius: number;
  crop?: CropRect;
}

export interface ShapeFrame extends FrameBase {
  kind: 'shape';
  shape: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
  dash: 'solid' | 'dashed' | 'dotted';
}

export interface LineFrame extends FrameBase {
  kind: 'line';
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth: number;
  dash: 'solid' | 'dashed' | 'dotted';
  arrowEnd?: boolean;
}

export interface RuleFrame extends FrameBase {
  kind: 'rule';
  color: string;
  thickness: number;
  dash: 'solid' | 'dashed' | 'dotted';
}

export interface CheckboxFrame extends FrameBase {
  kind: 'checkbox';
  checked: boolean;
  stroke: string;
  size: number;
}

/** A drawn table cell: its box plus the text laid out inside it. */
export interface CellFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  background?: string;
  borders: {
    top?: BoxBorder | null;
    right?: BoxBorder | null;
    bottom?: BoxBorder | null;
    left?: BoxBorder | null;
  };
  lines: LineBox[];
  /** Frame-local origin of the text block inside the cell. */
  textX: number;
  textY: number;
  source: FrameSource;
}

export interface TableFrame extends FrameBase {
  kind: 'table';
  cells: CellFrame[];
  outerBorder: BoxBorder | null;
}

export type Frame =
  | TextFrame
  | ImageFrame
  | ShapeFrame
  | LineFrame
  | RuleFrame
  | CheckboxFrame
  | TableFrame;

export interface LaidOutPage {
  index: number;
  width: number;
  height: number;
  background?: string;
  /** The usable content rectangle, drawn as a guide in the editor. */
  content: { x: number; y: number; width: number; height: number };
  frames: Frame[];
  /** Frames belonging to the repeated header / footer / watermark. */
  masterFrames: Frame[];
}

export interface LayoutWarning {
  blockId?: string;
  page?: number;
  code: 'overflow' | 'missing-image' | 'cell-overflow' | 'too-narrow';
  message: string;
}

export interface LaidOutDoc {
  pages: LaidOutPage[];
  /** blockId -> the pages it appears on, for the outline panel. */
  blockPages: Record<string, number[]>;
  /** blockId -> resolved question number, for the outline panel. */
  numbers: Record<string, string>;
  warnings: LayoutWarning[];
  /** True when measurement ran against the real webfonts. */
  exact: boolean;
  totalMarks: number;
}
