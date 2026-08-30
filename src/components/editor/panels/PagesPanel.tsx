'use client';

import { useState } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { useEditor } from '@/lib/store/editorStore';
import { cx } from '@/lib/utils/cx';
import { PageSvg } from '@/components/editor/canvas/PageSvg';
import { Button, PanelSection } from '@/components/ui/primitives';

const THUMB_WIDTH = 108;

/** Page thumbnails with reorder, duplicate and delete. */
export function PagesPanel() {
  const laid = useEditor((s) => s.laid);
  const activePage = useEditor((s) => s.activePage);
  const store = useEditor;
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  return (
    <PanelSection
      title={`Pages · ${laid.pages.length}`}
      action={
        <Button
          size="sm"
          tone="ghost"
          icon={<Plus size={13} />}
          onClick={() => store.getState().addPage(activePage)}
        >
          Add
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-2.5">
        {laid.pages.map((page, index) => {
          const scale = THUMB_WIDTH / page.width;
          return (
            <div
              key={page.index}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIndex(index);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null && dragIndex !== index) {
                  store.getState().reorderPage(dragIndex, index);
                }
                setDragIndex(null);
                setOverIndex(null);
              }}
              className="group relative"
            >
              <button
                type="button"
                onClick={() => store.getState().setActivePage(index)}
                className={cx(
                  'block w-full overflow-hidden rounded-md border-2 bg-white transition-colors',
                  index === activePage
                    ? 'border-question-hue'
                    : 'border-line hover:border-[#dcd6cc]',
                  overIndex === index && dragIndex !== null && 'border-draw-hue',
                )}
                style={{ height: page.height * scale }}
                aria-label={`Go to page ${index + 1}`}
              >
                <div
                  className="origin-top-left"
                  style={{ transform: `scale(${scale})`, width: page.width, height: page.height }}
                >
                  <PageSvg page={page} />
                </div>
              </button>

              <span className="mt-1 flex items-center justify-between">
                <span
                  className={cx(
                    'text-[11px] font-medium',
                    index === activePage ? 'text-ink' : 'text-faint',
                  )}
                >
                  Page {index + 1}
                </span>
                <span className="hidden items-center gap-0.5 group-hover:flex">
                  <button
                    type="button"
                    title="Duplicate page"
                    aria-label="Duplicate page"
                    onClick={() => store.getState().duplicatePageAt(index)}
                    className="flex h-5 w-5 items-center justify-center rounded text-muted hover:bg-[#f1ede6]"
                  >
                    <Copy size={11} />
                  </button>
                  <button
                    type="button"
                    title="Delete page"
                    aria-label="Delete page"
                    disabled={laid.pages.length <= 1}
                    onClick={() => store.getState().removePage(index)}
                    className="flex h-5 w-5 items-center justify-center rounded text-danger hover:bg-danger-wash disabled:opacity-30"
                  >
                    <Trash2 size={11} />
                  </button>
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-faint">
        Pages are produced by the content, so deleting one removes the elements
        that start on it. Drag a thumbnail to reorder.
      </p>
    </PanelSection>
  );
}
