'use client';

import { useState } from 'react';
import { Check, Layers } from 'lucide-react';
import { TEMPLATE_CATEGORIES, TEMPLATES, buildFromTemplate } from '@/lib/templates';
import { useEditor } from '@/lib/store/editorStore';
import { cx } from '@/lib/utils/cx';
import { Button, EmptyHint, PanelSection } from '@/components/ui/primitives';

/**
 * Switching template restyles the document: page setup, typography, masthead
 * and furniture are replaced, while the content the teacher wrote is carried
 * across. That is the whole promise of the flow model - the words are not
 * entangled with the design.
 */
export function TemplatesPanel() {
  const doc = useEditor((s) => s.doc);
  const store = useEditor;
  const [confirming, setConfirming] = useState<string | null>(null);

  const apply = (templateId: string, keepContent: boolean) => {
    store.getState().edit(() => {
      const carried = keepContent ? contentBlocks(doc) : [];
      const next = buildFromTemplate(templateId, {
        title: doc.title,
        fields: doc.fields,
        body: carried,
      });
      // Keep identity and provenance; everything else comes from the template.
      return {
        ...next,
        id: doc.id,
        createdAt: doc.createdAt,
        overlays: doc.overlays,
      };
    }, { label: 'Apply template' });
    setConfirming(null);
  };

  return (
    <div>
      {TEMPLATE_CATEGORIES.map((category) => {
        const items = TEMPLATES.filter((t) => t.category === category);
        if (!items.length) return null;
        return (
          <PanelSection key={category} title={category}>
            <div className="grid gap-2">
              {items.map((template) => {
                const active = doc.templateId === template.id;
                const isConfirming = confirming === template.id;
                return (
                  <div
                    key={template.id}
                    className={cx(
                      'rounded-xl border bg-white p-2.5 transition-colors',
                      active ? 'border-question-hue/50 bg-question-wash/30' : 'border-line hover:border-slate-300',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setConfirming(isConfirming ? null : template.id)}
                      className="flex w-full items-start gap-2.5 text-left"
                    >
                      <span
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: `${template.accent}18`, color: template.accent }}
                      >
                        {active ? <Check size={15} /> : <Layers size={15} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[13px] font-medium text-ink">
                            {template.name}
                          </span>
                          {active ? (
                            <span className="rounded bg-question-wash px-1.5 py-px text-[10px] text-question-hue">
                              In use
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-relaxed text-faint">
                          {template.description}
                        </span>
                      </span>
                    </button>

                    <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2">
                      {template.preview.map((line, i) => (
                        <p
                          key={i}
                          className={cx(
                            'truncate font-mono text-[10px]',
                            i === 0 ? 'text-ink-soft' : 'text-faint',
                          )}
                        >
                          {line}
                        </p>
                      ))}
                    </div>

                    {isConfirming ? (
                      <div className="animate-rise mt-2 grid gap-1.5">
                        <Button size="sm" tone="primary" onClick={() => apply(template.id, true)}>
                          Restyle, keep my content
                        </Button>
                        <Button size="sm" onClick={() => apply(template.id, false)}>
                          Start fresh from this template
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </PanelSection>
        );
      })}

      <PanelSection title="How this works">
        <EmptyHint>
          Restyling keeps your sections, questions, tables and images, and swaps
          the page size, fonts, masthead and header/footer for the new
          template&apos;s. Anything you placed by hand stays where it is.
        </EmptyHint>
      </PanelSection>
    </div>
  );
}

/**
 * Blocks that belong to the teacher rather than to the template. Template
 * furniture - mastheads, instruction boxes, closing lines - is regenerated, so
 * carrying it across would duplicate it.
 */
function contentBlocks(doc: { flow: import('@/lib/model/types').Block[] }) {
  const meaningful = doc.flow.filter(
    (block) =>
      block.type === 'question' ||
      block.type === 'section' ||
      block.type === 'list' ||
      block.type === 'checklist' ||
      block.type === 'table' ||
      block.type === 'image' ||
      block.type === 'answerLines' ||
      (block.type === 'heading' && block.level > 1) ||
      (block.type === 'paragraph' && !block.style?.border),
  );
  // A document that is only furniture should not come back empty-handed.
  return meaningful.length ? meaningful : doc.flow;
}
