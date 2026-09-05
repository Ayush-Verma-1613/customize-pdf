import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/** Static export: the route has to be marked static so it is written to a file. */
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The editor shell is one prerendered page standing in for every
      // document. There is nothing there for a crawler, and the ids in the
      // paths are private to whoever created them.
      disallow: '/editor/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
