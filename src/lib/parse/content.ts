import { makeRow, makeTable, text } from '@/lib/model/factory';
import type { Block, QuestionBlock, QuestionPart, Run, TableRow } from '@/lib/model/types';
import { uid } from '@/lib/utils/id';
import { parseInline } from './inline';

/**
 * Turns the plain text a teacher types (or pastes out of Word) into structured
 * blocks. Every rule below is a fixed pattern - there is no guessing and no
 * model involved - so the same input always produces the same document, and the
 * legend shown in the import panel is the complete specification.
 */

export interface ParseResult {
  blocks: Block[];
  /** Key/value pairs harvested from the "Subject: Science" style header. */
  fields: Record<string, string>;
  /** Warnings surfaced to the user, e.g. an option with no question above it. */
  notes: string[];
}

/** Canonical field names we recognise in the header block. */
const FIELD_ALIASES: Record<string, string> = {
  school: 'school',
  'school name': 'school',
  institution: 'school',
  exam: 'exam',
  'exam name': 'exam',
  examination: 'exam',
  test: 'exam',
  subject: 'subject',
  paper: 'subject',
  class: 'class',
  grade: 'class',
  standard: 'class',
  section: 'classSection',
  time: 'time',
  duration: 'time',
  'time allowed': 'time',
  marks: 'maxMarks',
  'max marks': 'maxMarks',
  'maximum marks': 'maxMarks',
  'total marks': 'maxMarks',
  date: 'date',
  teacher: 'teacher',
  name: 'studentName',
  roll: 'roll',
  'roll no': 'roll',
};

const RE = {
  field: /^([A-Za-z][A-Za-z ./]{1,24}?)\s*[:–-]\s*(.+)$/,
  section: /^\s*(?:section|part|group)\s+([A-Za-z0-9]+)\b\s*[:.–-]?\s*(.*)$/i,
  instructions: /^\s*(?:general\s+)?instructions?\s*[:.–-]?\s*(.*)$/i,
  heading: /^(#{1,4})\s+(.*)$/,
  question: /^\s*(?:Q\.?\s*)?(\d+)\s*[.)\]]\s+(.*)$/i,
  part: /^\s*\(([a-z]|[ivx]+)\)\s*(.*)$/i,
  option: /^\s*([a-z])\s*[.)]\s+(.*)$/,
  bullet: /^\s*[-*•●]\s+(.*)$/,
  numbered: /^\s*(\d+)\s*[.)]\s+(.*)$/,
  checkbox: /^\s*\[( |x|X)\]\s+(.*)$/,
  divider: /^\s*(?:-{3,}|_{3,}|—{2,}|\*{3,})\s*$/,
  answerLines: /^\s*\[\[\s*lines\s*[:=]\s*(\d+)\s*\]\]\s*$/i,
  pageBreak: /^\s*(?:\[\[\s*(?:page ?break|new ?page)\s*\]\]|<!--\s*pagebreak\s*-->)\s*$/i,
  tableRow: /^\s*\|(.+)\|\s*$/,
  tableDivider: /^\s*\|[\s:|-]+\|\s*$/,
  marksSuffix:
    /\s*(?:\[\s*(\d+(?:\.\d+)?)\s*\]|\(\s*(\d+(?:\.\d+)?)\s*(?:marks?|m)\s*\)|\(\s*(\d+(?:\.\d+)?)\s*\))\s*$/i,
};

interface Extracted {
  body: string;
  marks?: number;
}

/** Pull a trailing marks annotation off a question line. */
export function extractMarks(line: string): Extracted {
  const m = line.match(RE.marksSuffix);
  if (!m) return { body: line };
  const value = Number(m[1] ?? m[2] ?? m[3]);
  if (!Number.isFinite(value)) return { body: line };
  return { body: line.slice(0, m.index).trimEnd(), marks: value };
}

const runs = (s: string): Run[] => parseInline(s.trim());

const splitCells = (line: string) =>
  line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((c) => c.trim());

export function parseContent(input: string): ParseResult {
  const lines = input.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  const fields: Record<string, string> = {};
  const notes: string[] = [];

  let paragraph: string[] = [];
  let listBuffer: { items: string[]; variant: 'bullet' | 'number' } | null = null;
  let checkBuffer: { runs: Run[]; checked?: boolean }[] | null = null;
  let tableBuffer: string[][] | null = null;
  let lastQuestion: QuestionBlock | null = null;
  let headerZone = true;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ id: uid('b'), type: 'paragraph', runs: runs(paragraph.join(' ')) });
    paragraph = [];
  };

  const flushList = () => {
    if (!listBuffer?.items.length) {
      listBuffer = null;
      return;
    }
    blocks.push({
      id: uid('b'),
      type: 'list',
      variant: listBuffer.variant,
      items: listBuffer.items.map(runs),
    });
    listBuffer = null;
  };

  const flushChecks = () => {
    if (!checkBuffer?.length) {
      checkBuffer = null;
      return;
    }
    blocks.push({ id: uid('b'), type: 'checklist', items: checkBuffer, columns: 1 });
    checkBuffer = null;
  };

  const flushTable = () => {
    if (!tableBuffer?.length) {
      tableBuffer = null;
      return;
    }
    const width = Math.max(...tableBuffer.map((r) => r.length));
    const rows: TableRow[] = tableBuffer.map((cells, i) => {
      const padded = [...cells];
      while (padded.length < width) padded.push('');
      return makeRow(padded.map(runs), { isHeader: i === 0 });
    });
    blocks.push(makeTable(new Array(width).fill(1), rows));
    tableBuffer = null;
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
    flushChecks();
    flushTable();
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const trimmed = line.trim();

    if (!trimmed) {
      flushAll();
      continue;
    }

    // Tables are the only multi-line construct that must be greedy.
    if (RE.tableRow.test(trimmed)) {
      if (RE.tableDivider.test(trimmed)) continue;
      flushParagraph();
      flushList();
      flushChecks();
      (tableBuffer ??= []).push(splitCells(trimmed));
      continue;
    }
    if (tableBuffer) flushTable();

    if (RE.pageBreak.test(trimmed)) {
      flushAll();
      blocks.push({ id: uid('b'), type: 'pageBreak' });
      lastQuestion = null;
      continue;
    }

    const answerLines = trimmed.match(RE.answerLines);
    if (answerLines) {
      flushAll();
      blocks.push({
        id: uid('b'),
        type: 'answerLines',
        count: Number(answerLines[1]) || 3,
        gap: 22,
        color: '#cbd5e1',
        dash: 'solid',
      });
      continue;
    }

    if (RE.divider.test(trimmed)) {
      flushAll();
      blocks.push({
        id: uid('b'),
        type: 'divider',
        thickness: 0.75,
        color: '#9ca3af',
        dash: 'solid',
        width: 1,
      });
      continue;
    }

    const heading = trimmed.match(RE.heading);
    if (heading) {
      flushAll();
      lastQuestion = null;
      headerZone = false;
      blocks.push({
        id: uid('b'),
        type: 'heading',
        level: Math.min(4, heading[1].length) as 1 | 2 | 3 | 4,
        runs: runs(heading[2]),
      });
      continue;
    }

    const section = trimmed.match(RE.section);
    if (section && trimmed.length < 90) {
      flushAll();
      lastQuestion = null;
      headerZone = false;
      blocks.push({
        id: uid('b'),
        type: 'section',
        runs: runs(`Section ${section[1].toUpperCase()}${section[2] ? ` - ${section[2]}` : ''}`),
        rule: true,
      });
      continue;
    }

    const instructions = trimmed.match(RE.instructions);
    if (instructions && instructions[1]) {
      flushAll();
      const previous = blocks[blocks.length - 1];
      if (previous?.type === 'section') {
        previous.instructions = runs(instructions[1]);
      } else {
        blocks.push({
          id: uid('b'),
          type: 'paragraph',
          runs: runs(instructions[1]),
          style: { italic: true, color: '#4b5563' },
        });
      }
      continue;
    }

    // "Subject: Science" style metadata, only while still in the header zone.
    const field = trimmed.match(RE.field);
    if (field && headerZone && !RE.question.test(trimmed)) {
      const key = FIELD_ALIASES[field[1].trim().toLowerCase()];
      if (key) {
        fields[key] = field[2].trim();
        continue;
      }
    }

    const question = trimmed.match(RE.question);
    if (question) {
      flushAll();
      headerZone = false;
      const { body, marks } = extractMarks(question[2]);
      const block: QuestionBlock = {
        id: uid('b'),
        type: 'question',
        runs: runs(body),
        marks,
      };
      blocks.push(block);
      lastQuestion = block;
      continue;
    }

    const part = trimmed.match(RE.part);
    if (part && lastQuestion) {
      flushAll();
      const { body, marks } = extractMarks(part[2]);
      const entry: QuestionPart = { id: uid('p'), runs: runs(body), marks };
      (lastQuestion.parts ??= []).push(entry);
      continue;
    }

    const option = trimmed.match(RE.option);
    if (option && lastQuestion) {
      flushAll();
      (lastQuestion.options ??= []).push(runs(option[2]));
      lastQuestion.optionColumns ??= 2;
      continue;
    }

    const checkbox = trimmed.match(RE.checkbox);
    if (checkbox) {
      flushParagraph();
      flushList();
      (checkBuffer ??= []).push({
        runs: runs(checkbox[2]),
        checked: checkbox[1].toLowerCase() === 'x',
      });
      continue;
    }
    if (checkBuffer) flushChecks();

    const bullet = trimmed.match(RE.bullet);
    if (bullet) {
      flushParagraph();
      if (listBuffer && listBuffer.variant !== 'bullet') flushList();
      listBuffer ??= { items: [], variant: 'bullet' };
      listBuffer.items.push(bullet[1]);
      continue;
    }

    const numbered = trimmed.match(RE.numbered);
    if (numbered && listBuffer?.variant === 'number') {
      listBuffer.items.push(numbered[2]);
      continue;
    }
    if (listBuffer) flushList();

    headerZone = false;
    paragraph.push(trimmed);
  }

  flushAll();

  if (!blocks.length) notes.push('Nothing recognisable was found in the pasted text.');
  return { blocks, fields, notes };
}

/* ------------------------------------------------------------------ *
 * Reverse direction: blocks back to editable plain text
 * ------------------------------------------------------------------ */

export { runsToMarkup } from './inline';

/** Best-effort plain-text view of a block, for the outline editor. */
export function blockToText(block: Block): string {
  const asText = (r: Run[] | undefined) => (r ?? []).map((x) => x.text).join('');
  switch (block.type) {
    case 'heading':
    case 'paragraph':
    case 'section':
      return asText(block.runs);
    case 'question':
      return asText(block.runs);
    case 'list':
      return block.items.map(asText).join('\n');
    case 'checklist':
      return block.items.map((i) => asText(i.runs)).join('\n');
    case 'table':
      return block.rows.map((r) => r.cells.map((c) => asText(c.runs)).join(' | ')).join('\n');
    case 'image':
      return block.alt ?? 'Image';
    case 'divider':
      return '---';
    case 'spacer':
      return `Spacer ${Math.round(block.height)}pt`;
    case 'answerLines':
      return `${block.count} answer lines`;
    case 'pageBreak':
      return 'Page break';
  }
}

/** Placeholder shown in the import panel; doubles as the parser's documentation. */
export const SAMPLE_INPUT = `School: Green Valley Public School
Exam: Half Yearly Examination 2025-26
Subject: Science
Class: VIII
Time: 3 Hours
Maximum Marks: 80

Section A
Instructions: All questions in this section are compulsory. Each carries 1 mark.

1. Define **photosynthesis** and state where it occurs. [2]
2. Which of the following is a renewable source of energy? [1]
a) Coal
b) Petroleum
c) Solar energy
d) Natural gas
3. State Newton's first law of motion. [3]
(a) Give one everyday example.
(b) Explain why a passenger falls forward when a bus stops suddenly. [2]

Section B
Instructions: Answer any four questions. Each carries 5 marks.

4. Describe the process of digestion in humans with a labelled flow of organs. [5]
[[lines:4]]
5. Complete the table below. [5]

| Organ | Function | System |
| --- | --- | --- |
| Heart | Pumps blood | Circulatory |
| Lung | Gas exchange | Respiratory |
`;
