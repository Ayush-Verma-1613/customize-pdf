import { ImageResponse } from 'next/og';
import { postBySlug, postSlugs } from '@/lib/blog';
import { TOPICS } from '@/lib/blog/types';
import { OG_SIZE, OgCard, ogFonts } from '@/components/site/og-card';

export const dynamic = 'force-static';
export const alt = 'Docraft';
export const size = OG_SIZE;
export const contentType = 'image/png';

export function generateStaticParams() {
  return postSlugs().map((slug) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = postBySlug(slug);
  const topic = post ? TOPICS[post.topic] : null;

  return new ImageResponse(
    (
      <OgCard
        label={topic?.label ?? 'Guides'}
        title={post?.title ?? 'Guides for teachers'}
        hex={topic?.hex ?? '#c95f18'}
      />
    ),
    { ...size, fonts: await ogFonts() },
  );
}
