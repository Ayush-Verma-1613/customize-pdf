import type { Post } from '@/lib/blog/types';

export const post: Post = {
  slug: 'worksheet-layout',
  title: 'Designing a worksheet primary students can work through alone',
  seoTitle: 'How to design a worksheet',
  summary:
    'Line length, instruction placement, working space and the visual grouping that lets a seven-year-old start without asking what to do.',
  topic: 'worksheets',
  published: '2026-02-11',
  readingMinutes: 6,
  body: `
A worksheet succeeds when a child can begin without raising their hand. That sounds like a low bar until you watch thirty children receive one and eleven hands go up.

Most of those hands are not about the subject. They are about the sheet.

## One instruction, at the point of use

The single biggest cause of confusion is instructions collected at the top. A child reads "Complete the following exercises" at the top of the page, reaches question 4 where the task changes from addition to circling the larger number, and has no signal that anything changed.

Put each instruction directly above the questions it governs. When the task changes, a new instruction line appears. It costs a few lines of vertical space and removes most of the hands.

Write instructions as an action, starting with the verb. **Circle** the larger number. **Write** the missing letter. **Match** each animal to its home. A child scanning for what to do finds the verb first.

## Line length

For younger readers, keep lines short. Around 40 to 50 characters is comfortable at primary level, against the 65 to 75 that suits adult prose. Long lines cause a child to lose their place on the return sweep, and a lost place reads as a reading difficulty when it is a layout problem.

Where a worksheet is mostly short items, two columns work well and halve the sheet's length. Where items wrap to several lines, stay in one column. Two columns of wrapping text is the worst of both.

## Grouping

Related items should sit closer to each other than to anything else. This is the one principle that does the most work and costs nothing.

In practice:

- More space between question groups than between questions within a group
- More space above an instruction than below it, so it attaches to what follows
- A visible break, a rule or a clear band of white, between sections of different tasks

If everything on the sheet is evenly spaced, the child has to read everything to find the structure. Uneven spacing does that work for them.

## Working space

Leave more room than the answer needs. A child's handwriting is large, gets larger when they are unsure, and does not shrink to fit the box you provided.

Rough guides that hold up:

| Answer type | Space to leave |
|---|---|
| Single digit or letter | A box about 12mm square |
| One word | A ruled line about 40mm |
| A sentence | A full ruled line, 8mm high |
| Two or three sentences | Three ruled lines |
| Working for a sum | A blank block, not lines |

That last row matters. Ruled lines under an arithmetic question tell a child to write the answer; a blank block tells them they are allowed to work it out on the page. If you want to see method, give them somewhere to put it.

## Ruled lines, not blank space, for writing

For anything longer than a word, print the line. Children write at an angle on blank paper, run out of room, and the work becomes hard to mark. An 8mm ruling suits most primary years; drop to 6mm only for older or more confident writers.

## Font and size

Use a clean sans-serif at a generous size. 14pt is a reasonable floor for early primary, 12pt for upper primary. This is not about eyesight. It is that larger type gives each word more space, and more space makes decoding easier for a child who is still doing it consciously.

Avoid the fonts that imitate handwriting. They look friendly and are measurably harder to read, because the letterforms vary in ways print letterforms do not.

## Leave the bottom quarter emptier

Sheets tend to get denser toward the bottom, because that is where the author was running out of room. The child, by then, is tiring. Reverse it: if something has to be cramped, cramp the top, where attention is highest.

Better still, let it run to a second page. A second page costs a sheet of paper. A cramped page costs the last four questions.

## Check it by doing it

Print the sheet and complete it by hand, in pen, at speed. You will discover the box that is too small, the instruction that is ambiguous, and the question whose answer you already gave away in question 2. Ten minutes, and it catches nearly everything.

Docraft's worksheet templates set the ruling, spacing and answer blocks already, so you can paste the questions in and adjust rather than build the sheet from an empty page.

[Open a worksheet template](/workspace/worksheet)
`,
};
