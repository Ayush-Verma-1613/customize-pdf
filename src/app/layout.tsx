import type { Metadata, Viewport } from 'next';
import { ErrorBoundary, RuntimeErrorReporter } from '@/components/ui/ErrorBoundary';
import { AdSense } from '@/components/site/AdSense';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  // Relative canonicals and Open Graph urls on the pages below resolve against
  // this, which a static export cannot work out from a request.
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Docraft — question papers and documents, formatted for you',
    template: `%s — ${SITE_NAME}`,
  },
  description:
    'Type your content, pick a template, and Docraft lays out a print-ready multi-page document. Built for teachers writing question papers, worksheets and notices.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: SITE_URL,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Never block pinch zoom: the canvas has its own gesture, but a reader who
  // needs to magnify the interface itself must still be able to.
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* Wrapped at the root so a crash anywhere - either route, either kind -
          arrives as something the reader can act on rather than a blank page. */}
      <body className="antialiased">
        <ErrorBoundary>{children}</ErrorBoundary>
        <RuntimeErrorReporter />
        <AdSense />
      </body>
    </html>
  );
}
