'use client';

import { useState, type ReactNode } from 'react';
import { Bold, Highlighter, Italic, Link, Strikethrough, Type, Underline } from 'lucide-react';
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
  /** The address already attached to the selection, if there is one. */
  link: string | null;
  /** A new address, or null to take the existing one off. */
  onLink: (url: string | null) => void;
  /** Above the text by preference, below it when the box is near the page top. */
  placement: 'above' | 'below';
  /** Called as any control is pressed, while the selection is still live. */
  onPressStart?: () => void;
  /** Fingers need targets a mouse does not, and cannot hover for a tooltip. */
  touch?: boolean;
}

/** Stops a control stealing the selection the command is about to act on. */
const keepSelection = (event: React.MouseEvent) => event.preventDefault();

/**
 * A mouse announces itself with mousedown, which can be cancelled before the
 * selection goes anywhere. A finger does not: its mouse events are synthesised
 * after the fact, long after the selection has been dropped and the text has
 * lost focus. Cancelling the pointer event is the only thing that happens early
 * enough - and it leaves the click itself intact, so the button still fires.
 */
const keepSelectionOnTouch = (event: React.PointerEvent) => {
  if (event.pointerType !== 'mouse') event.preventDefault();
};

/**
 * The one control here that has to take the focus.
 *
 * Everything else in this bar guards the selection by refusing focus outright,
 * which a text field cannot do and still be typed into. It is marked instead,
 * and the guards step aside for it - safely, because the words it will act on
 * were already snapshotted when the link button itself was pressed.
 */
const isLinkField = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest('[data-link-field]'));

export function TextFormatBar({
  marks,
  collapsed,
  onToggle,
  onColor,
  onHighlight,
  link,
  onLink,
  placement,
  onPressStart,
  touch = false,
}: TextFormatBarProps) {
  const [picker, setPicker] = useState<'color' | 'highlight' | 'link' | null>(null);

  const scope = collapsed ? 'the whole of this text' : 'the selected words';

  return (
    <div
      className={cx(
        'animate-rise absolute left-0 z-40 flex max-w-[min(94vw,420px)] flex-wrap items-center gap-0.5 rounded-xl border border-line bg-white p-1 shadow-lg',
        placement === 'above' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
      )}
      onPointerDownCapture={(event) => {
        // Before anything else reacts, while the chosen words are still chosen.
        onPressStart?.();
        event.stopPropagation();
        if (!isLinkField(event.target)) keepSelectionOnTouch(event);
      }}
      onMouseDown={(event) => {
        if (!isLinkField(event.target)) keepSelection(event);
      }}
    >
      <Toggle
        icon={<Bold size={15} />}
        label={`Bold ${scope}`}
        active={marks.bold}
        touch={touch}
        onPress={() => onToggle('bold')}
      />
      <Toggle
        icon={<Italic size={15} />}
        label={`Italic ${scope}`}
        active={marks.italic}
        touch={touch}
        onPress={() => onToggle('italic')}
      />
      <Toggle
        icon={<Underline size={15} />}
        label={`Underline ${scope}`}
        active={marks.underline}
        touch={touch}
        onPress={() => onToggle('underline')}
      />
      <Toggle
        icon={<Strikethrough size={15} />}
        label={`Strike through ${scope}`}
        active={marks.strike}
        touch={touch}
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
        touch={touch}
        onPick={onColor}
      />
      <Swatches
        icon={<Highlighter size={15} />}
        label={`Highlight ${scope}`}
        open={picker === 'highlight'}
        onOpen={() => setPicker(picker === 'highlight' ? null : 'highlight')}
        onClose={() => setPicker(null)}
        colours={HIGHLIGHTS}
        touch={touch}
        onPick={(colour) => onHighlight(colour)}
        onClear={() => onHighlight(null)}
      />

      <LinkField
        label={link ? `Edit the link on ${scope}` : `Link ${scope}`}
        open={picker === 'link'}
        active={Boolean(link)}
        current={link}
        onOpen={() => setPicker(picker === 'link' ? null : 'link')}
        onClose={() => setPicker(null)}
        touch={touch}
        onApply={onLink}
      />

      <span
        className={cx(
          'ml-1 pr-1 text-[10px] whitespace-nowrap text-faint',
          touch ? 'block' : 'hidden sm:block',
        )}
      >
        {collapsed ? 'whole text' : 'selected words'}
      </span>
    </div>
  );
}

function Toggle({
  icon,
  label,
  active,
  touch,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  touch?: boolean;
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
        'flex shrink-0 items-center justify-center rounded-lg transition-colors',
        touch ? 'h-11 w-11' : 'h-8 w-8',
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
  touch,
  onPick,
  onClear,
}: {
  icon: ReactNode;
  label: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  colours: string[];
  touch?: boolean;
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
          'flex items-center justify-center rounded-lg transition-colors',
          touch ? 'h-11 w-11' : 'h-8 w-8',
          open ? 'bg-ink text-white' : 'text-ink-soft hover:bg-[#f1ede6]',
        )}
      >
        {icon}
      </button>

      {open ? (
        <Popup
          label={label}
          onClose={onClose}
          className={cx(
            'absolute left-0 z-50',
            touch ? 'w-[248px]' : 'w-[184px]',
            // Above the bar on a phone: the bar itself already sits low on the
            // page and a popover below it would open off the bottom.
            touch ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
          )}
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
                className={cx(
                  'rounded-md border border-black/10 transition-transform hover:scale-110',
                  touch ? 'h-9 w-9' : 'h-6 w-6',
                )}
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

/**
 * Attach an address to the chosen words.
 *
 * The address is never written into the document text - it sits behind the
 * words, which look exactly as they did. Opening the field seeds it with
 * whatever is already attached, so changing a link is a correction rather than
 * retyping it, and clearing the field takes the link off.
 */
function LinkField({
  label,
  open,
  active,
  current,
  onOpen,
  onClose,
  touch,
  onApply,
}: {
  label: string;
  open: boolean;
  active: boolean;
  current: string | null;
  onOpen: () => void;
  onClose: () => void;
  touch?: boolean;
  onApply: (url: string | null) => void;
}) {
  return (
    <span className="relative shrink-0">
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-pressed={active}
        aria-expanded={open}
        onMouseDown={keepSelection}
        onClick={onOpen}
        className={cx(
          'flex items-center justify-center rounded-lg transition-colors',
          touch ? 'h-11 w-11' : 'h-8 w-8',
          open || active ? 'bg-ink text-white' : 'text-ink-soft hover:bg-[#f1ede6]',
        )}
      >
        <Link size={15} />
      </button>

      {open ? (
        <Popup
          label={label}
          onClose={onClose}
          className={cx(
            'absolute right-0 z-50',
            touch ? 'w-[268px]' : 'w-[248px]',
            touch ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
          )}
        >
          {/* Mounted only while the popover is open, so the field starts from
              the address that is attached right now without an effect having to
              push it in afterwards. */}
          <LinkForm current={current} onApply={onApply} onClose={onClose} />
        </Popup>
      ) : null}
    </span>
  );
}

function LinkForm({
  current,
  onApply,
  onClose,
}: {
  current: string | null;
  onApply: (url: string | null) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(current ?? '');

  const submit = () => {
    const trimmed = value.trim();
    onApply(trimmed || null);
    onClose();
  };

  return (
    <div data-link-field className="p-1">
      <input
        // The one control in this bar that takes the focus; see isLinkField.
        autoFocus
        type="url"
        inputMode="url"
        value={value}
        placeholder="example.com"
        aria-label="Link address"
        spellCheck={false}
        autoComplete="off"
        onFocus={(event) => event.currentTarget.select()}
        onMouseDown={(event) => event.stopPropagation()}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            submit();
          }
        }}
        className="w-full rounded-lg border border-line bg-white px-2 py-1.5 text-[12px] text-ink outline-none focus:border-ink-soft"
      />
      <div className="mt-1 flex gap-1">
        <button
          type="button"
          onMouseDown={keepSelection}
          onClick={submit}
          className="flex-1 rounded-lg bg-ink py-1 text-[12px] text-white transition-opacity hover:opacity-90"
        >
          {current ? 'Update' : 'Add link'}
        </button>
        {current ? (
          <button
            type="button"
            onMouseDown={keepSelection}
            onClick={() => {
              onApply(null);
              onClose();
            }}
            className="rounded-lg border border-line px-2 py-1 text-[12px] text-muted transition-colors hover:bg-[#f8f5ef]"
          >
            Remove
          </button>
        ) : null}
      </div>
      <p className="mt-1 px-0.5 text-[10px] leading-snug text-faint">
        The address stays behind the words. Nothing extra is printed.
      </p>
    </div>
  );
}
