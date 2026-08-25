'use client';

import { RotateCcw } from 'lucide-react';
import {
  FONT_FAMILIES,
  PAGE_SIZES,
  mmToPt,
  ptToMm,
} from '@/lib/model/defaults';
import type {
  FontFamily,
  HeaderFooter,
  Orientation,
  PageSizeName,
  Run,
} from '@/lib/model/types';
import { useEditor } from '@/lib/store/editorStore';
import { ColorPicker } from '@/components/ui/ColorPicker';
import {
  Field,
  NumberInput,
  PanelSection,
  Segmented,
  Select,
  Slider,
  TextInput,
  Toggle,
} from '@/components/ui/primitives';

/** Page setup, typography, running header/footer and numbering rules. */
export function DocumentPanel() {
  const doc = useEditor((s) => s.doc);
  const store = useEditor;
  const page = doc.page;
  const theme = doc.theme;

  const sizeOptions = [
    ...(Object.keys(PAGE_SIZES) as (keyof typeof PAGE_SIZES)[]).map((key) => ({
      value: key as PageSizeName,
      label: PAGE_SIZES[key].label,
    })),
    { value: 'Custom' as PageSizeName, label: 'Custom size' },
  ];

  const setSize = (size: PageSizeName) => {
    if (size === 'Custom') {
      store.getState().setPageSetup({ size });
      return;
    }
    const preset = PAGE_SIZES[size as keyof typeof PAGE_SIZES];
    store.getState().setPageSetup({ size, width: preset.width, height: preset.height });
  };

  const setMargin = (side: 'top' | 'right' | 'bottom' | 'left', mm: number) =>
    store.getState().setPageSetup({
      margins: { ...page.margins, [side]: mmToPt(Math.max(0, mm)) },
    });

  return (
    <div>
      <PanelSection title="Page">
        <div className="grid gap-2.5">
          <Field label="Size">
            <Select value={page.size} onChange={setSize} options={sizeOptions} />
          </Field>

          {page.size === 'Custom' ? (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Width">
                <NumberInput
                  value={ptToMm(page.width)}
                  onChange={(v) => store.getState().setPageSetup({ width: mmToPt(Math.max(20, v)) })}
                  suffix="mm"
                />
              </Field>
              <Field label="Height">
                <NumberInput
                  value={ptToMm(page.height)}
                  onChange={(v) => store.getState().setPageSetup({ height: mmToPt(Math.max(20, v)) })}
                  suffix="mm"
                />
              </Field>
            </div>
          ) : null}

          <Field label="Orientation">
            <Segmented<Orientation>
              value={page.orientation}
              onChange={(orientation) => store.getState().setPageSetup({ orientation })}
              className="w-full"
              options={[
                { value: 'portrait', label: 'Portrait' },
                { value: 'landscape', label: 'Landscape' },
              ]}
            />
          </Field>

          <Field label="Margins" hint="mm">
            <div className="grid grid-cols-4 gap-1.5">
              {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                <NumberInput
                  key={side}
                  value={ptToMm(page.margins[side])}
                  onChange={(v) => setMargin(side, v)}
                />
              ))}
            </div>
            <div className="mt-1 grid grid-cols-4 gap-1.5 text-center text-[10px] text-faint">
              <span>Top</span>
              <span>Right</span>
              <span>Bottom</span>
              <span>Left</span>
            </div>
          </Field>

          <Field label="Columns">
            <Segmented
              value={String(page.columns)}
              onChange={(v) => store.getState().setPageSetup({ columns: Number(v) })}
              className="w-full"
              options={[
                { value: '1', label: '1' },
                { value: '2', label: '2' },
                { value: '3', label: '3' },
              ]}
            />
          </Field>
        </div>
      </PanelSection>

      <PanelSection title="Page border">
        <Toggle
          label="Draw a border"
          checked={!!page.border}
          onChange={(on) =>
            store.getState().setPageSetup({
              border: on
                ? { color: '#374151', width: 0.9, inset: 24, style: 'solid', radius: 2 }
                : undefined,
            })
          }
        />
        {page.border ? (
          <div className="mt-2 grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Thickness">
                <NumberInput
                  value={page.border.width}
                  step={0.25}
                  min={0}
                  onChange={(width) =>
                    store.getState().setPageSetup({ border: { ...page.border!, width } })
                  }
                  suffix="pt"
                />
              </Field>
              <Field label="Inset">
                <NumberInput
                  value={page.border.inset}
                  min={0}
                  onChange={(inset) =>
                    store.getState().setPageSetup({ border: { ...page.border!, inset } })
                  }
                  suffix="pt"
                />
              </Field>
            </div>
            <Field label="Style">
              <Select
                value={page.border.style}
                onChange={(style) =>
                  store.getState().setPageSetup({ border: { ...page.border!, style } })
                }
                options={[
                  { value: 'solid', label: 'Solid' },
                  { value: 'double', label: 'Double' },
                  { value: 'dashed', label: 'Dashed' },
                  { value: 'dotted', label: 'Dotted' },
                ]}
              />
            </Field>
            <Field label="Colour">
              <ColorPicker
                label="Border colour"
                value={page.border.color}
                onChange={(color) =>
                  store.getState().setPageSetup({
                    border: { ...page.border!, color: color ?? '#374151' },
                  })
                }
              />
            </Field>
          </div>
        ) : null}
      </PanelSection>

      <PanelSection title="Typography">
        <div className="grid gap-2.5">
          <Field label="Body font">
            <Select<FontFamily>
              value={theme.bodyFamily}
              onChange={(bodyFamily) => store.getState().setTheme({ bodyFamily })}
              options={FONT_FAMILIES.map((f) => ({ value: f.id, label: `${f.label} — ${f.hint}` }))}
            />
          </Field>
          <Field label="Heading font">
            <Select<FontFamily>
              value={theme.headingFamily}
              onChange={(headingFamily) => store.getState().setTheme({ headingFamily })}
              options={FONT_FAMILIES.map((f) => ({ value: f.id, label: `${f.label} — ${f.hint}` }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Body size">
              <NumberInput
                value={theme.bodySize}
                min={6}
                max={36}
                step={0.5}
                onChange={(bodySize) => store.getState().setTheme({ bodySize })}
                suffix="pt"
              />
            </Field>
            <Field label="Line height" hint={theme.lineHeight.toFixed(2)}>
              <Slider
                value={theme.lineHeight}
                min={1}
                max={2.4}
                step={0.01}
                onChange={(lineHeight) => store.getState().setTheme({ lineHeight })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Text colour">
              <ColorPicker
                label="Text colour"
                value={theme.textColor}
                onChange={(textColor) => store.getState().setTheme({ textColor: textColor ?? '#111827' })}
              />
            </Field>
            <Field label="Secondary">
              <ColorPicker
                label="Secondary colour"
                value={theme.muted}
                onChange={(muted) => store.getState().setTheme({ muted: muted ?? '#6b7280' })}
              />
            </Field>
          </div>
        </div>
      </PanelSection>

      <PanelSection title="Question numbering">
        <div className="grid gap-2.5">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Question format" hint="{n}">
              <TextInput
                value={doc.numbering.questionFormat}
                onChange={(e) =>
                  store.getState().edit((draft) => {
                    draft.numbering.questionFormat = e.target.value;
                  }, { coalesce: 'numbering' })
                }
              />
            </Field>
            <Field label="Sub-part format" hint="{n}">
              <TextInput
                value={doc.numbering.partFormat}
                onChange={(e) =>
                  store.getState().edit((draft) => {
                    draft.numbering.partFormat = e.target.value;
                  }, { coalesce: 'numbering' })
                }
              />
            </Field>
          </div>
          <Field label="Sub-part counter">
            <Segmented
              value={doc.numbering.partStyle}
              onChange={(partStyle) =>
                store.getState().edit((draft) => {
                  draft.numbering.partStyle = partStyle;
                }, { label: 'Numbering' })
              }
              className="w-full"
              options={[
                { value: 'alpha', label: 'a b c' },
                { value: 'roman', label: 'i ii iii' },
                { value: 'number', label: '1 2 3' },
              ]}
            />
          </Field>
          <Field label="Marks format" hint="{n}">
            <TextInput
              value={doc.numbering.marksFormat}
              onChange={(e) =>
                store.getState().edit((draft) => {
                  draft.numbering.marksFormat = e.target.value;
                }, { coalesce: 'numbering' })
              }
            />
          </Field>
          <Toggle
            label="Show marks"
            hint="Prints the marks against each question"
            checked={doc.numbering.showMarks}
            onChange={(showMarks) =>
              store.getState().edit((draft) => {
                draft.numbering.showMarks = showMarks;
              }, { label: 'Numbering' })
            }
          />
          <Toggle
            label="Restart at each section"
            hint="Section B begins again at 1"
            checked={doc.numbering.restartEachSection}
            onChange={(restartEachSection) =>
              store.getState().edit((draft) => {
                draft.numbering.restartEachSection = restartEachSection;
              }, { label: 'Numbering' })
            }
          />
        </div>
      </PanelSection>

      <HeaderFooterSection which="header" />
      <HeaderFooterSection which="footer" />

      <PanelSection title="Watermark">
        <Toggle
          label="Show a watermark"
          checked={doc.master.watermark.enabled}
          onChange={(enabled) =>
            store.getState().edit((draft) => {
              draft.master.watermark.enabled = enabled;
            }, { label: 'Watermark' })
          }
        />
        {doc.master.watermark.enabled ? (
          <div className="mt-2 grid gap-2">
            <TextInput
              value={doc.master.watermark.text}
              placeholder="DRAFT"
              onChange={(e) =>
                store.getState().edit((draft) => {
                  draft.master.watermark.text = e.target.value;
                }, { coalesce: 'watermark' })
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Size">
                <NumberInput
                  value={doc.master.watermark.size}
                  min={12}
                  max={300}
                  onChange={(size) =>
                    store.getState().edit((draft) => {
                      draft.master.watermark.size = size;
                    }, { coalesce: 'watermark' })
                  }
                  suffix="pt"
                />
              </Field>
              <Field label="Angle">
                <NumberInput
                  value={doc.master.watermark.rotation}
                  min={-90}
                  max={90}
                  onChange={(rotation) =>
                    store.getState().edit((draft) => {
                      draft.master.watermark.rotation = rotation;
                    }, { coalesce: 'watermark' })
                  }
                  suffix="°"
                />
              </Field>
            </div>
            <Field label="Opacity" hint={`${Math.round(doc.master.watermark.opacity * 100)}%`}>
              <Slider
                value={doc.master.watermark.opacity}
                min={0.02}
                max={0.5}
                step={0.01}
                onChange={(opacity) =>
                  store.getState().edit((draft) => {
                    draft.master.watermark.opacity = opacity;
                  }, { coalesce: 'watermark' })
                }
              />
            </Field>
            <ColorPicker
              label="Watermark colour"
              value={doc.master.watermark.color}
              onChange={(color) =>
                store.getState().edit((draft) => {
                  draft.master.watermark.color = color ?? '#94a3b8';
                }, { label: 'Watermark' })
              }
            />
          </div>
        ) : null}
      </PanelSection>
    </div>
  );
}

const TOKEN_HELP = '{{page}} {{pages}} {{title}} {{date}}';

function HeaderFooterSection({ which }: { which: 'header' | 'footer' }) {
  const master = useEditor((s) => s.doc.master[which]);
  const fields = useEditor((s) => s.doc.fields);
  const store = useEditor;

  const update = (patch: Partial<HeaderFooter>) =>
    store.getState().edit((draft) => {
      draft.master[which] = { ...draft.master[which], ...patch };
    }, { coalesce: `${which}` });

  const setSlot = (slot: 'left' | 'center' | 'right', text: string) =>
    store.getState().edit((draft) => {
      const runs: Run[] = text ? [{ text }] : [];
      draft.master[which].slots = { ...draft.master[which].slots, [slot]: runs };
    }, { coalesce: `${which}-${slot}` });

  const slotText = (slot: 'left' | 'center' | 'right') =>
    master.slots[slot].map((r) => r.text).join('');

  const fieldTokens = Object.keys(fields).slice(0, 6);

  return (
    <PanelSection title={which === 'header' ? 'Running header' : 'Running footer'}>
      <Toggle
        label={`Show a ${which}`}
        checked={master.enabled}
        onChange={(enabled) => update({ enabled })}
      />
      {master.enabled ? (
        <div className="mt-2 grid gap-2">
          {(['left', 'center', 'right'] as const).map((slot) => (
            <Field key={slot} label={slot === 'center' ? 'Centre' : slot}>
              <TextInput
                value={slotText(slot)}
                placeholder={slot === 'center' ? 'Page {{page}} of {{pages}}' : ''}
                onChange={(e) => setSlot(slot, e.target.value)}
              />
            </Field>
          ))}
          <p className="text-[11px] text-faint">
            Placeholders: <span className="font-mono">{TOKEN_HELP}</span>
            {fieldTokens.length ? (
              <>
                {' '}
                and{' '}
                <span className="font-mono">
                  {fieldTokens.map((f) => `{{${f}}}`).join(' ')}
                </span>
              </>
            ) : null}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Distance">
              <NumberInput
                value={master.offset}
                min={6}
                max={120}
                onChange={(offset) => update({ offset })}
                suffix="pt"
              />
            </Field>
            <Field label="Size">
              <NumberInput
                value={master.style.size ?? 9}
                min={5}
                max={20}
                step={0.5}
                onChange={(size) => update({ style: { ...master.style, size } })}
                suffix="pt"
              />
            </Field>
          </div>
          <Toggle
            label="Rule line"
            checked={master.rule}
            onChange={(rule) => update({ rule })}
          />
          <Toggle
            label="Show on the first page"
            checked={master.showOnFirstPage}
            onChange={(showOnFirstPage) => update({ showOnFirstPage })}
          />
          <button
            type="button"
            onClick={() =>
              update({
                slots: { left: [], center: [], right: [] },
                rule: false,
                offset: 24,
              })
            }
            className="mt-1 flex items-center gap-1.5 text-[12px] text-muted hover:text-ink"
          >
            <RotateCcw size={12} /> Reset {which}
          </button>
        </div>
      ) : null}
    </PanelSection>
  );
}
