'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useEditor } from '@/lib/store/editorStore';
import { cx } from '@/lib/utils/cx';
import { clamp } from '@/lib/utils/geom';
import { InlineTextEditor } from './InlineTextEditor';
import { PageStage } from './PageStage';

const PAGE_GAP = 40;
const PADDING = 40;

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

  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const programmaticScroll = useRef(false);

  const firstPage = laid.pages[0];

  /* Fit-to-width / fit-to-page recompute on container resize. */
  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node || !firstPage || fitMode === 'manual') return;

    const apply = () => {
      const available = node.clientWidth - PADDING * 2;
      const availableHeight = node.clientHeight - PADDING * 2;
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
  }, [fitMode, firstPage, setZoom]);

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

  /* Track which page is centred so the page indicator stays honest. */
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
    if (best !== useEditor.getState().activePage) setActivePage(best);
  }, [setActivePage]);

  /* Scroll to the active page when it changes from outside (thumbnails, nav). */
  const lastActive = useRef(activePage);
  useEffect(() => {
    if (lastActive.current === activePage) return;
    lastActive.current = activePage;
    const target = pageRefs.current[activePage];
    const node = scrollRef.current;
    if (!target || !node) return;
    programmaticScroll.current = true;
    node.scrollTo({ top: Math.max(0, target.offsetTop - PADDING), behavior: 'smooth' });
    const timer = setTimeout(() => {
      programmaticScroll.current = false;
    }, 400);
    return () => clearTimeout(timer);
  }, [activePage]);

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className={cx(
        'canvas-backdrop relative h-full overflow-auto',
        mode === 'preview' && 'cursor-default',
      )}
    >
      <div
        className="flex flex-col items-center"
        style={{ gap: PAGE_GAP, paddingBlock: PADDING, paddingInline: PADDING }}
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
