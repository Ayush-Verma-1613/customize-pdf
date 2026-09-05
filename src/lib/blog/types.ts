/**
 * The five subjects the writing covers. Each owns one of the hues the app
 * already uses for its own families of thing, so a reader who has been inside
 * the editor meets the same colour for the same idea out here.
 */
export type Topic = 'exams' | 'worksheets' | 'formatting' | 'printing' | 'admin';

export interface Post {
  slug: string;
  title: string;
  /**
   * The <title> for search results, where the full headline would be cut off.
   * Around fifty characters, since the site name is appended to it. Falls back
   * to the headline when a post does not need a shorter one.
   */
  seoTitle?: string;
  /** Shown on the index and used as the meta description, so keep it one sentence. */
  summary: string;
  topic: Topic;
  /** ISO date. Sorted newest first on the index. */
  published: string;
  updated?: string;
  /** Minutes, rounded. Written by hand rather than counted, so it can be honest. */
  readingMinutes: number;
  /** Markdown. The subset the renderer understands is documented in markdown.tsx. */
  body: string;
}

export const TOPICS: Record<
  Topic,
  { label: string; hue: string; wash: string; blurb: string; hex: string }
> = {
  exams: {
    // The token this topic already wears on the site, as a literal for the
    // share card, which is rendered outside the stylesheet.
    hex: '#c95f18',
    label: 'Question papers',
    hue: 'text-forge-accent',
    wash: 'bg-forge-wash',
    blurb: 'Setting papers, marks, sections and instructions.',
  },
  worksheets: {
    // The token this topic already wears on the site, as a literal for the
    // share card, which is rendered outside the stylesheet.
    hex: '#4f46e5',
    label: 'Worksheets',
    hue: 'text-text-hue',
    wash: 'bg-text-wash',
    blurb: 'Practice sheets, assignments and classwork.',
  },
  formatting: {
    // The token this topic already wears on the site, as a literal for the
    // share card, which is rendered outside the stylesheet.
    hex: '#b45309',
    label: 'Formatting',
    hue: 'text-structure-hue',
    wash: 'bg-structure-wash',
    blurb: 'Type, spacing, margins and page setup.',
  },
  printing: {
    // The token this topic already wears on the site, as a literal for the
    // share card, which is rendered outside the stylesheet.
    hex: '#0f766e',
    label: 'Printing',
    hue: 'text-media-hue',
    wash: 'bg-media-wash',
    blurb: 'Getting the paper out of the machine correctly.',
  },
  admin: {
    // The token this topic already wears on the site, as a literal for the
    // share card, which is rendered outside the stylesheet.
    hex: '#0e7490',
    label: 'School admin',
    hue: 'text-data-hue',
    wash: 'bg-data-wash',
    blurb: 'Notices, certificates, forms and records.',
  },
};
