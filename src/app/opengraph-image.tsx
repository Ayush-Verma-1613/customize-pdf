import { ImageResponse } from 'next/og';
import { OG_SIZE, OgCard, ogFonts } from '@/components/site/og-card';

/** The card every page without one of its own falls back to. */
export const dynamic = 'force-static';
export const alt = 'Docraft — question papers and documents, formatted for you';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    <OgCard label="Docraft" title="Question papers and documents, formatted for you" hex="#c95f18" />,
    { ...size, fonts: await ogFonts() },
  );
}
