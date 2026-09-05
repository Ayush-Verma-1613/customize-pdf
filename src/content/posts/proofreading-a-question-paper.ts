import type { Post } from '@/lib/blog/types';

export const post: Post = {
  slug: 'proofreading-a-question-paper',
  title: 'A proofreading pass that catches what reading the paper does not',
  seoTitle: 'How to proofread a question paper',
  summary:
    'Five separate checks, each looking at one thing, because reading the whole paper carefully finds fewer errors than five quick targeted passes.',
  topic: 'exams',
  published: '2026-04-09',
  readingMinutes: 5,
  body: `
Careful reading is a poor way to proofread a question paper. You wrote the questions, so you read what you meant rather than what is on the page, and the errors that matter most are not in the prose at all.

Five short passes, each looking for one thing, find more than one slow read.

## Pass one: the numbers only

Read the question numbers aloud, ignoring the questions. One, two, three, four.

You are checking for a gap or a repeat left by a late edit. This takes fifteen seconds and catches the error that a full read is structurally incapable of finding, because in a full read the numbers are furniture.

Do the same for sub-parts within each question.

## Pass two: the arithmetic

Three totals, added independently:

- Every individual question's marks
- Every section's stated total
- The maximum marks in the header

All three must agree. Where there is internal choice, count the group once.

Add them with a calculator rather than in your head. This is not a difficult sum, which is exactly why people do it carelessly.

## Pass three: answer every question

Not in your head. On paper, at speed, as a student would.

This is the pass that finds:

- The question that cannot be answered from the syllabus taught
- The question whose answer is given away by a later question
- The diagram referred to but not printed
- The question with two defensible answers
- The five-mark question that takes twelve minutes

Time yourself. If your total is more than about half the exam duration, the paper is too long, because you are not searching your memory, deciding between approaches, or checking your work.

## Pass four: read it as an anxious student

Read only the instructions and the section headers, quickly, the way someone does when they are nervous and want to start.

Ask at each point: could this be misread? "Attempt any five questions" in a section of eight, where two of the eight are themselves choices, is a sentence that needs rewriting even though it is technically correct.

Look especially for instructions that contradict each other. A general instruction saying all questions are compulsory, and a section header offering choice, is common and expensive.

## Pass five: the physical object

Print it, staple it, and look at it as a thing rather than as a document.

- Is a question split across a page break in a way that hides the second half?
- Does a diagram sit on a different page from its question?
- Is the last page nearly empty?
- Are the page numbers right, and does the last one say the right total?
- Does anything get clipped at the edges?

A question split across pages is the one that costs students most, because they answer the visible half and move on.

> Keep a question and its parts on one page wherever possible, even at the cost of some white space on the page before. White space costs nothing; a half-read question costs marks.

## Get a second reader

Someone who did not write the paper, ideally someone who teaches the subject. Give them twenty minutes and ask them for two specific things: any question they would answer differently, and any instruction they would read twice.

Do not ask "does this look alright". They will say yes.

## The pass to do last

After every edit, re-run pass one and pass two. The most common source of a broken paper is a correction made after the checks, and edits made late are made in a hurry.

Docraft removes two of these passes by construction: numbering is derived from the order of your questions rather than typed, and the section and paper totals are calculated from the marks you set on each question. The other three still need you.

[Open the editor](/workspace)
`,
};
