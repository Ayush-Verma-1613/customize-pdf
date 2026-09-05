import type { Post } from '@/lib/blog/types';

export const post: Post = {
  slug: 'general-instructions',
  title: 'Writing the general instructions block students will actually read',
  seoTitle: 'Writing exam general instructions',
  summary:
    'Why the instructions get skipped, and how to write eight lines that survive being skimmed in ten seconds.',
  topic: 'exams',
  published: '2026-02-03',
  readingMinutes: 5,
  body: `
Ask a class of students after an exam how many read the instructions in full. The honest answer is usually a quarter of them. Ask how many lost marks to something the instructions covered, and the number is higher than it should be.

The instinct is to write more. The fix is to write less, and to write it in a shape that survives skimming.

## Why the block gets skipped

Three reasons, all of them the paper's fault:

- It is a paragraph. Paragraphs signal prose, and students in an exam do not read prose that is not a question.
- It repeats what the paper already shows. If Section A visibly contains twenty questions, "Section A contains twenty questions" is noise, and noise teaches readers to skip the whole block.
- It is written for the invigilator, not the student. Rules about answer booklets and margins matter to someone, but not to the person deciding how to spend the next three hours.

## The shape that works

Numbered lines. One instruction per line. Six to eight lines total.

A student skimming reads the first three or four words of each line and stops when nothing surprises them. So put the surprising word first.

Weak: *All questions are compulsory except in Section D where internal choice has been provided.*

Better: **Internal choice** is provided in Section D only. All other questions are compulsory.

The second version puts the thing they need to know at the front of the line, where a skim will catch it.

## What belongs in the block

1. Total questions, and whether all are compulsory
2. The sections, with the mark value of each
3. Internal choice: where it exists, and how many to attempt
4. Permitted equipment: calculator, log tables, geometry box, graph paper
5. Reading time, if given
6. Anything genuinely unusual about this paper

That is it. Six lines covers almost every paper.

## What does not belong

**Instructions about handwriting and neatness.** They change nothing. A student who can write neatly under time pressure already is; one who cannot will not start because the paper asked.

**Warnings about malpractice.** These belong on the wall and in the briefing, not in the space where a student is trying to plan their time.

**Restating the header.** Time and maximum marks are already at the top. Printing them again halves the attention paid to both copies.

**Anything conditional and rare.** "Students taking the paper in Hindi should note..." is for a different sheet, or for the small number of students it applies to, delivered directly.

## Bold the expensive line

One instruction in a typical paper is worth more than the rest combined: the internal choice line. A student who misses it either answers both alternatives, losing time, or answers neither, losing marks.

Set that one line in bold. Exactly one. Bolding three lines is the same as bolding none, and bolding the whole block makes the paper look like it is shouting.

> If your paper has no internal choice, say so explicitly in one short line. "All questions are compulsory." Students look for the choice line; if it is absent they wonder whether they missed it.

## Position

Directly under the header, above the first question, with clear space on both sides. Not in a box with a border, which reads as decoration and gets skipped along with the rest of the furniture. Not in a smaller size than the questions, which signals that it matters less.

Slightly smaller than the question text is acceptable. Two sizes smaller is a message that the block is optional.

## Read it back at speed

The test that catches most problems: read the block out loud at the speed of someone who is anxious and in a hurry. Anything you stumble on, a student will skip. Anything that takes more than one breath is two lines pretending to be one.

Docraft treats the instructions as a block distinct from the questions, so it keeps its own spacing and does not get swept into the numbering. Type your instruction lines, and question numbering starts after them.

[Open a paper template](/workspace/question-paper-classic)
`,
};
