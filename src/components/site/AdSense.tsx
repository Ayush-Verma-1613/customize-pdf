import Script from 'next/script';

/**
 * The AdSense loader.
 *
 * It renders nothing at all until NEXT_PUBLIC_ADSENSE_CLIENT is set at build
 * time, so the site can ship, be indexed and be reviewed without carrying a
 * dead advertising script. Set the variable to the publisher id AdSense issues
 * - the "ca-pub-..." form - and rebuild.
 */
export function AdSense() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) return null;

  return (
    <Script
      async
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
    />
  );
}
