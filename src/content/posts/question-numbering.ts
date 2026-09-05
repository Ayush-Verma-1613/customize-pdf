import type { Post } from '@/lib/blog/types';

export const post: Post = {
  slug: 'question-numbering',
  title: 'Question numbering that does not break when you reorder the paper',
  seoTitle: 'Question numbering in exam papers',
  summary:
    'Continuous numbering, sub-part conventions, and why manual numbers always drift by the third draft.',
  topic: 'formatting',
  published: '2026-03-12',
  readingMinutes: 4,
  body: `
Numbering is the part of a paper that is correct in draft one and wrong by draft four. Every insertion, deletion and reorder is a chance for it to drift, and it drifts silently.

## Number continuously

Across the whole paper, 1 to n, not restarting at each section. Section A ends at 20, Section B begins at 21.

The reason is the answer booklet. A student writes "Q7" at the top of an answer. If the paper contains a Q7 in Section A and a Q7 in Section C, the marker has to infer which, and will occasionally infer wrong. Continuous numbering removes the ambiguity for the cost of nothing.

## Sub-parts

The conventional ladder, and it is worth following because students already know it:

- Questions: **1, 2, 3**
- Parts: **(a), (b), (c)**
- Sub-parts: **(i), (ii), (iii)**

Three levels is the practical limit. If you need a fourth, the question is doing too much and should be two questions.

Where a question has parts, put the marks on the parts, not on the question. "Q12 [5]" followed by parts worth 2, 2 and 1 makes a student work out the split themselves. Printing 2, 2 and 1 beside the parts tells them how to budget.

## Choice numbering

Two alternatives sharing a number is the standard: both are Q18, separated by a centred **OR**. The student answers one and labels it Q18.

The alternative, numbering them 18 and 19 with a note, breaks the count of questions and confuses the totals. Avoid it.

## Where the number sits

Left of the question text, in a narrow column of its own, with the question text aligned in a block to the right of it. Not run into the text.

The difference shows up on wrapping questions. With a hanging indent, the second line of a question starts under the first line's text, and the numbers form a clean column down the left edge. Without one, the second line starts under the number, and the column dissolves.

This is one of those details nobody notices when it is right and everybody finds slightly hard to read when it is wrong.

## Why manual numbering fails

Not because teachers are careless. Because the failure mode is invisible.

When you delete question 9 from a hand-numbered paper, the paper still reads perfectly. Every number is still there, in ascending order. It just goes 8, 10, 11. Proofreading catches wrong words, not a missing integer in a sequence you are not reading as a sequence.

The same applies to inserting. You add a question after 14, renumber 15 onward, and miss one because it was on the next page.

> The check that actually catches it: read only the numbers, out loud, ignoring the questions. Ten seconds, and it is the only reliable manual method.

## Automatic numbering

The real fix is for the numbers not to be typed at all. In Docraft, a line beginning with a number is read as a question, and the paper numbers itself from the order of the lines. Delete a question and everything after it renumbers. Move a section and its questions renumber to their new position.

The same applies to sub-parts and to the section totals, which are derived from the questions inside each section rather than typed alongside them.

That removes the whole class of error rather than making it easier to find.

[Write a paper](/workspace/question-paper-classic)
`,
};
