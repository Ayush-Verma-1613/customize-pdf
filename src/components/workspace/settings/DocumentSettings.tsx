'use client';

import { FONT_FAMILIES, PAGE_SIZES, mmToPt, ptToMm } from '@/lib/model/defaults';
import type {
  FontFamily,
  NumberingConfig,
  PageSetup,
  PageSizeName,
  Theme,
} from '@/lib/model/types';
import { Field, Input } from '../ui/Input';
import { Select } from '../ui/Select';

/**
 * The three collapsed sections, wired to the real page setup, theme and
 * numbering. Everything here changes the document that will be exported, so
 * the sheet in the middle answers every one of them immediately.
 */

/* Side by side where there is room, stacked where there is not. */
const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">{children}</div>
);

export function LayoutSettings({
  page,
  onChange,
}: {
  page: PageSetup;
  onChange: (patch: Partial<PageSetup>) => void;
}) {
  const sizes = Object.keys(PAGE_SIZES) as Exclude<PageSizeName, 'Custom'>[];

  return (
    <div className="space-y-3 px-3.5 pt-1 pb-4">
      <Row>
        <Field label="Page size">
          <Select
            value={sizes.includes(page.size as never) ? page.size : sizes[1]}
            onChange={(size) =>
              onChange({
                size: size as PageSizeName,
                width: PAGE_SIZES[size as Exclude<PageSizeName, 'Custom'>].width,
                height: PAGE_SIZES[size as Exclude<PageSizeName, 'Custom'>].height,
              })
            }
            options={sizes}
            ariaLabel="Page size"
          />
        </Field>
        <Field label="Orientation">
          <Select
            value={page.orientation}
            onChange={(orientation) =>
              onChange({ orientation: orientation as PageSetup['orientation'] })
            }
            options={['portrait', 'landscape']}
            ariaLabel="Orientation"
          />
        </Field>
      </Row>

      <Row>
        <Field label="Margin (mm)">
          <Input
            value={String(Math.round(ptToMm(page.margins.top)))}
            onChange={(value) => {
              const mm = Number(value);
              if (!Number.isFinite(mm)) return;
              const pt = mmToPt(Math.min(80, Math.max(5, mm)));
              onChange({ margins: { top: pt, right: pt, bottom: pt, left: pt } });
            }}
            ariaLabel="Margin in millimetres"
          />
        </Field>
        <Field label="Columns">
          <Select
            value={String(page.columns)}
            onChange={(columns) => onChange({ columns: Number(columns) })}
            options={['1', '2', '3']}
            ariaLabel="Columns"
          />
        </Field>
      </Row>
    </div>
  );
}

export function AppearanceSettings({
  theme,
  page,
  onTheme,
  onPage,
}: {
  theme: Theme;
  page: PageSetup;
  onTheme: (patch: Partial<Theme>) => void;
  onPage: (patch: Partial<PageSetup>) => void;
}) {
  const families = FONT_FAMILIES.map((f) => f.id);

  return (
    <div className="space-y-3 px-3.5 pt-1 pb-4">
      <Row>
        <Field label="Body font">
          <Select
            value={theme.bodyFamily}
            onChange={(bodyFamily) => onTheme({ bodyFamily: bodyFamily as FontFamily })}
            options={families}
            ariaLabel="Body font"
          />
        </Field>
        <Field label="Heading font">
          <Select
            value={theme.headingFamily}
            onChange={(headingFamily) => onTheme({ headingFamily: headingFamily as FontFamily })}
            options={families}
            ariaLabel="Heading font"
          />
        </Field>
      </Row>

      <Row>
        <Field label="Text size (pt)">
          <Input
            value={String(theme.bodySize)}
            onChange={(value) => {
              const size = Number(value);
              if (Number.isFinite(size)) onTheme({ bodySize: Math.min(24, Math.max(6, size)) });
            }}
            ariaLabel="Body text size"
          />
        </Field>
        <Field label="Line spacing">
          <Select
            value={theme.lineHeight.toFixed(2)}
            onChange={(value) => onTheme({ lineHeight: Number(value) })}
            options={['1.15', '1.25', '1.35', '1.50', '1.75']}
            ariaLabel="Line spacing"
          />
        </Field>
      </Row>

      <Field label="Page border">
        <Select
          value={page.border ? 'On' : 'Off'}
          onChange={(value) =>
            onPage({
              border:
                value === 'On'
                  ? { color: '#374151', width: 0.9, inset: 24, style: 'solid', radius: 2 }
                  : undefined,
            })
          }
          options={['Off', 'On']}
          ariaLabel="Page border"
        />
      </Field>
    </div>
  );
}

export function QuestionSettings({
  numbering,
  onChange,
}: {
  numbering: NumberingConfig;
  onChange: (patch: Partial<NumberingConfig>) => void;
}) {
  return (
    <div className="space-y-3 px-3.5 pt-1 pb-4">
      <Row>
        <Field label="Question format">
          <Select
            value={numbering.questionFormat}
            onChange={(questionFormat) => onChange({ questionFormat })}
            options={['{n}.', 'Q{n}.', '{n})', 'Q.{n}']}
            ariaLabel="Question format"
          />
        </Field>
        <Field label="Sub-part style">
          <Select
            value={numbering.partStyle}
            onChange={(partStyle) =>
              onChange({ partStyle: partStyle as NumberingConfig['partStyle'] })
            }
            options={['alpha', 'roman', 'number']}
            ariaLabel="Sub-part style"
          />
        </Field>
      </Row>

      <Row>
        <Field label="Marks shown as">
          <Select
            value={numbering.marksFormat}
            onChange={(marksFormat) => onChange({ marksFormat })}
            options={['[{n}]', '({n})', '{n} marks']}
            ariaLabel="Marks format"
          />
        </Field>
        <Field label="Show marks">
          <Select
            value={numbering.showMarks ? 'Yes' : 'No'}
            onChange={(value) => onChange({ showMarks: value === 'Yes' })}
            options={['Yes', 'No']}
            ariaLabel="Show marks"
          />
        </Field>
      </Row>

      <Field label="Restart numbering each section">
        <Select
          value={numbering.restartEachSection ? 'Yes' : 'No'}
          onChange={(value) => onChange({ restartEachSection: value === 'Yes' })}
          options={['No', 'Yes']}
          ariaLabel="Restart numbering each section"
        />
      </Field>
    </div>
  );
}
