import type { Frame, LaidOutPage } from '@/lib/engine/types';
import type { Overlay } from '@/lib/model/types';
import type { Rect } from '@/lib/utils/geom';

/** A clickable region on the page, mapped back to the thing that produced it. */
export interface HitBox extends Rect {
  kind: 'flow' | 'overlay';
  id: string;
  rotation: number;
  locked: boolean;
  /** Stacking order; higher wins when boxes overlap. */
  z: number;
}

const union = (a: Rect, b: Rect): Rect => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
};

/**
 * One flow block can produce many frames on a page - a question is a number,
 * a body, a marks label and possibly answer rules. Selection should feel like
 * it targets the question, so the frames are unioned back into one box.
 */
export function hitBoxesFor(page: LaidOutPage, overlays: Overlay[]): HitBox[] {
  const flowBoxes = new Map<string, Rect>();

  for (const frame of page.frames) {
    if (frame.source.kind !== 'flow') continue;
    if (frame.selectable === false) continue;
    const rect: Rect = { x: frame.x, y: frame.y, width: frame.width, height: frame.height };
    const existing = flowBoxes.get(frame.source.id);
    flowBoxes.set(frame.source.id, existing ? union(existing, rect) : rect);
  }

  const boxes: HitBox[] = [];
  for (const [id, rect] of flowBoxes) {
    boxes.push({ ...pad(rect, 1.5), kind: 'flow', id, rotation: 0, locked: false, z: 0 });
  }

  for (const overlay of overlays) {
    if (overlay.page !== page.index) continue;
    boxes.push({
      x: overlay.x,
      y: overlay.y,
      width: Math.max(overlay.width, overlay.kind === 'line' ? 1 : 6),
      height: Math.max(overlay.height, overlay.kind === 'line' ? 8 : 6),
      kind: 'overlay',
      id: overlay.id,
      rotation: overlay.rotation,
      locked: overlay.locked,
      z: 1000 + overlay.z,
    });
  }

  return boxes.sort((a, b) => a.z - b.z);
}

const pad = (rect: Rect, amount: number): Rect => ({
  x: rect.x - amount,
  y: rect.y - amount,
  width: rect.width + amount * 2,
  height: rect.height + amount * 2,
});

/** Bounding box of a set of frames belonging to one source id. */
export function frameBounds(frames: Frame[], sourceId: string): Rect | null {
  let box: Rect | null = null;
  for (const frame of frames) {
    if (frame.source.id !== sourceId) continue;
    const rect = { x: frame.x, y: frame.y, width: frame.width, height: frame.height };
    box = box ? union(box, rect) : rect;
  }
  return box;
}

/* ------------------------------------------------------------------ *
 * Snapping
 * ------------------------------------------------------------------ */

export interface SnapGuide {
  axis: 'x' | 'y';
  position: number;
  /** Extent of the guide line, so it only spans the relevant region. */
  from: number;
  to: number;
}

export interface SnapResult {
  x: number;
  y: number;
  guides: SnapGuide[];
}

const THRESHOLD = 4;

/**
 * Snaps a moving box to the page margins, the page centre lines and the edges
 * and centres of every other element on the page. Returns the adjusted origin
 * plus the guides to draw.
 */
export function snapRect(
  rect: Rect,
  page: LaidOutPage,
  others: Rect[],
  enabled: boolean,
  tolerance = THRESHOLD,
): SnapResult {
  if (!enabled) return { x: rect.x, y: rect.y, guides: [] };

  const content = page.content;
  const verticals: number[] = [
    content.x,
    content.x + content.width,
    content.x + content.width / 2,
    page.width / 2,
  ];
  const horizontals: number[] = [
    content.y,
    content.y + content.height,
    content.y + content.height / 2,
    page.height / 2,
  ];

  for (const other of others) {
    verticals.push(other.x, other.x + other.width, other.x + other.width / 2);
    horizontals.push(other.y, other.y + other.height, other.y + other.height / 2);
  }

  const guides: SnapGuide[] = [];
  let bestX = { delta: Infinity, value: rect.x, guide: 0 };
  let bestY = { delta: Infinity, value: rect.y, guide: 0 };

  const candidatesX = [rect.x, rect.x + rect.width / 2, rect.x + rect.width];
  const candidatesY = [rect.y, rect.y + rect.height / 2, rect.y + rect.height];

  candidatesX.forEach((candidate, i) => {
    for (const line of verticals) {
      const delta = Math.abs(candidate - line);
      if (delta < tolerance && delta < bestX.delta) {
        bestX = {
          delta,
          value: line - (i === 0 ? 0 : i === 1 ? rect.width / 2 : rect.width),
          guide: line,
        };
      }
    }
  });

  candidatesY.forEach((candidate, i) => {
    for (const line of horizontals) {
      const delta = Math.abs(candidate - line);
      if (delta < tolerance && delta < bestY.delta) {
        bestY = {
          delta,
          value: line - (i === 0 ? 0 : i === 1 ? rect.height / 2 : rect.height),
          guide: line,
        };
      }
    }
  });

  if (bestX.delta < tolerance) {
    guides.push({ axis: 'x', position: bestX.guide, from: 0, to: page.height });
  }
  if (bestY.delta < tolerance) {
    guides.push({ axis: 'y', position: bestY.guide, from: 0, to: page.width });
  }

  return {
    x: bestX.delta < tolerance ? bestX.value : rect.x,
    y: bestY.delta < tolerance ? bestY.value : rect.y,
    guides,
  };
}

/* ------------------------------------------------------------------ *
 * Resize handles
 * ------------------------------------------------------------------ */

export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const HANDLES: { id: HandleId; cx: number; cy: number; cursor: string }[] = [
  { id: 'nw', cx: 0, cy: 0, cursor: 'nwse-resize' },
  { id: 'n', cx: 0.5, cy: 0, cursor: 'ns-resize' },
  { id: 'ne', cx: 1, cy: 0, cursor: 'nesw-resize' },
  { id: 'e', cx: 1, cy: 0.5, cursor: 'ew-resize' },
  { id: 'se', cx: 1, cy: 1, cursor: 'nwse-resize' },
  { id: 's', cx: 0.5, cy: 1, cursor: 'ns-resize' },
  { id: 'sw', cx: 0, cy: 1, cursor: 'nesw-resize' },
  { id: 'w', cx: 0, cy: 0.5, cursor: 'ew-resize' },
];

/** Apply a drag on one handle, optionally locking the aspect ratio. */
export function resizeRect(
  start: Rect,
  handle: HandleId,
  dx: number,
  dy: number,
  keepAspect: boolean,
  minimum = 8,
): Rect {
  let { x, y, width, height } = start;
  const ratio = start.height === 0 ? 1 : start.width / start.height;

  if (handle.includes('e')) width = start.width + dx;
  if (handle.includes('w')) {
    width = start.width - dx;
    x = start.x + dx;
  }
  if (handle.includes('s')) height = start.height + dy;
  if (handle.includes('n')) {
    height = start.height - dy;
    y = start.y + dy;
  }

  if (keepAspect && handle.length === 2) {
    if (Math.abs(width - start.width) > Math.abs(height - start.height)) {
      const next = width / ratio;
      if (handle.includes('n')) y = start.y + (start.height - next);
      height = next;
    } else {
      const next = height * ratio;
      if (handle.includes('w')) x = start.x + (start.width - next);
      width = next;
    }
  }

  if (width < minimum) {
    if (handle.includes('w')) x = start.x + start.width - minimum;
    width = minimum;
  }
  if (height < minimum) {
    if (handle.includes('n')) y = start.y + start.height - minimum;
    height = minimum;
  }

  return { x, y, width, height };
}

/** Angle in degrees from a box centre to a point, with 0 pointing up. */
export const angleTo = (cx: number, cy: number, px: number, py: number) =>
  (Math.atan2(py - cy, px - cx) * 180) / Math.PI + 90;
