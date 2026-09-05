import type { Post } from '@/lib/blog/types';

export const post: Post = {
  slug: 'fonts-for-question-papers',
  title: 'Choosing a typeface that survives the school photocopier',
  seoTitle: 'Best fonts for question papers',
  summary:
    'Why thin, fashionable fonts fail on a fortieth-generation copy, and which sizes and faces hold up in practice.',
  topic: 'formatting',
  published: '2026-03-05',
  readingMinutes: 5,
  body: `
A typeface that looks refined on a laptop can be genuinely hard to read on the copy a student receives. The copier is the constraint that matters, and it punishes exactly the qualities that look sophisticated on screen.

## What a photocopier does to type

Copying thickens dark areas and drops out light ones. Each generation of copying compounds it. By the third generation:

- Thin strokes break up or vanish
- Counters, the enclosed spaces in a, e, o, fill in
- Tight letter spacing merges into blocks
- Fine hairline serifs disappear entirely

So the qualities you want are the opposite of the ones a display typeface advertises. Even stroke weight, open counters, generous spacing, no extreme thin-to-thick contrast.

## Faces that hold up

**For body text**, the reliable choices are the ones that have been printed badly for decades and survived it:

- **Arimo** or Arial for sans-serif. Even weight, open shapes, nothing delicate.
- **Tinos** or Times New Roman for serif. The serifs are sturdy rather than fine, which is why it survives copying when more elegant serifs do not.
- **Inter** for a modern sans that still has open counters and even weight.

**For headings**, you have more freedom, because headings are larger and larger type copies better. A serif with more contrast, like Lora, works at 16pt and up where it would fail at 10pt.

## What to avoid

Faces with high stroke contrast, where thick and thin parts differ sharply. They look expensive and copy badly.

Condensed faces. The tighter the spacing, the sooner adjacent letters merge.

Light and thin weights. On screen a light weight reads as modern. On a copy it reads as faint.

Handwriting and script faces, anywhere, for any reason a school document has.

## Size

For question papers, 11pt or 12pt body text. Below 11pt, copying losses start to matter; above 13pt, the paper grows a page and students read it as a paper for younger children.

For primary worksheets, 14pt. For a notice pinned to a board and read at two metres, 16pt body with a 24pt heading.

Size in the same units your page setup uses, and check the printed size with a ruler once. Software scaling at print time is common enough that a document set at 12pt can arrive at 11.

## Line spacing

Single spacing is too tight for a document that will be copied, because copying thickens strokes and the lines start to visually merge. 1.15 to 1.2 is a better default for body text, and 1.3 for anything primary students will read.

Extra space between paragraphs matters more than extra space within them. Space between is structural information; space within is just looser text.

## Bold, italic and underline

Bold survives copying well and is the safest emphasis.

Italic survives poorly. The angled thin strokes are exactly what copying loses, and a whole italic sentence on a third-generation copy is measurably slower to read. Use it for a word or two, not a line.

Underline damages legibility by cutting through descenders, and on a copy the line thickens and the descenders disappear into it. It is a convention from typewriters, which had no other option. You do.

## Mixing faces

Two faces is plenty: one for headings, one for body. Three starts to look like the document was assembled rather than designed.

The pairing that never fails is a sans-serif for headings and a serif for body, or the reverse. What fails is two faces of the same kind, which look like a mistake rather than a choice.

## Test it properly

Print the document, photocopy the print, then photocopy the copy. Read the third-generation sheet at arm's length. If the two-mark questions are harder to read than the five-mark ones because they are set smaller, you have found something worth fixing.

Docraft ships five faces and embeds the same font files in the exported PDF that it uses on screen, so line breaks on the printed page match the ones you approved. No substitution at the print shop.

[Try the templates](/workspace)
`,
};
