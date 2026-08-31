import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Award, ClipboardList, FileText, MoveRight, UserRound } from 'lucide-react';
import { OnboardingBackground } from './OnboardingBackground';
import styles from './onboarding.module.css';

export const metadata: Metadata = {
  title: 'Welcome to Docraft',
  description:
    'Paste your content, choose a layout, and Docraft sets a print-ready document you can edit anywhere and export as a PDF that prints exactly as the screen showed it.',
};

/**
 * Four starting points rather than the full catalogue. The list is a promise
 * about the range of the app, not a menu - choosing actually happens in the
 * workspace, where the preview is live.
 *
 * Each carries its own hue so the row reads as four different kinds of
 * document. The tint is confined to the icon chip, because the warm ground
 * behind it owns the colour on this page.
 */
const STARTING_POINTS = [
  {
    id: 'resume',
    icon: UserRound,
    title: 'Resume',
    body: 'One column that reads cleanly through a scanner, two columns for a person, or a student layout.',
    hue: '#a0552f',
    wash: '#fbeee7',
  },
  {
    id: 'question-paper-classic',
    icon: FileText,
    title: 'Question paper',
    body: 'Sections, marks and numbering that renumber themselves when you insert a question.',
    hue: '#c95f18',
    wash: '#fdeee2',
  },
  {
    id: 'worksheet',
    icon: ClipboardList,
    title: 'Worksheet',
    body: 'Ruled answer lines, tick boxes and room to work, sized to the page rather than guessed.',
    hue: '#5c6749',
    wash: '#eef0e7',
  },
  {
    id: 'certificate',
    icon: Award,
    title: 'Certificate',
    body: 'A bordered landscape page with the name set large and the wording already in place.',
    hue: '#a8762a',
    wash: '#fbf1de',
  },
];

export default function OnboardingPage() {
  return (
    <div className={styles.page}>
      <OnboardingBackground />

      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          {/* Decorative: the wordmark beside it already names the product. */}
          <Image
            src="/logo.png"
            alt=""
            width={256}
            height={256}
            priority
            className={styles.brandLogo}
          />
          <span className={styles.brandName}>Docraft</span>
          <span className={styles.brandRule} />
          <span className={styles.brandNote}>
            Resumes, question papers, worksheets and certificates
          </span>
        </Link>

        <Link className={styles.headerCta} href="/">
          Open the workspace
          <ArrowUpRight strokeWidth={2} />
        </Link>
      </header>

      <main className={styles.content}>
        <section className={styles.intro}>
          <p className={styles.wordmark}>
            <span className={styles.wordmarkDot} />
            From plain text to print-ready
          </p>

          <h1 className={styles.headline}>
            Type it once.
            <br />
            <span className={styles.headlineAccent}>We set the page.</span>
          </h1>

          <p className={styles.standfirst}>
            Paste your content in as plain text, pick a layout, and get a laid-out
            resume, question paper or certificate you can edit anywhere and export as a
            PDF that prints exactly as the screen showed it.
          </p>
        </section>

        <section className={styles.templates}>
          {STARTING_POINTS.map(({ id, icon: Icon, title, body, hue, wash }) => (
            <Link
              key={id}
              href={`/?template=${id}`}
              className={styles.card}
              style={{ '--chip-hue': hue, '--chip-wash': wash } as React.CSSProperties}
            >
              <span className={styles.chip}>
                <Icon strokeWidth={1.75} />
              </span>
              <h2 className={styles.cardTitle}>{title}</h2>
              <p className={styles.cardBody}>{body}</p>
              <span className={styles.cardGo}>
                Start with this
                <MoveRight strokeWidth={2} />
              </span>
            </Link>
          ))}
        </section>

        <div className={styles.actions}>
          <Link className={styles.cta} href="/">
            Start a document
            <MoveRight strokeWidth={2} />
          </Link>
          <p className={styles.assurance}>
            Everything runs in this browser. No account, no upload, nothing to sign in to.
          </p>
        </div>
      </main>
    </div>
  );
}
