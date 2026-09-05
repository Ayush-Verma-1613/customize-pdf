import type { Metadata } from 'next';
import { SitePage } from '@/components/site/SiteChrome';
import { Markdown } from '@/lib/blog/markdown';
import { absolute, CONTACT_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description:
    'What Docraft stores, what it does not, and how advertising and analytics on the guide pages work.',
  alternates: { canonical: absolute('/privacy') },
};

const UPDATED = '5 September 2026';

const BODY = `
## The short version

The Docraft editor has no server. The documents you create, and everything you type into them, are stored by your own browser on your own device and are never sent to us or to anyone else.

The guide pages on this site are ordinary web pages. They are served from a host, and they carry advertising. Those pages behave like any other website, and this policy explains what that means.

## What the editor stores

When you create a document in Docraft, your browser saves it locally using its own storage. That includes:

- The text you type, including any names, marks or school details you enter
- Your template, page setup, font and numbering choices
- A recovery snapshot, so a closed tab does not lose the last few keystrokes

All of it stays on your device. We have no copy, no database and no way to read it. There is no account, no sign-in and no upload.

Two consequences worth being explicit about:

1. **We cannot recover your documents.** If you clear your browser's site data, use a different browser, or the device fails, the documents are gone. Export a PDF to keep a copy.
2. **We cannot see them either.** If you write in about a problem with a document, you will need to describe it, because we have no access to it.

> If you enter student names or marks into Docraft, that information stays on your machine. It is subject to your school's own data protection obligations, not to ours, because we never receive it.

## What the website collects

The pages on this site, as distinct from the editor, are hosted and served in the ordinary way. Standard server logs may record the request: an IP address, the page requested, the time, the browser's user-agent string. These are used to keep the site running and are not combined with anything else or used to build a profile.

## Advertising

The guide pages carry advertising supplied by Google AdSense. The editor does not carry advertising.

Google and its partners use cookies and similar technologies to serve ads, and may use them to show ads based on your previous visits to this and other websites. This is standard behaviour for advertising on the web, and it is worth knowing that:

- You can opt out of personalised advertising in [Google's Ads Settings](https://www.google.com/settings/ads).
- You can opt out of personalised advertising from participating vendors at [aboutads.info](https://www.aboutads.info/choices/).
- Third-party vendors, including Google, may set their own cookies. We do not control those cookies and cannot read them.
- Google's own explanation of how it uses data from sites that use its services is at [policies.google.com/technologies/partner-sites](https://policies.google.com/technologies/partner-sites).

Where required, readers in the European Economic Area, the United Kingdom and Switzerland are asked for consent before personalised ads are served, through Google's consent mechanism.

## Cookies

The editor itself sets no cookies. It uses your browser's local storage to hold your documents, which is a different mechanism and is never transmitted with requests.

The guide pages may carry cookies set by Google for advertising, as described above. You can block or delete cookies in your browser settings; the site will continue to work, and the editor is entirely unaffected.

## Children

Docraft is a tool for teachers and school staff. It is not directed at children and we do not knowingly collect personal information from anyone, of any age, because the editor collects nothing at all.

Where a teacher enters student information into a document, that information remains on the teacher's own device.

## Data outside the browser

We do not sell, share, rent or transfer personal information, because we do not hold any. There is no user database to breach, transfer or subpoena.

## Your rights

Rights of access, correction and deletion apply to data a service holds about you. For the editor there is nothing to exercise them against: your documents are already in your possession and you can delete them by clearing your browser's site data for this site.

For advertising cookies set by third parties, the opt-out links in the advertising section above are the practical route.

## Changes

If this policy changes, the date at the top of this section changes with it. Material changes will be noted on this page rather than made silently.

## Contact

Questions about this policy, or about what Docraft does with anything you type into it, go to [${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL}).
`;

export default function PrivacyPage() {
  return (
    <SitePage>
      <div className="mx-auto max-w-[720px] px-5 pt-12 pb-6 sm:px-7 sm:pt-16">
        <p className="text-[12px] font-semibold tracking-[0.1em] text-forge-green uppercase">
          Privacy
        </p>
        <h1 className="mt-3 font-serif text-[34px] leading-[1.12] font-semibold text-forge-ink sm:text-[42px]">
          Privacy policy
        </h1>
        <p className="mt-3 text-[13px] text-forge-muted">Last updated {UPDATED}</p>

        <div className="mt-2">
          <Markdown>{BODY}</Markdown>
        </div>
      </div>
    </SitePage>
  );
}
