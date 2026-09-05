import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { postBySlug, postSlugs, relatedPosts } from '@/lib/blog';
import { TOPICS } from '@/lib/blog/types';
import { Markdown } from '@/lib/blog/markdown';
import { SitePage } from '@/components/site/SiteChrome';
import { absolute, SITE_NAME } from '@/lib/site';

export function generateStaticParams() {
  return postSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) return {};

  const url = absolute(`/blog/${post.slug}`);

  return {
    // The headline is written to be read on the page; the SERP gets a shorter
    // one, because Google cuts a title off at around sixty characters.
    title: post.seoTitle ?? post.title,
    description: post.summary,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.summary,
      url,
      siteName: SITE_NAME,
      publishedTime: post.published,
      modifiedTime: post.updated ?? post.published,
    },
  };
}

const readableDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) notFound();

  const topic = TOPICS[post.topic];
  const related = relatedPosts(post);

  /* Article structured data. Search engines use it to show the date and
     headline; it is also part of what an ad network looks at when deciding
     whether a page is an article or a landing page. */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.summary,
    datePublished: post.published,
    dateModified: post.updated ?? post.published,
    author: { '@type': 'Organization', name: SITE_NAME },
    publisher: { '@type': 'Organization', name: SITE_NAME },
    mainEntityOfPage: absolute(`/blog/${post.slug}`),
  };

  return (
    <SitePage>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-[720px] px-5 pt-10 sm:px-7 sm:pt-14">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-forge-muted transition-colors hover:text-forge-ink"
        >
          <ArrowLeft size={14} />
          All guides
        </Link>

        <header className="mt-6 border-b border-forge-line pb-7">
          <span
            className={`inline-block rounded-full px-2.5 py-1 text-[11.5px] font-medium ${topic.wash} ${topic.hue}`}
          >
            {topic.label}
          </span>
          <h1 className="mt-3.5 font-serif text-[31px] leading-[1.15] font-semibold text-forge-ink sm:text-[40px]">
            {post.title}
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed text-forge-ink-soft sm:text-[18px]">
            {post.summary}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-forge-muted">
            <time dateTime={post.published}>{readableDate(post.published)}</time>
            <span aria-hidden className="text-forge-line">·</span>
            <span>{post.readingMinutes} min read</span>
          </div>
        </header>

        <div className="pt-2">
          <Markdown>{post.body}</Markdown>
        </div>

        <aside className="mt-12 rounded-xl border border-forge-accent/25 bg-forge-wash/70 p-6">
          <h2 className="font-serif text-[20px] font-semibold text-forge-ink">
            Set your next paper in Docraft
          </h2>
          <p className="mt-2 max-w-[52ch] text-[14.5px] leading-relaxed text-forge-ink-soft">
            Paste your questions in as plain text, pick a template, and get a laid-out paper that
            numbers itself and exports a PDF that prints exactly as the screen showed it. No
            account, and nothing leaves your browser.
          </p>
          <Link
            href="/workspace"
            className="mt-4 inline-block rounded-lg bg-forge-accent px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-forge-accent-soft"
          >
            Open the editor
          </Link>
        </aside>
      </article>

      {related.length > 0 ? (
        <section className="mx-auto mt-14 max-w-[1080px] px-5 sm:px-7">
          <h2 className="text-[12px] font-semibold tracking-[0.1em] text-forge-muted uppercase">
            Read next
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {related.map((next) => (
              <Link
                key={next.slug}
                href={`/blog/${next.slug}`}
                className="group flex flex-col rounded-xl border border-forge-line bg-forge-paper/85 p-5 transition-all hover:-translate-y-0.5 hover:border-forge-accent/35"
              >
                <span
                  className={`self-start rounded-full px-2.5 py-1 text-[11.5px] font-medium ${TOPICS[next.topic].wash} ${TOPICS[next.topic].hue}`}
                >
                  {TOPICS[next.topic].label}
                </span>
                <h3 className="mt-3 font-serif text-[17.5px] leading-snug font-semibold text-forge-ink group-hover:text-forge-accent">
                  {next.title}
                </h3>
                <span className="mt-3 text-[12px] text-forge-muted">
                  {next.readingMinutes} min read
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </SitePage>
  );
}
