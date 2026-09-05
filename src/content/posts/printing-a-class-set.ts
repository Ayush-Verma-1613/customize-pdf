import type { Post } from '@/lib/blog/types';

export const post: Post = {
  slug: 'printing-a-class-set',
  title: 'Printing a class set without wasting an hour and a ream',
  seoTitle: 'Printing a class set of papers',
  summary:
    'Test one, count properly, and the double-sided settings that cause the reprint everybody has done once.',
  topic: 'printing',
  published: '2026-03-27',
  readingMinutes: 5,
  body: `
Printing forty copies of a six-page paper is twenty minutes and 240 sheets. Getting it wrong is forty minutes and 480. The difference is almost entirely in what you do before pressing print.

## Print one, on the real machine

Not a preview. One physical copy, on the machine that will produce the set, on the paper that will be loaded.

Check on that single sheet:

- Nothing is clipped at any edge
- Page numbers are present and correct
- The last page is not a single orphaned line
- Double-sided pages line up the right way round
- Anything printed light is still legible

This costs one sheet and thirty seconds, and it is the step most often skipped when someone is in a hurry, which is precisely when the reprint hurts most.

## Count before you print

Take the number of students, add three. Two for the students who arrive without one, one for the file copy.

For an exam, add more and count them formally. Papers are usually issued against a signed count, and the spare copies matter.

Do not print "about forty". A short run of a stapled six-page paper cannot be topped up cleanly; you end up printing another full set of six pages to make two copies.

## Double-sided, and the mistake everyone makes once

The setting has two versions, and the names vary by manufacturer:

- **Long-edge binding** flips like a book. Correct for portrait documents.
- **Short-edge binding** flips like a notepad. Correct for landscape documents.

Choose short-edge for a portrait document and every reverse side prints upside down. It looks fine in preview, because preview shows pages rather than sheets.

Test with two sheets before committing.

## Odd page counts

A five-page paper printed double-sided produces a sheet with a blank reverse. That is fine and normal.

What is not fine is a five-page paper where the odd page count was accidental, caused by reflow adding a line. Check whether page five is genuinely full or is carrying two lines that belong on page four.

## Collation and stapling

Set the printer to collate. Uncollated output gives you forty copies of page one, then forty of page two, and someone spends twenty minutes assembling them by hand and still gets one wrong.

If the machine staples, let it. Hand-stapling forty six-page papers takes longer than the printing did, and hand staples go in at an angle, which is how pages get torn out later.

Staple top-left, at 45 degrees, roughly 10mm in from each edge. Straight staples parallel to the edge hold worse and tear more easily.

## Paper weight

Standard 70 or 75gsm is fine for most things and is what schools stock.

Go to 80gsm or higher when the document is double-sided and carries dense dark areas, because show-through from the reverse is genuinely distracting on a question paper, and a student reading a faint mirror image of question 14 through question 3 is losing time.

## Timing

School printers are shared, slow under load, and reliably busy at the worst moment. A six-page paper for forty students is 240 impressions; a typical staffroom machine does maybe 25 a minute, so that is ten minutes of exclusive use before collation.

Print the day before. Every experienced teacher already knows this, and every teacher has still, once, been printing at eight in the morning while the machine reports a paper jam.

## Store the master separately

Keep one clean copy that never goes into the copier feeder. Feeders scuff and occasionally crease originals, and a master that has been through the feeder six times produces visibly worse copies than one that has not.

Better still, keep the PDF and reprint from it rather than copying a copy. Each generation of photocopying degrades the image; printing from the file does not.

Docraft exports a PDF that prints exactly as the screen showed it, with the fonts embedded, so reprinting next term produces the same pages rather than a reflowed document.

[Open the editor](/workspace)
`,
};
