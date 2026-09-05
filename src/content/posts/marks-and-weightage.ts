import type { Post } from '@/lib/blog/types';

export const post: Post = {
  slug: 'marks-and-weightage',
  title: 'Distributing marks across a paper without the totals drifting',
  seoTitle: 'Distributing marks across a paper',
  summary:
    'A method for planning weightage by topic and difficulty before you write a single question, and the arithmetic check that catches the usual mistake.',
  topic: 'exams',
  published: '2026-01-22',
  readingMinutes: 6,
  body: `
Most papers are written question first and totalled afterwards. That order is why so many drafts end at 78 marks, or cover one chapter twice and another not at all. Planning the distribution first takes fifteen minutes and removes both problems.

## Build the blueprint before the questions

Draw a small grid. Topics down the side, mark values across the top.

| Topic | 1 mark | 2 marks | 3 marks | 5 marks | Total |
|---|---|---|---|---|---|
| Chapter 1 | 2 | 1 | 1 | — | 7 |
| Chapter 2 | 3 | 2 | 1 | 1 | 15 |
| Chapter 3 | 1 | 1 | 2 | 1 | 14 |

Fill in counts, not questions. You are deciding shape, not content. The total column tells you immediately whether the weighting matches how long you actually spent teaching each chapter, which is the fairness test that matters most to students.

Only when the grid totals correctly do you write the questions.

## Match weight to teaching time, then adjust

The default is proportional: a chapter that took three weeks carries more marks than one that took one. Deviate deliberately, not accidentally.

Reasons to deviate that hold up:

- A topic is foundational and will be examined again later, so it is tested lightly now
- A topic is genuinely harder, so it needs more marks to be worth the time it will consume
- The syllabus specifies weightage, in which case the syllabus wins

Reasons that do not hold up: the chapter you enjoy teaching, or the chapter you happen to have good questions for already.

## Difficulty split

A common and reasonable split is around a third straightforward recall, half application, and the remainder genuinely demanding. Different boards phrase this differently, but the shape is similar.

The purpose of the easy third is not generosity. It is that a paper with no accessible questions at the start produces panic in the first five minutes, and a panicked student underperforms on questions they could otherwise answer. Open with something answerable.

Put the hardest question late but not last. The final question is often reached with the least time, and burying your best discriminator there means measuring who was fast rather than who understood.

## Internal choice

Choice makes the paper fairer to students who missed a week of school, and harder to compare across a cohort. Both are true.

Where you offer it, keep the alternatives genuinely equivalent. Two questions worth five marks each, both on the same topic, at the same difficulty. A choice between an easy question and a hard one is not choice, it is a trap for the student who reads the second option first and commits.

Mark the choice with a centred **OR**. Never let a student have to infer it.

## The arithmetic check

Three totals must agree:

1. The maximum marks printed in the header
2. The sum of the section totals
3. The sum of every individual question's marks

They disagree more often than anyone expects, usually because a question was edited late and its mark value changed in the text but not in the section line.

Check it last, after the final edit, and check it by adding rather than by remembering what it was supposed to be.

> If the paper carries internal choice, count each choice group once, at the value of one alternative. Counting both is the second most common way a total comes out wrong.

## Time per mark

A rough sanity check: students need roughly a minute and a half per mark for written subjects, and rather less for objective questions. A three-hour paper of eighty marks is comfortable. The same eighty marks in two hours is a speed test.

Add reading time on top rather than inside. Fifteen minutes of reading time that comes out of the writing time is not reading time.

## Recording it

Keep the blueprint grid with the paper. Next year you will want to write a different paper of the same shape, and the grid is the part worth reusing. The questions should change; the distribution usually should not.

In Docraft, writing \`[2]\` at the end of a question line sets its marks, and the section totals are derived rather than typed. When you change a question from three marks to five, nothing else needs updating by hand.

[Set up a paper](/workspace/question-paper-classic)
`,
};
