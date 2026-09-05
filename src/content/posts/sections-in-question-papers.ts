import type { Post } from '@/lib/blog/types';

export const post: Post = {
  slug: 'sections-in-question-papers',
  title: 'Splitting a paper into sections, and when not to',
  seoTitle: 'Sections in a question paper',
  summary:
    'Sections help students budget time and hurt when they fragment a short paper. How to decide, and how to set the section line.',
  topic: 'exams',
  published: '2026-05-07',
  readingMinutes: 4,
  body: `
Sections group questions of the same mark value so a student can plan. That is the whole benefit, and it is a real one: a student who can see that Section C is four five-mark questions knows to keep forty minutes for it.

The cost is fragmentation. A short paper cut into five sections spends most of its page area on section headers and instructions.

## When sections earn their place

Use them when:

- The paper carries at least three distinct mark values
- Each section has at least three questions
- The mark values differ enough to change how a student allocates time

A paper of twenty questions in four sections of five is well served. A paper of eight questions in four sections of two is not; the sections are noise, and the mark value beside each question would have carried the same information more quietly.

## When to skip them

Short papers, class tests, and anything under about twelve questions. Print the marks in a right-hand column and let the paper run continuously.

Also skip them when the questions are all the same value. A section header that says every question is worth two marks, over a paper where every question is worth two marks, is a header saying nothing.

## The section line

One line, set apart, carrying three things: which section, what kind of question, and what each is worth.

**Section B — Short answer. Questions 8 to 15 carry 2 marks each.**

That single line lets you drop the mark figure from eight questions. The paper gets quieter, and the information is more visible than it was when scattered.

Where a section is not uniform, say the range instead and keep the per-question marks:

**Section C — Long answer. Questions 16 to 20, marks as shown.**

## Setting it apart

The section line needs to read as structural rather than as another question. What works:

- Extra space above, more than between questions, and less space below so it attaches to what follows
- Bold, at the same size as the body or one step up
- Optionally a thin rule above it, running the text width

What does not work: a filled box, a different colour, or centring. Centring breaks the left edge that the question numbers establish, and the eye loses the column.

## Order the sections by mark value

Ascending, almost always. One-mark questions first, five-mark questions last.

The reason is warm-up: a student answering short factual questions in the first ten minutes settles, and arrives at the demanding questions already working. Opening with a five-mark essay produces a blank ten minutes.

The exception is a paper where the long questions carry the bulk of the marks and time is tight, where some teachers put one long question early to guarantee it gets attempted. That is a defensible choice, but make it deliberately.

## Sections and choice

Keep internal choice inside a section rather than across sections. A choice between a Section B question and a Section D question breaks both sections' totals and confuses the count.

State the choice in the section line as well as at the question:

**Section D — Long answer. Questions 21 to 24 carry 5 marks each. Internal choice is provided in questions 23 and 24.**

## Do not restart numbering

Sections group questions; they do not renumber them. Section B starting again at question 1 produces two question 1s in the paper, and a marker with an answer labelled Q1 has to guess.

Continuous numbering across the whole paper, always.

In Docraft, writing a line that begins with \`Section\` starts a new section, and the questions under it keep numbering from where the previous section stopped. Section totals are added up from the questions inside rather than typed.

[Open a paper template](/workspace/question-paper-classic)
`,
};
