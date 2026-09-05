import type { Post } from '@/lib/blog/types';

export const post: Post = {
  slug: 'school-notice-format',
  title: 'Writing a school notice that gets read from two metres away',
  seoTitle: 'School notice format',
  summary:
    'The five things a notice must answer, the size it has to be set at, and the common layout that hides the date.',
  topic: 'admin',
  published: '2026-04-02',
  readingMinutes: 4,
  body: `
A notice on a board competes with a corridor full of people moving. It has about two seconds to establish whether it is relevant, and if it wins those two seconds it gets maybe fifteen more.

Everything about the format follows from that.

## The five questions

A notice answers, in this order:

1. **What** is happening
2. **Who** it applies to
3. **When**
4. **Where**
5. **What to do about it**

If any of the first four is missing, the notice generates questions instead of answering them, and those questions arrive at the staffroom.

## The heading is the what and the who

Not "NOTICE". Every notice is a notice; the word carries no information and it is usually the largest thing on the page.

**Class 9 Science Practical — Thursday 14 May** tells a passing student in two seconds whether to keep reading. "NOTICE" tells them nothing and costs them the two seconds anyway.

Set it large. 20 to 24pt for a board notice. If the board is in a busy corridor, larger.

## Date it twice

Two dates matter and they are different:

- The date the notice was **issued**, top right, small
- The date the event **happens**, in the heading, large

Notices without an issue date accumulate on boards for months and nobody can tell which are current. Notices without the event date in the heading force a full read to find out whether they are relevant.

The common failure is putting the issue date large at the top and the event date buried in the third line of the body.

## Body

Short. Four to six lines. A notice is not a letter.

Each line one fact. Where there is a list of names, times or requirements, set it as a list rather than as a sentence containing commas.

Do not open with "It is hereby informed that all the students of Class 9 are required to note that". Open with the fact. "Class 9 practical examinations begin on Thursday 14 May."

## Signature block

Bottom right: name, designation, date. A notice without an attributable author is ignorable, and one from a named head of department is not.

## Size and spacing

For a board notice read standing:

| Element | Size |
|---|---|
| Heading | 22 to 28pt |
| Body | 14 to 16pt |
| Signature block | 12pt |
| Issue date | 11pt |

The body size is the one people get wrong. 11pt is a letter size, meant to be read at 40cm. On a board it is invisible from the far side of the corridor, and the notice is effectively only for people who already stopped.

## White space is what makes it visible

A notice that fills its sheet reads as dense and gets skipped. One that uses two-thirds of the sheet with clear margins reads as important.

This is counterintuitive when paper feels scarce, but a notice nobody reads has wasted the whole sheet rather than a third of it.

## One notice, one subject

Two announcements on one sheet means the second is read by roughly half as many people. Print two sheets.

## For notices going home

Different constraints. It will be read at 40cm by an adult, possibly in a second language, so 12pt body is fine and completeness matters more than brevity.

Add a tear-off acknowledgement slip at the foot if you need a reply, separated by a dashed rule, with the student's name, class and a signature line. Keep the slip's information self-contained, because once it is torn off the rest of the notice is gone.

Docraft's notice template sets the heading scale, the date positions and the signature block, including the tear-off variant.

[Open a notice template](/workspace/notice)
`,
};
