import type { CropRect } from '@/lib/model/types';

/** Shared image plumbing for uploads, on-canvas preview and PDF embedding. */

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  const hit = imageCache.get(src);
  if (hit) return hit;
  const job = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load the image.'));
    img.src = src;
  });
  imageCache.set(src, job);
  return job;
}

export interface ImageInfo {
  src: string;
  width: number;
  height: number;
}

const MAX_STORED_DIMENSION = 1800;
const MAX_CANVAS_DIMENSION = 4000;

/**
 * Reads an uploaded file into a data URL, downscaling anything huge first.
 * Documents are stored as one JSON blob, so a 12MP phone photo pasted into a
 * worksheet would otherwise blow past the database document limit.
 */
export async function fileToImage(file: File): Promise<ImageInfo> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });

  const img = await loadImage(raw);
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  if (longest <= MAX_STORED_DIMENSION && file.size < 900_000) {
    return { src: raw, width: img.naturalWidth, height: img.naturalHeight };
  }

  const scale = Math.min(1, MAX_STORED_DIMENSION / longest);
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { src: raw, width: img.naturalWidth, height: img.naturalHeight };
  ctx.drawImage(img, 0, 0, width, height);
  const hasAlpha = /^data:image\/(png|webp|gif|svg)/i.test(raw);
  return {
    src: canvas.toDataURL(hasAlpha ? 'image/png' : 'image/jpeg', 0.9),
    width,
    height,
  };
}

export type Fit = 'contain' | 'cover' | 'fill';

/** Source rectangle to sample, honouring an explicit crop then the fit mode. */
export function sourceRect(
  natural: { width: number; height: number },
  boxW: number,
  boxH: number,
  fit: Fit,
  crop?: CropRect,
) {
  const base = crop
    ? {
        x: crop.x * natural.width,
        y: crop.y * natural.height,
        w: crop.w * natural.width,
        h: crop.h * natural.height,
      }
    : { x: 0, y: 0, w: natural.width, h: natural.height };

  if (fit !== 'cover') return base;

  const boxAspect = boxW / boxH;
  const srcAspect = base.w / base.h;
  if (srcAspect > boxAspect) {
    const w = base.h * boxAspect;
    return { x: base.x + (base.w - w) / 2, y: base.y, w, h: base.h };
  }
  const h = base.w / boxAspect;
  return { x: base.x, y: base.y + (base.h - h) / 2, w: base.w, h };
}

/** Destination rectangle inside the box, for `contain`. */
export function destRect(srcW: number, srcH: number, boxW: number, boxH: number, fit: Fit) {
  if (fit !== 'contain') return { x: 0, y: 0, w: boxW, h: boxH };
  const scale = Math.min(boxW / srcW, boxH / srcH);
  const w = srcW * scale;
  const h = srcH * scale;
  return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h };
}

function roundedPath(ctx: CanvasRenderingContext2D, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(w - radius, 0);
  ctx.arcTo(w, 0, w, radius, radius);
  ctx.lineTo(w, h - radius);
  ctx.arcTo(w, h, w - radius, h, radius);
  ctx.lineTo(radius, h);
  ctx.arcTo(0, h, 0, h - radius, radius);
  ctx.lineTo(0, radius);
  ctx.arcTo(0, 0, radius, 0, radius);
  ctx.closePath();
}

export interface RasterResult {
  bytes: Uint8Array;
  /** Pixel dimensions of the produced bitmap. */
  width: number;
  height: number;
}

/**
 * Bakes fit, crop and corner radius into a bitmap sized for the target box.
 *
 * Doing the work here rather than with PDF clipping paths keeps the exporter
 * simple and means the PDF shows exactly the pixels the editor showed.
 */
export async function rasterizeForBox(
  src: string,
  boxW: number,
  boxH: number,
  fit: Fit,
  crop: CropRect | undefined,
  radius: number,
  /** Target device pixels per point. 3 lands around 216 DPI. */
  scale = 3,
): Promise<RasterResult> {
  const img = await loadImage(src);
  const natural = { width: img.naturalWidth, height: img.naturalHeight };
  const source = sourceRect(natural, boxW, boxH, fit, crop);
  const dest = destRect(source.w, source.h, boxW, boxH, fit);

  const capped = Math.min(
    scale,
    MAX_CANVAS_DIMENSION / Math.max(boxW, 1),
    MAX_CANVAS_DIMENSION / Math.max(boxH, 1),
  );
  const pxW = Math.max(1, Math.round(boxW * capped));
  const pxH = Math.max(1, Math.round(boxH * capped));

  const canvas = document.createElement('canvas');
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable in this browser.');

  if (radius > 0) {
    roundedPath(ctx, pxW, pxH, radius * capped);
    ctx.clip();
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    img,
    source.x,
    source.y,
    source.w,
    source.h,
    dest.x * capped,
    dest.y * capped,
    dest.w * capped,
    dest.h * capped,
  );

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not encode the image.');
  return { bytes: new Uint8Array(await blob.arrayBuffer()), width: pxW, height: pxH };
}
