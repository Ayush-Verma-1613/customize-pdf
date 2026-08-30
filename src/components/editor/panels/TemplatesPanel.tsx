'use client';

import { useState } from 'react';
import { Check, Layers } from 'lucide-react';
import { activeVariant, TEMPLATE_CATEGORIES, TEMPLATES } from '@/lib/templates';
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

  const apply = (templateId: string, keepContent: boolean, variantId?: string) => {
    store.getState().applyTemplate(templateId, keepContent, variantId);
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
                      active ? 'border-question-hue/50 bg-question-wash/30' : 'border-line hover:border-[#dcd6cc]',
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

                    <div className="mt-2 rounded-lg bg-[#f8f5ef] px-2.5 py-2">
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

                    {/* A template can arrange its body more than one way. Swapping
                        the arrangement keeps the words, so trying one costs nothing. */}
                    {template.variants?.length ? (
                      <div className="mt-2">
                        <p className="mb-1 text-[10px] font-semibold tracking-[0.08em] text-faint uppercase">
                          Body layout
                        </p>
                        <div className="grid gap-1">
                          {template.variants.map((variant) => {
                            const inUse = active && activeVariant(doc) === variant.id;
                            return (
                              <button
                                key={variant.id}
                                type="button"
                                onClick={() =>
                                  // Swapping the layout of the design already in
                                  // use keeps the fonts and margins; picking a
                                  // layout of a different template restyles.
                                  active
                                    ? store.getState().applyVariant(variant.id)
                                    : apply(template.id, true, variant.id)
                                }
                                className={cx(
                                  'flex items-start gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors',
                                  inUse
                                    ? 'border-question-hue/50 bg-question-wash/40'
                                    : 'border-line hover:border-[#dcd6cc] hover:bg-[#f8f5ef]',
                                )}
                              >
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center gap-1.5">
                                    <span className="truncate text-[12px] font-medium text-ink">
                                      {variant.name}
                                    </span>
                                    {inUse ? (
                                      <Check size={12} className="shrink-0 text-question-hue" />
                                    ) : null}
                                  </span>
                                  <span className="mt-0.5 block text-[11px] leading-relaxed text-faint">
                                    {variant.description}
                                  </span>
                                  <span className="mt-1 block truncate font-mono text-[10px] text-faint">
                                    {variant.preview.join('  ·  ')}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

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
          template&apos;s. Anything you placed by hand stays where it is. Where a
          template offers more than one body layout, switching between them keeps
          your content too.
        </EmptyHint>
      </PanelSection>
    </div>
  );
}

