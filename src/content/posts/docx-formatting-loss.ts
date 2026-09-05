import type { Post } from '@/lib/blog/types';

export const post: Post = {
  slug: 'docx-formatting-loss',
  title: 'Why your Word document looks different on the school computer',
  seoTitle: 'Why Word documents lose formatting',
  summary:
    'Font substitution, printer drivers and hidden styles, and how to move a document between machines without it reflowing.',
  topic: 'formatting',
  published: '2026-03-20',
  readingMinutes: 5,
  body: `
You format a paper at home, open it on the staffroom machine, and the page breaks have moved. A question that sat neatly at the bottom of page one is now stranded alone at the top of page two. Nothing was edited.

This is not a bug in your document. It is how word processors work, and knowing why makes it avoidable.

## Fonts are not inside the file

A .docx file records that text is set in a particular typeface. It does not usually carry the typeface itself.

Open it on a machine without that font, and the software substitutes a different one. The substitute has different letter widths, so lines break at different words, so paragraphs take a different number of lines, so page breaks move.

The fonts most likely to be present everywhere are the oldest ones. The ones most likely to substitute are the ones you downloaded because they looked good.

## Printer drivers change the layout

Word processors ask the current printer driver about page metrics, and different drivers report slightly different printable areas. Change the default printer and a document can reflow, with no font involved at all.

This is why a document can look correct on the machine that made it, correct on a colleague's machine, and wrong on the one connected to the copier.

## Styles carry invisible settings

Spacing, keep-with-next rules and widow control usually live in the style rather than in the text you can see. Paste text from one document into another and it can silently adopt the destination's styles, changing spacing throughout in ways that are hard to trace because nothing visibly changed in the text.

## What to do about it

**Export a PDF and distribute that.** A PDF records positions rather than instructions, and embeds the fonts it needs. What you approved is what prints. This single habit removes almost the entire problem, and is the right answer for anything going to a printer or a copier.

**Stick to fonts that are everywhere** for anything that must stay editable. Arial, Times New Roman, Calibri. Not because they are the best-looking, but because they will be present.

**Set page size explicitly to A4.** A document created from a US Letter default is 18mm shorter and 6mm wider than A4, which is enough to move every page break and to clip the bottom line when printed.

**Check the last page before printing forty copies.** Reflow shows up at the end. A document that gained a line somewhere in the middle produces a final page carrying one orphaned question, and forty copies of a nearly blank sheet.

## Moving text without moving formatting

When you do need to copy content between documents, paste as plain text and reapply the formatting at the destination. It sounds like more work and is usually less, because you are not then hunting for the one paragraph that brought its old spacing with it.

Most word processors offer this as "paste special" or "keep text only", and it is worth learning the keyboard shortcut for.

## A different approach

The underlying problem is that word processors describe a document as instructions to be re-executed on each machine. Anything that lays the document out once, and then hands you fixed output, does not have this class of problem at all.

Docraft imports .docx, .pdf, .txt, .md and .html, takes the text and structure and discards the source styling deliberately. It then lays the document out itself and embeds the same font files in the exported PDF that it used on screen. The page breaks you approve are the page breaks that print, on any machine.

[Import a document](/workspace)
`,
};
