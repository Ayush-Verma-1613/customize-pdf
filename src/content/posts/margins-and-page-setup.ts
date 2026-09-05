import type { Post } from '@/lib/blog/types';

export const post: Post = {
  slug: 'margins-and-page-setup',
  title: 'Margins and page setup for documents that will be stapled and copied',
  seoTitle: 'Margins and page setup for A4',
  summary:
    'A4 margins that survive the staple, the photocopier edge and the school printer, with the numbers to start from.',
  topic: 'formatting',
  published: '2026-02-26',
  readingMinutes: 5,
  body: `
Default margins are set for a document that will be read on screen or printed once and filed. School documents are stapled in the corner, photocopied forty times, and handled by people in a hurry. Different constraints, different numbers.

## Start from these

For A4, single-sided, stapled top-left:

| Margin | Value |
|---|---|
| Top | 20mm |
| Bottom | 18mm |
| Left | 22mm |
| Right | 16mm |

The left margin is wider than the right because that edge loses room to the staple and to the binding curl when a stack of sheets is held together. The extra 6mm is not aesthetic.

For double-sided printing, the wide margin has to swap sides on alternate pages. Set it as a mirrored or gutter margin rather than as a plain left margin, or every reverse side will have its text pushed toward the staple instead of away from it.

## The photocopier eats the edges

Most school copiers lose 3 to 5mm at the edge, and lose more on the trailing edge when the original is fed through a document feeder. A margin of 10mm looks generous on screen and comes back from the copier with the last character of some lines missing.

Nothing you need should sit within 15mm of any edge. That includes page numbers, which are often placed in a footer at 10mm and are exactly the thing that quietly disappears.

## Page numbers

Put them in the footer, centred, at least 15mm from the bottom. Centred survives double-sided printing without needing to alternate.

For a multi-page paper, use the "page 2 of 6" form rather than a bare number. A student who has been handed a stapled paper with a page missing needs to be able to tell, and so does the person collating them.

## Header space on later pages

The first page carries the full header block. Pages after it should carry a compact line: subject, class, and page number. This is not redundancy. It is what makes a loose sheet identifiable when a staple fails, which it will.

Keep it to one line, in a smaller size, with a rule under it.

## Line length is set by the margins

With the margins above, an A4 page gives about 172mm of text width. At 11pt in a typical serif face, that is roughly 85 characters per line, which is longer than comfortable.

Two ways to fix it, and they are both legitimate:

- Increase the type size to 12pt, bringing the line down to about 78 characters
- Widen the margins further, to 25mm each side, bringing it to around 75

For question papers, the second is usually better, because the extra white space gives students somewhere to make notes beside a question.

For dense reference documents where paper count matters, the first is better.

## When to go two-column

Two columns on A4 give a comfortable line length and fit more on a page. They also make a document harder to fill in by hand, harder to photocopy without a visible gutter shadow, and harder to reflow when you edit.

Use them for reading material. Avoid them for anything a student writes on.

## Landscape

Landscape A4 is right for wide tables, mark registers and seating plans, and wrong for almost everything else. A landscape page of prose has a line length of about 250mm, which is unreadable, and no margin adjustment rescues it without leaving most of the page blank.

If a table is the only thing forcing landscape, consider whether the table can lose a column instead.

## Check on the actual machine

Margins are the one setting where the preview lies. Print one page on the machine that will produce the real copies, photocopy that print, and look at the copy rather than the original. Five minutes, and it catches the trimmed page number before forty copies do.

Docraft's page setup panel works in millimetres and shows a live preview at true proportions, with a mirrored gutter option for double-sided documents. The margins you set are the margins the exported PDF carries.

[Set up a page](/workspace)
`,
};
