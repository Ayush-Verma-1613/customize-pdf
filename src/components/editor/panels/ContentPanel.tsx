'use client';

import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ClipboardPaste,
  Copy,
  GripVertical,
  Trash2,
} from 'lucide-react';
import type { Block } from '@/lib/model/types';
import { blockToText, parseContent, SAMPLE_INPUT } from '@/lib/parse/content';
import { useEditor } from '@/lib/store/editorStore';
import { cx } from '@/lib/utils/cx';
import { Button, EmptyHint, PanelSection, Segmented } from '@/components/ui/primitives';

/**
 * The outline: a linear list of everything in the flow, in document order.
 *
 * A teacher who has just pasted forty questions needs to reorder and delete
 * them quickly, and doing that against a paginated canvas is slow. The outline
 * is the fast lane; the canvas stays for visual work.
 */

const TYPE_LABEL: Record<Block['type'], string> = {
  heading: 'Heading',
  paragraph: 'Text',
  section: 'Section',
  question: 'Question',
  list: 'List',
  checklist: 'Checkboxes',
  image: 'Image',
  divider: 'Divider',
  spacer: 'Spacer',
  answerLines: 'Answer lines',
  pageBreak: 'Page break',
  table: 'Table',
};

const TYPE_TONE: Partial<Record<Block['type'], string>> = {
  question: 'bg-question-wash text-question-hue',
  section: 'bg-structure-wash text-structure-hue',
  heading: 'bg-text-wash text-text-hue',
  table: 'bg-data-wash text-data-hue',
  image: 'bg-media-wash text-media-hue',
  pageBreak: 'bg-structure-wash text-structure-hue',
  answerLines: 'bg-structure-wash text-structure-hue',
};

export function ContentPanel() {
  const [tab, setTab] = useState<'outline' | 'import'>('outline');
  return (
    <div>
      <div className="px-3.5 pt-3">
        <Segmented
          value={tab}
          onChange={setTab}
          className="w-full"
          options={[
            { value: 'outline', label: 'Outline' },
            { value: 'import', label: 'Paste content' },
          ]}
        />
      </div>
      {tab === 'outline' ? <Outline /> : <ImportPanel onDone={() => setTab('outline')} />}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Outline
 * ------------------------------------------------------------------ */

function Outline() {
  const flow = useEditor((s) => s.doc.flow);
  const laid = useEditor((s) => s.laid);
  const selection = useEditor((s) => s.selection);
  const store = useEditor;
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const selectedIds = selection.kind === 'block' ? selection.ids : [];

  if (!flow.length) {
    return (
      <PanelSection title="Outline">
        <EmptyHint>
          Nothing here yet. Add elements from the Elements tab, or paste your
          whole question paper at once from the Paste content tab.
        </EmptyHint>
      </PanelSection>
    );
  }

  return (
    <PanelSection title={`Outline · ${flow.length} elements`}>
      <ol className="grid gap-0.5">
        {flow.map((block, index) => {
          const page = laid.blockPages[block.id]?.[0];
          const number = laid.numbers[block.id];
          const selected = selectedIds.includes(block.id);
          const preview = blockToText(block).replace(/\s+/g, ' ').trim();

          return (
            <li
              key={block.id}
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
                  store.getState().moveBlock(dragIndex, index);
                }
                setDragIndex(null);
                setOverIndex(null);
              }}
              className={cx(
                'group relative rounded-lg border transition-colors',
                selected
                  ? 'border-question-hue/40 bg-question-wash/50'
                  : 'border-transparent hover:bg-slate-50',
                overIndex === index && dragIndex !== null && 'border-t-2 border-t-question-hue',
              )}
            >
              <button
                type="button"
                onClick={() => {
                  store.getState().selectBlock(block.id);
                  if (page !== undefined) store.getState().setActivePage(page);
                }}
                className="flex w-full items-start gap-2 px-1.5 py-1.5 text-left"
              >
                <GripVertical
                  size={13}
                  className="mt-0.5 shrink-0 cursor-grab text-slate-300 group-hover:text-slate-400"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={cx(
                        'rounded px-1.5 py-px text-[10px] font-medium',
                        TYPE_TONE[block.type] ?? 'bg-slate-100 text-muted',
                      )}
                    >
                      {number ?? TYPE_LABEL[block.type]}
                    </span>
                    {page !== undefined ? (
                      <span className="text-[10px] text-faint">p{page + 1}</span>
                    ) : null}
                    {block.style?.breakBefore ? (
                      <span className="text-[10px] text-structure-hue">break</span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] text-ink-soft">
                    {preview || <span className="text-faint">Empty</span>}
                  </span>
                </span>
              </button>

              <span className="absolute top-1 right-1 hidden items-center gap-0.5 group-hover:flex">
                <MiniAction
                  label="Move up"
                  disabled={index === 0}
                  onClick={() => store.getState().moveBlock(index, index - 1)}
                >
                  <ArrowUp size={12} />
                </MiniAction>
                <MiniAction
                  label="Move down"
                  disabled={index === flow.length - 1}
                  onClick={() => store.getState().moveBlock(index, index + 1)}
                >
                  <ArrowDown size={12} />
                </MiniAction>
                <MiniAction
                  label="Duplicate"
                  onClick={() => store.getState().duplicateBlockById(block.id)}
                >
                  <Copy size={12} />
                </MiniAction>
                <MiniAction
                  label="Delete"
                  danger
                  onClick={() => store.getState().removeBlock(block.id)}
                >
                  <Trash2 size={12} />
                </MiniAction>
              </span>
            </li>
          );
        })}
      </ol>
    </PanelSection>
  );
}

function MiniAction({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'flex h-5 w-5 items-center justify-center rounded bg-white/90 shadow-sm transition-colors disabled:opacity-30',
        danger ? 'text-danger hover:bg-danger-wash' : 'text-muted hover:bg-slate-100',
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Import
 * ------------------------------------------------------------------ */

const LEGEND: [string, string][] = [
  ['Subject: Science', 'Fills the heading fields'],
  ['Section A', 'Starts a new section'],
  ['1. Question text [2]', 'Question with marks'],
  ['(a) Sub-part [1]', 'Sub-part of the question above'],
  ['a) Option text', 'Multiple-choice option'],
  ['- Bullet point', 'Bulleted list'],
  ['[ ] Tick box', 'Checkbox item'],
  ['| a | b |', 'Table row'],
  ['[[lines:4]]', 'Four ruled answer lines'],
  ['[[pagebreak]]', 'Start a new page'],
  ['**bold**  *italic*', 'Inline emphasis'],
];

function ImportPanel({ onDone }: { onDone: () => void }) {
  const [value, setValue] = useState('');
  const store = useEditor;

  const parsed = useMemo(() => (value.trim() ? parseContent(value) : null), [value]);

  const insert = (replace: boolean) => {
    if (!parsed?.blocks.length) return;
    store.getState().edit((draft) => {
      if (replace) draft.flow = parsed.blocks;
      else draft.flow = [...draft.flow, ...parsed.blocks];
      draft.fields = { ...draft.fields, ...parsed.fields };
    }, { label: replace ? 'Replace content' : 'Add content' });
    setValue('');
    onDone();
  };

  return (
    <>
      <PanelSection title="Paste your content">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={'Section A\n\n1. Define photosynthesis. [2]\n2. State Newton\'s first law. [3]'}
          spellCheck={false}
          className="h-56 w-full resize-y rounded-lg border border-line bg-white p-2.5 font-mono text-[12px] leading-relaxed text-ink placeholder:text-faint focus:border-question-hue focus:ring-2 focus:ring-question-hue/15 focus:outline-none"
        />

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            tone="primary"
            icon={<ClipboardPaste size={13} />}
            disabled={!parsed?.blocks.length}
            onClick={() => insert(false)}
          >
            Add to document
          </Button>
          <Button size="sm" disabled={!parsed?.blocks.length} onClick={() => insert(true)}>
            Replace all
          </Button>
          <Button size="sm" tone="ghost" onClick={() => setValue(SAMPLE_INPUT)}>
            Load example
          </Button>
        </div>

        {parsed ? (
          <p className="mt-2 rounded-lg bg-success-wash px-2.5 py-2 text-[12px] text-success">
            Recognised {parsed.blocks.length} element
            {parsed.blocks.length === 1 ? '' : 's'}
            {Object.keys(parsed.fields).length
              ? ` and ${Object.keys(parsed.fields).length} heading field${Object.keys(parsed.fields).length === 1 ? '' : 's'}`
              : ''}
            .
          </p>
        ) : null}
      </PanelSection>

      <PanelSection title="What the parser understands">
        <dl className="grid gap-1.5">
          {LEGEND.map(([pattern, meaning]) => (
            <div key={pattern} className="flex items-baseline gap-2">
              <dt className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-ink-soft">
                {pattern}
              </dt>
              <dd className="min-w-0 flex-1 text-[11px] text-faint">{meaning}</dd>
            </div>
          ))}
        </dl>
      </PanelSection>
    </>
  );
}
