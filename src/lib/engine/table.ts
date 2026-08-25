import type { BoxBorder, Margins, TableBlock, TableCell, TableRow } from '@/lib/model/types';
import { wrapRuns, linesHeight, type BaseTextStyle } from './text';
import type { CellFrame, LineBox } from './types';

/**
 * Table layout follows the classic grid algorithm: place cells into an
 * occupancy matrix so colspan/rowspan resolve to real column indices, wrap each
 * cell against its own width, then take the row height from the tallest cell.
 */

export interface PlacedCell {
  cell: TableCell;
  row: number;
  col: number;
  colSpan: number;
  rowSpan: number;
  /** Column-derived geometry. */
  x: number;
  width: number;
  lines: LineBox[];
  contentHeight: number;
  padding: Margins;
}

export interface MeasuredTable {
  /** Absolute column x offsets and widths. */
  colX: number[];
  colW: number[];
  width: number;
  rowHeights: number[];
  rowY: number[];
  cells: PlacedCell[];
  headerRows: number[];
  /** Row indices that may not be separated because a rowspan crosses them. */
  bands: number[][];
  totalHeight: number;
}

const padOf = (base: Margins, override?: Partial<Margins>): Margins => ({
  top: override?.top ?? base.top,
  right: override?.right ?? base.right,
  bottom: override?.bottom ?? base.bottom,
  left: override?.left ?? base.left,
});

export function measureTable(
  table: Omit<TableBlock, 'id' | 'type'>,
  availableWidth: number,
  base: BaseTextStyle,
): MeasuredTable {
  const factor = table.widthFactor ?? 1;
  const totalWidth = Math.max(24, availableWidth * factor);

  const weights = table.columns.length ? table.columns : [1];
  const sum = weights.reduce((a, b) => a + Math.max(0.0001, b), 0);
  const colW = weights.map((w) => (Math.max(0.0001, w) / sum) * totalWidth);
  const colX: number[] = [];
  let cx = 0;
  for (const w of colW) {
    colX.push(cx);
    cx += w;
  }

  const nCols = colW.length;
  const nRows = table.rows.length;
  // occupancy[row][col] is true once a cell (or a rowspan above) covers it.
  const occupancy: boolean[][] = Array.from({ length: nRows }, () => new Array(nCols).fill(false));

  const cells: PlacedCell[] = [];

  table.rows.forEach((row: TableRow, r: number) => {
    let col = 0;
    for (const cell of row.cells) {
      while (col < nCols && occupancy[r][col]) col += 1;
      if (col >= nCols) break;

      const colSpan = Math.max(1, Math.min(cell.colSpan ?? 1, nCols - col));
      const rowSpan = Math.max(1, Math.min(cell.rowSpan ?? 1, nRows - r));

      for (let rr = r; rr < r + rowSpan; rr += 1) {
        for (let cc = col; cc < col + colSpan; cc += 1) occupancy[rr][cc] = true;
      }

      const padding = padOf(table.cellPadding, cell.padding);
      const width = colW.slice(col, col + colSpan).reduce((a, b) => a + b, 0);
      const inner = Math.max(4, width - padding.left - padding.right);

      const cellBase: BaseTextStyle = {
        ...base,
        bold: cell.bold ?? row.isHeader ?? base.bold,
      };
      const lines = wrapRuns(cell.runs ?? [], cellBase, {
        widthAt: () => inner,
        align: cell.align ?? (row.isHeader ? 'center' : 'left'),
        lineHeight: base.lineHeight,
      });

      cells.push({
        cell,
        row: r,
        col,
        colSpan,
        rowSpan,
        x: colX[col],
        width,
        lines,
        contentHeight: linesHeight(lines) + padding.top + padding.bottom,
        padding,
      });

      col += colSpan;
    }
  });

  // Pass 1: heights from cells that live in a single row.
  const rowHeights = table.rows.map((row) => Math.max(row.minHeight ?? 0, 8));
  for (const pc of cells) {
    if (pc.rowSpan === 1) rowHeights[pc.row] = Math.max(rowHeights[pc.row], pc.contentHeight);
  }
  // Pass 2: a spanning cell that is still too tall pushes the deficit onto its last row.
  for (const pc of cells) {
    if (pc.rowSpan === 1) continue;
    const span = rowHeights.slice(pc.row, pc.row + pc.rowSpan).reduce((a, b) => a + b, 0);
    if (pc.contentHeight > span) {
      rowHeights[pc.row + pc.rowSpan - 1] += pc.contentHeight - span;
    }
  }

  const rowY: number[] = [];
  let y = 0;
  for (const h of rowHeights) {
    rowY.push(y);
    y += h;
  }

  // Rows joined by a rowspan can never be split apart across a page.
  const bandOf = new Array(nRows).fill(-1);
  let band = 0;
  for (let r = 0; r < nRows; r += 1) {
    if (bandOf[r] === -1) {
      bandOf[r] = band;
      band += 1;
    }
    for (const pc of cells) {
      if (pc.row === r && pc.rowSpan > 1) {
        for (let rr = r; rr < r + pc.rowSpan; rr += 1) bandOf[rr] = bandOf[r];
      }
    }
  }
  const bands: number[][] = [];
  for (let r = 0; r < nRows; r += 1) {
    const b = bandOf[r];
    if (!bands[b]) bands[b] = [];
    bands[b].push(r);
  }

  return {
    colX,
    colW,
    width: totalWidth,
    rowHeights,
    rowY,
    cells,
    headerRows: table.rows.map((r, i) => (r.isHeader ? i : -1)).filter((i) => i >= 0),
    bands: bands.filter(Boolean),
    totalHeight: y,
  };
}

/** Height of a contiguous set of rows. */
export const rowsHeight = (m: MeasuredTable, rows: number[]) =>
  rows.reduce((sum, r) => sum + m.rowHeights[r], 0);

const resolveBorder = (
  override: BoxBorder | null | undefined,
  fallback: BoxBorder | null,
): BoxBorder | null => (override === null ? null : (override ?? fallback));

/**
 * Build the drawable cells for a slice of rows, re-based so the slice starts at
 * y = 0. Used both for the initial placement and for every continuation page.
 */
export function sliceCells(
  m: MeasuredTable,
  table: Omit<TableBlock, 'id' | 'type'>,
  rows: number[],
  blockId: string,
): { cells: CellFrame[]; height: number } {
  const set = new Set(rows);
  const first = rows[0];
  const last = rows[rows.length - 1];
  const offset = m.rowY[first];
  const height = rowsHeight(m, rows);

  const inner = table.innerBorder;
  const outer = table.border;

  const out: CellFrame[] = [];
  for (const pc of m.cells) {
    if (!set.has(pc.row)) continue;
    const spanRows = [];
    for (let r = pc.row; r < pc.row + pc.rowSpan; r += 1) if (set.has(r)) spanRows.push(r);
    if (!spanRows.length) continue;

    const y = m.rowY[pc.row] - offset;
    const h = rowsHeight(m, spanRows);

    const isFirstCol = pc.col === 0;
    const isLastCol = pc.col + pc.colSpan >= m.colW.length;
    const isFirstRow = pc.row === first;
    const isLastRow = pc.row + pc.rowSpan - 1 >= last;

    const ov = pc.cell.border ?? {};
    const rowMeta = table.rows[pc.row];
    const zebra =
      table.zebra && !rowMeta?.isHeader && pc.row % 2 === 1 ? table.zebra : undefined;

    const contentH = linesHeight(pc.lines);
    const boxH = h - pc.padding.top - pc.padding.bottom;
    const vAlign = pc.cell.vAlign ?? 'top';
    const shift =
      vAlign === 'middle'
        ? Math.max(0, (boxH - contentH) / 2)
        : vAlign === 'bottom'
          ? Math.max(0, boxH - contentH)
          : 0;

    out.push({
      x: pc.x,
      y,
      width: pc.width,
      height: h,
      background: pc.cell.background ?? zebra,
      borders: {
        top: resolveBorder(ov.top, isFirstRow ? outer : inner),
        bottom: resolveBorder(ov.bottom, isLastRow ? outer : inner),
        left: resolveBorder(ov.left, isFirstCol ? outer : inner),
        right: resolveBorder(ov.right, isLastCol ? outer : inner),
      },
      lines: pc.lines,
      textX: pc.padding.left,
      textY: pc.padding.top + shift,
      source: { kind: 'flow', id: blockId, rowId: rowMeta?.id, cellId: pc.cell.id },
    });
  }

  return { cells: out, height };
}
