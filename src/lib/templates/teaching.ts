import { createDocument, makeRow, makeTable, text } from '@/lib/model/factory';
import type { Block, PaperDoc } from '@/lib/model/types';
import { parseContent } from '@/lib/parse/content';
import { uid } from '@/lib/utils/id';
import {
  answerLines,
  boxedNote,
  bullets,
  divider,
  fillInStrip,
  field,
  heading,
  infoStrip,
  para,
  spacer,
  type TemplateDef,
  type TemplateInput,
} from './kit';

const SCHOOL_FIELDS = [
  { key: 'school', label: 'School name', placeholder: 'Green Valley Public School' },
  { key: 'exam', label: 'Examination', placeholder: 'Half Yearly Examination 2025-26' },
  { key: 'subject', label: 'Subject', placeholder: 'Science' },
  { key: 'class', label: 'Class', placeholder: 'VIII' },
  { key: 'time', label: 'Time allowed', placeholder: '3 Hours' },
  { key: 'maxMarks', label: 'Maximum marks', placeholder: '80' },
];

const DEFAULT_INSTRUCTIONS = [
  'All questions are compulsory unless stated otherwise.',
  'Write your answers in the space provided.',
  'Marks for each question are indicated against it.',
  'Draw neat, labelled diagrams wherever necessary.',
  'Read every question carefully before answering.',
];

/** Body used when the teacher has not pasted any content yet. */
function starterBody(): Block[] {
  const parsed = parseContent(
    [
      'Section A',
      'Instructions: All questions in this section are compulsory.',
      '',
      '1. Replace this line with your first question. [2]',
      '2. Replace this line with your second question. [2]',
      '',
      'Section B',
      '',
      '3. Longer questions go here. [5]',
    ].join('\n'),
  );
  return parsed.blocks;
}

const bodyOr = (input: TemplateInput) =>
  input.body.length ? input.body : starterBody();

/* ------------------------------------------------------------------ *
 * Question paper - classic
 * ------------------------------------------------------------------ */

/** The centred school masthead shared by the classic paper and the booklet. */
function classicMasthead(f: Record<string, string>): Block[] {
  return [
    heading(text(field(f, 'school', 'School Name').toUpperCase(), { letterSpacing: 1.2 }), 1, {
      spaceBefore: 4,
      spaceAfter: 2,
      size: 17,
    }),
    para(text(field(f, 'exam', 'Annual Examination'), { bold: true }), {
      align: 'center',
      size: 12,
      spaceAfter: 6,
    }),
    divider('#374151', 1, { spaceAfter: 6 }),
    infoStrip(
      [
        [`Subject: ${field(f, 'subject', '—')}`, `Time: ${field(f, 'time', '—')}`],
        [`Class: ${field(f, 'class', '—')}`, `Maximum Marks: ${field(f, 'maxMarks', '—')}`],
      ],
      { bold: true, size: 10.5 },
    ),
    divider('#374151', 1, { spaceBefore: 6, spaceAfter: 8 }),
    ...boxedNote('General Instructions', DEFAULT_INSTRUCTIONS),
  ];
}

function classicQuestionPaper(input: TemplateInput): PaperDoc {
  const f = input.fields;
  const doc = createDocument(input.title || 'Question paper');

  doc.theme = {
    ...doc.theme,
    bodyFamily: 'Tinos',
    headingFamily: 'Tinos',
    bodySize: 11,
    lineHeight: 1.38,
  };
  doc.page.margins = { top: 42, right: 44, bottom: 46, left: 44 };
  doc.page.border = { color: '#374151', width: 0.9, inset: 24, style: 'solid', radius: 2 };
  doc.fields = { ...f };

  doc.master.footer = {
    ...doc.master.footer,
    enabled: true,
    slots: {
      left: text(field(f, 'subject', 'Subject')),
      center: [{ text: 'Page {{page}} of {{pages}}' }],
      right: text(`Class ${field(f, 'class', '—')}`),
    },
    style: { size: 8.5, color: '#6b7280', family: 'Tinos' },
    rule: true,
    showOnFirstPage: false,
  };

  doc.flow = [
    ...classicMasthead(f),
    ...bodyOr(input),
    spacer(10),
    para(text('— End of Question Paper —', { bold: true }), {
      align: 'center',
      color: '#6b7280',
      size: 10,
      spaceBefore: 10,
    }),
  ];

  return doc;
}

/* ------------------------------------------------------------------ *
 * Question paper - modern
 * ------------------------------------------------------------------ */

function modernQuestionPaper(input: TemplateInput): PaperDoc {
  const f = input.fields;
  const doc = createDocument(input.title || 'Question paper');

  doc.theme = {
    bodyFamily: 'Arimo',
    headingFamily: 'Inter',
    bodySize: 10.5,
    lineHeight: 1.45,
    textColor: '#0f172a',
    accent: '#1d4ed8',
    muted: '#64748b',
    headingScale: [1.9, 1.32, 1.14, 1.02],
  };
  doc.page.margins = { top: 54, right: 52, bottom: 54, left: 52 };
  doc.fields = { ...f };
  doc.numbering = { ...doc.numbering, questionFormat: 'Q{n}.', marksFormat: '{n} marks' };

  doc.master.header = {
    ...doc.master.header,
    enabled: true,
    slots: {
      left: text(field(f, 'school', 'School')),
      center: [],
      right: text(field(f, 'exam', '')),
    },
    style: { size: 8.5, color: '#94a3b8', family: 'Inter' },
    rule: true,
    ruleColor: '#e2e8f0',
    showOnFirstPage: false,
  };
  doc.master.footer = {
    ...doc.master.footer,
    slots: { left: [], center: [{ text: '{{page}} / {{pages}}' }], right: [] },
    style: { size: 8.5, color: '#94a3b8', family: 'Inter' },
  };

  const meta = makeTable(
    [1, 1, 1, 1],
    [
      makeRow(
        [
          text('SUBJECT', { size: 7.5, color: '#64748b', letterSpacing: 0.8 }),
          text('CLASS', { size: 7.5, color: '#64748b', letterSpacing: 0.8 }),
          text('TIME', { size: 7.5, color: '#64748b', letterSpacing: 0.8 }),
          text('MAX MARKS', { size: 7.5, color: '#64748b', letterSpacing: 0.8 }),
        ],
        { isHeader: true },
      ),
      makeRow([
        text(field(f, 'subject', '—'), { bold: true, size: 11 }),
        text(field(f, 'class', '—'), { bold: true, size: 11 }),
        text(field(f, 'time', '—'), { bold: true, size: 11 }),
        text(field(f, 'maxMarks', '—'), { bold: true, size: 11 }),
      ]),
    ],
    {
      border: { color: 'transparent', width: 0, style: 'solid' },
      innerBorder: null,
      cellPadding: { top: 3, right: 8, bottom: 3, left: 0 },
      repeatHeader: false,
    },
  );
  meta.rows.forEach((r) => r.cells.forEach((c) => (c.align = 'left')));

  doc.flow = [
    para(text(field(f, 'school', 'School Name').toUpperCase(), {
      bold: true,
      size: 8.5,
      color: '#1d4ed8',
      letterSpacing: 1.6,
      family: 'Inter',
    }), { spaceAfter: 2 }),
    heading(field(f, 'exam', 'Half Yearly Examination'), 1, {
      align: 'left',
      spaceAfter: 10,
      size: 22,
    }),
    meta,
    divider('#e2e8f0', 1, { spaceBefore: 10, spaceAfter: 12 }),
    ...boxedNote('Before you begin', DEFAULT_INSTRUCTIONS.slice(0, 4)),
    ...bodyOr(input),
  ];

  return doc;
}

/* ------------------------------------------------------------------ *
 * Worksheet
 * ------------------------------------------------------------------ */

function worksheet(input: TemplateInput): PaperDoc {
  const f = input.fields;
  const doc = createDocument(input.title || 'Worksheet');

  doc.theme = {
    ...doc.theme,
    bodyFamily: 'Arimo',
    headingFamily: 'Inter',
    bodySize: 11,
    lineHeight: 1.6,
    accent: '#0d9488',
  };
  doc.page.margins = { top: 48, right: 48, bottom: 52, left: 48 };
  doc.fields = { ...f };
  doc.master.footer = {
    ...doc.master.footer,
    slots: {
      left: text(field(f, 'subject', '')),
      center: [],
      right: [{ text: 'Page {{page}}' }],
    },
  };

  doc.flow = [
    para(text(field(f, 'subject', 'Subject').toUpperCase(), {
      bold: true,
      size: 8.5,
      color: '#0d9488',
      letterSpacing: 1.6,
      family: 'Inter',
    }), { spaceAfter: 1 }),
    heading(field(f, 'topic', input.title || 'Worksheet'), 1, { align: 'left', spaceAfter: 8, size: 20 }),
    fillInStrip(['Name', 'Class', 'Date']),
    divider('#cbd5e1', 0.75, { spaceBefore: 4, spaceAfter: 12 }),
    ...(input.body.length
      ? input.body
      : [
          para(text('Instructions: ', { bold: true }).concat(
            text('Answer all the questions in the space provided.'),
          ), { spaceAfter: 10 }),
          ...parseWorksheetStarter(),
        ]),
  ];

  return doc;
}

function parseWorksheetStarter(): Block[] {
  return parseContent(
    [
      '1. Write your first exercise here.',
      '[[lines:3]]',
      '2. Write your second exercise here.',
      '[[lines:3]]',
      '3. Match the following.',
      '',
      '| Column A | Column B |',
      '| --- | --- |',
      '| Item one | Match one |',
      '| Item two | Match two |',
    ].join('\n'),
  ).blocks;
}

/* ------------------------------------------------------------------ *
 * Assignment
 * ------------------------------------------------------------------ */

function assignment(input: TemplateInput): PaperDoc {
  const f = input.fields;
  const doc = createDocument(input.title || 'Assignment');
  doc.theme = { ...doc.theme, bodyFamily: 'Arimo', headingFamily: 'Inter', bodySize: 11 };
  doc.fields = { ...f };
  doc.page.margins = { top: 56, right: 56, bottom: 56, left: 56 };

  doc.flow = [
    heading(field(f, 'title', input.title || 'Assignment 1'), 1, { align: 'left', spaceAfter: 4, size: 20 }),
    para(
      text(
        `${field(f, 'subject', 'Subject')} · Class ${field(f, 'class', '—')} · Due ${field(f, 'due', '—')}`,
        { color: '#64748b' },
      ),
      { spaceAfter: 10 },
    ),
    divider('#e2e8f0', 1, { spaceAfter: 12 }),
    heading('Objective', 3),
    para(field(f, 'objective', 'Describe what students should be able to do after this assignment.')),
    heading('Submission guidelines', 3),
    bullets([
      'Submit a single PDF or a neatly written copy.',
      'Write your name and roll number on the first page.',
      'Late submissions lose 10% per day.',
    ]),
    heading('Tasks', 3),
    ...(input.body.length ? input.body : starterBody()),
    spacer(8),
    heading('Marking scheme', 3),
    makeTable(
      [3, 1],
      [
        makeRow([text('Criterion', { bold: true }), text('Marks', { bold: true })], { isHeader: true }),
        makeRow(['Understanding of the concept', '10']),
        makeRow(['Accuracy and working', '10']),
        makeRow(['Presentation', '5']),
      ],
      { zebra: '#f8fafc' },
    ),
  ];

  return doc;
}

/* ------------------------------------------------------------------ *
 * Exam with a cover page
 * ------------------------------------------------------------------ */

function examBooklet(input: TemplateInput): PaperDoc {
  const f = input.fields;
  const doc = classicQuestionPaper(input);
  doc.title = input.title || 'Examination booklet';

  const detailTable = (rows: [string, string][], minHeight?: number) => {
    const table = makeTable(
      [1, 2],
      rows.map(([label, value]) =>
        makeRow([text(label, { bold: true }), value], minHeight ? { minHeight } : {}),
      ),
      { widthFactor: 0.72 },
    );
    table.style = { align: 'center' };
    return table;
  };

  doc.flow = [
    spacer(48),
    heading(text(field(f, 'school', 'School Name').toUpperCase(), { letterSpacing: 2 }), 1, {
      size: 20,
      spaceAfter: 6,
    }),
    para(text(field(f, 'exam', 'Annual Examination'), { bold: true, size: 13 }), {
      align: 'center',
      spaceAfter: 24,
    }),
    detailTable([
      ['Subject', field(f, 'subject', '—')],
      ['Class', field(f, 'class', '—')],
      ['Time allowed', field(f, 'time', '—')],
      ['Maximum marks', field(f, 'maxMarks', '—')],
    ]),
    spacer(28),
    detailTable(
      [
        ["Student's name", ''],
        ['Roll number', ''],
        ['Invigilator', ''],
      ],
      26,
    ),
    spacer(24),
    ...boxedNote('Instructions to candidates', DEFAULT_INSTRUCTIONS),
    { id: uid('b'), type: 'pageBreak' },
    ...bodyOr(input),
  ];

  return doc;
}

/* ------------------------------------------------------------------ *
 * Answer sheet
 * ------------------------------------------------------------------ */

function answerSheet(input: TemplateInput): PaperDoc {
  const f = input.fields;
  const doc = createDocument(input.title || 'Answer sheet');
  doc.theme = { ...doc.theme, bodyFamily: 'Arimo', bodySize: 11 };
  doc.page.margins = { top: 48, right: 48, bottom: 52, left: 56 };
  doc.fields = { ...f };
  doc.master.footer = {
    ...doc.master.footer,
    slots: { left: [], center: [], right: [{ text: 'Page {{page}} of {{pages}}' }] },
  };

  doc.flow = [
    heading(field(f, 'school', 'School Name'), 2, { align: 'center', spaceAfter: 4 }),
    para(text(`${field(f, 'subject', 'Subject')} — Answer Sheet`, { bold: true }), {
      align: 'center',
      spaceAfter: 10,
    }),
    fillInStrip(['Name', 'Roll No', 'Class', 'Date']),
    divider('#94a3b8', 1, { spaceBefore: 2, spaceAfter: 14 }),
    answerLines(26),
  ];

  return doc;
}

export const TEACHING_TEMPLATES: TemplateDef[] = [
  {
    id: 'question-paper-classic',
    name: 'Question paper — classic',
    category: 'Teaching',
    description:
      'The familiar bordered exam layout: centred school masthead, subject and marks strip, boxed instructions, auto-numbered questions with a marks column.',
    preview: ['GREEN VALLEY PUBLIC SCHOOL', 'Subject: Science      Time: 3 Hours'],
    accent: '#1d4ed8',
    fields: SCHOOL_FIELDS,
    acceptsContent: true,
    build: classicQuestionPaper,
  },
  {
    id: 'question-paper-modern',
    name: 'Question paper — modern',
    category: 'Teaching',
    description:
      'A cleaner, left-aligned take with a metadata strip and generous spacing. Good for printed handouts and for sharing as a PDF.',
    preview: ['HALF YEARLY EXAMINATION', 'SUBJECT   CLASS   TIME   MAX MARKS'],
    accent: '#0f172a',
    fields: SCHOOL_FIELDS,
    acceptsContent: true,
    build: modernQuestionPaper,
  },
  {
    id: 'exam-booklet',
    name: 'Exam booklet',
    category: 'Teaching',
    description:
      'Adds a full cover page with candidate details and instructions, then continues with the classic question layout.',
    preview: ['Cover page + candidate details', 'Questions start on page 2'],
    accent: '#7c3aed',
    fields: SCHOOL_FIELDS,
    acceptsContent: true,
    build: examBooklet,
  },
  {
    id: 'worksheet',
    name: 'Worksheet',
    category: 'Teaching',
    description:
      'Practice sheet with a name/class/date strip, exercises and ruled answer space.',
    preview: ['Name: ____  Class: ____  Date: ____', '1. Exercise one'],
    accent: '#0d9488',
    fields: [
      { key: 'subject', label: 'Subject', placeholder: 'Mathematics' },
      { key: 'topic', label: 'Topic', placeholder: 'Fractions — practice set 2' },
    ],
    acceptsContent: true,
    build: worksheet,
  },
  {
    id: 'assignment',
    name: 'Assignment',
    category: 'Teaching',
    description:
      'Objective, submission guidelines, task list and a marking-scheme table.',
    preview: ['Objective · Guidelines · Tasks', 'Marking scheme table'],
    accent: '#ea580c',
    fields: [
      { key: 'title', label: 'Assignment title', placeholder: 'Assignment 1 — Algebra' },
      { key: 'subject', label: 'Subject', placeholder: 'Mathematics' },
      { key: 'class', label: 'Class', placeholder: 'IX' },
      { key: 'due', label: 'Due date', placeholder: '12 September' },
      { key: 'objective', label: 'Objective', placeholder: 'What students should achieve' },
    ],
    acceptsContent: true,
    build: assignment,
  },
  {
    id: 'answer-sheet',
    name: 'Answer sheet',
    category: 'Teaching',
    description: 'Ruled answer pages with a candidate detail strip at the top.',
    preview: ['Name / Roll No / Class / Date', '26 ruled lines per page'],
    accent: '#4f46e5',
    fields: [
      { key: 'school', label: 'School name', placeholder: 'Green Valley Public School' },
      { key: 'subject', label: 'Subject', placeholder: 'Science' },
    ],
    acceptsContent: false,
    build: answerSheet,
  },
];

export { starterBody, DEFAULT_INSTRUCTIONS, SCHOOL_FIELDS };
