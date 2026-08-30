import type { Metadata, Viewport } from 'next';
import { ErrorBoundary, RuntimeErrorReporter } from '@/components/ui/ErrorBoundary';
import './globals.css';

export const metadata: Metadata = {
  title: 'Docraft — question papers and documents, formatted for you',
  description:
    'Type your content, pick a template, and Docraft lays out a print-ready multi-page document. Built for teachers writing question papers, worksheets and notices.',
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
      </body>
    </html>
  );
}
