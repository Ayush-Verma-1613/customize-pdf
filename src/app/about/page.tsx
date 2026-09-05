import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, Server, Wallet } from 'lucide-react';
import { SitePage } from '@/components/site/SiteChrome';
import { Markdown } from '@/lib/blog/markdown';
import { absolute, CONTACT_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Docraft is a document designer for teachers. It runs entirely in your browser, keeps documents on your own machine, and exports PDFs that print exactly as the screen showed them.',
  alternates: { canonical: absolute('/about') },
};

const BODY = `
## What Docraft is

Docraft lays out school documents. You paste your content in as plain text, choose a template, and it produces a print-ready multi-page document you can edit and export as a PDF.

It was built for a specific job: a teacher writing a question paper on a Thursday evening for an exam on Monday, using whichever computer is free, printing on a machine shared by the whole staffroom.

Most of the design follows from that. Numbering that fixes itself when you reorder questions, because papers get reordered late. Fonts embedded in the exported PDF, because the print shop will not have your fonts. Tables that split across pages and repeat their header, because mark sheets are longer than one page.

## Why it runs in your browser

Docraft has no server, no account and no sign-in. Your documents are stored by your browser, on your own machine, and nothing is uploaded.

That is a real design decision with a real cost, and it is worth stating both halves.

The benefit is that student names, marks and unreleased question papers never leave your computer. There is no database of school documents to be breached, because there is no database. There is nothing to sign into and no password to lose.

The cost is that your documents live in one browser on one machine. They do not sync to your phone. If you clear your site data, they are gone. If your laptop dies, they die with it.

The way to keep a document permanently is to export the PDF, or save a copy of the file. Docraft says this in the app rather than hiding it, because "nothing is uploaded" sounds purely like reassurance until the day someone clears their browsing data.

## What it costs

Nothing. There is no paid tier at the moment and no account to create.

The guides on this site carry advertising, which is what pays for the domain and the hosting. The editor itself does not carry ads, and it will not: a page where somebody is concentrating on a document is not a page to put advertising on.

## Who makes it

Docraft is built and maintained by one developer. It is not a company, and there is no support desk. Bugs and suggestions reach a person directly, which means replies are slower than a helpdesk and more useful than one.

If something is broken, or a template does not fit the way your school does things, write in. The templates that exist came from exactly those messages.
`;

const PILLARS = [
  {
    icon: <FileText size={16} />,
    tint: 'text-forge-accent',
    wash: 'bg-forge-wash',
    title: 'Built for paper',
    body: 'Real pagination, embedded fonts, tables that repeat their header. What you approve is what prints.',
  },
  {
    icon: <Server size={16} />,
    tint: 'text-forge-green',
    wash: 'bg-success-wash',
    title: 'No server, no account',
    body: 'Documents are stored by your browser on your own machine. Nothing is uploaded anywhere.',
  },
  {
    icon: <Wallet size={16} />,
    tint: 'text-text-hue',
    wash: 'bg-text-wash',
    title: 'Free to use',
    body: 'No paid tier and no sign-up. The guides carry advertising; the editor does not.',
  },
];

export default function AboutPage() {
  return (
    <SitePage>
      <div className="mx-auto max-w-[720px] px-5 pt-12 sm:px-7 sm:pt-16">
        <p className="text-[12px] font-semibold tracking-[0.1em] text-forge-accent uppercase">
          About
        </p>
        <h1 className="mt-3 font-serif text-[34px] leading-[1.12] font-semibold text-forge-ink sm:text-[42px]">
          A document designer for teachers
        </h1>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {PILLARS.map((pillar) => (
            <div key={pillar.title} className="rounded-xl border border-forge-line bg-forge-paper/85 p-4">
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${pillar.wash} ${pillar.tint}`}
              >
                {pillar.icon}
              </span>
              <h2 className="mt-3 text-[14.5px] font-semibold text-forge-ink">{pillar.title}</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-forge-ink-soft">{pillar.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <Markdown>{BODY}</Markdown>
        </div>

        <div className="mt-10 mb-4 flex flex-wrap gap-3">
          <Link
            href="/workspace"
            className="rounded-lg bg-forge-accent px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-forge-accent-soft"
          >
            Open the editor
          </Link>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="rounded-lg border border-forge-line bg-forge-paper px-4 py-2.5 text-[14px] font-semibold text-forge-ink transition-colors hover:border-forge-accent/40"
          >
            Write in
          </a>
        </div>
      </div>
    </SitePage>
  );
}
