'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import type { LaidOutPage } from '@/lib/engine/types';
import type { Overlay } from '@/lib/model/types';
import { useEditor } from '@/lib/store/editorStore';
import { useCoarsePointer, useCompactLayout } from '@/lib/utils/useMedia';
import { cx } from '@/lib/utils/cx';
import { clamp, type Rect } from '@/lib/utils/geom';
import { useCommands } from '../CommandLayer';
import { InsertPoints } from './InsertPoints';
import { PageSvg } from './PageSvg';
import { SelectionToolbar } from './SelectionToolbar';
import {
  angleTo,
  HANDLES,
  hitBoxesFor,
  insertSlots,
  resizeRect,
  snapRect,
  type HandleId,
  type HitBox,
  type SnapGuide,
} from './geometry';

/**
 * One page plus everything you can do to it. The SVG underneath is purely
 * visual; every pointer interaction happens in this HTML layer, which works in
 * page points and multiplies by the zoom only when it writes out CSS pixels.
 */

interface DragState {
  mode: 'move' | 'resize' | 'rotate' | 'reorder';
  id: string;
  kind: 'flow' | 'overlay';
  handle?: HandleId;
  startPointer: { x: number; y: number };
  startRect: Rect;
  startRotation: number;
  moved: boolean;
}

export interface PageStageProps {
  page: LaidOutPage;
  zoom: number;
  active: boolean;
  onActivate: () => void;
}

export function PageStage({ page, zoom, active, onActivate }: PageStageProps) {
  const doc = useEditor((s) => s.doc);
  const laid = useEditor((s) => s.laid);
  const selection = useEditor((s) => s.selection);
  const mode = useEditor((s) => s.mode);
  const showGrid = useEditor((s) => s.showGrid);
  const snapEnabled = useEditor((s) => s.snapEnabled);
  const editingId = useEditor((s) => s.editingId);
  const store = useEditor;

  const { openContextMenu, host } = useCommands();
  const compact = useCompactLayout();
  const coarse = useCoarsePointer();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [hoverSlot, setHoverSlot] = useState<string | null>(null);

  const boxes = useMemo(() => hitBoxesFor(page, doc.overlays), [page, doc.overlays]);
  const interactive = mode === 'design';

  const selectedIds =
    selection.kind === 'block' || selection.kind === 'overlay' ? selection.ids : [];

  /** Pointer position in page points. */
  const toPagePoint = useCallback(
    (event: { clientX: number; clientY: number }) => {
      const rect = surfaceRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (event.clientX - rect.left) / zoom,
        y: (event.clientY - rect.top) / zoom,
      };
    },
    [zoom],
  );

  const overlayById = useCallback(
    (id: string): Overlay | undefined => store.getState().doc.overlays.find((o) => o.id === id),
    [store],
  );

  const beginDrag = (
    event: React.PointerEvent,
    box: HitBox,
    dragMode: DragState['mode'],
    handle?: HandleId,
  ) => {
    if (!interactive || box.locked) return;
    event.stopPropagation();
    // Only the handles swallow the default action. Suppressing it on the body
    // of an element would also swallow the double-click that opens the text
    // editor, so a move/reorder drag stays passive until the pointer actually
    // travels far enough to count as a drag.
    if (dragMode === 'resize' || dragMode === 'rotate') {
      event.preventDefault();
      (event.target as Element).setPointerCapture?.(event.pointerId);
    }

    dragRef.current = {
      mode: dragMode,
      id: box.id,
      kind: box.kind,
      handle,
      startPointer: toPagePoint(event),
      startRect: { x: box.x, y: box.y, width: box.width, height: box.height },
      startRotation: box.rotation,
      moved: false,
    };
  };

  /**
   * Which insertion gap the pointer is near.
   *
   * Reading it off the pointer rather than giving every gap its own hit area
   * keeps the strips out of the way: a full-width band above the blocks would
   * swallow clicks on their edges and kill drag-to-reorder.
   */
  const trackSlotHover = (event: React.PointerEvent) => {
    if (!slots.length) {
      if (hoverSlot) setHoverSlot(null);
      return;
    }
    const point = toPagePoint(event);
    const tolerance = Math.max(3, 11 / zoom);
    const near = slots.find(
      (slot) =>
        slot.kind === 'gap' &&
        Math.abs(point.y - slot.y) <= Math.max(tolerance, slot.gap / 2) &&
        point.x >= slot.x - 4 &&
        point.x <= slot.x + slot.width + 4,
    );
    setHoverSlot(near?.key ?? null);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) {
      trackSlotHover(event);
      return;
    }
    const point = toPagePoint(event);
    const dx = point.x - drag.startPointer.x;
    const dy = point.y - drag.startPointer.y;
    if (!drag.moved && Math.hypot(dx, dy) < 3) return;
    if (!drag.moved) {
      drag.moved = true;
      surfaceRef.current?.setPointerCapture?.(event.pointerId);
    }

    if (drag.kind === 'flow') {
      setDropIndex(nearestFlowSlot(point.y));
      return;
    }

    const others = boxes
      .filter((b) => b.kind === 'overlay' && b.id !== drag.id)
      .map((b) => ({ x: b.x, y: b.y, width: b.width, height: b.height }));

    if (drag.mode === 'move') {
      const moved = { ...drag.startRect, x: drag.startRect.x + dx, y: drag.startRect.y + dy };
      const snapped = snapRect(moved, page, others, snapEnabled && !event.altKey);
      setGuides(snapped.guides);
      store.getState().updateOverlay(drag.id, { x: snapped.x, y: snapped.y }, { coalesce: `move:${drag.id}` });
      return;
    }

    if (drag.mode === 'resize' && drag.handle) {
      const overlay = overlayById(drag.id);
      const keepAspect = event.shiftKey || overlay?.kind === 'image';
      // A line is a pair of points, not a box: forcing a minimum height on a
      // horizontal one bends it the moment you drag either end.
      const next = resizeRect(
        drag.startRect,
        drag.handle,
        dx,
        dy,
        keepAspect,
        overlay?.kind === 'line' ? 0 : undefined,
      );
      const snapped = snapRect(next, page, others, snapEnabled && !event.altKey);
      setGuides(snapped.guides);
      store.getState().updateOverlay(
        drag.id,
        {
          x: snapped.x,
          y: snapped.y,
          width: next.width,
          height: next.height,
          ...(overlay?.kind === 'text' ? { autoHeight: false } : {}),
        },
        { coalesce: `resize:${drag.id}` },
      );
      return;
    }

    if (drag.mode === 'rotate') {
      const cx = drag.startRect.x + drag.startRect.width / 2;
      const cy = drag.startRect.y + drag.startRect.height / 2;
      const raw = angleTo(cx, cy, point.x, point.y);
      const angle = event.shiftKey ? Math.round(raw / 15) * 15 : Math.round(raw);
      store.getState().updateOverlay(drag.id, { rotation: angle }, { coalesce: `rotate:${drag.id}` });
    }
  };

  const endDrag = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    setGuides([]);

    if (drag?.kind === 'flow' && drag.moved && dropIndex !== null) {
      const from = store.getState().doc.flow.findIndex((b) => b.id === drag.id);
      if (from >= 0 && dropIndex !== from && dropIndex !== from + 1) {
        store.getState().moveBlock(from, dropIndex > from ? dropIndex - 1 : dropIndex);
      }
    }
    setDropIndex(null);
  };

  /** Flow index whose gap is nearest the pointer, for drag-to-reorder. */
  const nearestFlowSlot = (y: number) => {
    const flowBoxes = boxes.filter((b) => b.kind === 'flow');
    if (!flowBoxes.length) return null;
    let best = { index: 0, distance: Infinity };
    flowBoxes.forEach((box) => {
      const index = doc.flow.findIndex((b) => b.id === box.id);
      if (index < 0) return;
      const top = Math.abs(y - box.y);
      const bottom = Math.abs(y - (box.y + box.height));
      if (top < best.distance) best = { index, distance: top };
      if (bottom < best.distance) best = { index: index + 1, distance: bottom };
    });
    return best.index;
  };

  const selectedOverlays = doc.overlays.filter(
    (o) => o.page === page.index && selectedIds.includes(o.id),
  );

  const selectedFlowBox =
    selection.kind === 'block' && selection.ids.length === 1
      ? boxes.find((b) => b.kind === 'flow' && b.id === selection.ids[0])
      : undefined;

  /** The one element whose toolbar belongs on this page, flow or drawn. */
  const toolbarBox =
    selectedFlowBox ??
    (selection.kind === 'overlay' && selection.ids.length === 1
      ? boxes.find((b) => b.kind === 'overlay' && b.id === selection.ids[0])
      : undefined);

  const flowIndexOf = (id: string) => doc.flow.findIndex((b) => b.id === id);
  const selectedIndex =
    selection.kind === 'block' && selection.ids.length === 1
      ? flowIndexOf(selection.ids[0])
      : -1;

  const slots =
    interactive && !editingId
      ? insertSlots(page, boxes, doc.flow, {
          selectedIndex,
          isLastPage: page.index === laid.pages.length - 1,
          blockPages: laid.blockPages,
          columns: doc.page.columns,
          columnGap: doc.page.columnGap,
        })
      : [];

  /**
   * The running header and footer are drawn by the page, not by anything in the
   * flow, so clicking them used to do nothing at all - leaving "Page 1 of 1"
   * looking like a fixed part of the paper. They get their own target instead,
   * which opens the settings that own them.
   */
  const masterBands = (['header', 'footer'] as const)
    .map((which) => {
      const frames = page.masterFrames.filter((f) => f.source.id === which);
      if (!frames.length) return null;
      const left = Math.min(...frames.map((f) => f.x));
      const top = Math.min(...frames.map((f) => f.y));
      const right = Math.max(...frames.map((f) => f.x + f.width));
      const bottom = Math.max(...frames.map((f) => f.y + f.height));
      return { which, x: left, y: top, width: right - left, height: Math.max(bottom - top, 10) };
    })
    .filter((band): band is NonNullable<typeof band> => band !== null);

  const px = (value: number) => value * zoom;

  /**
   * A horizontal line is zero points tall, which leaves a target only a few
   * pixels high once the page is zoomed to fit - too fine to hit with a
   * trackpad, and impossible with a finger. Thin elements get an invisible
   * margin so they can be picked up; the outline still shows their true size.
   */
  const MIN_HIT = 14;

  return (
    <div
      className={cx(
        'relative shrink-0 rounded-[3px] bg-white paper-shadow transition-shadow',
        active && interactive && 'ring-1 ring-question-hue/25',
      )}
      style={{ width: px(page.width), height: px(page.height) }}
      onPointerDown={onActivate}
    >
      <div
        className="absolute inset-0 origin-top-left"
        style={{ transform: `scale(${zoom})`, width: page.width, height: page.height }}
      >
        <PageSvg page={page} showGuides={interactive} showGrid={showGrid} />
      </div>

      {interactive ? (
        <div
          ref={surfaceRef}
          className="absolute inset-0"
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={() => setHoverSlot(null)}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) store.getState().clearSelection();
          }}
          onContextMenu={(e) => {
            // Right-clicking bare page keeps whatever was selected, so the menu
            // still offers something useful rather than going empty.
            e.preventDefault();
            openContextMenu(e.clientX, e.clientY);
          }}
        >
          {boxes.map((box) => {
            const isSelected = selectedIds.includes(box.id);
            const isEditing = editingId === box.id;
            const width = px(box.width);
            const height = px(box.height);
            const padX = Math.max(0, (MIN_HIT - width) / 2);
            const padY = Math.max(0, (MIN_HIT - height) / 2);
            return (
              <div
                key={`${box.kind}-${box.id}`}
                className={cx(
                  'absolute',
                  box.locked ? 'cursor-default' : 'cursor-move',
                  isEditing && 'pointer-events-none',
                )}
                style={{
                  left: px(box.x) - padX,
                  top: px(box.y) - padY,
                  width: width + padX * 2,
                  height: height + padY * 2,
                  transform: box.rotation ? `rotate(${box.rotation}deg)` : undefined,
                  // A finger on an unselected element should scroll the page;
                  // once it is selected, the same finger drags it instead.
                  touchAction: isSelected && !box.locked ? 'none' : 'manipulation',
                }}
                onPointerEnter={() => setHovered(box.id)}
                onPointerLeave={() => setHovered((h) => (h === box.id ? null : h))}
                onPointerDown={(e) => {
                  if (e.button === 2) {
                    // Right-click selects what is under the pointer first, so
                    // the menu that follows is about the thing you aimed at.
                    if (box.kind === 'overlay') store.getState().selectOverlay(box.id);
                    else store.getState().selectBlock(box.id);
                    return;
                  }
                  if (e.button !== 0) return;
                  if (box.kind === 'overlay') store.getState().selectOverlay(box.id, e.shiftKey);
                  else store.getState().selectBlock(box.id, e.shiftKey);
                  beginDrag(e, box, box.kind === 'flow' ? 'reorder' : 'move');
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  store.getState().beginEditing(box.id);
                }}
              >
                <div
                  style={{ position: 'absolute', left: padX, top: padY, width, height }}
                  className={cx(
                    'pointer-events-none rounded-[2px] transition-colors',
                    isSelected
                      ? box.kind === 'overlay'
                        ? 'outline outline-[1.5px] outline-question-hue'
                        : 'bg-question-hue/[0.06] outline outline-[1.5px] outline-question-hue'
                      : hovered === box.id
                        ? 'outline outline-1 outline-dashed outline-[#dcd6cc]'
                        : '',
                  )}
                />
                {box.locked && isSelected ? (
                  <span className="pointer-events-none absolute -top-5 left-0 flex items-center gap-1 rounded bg-ink px-1.5 py-0.5 text-[10px] text-white">
                    <Lock size={10} /> Locked
                  </span>
                ) : null}
              </div>
            );
          })}

          {selectedOverlays.map((overlay) => (
            <OverlayHandles
              key={overlay.id}
              overlay={overlay}
              zoom={zoom}
              large={coarse}
              onHandle={(e, handle) =>
                beginDrag(
                  e,
                  {
                    x: overlay.x,
                    y: overlay.y,
                    width: overlay.width,
                    height: overlay.height,
                    kind: 'overlay',
                    id: overlay.id,
                    rotation: overlay.rotation,
                    locked: overlay.locked,
                    z: overlay.z,
                  },
                  handle === 'rotate' ? 'rotate' : 'resize',
                  handle === 'rotate' ? undefined : handle,
                )
              }
            />
          ))}

          {toolbarBox && !compact && !editingId ? (
            <SelectionToolbar
              variant="floating"
              box={toolbarBox}
              zoom={zoom}
              pageHeight={page.height}
            />
          ) : null}

          {slots.length ? (
            <InsertPoints
              slots={slots}
              zoom={zoom}
              hoverKey={hoverSlot}
              emptyDocument={doc.flow.length === 0}
            />
          ) : null}

          {masterBands.map((band) => (
            <button
              key={band.which}
              type="button"
              title={`${band.which === 'footer' ? 'Footer' : 'Header'} - click to change or remove it`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => host.openPanel('document')}
              className="absolute rounded border border-transparent transition-colors hover:border-dashed hover:border-question-hue/50 hover:bg-question-wash/30"
              style={{
                left: px(band.x) - 4,
                top: px(band.y) - 3,
                width: px(band.width) + 8,
                height: px(band.height) + 6,
              }}
            />
          ))}

          {guides.map((guide, i) => (
            <div
              key={i}
              className="pointer-events-none absolute bg-draw-hue/70"
              style={
                guide.axis === 'x'
                  ? { left: px(guide.position), top: 0, width: 1, height: px(page.height) }
                  : { top: px(guide.position), left: 0, height: 1, width: px(page.width) }
              }
            />
          ))}

          {dropIndex !== null ? <DropIndicator index={dropIndex} page={page} zoom={zoom} /> : null}
        </div>
      ) : null}

      <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[11px] font-medium text-faint">
        {page.index + 1}
      </span>

      {laid.warnings.some((w) => w.page === page.index) ? (
        <span className="absolute -top-6 right-0 rounded bg-structure-wash px-2 py-0.5 text-[10px] font-medium text-structure-hue">
          Content overflows this page
        </span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Handles
 * ------------------------------------------------------------------ */

function OverlayHandles({
  overlay,
  zoom,
  large,
  onHandle,
}: {
  overlay: Overlay;
  zoom: number;
  /** Fingers need a bigger target than a mouse pointer does. */
  large: boolean;
  onHandle: (event: React.PointerEvent, handle: HandleId | 'rotate') => void;
}) {
  if (overlay.locked) return null;
  const px = (v: number) => v * zoom;
  const handleSize = large ? 'h-4 w-4' : 'h-2.5 w-2.5';

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: px(overlay.x),
        top: px(overlay.y),
        width: px(overlay.width),
        height: px(overlay.height),
        transform: overlay.rotation ? `rotate(${overlay.rotation}deg)` : undefined,
      }}
    >
      {HANDLES.map((handle) => (
        <span
          key={handle.id}
          role="presentation"
          onPointerDown={(e) => onHandle(e, handle.id)}
          className={cx(
            'pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 touch-none rounded-[2px] border border-question-hue bg-white shadow-sm',
            handleSize,
          )}
          style={{
            left: `${handle.cx * 100}%`,
            top: `${handle.cy * 100}%`,
            cursor: handle.cursor,
          }}
        />
      ))}
      <span
        role="presentation"
        onPointerDown={(e) => onHandle(e, 'rotate')}
        title="Rotate"
        className={cx(
          'pointer-events-auto absolute left-1/2 -translate-x-1/2 cursor-grab touch-none rounded-full border border-question-hue bg-white shadow-sm',
          large ? 'h-5 w-5' : 'h-3 w-3',
        )}
        style={{ top: large ? -30 : -22 }}
      />
      <span
        className="absolute left-1/2 w-px bg-question-hue/50"
        style={{ top: -19, height: 19 }}
      />
      {overlay.rotation ? (
        <span className="absolute -top-9 left-1/2 -translate-x-1/2 rounded bg-ink px-1.5 py-0.5 text-[10px] text-white">
          {Math.round(overlay.rotation)}°
        </span>
      ) : null}
    </div>
  );
}

function DropIndicator({
  index,
  page,
  zoom,
}: {
  index: number;
  page: LaidOutPage;
  zoom: number;
}) {
  const doc = useEditor((s) => s.doc);
  const boxes = hitBoxesFor(page, doc.overlays).filter((b) => b.kind === 'flow');
  const target = doc.flow[index];
  const previous = doc.flow[index - 1];
  const box =
    boxes.find((b) => b.id === target?.id) ?? boxes.find((b) => b.id === previous?.id);
  if (!box) return null;
  const y = target && boxes.some((b) => b.id === target.id) ? box.y : box.y + box.height;

  return (
    <div
      className="pointer-events-none absolute h-[2px] rounded-full bg-question-hue"
      style={{
        left: page.content.x * zoom,
        width: page.content.width * zoom,
        top: clamp(y, 0, page.height) * zoom,
      }}
    />
  );
}
