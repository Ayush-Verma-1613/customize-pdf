'use client';

import { useState } from 'react';
import { ClipboardPaste, Plus } from 'lucide-react';
import { useEditor } from '@/lib/store/editorStore';
import { cx } from '@/lib/utils/cx';
import { Popup } from '@/components/ui/Popup';
import type { Slot } from './geometry';
import { useCommands } from '../CommandLayer';
import { InsertMenu } from '../InsertMenu';

/**
 * A place to add something, in every gap between blocks.
 *
 * The document itself is the menu of where things can go: point at the space
 * between two questions and the app offers to put something there. Anything
 * else - a panel, a single button pinned to the end - makes you add in the
 * wrong place first and then move it.
 *
 * Each gap knows the index it maps to in the flow, so what you add lands where
 * you pointed rather than at the end.
 */

export function InsertPoints({
  slots,
  zoom,
  hoverKey,
  emptyDocument,
}: {
  slots: Slot[];
  zoom: number;
  /** The gap the pointer is near, tracked by the page rather than by hit areas. */
  hoverKey: string | null;
  /** The document has no content at all, so the invitation gets its full name. */
  emptyDocument: boolean;
}) {
  const { host } = useCommands();
  const clipboard = useEditor((s) => s.clipboard);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      {slots.map((slot) => {
        const isOpen = open === slot.key;
        const isEnd = slot.kind === 'end';
        const shown = isOpen || slot.pinned || hoverKey === slot.key;
        // Never taller than the gap it sits in, or it would swallow clicks
        // meant for the blocks on either side.
        const height = isEnd ? 34 : Math.max(9, Math.min(22, slot.gap * zoom));

        return (
          <div
            key={slot.key}
            // Nothing here takes pointer events, only the controls inside it.
            // The end strip used to, on the grounds that it sat in empty space
            // - but it is a full-width band, and anything that drifts under it
            // becomes unselectable and undraggable. Letting the band itself be
            // inert means it can never take a press meant for the document.
            className="pointer-events-none absolute"
            style={{
              left: slot.x * zoom,
              // The permanent strip hangs below the last block; a hover target
              // straddles the gap it belongs to.
              top: isEnd ? slot.y * zoom : slot.y * zoom - height / 2,
              width: slot.width * zoom,
              height,
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {isEnd ? (
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : slot.key)}
                // Its own gesture, never the scroller's: a press that lands here
                // is meant for this button and nothing else.
                style={{ touchAction: 'none' }}
                className="pointer-events-auto flex h-full w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#dcd6cc] bg-white/70 text-[12px] font-medium text-muted transition-colors hover:border-question-hue/50 hover:bg-question-wash/40 hover:text-question-hue"
              >
                <Plus size={14} />
                {emptyDocument ? 'Add your first heading, question or table' : 'Add something here'}
              </button>
            ) : (
              <span className="relative flex h-full w-full items-center justify-center">
                <span
                  className={cx(
                    'absolute inset-x-0 h-[1.5px] rounded-full transition-opacity',
                    shown ? 'bg-question-hue/45 opacity-100' : 'opacity-0',
                  )}
                />
                <button
                  type="button"
                  aria-label="Add something here"
                  hidden={!shown}
                  onClick={() => setOpen(isOpen ? null : slot.key)}
                  className="pointer-events-auto relative flex h-[18px] w-[18px] items-center justify-center rounded-full border border-question-hue/40 bg-white text-question-hue shadow-sm hover:bg-question-wash"
                >
                  <Plus size={12} />
                </button>
              </span>
            )}

            {isOpen ? (
              <Popup
                label="Add something here"
                onClose={() => setOpen(null)}
                className="pointer-events-auto absolute top-full left-1/2 z-50 mt-1 -translate-x-1/2"
              >
                {clipboard ? (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        useEditor.getState().pasteAt(slot.index);
                        setOpen(null);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[#f1ede6]"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-question-wash text-question-hue">
                        <ClipboardPaste size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] text-ink">Paste here</span>
                        <span className="block text-[11px] text-faint">
                          {clipboard.blocks.length
                            ? `${clipboard.blocks.length} copied element${clipboard.blocks.length === 1 ? '' : 's'}`
                            : 'What you copied'}
                        </span>
                      </span>
                    </button>
                    <div className="my-1 h-px bg-line-soft" />
                  </>
                ) : null}

                <InsertMenu
                  at={slot.index}
                  onDone={() => setOpen(null)}
                  onPickImage={host.pickImage}
                />
              </Popup>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
