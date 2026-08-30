import type { Block, PaperDoc } from '@/lib/model/types';
import { GENERAL_TEMPLATES } from './general';
import { RESUME_TEMPLATES } from './resume';
import { TEACHING_TEMPLATES } from './teaching';
import type { TemplateDef, TemplateInput, TemplateVariant } from './kit';

export type { TemplateDef, TemplateField, TemplateInput, TemplateVariant } from './kit';

export const TEMPLATES: TemplateDef[] = [
  ...TEACHING_TEMPLATES,
  ...GENERAL_TEMPLATES,
  ...RESUME_TEMPLATES,
];

export const TEMPLATE_CATEGORIES = ['Teaching', 'School admin', 'Business', 'Personal'] as const;

export const getTemplate = (id: string): TemplateDef | undefined =>
  TEMPLATES.find((t) => t.id === id);

/** The body layouts a template offers, or an empty list when it has only one. */
export const getVariants = (id: string): TemplateVariant[] => getTemplate(id)?.variants ?? [];

/** The variant that will be built when none is named. */
export const defaultVariant = (id: string): string | undefined => getVariants(id)[0]?.id;

/**
 * The body layout a document is actually showing. Documents saved before
 * variants existed carry no id, and a stale one can outlive a renamed variant,
 * so both fall back to the layout that would have been built.
 */
export function activeVariant(doc: { templateId?: string; variantId?: string }): string | undefined {
  if (!doc.templateId) return undefined;
  const variants = getVariants(doc.templateId);
  if (!variants.length) return undefined;
  return variants.some((v) => v.id === doc.variantId) ? doc.variantId : variants[0].id;
}

/**
 * Build a document from a template, stamping the template and body layout onto
 * it so the editor can show which is in use and offer to swap it later.
 */
export function buildFromTemplate(id: string, input: TemplateInput): PaperDoc {
  const template = getTemplate(id) ?? TEMPLATES[0];
  const variants = template.variants ?? [];
  const variant = variants.some((v) => v.id === input.variant)
    ? input.variant
    : variants[0]?.id;

  const doc = template.build({ ...input, variant });

  // Everything the template invented is marked as its own, so restyling or
  // swapping the body layout can replace it instead of piling a second copy on
  // top. Blocks that came in through `body` are the user's and stay untouched.
  const carried = new Set(input.body.map((block) => block.id));
  doc.flow = doc.flow.map((block) =>
    carried.has(block.id) ? block : { ...block, generated: true },
  );

  doc.templateId = template.id;
  doc.variantId = variant;
  if (input.title) doc.title = input.title;
  return doc;
}

/**
 * Starting values for a template's fields.
 *
 * A field's placeholder is already a worked example - "Green Valley Public
 * School", "Half Yearly Examination 2025-26" - so it is used as the starting
 * value rather than only as grey text. The preview then shows a finished-
 * looking paper from the first frame, and every one of those words can be
 * typed straight over.
 */
export function templateDefaults(id: string): Record<string, string> {
  const template = getTemplate(id);
  const out: Record<string, string> = {};
  for (const f of template?.fields ?? []) out[f.key] = f.default ?? f.placeholder ?? '';
  return out;
}

/**
 * The blocks that belong to the person rather than to the template.
 *
 * Template furniture - mastheads, instruction boxes, sample bodies, closing
 * lines - is regenerated on every build, so carrying it across would leave two
 * copies. Anything a template wrote and nobody has touched is dropped; the
 * moment somebody edits one of those blocks it stops being generated and comes
 * across like everything else they wrote.
 */
export function carriedContent(flow: Block[]): Block[] {
  return flow.filter((block) => !block.generated);
}
