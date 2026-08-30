'use client';

import { useState, type ReactNode } from 'react';
import { Bold, Highlighter, Italic, Strikethrough, Type, Underline } from 'lucide-react';
import { HIGHLIGHTS, PALETTE } from '@/lib/model/defaults';
import { cx } from '@/lib/utils/cx';
import { Popup } from '@/components/ui/Popup';

/**
 * Formatting for the words you have selected, not the box they sit in.
 *
 * Every control here has to leave the caret exactly where it was, so nothing in
 * this bar may take focus: the browser only applies a mark to the selection
 * that is still live in the editable, and clicking a button would collapse it.
 * That is what the mousedown guards are for, on every button including the
 * swatches inside the popovers.
 */

export interface ActiveMarks {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
}

export interface TextFormatBarProps {
  marks: ActiveMarks;
  /** True when nothing is selected, so a mark would apply to the whole block. */
  collapsed: boolean;
  onToggle: (mark: keyof ActiveMarks) => void;
  onColor: (colour: string) => void;
  onHighlight: (colour: string | null) => void;
  /** Above the text by preference, below it when the box is near the page top. */
  placement: 'above' | 'below';
}

/** Stops a control stealing the selection the command is about to act on. */
const keepSelection = (event: React.MouseEvent) => event.preventDefault();

export function TextFormatBar({
  marks,
  collapsed,
  onToggle,
  onColor,
  onHighlight,
  placement,
}: TextFormatBarProps) {
  const [picker, setPicker] = useState<'color' | 'highlight' | null>(null);

  const scope = collapsed ? 'the whole of this text' : 'the selected words';

  return (
    <div
      className={cx(
        'animate-rise absolute left-0 z-40 flex items-center gap-0.5 rounded-xl border border-line bg-white p-1 shadow-lg',
        placement === 'above' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
      )}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={keepSelection}
    >
      <Toggle
        icon={<Bold size={15} />}
        label={`Bold ${scope}`}
        active={marks.bold}
        onPress={() => onToggle('bold')}
      />
      <Toggle
        icon={<Italic size={15} />}
        label={`Italic ${scope}`}
        active={marks.italic}
        onPress={() => onToggle('italic')}
      />
      <Toggle
        icon={<Underline size={15} />}
        label={`Underline ${scope}`}
        active={marks.underline}
        onPress={() => onToggle('underline')}
      />
      <Toggle
        icon={<Strikethrough size={15} />}
        label={`Strike through ${scope}`}
        active={marks.strike}
        onPress={() => onToggle('strike')}
      />

      <span className="mx-0.5 h-5 w-px shrink-0 bg-line" />

      <Swatches
        icon={<Type size={15} />}
        label={`Colour ${scope}`}
        open={picker === 'color'}
        onOpen={() => setPicker(picker === 'color' ? null : 'color')}
        onClose={() => setPicker(null)}
        colours={PALETTE}
        onPick={onColor}
      />
      <Swatches
        icon={<Highlighter size={15} />}
        label={`Highlight ${scope}`}
        open={picker === 'highlight'}
        onOpen={() => setPicker(picker === 'highlight' ? null : 'highlight')}
        onClose={() => setPicker(null)}
        colours={HIGHLIGHTS}
        onPick={(colour) => onHighlight(colour)}
        onClear={() => onHighlight(null)}
      />

      <span className="ml-1 hidden pr-1 text-[10px] whitespace-nowrap text-faint sm:block">
        {collapsed ? 'whole text' : 'selected words'}
      </span>
    </div>
  );
}

function Toggle({
  icon,
  label,
  active,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={keepSelection}
      onClick={onPress}
      className={cx(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
        active ? 'bg-ink text-white' : 'text-ink-soft hover:bg-[#f1ede6]',
      )}
    >
      {icon}
    </button>
  );
}

function Swatches({
  icon,
  label,
  open,
  onOpen,
  onClose,
  colours,
  onPick,
  onClear,
}: {
  icon: ReactNode;
  label: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  colours: string[];
  onPick: (colour: string) => void;
  onClear?: () => void;
}) {
  return (
    <span className="relative shrink-0">
      <button
        type="button"
        title={label}
        aria-label={label}
        onMouseDown={keepSelection}
        onClick={onOpen}
        className={cx(
          'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
          open ? 'bg-ink text-white' : 'text-ink-soft hover:bg-[#f1ede6]',
        )}
      >
        {icon}
      </button>

      {open ? (
        <Popup
          label={label}
          onClose={onClose}
          className="absolute top-full left-0 mt-1.5 w-[184px]"
        >
          <div className="grid grid-cols-6 gap-1.5 p-1" onMouseDown={keepSelection}>
            {colours.map((colour) => (
              <button
                key={colour}
                type="button"
                title={colour}
                aria-label={colour}
                onMouseDown={keepSelection}
                onClick={() => {
                  onPick(colour);
                  onClose();
                }}
                className="h-6 w-6 rounded-md border border-black/10 transition-transform hover:scale-110"
                style={{ background: colour }}
              />
            ))}
          </div>
          {onClear ? (
            <button
              type="button"
              onMouseDown={keepSelection}
              onClick={() => {
                onClear();
                onClose();
              }}
              className="mt-1 w-full rounded-lg border border-line py-1 text-[12px] text-muted transition-colors hover:bg-[#f8f5ef]"
            >
              Remove highlight
            </button>
          ) : null}
        </Popup>
      ) : null}
    </span>
  );
}
