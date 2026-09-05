import type { Post } from '@/lib/blog/types';

export const post: Post = {
  slug: 'question-paper-format',
  title: 'How to format a question paper that reads clearly under exam pressure',
  seoTitle: 'How to format a question paper',
  summary:
    'The header block, the instructions, the section breaks and the mark column, and what each one is actually for.',
  topic: 'exams',
  published: '2026-01-14',
  readingMinutes: 7,
  body: `
A question paper is read by a nervous fifteen-year-old with forty minutes of thinking still to do. Every second they spend working out what the paper wants is a second taken from the answer. Format is not decoration here. It is the difference between a student losing marks on the physics and a student losing marks on the layout.

Here is the structure that works, and the reason behind each part.

## The header block

The top of the paper answers four questions before the student reads a single item.

- Which school, and which examination
- Which class and subject
- How long they have
- How many marks are available

Set the school name largest, then the examination name, then a line carrying class, subject, time and maximum marks. Keep that last line on one row if it fits. Split across two rows it starts to look like a form, and students begin filling things in.

Leave a ruled space for name and roll number on the right, or run it as a full-width strip under the header. Do not tuck it into a corner. A student writing their roll number in the wrong place is an administrative problem later.

> A rule worth keeping: nothing in the header should need to be read twice. If a colleague glances at it and asks "is this the half-yearly or the annual?", the header has failed.

## General instructions

This is the block teachers most often rush and students most often ignore. It is ignored because it is usually written as a wall of text.

Break it into numbered lines. Each line carries one instruction. Six to eight lines is normal, and if you are over ten you are probably repeating yourself.

The instructions that earn their place:

1. How many questions there are and whether all are compulsory
2. What the sections are and how marks are split between them
3. Where internal choice exists, and how many alternatives to attempt
4. Whether calculators, log tables or drawing instruments are allowed
5. Reading time, if your school gives it
6. Anything unusual about this particular paper

Put the internal-choice line in bold. It is the single instruction that costs students the most marks when missed.

## Sections

Sections let you group by mark value, which is what students actually plan around. A one-mark question and a five-mark question want different amounts of time, and a student who can see the boundary can budget.

Give each section its own line, set apart from the questions. Say what the section contains and what each question in it is worth:

**Section B — Short answer. Questions 6 to 12 carry 2 marks each.**

That single line replaces a mark figure printed beside seven separate questions. Where a section is uniform, say it once at the top and drop the per-question marks entirely. The paper gets quieter and nothing is lost.

## The mark column

Where marks vary within a section, they go in a right-hand column, aligned, in brackets or without them but consistently either way. Not trailing the question text. A student scanning for the five-markers should be able to run their eye down one edge of the page.

Right-aligned marks also survive a question wrapping to a second line, which is where inline marks fall apart. The number ends up stranded in the middle of the page next to a fragment of question.

## Numbering

Number questions continuously across the whole paper, not restarting at each section. Question 14 should exist exactly once. When a student writes "Q14" in their answer booklet and the paper has three of them, the marking gets slower and someone eventually gets it wrong.

Sub-parts take (a), (b), (c). Sub-sub-parts take (i), (ii), (iii). Going a level deeper than that is a sign the question should be split.

## Choice

"Attempt any one" needs to be visually unmissable. The convention that works is a centred **OR** between the two alternatives, on its own line, with space above and below. Not a note in the margin. Not a parenthesis at the end of the first option.

## What to check before printing

Read the paper once as a student, from the top, without skipping. Time yourself on the first three questions and multiply out. If your own timing is close to the allowed duration, the paper is too long, because you already know the answers.

Then check the arithmetic: section marks must sum to the maximum marks in the header. This is the error that survives every proofread, because everyone reads the questions and nobody adds up the numbers.

Docraft handles the numbering and the mark column for you. Type your questions as numbered lines, write \`Section A\` on a line of its own to start a section, put \`[2]\` at the end of a question to set its marks, and the layout arrives already aligned. If you renumber or reorder later, the paper renumbers itself.

[Start a question paper](/workspace/question-paper-classic)
`,
};
