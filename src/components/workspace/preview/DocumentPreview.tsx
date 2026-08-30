'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Eye } from 'lucide-react';
import type { LaidOutDoc } from '@/lib/engine/types';
import { cx } from '@/lib/utils/cx';
import { PageSvg } from '@/components/editor/canvas/PageSvg';
import { Panel, PanelHeading } from '../ui/Card';
import { PreviewControls } from './PreviewControls';

/**
 * The real document, drawn by the real renderer.
 *
 * This is the same `PageSvg` the editor uses on the same `LaidOutDoc` the PDF
 * exporter consumes, so the sheet here is not a picture of the output - it is
 * the output. A change to a field or a setting reaches it through the layout
 * engine, which is why the numbering and the page count are always honest.
 */
export function DocumentPreview({
  laid,
  zoom,
  onZoomIn,
  onZoomOut,
  onFit,
}: {
  laid: LaidOutDoc;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  /* The sheet is measured in points; the panel it sits in is measured in pixels
     and changes with the window, so the fit is observed rather than assumed -
     in both directions, because a page that fits the width can still be too
     tall for the panel. */
  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setBox({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const page = laid.pages[0];
  // Before the panel has been measured - server render, and the first frame -
  // sensible numbers keep the sheet on screen rather than flashing a message at
  // somebody who only wants to see their document.
  const width = box.width || 520;
  const height = box.height || 700;

  /**
   * At 100% the whole sheet is shown, so a single-page document never needs a
   * scrollbar: the panel is the page. Zooming past that is a deliberate ask to
   * look closer, and only then does the view start to scroll.
   */
  const fit = page ? Math.min(width / page.width, height / page.height) : 0;
  const scale = fit * zoom;

  /** The widest page, and the height of the whole stack with its gaps. */
  const pageWidth = laid.pages.reduce((widest, sheet) => Math.max(widest, sheet.width), 1);
  const stackHeight =
    laid.pages.reduce((total, sheet) => total + sheet.height, 0) +
    Math.max(0, laid.pages.length - 1) * 24;

  return (
    <Panel className="relative overflow-hidden">
      <PanelHeading
        icon={<Eye size={15} />}
        title="Live preview"
        action={
          <span className="flex items-center gap-3">
            {laid.warnings.length ? (
              <span
                title={laid.warnings.map((w) => w.message).join('\n')}
                className="flex items-center gap-1.5 rounded-md bg-[#FBE4CF] px-2 py-1 text-[11.5px] font-medium text-[#B0541A]"
              >
                <AlertTriangle size={12} />
                {laid.warnings.length} note{laid.warnings.length === 1 ? '' : 's'}
              </span>
            ) : null}
            <span className="hidden text-[12px] whitespace-nowrap text-forge-muted min-[420px]:inline">
              {laid.pages.length} page{laid.pages.length === 1 ? '' : 's'}
              {laid.totalMarks ? ` · ${laid.totalMarks} marks` : ''}
            </span>
          </span>
        }
      />

      <div
        ref={frameRef}
        className={cx(
          'forge-scroll flex min-h-0 flex-1 flex-col px-5 pb-14 sm:px-8',
          // Only a page that has outgrown the panel earns a scrollbar.
          zoom > 1 || laid.pages.length > 1 ? 'overflow-auto' : 'overflow-hidden',
        )}
      >
        {page && scale > 0 ? (
          // The outer box is the *scaled* size, so centring and the scroll
          // extent both describe what is actually on screen. Scaling a
          // full-size box instead would push the sheet off to one side the
          // moment the panel was narrower than the paper.
          <motion.div
            animate={{ width: pageWidth * scale, height: stackHeight * scale }}
            initial={false}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="m-auto"
          >
            <motion.div
              animate={{ scale }}
              initial={false}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              style={{ transformOrigin: 'top left', width: pageWidth }}
              className="space-y-6"
            >
              {laid.pages.map((sheet) => (
                <div
                  key={sheet.index}
                  className="forge-paper relative overflow-hidden rounded-lg"
                  style={{ width: sheet.width, height: sheet.height }}
                >
                  <PageSvg page={sheet} showGuides={false} showGrid={false} />
                </div>
              ))}
            </motion.div>
          </motion.div>
        ) : (
          <p className="m-auto text-[13px] text-forge-muted">Preparing your page…</p>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16">
        <PreviewControls zoom={zoom} onZoomIn={onZoomIn} onZoomOut={onZoomOut} onFit={onFit} />
      </div>
    </Panel>
  );
}
