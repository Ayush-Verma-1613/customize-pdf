'use client';

import { useState } from 'react';
import {
  ChevronDown,
  FileUp,
  Hand,
  Keyboard,
  Layers,
  ListOrdered,
  MousePointerClick,
  Printer,
  ShieldCheck,
  Type,
} from 'lucide-react';
import { useCoarsePointer } from '@/lib/utils/useMedia';
import { cx } from '@/lib/utils/cx';
import { PanelSection } from '@/components/ui/primitives';

/**
 * How to use this. It is written for a teacher who has never opened a design
 * tool, so it explains the one idea the whole app rests on - flowing content
 * versus placed elements - before it lists any feature.
 */

const STEPS: { title: string; body: string }[] = [
  {
    title: 'Type or paste your content',
    body:
      'Open the Content tab and paste your questions in. Numbered lines become numbered questions, "Section A" starts a section, and "[2]" at the end of a line sets the marks.',
  },
  {
    title: 'Let it lay itself out',
    body:
      'Spacing, wrapping, question numbers and page breaks are worked out for you. Add a question in the middle and everything after it renumbers and reflows.',
  },
  {
    title: 'Change whatever you like',
    body:
      'Click anything on the page to open its settings on the right. Double-click text to type straight into it. Nothing is locked.',
  },
  {
    title: 'Check it, then export',
    body:
      'Switch to Preview to see it without the editing marks, then Export PDF. What you see is what prints — same fonts, same line breaks, same page count.',
  },
];

export function GuidePanel() {
  const coarse = useCoarsePointer();

  return (
    <div>
      <PanelSection title="How it works">
        <ol className="grid gap-2.5">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-semibold text-white">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-ink">{step.title}</span>
                <span className="mt-0.5 block text-[11.5px] leading-relaxed text-muted">
                  {step.body}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </PanelSection>

      <PanelSection title="The one idea to know">
        <div className="grid gap-2">
          <div className="rounded-xl border border-line bg-text-wash/50 p-2.5">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-text-hue">
              <Layers size={13} /> Content elements flow
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
              Headings, paragraphs, questions, lists, tables and images sit in a
              stream. They wrap, space themselves and spill onto the next page on
              their own. Move one and the rest close the gap.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-draw-wash/50 p-2.5">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-draw-hue">
              <MousePointerClick size={13} /> Drawn elements stay put
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
              Text boxes, shapes, lines, a school logo — these are pinned to one
              page at the exact spot you drop them. Use them for stamps, marks
              boxes and anything that must not move.
            </p>
          </div>
          <p className="text-[11px] leading-relaxed text-faint">
            Both kinds live in the same document and both export to the PDF. The
            colours in the Elements tab tell you which is which.
          </p>
        </div>
      </PanelSection>

      <Collapsible title="Paste shortcuts" icon={<ListOrdered size={14} />} defaultOpen>
        <dl className="grid gap-1.5">
          {[
            ['Subject: Science', 'Fills a heading field'],
            ['Section A', 'Starts a new section'],
            ['1. Your question [2]', 'A question worth 2 marks'],
            ['(a) A sub-part [1]', 'Sub-part of the question above'],
            ['a) An option', 'Multiple-choice option'],
            ['- A bullet', 'Bulleted list'],
            ['[ ] A tick box', 'Checkbox item'],
            ['| Cell | Cell |', 'A table row'],
            ['[[lines:4]]', 'Four ruled answer lines'],
            ['[[pagebreak]]', 'Start a new page here'],
            ['**bold** *italic*', 'Emphasis inside a line'],
            ['==highlight==', 'Highlighted text'],
          ].map(([pattern, meaning]) => (
            <div key={pattern} className="flex items-baseline gap-2">
              <dt className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-soft">
                {pattern}
              </dt>
              <dd className="min-w-0 flex-1 text-[11px] text-faint">{meaning}</dd>
            </div>
          ))}
        </dl>
      </Collapsible>

      <Collapsible
        title={coarse ? 'Touch gestures' : 'Mouse and keyboard'}
        icon={coarse ? <Hand size={14} /> : <Keyboard size={14} />}
      >
        <dl className="grid gap-1.5">
          {(coarse
            ? [
                ['Tap', 'Select an element'],
                ['Tap again, then drag', 'Move a drawn element'],
                ['Double-tap text', 'Type into it'],
                ['Pinch', 'Zoom the page in and out'],
                ['Swipe up and down', 'Move between pages'],
                ['Edit tab', 'Settings for whatever is selected'],
              ]
            : [
                ['Click', 'Select an element'],
                ['Double-click text', 'Type into it'],
                ['Drag', 'Move it — a flowing element changes its order'],
                ['Ctrl + Z / Ctrl + Shift + Z', 'Undo and redo'],
                ['Ctrl + D', 'Duplicate the selection'],
                ['Delete', 'Remove the selection'],
                ['Arrow keys', 'Nudge a drawn element by a point'],
                ['Shift + Arrow', 'Nudge by ten points'],
                ['Ctrl + scroll', 'Zoom'],
              ]
          ).map(([action, meaning]) => (
            <div key={action} className="flex items-baseline gap-2">
              <dt className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-medium text-ink-soft">
                {action}
              </dt>
              <dd className="min-w-0 flex-1 text-[11px] text-faint">{meaning}</dd>
            </div>
          ))}
        </dl>
      </Collapsible>

      <Collapsible title="Pages and printing" icon={<Printer size={14} />}>
        <ul className="grid gap-2 text-[11.5px] leading-relaxed text-muted">
          <li>
            <strong className="text-ink-soft">Pages come from your content.</strong>{' '}
            A new page appears when the current one fills up. To force one, select
            an element and choose <em>New page</em> under Page behaviour, or use
            Add page.
          </li>
          <li>
            <strong className="text-ink-soft">Deleting a page</strong> removes the
            elements that start on it, because the page is made of them.
          </li>
          <li>
            <strong className="text-ink-soft">Long tables</strong> continue onto
            the next page and repeat their header row.
          </li>
          <li>
            <strong className="text-ink-soft">Page size, margins, borders,
            headers and footers</strong> are all in the Document tab. A page
            border is off unless you turn it on.
          </li>
        </ul>
      </Collapsible>

      <Collapsible title="Typography" icon={<Type size={14} />}>
        <ul className="grid gap-2 text-[11.5px] leading-relaxed text-muted">
          <li>
            Change the font once in the Document tab and the whole paper follows.
            Anything you set on a single element overrides it.
          </li>
          <li>
            Five fonts are built in and travel inside the PDF, so the file looks
            the same on the school computer and at the print shop.
          </li>
          <li>
            Tinos matches Times New Roman, Arimo matches Arial and Cousine
            matches Courier New — safe choices if a colleague expects those.
          </li>
        </ul>
      </Collapsible>

      <Collapsible title="Opening files you already have" icon={<FileUp size={14} />}>
        <ul className="grid gap-2 text-[11.5px] leading-relaxed text-muted">
          <li>
            <strong className="text-ink-soft">Import</strong> on the home screen
            opens a Word file (.docx), a PDF, a text file, a web page or a
            Paperforge document.
          </li>
          <li>
            A Word file keeps its headings, lists and tables. A PDF gives up its
            text, which is then re-numbered and re-flowed — worth a read-through
            before you print it.
          </li>
          <li>
            A PDF that Paperforge made comes back <em>exactly</em> as it was:
            the editable document travels inside the file.
          </li>
          <li>
            Anything that looks like a question paper — numbered lines, sections,
            marks in brackets — lands in the question paper layout automatically.
          </li>
        </ul>
      </Collapsible>

      <Collapsible title="Where your work is kept" icon={<ShieldCheck size={14} />}>
        <ul className="grid gap-2 text-[11.5px] leading-relaxed text-muted">
          <li>
            Everything is saved in this browser on this device. Nothing is
            uploaded anywhere and it keeps working with no internet connection.
          </li>
          <li>
            That also means it does not follow you to another computer. To move a
            document, use the download button next to Export PDF to save the
            editable file, then import it on the other machine.
          </li>
          <li>
            Exported PDFs carry the editable document inside them as an
            attachment, so a PDF you sent yourself can be reopened later.
          </li>
          <li>
            Clearing your browser data will delete saved documents — export
            anything you need to keep.
          </li>
        </ul>
      </Collapsible>
    </div>
  );
}

function Collapsible({
  title,
  icon,
  defaultOpen,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <section className="border-b border-line-soft last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3.5 py-3 text-left"
      >
        <span className="text-muted">{icon}</span>
        <span className="flex-1 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
          {title}
        </span>
        <ChevronDown
          size={14}
          className={cx('text-faint transition-transform', open && 'rotate-180')}
        />
      </button>
      {open ? <div className="px-3.5 pb-3.5">{children}</div> : null}
    </section>
  );
}
