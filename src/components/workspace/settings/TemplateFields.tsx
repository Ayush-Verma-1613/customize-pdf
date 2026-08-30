'use client';

import { Clock, Hash, School, Star, Type as TypeIcon } from 'lucide-react';
import type { TemplateDef } from '@/lib/templates';
import { Field, Input } from '../ui/Input';
import { Select } from '../ui/Select';

/**
 * The details this particular document needs.
 *
 * The fields come from the template rather than from a fixed list here, so a
 * certificate asks for a recipient and an invoice asks for a client without
 * this component knowing either of them exists.
 */

/** A few well-known fields earn an icon; the rest are plain. */
const ICONS: Record<string, React.ReactNode> = {
  time: <Clock size={15} />,
  maxMarks: <Star size={15} />,
  school: <School size={15} />,
  org: <School size={15} />,
  ref: <Hash size={15} />,
  number: <Hash size={15} />,
};

/** Fields that read better side by side than stacked. */
const PAIRED = new Set(['subject', 'class', 'time', 'maxMarks', 'date', 'due']);

export function TemplateFields({
  template,
  title,
  onTitleChange,
  values,
  onChange,
}: {
  template: TemplateDef;
  title: string;
  onTitleChange: (value: string) => void;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const fields = template.fields;
  const rows: (typeof fields)[] = [];

  // Walk the template's own order, pairing neighbours that are both short.
  for (let i = 0; i < fields.length; i += 1) {
    const field = fields[i];
    const next = fields[i + 1];
    if (PAIRED.has(field.key) && next && PAIRED.has(next.key)) {
      rows.push([field, next]);
      i += 1;
    } else {
      rows.push([field]);
    }
  }

  return (
    <div className="space-y-3 px-3.5 pt-1 pb-4">
      <Field label="Document Name">
        <Input
          value={title}
          onChange={onTitleChange}
          placeholder={template.name}
          icon={<TypeIcon size={15} />}
          ariaLabel="Document name"
        />
      </Field>

      {rows.map((row) => (
        <div
          key={row.map((f) => f.key).join('-')}
          className={row.length === 2 ? 'grid grid-cols-1 gap-3 min-[380px]:grid-cols-2' : undefined}
        >
          {row.map((field) => (
            <Field key={field.key} label={field.label}>
              {field.options ? (
                <Select
                  value={values[field.key] || field.options[0]}
                  onChange={(value) => onChange(field.key, value)}
                  options={field.options}
                  ariaLabel={field.label}
                />
              ) : (
                <Input
                  value={values[field.key] ?? ''}
                  onChange={(value) => onChange(field.key, value)}
                  placeholder={field.placeholder}
                  icon={ICONS[field.key]}
                  ariaLabel={field.label}
                />
              )}
            </Field>
          ))}
        </div>
      ))}

      {fields.length === 0 ? (
        <p className="rounded-[10px] bg-[#FAF9F6] px-3 py-3 text-[12.5px] leading-relaxed text-forge-ink-soft">
          This one has no details to fill in — it is a blank page. Paste your
          content below, or open it and start typing.
        </p>
      ) : null}
    </div>
  );
}
