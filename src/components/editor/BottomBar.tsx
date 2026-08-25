'use client';

import { ChevronLeft, ChevronRight, Maximize, Minus, Plus, Scan } from 'lucide-react';
import { useEditor } from '@/lib/store/editorStore';
import { clamp } from '@/lib/utils/geom';
import { IconButton, Segmented } from '@/components/ui/primitives';

const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];

export function BottomBar() {
  const zoom = useEditor((s) => s.zoom);
  const fitMode = useEditor((s) => s.fitMode);
  const activePage = useEditor((s) => s.activePage);
  const pages = useEditor((s) => s.laid.pages.length);
  const store = useEditor;

  const step = (direction: 1 | -1) => {
    const current = zoom;
    const next =
      direction > 0
        ? (ZOOM_STEPS.find((z) => z > current + 0.001) ?? 5)
        : ([...ZOOM_STEPS].reverse().find((z) => z < current - 0.001) ?? 0.15);
    store.getState().setZoom(next, 'manual');
  };

  return (
    <footer className="flex h-11 shrink-0 items-center gap-2 border-t border-line bg-panel px-3">
      <div className="flex items-center gap-1">
        <IconButton
          label="Previous page"
          disabled={activePage <= 0}
          onClick={() => store.getState().setActivePage(activePage - 1)}
        >
          <ChevronLeft size={16} />
        </IconButton>
        <span className="flex items-center gap-1 text-[12px] text-muted">
          <input
            type="number"
            value={activePage + 1}
            min={1}
            max={Math.max(1, pages)}
            onChange={(e) =>
              store.getState().setActivePage(clamp(Number(e.target.value) - 1, 0, pages - 1))
            }
            aria-label="Page number"
            className="h-7 w-11 rounded-md border border-line px-1.5 text-center text-[12px] focus:border-question-hue focus:outline-none"
          />
          <span className="whitespace-nowrap">of {pages}</span>
        </span>
        <IconButton
          label="Next page"
          disabled={activePage >= pages - 1}
          onClick={() => store.getState().setActivePage(activePage + 1)}
        >
          <ChevronRight size={16} />
        </IconButton>
      </div>

      <div className="mx-1 h-6 w-px bg-line" />

      <button
        type="button"
        onClick={() => store.getState().addPage(activePage)}
        className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-[12px] text-ink-soft transition-colors hover:bg-slate-100"
      >
        <Plus size={13} /> Add page
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <Segmented
          value={fitMode}
          onChange={(next) => store.getState().setZoom(zoom, next)}
          options={[
            { value: 'width', label: <Maximize size={13} />, title: 'Fit width' },
            { value: 'page', label: <Scan size={13} />, title: 'Fit page' },
            { value: 'manual', label: `${Math.round(zoom * 100)}%`, title: 'Manual zoom' },
          ]}
        />
        <IconButton label="Zoom out" onClick={() => step(-1)}>
          <Minus size={16} />
        </IconButton>
        <input
          type="range"
          min={15}
          max={300}
          value={Math.round(zoom * 100)}
          onChange={(e) => store.getState().setZoom(Number(e.target.value) / 100, 'manual')}
          aria-label="Zoom"
          className="h-1.5 w-28 cursor-pointer appearance-none rounded-full bg-line
                     [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-ink"
        />
        <IconButton label="Zoom in" onClick={() => step(1)}>
          <Plus size={16} />
        </IconButton>
      </div>
    </footer>
  );
}
