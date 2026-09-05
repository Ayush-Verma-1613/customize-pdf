import type { Metadata } from 'next';
import { Bug, Lightbulb, Mail, ShieldQuestion } from 'lucide-react';
import { SitePage } from '@/components/site/SiteChrome';
import { absolute, CONTACT_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'How to reach the person who builds Docraft: bug reports, template requests, privacy questions and everything else.',
  alternates: { canonical: absolute('/contact') },
};

const REASONS = [
  {
    icon: <Bug size={16} />,
    tint: 'text-draw-hue',
    wash: 'bg-draw-wash',
    title: 'Something is broken',
    body: 'Tell us what you did, what happened, and which browser you were in. If a document laid out wrongly, a screenshot of the preview helps more than a description.',
    note: 'We cannot see your documents, so we do need you to describe it.',
  },
  {
    icon: <Lightbulb size={16} />,
    tint: 'text-structure-hue',
    wash: 'bg-structure-wash',
    title: 'A template does not fit',
    body: 'Schools format papers differently and the templates came from teachers describing what theirs looks like. Send a photo or scan of the format you need.',
    note: 'This is the most useful kind of message we get.',
  },
  {
    icon: <ShieldQuestion size={16} />,
    tint: 'text-forge-green',
    wash: 'bg-success-wash',
    title: 'Privacy and data',
    body: 'Questions about what is stored, where, and what your school can rely on. Answered directly rather than by pointing at the policy.',
    note: 'Usually a short answer: it stays in your browser.',
  },
];

export default function ContactPage() {
  return (
    <SitePage>
      <div className="mx-auto max-w-[720px] px-5 pt-12 pb-6 sm:px-7 sm:pt-16">
        <p className="text-[12px] font-semibold tracking-[0.1em] text-forge-accent uppercase">
          Contact
        </p>
        <h1 className="mt-3 font-serif text-[34px] leading-[1.12] font-semibold text-forge-ink sm:text-[42px]">
          Write in
        </h1>
        <p className="mt-4 max-w-[58ch] text-[16.5px] leading-relaxed text-forge-ink-soft">
          Docraft is built by one person, so messages reach a developer rather than a support queue.
          That means replies take a day or two and are usually more useful than a helpdesk reply.
        </p>

        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="mt-7 flex items-center gap-3.5 rounded-xl border border-forge-accent/30 bg-forge-wash/70 p-5 transition-colors hover:border-forge-accent/55"
        >
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-forge-accent text-white">
            <Mail size={18} />
          </span>
          <span className="min-w-0">
            <span className="block text-[12px] font-semibold tracking-[0.08em] text-forge-ink-soft uppercase">
              Email
            </span>
            <span className="mt-0.5 block truncate font-serif text-[20px] font-semibold text-forge-ink sm:text-[23px]">
              {CONTACT_EMAIL}
            </span>
          </span>
        </a>

        <h2 className="mt-11 font-serif text-[24px] font-semibold text-forge-ink">
          What to include
        </h2>
        <p className="mt-2 max-w-[58ch] text-[15.5px] leading-relaxed text-forge-ink-soft">
          Anything is welcome, but these three arrive most often and each is easier to act on with a
          little detail.
        </p>

        <div className="mt-5 space-y-3">
          {REASONS.map((reason) => (
            <div
              key={reason.title}
              className="rounded-xl border border-forge-line bg-forge-paper/85 p-5"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${reason.wash} ${reason.tint}`}
                >
                  {reason.icon}
                </span>
                <h3 className="text-[15.5px] font-semibold text-forge-ink">{reason.title}</h3>
              </div>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-forge-ink-soft">
                {reason.body}
              </p>
              <p className="mt-2 text-[13px] text-forge-muted italic">{reason.note}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-11 font-serif text-[24px] font-semibold text-forge-ink">
          Before you write about a lost document
        </h2>
        <p className="mt-2 max-w-[58ch] text-[15.5px] leading-relaxed text-forge-ink-soft">
          Docraft keeps documents in your browser and has no copy of them, so a document lost to
          cleared site data cannot be recovered by us or by anyone. It is worth checking whether you
          have the exported PDF, or whether you were working in a different browser or a private
          window, because those are the two cases where the document is usually still somewhere.
        </p>
      </div>
    </SitePage>
  );
}
