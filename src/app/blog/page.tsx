import type { Metadata } from 'next';
import Link from 'next/link';
import { allPosts } from '@/lib/blog';
import { TOPICS, type Topic } from '@/lib/blog/types';
import { SitePage } from '@/components/site/SiteChrome';
import { absolute } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Guides for teachers on papers and worksheets',
  description:
    'Practical guides on question paper format, worksheet layout, margins, printing and school documents, written for teachers who make their own materials.',
  alternates: { canonical: absolute('/blog') },
};

const ORDER: Topic[] = ['exams', 'worksheets', 'formatting', 'printing', 'admin'];

export default function BlogIndex() {
  const posts = allPosts();
  const [lead, ...rest] = posts;

  return (
    <SitePage>
      <div className="mx-auto max-w-[1080px] px-5 pt-12 pb-4 sm:px-7 sm:pt-16">
        <p className="text-[12px] font-semibold tracking-[0.1em] text-forge-accent uppercase">
          Guides
        </p>
        <h1 className="mt-3 max-w-[19ch] font-serif text-[34px] leading-[1.1] font-semibold text-forge-ink sm:text-[46px]">
          Making school documents that work on paper
        </h1>
        <p className="mt-4 max-w-[62ch] text-[16px] leading-relaxed text-forge-ink-soft sm:text-[17px]">
          Question papers, worksheets, notices and mark sheets are read under time pressure and
          printed on tired machines. These are notes on getting them right, written for the person
          who has to set the paper by Friday.
        </p>

        {/* The topics double as a legend for the tint each card carries, so a
            reader learns the colour before meeting it on a card below. */}
        <ul className="mt-8 flex flex-wrap gap-2">
          {ORDER.map((topic) => (
            <li
              key={topic}
              className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium ${TOPICS[topic].wash} ${TOPICS[topic].hue}`}
            >
              {TOPICS[topic].label}
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-auto max-w-[1080px] px-5 pb-6 sm:px-7">
        {lead ? <LeadCard slug={lead.slug} /> : null}

        <div className="mt-5 grid gap-4 sm:mt-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col rounded-xl border border-forge-line bg-forge-paper/85 p-5 transition-all hover:-translate-y-0.5 hover:border-forge-accent/35 hover:shadow-[0_10px_28px_-14px_rgba(40,30,20,0.28)]"
            >
              <span
                className={`self-start rounded-full px-2.5 py-1 text-[11.5px] font-medium ${TOPICS[post.topic].wash} ${TOPICS[post.topic].hue}`}
              >
                {TOPICS[post.topic].label}
              </span>
              <h2 className="mt-3 font-serif text-[19px] leading-snug font-semibold text-forge-ink group-hover:text-forge-accent">
                {post.title}
              </h2>
              <p className="mt-2 flex-1 text-[14px] leading-relaxed text-forge-ink-soft">
                {post.summary}
              </p>
              <span className="mt-4 text-[12px] text-forge-muted">
                {post.readingMinutes} min read
              </span>
            </Link>
          ))}
        </div>
      </div>
    </SitePage>
  );
}

function LeadCard({ slug }: { slug: string }) {
  const post = allPosts().find((candidate) => candidate.slug === slug);
  if (!post) return null;

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group mt-2 flex flex-col gap-4 rounded-2xl border border-forge-line bg-forge-paper/90 p-6 transition-all hover:-translate-y-0.5 hover:border-forge-accent/35 hover:shadow-[0_14px_36px_-16px_rgba(40,30,20,0.3)] sm:p-8 lg:flex-row lg:items-center lg:gap-10"
    >
      <div className="min-w-0 flex-1">
        <span
          className={`inline-block rounded-full px-2.5 py-1 text-[11.5px] font-medium ${TOPICS[post.topic].wash} ${TOPICS[post.topic].hue}`}
        >
          Latest · {TOPICS[post.topic].label}
        </span>
        <h2 className="mt-3.5 max-w-[24ch] font-serif text-[26px] leading-tight font-semibold text-forge-ink group-hover:text-forge-accent sm:text-[31px]">
          {post.title}
        </h2>
        <p className="mt-3 max-w-[58ch] text-[15.5px] leading-relaxed text-forge-ink-soft">
          {post.summary}
        </p>
        <span className="mt-4 inline-block text-[12.5px] text-forge-muted">
          {post.readingMinutes} min read
        </span>
      </div>
    </Link>
  );
}
