'use client';

import { ArrowLeft, ArrowRight, FileText, LayoutGrid, ListOrdered, Palette, Settings2 } from 'lucide-react';
import type { NumberingConfig, PageSetup, PaperDoc, Theme } from '@/lib/model/types';
import type { TemplateDef } from '@/lib/templates';
import type { SettingsSectionId } from '@/types/document';
import { Button } from '../ui/Button';
import { Panel, PanelHeading } from '../ui/Card';
import { AppearanceSettings, LayoutSettings, QuestionSettings } from './DocumentSettings';
import { InspirationCard } from './InspirationCard';
import { SettingsAccordion } from './SettingsAccordion';
import { TemplateFields } from './TemplateFields';

export interface SettingsPanelProps {
  template: TemplateDef;
  doc: PaperDoc;
  title: string;
  onTitleChange: (value: string) => void;
  fields: Record<string, string>;
  onFieldChange: (key: string, value: string) => void;
  onPage: (patch: Partial<PageSetup>) => void;
  onTheme: (patch: Partial<Theme>) => void;
  onNumbering: (patch: Partial<NumberingConfig>) => void;
  open: SettingsSectionId[];
  onToggle: (id: SettingsSectionId) => void;
  onCollapseAll: () => void;
  /** The step being worked on, so the way back is only offered when there is one. */
  step: number;
  onBack: () => void;
  onCreate: () => void;
  busy: boolean;
  /** The words the teacher pastes in, parsed into real questions. */
  content: string;
  onContentChange: (value: string) => void;
  onInspiration: () => void;
}

export function SettingsPanel({
  template,
  doc,
  title,
  onTitleChange,
  fields,
  onFieldChange,
  onPage,
  onTheme,
  onNumbering,
  open,
  onToggle,
  onCollapseAll,
  step,
  onBack,
  onCreate,
  busy,
  content,
  onContentChange,
  onInspiration,
}: SettingsPanelProps) {
  const isOpen = (id: SettingsSectionId) => open.includes(id);

  return (
    <Panel hug className="overflow-hidden">
      <PanelHeading
        icon={<Settings2 size={15} />}
        title="Document details"
        action={
          open.length ? (
            <button
              type="button"
              onClick={onCollapseAll}
              className="rounded-md px-1.5 py-1 text-[12.5px] font-medium text-forge-accent transition-colors hover:bg-forge-wash"
            >
              Collapse all
            </button>
          ) : null
        }
      />

      <div className="forge-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 pb-4">
        <SettingsAccordion
          icon={<FileText size={15} />}
          tint="bg-[#DEEAFB] text-[#2C6BC4]"
          title="Document Information"
          subtitle={template.fields.map((f) => f.label).slice(0, 3).join(', ') || 'Name and title'}
          open={isOpen('information')}
          onToggle={() => onToggle('information')}
        >
          <TemplateFields
            template={template}
            title={title}
            onTitleChange={onTitleChange}
            values={fields}
            onChange={onFieldChange}
          />

          {template.acceptsContent ? (
            <div className="px-3.5 pb-4">
              <label className="block">
                <span className="mb-1.5 block text-[11.5px] font-medium text-forge-ink-soft">
                  Your content
                </span>
                <textarea
                  value={content}
                  onChange={(event) => onContentChange(event.target.value)}
                  rows={5}
                  placeholder={'Section A\n1. What is photosynthesis? [2]\n   (a) Explain briefly'}
                  aria-label="Your content"
                  className="w-full resize-y rounded-[10px] border border-forge-field bg-white px-3 py-2.5 font-mono text-[12px] leading-relaxed text-forge-ink placeholder:text-forge-muted focus:border-forge-accent focus:ring-[3px] focus:ring-forge-accent/12 focus:outline-none"
                />
              </label>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-forge-muted">
                Numbered lines become numbered questions, <span className="font-medium">Section A</span>{' '}
                starts a section, and <span className="font-medium">[2]</span> sets the marks.
              </p>
            </div>
          ) : null}
        </SettingsAccordion>

        <SettingsAccordion
          icon={<LayoutGrid size={15} />}
          tint="bg-[#DEEAFB] text-[#2C6BC4]"
          title="Layout & Structure"
          subtitle="Margins, spacing, page size"
          open={isOpen('layout')}
          onToggle={() => onToggle('layout')}
        >
          <LayoutSettings page={doc.page} onChange={onPage} />
        </SettingsAccordion>

        <SettingsAccordion
          icon={<Palette size={15} />}
          tint="bg-[#E7E3FB] text-[#6B54C7]"
          title="Appearance"
          subtitle="Fonts, colors, borders"
          open={isOpen('appearance')}
          onToggle={() => onToggle('appearance')}
        >
          <AppearanceSettings
            theme={doc.theme}
            page={doc.page}
            onTheme={onTheme}
            onPage={onPage}
          />
        </SettingsAccordion>

        <SettingsAccordion
          icon={<ListOrdered size={15} />}
          tint="bg-[#FBE4CF] text-[#B0541A]"
          title="Question Settings"
          subtitle="Numbering, options, marks"
          open={isOpen('questions')}
          onToggle={() => onToggle('questions')}
        >
          <QuestionSettings numbering={doc.numbering} onChange={onNumbering} />
        </SettingsAccordion>

        <InspirationCard onOpen={onInspiration} />
      </div>

      {/* The finishing action belongs with the details it acts on, pinned to
          the foot of this panel rather than to the screen - so it is in view
          while the fields above it are being filled in. */}
      <div className="shrink-0 border-t border-forge-line bg-white/70 px-4 py-3">
        <div className="flex items-center gap-2">
          {step > 1 ? (
            <span className="contents">
              <Button
                iconOnly
                variant="ghost"
                icon={<ArrowLeft size={15} />}
                onClick={onBack}
                ariaLabel="Back a step"
              />
            </span>
          ) : null}
          <Button
            variant="dark"
            icon={<ArrowRight size={15} />}
            onClick={onCreate}
            className="flex-1"
          >
            {busy ? 'Working…' : 'Create the document'}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
