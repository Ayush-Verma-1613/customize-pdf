import {
  degrees,
  PDFDocument,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  setCharacterSpacing,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';
import { FONT_FILES, ascentPt, descentPt, styleName, type ResolvedFont } from '@/lib/engine/fonts';
import {
  checkPath,
  dashPattern,
  DECORATION_THICKNESS,
  shapePath,
  STRIKE_OFFSET,
  UNDERLINE_OFFSET,
} from '@/lib/engine/shapes';
import type {
  CellFrame,
  Frame,
  LaidOutDoc,
  LaidOutPage,
  LineBox,
  TextFrame,
} from '@/lib/engine/types';
import type { BoxBorder, FontFamily, PaperDoc } from '@/lib/model/types';
import { parseColor } from '@/lib/utils/color';
import { rotatePoint } from '@/lib/utils/geom';
import { pdfFontkit } from './fontkit-adapter';
import { rasterizeForBox } from './images';

/**
 * The exporter walks the very same LaidOutDoc the editor renders, so nothing is
 * re-flowed on the way out: every line break, baseline and column position was
 * already decided, and the fonts embedded here are byte-identical to the ones
 * the browser measured with.
 */

const fontBytesCache = new Map<string, Promise<ArrayBuffer>>();

function fetchFont(url: string): Promise<ArrayBuffer> {
  const hit = fontBytesCache.get(url);
  if (hit) return hit;
  const job = fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Could not load the font ${url}`);
    return r.arrayBuffer();
  });
  fontBytesCache.set(url, job);
  return job;
}

class FontBook {
  private embedded = new Map<string, PDFFont>();

  constructor(private pdf: PDFDocument) {}

  async load(family: FontFamily, bold: boolean, italic: boolean): Promise<PDFFont> {
    const style = styleName(bold, italic);
    const key = `${family}-${style}`;
    const hit = this.embedded.get(key);
    if (hit) return hit;
    const bytes = await fetchFont(FONT_FILES[family][style]);
    const font = await this.pdf.embedFont(bytes, { subset: true });
    this.embedded.set(key, font);
    return font;
  }

  get(family: FontFamily, bold: boolean, italic: boolean): PDFFont {
    const font = this.embedded.get(`${family}-${styleName(bold, italic)}`);
    if (!font) throw new Error(`Font ${family} was not preloaded.`);
    return font;
  }
}

/* ------------------------------------------------------------------ *
 * Coordinate mapping
 * ------------------------------------------------------------------ */

/**
 * Layout space is y-down with clockwise rotation; PDF space is y-up with
 * counter-clockwise rotation. A Placer converts one frame's geometry once and
 * every primitive inside it goes through the same conversion.
 */
class Placer {
  constructor(
    private pageHeight: number,
    private rotation = 0,
    private cx = 0,
    private cy = 0,
  ) {}

  static forFrame(pageHeight: number, frame: Frame) {
    const rot = frame.rotation ?? 0;
    return new Placer(
      pageHeight,
      rot,
      frame.x + frame.width / 2,
      frame.y + frame.height / 2,
    );
  }

  /** Map a layout point to PDF coordinates. */
  point(x: number, y: number) {
    const p = this.rotation ? rotatePoint(x, y, this.cx, this.cy, this.rotation) : { x, y };
    return { x: p.x, y: this.pageHeight - p.y };
  }

  /** Map a top-left box origin to the bottom-left origin PDF wants. */
  box(x: number, y: number, height: number) {
    const p = this.point(x, y + height);
    return { x: p.x, y: p.y };
  }

  get angle() {
    return degrees(-this.rotation);
  }
}

const colorOf = (value: string | undefined, fallback = '#000000') => {
  const { rgb: c } = parseColor(value ?? fallback);
  return rgb(c.r, c.g, c.b);
};

const alphaOf = (value: string | undefined) => (value ? parseColor(value).alpha : 1);

const dashArray = dashPattern;

/* ------------------------------------------------------------------ *
 * Primitives
 * ------------------------------------------------------------------ */

function drawTextLines(
  page: PDFPage,
  book: FontBook,
  placer: Placer,
  originX: number,
  originY: number,
  lines: LineBox[],
  opacity: number,
) {
  for (const line of lines) {
    const lineTop = originY + line.y;
    for (const item of line.items) {
      if (!item.text) continue;
      const font = book.get(item.font.family, item.font.bold, item.font.italic);
      const x = originX + line.x + item.x;
      const baseline = lineTop + line.baseline - item.rise;

      if (item.highlight) {
        const top = baseline - ascentPt(item.font);
        const height = ascentPt(item.font) + descentPt(item.font);
        const at = placer.box(x, top, height);
        page.drawRectangle({
          x: at.x,
          y: at.y,
          width: item.width,
          height,
          color: colorOf(item.highlight),
          opacity: opacity * alphaOf(item.highlight),
          rotate: placer.angle,
        });
      }

      const at = placer.point(x, baseline);
      const tracking = item.font.letterSpacing;
      if (tracking) page.pushOperators(setCharacterSpacing(tracking));
      page.drawText(item.text, {
        x: at.x,
        y: at.y,
        size: item.font.size,
        font,
        color: colorOf(item.color),
        opacity: opacity * alphaOf(item.color),
        rotate: placer.angle,
      });
      if (tracking) page.pushOperators(setCharacterSpacing(0));

      const ruleThickness = Math.max(0.4, item.font.size * DECORATION_THICKNESS);
      if (item.underline) {
        const y = baseline + item.font.size * UNDERLINE_OFFSET;
        drawRule(page, placer, x, y, item.width, ruleThickness, item.color, opacity);
      }
      if (item.strike) {
        const y = baseline + item.font.size * STRIKE_OFFSET;
        drawRule(page, placer, x, y, item.width, ruleThickness, item.color, opacity);
      }
    }
  }
}

function drawRule(
  page: PDFPage,
  placer: Placer,
  x: number,
  y: number,
  width: number,
  thickness: number,
  color: string,
  opacity: number,
  dash: 'solid' | 'dashed' | 'dotted' = 'solid',
) {
  const a = placer.point(x, y);
  const b = placer.point(x + width, y);
  page.drawLine({
    start: a,
    end: b,
    thickness,
    color: colorOf(color),
    opacity: opacity * alphaOf(color),
    dashArray: dashArray(dash, thickness),
  });
}

function drawBox(
  page: PDFPage,
  placer: Placer,
  x: number,
  y: number,
  width: number,
  height: number,
  background: string | undefined,
  border: BoxBorder | undefined,
  opacity: number,
) {
  const at = placer.box(x, y, height);
  const hasFill = background && alphaOf(background) > 0;
  const hasStroke = border && border.width > 0 && alphaOf(border.color) > 0;
  if (!hasFill && !hasStroke) return;

  page.drawRectangle({
    x: at.x,
    y: at.y,
    width,
    height,
    rotate: placer.angle,
    color: hasFill ? colorOf(background) : undefined,
    opacity: hasFill ? opacity * alphaOf(background) : undefined,
    borderColor: hasStroke ? colorOf(border.color) : undefined,
    borderWidth: hasStroke ? border.width : undefined,
    borderOpacity: hasStroke ? opacity * alphaOf(border.color) : undefined,
    borderDashArray: hasStroke ? dashArray(border.style, border.width) : undefined,
  });
}

function drawCellBorders(
  page: PDFPage,
  placer: Placer,
  x: number,
  y: number,
  cell: CellFrame,
  opacity: number,
) {
  const sides: [BoxBorder | null | undefined, number, number, number, number][] = [
    [cell.borders.top, x, y, x + cell.width, y],
    [cell.borders.bottom, x, y + cell.height, x + cell.width, y + cell.height],
    [cell.borders.left, x, y, x, y + cell.height],
    [cell.borders.right, x + cell.width, y, x + cell.width, y + cell.height],
  ];
  for (const [border, x1, y1, x2, y2] of sides) {
    if (!border || border.width <= 0 || alphaOf(border.color) === 0) continue;
    page.drawLine({
      start: placer.point(x1, y1),
      end: placer.point(x2, y2),
      thickness: border.width,
      color: colorOf(border.color),
      opacity: opacity * alphaOf(border.color),
      dashArray: dashArray(border.style, border.width),
    });
  }
}

/* ------------------------------------------------------------------ *
 * Frame dispatch
 * ------------------------------------------------------------------ */

async function drawFrame(
  page: PDFPage,
  book: FontBook,
  pageHeight: number,
  frame: Frame,
): Promise<void> {
  const placer = Placer.forFrame(pageHeight, frame);
  const opacity = frame.opacity ?? 1;

  switch (frame.kind) {
    case 'text': {
      const tf = frame as TextFrame;
      drawBox(page, placer, tf.x, tf.y, tf.width, tf.height, tf.background, tf.border, opacity);
      drawTextLines(page, book, placer, tf.x, tf.y + (tf.padding?.top ?? 0), tf.lines, opacity);
      break;
    }
    case 'rule':
      drawRule(
        page,
        placer,
        frame.x,
        frame.y,
        frame.width,
        frame.thickness,
        frame.color,
        opacity,
        frame.dash,
      );
      break;
    case 'line': {
      page.drawLine({
        start: placer.point(frame.x, frame.y),
        end: placer.point(frame.x2, frame.y2),
        thickness: frame.strokeWidth,
        color: colorOf(frame.stroke),
        opacity: opacity * alphaOf(frame.stroke),
        dashArray: dashArray(frame.dash, frame.strokeWidth),
      });
      break;
    }
    case 'shape': {
      const filled = alphaOf(frame.fill) > 0;
      const stroked = frame.strokeWidth > 0 && alphaOf(frame.stroke) > 0;
      if (frame.shape === 'rect') {
        const at = placer.box(frame.x, frame.y, frame.height);
        page.drawRectangle({
          x: at.x,
          y: at.y,
          width: frame.width,
          height: frame.height,
          rotate: placer.angle,
          color: filled ? colorOf(frame.fill) : undefined,
          opacity: filled ? opacity * alphaOf(frame.fill) : undefined,
          borderColor: stroked ? colorOf(frame.stroke) : undefined,
          borderWidth: stroked ? frame.strokeWidth : undefined,
          borderOpacity: stroked ? opacity * alphaOf(frame.stroke) : undefined,
          borderDashArray: stroked ? dashArray(frame.dash, frame.strokeWidth) : undefined,
        });
      } else if (frame.shape === 'ellipse') {
        const centre = placer.point(frame.x + frame.width / 2, frame.y + frame.height / 2);
        page.drawEllipse({
          x: centre.x,
          y: centre.y,
          xScale: frame.width / 2,
          yScale: frame.height / 2,
          rotate: placer.angle,
          color: filled ? colorOf(frame.fill) : undefined,
          opacity: filled ? opacity * alphaOf(frame.fill) : undefined,
          borderColor: stroked ? colorOf(frame.stroke) : undefined,
          borderWidth: stroked ? frame.strokeWidth : undefined,
          borderOpacity: stroked ? opacity * alphaOf(frame.stroke) : undefined,
        });
      } else {
        const at = placer.point(frame.x, frame.y);
        page.drawSvgPath(shapePath(frame.shape, frame.width, frame.height), {
          x: at.x,
          y: at.y,
          rotate: placer.angle,
          color: filled ? colorOf(frame.fill) : undefined,
          opacity: filled ? opacity * alphaOf(frame.fill) : undefined,
          borderColor: stroked ? colorOf(frame.stroke) : undefined,
          borderWidth: stroked ? frame.strokeWidth : undefined,
        });
      }
      break;
    }
    case 'checkbox': {
      const at = placer.box(frame.x, frame.y, frame.size);
      page.drawRectangle({
        x: at.x,
        y: at.y,
        width: frame.size,
        height: frame.size,
        rotate: placer.angle,
        borderColor: colorOf(frame.stroke),
        borderWidth: Math.max(0.5, frame.size * 0.07),
        opacity,
      });
      if (frame.checked) {
        const s = frame.size;
        const origin = placer.point(frame.x, frame.y);
        page.drawSvgPath(checkPath(s), {
          x: origin.x,
          y: origin.y,
          rotate: placer.angle,
          borderColor: colorOf(frame.stroke),
          borderWidth: Math.max(0.8, s * 0.12),
        });
      }
      break;
    }
    case 'image': {
      if (!frame.src) break;
      const raster = await rasterizeForBox(
        frame.src,
        frame.width,
        frame.height,
        frame.fit,
        frame.crop,
        frame.radius,
      );
      const embedded = await page.doc.embedPng(raster.bytes);
      const at = placer.box(frame.x, frame.y, frame.height);
      page.drawImage(embedded, {
        x: at.x,
        y: at.y,
        width: frame.width,
        height: frame.height,
        rotate: placer.angle,
        opacity,
      });
      break;
    }
    case 'table': {
      for (const cell of frame.cells) {
        const x = frame.x + cell.x;
        const y = frame.y + cell.y;
        if (cell.background && alphaOf(cell.background) > 0) {
          const at = placer.box(x, y, cell.height);
          page.drawRectangle({
            x: at.x,
            y: at.y,
            width: cell.width,
            height: cell.height,
            rotate: placer.angle,
            color: colorOf(cell.background),
            opacity: opacity * alphaOf(cell.background),
          });
        }
        drawCellBorders(page, placer, x, y, cell, opacity);
        drawTextLines(page, book, placer, x + cell.textX, y + cell.textY, cell.lines, opacity);
      }
      break;
    }
  }
}

/* ------------------------------------------------------------------ *
 * Export
 * ------------------------------------------------------------------ */

/** Every font/style combination the document actually uses. */
function usedFonts(laid: LaidOutDoc): ResolvedFont[] {
  const seen = new Map<string, ResolvedFont>();
  const scan = (frames: Frame[]) => {
    for (const frame of frames) {
      const lineGroups: LineBox[][] =
        frame.kind === 'text'
          ? [frame.lines]
          : frame.kind === 'table'
            ? frame.cells.map((c) => c.lines)
            : [];
      for (const lines of lineGroups) {
        for (const line of lines) {
          for (const item of line.items) {
            const key = `${item.font.family}-${styleName(item.font.bold, item.font.italic)}`;
            if (!seen.has(key)) seen.set(key, item.font);
          }
        }
      }
    }
  };
  for (const page of laid.pages) {
    scan(page.frames);
    scan(page.masterFrames);
  }
  return [...seen.values()];
}

export interface ExportOptions {
  /** Attach the editable document JSON to the PDF so it can be reopened. */
  embedSource?: boolean;
  onProgress?: (completed: number, total: number) => void;
}

/** Master frames that belong behind the content rather than on top of it. */
const isBackdrop = (frame: Frame) =>
  frame.source.kind === 'master' &&
  (frame.source.id === 'watermark' || frame.source.id === 'border');

export async function buildPdf(
  doc: PaperDoc,
  laid: LaidOutDoc,
  options: ExportOptions = {},
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(pdfFontkit as unknown as Parameters<typeof pdf.registerFontkit>[0]);

  pdf.setTitle(doc.title);
  pdf.setProducer('Paperforge');
  pdf.setCreator('Paperforge document builder');
  pdf.setCreationDate(new Date(doc.createdAt));
  pdf.setModificationDate(new Date());
  if (doc.fields.subject) pdf.setSubject(doc.fields.subject);

  const book = new FontBook(pdf);
  await Promise.all(usedFonts(laid).map((f) => book.load(f.family, f.bold, f.italic)));

  const total = laid.pages.length;
  for (const laidPage of laid.pages) {
    const page = pdf.addPage([laidPage.width, laidPage.height]);
    if (laidPage.background && alphaOf(laidPage.background) > 0) {
      page.drawRectangle({
        x: 0,
        y: 0,
        width: laidPage.width,
        height: laidPage.height,
        color: colorOf(laidPage.background),
      });
    }

    const backdrop = laidPage.masterFrames.filter(isBackdrop);
    const overlayMaster = laidPage.masterFrames.filter((f) => !isBackdrop(f));

    page.pushOperators(pushGraphicsState());
    for (const frame of [...backdrop, ...laidPage.frames, ...overlayMaster]) {
      await drawFrame(page, book, laidPage.height, frame);
    }
    page.pushOperators(popGraphicsState());

    options.onProgress?.(laidPage.index + 1, total);
  }

  if (options.embedSource !== false) {
    const json = new TextEncoder().encode(JSON.stringify(doc));
    await pdf.attach(json, `${safeName(doc.title)}.paperforge.json`, {
      mimeType: 'application/json',
      description: 'Editable Paperforge source for this document',
      creationDate: new Date(doc.createdAt),
      modificationDate: new Date(),
    });
  }

  return pdf.save();
}

export const safeName = (title: string) =>
  (title || 'document')
    .replace(/[^\w\s-]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'document';

export async function exportPdfBlob(
  doc: PaperDoc,
  laid: LaidOutDoc,
  options?: ExportOptions,
): Promise<Blob> {
  const bytes = await buildPdf(doc, laid, options);
  return new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
}

export async function downloadPdf(
  doc: PaperDoc,
  laid: LaidOutDoc,
  options?: ExportOptions,
): Promise<void> {
  const blob = await exportPdfBlob(doc, laid, options);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeName(doc.title)}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
