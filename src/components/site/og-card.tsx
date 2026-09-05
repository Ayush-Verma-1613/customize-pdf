import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * The share card, shared by the article route and the site-wide default.
 *
 * Built from the two faces the app already ships, so a link pasted into a
 * staffroom group looks like the site it points at. It carries a label, a
 * headline and the wordmark, and nothing else: a share card is read at
 * thumbnail size, where a summary is a grey smudge.
 */

export const OG_SIZE = { width: 1200, height: 630 };

const font = (file: string) => readFile(join(process.cwd(), 'public', 'fonts', file));

export async function ogFonts() {
  const [lora, inter] = await Promise.all([font('Lora-Bold.ttf'), font('Inter-Regular.ttf')]);
  return [
    { name: 'Lora', data: lora, style: 'normal' as const, weight: 700 as const },
    { name: 'Inter', data: inter, style: 'normal' as const, weight: 400 as const },
  ];
}

export function OgCard({ label, title, hex }: { label: string; title: string; hex: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#f7f6f3',
        padding: '64px 72px',
        // The warm light the site's own ground carries, kept to one corner so
        // it never sits behind the headline.
        backgroundImage:
          'radial-gradient(60% 70% at 100% 0%, rgba(233,130,59,0.20) 0%, rgba(233,130,59,0) 70%)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div
          style={{ width: 16, height: 16, borderRadius: 5, backgroundColor: hex, marginRight: 14 }}
        />
        <div
          style={{
            fontFamily: 'Inter',
            fontSize: 26,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: hex,
          }}
        >
          {label}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          fontFamily: 'Lora',
          fontSize: title.length > 58 ? 62 : 74,
          lineHeight: 1.14,
          color: '#252525',
          maxWidth: 1000,
        }}
      >
        {title}
      </div>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ fontFamily: 'Lora', fontSize: 34, color: '#252525' }}>Docraft</div>
        <div style={{ width: 1, height: 28, backgroundColor: '#ded9d1', margin: '0 20px' }} />
        <div style={{ fontFamily: 'Inter', fontSize: 24, color: '#6f6f6f' }}>
          Question papers and documents, formatted for you
        </div>
      </div>
    </div>
  );
}
