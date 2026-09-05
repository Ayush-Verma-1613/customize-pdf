import type { Post } from '@/lib/blog/types';

export const post: Post = {
  slug: 'reusing-papers',
  title: 'Reusing last year’s paper without reusing last year’s questions',
  seoTitle: 'Reusing last year\'s question paper',
  summary:
    'Keep the structure, replace the content: how to build a paper bank that saves real time without the questions leaking.',
  topic: 'exams',
  published: '2026-04-16',
  readingMinutes: 4,
  body: `
The work in a question paper is not typing it. It is deciding the shape: how many questions, at what mark values, covering which topics, in what order. That decision is worth keeping and reusing. The questions themselves are worth replacing every year.

Most teachers do the opposite, keeping the file and editing the questions inside it until the structure has drifted into something nobody chose.

## Separate the blueprint from the questions

Keep two things.

**The blueprint** is the grid: topics against mark values, with counts. It is a page long, changes rarely, and is the thing you actually reuse.

**The question bank** is a growing collection of questions, tagged by topic, mark value and difficulty. It grows every year and is never reused wholesale.

Writing this year's paper is then: take the blueprint, draw questions from the bank against it, write new ones for the gaps.

## Why questions leak

Papers circulate. A paper set in one section is discussed at lunch before the other section sits it. Older siblings keep their papers. Coaching centres collect them systematically.

Assume every question you have used is available to some students and not others. That is not a reason for paranoia; it is a reason not to reuse a whole paper, because reusing the whole paper converts an exam into a test of who had access.

Reusing individual questions is different and mostly fine, particularly for standard items where the answer is in every textbook anyway.

## Tag as you write

When a question goes into the bank, record with it:

- Topic and sub-topic
- Mark value
- Difficulty, roughly
- Which paper it has appeared in, and when

That last field is the one that pays for the whole exercise. Without it, you will re-use a question from two years ago and only find out when a student mentions it.

## Vary the question, not just the numbers

Changing the numbers in a calculation produces a question that looks new and tests nothing new. Students who have the old paper have the method, which is the part that matters.

Better variations, in rough order of how much they actually change:

- Ask for the same concept applied in a different context
- Give the answer and ask for the reasoning
- Invert it: supply the result, ask for the input
- Ask which of two approaches is appropriate and why

## Keep the file, not the print

Keep the source document, not a scan of the printed paper. Next year you want to edit it, and editing a scan means retyping it.

Name it so you can find it: subject, class, exam, year. \`Class9-Science-HalfYearly-2026\`. Not \`paper final FINAL v3\`.

## Review what the marks told you

After marking, note on the paper itself which questions did badly and whether that was the teaching or the question. A question where most of the class scored zero is either a hard question or an unclear one, and you will not remember which by next year.

That annotated copy is worth more than the clean one when you come to write the next paper.

Docraft keeps your documents in the browser, so last year's paper opens as an editable document rather than a scan. Duplicate it, swap the questions, and the numbering and totals adjust themselves.

[Open your documents](/workspace)
`,
};
