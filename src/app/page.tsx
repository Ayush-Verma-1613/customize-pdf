import type { Metadata } from 'next';
import { Onboarding } from '@/components/onboarding/Onboarding';

/**
 * The landing page. It is the first thing anybody meets, so it stays a static
 * prerender - no data, no search params, nothing to wait for.
 */
export const metadata: Metadata = {
  description:
    'Paste your content, choose a layout, and Docraft sets a print-ready document you can edit anywhere and export as a PDF that prints exactly as the screen showed it.',
};

export default function LandingPage() {
  return <Onboarding />;
}
