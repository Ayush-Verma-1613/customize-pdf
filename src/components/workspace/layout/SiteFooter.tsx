'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, FileText, ListChecks, ShieldCheck } from 'lucide-react';

/**
 * The footer at the end of the page.
 *
 * It is not pinned to the screen: it sits at the bottom of the scrolling
 * region, so it arrives when somebody has finished looking at their document
 * rather than taking a strip of every screen. Nothing here is an action - the
 * one action lives beside the fields it acts on, in the details panel.
 *
 * The hint strip is the live part and stays at the top of it, because it is
 * about the step somebody is on right now. Everything under the rule is the
 * standing description of the product: what it makes, how it is driven, and
 * where the documents actually live. That last column is the one that earns
 * its place - "no account" and "nothing is uploaded" sound like reassurance
 * until the day site data is cleared, so the footer says the awkward half too.
 *
 * Every column is tinted by what it is about rather than by one house colour:
 * amber for the things you can make, indigo for the way you drive it, green
 * for the state of your work.
 */

const HINT: Record<number, string> = {
  1: 'Pick the kind of document you are making.',
  2: 'The school, subject, marks — and your questions.',
  3: 'Page size, fonts, numbering and marks.',
  4: 'Happy with it? Create it and carry on in the editor.',
};

const MAKES = [
  'Question papers, exam booklets and answer sheets',
  'Worksheets and assignments',
  'Notices, certificates and forms',
  'Reports, invoices and a CV in three layouts',
];

const DRIVES = [
  'Numbered lines become numbered questions',
  '“Section A” starts a section, [2] sets the marks',
  'Import .docx, .pdf, .txt, .md, .html or an image',
  'Export a PDF that prints as the screen showed it',
];

const KEEPS = [
  'No account, no sign-in, nothing uploaded',
  'Documents are stored in this browser only',
  'Clearing site data deletes them for good',
  'Export a PDF or save a copy to keep them',
];

export function SiteFooter({ step, templateName }: { step: number; templateName: string }) {
  return (
    /* A scrim over the bar's own translucency. One line of hint could sit on
       the decorated ground and stay perfectly readable; four columns of small
       type cannot, and a leaf behind the copyright line is the kind of detail
       that reads as a bug. Still short of opaque, so the ground is dimmed
       rather than painted out. */
    <div className="bg-white/45 px-4 pt-3.5 pb-5 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="min-w-0 flex-1 text-[12.5px] text-forge-ink-soft"
          >
            {step > 1 ? (
              <span className="mr-1.5 inline-flex items-center gap-1 rounded-md bg-[#FBE4CF] px-1.5 py-0.5 text-[11.5px] font-medium text-[#B0541A]">
                <Check size={11} strokeWidth={3} />
                {templateName}
              </span>
            ) : null}
            {HINT[step]}
          </motion.p>
        </AnimatePresence>

        <p className="flex items-center gap-1.5 text-[11.5px] whitespace-nowrap text-forge-muted">
          <ShieldCheck size={13} className="shrink-0 text-forge-green" />
          Everything stays in this browser
        </p>
      </div>

      <div className="mt-4 border-t border-forge-line pt-5">
        <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="min-w-0">
            <span className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt=""
                width={128}
                height={128}
                className="h-[22px] w-[22px] shrink-0"
              />
              <span className="font-serif text-[17px] leading-none font-semibold text-forge-ink">
                Docraft
              </span>
            </span>
            <p className="mt-2.5 max-w-[34ch] text-[12.5px] leading-relaxed text-forge-ink-soft">
              A document designer for teachers. Paste your questions in as plain text, pick a
              template, and get a laid-out paper you can edit anywhere and print exactly as it
              looks here.
            </p>
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-forge-muted">
              Thirteen templates, five typefaces, real pagination — tables that split across
              pages and repeat their header, sections that renumber themselves.
            </p>
          </div>

          <FooterColumn
            icon={<FileText size={13} />}
            tint="text-forge-accent"
            title="What you can make"
            items={MAKES}
          />
          <FooterColumn
            icon={<ListChecks size={13} />}
            tint="text-text-hue"
            title="How it works"
            items={DRIVES}
          />
          <FooterColumn
            icon={<ShieldCheck size={13} />}
            tint="text-forge-green"
            title="Your documents"
            items={KEEPS}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-forge-line pt-3.5 text-[11.5px] text-forge-muted">
          <span>© {new Date().getFullYear()} Docraft</span>
          <span aria-hidden className="text-forge-line">
            ·
          </span>
          <span>Runs entirely in your browser</span>
          <span aria-hidden className="text-forge-line">
            ·
          </span>
          <span>No server, no account, no upload</span>
        </div>
      </div>
    </div>
  );
}

function FooterColumn({
  icon,
  tint,
  title,
  items,
}: {
  icon: React.ReactNode;
  tint: string;
  title: string;
  items: string[];
}) {
  return (
    <div className="min-w-0">
      <h2 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] text-forge-ink uppercase">
        <span className={`shrink-0 ${tint}`}>{icon}</span>
        {title}
      </h2>
      <ul className="mt-2.5 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-[12px] leading-relaxed text-forge-ink-soft">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
