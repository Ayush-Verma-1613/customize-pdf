'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useEditor } from '@/lib/store/editorStore';
import { useCompactLayout } from '@/lib/utils/useMedia';
import { cx } from '@/lib/utils/cx';
import { clamp } from '@/lib/utils/geom';
import { InlineTextEditor } from './InlineTextEditor';
import { PageStage } from './PageStage';

const PAGE_GAP = 44;
/** Leaves room for the selected block's gutter toolbar beside the page. */
const PADDING = 56;
/** Phones get the page edge-to-edge; there is no gutter to reserve. */
const COMPACT_PADDING = 10;
const COMPACT_GAP = 22;

/**
 * The scrolling document view. Zoom is applied per page rather than to a single
 * transformed wrapper so scroll offsets stay meaningful and the browser only
 * paints the pages actually on screen.
 */
export function CanvasArea() {
  const laid = useEditor((s) => s.laid);
  const zoom = useEditor((s) => s.zoom);
  const fitMode = useEditor((s) => s.fitMode);
  const activePage = useEditor((s) => s.activePage);
  const mode = useEditor((s) => s.mode);
  const setZoom = useEditor((s) => s.setZoom);
  const setActivePage = useEditor((s) => s.setActivePage);

  const compact = useCompactLayout();
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const programmaticScroll = useRef(false);

  const firstPage = laid.pages[0];
  const padding = compact ? COMPACT_PADDING : PADDING;
  const gap = compact ? COMPACT_GAP : PAGE_GAP;

  /* Fit-to-width / fit-to-page recompute on container resize. */
  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node || !firstPage || fitMode === 'manual') return;

    const apply = () => {
      const available = node.clientWidth - padding * 2;
      const availableHeight = node.clientHeight - padding * 2;
      const next =
        fitMode === 'width'
          ? available / firstPage.width
          : Math.min(available / firstPage.width, availableHeight / firstPage.height);
      setZoom(clamp(next, 0.15, 3), fitMode);
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => observer.disconnect();
  }, [fitMode, firstPage, padding, setZoom]);

  /* Ctrl/Cmd + wheel zooms, anchored on the pointer. */
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const current = useEditor.getState().zoom;
      setZoom(clamp(current * (1 - event.deltaY / 500), 0.15, 5), 'manual');
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [setZoom]);

  /**
   * Two fingers pinch and pan the document.
   *
   * Panning has to live here because everything on the page now takes its own
   * gesture: an element that handed its touches to the scroller could never be
   * dragged, since the browser decides that before the app sees the finger.
   * So one finger moves what it lands on and two fingers move the page, which
   * is the bargain every canvas editor on a phone makes. One finger still
   * scrolls anywhere off the page - the margin around it, the backdrop.
   */
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    const active = new Map<number, { x: number; y: number }>();
    let startSpread = 0;
    let startZoom = 1;
    let lastMid: { x: number; y: number } | null = null;

    const spread = () => {
      const [a, b] = [...active.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const midpoint = () => {
      const [a, b] = [...active.values()];
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    };

    const down = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') return;
      active.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (active.size === 2) {
        startSpread = spread();
        startZoom = useEditor.getState().zoom;
        lastMid = midpoint();
      }
    };

    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' || !active.has(event.pointerId)) return;
      active.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (active.size !== 2 || startSpread <= 0) return;
      event.preventDefault();
      setZoom(clamp((startZoom * spread()) / startSpread, 0.15, 5), 'manual');

      // The page follows the point between the fingers, so pinching and moving
      // are one gesture rather than two that have to be taken in turns.
      const mid = midpoint();
      if (lastMid) {
        node.scrollLeft -= mid.x - lastMid.x;
        node.scrollTop -= mid.y - lastMid.y;
      }
      lastMid = mid;
    };

    const up = (event: PointerEvent) => {
      active.delete(event.pointerId);
      if (active.size < 2) {
        startSpread = 0;
        lastMid = null;
      }
    };

    node.addEventListener('pointerdown', down);
    node.addEventListener('pointermove', move, { passive: false });
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', up);
    return () => {
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('pointercancel', up);
    };
  }, [setZoom]);

  /* Track which page is centred so the page indicator stays honest. */
  const lastActive = useRef(activePage);
  const onScroll = useCallback(() => {
    if (programmaticScroll.current) return;
    const node = scrollRef.current;
    if (!node) return;
    const midpoint = node.scrollTop + node.clientHeight / 2;
    let best = 0;
    let bestDistance = Infinity;
    pageRefs.current.forEach((page, i) => {
      if (!page) return;
      const centre = page.offsetTop + page.offsetHeight / 2;
      const distance = Math.abs(centre - midpoint);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    });
    if (best === useEditor.getState().activePage) return;
    // Scrolling is what moved the page, so the effect below - which exists to
    // follow a page chosen somewhere else - must not answer by scrolling again.
    // Left unmarked it snapped the view back to the top of whichever page had
    // just drifted into the middle, which fought every pan.
    lastActive.current = best;
    setActivePage(best);
  }, [setActivePage]);

  /* Scroll to the active page when it changes from outside (thumbnails, nav). */
  useEffect(() => {
    if (lastActive.current === activePage) return;
    lastActive.current = activePage;
    const target = pageRefs.current[activePage];
    const node = scrollRef.current;
    if (!target || !node) return;
    programmaticScroll.current = true;
    node.scrollTo({ top: Math.max(0, target.offsetTop - padding), behavior: 'smooth' });
    const timer = setTimeout(() => {
      programmaticScroll.current = false;
    }, 400);
    return () => clearTimeout(timer);
  }, [activePage, padding]);

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className={cx(
        'canvas-backdrop relative h-full overflow-auto',
        mode === 'preview' && 'cursor-default',
      )}
      style={{ touchAction: 'pan-x pan-y' }}
    >
      <div
        className="flex flex-col items-center"
        style={{ gap, paddingBlock: padding, paddingInline: padding }}
      >
        {laid.pages.map((page, index) => (
          <div
            key={page.index}
            ref={(node) => {
              pageRefs.current[index] = node;
            }}
            className="relative"
          >
            <PageStage
              page={page}
              zoom={zoom}
              active={index === activePage}
              onActivate={() => setActivePage(index)}
            />
            {mode === 'design' ? (
              <div
                className="pointer-events-none absolute inset-0"
                style={{ width: page.width * zoom, height: page.height * zoom }}
              >
                <div className="pointer-events-auto">
                  <InlineTextEditor page={page} zoom={zoom} />
                </div>
              </div>
            ) : null}
          </div>
        ))}

        {!laid.pages.length ? (
          <p className="mt-24 text-sm text-muted">Preparing the document…</p>
        ) : null}
      </div>
    </div>
  );
}
