import type { Post } from '@/lib/blog/types';

export const post: Post = {
  slug: 'answer-space',
  title: 'How much answer space to leave, by mark value',
  seoTitle: 'How much answer space to leave',
  summary:
    'A working table for ruled lines and blank blocks, and why too much space is a worse problem than it looks.',
  topic: 'worksheets',
  published: '2026-02-19',
  readingMinutes: 4,
  body: `
Answer space is the part of a paper most often decided by whatever was left on the page. It is worth a minute of thought, because the amount of space you leave is read by students as an instruction.

## Space is a signal about length

A student who sees six ruled lines writes six lines, whether or not the answer needs them. A student who sees two lines writes two, even when they know more.

This cuts both ways. Too little space and you truncate students who understood the material. Too much and you invite padding, which takes their time and yours.

So the space should match the answer you actually expect, not the space you happen to have.

## A working table

For written subjects, at secondary level, with normal handwriting:

| Marks | Expected answer | Space |
|---|---|---|
| 1 | A word, a number, a choice | One short line or a box |
| 2 | One or two sentences | Two ruled lines, 8mm |
| 3 | A short paragraph, or a definition with an example | Four ruled lines |
| 5 | A developed answer, several points | Eight to ten ruled lines |
| 5, with working | Derivation, calculation, proof | A blank block of about 90mm |

Adjust down for older students with compact handwriting, up for younger ones. Adjust up generally for mathematics, where the working sprawls sideways as well as down.

## Lines or blank space

Rule it when you want prose. Leave it blank when you want working.

Ruled lines quietly forbid diagrams, tables, arrows and crossings-out, which are exactly the things a student needs when deriving something. Blank space quietly permits them.

For a question that wants both, a blank block for working and a single ruled line labelled for the final answer works well, and makes the answer easy to find when marking.

> A ruled line under a mathematics question is the most common small formatting mistake in school papers. It tells the student the answer is a sentence.

## Diagrams

Where a student must draw, leave a bordered blank box rather than open space. The border does three things: it says a drawing is expected, it stops the drawing spilling into the next question, and it gives the student a frame to scale against.

Size it for the drawing you expect and then add a third. Students draw larger than teachers imagine.

## Graph work

Print the grid. Asking students to draw axes on blank paper spends four minutes of exam time on a skill you are not testing, and produces axes too small to plot on accurately.

If graph paper is supplied separately, say so in the general instructions rather than leaving them to find out.

## Continuation

State once, in the instructions, what a student should do if they run out of room. Usually: continue on the reverse and write "continued" under the question. Without that line, students write into the margin, up the side of the page, and eventually into the next question's space, where it will be marked as part of that answer or missed entirely.

## The economics

Generous spacing costs paper. It is worth being clear about the size of the tradeoff: for a class of forty, going from six to eight lines on four questions adds roughly one sheet per student. Double-sided, that is twenty sheets.

Set against a student who could not finish an answer they knew, twenty sheets is cheap. But it is a real cost, and it is the reason to size the space deliberately rather than uniformly. Not every question needs the same room.

Docraft's answer-space blocks are set by height rather than by counting lines, so changing a question from two marks to three adjusts the space with it and the rest of the page reflows.

[Build a paper with answer space](/workspace/answer-sheet)
`,
};
