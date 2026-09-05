/**
 * The canonical origin. Metadata, the sitemap and robots.txt all need an
 * absolute URL, and a static export has no request to read the host from, so
 * it is set at build time and falls back to the production domain.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://docraft.app'
).replace(/\/$/, '');

export const SITE_NAME = 'Docraft';

export const SITE_TAGLINE = 'Question papers and documents, formatted for you';

/** Where readers reach a person. Used by the contact page and the metadata. */
export const CONTACT_EMAIL = 'hello@docraft.app';

export const absolute = (path: string) => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
