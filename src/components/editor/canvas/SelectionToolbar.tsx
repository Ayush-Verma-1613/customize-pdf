'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  BringToFront,
  CheckSquare,
  Copy,
  Italic,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Scissors,
  SendToBack,
  Square,
  Trash2,
  Underline,
  Unlock,
} from 'lucide-react';
import { PALETTE } from '@/lib/model/defaults';
import { text as makeRuns, makeRow } from '@/lib/model/factory';
import type { Align, Block, BlockStyle, Overlay } from '@/lib/model/types';
import { patchSelectionStyle } from '@/lib/commands/registry';
import { hasEditableText, selectedBlock, selectedOverlay, useEditor } from '@/lib/store/editorStore';
import { cx } from '@/lib/utils/cx';
import { uid } from '@/lib/utils/id';
import { Popup } from '@/components/ui/Popup';
import { useCommands } from '../CommandLayer';
import { InsertMenu } from '../InsertMenu';

/**
 * The controls for whatever you just clicked, next to whatever you just clicked.
 *
 * A panel on the far edge of the screen makes you look away from your document
 * to change it, and makes you learn which drawer each control lives in first.
 * This puts the four or five things you actually reach for on a heading, a
 * question or a shape within a few pixels of it - and leaves the long tail to
 * the inspector behind "More", so nothing is lost, only reordered by how often
 * it is wanted.
 */

/**
 * The docked bar scrolls sideways, which would clip any menu opened inside it,
 * so on a phone the menus lift out to the bottom of the screen instead.
 */
const DockedContext = createContext(false);

const popupPlacement = (docked: boolean) =>
  docked ? 'fixed inset-x-2 bottom-2 z-[60]' : 'absolute top-full left-0 mt-1.5';

export interface SelectionToolbarProps {
  /** `floating` hovers over the page; `docked` is a full-width bar for phones. */
  variant: 'floating' | 'docked';
  /** Page-space box of the selection, for the floating variant. */
  box?: { x: number; y: number; width: number; height: number };
  zoom?: number;
  pageHeight?: number;
  /** Only passed where the full inspector is not already on screen. */
  onOpenInspector?: () => void;
}

export function SelectionToolbar({
  variant,
  box,
  zoom = 1,
  pageHeight = 0,
  onOpenInspector,
}: SelectionToolbarProps) {
  const { host } = useCommands();
  const block = useEditor(selectedBlock);
  const overlay = useEditor(selectedOverlay);
  const flow = useEditor((s) => s.doc.flow);
  const [inserting, setInserting] = useState(false);
  const store = useEditor;

  if (!block && !overlay) return null;

  const id = block?.id ?? overlay?.id ?? '';
  const index = block ? flow.findIndex((b) => b.id === block.id) : -1;

  // Above the element by preference; below it when it is near the top edge.
  const barHeight = 40;
  const above = box ? box.y * zoom > barHeight + 8 : true;
  const style =
    variant === 'floating' && box
      ? {
          left: Math.max(0, box.x * zoom),
          top: above
            ? box.y * zoom - barHeight - 6
            : Math.min(pageHeight * zoom - 4, (box.y + box.height) * zoom + 6),
        }
      : undefined;

  const body = (
    <>
      {block ? <BlockControls block={block} /> : null}
      {overlay ? <OverlayControls overlay={overlay} /> : null}

      <Sep />

      <div className="relative">
        <Btn
          icon={<Plus size={15} />}
          label="Add something after this"
          onClick={() => setInserting((open) => !open)}
          active={inserting}
        />
        {inserting ? (
          <Popup
            label="Add something"
            onClose={() => setInserting(false)}
            className={popupPlacement(variant === 'docked')}
          >
            <InsertMenu
              at={index >= 0 ? index + 1 : undefined}
              onDone={() => setInserting(false)}
              onPickImage={host.pickImage}
            />
          </Popup>
        ) : null}
      </div>

      {block ? (
        <>
          <Btn
            icon={<ArrowUp size={15} />}
            label="Move up"
            disabled={index <= 0}
            onClick={() => store.getState().moveBlock(index, index - 1)}
          />
          <Btn
            icon={<ArrowDown size={15} />}
            label="Move down"
            disabled={index < 0 || index >= flow.length - 1}
            onClick={() => store.getState().moveBlock(index, index + 1)}
          />
          <Btn
            icon={<Scissors size={15} />}
            label="Start a new page here"
            onClick={() => store.getState().breakBefore(block.id)}
          />
        </>
      ) : null}

      {overlay ? (
        <>
          <Btn
            icon={<BringToFront size={15} />}
            label="Bring to front"
            onClick={() => store.getState().reorderOverlay(overlay.id, 'front')}
          />
          <Btn
            icon={<SendToBack size={15} />}
            label="Send to back"
            onClick={() => store.getState().reorderOverlay(overlay.id, 'back')}
          />
          <Btn
            icon={overlay.locked ? <Unlock size={15} /> : <Lock size={15} />}
            label={overlay.locked ? 'Unlock' : 'Lock in place'}
            active={overlay.locked}
            onClick={() =>
              store
                .getState()
                .updateOverlay(overlay.id, { locked: !overlay.locked }, { label: 'Lock' })
            }
          />
        </>
      ) : null}

      <Btn
        icon={<Copy size={15} />}
        label="Duplicate"
        onClick={() =>
          block
            ? store.getState().duplicateBlockById(block.id)
            : store.getState().duplicateOverlayById(id)
        }
      />
      {onOpenInspector ? (
        <Btn
          icon={<MoreHorizontal size={15} />}
          label="More settings"
          onClick={onOpenInspector}
        />
      ) : null}
      <Sep />
      <button
        type="button"
        title="Delete this (Del)"
        aria-label="Delete this"
        onClick={() => store.getState().deleteSelection()}
        className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[12px] font-medium text-danger transition-colors hover:bg-danger-wash"
      >
        <Trash2 size={15} />
        Delete
      </button>
    </>
  );

  if (variant === 'docked') {
    return (
      <DockedContext.Provider value>
        <div className="flex shrink-0 items-center gap-0.5 overflow-x-auto border-t border-line bg-panel px-2 py-1.5">
          {body}
        </div>
      </DockedContext.Provider>
    );
  }

  return (
    <div
      className="animate-rise absolute z-30 flex items-center gap-0.5 rounded-xl border border-line bg-white p-1 shadow-lg"
      style={style}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {body}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Per-element controls
 * ------------------------------------------------------------------ */

function BlockControls({ block }: { block: Block }) {
  const store = useEditor;
  const style: BlockStyle = block.style ?? {};

  const update = (patch: (draft: Block) => void, label: string) =>
    store.getState().updateBlock(block.id, patch, { label });

  // A table or a list has no single caret to open, so it gets no pencil - a
  // button that does nothing is worse than no button.
  const common = hasEditableText(block) ? (
    <>
      <Btn
        icon={<Pencil size={15} />}
        label="Edit the words"
        onClick={() => store.getState().beginEditing(block.id)}
      />
      <Sep />
    </>
  ) : null;

  switch (block.type) {
    case 'heading':
      return (
        <>
          {common}
          <Seg
            value={String(block.level)}
            label="Heading level"
            options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: `H${n}` }))}
            onChange={(level) =>
              update((draft) => {
                if (draft.type === 'heading') draft.level = Number(level) as 1 | 2 | 3 | 4;
              }, 'Heading level')
            }
          />
          <AlignButtons style={style} />
          <Swatch
            label="Text colour"
            value={style.color}
            onChange={(color) => patchSelectionStyle({ color }, 'Colour')}
          />
        </>
      );

    case 'paragraph':
      return (
        <>
          {common}
          <StyleButtons style={style} />
          <AlignButtons style={style} />
          <Swatch
            label="Text colour"
            value={style.color}
            onChange={(color) => patchSelectionStyle({ color }, 'Colour')}
          />
        </>
      );

    case 'section':
      return (
        <>
          {common}
          <Step
            label="Marks"
            value={block.marks ?? 0}
            min={0}
            onChange={(marks) =>
              update((draft) => {
                if (draft.type === 'section') draft.marks = marks || undefined;
              }, 'Section marks')
            }
          />
          <Btn
            icon={<Square size={15} />}
            label="Rule under the section"
            active={block.rule}
            onClick={() =>
              update((draft) => {
                if (draft.type === 'section') draft.rule = !draft.rule;
              }, 'Section rule')
            }
          />
        </>
      );

    case 'question':
      return (
        <>
          {common}
          <Step
            label="Marks"
            value={block.marks ?? 0}
            min={0}
            onChange={(marks) =>
              update((draft) => {
                if (draft.type === 'question') draft.marks = marks || undefined;
              }, 'Marks')
            }
          />
          <Step
            label="Lines"
            value={block.answerLines ?? 0}
            min={0}
            max={40}
            onChange={(answerLines) =>
              update((draft) => {
                if (draft.type === 'question') draft.answerLines = answerLines || undefined;
              }, 'Answer lines')
            }
          />
          <Chip
            label="Add part"
            onClick={() =>
              update((draft) => {
                if (draft.type !== 'question') return;
                draft.parts = [...(draft.parts ?? []), { id: uid('p'), runs: makeRuns('New part') }];
              }, 'Add part')
            }
          />
          <Chip
            label="Add option"
            onClick={() =>
              update((draft) => {
                if (draft.type !== 'question') return;
                draft.options = [...(draft.options ?? []), makeRuns('New option')];
              }, 'Add option')
            }
          />
        </>
      );

    case 'list':
      return (
        <>
          {common}
          <Seg
            label="List style"
            value={block.variant}
            options={[
              { value: 'bullet', label: '•' },
              { value: 'number', label: '1.' },
              { value: 'alpha', label: 'a.' },
              { value: 'roman', label: 'i.' },
              { value: 'none', label: '—' },
            ]}
            onChange={(variant) =>
              update((draft) => {
                if (draft.type === 'list') {
                  draft.variant = variant as typeof draft.variant;
                }
              }, 'List style')
            }
          />
          <Chip
            label="Add item"
            onClick={() =>
              update((draft) => {
                if (draft.type === 'list') draft.items = [...draft.items, makeRuns('New item')];
              }, 'Add item')
            }
          />
        </>
      );

    case 'checklist':
      return (
        <>
          {common}
          <Step
            label="Columns"
            value={block.columns ?? 1}
            min={1}
            max={4}
            onChange={(columns) =>
              update((draft) => {
                if (draft.type === 'checklist') draft.columns = columns;
              }, 'Columns')
            }
          />
          <Chip
            label="Add box"
            onClick={() =>
              update((draft) => {
                if (draft.type === 'checklist') {
                  draft.items = [...draft.items, { runs: makeRuns('New item') }];
                }
              }, 'Add tick box')
            }
          />
        </>
      );

    case 'table':
      return (
        <>
          {common}
          <Chip
            label="Add row"
            onClick={() =>
              update((draft) => {
                if (draft.type !== 'table') return;
                const columns = draft.columns.length;
                draft.rows = [...draft.rows, makeRow(Array.from({ length: columns }, () => ''))];
              }, 'Add row')
            }
          />
          <Chip
            label="Add column"
            onClick={() =>
              update((draft) => {
                if (draft.type !== 'table') return;
                draft.columns = [...draft.columns, 1];
                draft.rows = draft.rows.map((row) => ({
                  ...row,
                  cells: [...row.cells, { id: uid('c'), runs: [] }],
                }));
              }, 'Add column')
            }
          />
          <Btn
            icon={<Square size={15} />}
            label="Repeat the header row on every page"
            active={block.repeatHeader}
            onClick={() =>
              update((draft) => {
                if (draft.type === 'table') draft.repeatHeader = !draft.repeatHeader;
              }, 'Repeat header')
            }
          />
        </>
      );

    case 'answerLines':
      return (
        <>
          <Step
            label="Lines"
            value={block.count}
            min={1}
            max={60}
            onChange={(count) =>
              update((draft) => {
                if (draft.type === 'answerLines') draft.count = count;
              }, 'Answer lines')
            }
          />
          <Step
            label="Gap"
            value={block.gap}
            min={8}
            max={60}
            onChange={(gap) =>
              update((draft) => {
                if (draft.type === 'answerLines') draft.gap = gap;
              }, 'Line spacing')
            }
          />
          <Swatch
            label="Line colour"
            value={block.color}
            onChange={(color) =>
              update((draft) => {
                if (draft.type === 'answerLines') draft.color = color ?? '#9ca3af';
              }, 'Line colour')
            }
          />
        </>
      );

    case 'divider':
      return (
        <>
          <Step
            label="Thickness"
            value={block.thickness}
            min={0.25}
            max={8}
            step={0.25}
            onChange={(thickness) =>
              update((draft) => {
                if (draft.type === 'divider') draft.thickness = thickness;
              }, 'Divider')
            }
          />
          <Swatch
            label="Colour"
            value={block.color}
            onChange={(color) =>
              update((draft) => {
                if (draft.type === 'divider') draft.color = color ?? '#d1d5db';
              }, 'Divider colour')
            }
          />
        </>
      );

    case 'spacer':
      return (
        <Step
          label="Height"
          value={block.height}
          min={2}
          max={400}
          step={2}
          onChange={(height) =>
            update((draft) => {
              if (draft.type === 'spacer') draft.height = height;
            }, 'Spacer')
          }
        />
      );

    case 'image':
      return (
        <Seg
          label="How the picture fills its box"
          value={block.fit}
          options={[
            { value: 'contain', label: 'Fit' },
            { value: 'cover', label: 'Fill' },
            { value: 'fill', label: 'Stretch' },
          ]}
          onChange={(fit) =>
            update((draft) => {
              if (draft.type === 'image') draft.fit = fit as typeof draft.fit;
            }, 'Picture fit')
          }
        />
      );

    default:
      return null;
  }
}

function OverlayControls({ overlay }: { overlay: Overlay }) {
  const store = useEditor;
  const patch = (next: Partial<Overlay>, label: string) =>
    store.getState().updateOverlay(overlay.id, next, { label });

  switch (overlay.kind) {
    case 'text':
      return (
        <>
          <Btn
            icon={<Pencil size={15} />}
            label="Edit the words"
            onClick={() => store.getState().beginEditing(overlay.id)}
          />
          <Sep />
          <StyleButtons style={overlay.style} />
          <AlignButtons style={overlay.style} />
          <Swatch
            label="Text colour"
            value={overlay.style.color}
            onChange={(color) => patchSelectionStyle({ color }, 'Colour')}
          />
        </>
      );

    case 'shape':
      return (
        <>
          <Swatch
            label="Fill"
            value={overlay.fill}
            allowNone
            onChange={(fill) => patch({ fill: fill ?? 'transparent' } as Partial<Overlay>, 'Fill')}
          />
          <Swatch
            label="Outline"
            value={overlay.stroke}
            allowNone
            onChange={(stroke) =>
              patch({ stroke: stroke ?? 'transparent' } as Partial<Overlay>, 'Outline')
            }
          />
          <Step
            label="Outline"
            value={overlay.strokeWidth}
            min={0}
            max={12}
            step={0.5}
            onChange={(strokeWidth) =>
              patch({ strokeWidth } as Partial<Overlay>, 'Outline width')
            }
          />
        </>
      );

    case 'line':
      return (
        <>
          <Swatch
            label="Colour"
            value={overlay.stroke}
            onChange={(stroke) =>
              patch({ stroke: stroke ?? '#111827' } as Partial<Overlay>, 'Line colour')
            }
          />
          <Step
            label="Width"
            value={overlay.strokeWidth}
            min={0.25}
            max={12}
            step={0.25}
            onChange={(strokeWidth) => patch({ strokeWidth } as Partial<Overlay>, 'Line width')}
          />
        </>
      );

    case 'checkbox':
      return (
        <Btn
          icon={<CheckSquare size={15} />}
          label="Tick this box"
          active={overlay.checked}
          onClick={() => patch({ checked: !overlay.checked } as Partial<Overlay>, 'Tick box')}
        />
      );

    case 'image':
      return (
        <Seg
          label="How the picture fills its box"
          value={overlay.fit}
          options={[
            { value: 'contain', label: 'Fit' },
            { value: 'cover', label: 'Fill' },
            { value: 'fill', label: 'Stretch' },
          ]}
          onChange={(fit) => patch({ fit } as Partial<Overlay>, 'Picture fit')}
        />
      );

    default:
      return null;
  }
}

/* ------------------------------------------------------------------ *
 * Shared bits
 * ------------------------------------------------------------------ */

const ALIGNMENTS: { value: Align; icon: ReactNode; label: string }[] = [
  { value: 'left', icon: <AlignLeft size={15} />, label: 'Align left' },
  { value: 'center', icon: <AlignCenter size={15} />, label: 'Centre' },
  { value: 'right', icon: <AlignRight size={15} />, label: 'Align right' },
];

function AlignButtons({ style }: { style: BlockStyle }) {
  return (
    <>
      {ALIGNMENTS.map((option) => (
        <Btn
          key={option.value}
          icon={option.icon}
          label={option.label}
          active={style.align === option.value}
          onClick={() => patchSelectionStyle({ align: option.value }, 'Alignment')}
        />
      ))}
    </>
  );
}

function StyleButtons({ style }: { style: BlockStyle }) {
  return (
    <>
      <Btn
        icon={<Bold size={15} />}
        label="Bold"
        active={!!style.bold}
        onClick={() => patchSelectionStyle({ bold: !style.bold })}
      />
      <Btn
        icon={<Italic size={15} />}
        label="Italic"
        active={!!style.italic}
        onClick={() => patchSelectionStyle({ italic: !style.italic })}
      />
      <Btn
        icon={<Underline size={15} />}
        label="Underline"
        active={!!style.underline}
        onClick={() => patchSelectionStyle({ underline: !style.underline })}
      />
    </>
  );
}

function Btn({
  icon,
  label,
  onClick,
  active,
  disabled,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-30',
        active
          ? 'bg-ink text-white'
          : danger
            ? 'text-danger hover:bg-danger-wash'
            : 'text-ink-soft hover:bg-[#f1ede6]',
      )}
    >
      {icon}
    </button>
  );
}

function Sep() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-line" />;
}

function Chip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-8 shrink-0 rounded-lg px-2 text-[12px] font-medium whitespace-nowrap text-ink-soft transition-colors hover:bg-[#f1ede6]"
    >
      {label}
    </button>
  );
}

function Seg({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <span className="flex shrink-0 items-center rounded-lg bg-[#f1ede6] p-0.5" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.label}
          onClick={() => onChange(option.value)}
          className={cx(
            'h-7 min-w-7 rounded-md px-1.5 text-[12px] font-medium transition-colors',
            value === option.value ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </span>
  );
}

/**
 * A labelled stepper. The value is shown rather than hidden behind a spinner so
 * "how many marks is this question worth" is answered without clicking.
 */
function Step({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const set = (next: number) => onChange(Math.min(max, Math.max(min, Number(next.toFixed(2)))));
  return (
    <span className="flex h-8 shrink-0 items-center gap-0.5 rounded-lg bg-[#f1ede6] px-1">
      <span className="pl-1 text-[11px] whitespace-nowrap text-muted">{label}</span>
      <button
        type="button"
        aria-label={`Fewer ${label.toLowerCase()}`}
        onClick={() => set(value - step)}
        className="flex h-6 w-5 items-center justify-center rounded text-ink-soft hover:bg-white"
      >
        −
      </button>
      <span className="min-w-4 text-center text-[12px] font-medium text-ink">{value}</span>
      <button
        type="button"
        aria-label={`More ${label.toLowerCase()}`}
        onClick={() => set(value + step)}
        className="flex h-6 w-5 items-center justify-center rounded text-ink-soft hover:bg-white"
      >
        +
      </button>
    </span>
  );
}

function Swatch({
  label,
  value,
  onChange,
  allowNone,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  allowNone?: boolean;
}) {
  const docked = useContext(DockedContext);
  const [open, setOpen] = useState(false);
  const empty = !value || value === 'transparent' || value === 'none';

  return (
    <span className="relative shrink-0">
      <button
        type="button"
        title={label}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[#f1ede6]"
      >
        <span
          className={cx(
            'h-4 w-4 rounded border border-black/15',
            empty && 'bg-[repeating-linear-gradient(45deg,#fff,#fff_3px,#e7e2da_3px,#e7e2da_6px)]',
          )}
          style={empty ? undefined : { background: value }}
        />
      </button>

      {open ? (
        <Popup
          label={label}
          onClose={() => setOpen(false)}
          className={cx(popupPlacement(docked), !docked && 'w-[196px]')}
        >
          <div className="grid grid-cols-6 gap-1.5 p-1">
            {PALETTE.map((colour) => (
              <button
                key={colour}
                type="button"
                title={colour}
                aria-label={colour}
                onClick={() => {
                  onChange(colour);
                  setOpen(false);
                }}
                className={cx(
                  'h-6 w-6 rounded-md border border-black/10 transition-transform hover:scale-110',
                  value === colour && 'ring-2 ring-ink ring-offset-1',
                )}
                style={{ background: colour }}
              />
            ))}
          </div>
          <div className="mt-1 flex items-center gap-1.5 border-t border-line-soft p-1 pt-2">
            <input
              type="color"
              value={empty ? '#000000' : value}
              onChange={(event) => onChange(event.target.value)}
              aria-label="Pick any colour"
              className="h-7 w-9 cursor-pointer rounded border border-line bg-white p-0.5"
            />
            {allowNone ? (
              <button
                type="button"
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
                className="h-7 flex-1 rounded border border-line text-[12px] text-muted hover:bg-[#f8f5ef]"
              >
                None
              </button>
            ) : null}
          </div>
        </Popup>
      ) : null}
    </span>
  );
}
