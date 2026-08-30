import type { Frame, LaidOutPage } from '@/lib/engine/types';
import type { Block, Overlay } from '@/lib/model/types';
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
    // Reported at its true size. Padding a thin element out to a usable target
    // happens in screen pixels at the point of use, so the extra room lands
    // evenly on both sides of the stroke rather than entirely below it.
    boxes.push({
      x: overlay.x,
      y: overlay.y,
      width: overlay.width,
      height: overlay.height,
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

/* ------------------------------------------------------------------ *
 * Insertion slots
 * ------------------------------------------------------------------ */

/** A gap on the page that new content can be dropped into. */
export interface Slot {
  /** Stable key, since a gap has no identity of its own. */
  key: string;
  /** Position in `doc.flow` that a new block would take. */
  index: number;
  /** Page-space y: the middle of a gap, or the top of the end strip. */
  y: number;
  /** Page-space left edge and width of the column this gap sits in. */
  x: number;
  width: number;
  /** Height of the gap in points, for sizing the target. */
  gap: number;
  /** `end` is the standing invitation below the last block; `gap` is a hairline. */
  kind: 'gap' | 'end';
  /** Shown without hovering - the gap beside the selection, for touch. */
  pinned?: boolean;
}

export interface SlotOptions {
  selectedIndex: number;
  isLastPage: boolean;
  /** blockId -> the pages it appears on, from the laid-out document. */
  blockPages: Record<string, number[]>;
  columns: number;
  columnGap: number;
  /** The end strip is a fixed height in screen pixels, so it needs the scale. */
  zoom: number;
  /** The smallest grab target the stage renders, in screen pixels. */
  minHit: number;
}

/** Rendered height of the end strip, in screen pixels. */
export const END_STRIP_PX = 34;

/**
 * Every place on this page where something could be added.
 *
 * A gap belongs to the block below it, so its slot takes that block's place in
 * the flow - which is what makes "add here" land where it was pointed at rather
 * than at the end. Two things stop that being naive: a block continued from an
 * earlier page must not offer a second slot, or content would land a page
 * before the pointer; and in a multi-column page the blocks are not in reading
 * order by y, so neighbours are worked out per column and by flow position.
 */
export function insertSlots(
  page: LaidOutPage,
  boxes: HitBox[],
  flow: Block[],
  options: SlotOptions,
): Slot[] {
  const indexById = new Map(flow.map((block, i) => [block.id, i]));
  const columns = Math.max(1, Math.min(4, options.columns));
  const columnWidth = (page.content.width - options.columnGap * (columns - 1)) / columns;
  const laneLeft = (lane: number) => page.content.x + lane * (columnWidth + options.columnGap);

  const laneOf = (x: number) => {
    if (columns === 1) return 0;
    const lane = Math.round((x - page.content.x) / (columnWidth + options.columnGap));
    return Math.max(0, Math.min(columns - 1, lane));
  };

  const lanes: HitBox[][] = Array.from({ length: columns }, () => []);
  for (const box of boxes) {
    if (box.kind !== 'flow' || !indexById.has(box.id)) continue;
    lanes[laneOf(box.x)].push(box);
  }
  // Flow order, not y order: the engine filled the columns in this order, so
  // consecutive entries here really are each other's neighbours.
  for (const lane of lanes) {
    lane.sort((a, b) => (indexById.get(a.id) ?? 0) - (indexById.get(b.id) ?? 0));
  }

  const slots: Slot[] = [];

  lanes.forEach((lane, laneIndex) => {
    lane.forEach((box, i) => {
      const index = indexById.get(box.id);
      if (index === undefined) return;
      // The slot above a block belongs to the page the block starts on.
      if (options.blockPages[box.id]?.[0] !== page.index) return;

      const previous = lane[i - 1];
      const above = previous ? previous.y + previous.height : page.content.y;
      // The first gap in a column is usually nothing, so it borrows the margin
      // above rather than covering the top of the block it belongs to.
      const gap = Math.max(box.y - above, previous ? 3 : 9);

      slots.push({
        key: `before-${box.id}`,
        index,
        y: box.y - gap / 2,
        x: laneLeft(laneIndex),
        width: columnWidth,
        gap,
        kind: 'gap',
        pinned: options.selectedIndex >= 0 && index === options.selectedIndex + 1,
      });
    });
  });

  // The standing invitation sits under the last thing on the page, in the last
  // column that has anything in it.
  const filled = lanes.map((lane, i) => ({ lane, i })).filter((entry) => entry.lane.length);
  const tail = filled[filled.length - 1];
  const last = tail?.lane[tail.lane.length - 1];
  const stripLeft = laneLeft(tail?.i ?? 0);
  const scale = Math.max(options.zoom, 0.05);
  const stripHeight = END_STRIP_PX / scale;

  /**
   * What the stage really puts under the finger, in page units.
   *
   * An element is reported at its true size, but the stage inflates anything
   * smaller than a finger up to `minHit` screen pixels and lets the drawn
   * outline stay where it was. Clearing the element's true rect therefore
   * cleared only the part you can see: the invisible margin that actually
   * catches the press stayed under the strip, which is why a text box that
   * looked well clear of the invitation still could not be picked up. A
   * rotated element is cleared by the box its corners sweep out.
   */
  const grabRect = (box: HitBox) => {
    const radians = ((box.rotation || 0) * Math.PI) / 180;
    const sin = Math.abs(Math.sin(radians));
    const cos = Math.abs(Math.cos(radians));
    const spanX = box.width * cos + box.height * sin;
    const spanY = box.width * sin + box.height * cos;
    const padX = Math.max(0, (options.minHit - spanX * scale) / 2) / scale;
    const padY = Math.max(0, (options.minHit - spanY * scale) / 2) / scale;
    const midX = box.x + box.width / 2;
    const midY = box.y + box.height / 2;
    return {
      left: midX - spanX / 2 - padX,
      right: midX + spanX / 2 + padX,
      top: midY - spanY / 2 - padY,
      bottom: midY + spanY / 2 + padY,
    };
  };

  /**
   * The space below the content is only empty until somebody parks a text box
   * or a shape in it. The invitation is a solid, full-width target, so wherever
   * it covered a drawn element it took every pointer aimed at that element -
   * which made anything sitting in that band impossible to select, drag or drop
   * onto. It steps below whatever it would have covered instead, and keeps
   * stepping while that leaves it over something else.
   */
  const drawn = boxes
    .filter((box) => box.kind === 'overlay')
    .map(grabRect)
    .filter((rect) => rect.left < stripLeft + columnWidth && rect.right > stripLeft);

  // Measured on screen, not on paper: a phone fits the page at about 0.6, where
  // eight points of paper is five pixels of finger - no clearance at all.
  const clearance = Math.max(8, (options.minHit + 6) / scale);

  let trailingY = (last ? grabRect(last).bottom : page.content.y) + clearance;
  for (let guard = 0; guard <= drawn.length; guard += 1) {
    const covered = drawn.find(
      (rect) => rect.top < trailingY + stripHeight && rect.bottom > trailingY,
    );
    if (!covered) break;
    trailingY = covered.bottom + clearance;
  }

  if (
    options.isLastPage &&
    trailingY + stripHeight < page.content.y + page.content.height
  ) {
    slots.push({
      key: 'end-of-document',
      index: last ? (indexById.get(last.id) ?? flow.length - 1) + 1 : 0,
      y: trailingY,
      x: stripLeft,
      width: columnWidth,
      gap: END_STRIP_PX,
      kind: 'end',
    });
  }

  return slots;
}
