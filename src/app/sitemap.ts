import type { MetadataRoute } from 'next';
import { allPosts } from '@/lib/blog';
import { SITE_URL } from '@/lib/site';
import { TEMPLATES } from '@/lib/templates';

/** Written out as sitemap.xml at build time, so it ships with the static export. */
/** Static export: the route has to be marked static so it is written to a file. */
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = allPosts();
  const latest = posts[0]?.published ?? new Date().toISOString().slice(0, 10);

  return [
    { url: SITE_URL, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE_URL}/workspace`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/blog`, lastModified: latest, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/about`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    // Each template opens its own prerendered page, and they are the pages a
    // search for "worksheet template" should be able to land on.
    ...TEMPLATES.map((template) => ({
      url: `${SITE_URL}/workspace/${template.id}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: post.updated ?? post.published,
      changeFrequency: 'yearly' as const,
      priority: 0.7,
    })),
  ];
}
