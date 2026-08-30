'use client';

import { useRef } from 'react';
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Copy,
  Crop,
  Lock,
  Plus,
  RefreshCw,
  RotateCw,
  Trash2,
  Unlock,
} from 'lucide-react';
import { fileToImage } from '@/lib/export/images';
import { uid } from '@/lib/utils/id';
import type {
  Block,
  BlockStyle,
  ImageOverlay,
  Overlay,
  Run,
  ShapeKind,
  TableBlock,
} from '@/lib/model/types';
import { makeCell, makeRow, text as toRuns } from '@/lib/model/factory';
import { runsToPlainText } from '@/lib/parse/richtext';
import { parseInline } from '@/lib/parse/inline';
import {
  selectedBlock,
  selectedOverlay,
  useEditor,
} from '@/lib/store/editorStore';
import { cx } from '@/lib/utils/cx';
import { ColorPicker } from '@/components/ui/ColorPicker';
import {
  Button,
  EmptyHint,
  Field,
  IconButton,
  NumberInput,
  PanelSection,
  Segmented,
  Select,
  Slider,
  TextInput,
  Toggle,
} from '@/components/ui/primitives';
import { StyleControls } from './StyleControls';

/** The contextual inspector: whatever is selected, its properties appear here. */
export function RightPanel() {
  const selection = useEditor((s) => s.selection);
  const block = useEditor(selectedBlock);
  const overlay = useEditor(selectedOverlay);

  if (selection.kind === 'overlay' && overlay) return <OverlayInspector overlay={overlay} />;
  if (selection.kind === 'block' && block) return <BlockInspector block={block} />;

  if (selection.kind === 'block' || selection.kind === 'overlay') {
    return (
      <PanelSection title="Multiple selection">
        <EmptyHint>
          {selection.ids.length} elements selected. Use the alignment and
          stacking controls in the toolbar, or select a single element to edit
          its properties.
        </EmptyHint>
      </PanelSection>
    );
  }

  return (
    <PanelSection title="Nothing selected">
      <EmptyHint>
        Click anything on the page to edit it. Double-click text to type
        directly into it.
      </EmptyHint>
    </PanelSection>
  );
}

/* ------------------------------------------------------------------ *
 * Flow blocks
 * ------------------------------------------------------------------ */

const BLOCK_TITLE: Record<Block['type'], string> = {
  heading: 'Heading',
  paragraph: 'Paragraph',
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

function BlockInspector({ block }: { block: Block }) {
  const theme = useEditor((s) => s.doc.theme);
  const store = useEditor;

  const patchStyle = (patch: Partial<BlockStyle>) =>
    store.getState().updateBlock(
      block.id,
      (draft) => {
        draft.style = { ...draft.style, ...patch };
      },
      { coalesce: `style:${block.id}` },
    );

  const inherited = {
    family: theme.bodyFamily,
    size: theme.bodySize,
    lineHeight: theme.lineHeight,
    color: theme.textColor,
  };

  return (
    <div>
      <PanelSection
        title={BLOCK_TITLE[block.type]}
        action={
          <span className="flex gap-0.5">
            <IconButton
              label="Duplicate"
              onClick={() => store.getState().duplicateBlockById(block.id)}
            >
              <Copy size={13} />
            </IconButton>
            <IconButton
              label="Delete"
              tone="danger"
              onClick={() => store.getState().removeBlock(block.id)}
            >
              <Trash2 size={13} />
            </IconButton>
          </span>
        }
      >
        <BlockContent block={block} />
      </PanelSection>

      {block.type !== 'pageBreak' && block.type !== 'spacer' ? (
        <PanelSection title="Appearance">
          <StyleControls
            style={block.style ?? {}}
            onChange={patchStyle}
            inherited={inherited}
            show={{
              box: block.type !== 'divider' && block.type !== 'answerLines',
            }}
          />
        </PanelSection>
      ) : null}
    </div>
  );
}

function BlockContent({ block }: { block: Block }) {
  const store = useEditor;
  const update = (patch: (draft: Block) => void, coalesce?: string) =>
    store.getState().updateBlock(block.id, patch, coalesce ? { coalesce } : undefined);

  switch (block.type) {
    case 'heading':
      return (
        <div className="grid gap-2.5">
          <RunsEditor
            label="Text"
            runs={block.runs}
            onChange={(runs) =>
              update((draft) => {
                if (draft.type === 'heading') draft.runs = runs;
              }, `runs:${block.id}`)
            }
          />
          <Field label="Level">
            <Segmented
              value={String(block.level)}
              onChange={(level) =>
                update((draft) => {
                  if (draft.type === 'heading') draft.level = Number(level) as 1 | 2 | 3 | 4;
                })
              }
              className="w-full"
              options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: `H${n}` }))}
            />
          </Field>
        </div>
      );

    case 'paragraph':
      return (
        <RunsEditor
          label="Text"
          rows={5}
          runs={block.runs}
          onChange={(runs) =>
            update((draft) => {
              if (draft.type === 'paragraph') draft.runs = runs;
            }, `runs:${block.id}`)
          }
        />
      );

    case 'section':
      return (
        <div className="grid gap-2.5">
          <RunsEditor
            label="Title"
            runs={block.runs}
            onChange={(runs) =>
              update((draft) => {
                if (draft.type === 'section') draft.runs = runs;
              }, `runs:${block.id}`)
            }
          />
          <RunsEditor
            label="Instructions"
            rows={3}
            runs={block.instructions ?? []}
            onChange={(runs) =>
              update((draft) => {
                if (draft.type === 'section') {
                  draft.instructions = runsToPlainText(runs) ? runs : undefined;
                }
              }, `instr:${block.id}`)
            }
          />
          <Toggle
            label="Rule under the title"
            checked={!!block.rule}
            onChange={(rule) =>
              update((draft) => {
                if (draft.type === 'section') draft.rule = rule;
              })
            }
          />
          <Toggle
            label="Restart numbering here"
            hint="Questions in this section begin at 1"
            checked={!!block.restartNumbering}
            onChange={(restartNumbering) =>
              update((draft) => {
                if (draft.type === 'section') draft.restartNumbering = restartNumbering;
              })
            }
          />
        </div>
      );

    case 'question':
      return <QuestionEditor block={block} />;

    case 'list':
      return (
        <div className="grid gap-2.5">
          <Field label="Style">
            <Select
              value={block.variant}
              onChange={(variant) =>
                update((draft) => {
                  if (draft.type === 'list') draft.variant = variant;
                })
              }
              options={[
                { value: 'bullet', label: 'Bullets' },
                { value: 'number', label: 'Numbers 1. 2. 3.' },
                { value: 'alpha', label: 'Letters a. b. c.' },
                { value: 'roman', label: 'Roman i. ii. iii.' },
                { value: 'none', label: 'No marker' },
              ]}
            />
          </Field>
          <LineListEditor
            label="Items"
            values={block.items.map(runsToPlainText)}
            onChange={(values) =>
              update((draft) => {
                if (draft.type === 'list') draft.items = values.map((v) => parseInline(v));
              }, `items:${block.id}`)
            }
          />
        </div>
      );

    case 'checklist':
      return (
        <div className="grid gap-2.5">
          <Field label="Columns">
            <Segmented
              value={String(block.columns ?? 1)}
              onChange={(columns) =>
                update((draft) => {
                  if (draft.type === 'checklist') draft.columns = Number(columns);
                })
              }
              className="w-full"
              options={[1, 2, 3].map((n) => ({ value: String(n), label: String(n) }))}
            />
          </Field>
          <LineListEditor
            label="Options"
            values={block.items.map((i) => runsToPlainText(i.runs))}
            onChange={(values) =>
              update((draft) => {
                if (draft.type === 'checklist') {
                  draft.items = values.map((v, i) => ({
                    runs: parseInline(v),
                    checked: draft.items[i]?.checked,
                  }));
                }
              }, `items:${block.id}`)
            }
          />
        </div>
      );

    case 'divider':
      return (
        <div className="grid gap-2.5">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Thickness">
              <NumberInput
                value={block.thickness}
                min={0.25}
                step={0.25}
                onChange={(thickness) =>
                  update((draft) => {
                    if (draft.type === 'divider') draft.thickness = thickness;
                  }, `divider:${block.id}`)
                }
                suffix="pt"
              />
            </Field>
            <Field label="Width" hint={`${Math.round(block.width * 100)}%`}>
              <Slider
                value={block.width}
                min={0.1}
                max={1}
                step={0.01}
                onChange={(width) =>
                  update((draft) => {
                    if (draft.type === 'divider') draft.width = width;
                  }, `divider:${block.id}`)
                }
              />
            </Field>
          </div>
          <Field label="Style">
            <Segmented
              value={block.dash}
              onChange={(dash) =>
                update((draft) => {
                  if (draft.type === 'divider') draft.dash = dash;
                })
              }
              className="w-full"
              options={[
                { value: 'solid', label: 'Solid' },
                { value: 'dashed', label: 'Dashed' },
                { value: 'dotted', label: 'Dotted' },
              ]}
            />
          </Field>
          <Field label="Colour">
            <ColorPicker
              label="Line colour"
              value={block.color}
              onChange={(color) =>
                update((draft) => {
                  if (draft.type === 'divider') draft.color = color ?? '#9ca3af';
                })
              }
            />
          </Field>
        </div>
      );

    case 'spacer':
      return (
        <Field label="Height" hint={`${Math.round(block.height)}pt`}>
          <Slider
            value={block.height}
            min={2}
            max={400}
            onChange={(height) =>
              update((draft) => {
                if (draft.type === 'spacer') draft.height = height;
              }, `spacer:${block.id}`)
            }
          />
        </Field>
      );

    case 'answerLines':
      return (
        <div className="grid gap-2.5">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Lines">
              <NumberInput
                value={block.count}
                min={1}
                max={60}
                onChange={(count) =>
                  update((draft) => {
                    if (draft.type === 'answerLines') draft.count = Math.round(count);
                  }, `lines:${block.id}`)
                }
              />
            </Field>
            <Field label="Spacing">
              <NumberInput
                value={block.gap}
                min={10}
                max={60}
                onChange={(gap) =>
                  update((draft) => {
                    if (draft.type === 'answerLines') draft.gap = gap;
                  }, `lines:${block.id}`)
                }
                suffix="pt"
              />
            </Field>
          </div>
          <Field label="Style">
            <Segmented
              value={block.dash}
              onChange={(dash) =>
                update((draft) => {
                  if (draft.type === 'answerLines') draft.dash = dash;
                })
              }
              className="w-full"
              options={[
                { value: 'solid', label: 'Solid' },
                { value: 'dashed', label: 'Dashed' },
                { value: 'dotted', label: 'Dotted' },
              ]}
            />
          </Field>
          <Field label="Colour">
            <ColorPicker
              label="Rule colour"
              value={block.color}
              onChange={(color) =>
                update((draft) => {
                  if (draft.type === 'answerLines') draft.color = color ?? '#cbd5e1';
                })
              }
            />
          </Field>
        </div>
      );

    case 'pageBreak':
      return (
        <EmptyHint>
          Everything after this point starts on a new page. Delete it to let the
          content flow again.
        </EmptyHint>
      );

    case 'image':
      return <FlowImageEditor block={block} />;

    case 'table':
      return <TableEditor block={block} />;
  }
}

/* ------------------------------------------------------------------ *
 * Question
 * ------------------------------------------------------------------ */

function QuestionEditor({ block }: { block: Extract<Block, { type: 'question' }> }) {
  const store = useEditor;
  const number = useEditor((s) => s.laid.numbers[block.id]);
  const update = (patch: (draft: Block) => void, coalesce?: string) =>
    store.getState().updateBlock(block.id, patch, coalesce ? { coalesce } : undefined);

  return (
    <div className="grid gap-2.5">
      {number ? (
        <p className="rounded-lg bg-question-wash px-2.5 py-1.5 text-[12px] text-question-hue">
          Numbered <strong>{number}</strong> automatically. Reorder or delete
          questions and the rest renumber themselves.
        </p>
      ) : null}

      <RunsEditor
        label="Question"
        rows={4}
        runs={block.runs}
        onChange={(runs) =>
          update((draft) => {
            if (draft.type === 'question') draft.runs = runs;
          }, `runs:${block.id}`)
        }
      />

      <div className="grid grid-cols-2 gap-2">
        <Field label="Marks">
          <NumberInput
            value={block.marks ?? 0}
            min={0}
            step={0.5}
            onChange={(marks) =>
              update((draft) => {
                if (draft.type === 'question') draft.marks = marks || undefined;
              }, `marks:${block.id}`)
            }
          />
        </Field>
        <Field label="Answer lines">
          <NumberInput
            value={block.answerLines ?? 0}
            min={0}
            max={40}
            onChange={(answerLines) =>
              update((draft) => {
                if (draft.type === 'question') draft.answerLines = Math.round(answerLines) || undefined;
              }, `alines:${block.id}`)
            }
          />
        </Field>
      </div>

      <Field label="Custom number" hint="Leave blank to auto-number">
        <TextInput
          value={block.numberOverride ?? ''}
          placeholder={number ?? '1.'}
          onChange={(e) =>
            update((draft) => {
              if (draft.type === 'question') draft.numberOverride = e.target.value || undefined;
            }, `override:${block.id}`)
          }
        />
      </Field>

      <Field label="Multiple-choice options">
        <LineListEditor
          label=""
          placeholder="One option per line"
          values={(block.options ?? []).map(runsToPlainText)}
          onChange={(values) =>
            update((draft) => {
              if (draft.type !== 'question') return;
              const filled = values.filter((v) => v.trim());
              draft.options = filled.length ? filled.map((v) => parseInline(v)) : undefined;
            }, `options:${block.id}`)
          }
        />
        {block.options?.length ? (
          <div className="mt-2">
            <Segmented
              value={String(block.optionColumns ?? 2)}
              onChange={(columns) =>
                update((draft) => {
                  if (draft.type === 'question') draft.optionColumns = Number(columns);
                })
              }
              className="w-full"
              options={[1, 2, 4].map((n) => ({ value: String(n), label: `${n} col` }))}
            />
          </div>
        ) : null}
      </Field>

      <Field label="Sub-parts">
        <div className="grid gap-1.5">
          {(block.parts ?? []).map((part, index) => (
            <div key={part.id} className="rounded-lg border border-line bg-[#f8f5ef]/60 p-2">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted">Part {index + 1}</span>
                <IconButton
                  label="Remove part"
                  tone="danger"
                  onClick={() =>
                    update((draft) => {
                      if (draft.type === 'question') {
                        draft.parts = draft.parts?.filter((p) => p.id !== part.id);
                      }
                    })
                  }
                >
                  <Trash2 size={12} />
                </IconButton>
              </div>
              <textarea
                value={runsToPlainText(part.runs)}
                rows={2}
                onChange={(e) =>
                  update((draft) => {
                    if (draft.type !== 'question') return;
                    const target = draft.parts?.find((p) => p.id === part.id);
                    if (target) target.runs = parseInline(e.target.value);
                  }, `part:${part.id}`)
                }
                className="w-full resize-y rounded border border-line bg-white px-2 py-1.5 text-[12px] focus:border-question-hue focus:outline-none"
              />
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                <NumberInput
                  value={part.marks ?? 0}
                  min={0}
                  step={0.5}
                  suffix="marks"
                  onChange={(marks) =>
                    update((draft) => {
                      if (draft.type !== 'question') return;
                      const target = draft.parts?.find((p) => p.id === part.id);
                      if (target) target.marks = marks || undefined;
                    }, `partmarks:${part.id}`)
                  }
                />
                <NumberInput
                  value={part.answerLines ?? 0}
                  min={0}
                  max={20}
                  suffix="lines"
                  onChange={(answerLines) =>
                    update((draft) => {
                      if (draft.type !== 'question') return;
                      const target = draft.parts?.find((p) => p.id === part.id);
                      if (target) target.answerLines = Math.round(answerLines) || undefined;
                    }, `partlines:${part.id}`)
                  }
                />
              </div>
            </div>
          ))}
          <Button
            size="sm"
            icon={<Plus size={13} />}
            onClick={() =>
              update((draft) => {
                if (draft.type !== 'question') return;
                draft.parts = [
                  ...(draft.parts ?? []),
                  { id: uid('p'), runs: toRuns('New sub-part') },
                ];
              })
            }
          >
            Add sub-part
          </Button>
        </div>
      </Field>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Images and tables
 * ------------------------------------------------------------------ */

function FlowImageEditor({ block }: { block: Extract<Block, { type: 'image' }> }) {
  const store = useEditor;
  const fileRef = useRef<HTMLInputElement>(null);

  const replace = async (file: File | undefined) => {
    if (!file) return;
    const image = await fileToImage(file);
    store.getState().updateBlock(block.id, (draft) => {
      if (draft.type !== 'image') return;
      draft.src = image.src;
      draft.naturalWidth = image.width;
      draft.naturalHeight = image.height;
      draft.height = undefined;
    }, { label: 'Replace image' });
  };

  return (
    <div className="grid gap-2.5">
      <Button
        size="sm"
        icon={<RefreshCw size={13} />}
        onClick={() => fileRef.current?.click()}
      >
        {block.src ? 'Replace picture' : 'Choose a picture'}
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void replace(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      <Field label="Width" hint={`${Math.round(block.width ?? 220)}pt`}>
        <Slider
          value={block.width ?? 220}
          min={30}
          max={600}
          onChange={(width) =>
            store.getState().updateBlock(block.id, (draft) => {
              if (draft.type === 'image') {
                draft.width = width;
                draft.height = undefined;
              }
            }, { coalesce: `imgw:${block.id}` })
          }
        />
      </Field>

      <Field label="Caption">
        <TextInput
          value={runsToPlainText(block.caption)}
          placeholder="Optional caption"
          onChange={(e) =>
            store.getState().updateBlock(block.id, (draft) => {
              if (draft.type === 'image') {
                draft.caption = e.target.value ? parseInline(e.target.value) : undefined;
              }
            }, { coalesce: `cap:${block.id}` })
          }
        />
      </Field>

      <Field label="Corner radius">
        <NumberInput
          value={block.radius ?? 0}
          min={0}
          max={60}
          onChange={(radius) =>
            store.getState().updateBlock(block.id, (draft) => {
              if (draft.type === 'image') draft.radius = radius;
            }, { coalesce: `rad:${block.id}` })
          }
          suffix="pt"
        />
      </Field>
    </div>
  );
}

function TableEditor({ block }: { block: TableBlock }) {
  const store = useEditor;
  const update = (patch: (draft: TableBlock) => void, coalesce?: string) =>
    store.getState().updateBlock(
      block.id,
      (draft) => {
        if (draft.type === 'table') patch(draft);
      },
      coalesce ? { coalesce } : undefined,
    );

  const columnCount = block.columns.length;

  return (
    <div className="grid gap-2.5">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Rows">
          <div className="flex gap-1">
            <Button
              size="sm"
              className="flex-1"
              onClick={() =>
                update((draft) => {
                  draft.rows.push(makeRow(new Array(columnCount).fill('')));
                })
              }
            >
              + Row
            </Button>
            <Button
              size="sm"
              className="flex-1"
              disabled={block.rows.length <= 1}
              onClick={() =>
                update((draft) => {
                  draft.rows.pop();
                })
              }
            >
              − Row
            </Button>
          </div>
        </Field>
        <Field label="Columns">
          <div className="flex gap-1">
            <Button
              size="sm"
              className="flex-1"
              onClick={() =>
                update((draft) => {
                  draft.columns.push(1);
                  draft.rows.forEach((row) => row.cells.push(makeCell('')));
                })
              }
            >
              + Col
            </Button>
            <Button
              size="sm"
              className="flex-1"
              disabled={columnCount <= 1}
              onClick={() =>
                update((draft) => {
                  draft.columns.pop();
                  draft.rows.forEach((row) => row.cells.pop());
                })
              }
            >
              − Col
            </Button>
          </div>
        </Field>
      </div>

      <Field label="Column widths" hint="relative">
        <div className="flex gap-1.5">
          {block.columns.map((width, i) => (
            <NumberInput
              key={i}
              value={width}
              min={0.1}
              step={0.1}
              onChange={(value) =>
                update((draft) => {
                  draft.columns[i] = value;
                }, `colw:${block.id}:${i}`)
              }
            />
          ))}
        </div>
      </Field>

      <Field label="Table width" hint={`${Math.round((block.widthFactor ?? 1) * 100)}%`}>
        <Slider
          value={block.widthFactor ?? 1}
          min={0.2}
          max={1}
          step={0.01}
          onChange={(widthFactor) =>
            update((draft) => {
              draft.widthFactor = widthFactor;
            }, `tw:${block.id}`)
          }
        />
      </Field>

      <Field label="Cells">
        <div className="max-h-64 overflow-auto rounded-lg border border-line">
          <table className="w-full border-collapse text-[11px]">
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={row.id} className={row.isHeader ? 'bg-[#f8f5ef]' : undefined}>
                  {row.cells.map((cell, c) => (
                    <td key={cell.id} className="border border-line-soft p-0">
                      <input
                        value={runsToPlainText(cell.runs)}
                        onChange={(e) =>
                          update((draft) => {
                            const target = draft.rows[r]?.cells[c];
                            if (target) target.runs = parseInline(e.target.value);
                          }, `cell:${cell.id}`)
                        }
                        className={cx(
                          'w-full bg-transparent px-1.5 py-1 focus:bg-question-wash/40 focus:outline-none',
                          row.isHeader && 'font-semibold',
                        )}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Field>

      <Toggle
        label="First row is a header"
        hint="Repeats when the table continues on the next page"
        checked={!!block.rows[0]?.isHeader}
        onChange={(isHeader) =>
          update((draft) => {
            if (draft.rows[0]) draft.rows[0].isHeader = isHeader;
          })
        }
      />
      <Toggle
        label="Repeat header on each page"
        checked={block.repeatHeader}
        onChange={(repeatHeader) =>
          update((draft) => {
            draft.repeatHeader = repeatHeader;
          })
        }
      />

      <div className="grid grid-cols-2 gap-2">
        <Field label="Border">
          <ColorPicker
            label="Border colour"
            value={block.border.color}
            onChange={(color) =>
              update((draft) => {
                draft.border = { ...draft.border, color: color ?? 'transparent' };
              })
            }
            allowNone
          />
        </Field>
        <Field label="Grid lines">
          <ColorPicker
            label="Grid colour"
            value={block.innerBorder?.color}
            onChange={(color) =>
              update((draft) => {
                draft.innerBorder = color
                  ? { color, width: draft.innerBorder?.width ?? 0.5, style: 'solid' }
                  : null;
              })
            }
            allowNone
          />
        </Field>
      </div>

      <Field label="Alternating row shade">
        <ColorPicker
          label="Zebra colour"
          value={block.zebra}
          onChange={(zebra) =>
            update((draft) => {
              draft.zebra = zebra;
            })
          }
          allowNone
        />
      </Field>

      <Field label="Cell padding">
        <div className="grid grid-cols-4 gap-1.5">
          {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
            <NumberInput
              key={side}
              value={block.cellPadding[side]}
              min={0}
              onChange={(value) =>
                update((draft) => {
                  draft.cellPadding = { ...draft.cellPadding, [side]: value };
                }, `pad:${block.id}`)
              }
            />
          ))}
        </div>
      </Field>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Overlays
 * ------------------------------------------------------------------ */

const SHAPE_OPTIONS: { value: ShapeKind; label: string }[] = [
  { value: 'rect', label: 'Rectangle' },
  { value: 'ellipse', label: 'Ellipse' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'star', label: 'Star' },
  { value: 'arrow', label: 'Arrow' },
];

function OverlayInspector({ overlay }: { overlay: Overlay }) {
  const theme = useEditor((s) => s.doc.theme);
  const pages = useEditor((s) => s.laid.pages.length);
  const store = useEditor;

  const patch = (value: Partial<Overlay>, coalesce?: string) =>
    store.getState().updateOverlay(overlay.id, value, coalesce ? { coalesce } : undefined);

  return (
    <div>
      <PanelSection
        title={overlay.kind === 'text' ? 'Text box' : titleCase(overlay.kind)}
        action={
          <span className="flex gap-0.5">
            <IconButton
              label={overlay.locked ? 'Unlock' : 'Lock'}
              active={overlay.locked}
              onClick={() => patch({ locked: !overlay.locked })}
            >
              {overlay.locked ? <Lock size={13} /> : <Unlock size={13} />}
            </IconButton>
            <IconButton
              label="Duplicate"
              onClick={() => store.getState().duplicateOverlayById(overlay.id)}
            >
              <Copy size={13} />
            </IconButton>
            <IconButton
              label="Delete"
              tone="danger"
              onClick={() => store.getState().removeOverlay(overlay.id)}
            >
              <Trash2 size={13} />
            </IconButton>
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-2">
          <Field label="X">
            <NumberInput value={overlay.x} onChange={(x) => patch({ x }, 'pos')} suffix="pt" />
          </Field>
          <Field label="Y">
            <NumberInput value={overlay.y} onChange={(y) => patch({ y }, 'pos')} suffix="pt" />
          </Field>
          <Field label="Width">
            <NumberInput
              value={overlay.width}
              min={1}
              onChange={(width) => patch({ width }, 'size')}
              suffix="pt"
            />
          </Field>
          <Field label="Height">
            <NumberInput
              value={overlay.height}
              onChange={(height) => patch({ height }, 'size')}
              suffix="pt"
            />
          </Field>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <Field label="Rotation" hint={`${Math.round(overlay.rotation)}°`}>
            <Slider
              value={overlay.rotation}
              min={-180}
              max={180}
              onChange={(rotation) => patch({ rotation }, 'rot')}
            />
          </Field>
          <Field label="Opacity" hint={`${Math.round(overlay.opacity * 100)}%`}>
            <Slider
              value={overlay.opacity}
              min={0.05}
              max={1}
              step={0.01}
              onChange={(opacity) => patch({ opacity }, 'op')}
            />
          </Field>
        </div>

        <div className="mt-2.5 flex items-center gap-1.5">
          <IconButton
            label="Bring to front"
            onClick={() => store.getState().reorderOverlay(overlay.id, 'front')}
          >
            <ArrowUpToLine size={14} />
          </IconButton>
          <IconButton
            label="Send to back"
            onClick={() => store.getState().reorderOverlay(overlay.id, 'back')}
          >
            <ArrowDownToLine size={14} />
          </IconButton>
          <IconButton label="Reset rotation" onClick={() => patch({ rotation: 0 })}>
            <RotateCw size={14} />
          </IconButton>
          <div className="ml-auto">
            <Select
              value={String(overlay.page)}
              onChange={(page) => patch({ page: Number(page) })}
              options={Array.from({ length: pages }, (_, i) => ({
                value: String(i),
                label: `Page ${i + 1}`,
              }))}
            />
          </div>
        </div>
      </PanelSection>

      <PanelSection title="Properties">
        <OverlayProperties overlay={overlay} theme={theme} />
      </PanelSection>
    </div>
  );
}

function OverlayProperties({
  overlay,
  theme,
}: {
  overlay: Overlay;
  theme: { bodyFamily: string; bodySize: number; lineHeight: number; textColor: string };
}) {
  const store = useEditor;
  const fileRef = useRef<HTMLInputElement>(null);
  const patch = (value: Partial<Overlay>, coalesce?: string) =>
    store.getState().updateOverlay(overlay.id, value, coalesce ? { coalesce } : undefined);

  switch (overlay.kind) {
    case 'text':
      return (
        <div className="grid gap-2.5">
          <RunsEditor
            label="Text"
            rows={4}
            runs={overlay.runs}
            onChange={(runs) => patch({ runs }, `runs:${overlay.id}`)}
          />
          <Toggle
            label="Grow to fit the text"
            checked={overlay.autoHeight}
            onChange={(autoHeight) => patch({ autoHeight })}
          />
          <Field label="Vertical align">
            <Segmented
              value={overlay.vAlign}
              onChange={(vAlign) => patch({ vAlign })}
              className="w-full"
              options={[
                { value: 'top', label: 'Top' },
                { value: 'middle', label: 'Middle' },
                { value: 'bottom', label: 'Bottom' },
              ]}
            />
          </Field>
          <StyleControls
            style={overlay.style}
            onChange={(value) => patch({ style: { ...overlay.style, ...value } }, `style:${overlay.id}`)}
            inherited={{
              family: theme.bodyFamily as never,
              size: theme.bodySize,
              lineHeight: theme.lineHeight,
              color: theme.textColor,
            }}
            show={{ spacing: false, indent: false, flow: false }}
          />
        </div>
      );

    case 'image':
      return (
        <div className="grid gap-2.5">
          <Button
            size="sm"
            icon={<RefreshCw size={13} />}
            onClick={() => fileRef.current?.click()}
          >
            {overlay.src ? 'Replace picture' : 'Choose a picture'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              const image = await fileToImage(file);
              patch({
                src: image.src,
                naturalWidth: image.width,
                naturalHeight: image.height,
                height: (image.height / image.width) * overlay.width,
              });
            }}
          />
          <Field label="Fit">
            <Segmented
              value={overlay.fit}
              onChange={(fit) => patch({ fit })}
              className="w-full"
              options={[
                { value: 'contain', label: 'Fit' },
                { value: 'cover', label: 'Fill' },
                { value: 'fill', label: 'Stretch' },
              ]}
            />
          </Field>
          <Field label="Corner radius">
            <NumberInput
              value={overlay.radius}
              min={0}
              max={120}
              onChange={(radius) => patch({ radius }, 'rad')}
              suffix="pt"
            />
          </Field>
          <CropControls overlay={overlay} onChange={(crop) => patch({ crop })} />
        </div>
      );

    case 'shape':
      return (
        <div className="grid gap-2.5">
          <Field label="Shape">
            <Select
              value={overlay.shape}
              onChange={(shape) => patch({ shape })}
              options={SHAPE_OPTIONS}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Fill">
              <ColorPicker
                label="Fill colour"
                value={overlay.fill}
                onChange={(fill) => patch({ fill: fill ?? 'transparent' })}
                allowNone
              />
            </Field>
            <Field label="Outline">
              <ColorPicker
                label="Outline colour"
                value={overlay.stroke}
                onChange={(stroke) => patch({ stroke: stroke ?? 'transparent' })}
                allowNone
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Outline width">
              <NumberInput
                value={overlay.strokeWidth}
                min={0}
                step={0.25}
                onChange={(strokeWidth) => patch({ strokeWidth }, 'sw')}
                suffix="pt"
              />
            </Field>
            <Field label="Corner radius">
              <NumberInput
                value={overlay.radius}
                min={0}
                onChange={(radius) => patch({ radius }, 'rad')}
                suffix="pt"
              />
            </Field>
          </div>
          <Field label="Outline style">
            <Segmented
              value={overlay.dash}
              onChange={(dash) => patch({ dash })}
              className="w-full"
              options={[
                { value: 'solid', label: 'Solid' },
                { value: 'dashed', label: 'Dashed' },
                { value: 'dotted', label: 'Dotted' },
              ]}
            />
          </Field>
        </div>
      );

    case 'line':
      return (
        <div className="grid gap-2.5">
          <Field label="Colour">
            <ColorPicker
              label="Line colour"
              value={overlay.stroke}
              onChange={(stroke) => patch({ stroke: stroke ?? '#111827' })}
            />
          </Field>
          <Field label="Thickness">
            <NumberInput
              value={overlay.strokeWidth}
              min={0.25}
              step={0.25}
              onChange={(strokeWidth) => patch({ strokeWidth }, 'sw')}
              suffix="pt"
            />
          </Field>
          <Field label="Style">
            <Segmented
              value={overlay.dash}
              onChange={(dash) => patch({ dash })}
              className="w-full"
              options={[
                { value: 'solid', label: 'Solid' },
                { value: 'dashed', label: 'Dashed' },
                { value: 'dotted', label: 'Dotted' },
              ]}
            />
          </Field>
          <Toggle
            label="Arrow head"
            checked={!!overlay.arrowEnd}
            onChange={(arrowEnd) => patch({ arrowEnd })}
          />
        </div>
      );

    case 'checkbox':
      return (
        <div className="grid gap-2.5">
          <Toggle label="Ticked" checked={overlay.checked} onChange={(checked) => patch({ checked })} />
          <Field label="Label">
            <TextInput
              value={runsToPlainText(overlay.label)}
              onChange={(e) =>
                patch({ label: e.target.value ? parseInline(e.target.value) : undefined }, 'label')
              }
            />
          </Field>
          <Field label="Colour">
            <ColorPicker
              label="Box colour"
              value={overlay.stroke}
              onChange={(stroke) => patch({ stroke: stroke ?? '#111827' })}
            />
          </Field>
        </div>
      );

    case 'table':
      return (
        <EmptyHint>
          Floating tables use the same controls as flow tables. Convert it to a
          flow table if you want it to continue automatically onto the next
          page.
        </EmptyHint>
      );
  }
}

function CropControls({
  overlay,
  onChange,
}: {
  overlay: ImageOverlay;
  onChange: (crop: ImageOverlay['crop']) => void;
}) {
  const crop = overlay.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const set = (patch: Partial<typeof crop>) => {
    const next = { ...crop, ...patch };
    const isFull = next.x === 0 && next.y === 0 && next.w === 1 && next.h === 1;
    onChange(isFull ? undefined : next);
  };

  return (
    <Field label="Crop" hint={overlay.crop ? 'cropped' : 'full image'}>
      <div className="grid grid-cols-2 gap-2">
        <Slider value={crop.x} min={0} max={0.9} step={0.01} onChange={(x) => set({ x, w: Math.min(crop.w, 1 - x) })} />
        <Slider value={crop.y} min={0} max={0.9} step={0.01} onChange={(y) => set({ y, h: Math.min(crop.h, 1 - y) })} />
        <Slider value={crop.w} min={0.1} max={1} step={0.01} onChange={(w) => set({ w: Math.min(w, 1 - crop.x) })} />
        <Slider value={crop.h} min={0.1} max={1} step={0.01} onChange={(h) => set({ h: Math.min(h, 1 - crop.y) })} />
      </div>
      <div className="mt-1 grid grid-cols-2 gap-2 text-[10px] text-faint">
        <span>Left / Top</span>
        <span>Width / Height</span>
      </div>
      {overlay.crop ? (
        <Button size="sm" tone="ghost" icon={<Crop size={12} />} onClick={() => onChange(undefined)}>
          Reset crop
        </Button>
      ) : null}
    </Field>
  );
}

/* ------------------------------------------------------------------ *
 * Shared editors
 * ------------------------------------------------------------------ */

function RunsEditor({
  label,
  runs,
  onChange,
  rows = 2,
  placeholder,
}: {
  label: string;
  runs: Run[];
  onChange: (runs: Run[]) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <Field label={label} hint="**bold** *italic*">
      <textarea
        value={runsToPlainText(runs)}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(parseInline(e.target.value))}
        className="w-full resize-y rounded-lg border border-line bg-white px-2.5 py-1.5 text-[13px] text-ink placeholder:text-faint focus:border-question-hue focus:ring-2 focus:ring-question-hue/15 focus:outline-none"
      />
    </Field>
  );
}

function LineListEditor({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const body = (
    <textarea
      value={values.join('\n')}
      rows={Math.min(10, Math.max(3, values.length + 1))}
      placeholder={placeholder ?? 'One per line'}
      onChange={(e) => onChange(e.target.value.split('\n'))}
      className="w-full resize-y rounded-lg border border-line bg-white px-2.5 py-1.5 text-[13px] text-ink placeholder:text-faint focus:border-question-hue focus:ring-2 focus:ring-question-hue/15 focus:outline-none"
    />
  );
  return label ? (
    <Field label={label} hint="one per line">
      {body}
    </Field>
  ) : (
    body
  );
}

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
