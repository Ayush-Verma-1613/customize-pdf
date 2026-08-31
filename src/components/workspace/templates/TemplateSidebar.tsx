'use client';

import { motion } from 'framer-motion';
import { FileText, Plus } from 'lucide-react';
import { TEMPLATES, TEMPLATE_CATEGORIES } from '@/lib/templates';
import { Panel, PanelHeading } from '../ui/Card';
import { TemplateCard } from './TemplateCard';
import { TemplateSearch } from './TemplateSearch';

/**
 * Resume leads the list here, ahead of the teaching drawer it used to sit
 * behind. Derived from the shared list rather than spelled out again, so a new
 * category cannot go missing from this panel by being added in one place only.
 */
const CATEGORY_ORDER: readonly (typeof TEMPLATE_CATEGORIES)[number][] = [
  'Personal',
  ...TEMPLATE_CATEGORIES.filter((category) => category !== 'Personal'),
];

export function TemplateSidebar({
  selectedId,
  onSelect,
  query,
  onQueryChange,
  onBlank,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
  onBlank: () => void;
}) {
  const needle = query.trim().toLowerCase();
  const matches = TEMPLATES.filter(
    (template) =>
      template.id !== 'blank' &&
      (!needle ||
        `${template.name} ${template.description} ${template.badge} ${template.category}`
          .toLowerCase()
          .includes(needle)),
  );

  return (
    <Panel hug className="overflow-hidden">
      <PanelHeading icon={<FileText size={15} />} title="Choose a document" />
      <TemplateSearch value={query} onChange={onQueryChange} />

      <div className="forge-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-2">
        {CATEGORY_ORDER.map((category) => {
          const inCategory = matches.filter((t) => t.category === category);
          if (!inCategory.length) return null;
          return (
            <section key={category} className="mb-3 last:mb-0">
              <h3 className="mb-2 px-0.5 text-[10.5px] font-semibold tracking-[0.09em] text-forge-muted uppercase">
                {category}
              </h3>
              <div className="space-y-2.5">
                {inCategory.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    selected={template.id === selectedId}
                    onSelect={() => onSelect(template.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {matches.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-forge-line px-3 py-8 text-center text-[13px] text-forge-muted">
            No template matches “{query.trim()}”.
          </p>
        ) : null}
      </div>

      <div className="shrink-0 px-4 pt-2 pb-4">
        <motion.button
          type="button"
          onClick={onBlank}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.995 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="flex w-full items-center gap-3 rounded-[14px] border border-[#F0DCC8] bg-[#FDF6EF] p-3 text-left transition-colors hover:bg-[#FCF0E4]"
        >
          <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-[#EED6BE] bg-white text-forge-accent">
            <Plus size={16} />
          </span>
          <span className="min-w-0">
            <span className="block text-[13.5px] font-semibold text-forge-ink">
              Create Custom Template
            </span>
            <span className="block text-[12px] text-forge-ink-soft">Start from scratch</span>
          </span>
        </motion.button>
      </div>
    </Panel>
  );
}
