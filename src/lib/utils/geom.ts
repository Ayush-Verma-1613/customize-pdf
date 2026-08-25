export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const round = (v: number, dp = 2) => {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
};

/** Rotate a point around a centre by `deg` degrees. */
export function rotatePoint(x: number, y: number, cx: number, cy: number, deg: number) {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const dx = x - cx;
  const dy = y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

/** Axis-aligned bounding box of a rotated rect. */
export function rotatedBounds(r: Rect, deg: number): Rect {
  if (!deg) return r;
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  const pts = [
    rotatePoint(r.x, r.y, cx, cy, deg),
    rotatePoint(r.x + r.width, r.y, cx, cy, deg),
    rotatePoint(r.x + r.width, r.y + r.height, cx, cy, deg),
    rotatePoint(r.x, r.y + r.height, cx, cy, deg),
  ];
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

export const rectsIntersect = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

export const pointInRect = (px: number, py: number, r: Rect) =>
  px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height;
