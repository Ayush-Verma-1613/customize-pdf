import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { CONTACT_EMAIL } from '@/lib/site';

/**
 * The frame the reading pages sit in - articles, about, privacy, contact.
 *
 * It is deliberately not the app's own header. Those pages are a workspace and
 * carry a document's controls; these are a publication and carry navigation
 * and a way back into the product. Sharing the wordmark and the warm ground is
 * enough to say they are the same place.
 */

const NAV = [
  { href: '/blog', label: 'Guides' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function SiteHeader() {
  return (
    <header className="border-b border-forge-line/70 bg-white/55 backdrop-blur-sm">
      <div className="mx-auto flex h-[62px] max-w-[1080px] items-center gap-4 px-5 sm:h-[70px] sm:px-7">
        <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <Image
            src="/logo.png"
            alt=""
            width={256}
            height={256}
            className="h-[26px] w-[26px] shrink-0 sm:h-[30px] sm:w-[30px]"
          />
          <span className="font-serif text-[19px] leading-none font-semibold text-forge-ink sm:text-[22px]">
            Docraft
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-1 sm:gap-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2 py-1.5 text-[13.5px] font-medium text-forge-ink-soft transition-colors hover:bg-black/[0.04] hover:text-forge-ink sm:px-2.5 sm:text-[14px]"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/workspace"
            className="ml-1 rounded-lg bg-forge-accent px-3 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-forge-accent-soft sm:ml-2 sm:px-3.5 sm:text-[14px]"
          >
            Open Docraft
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooterSlim() {
  return (
    <footer className="mt-16 border-t border-forge-line bg-white/45">
      <div className="mx-auto max-w-[1080px] px-5 py-9 sm:px-7 sm:py-11">
        <div className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <span className="flex items-center gap-2">
              <Image src="/logo.png" alt="" width={128} height={128} className="h-[22px] w-[22px]" />
              <span className="font-serif text-[17px] leading-none font-semibold text-forge-ink">
                Docraft
              </span>
            </span>
            <p className="mt-2.5 max-w-[32ch] text-[12.5px] leading-relaxed text-forge-ink-soft">
              A document designer for teachers. Runs in your browser, keeps your documents on your
              own machine.
            </p>
          </div>

          <FooterLinks
            title="Product"
            tint="text-forge-accent"
            links={[
              { href: '/workspace', label: 'Open the editor' },
              { href: '/', label: 'What it does' },
            ]}
          />
          <FooterLinks
            title="Guides"
            tint="text-text-hue"
            links={[
              { href: '/blog', label: 'All guides' },
              { href: '/blog/question-paper-format', label: 'Question paper format' },
              { href: '/blog/worksheet-layout', label: 'Worksheet layout' },
            ]}
          />
          <FooterLinks
            title="Company"
            tint="text-forge-green"
            links={[
              { href: '/about', label: 'About' },
              { href: '/contact', label: 'Contact' },
              { href: '/privacy', label: 'Privacy policy' },
            ]}
          />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-forge-line pt-4 text-[11.5px] text-forge-muted">
          <span>© {new Date().getFullYear()} Docraft</span>
          <span aria-hidden className="text-forge-line">·</span>
          <a href={`mailto:${CONTACT_EMAIL}`} className="transition-colors hover:text-forge-ink">
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterLinks({
  title,
  tint,
  links,
}: {
  title: string;
  tint: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="min-w-0">
      <h2 className={`text-[11px] font-semibold tracking-[0.08em] uppercase ${tint}`}>{title}</h2>
      <ul className="mt-2.5 space-y-1.5">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link
              href={link.href}
              className="text-[12.5px] leading-snug text-forge-ink-soft transition-colors hover:text-forge-ink"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The warm decorated ground the reading pages share, plus header and footer. */
export function SitePage({ children }: { children: ReactNode }) {
  return (
    <div className="reading-ground flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooterSlim />
    </div>
  );
}
