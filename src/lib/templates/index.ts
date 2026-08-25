import type { PaperDoc } from '@/lib/model/types';
import { GENERAL_TEMPLATES } from './general';
import { TEACHING_TEMPLATES } from './teaching';
import type { TemplateDef, TemplateInput } from './kit';

export type { TemplateDef, TemplateField, TemplateInput } from './kit';

export const TEMPLATES: TemplateDef[] = [...TEACHING_TEMPLATES, ...GENERAL_TEMPLATES];

export const TEMPLATE_CATEGORIES = ['Teaching', 'School admin', 'Business'] as const;

export const getTemplate = (id: string): TemplateDef | undefined =>
  TEMPLATES.find((t) => t.id === id);

/** Build a document from a template, stamping the template id onto it. */
export function buildFromTemplate(id: string, input: TemplateInput): PaperDoc {
  const template = getTemplate(id) ?? TEMPLATES[0];
  const doc = template.build(input);
  doc.templateId = template.id;
  if (input.title) doc.title = input.title;
  return doc;
}

/** Defaults for the quick-start form, so the preview is never empty. */
export function templateDefaults(id: string): Record<string, string> {
  const template = getTemplate(id);
  const out: Record<string, string> = {};
  for (const f of template?.fields ?? []) out[f.key] = f.default ?? '';
  return out;
}
