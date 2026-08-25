'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Lock, Scissors, Trash2 } from 'lucide-react';
import type { LaidOutPage } from '@/lib/engine/types';
import type { Overlay } from '@/lib/model/types';
import { useEditor } from '@/lib/store/editorStore';
import { cx } from '@/lib/utils/cx';
import { clamp, type Rect } from '@/lib/utils/geom';
import { PageSvg } from './PageSvg';
import {
  angleTo,
  HANDLES,
  hitBoxesFor,
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

  const surfaceRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

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
    mode: DragState['mode'],
    handle?: HandleId,
  ) => {
    if (!interactive || box.locked) return;
    event.stopPropagation();
    event.preventDefault();
    (event.target as Element).setPointerCapture?.(event.pointerId);

    dragRef.current = {
      mode,
      id: box.id,
      kind: box.kind,
      handle,
      startPointer: toPagePoint(event),
      startRect: { x: box.x, y: box.y, width: box.width, height: box.height },
      startRotation: box.rotation,
      moved: false,
    };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const point = toPagePoint(event);
    const dx = point.x - drag.startPointer.x;
    const dy = point.y - drag.startPointer.y;
    if (!drag.moved && Math.hypot(dx, dy) < 2) return;
    drag.moved = true;

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
      const next = resizeRect(drag.startRect, drag.handle, dx, dy, keepAspect);
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

  const px = (value: number) => value * zoom;

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
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) store.getState().clearSelection();
          }}
        >
          {boxes.map((box) => {
            const isSelected = selectedIds.includes(box.id);
            const isEditing = editingId === box.id;
            return (
              <div
                key={`${box.kind}-${box.id}`}
                className={cx(
                  'absolute',
                  box.locked ? 'cursor-default' : 'cursor-move',
                  isEditing && 'pointer-events-none',
                )}
                style={{
                  left: px(box.x),
                  top: px(box.y),
                  width: px(box.width),
                  height: px(box.height),
                  transform: box.rotation ? `rotate(${box.rotation}deg)` : undefined,
                }}
                onPointerEnter={() => setHovered(box.id)}
                onPointerLeave={() => setHovered((h) => (h === box.id ? null : h))}
                onPointerDown={(e) => {
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
                  className={cx(
                    'pointer-events-none h-full w-full rounded-[2px] transition-colors',
                    isSelected
                      ? box.kind === 'overlay'
                        ? 'outline outline-[1.5px] outline-question-hue'
                        : 'bg-question-hue/[0.06] outline outline-[1.5px] outline-question-hue'
                      : hovered === box.id
                        ? 'outline outline-1 outline-dashed outline-slate-300'
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

          {selectedFlowBox ? <FlowBlockToolbar box={selectedFlowBox} zoom={zoom} /> : null}

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
  onHandle,
}: {
  overlay: Overlay;
  zoom: number;
  onHandle: (event: React.PointerEvent, handle: HandleId | 'rotate') => void;
}) {
  if (overlay.locked) return null;
  const px = (v: number) => v * zoom;

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
          className="pointer-events-auto absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-[2px] border border-question-hue bg-white shadow-sm"
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
        className="pointer-events-auto absolute left-1/2 h-3 w-3 -translate-x-1/2 cursor-grab rounded-full border border-question-hue bg-white shadow-sm"
        style={{ top: -22 }}
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

/** Quick actions that follow the selected flow block on the page. */
function FlowBlockToolbar({ box, zoom }: { box: HitBox; zoom: number }) {
  const store = useEditor;
  const flow = useEditor((s) => s.doc.flow);
  const index = flow.findIndex((b) => b.id === box.id);
  const px = (v: number) => v * zoom;

  const actions = [
    {
      icon: <ArrowUp size={13} />,
      label: 'Move up',
      disabled: index <= 0,
      run: () => store.getState().moveBlock(index, index - 1),
    },
    {
      icon: <ArrowDown size={13} />,
      label: 'Move down',
      disabled: index < 0 || index >= flow.length - 1,
      run: () => store.getState().moveBlock(index, index + 1),
    },
    {
      icon: <Scissors size={13} />,
      label: 'Page break before',
      run: () => store.getState().breakBefore(box.id),
    },
    {
      icon: <Copy size={13} />,
      label: 'Duplicate',
      run: () => store.getState().duplicateBlockById(box.id),
    },
    {
      icon: <Trash2 size={13} />,
      label: 'Delete',
      danger: true,
      run: () => store.getState().removeBlock(box.id),
    },
  ];

  return (
    <div
      className="animate-rise absolute z-20 flex items-center gap-0.5 rounded-lg border border-line bg-white p-1 shadow-lg"
      style={{ left: px(box.x), top: px(box.y) - 38 }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          title={action.label}
          aria-label={action.label}
          disabled={action.disabled}
          onClick={action.run}
          className={cx(
            'flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-30',
            action.danger ? 'text-danger hover:bg-danger-wash' : 'text-ink-soft hover:bg-slate-100',
          )}
        >
          {action.icon}
        </button>
      ))}
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
