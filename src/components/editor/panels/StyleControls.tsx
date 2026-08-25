'use client';

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Underline,
} from 'lucide-react';
import { FONT_FAMILIES } from '@/lib/model/defaults';
import type { Align, BlockStyle, FontFamily } from '@/lib/model/types';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { Field, IconButton, NumberInput, Segmented, Select, Slider } from '@/components/ui/primitives';

/**
 * Block-level typography controls. Everything here writes into BlockStyle, and
 * every field left undefined falls through to the document theme - which is how
 * changing the theme font restyles a whole paper without touching each block.
 */

export interface StyleControlsProps {
  style: BlockStyle;
  onChange: (patch: Partial<BlockStyle>) => void;
  /** Defaults shown as placeholders when a property is inherited. */
  inherited: { family: FontFamily; size: number; lineHeight: number; color: string };
  show?: {
    align?: boolean;
    spacing?: boolean;
    indent?: boolean;
    box?: boolean;
    flow?: boolean;
  };
}

const ALIGNMENTS: { value: Align; icon: React.ReactNode; label: string }[] = [
  { value: 'left', icon: <AlignLeft size={14} />, label: 'Align left' },
  { value: 'center', icon: <AlignCenter size={14} />, label: 'Align centre' },
  { value: 'right', icon: <AlignRight size={14} />, label: 'Align right' },
  { value: 'justify', icon: <AlignJustify size={14} />, label: 'Justify' },
];

export function StyleControls({ style, onChange, inherited, show = {} }: StyleControlsProps) {
  const {
    align = true,
    spacing = true,
    indent = true,
    box = true,
    flow = true,
  } = show;

  return (
    <div className="grid gap-2.5">
      <Field label="Font" hint={style.family ? undefined : `Theme · ${inherited.family}`}>
        <Select<FontFamily | 'inherit'>
          value={style.family ?? 'inherit'}
          onChange={(family) => onChange({ family: family === 'inherit' ? undefined : family })}
          options={[
            { value: 'inherit', label: `Use theme font (${inherited.family})` },
            ...FONT_FAMILIES.map((f) => ({ value: f.id as FontFamily, label: f.label })),
          ]}
        />
      </Field>

      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
        <Field label="Size" hint={style.size ? undefined : `${inherited.size}pt`}>
          <NumberInput
            value={style.size ?? inherited.size}
            min={4}
            max={200}
            step={0.5}
            onChange={(size) => onChange({ size })}
            suffix="pt"
          />
        </Field>
        <div className="flex gap-0.5 pb-0.5">
          <IconButton
            label="Bold"
            active={!!style.bold}
            onClick={() => onChange({ bold: style.bold ? undefined : true })}
          >
            <Bold size={14} />
          </IconButton>
          <IconButton
            label="Italic"
            active={!!style.italic}
            onClick={() => onChange({ italic: style.italic ? undefined : true })}
          >
            <Italic size={14} />
          </IconButton>
          <IconButton
            label="Underline"
            active={!!style.underline}
            onClick={() => onChange({ underline: style.underline ? undefined : true })}
          >
            <Underline size={14} />
          </IconButton>
        </div>
      </div>

      {align ? (
        <Field label="Alignment">
          <div className="flex gap-0.5">
            {ALIGNMENTS.map((option) => (
              <IconButton
                key={option.value}
                label={option.label}
                active={style.align === option.value}
                onClick={() =>
                  onChange({ align: style.align === option.value ? undefined : option.value })
                }
              >
                {option.icon}
              </IconButton>
            ))}
          </div>
        </Field>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <Field label="Colour">
          <ColorPicker
            label="Text colour"
            value={style.color ?? inherited.color}
            onChange={(color) => onChange({ color })}
            allowNone
          />
        </Field>
        <Field
          label="Line height"
          hint={(style.lineHeight ?? inherited.lineHeight).toFixed(2)}
        >
          <Slider
            value={style.lineHeight ?? inherited.lineHeight}
            min={0.9}
            max={2.6}
            step={0.01}
            onChange={(lineHeight) => onChange({ lineHeight })}
          />
        </Field>
      </div>

      <Field label="Letter spacing" hint={`${(style.letterSpacing ?? 0).toFixed(2)}pt`}>
        <Slider
          value={style.letterSpacing ?? 0}
          min={-1}
          max={6}
          step={0.05}
          onChange={(letterSpacing) => onChange({ letterSpacing: letterSpacing || undefined })}
        />
      </Field>

      {spacing ? (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Space before">
            <NumberInput
              value={style.spaceBefore ?? 0}
              min={0}
              max={300}
              onChange={(spaceBefore) => onChange({ spaceBefore })}
              suffix="pt"
            />
          </Field>
          <Field label="Space after">
            <NumberInput
              value={style.spaceAfter ?? 0}
              min={0}
              max={300}
              onChange={(spaceAfter) => onChange({ spaceAfter })}
              suffix="pt"
            />
          </Field>
        </div>
      ) : null}

      {indent ? (
        <div className="grid grid-cols-3 gap-2">
          <Field label="Left">
            <NumberInput
              value={style.indentLeft ?? 0}
              min={0}
              onChange={(indentLeft) => onChange({ indentLeft })}
            />
          </Field>
          <Field label="Right">
            <NumberInput
              value={style.indentRight ?? 0}
              min={0}
              onChange={(indentRight) => onChange({ indentRight })}
            />
          </Field>
          <Field label="First line">
            <NumberInput
              value={style.firstLineIndent ?? 0}
              onChange={(firstLineIndent) => onChange({ firstLineIndent })}
            />
          </Field>
        </div>
      ) : null}

      {box ? (
        <div className="grid gap-2">
          <Field label="Background">
            <ColorPicker
              label="Background"
              value={style.background}
              onChange={(background) => onChange({ background })}
              allowNone
            />
          </Field>
          <Field label="Box border">
            <div className="grid grid-cols-[1fr_auto_auto] gap-1.5">
              <ColorPicker
                label="Border colour"
                value={style.border?.color}
                onChange={(color) =>
                  onChange({
                    border: color
                      ? { color, width: style.border?.width ?? 0.75, style: style.border?.style ?? 'solid', radius: style.border?.radius ?? 3 }
                      : undefined,
                  })
                }
                allowNone
              />
              <NumberInput
                className="w-16"
                value={style.border?.width ?? 0}
                min={0}
                step={0.25}
                onChange={(width) =>
                  onChange({
                    border: {
                      color: style.border?.color ?? '#cbd5e1',
                      style: style.border?.style ?? 'solid',
                      radius: style.border?.radius ?? 3,
                      width,
                    },
                  })
                }
              />
              <NumberInput
                className="w-16"
                value={style.border?.radius ?? 0}
                min={0}
                onChange={(radius) =>
                  onChange({
                    border: {
                      color: style.border?.color ?? '#cbd5e1',
                      style: style.border?.style ?? 'solid',
                      width: style.border?.width ?? 0.75,
                      radius,
                    },
                  })
                }
              />
            </div>
            <div className="mt-1 grid grid-cols-[1fr_auto_auto] gap-1.5 text-[10px] text-faint">
              <span>Colour</span>
              <span className="w-16 text-center">Width</span>
              <span className="w-16 text-center">Radius</span>
            </div>
          </Field>
        </div>
      ) : null}

      {flow ? (
        <Field label="Page behaviour">
          <Segmented
            value={
              style.breakBefore ? 'break' : style.keepTogether ? 'together' : style.keepWithNext ? 'withNext' : 'auto'
            }
            onChange={(value) =>
              onChange({
                breakBefore: value === 'break' ? true : undefined,
                keepTogether: value === 'together' ? true : undefined,
                keepWithNext: value === 'withNext' ? true : undefined,
              })
            }
            className="w-full"
            options={[
              { value: 'auto', label: 'Auto', title: 'Break wherever it fits' },
              { value: 'together', label: 'Keep whole', title: 'Never split across pages' },
              { value: 'withNext', label: 'Keep w/ next', title: 'Stay with the following element' },
              { value: 'break', label: 'New page', title: 'Always start a new page' },
            ]}
          />
        </Field>
      ) : null}
    </div>
  );
}
