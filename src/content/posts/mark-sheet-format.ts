import type { Post } from '@/lib/blog/types';

export const post: Post = {
  slug: 'mark-sheet-format',
  title: 'Mark sheets and result tables that stay readable across pages',
  seoTitle: 'Mark sheet format for schools',
  summary:
    'Repeating headers, column order, alignment of numbers, and the row banding that stops the eye slipping a line.',
  topic: 'admin',
  published: '2026-04-30',
  readingMinutes: 5,
  body: `
A mark sheet is read by running a finger along a row, and the errors it produces are almost all slipped rows: reading a mark from the line above or below. Everything in the layout is aimed at preventing that.

## Repeat the header on every page

A forty-student table runs to two pages. On page two, without a repeated header, every column is unlabelled and the reader has to flip back to work out which subject is which.

Any tool that paginates properly repeats the header row automatically. If yours does not, the table is being treated as a picture rather than as a table, and it will break in other ways too.

## Column order

Left to right, in the order the reader needs:

1. Roll number
2. Name
3. Subject marks, in the order the subjects appear on the report
4. Total
5. Percentage or grade
6. Rank, if used

Roll number first because that is what most lookups use, and because it sorts unambiguously where names do not.

Keep the two identifying columns adjacent and to the left, so a reader who has found the row can confirm they are on the right one before reading across.

## Align numbers right

Always. Right-aligned numbers form a column where the units digits line up, which makes a 9 next to a 90 visibly different in length.

Centred numbers destroy that, and centred numbers of varying width are the layout most likely to produce a misread.

Names align left. Headers align to match their column: left over names, right over numbers.

## Row banding, or ruling

Long rows need horizontal guidance. Two options, and either works:

- A light background tint on alternate rows
- A thin rule under every row

Tinting is easier to read on screen and costs toner in print. Ruling is cheaper to print and slightly busier. For a document that will be photocopied forty times, ruling is the safer choice, because a light tint can either disappear or turn muddy depending on the machine.

Whichever you choose, group every fifth row with a slightly stronger rule. The eye uses it as a landmark.

## Column widths

Set them to the content, not equally. The name column needs three times the width of a marks column, and equal widths waste the page while cramping the names.

Reserve enough for the longest name in the list rather than the average. A wrapped name doubles that row's height and breaks the visual rhythm the banding just established.

## Totals

Put the total column at the right, separated from the subject columns by a slightly heavier vertical rule. It is a different kind of number and should read as one.

Where the sheet has a bottom row of subject averages, separate it with a heavier horizontal rule and set it in bold. It is a summary, not another student.

## What to leave out

**Decimal places you do not need.** A percentage to two decimals implies a precision the marking does not have, and adds four characters to every row.

**Empty columns held for later.** They make the table wider and get filled in by hand inconsistently.

**Colour coding by grade.** It photocopies to grey, it is invisible to some readers, and it is usually redundant with the grade column that is already there.

## Landscape, if needed

A mark sheet with eight subject columns will not fit portrait A4 at a readable size. Landscape is the correct answer here, and one of the few places it is.

If it still does not fit, split by subject group across two sheets rather than reducing the type below 9pt. A table nobody can read has not saved any paper.

## Confidentiality

A full-class mark sheet with names is not something to hand to students. If individual slips are needed, generate them separately rather than distributing the table with rows folded over, which is a habit that eventually goes wrong.

Docraft's tables split across pages and repeat their header row automatically, and column widths are set per column rather than equally.

[Open a table template](/workspace/report)
`,
};
