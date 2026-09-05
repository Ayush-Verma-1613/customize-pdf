import type { Post } from '@/lib/blog/types';

export const post: Post = {
  slug: 'certificate-layout',
  title: 'Laying out a certificate that looks earned rather than generated',
  seoTitle: 'Certificate layout and design',
  summary:
    'Optical centring, the name as the largest element, and the borders and effects that make a certificate look cheap.',
  topic: 'admin',
  published: '2026-04-23',
  readingMinutes: 4,
  body: `
A certificate is kept. It goes in a file, or on a wall, and gets looked at years later. That is a different job from a notice, and it is worth twenty minutes rather than five.

## The name is the largest thing

Not the school. Not the word "Certificate". The recipient's name.

The whole object exists to say that this person did this thing. Setting the school crest at 60pt and the name at 14pt inverts that, and it is the most common mistake on school certificates.

A workable hierarchy:

| Element | Relative size |
|---|---|
| Recipient's name | Largest |
| What was achieved | Second |
| Certificate title | Third |
| School name | Fourth |
| Date, signatures | Smallest |

The school is identified by the crest and the signature block. It does not also need to be the biggest text.

## Optical centring

Centre the block of content horizontally, but place it slightly above true vertical centre. Roughly 45% down rather than 50%.

Something placed at exact vertical centre looks low. This is a quirk of perception rather than an opinion, and it is why picture hanging guides say the same thing.

## Leave the margins alone

A certificate needs generous margins. 25mm minimum on all sides, more at the bottom if it will be framed, because frames eat 5 to 10mm and mounts eat more.

The temptation is to fill the space with a decorative border. Resist it. Space is what makes the object read as considered.

## Borders

If you use one, keep it to a single thin rule inset from the page edge, or a simple double rule. That is the convention on formal documents for a reason: it frames without competing.

What makes certificates look cheap, reliably:

- Thick ornate borders, especially the clip-art scroll kind
- Gradients behind the text
- Drop shadows on type
- More than two typefaces
- A watermark image at high opacity behind the name

## Typeface

A serif for the name and the body reads as formal and prints well. Lora, Tinos or Times all work.

Set the name larger and in the same family rather than switching to a script face. Script faces are hard to read, and a name that has to be deciphered undermines the whole object.

One sans-serif for the small print, if you want a second face. That is enough.

## The wording

Three parts, in order:

1. That the school certifies something
2. Who
3. What they did, and when

"This is to certify that **Priya Sharma** of Class 8-B secured **first place** in the Inter-House Science Quiz held on 12 March 2026."

Keep it to one sentence if possible. Two at most. Long citations read as padding.

## Signatures

Two, usually: the class teacher or event organiser, and the principal. Side by side at the foot, each with a ruled line above the printed name and designation.

Leave real room above the line. 15mm minimum, because people sign large, and a signature that overruns into the printed name looks careless on a document that will be kept.

Sign in ink. A scanned signature image on a printed certificate is visible as such and reduces the object to a printout.

## Paper

This is where the money is well spent. A certificate on 120gsm or heavier feels like a certificate. The same design on 75gsm copier paper feels like a notice.

If you can only upgrade one thing, upgrade the paper rather than the design.

Docraft's certificate template sets the hierarchy, the optical centring and the signature block, with a single-rule border you can turn off.

[Open a certificate template](/workspace/certificate)
`,
};
