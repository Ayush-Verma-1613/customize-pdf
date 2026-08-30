'use client';

import { motion } from 'framer-motion';
import {
  Award,
  Check,
  ClipboardList,
  FileSpreadsheet,
  FileStack,
  FileText,
  IdCard,
  Megaphone,
  NotebookPen,
  Receipt,
  ScrollText,
  Table2,
} from 'lucide-react';
import type { TemplateDef } from '@/lib/templates';
import { cx } from '@/lib/utils/cx';
import { Badge } from '../ui/Badge';

/**
 * A glyph per document. Anything without one falls back to a plain page rather
 * than disappearing, so adding a template never means editing this file.
 */
const ICONS: Record<string, React.ReactNode> = {
  'question-paper-classic': <FileText size={19} />,
  'question-paper-modern': <FileSpreadsheet size={19} />,
  'exam-booklet': <FileStack size={19} />,
  worksheet: <NotebookPen size={19} />,
  assignment: <ClipboardList size={19} />,
  'answer-sheet': <ScrollText size={19} />,
  notice: <Megaphone size={19} />,
  certificate: <Award size={19} />,
  form: <Table2 size={19} />,
  report: <FileText size={19} />,
  invoice: <Receipt size={19} />,
  resume: <IdCard size={19} />,
  blank: <FileText size={19} />,
};

export function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: TemplateDef;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.995 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className={cx(
        'relative w-full rounded-[14px] border p-3 text-left transition-colors duration-200',
        selected
          ? 'border-forge-accent bg-[#FFF6EE] shadow-[0_2px_10px_-4px_rgba(201,95,24,0.28)]'
          : 'border-forge-line bg-white hover:border-[#DCD6CC] hover:shadow-[0_4px_14px_-8px_rgba(40,30,20,0.22)]',
      )}
    >
      <div className="flex gap-3">
        <span
          className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[11px]"
          style={{ backgroundColor: `${template.accent}1F`, color: template.accent }}
        >
          {ICONS[template.id] ?? <FileText size={19} />}
        </span>

        <div className="min-w-0 flex-1 pr-5">
          <h3
            className={cx(
              'text-[14px] leading-tight font-semibold',
              selected ? 'text-forge-accent' : 'text-forge-ink',
            )}
          >
            {template.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-[12.5px] leading-[1.45] text-forge-ink-soft">
            {template.description}
          </p>
          <span className="mt-2 inline-block">
            <Badge accent={template.accent}>{template.badge}</Badge>
          </span>
        </div>
      </div>

      {selected ? (
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 26 }}
          className="absolute top-3 right-3 flex h-[21px] w-[21px] items-center justify-center rounded-full bg-forge-accent text-white"
        >
          <Check size={13} strokeWidth={3} />
        </motion.span>
      ) : null}
    </motion.button>
  );
}
