import { createDocument, makeRow, makeTable, pad, text } from '@/lib/model/factory';
import type { Block, PaperDoc } from '@/lib/model/types';
import { uid } from '@/lib/utils/id';
import {
  bullets,
  divider,
  field,
  heading,
  para,
  spacer,
  type TemplateDef,
  type TemplateInput,
} from './kit';

/* ------------------------------------------------------------------ *
 * School notice
 * ------------------------------------------------------------------ */

function notice(input: TemplateInput): PaperDoc {
  const f = input.fields;
  const doc = createDocument(input.title || 'Notice');
  doc.theme = {
    ...doc.theme,
    bodyFamily: 'Arimo',
    headingFamily: 'Inter',
    bodySize: 11.5,
    lineHeight: 1.55,
    accent: '#b91c1c',
  };
  doc.page.margins = { top: 56, right: 56, bottom: 56, left: 56 };
  doc.fields = { ...f };
  doc.master.footer = { ...doc.master.footer, enabled: false };

  doc.flow = [
    heading(text(field(f, 'school', 'Green Valley Public School').toUpperCase(), {
      letterSpacing: 1.4,
    }), 1, { size: 16, spaceAfter: 2 }),
    para(text(field(f, 'address', 'School address line, city'), { color: '#6b7280', size: 9.5 }), {
      align: 'center',
      spaceAfter: 10,
    }),
    divider('#111827', 1.2, { spaceAfter: 12 }),
    para(text('NOTICE', { bold: true, letterSpacing: 3, size: 13 }), {
      align: 'center',
      spaceAfter: 8,
    }),
    makeTable(
      [1, 1],
      [makeRow([text(`Ref: ${field(f, 'ref', 'GVPS/2025/014')}`), text(`Date: ${field(f, 'date', '25 August 2025')}`)])],
      {
        border: { color: 'transparent', width: 0, style: 'solid' },
        innerBorder: null,
        cellPadding: { top: 0, right: 0, bottom: 6, left: 0 },
        repeatHeader: false,
      },
    ),
    heading(field(f, 'subject', 'Annual Sports Day — participation and rehearsal schedule'), 3, {
      spaceBefore: 4,
      spaceAfter: 8,
    }),
    ...(input.body.length
      ? input.body
      : [
          para(
            'This is to inform all students and parents that the Annual Sports Day will be held on the school grounds. Attendance is compulsory for all participating students.',
            { align: 'justify' },
          ),
          bullets([
            'Rehearsals begin from Monday, during the last two periods.',
            'Students must report in full sports uniform.',
            'Parents are welcome from 9:00 am onwards.',
          ]),
          para(
            'Class teachers are requested to circulate this notice and confirm participation lists by Friday.',
            { align: 'justify', spaceBefore: 6 },
          ),
        ]),
    spacer(28),
    para(text(field(f, 'signatory', 'Principal'), { bold: true }), { align: 'right' }),
    para(text(field(f, 'school', 'Green Valley Public School'), { color: '#6b7280', size: 9.5 }), {
      align: 'right',
    }),
  ];

  return doc;
}

/* ------------------------------------------------------------------ *
 * Certificate
 * ------------------------------------------------------------------ */

function certificate(input: TemplateInput): PaperDoc {
  const f = input.fields;
  const doc = createDocument(input.title || 'Certificate');
  doc.page.orientation = 'landscape';
  doc.page.margins = { top: 72, right: 84, bottom: 72, left: 84 };
  doc.page.border = { color: '#b8860b', width: 2.5, inset: 26, style: 'double', radius: 6 };
  doc.theme = {
    bodyFamily: 'Lora',
    headingFamily: 'Lora',
    bodySize: 12,
    lineHeight: 1.5,
    textColor: '#1f2937',
    accent: '#b8860b',
    muted: '#8b7355',
    headingScale: [2.6, 1.5, 1.2, 1.05],
  };
  doc.master.footer = { ...doc.master.footer, enabled: false };
  doc.fields = { ...f };

  doc.flow = [
    spacer(6),
    para(text(field(f, 'school', 'Green Valley Public School').toUpperCase(), {
      letterSpacing: 3,
      size: 10,
      color: '#8b7355',
    }), { align: 'center', spaceAfter: 10 }),
    heading(text(field(f, 'title', 'Certificate of Achievement'), { color: '#b8860b' }), 1, {
      spaceAfter: 6,
    }),
    para(text('This certificate is proudly presented to', { italic: true, color: '#6b7280' }), {
      align: 'center',
      spaceAfter: 12,
    }),
    heading(text(field(f, 'recipient', 'Student Name'), { underline: false }), 2, {
      align: 'center',
      size: 26,
      spaceAfter: 4,
    }),
    divider('#b8860b', 0.8, { align: 'center', spaceAfter: 12, width: 0.45 } as never),
    para(
      field(
        f,
        'reason',
        'in recognition of outstanding performance and dedication demonstrated throughout the academic year.',
      ),
      { align: 'center', italic: true, spaceAfter: 26, indentLeft: 40, indentRight: 40 },
    ),
    makeTable(
      [1, 1],
      [
        makeRow([
          text('__________________________'),
          text('__________________________'),
        ]),
        makeRow([
          text(field(f, 'signer1', 'Class Teacher'), { size: 9.5, color: '#6b7280' }),
          text(field(f, 'signer2', 'Principal'), { size: 9.5, color: '#6b7280' }),
        ]),
      ],
      {
        border: { color: 'transparent', width: 0, style: 'solid' },
        innerBorder: null,
        cellPadding: { top: 2, right: 0, bottom: 2, left: 0 },
        repeatHeader: false,
        widthFactor: 0.8,
      },
    ),
  ];

  doc.flow.forEach((b) => {
    if (b.type === 'table') b.rows.forEach((r) => r.cells.forEach((c) => (c.align = 'center')));
  });

  return doc;
}

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */

function report(input: TemplateInput): PaperDoc {
  const f = input.fields;
  const doc = createDocument(input.title || 'Report');
  doc.theme = {
    bodyFamily: 'Arimo',
    headingFamily: 'Inter',
    bodySize: 10.5,
    lineHeight: 1.55,
    textColor: '#111827',
    accent: '#0f766e',
    muted: '#6b7280',
    headingScale: [2.1, 1.35, 1.15, 1.02],
  };
  doc.page.margins = { top: 58, right: 58, bottom: 58, left: 58 };
  doc.fields = { ...f };
  doc.master.header = {
    ...doc.master.header,
    enabled: true,
    slots: { left: text(field(f, 'org', 'Organisation')), center: [], right: [{ text: '{{title}}' }] },
    rule: true,
    showOnFirstPage: false,
  };

  doc.flow = [
    para(text(field(f, 'org', 'ORGANISATION').toUpperCase(), {
      bold: true,
      size: 8.5,
      color: '#0f766e',
      letterSpacing: 1.6,
      family: 'Inter',
    }), { spaceAfter: 2 }),
    heading(field(f, 'title', input.title || 'Quarterly progress report'), 1, {
      align: 'left',
      spaceAfter: 4,
    }),
    para(text(`Prepared by ${field(f, 'author', 'Author')} · ${field(f, 'date', 'August 2025')}`, {
      color: '#6b7280',
    }), { spaceAfter: 14 }),
    divider('#e5e7eb', 1, { spaceAfter: 14 }),
    heading('Summary', 2),
    ...(input.body.length
      ? input.body
      : [
          para(
            'Open with two or three sentences that state the outcome first. Detail belongs in the sections below, not here.',
            { align: 'justify' },
          ),
          heading('Findings', 2),
          bullets([
            'First finding, with the number that supports it.',
            'Second finding.',
            'Third finding.',
          ]),
          heading('Recommendations', 2),
          para('What should happen next, and who owns it.', { align: 'justify' }),
        ]),
  ];

  return doc;
}

/* ------------------------------------------------------------------ *
 * Form
 * ------------------------------------------------------------------ */

function form(input: TemplateInput): PaperDoc {
  const f = input.fields;
  const doc = createDocument(input.title || 'Form');
  doc.theme = { ...doc.theme, bodyFamily: 'Arimo', headingFamily: 'Inter', bodySize: 10.5 };
  doc.page.margins = { top: 50, right: 50, bottom: 50, left: 50 };
  doc.fields = { ...f };

  const fieldRow = (label: string, minHeight = 26) =>
    makeRow([text(label, { bold: true }), ''], { minHeight });

  doc.flow = [
    heading(field(f, 'org', 'Green Valley Public School'), 2, { align: 'center', spaceAfter: 2 }),
    heading(field(f, 'title', input.title || 'Admission enquiry form'), 3, {
      align: 'center',
      spaceAfter: 12,
    }),
    para(
      text('Please complete every field in block capitals and submit to the school office.', {
        italic: true,
        color: '#6b7280',
      }),
      { align: 'center', spaceAfter: 14 },
    ),
    heading('Student details', 3),
    makeTable(
      [1, 2],
      [
        fieldRow('Full name'),
        fieldRow('Date of birth'),
        fieldRow('Class applied for'),
        fieldRow('Previous school'),
      ],
      { zebra: '#f9fafb' },
    ),
    heading('Guardian details', 3),
    makeTable(
      [1, 2],
      [fieldRow('Name'), fieldRow('Relationship'), fieldRow('Phone'), fieldRow('Email'), fieldRow('Address', 44)],
      { zebra: '#f9fafb' },
    ),
    heading('Declaration', 3),
    para(
      'I confirm that the information given above is correct to the best of my knowledge.',
      { spaceAfter: 24 },
    ),
    makeTable(
      [1, 1],
      [makeRow([text('Signature: ______________________'), text('Date: ______________________')])],
      {
        border: { color: 'transparent', width: 0, style: 'solid' },
        innerBorder: null,
        cellPadding: { top: 0, right: 0, bottom: 0, left: 0 },
        repeatHeader: false,
      },
    ),
    ...input.body,
  ];

  return doc;
}

/* ------------------------------------------------------------------ *
 * Invoice
 * ------------------------------------------------------------------ */

function invoice(input: TemplateInput): PaperDoc {
  const f = input.fields;
  const doc = createDocument(input.title || 'Invoice');
  doc.theme = {
    bodyFamily: 'Inter',
    headingFamily: 'Inter',
    bodySize: 10,
    lineHeight: 1.5,
    textColor: '#111827',
    accent: '#1d4ed8',
    muted: '#6b7280',
    headingScale: [2.4, 1.3, 1.1, 1],
  };
  doc.page.margins = { top: 56, right: 56, bottom: 56, left: 56 };
  doc.fields = { ...f };
  doc.master.footer = {
    ...doc.master.footer,
    slots: {
      left: text(field(f, 'org', 'Company')),
      center: [],
      right: [{ text: 'Page {{page}} of {{pages}}' }],
    },
  };

  const items = makeTable(
    [4, 1, 1.3, 1.3],
    [
      makeRow(
        [
          text('Description', { bold: true }),
          text('Qty', { bold: true }),
          text('Rate', { bold: true }),
          text('Amount', { bold: true }),
        ],
        { isHeader: true },
      ),
      makeRow(['Consulting — August', '12', '2,500.00', '30,000.00']),
      makeRow(['Implementation support', '4', '3,000.00', '12,000.00']),
    ],
    {
      innerBorder: { color: '#e5e7eb', width: 0.6, style: 'solid' },
      border: { color: '#d1d5db', width: 0.8, style: 'solid' },
      cellPadding: { top: 6, right: 8, bottom: 6, left: 8 },
    },
  );
  items.rows.forEach((r) =>
    r.cells.forEach((c, i) => {
      if (i > 0) c.align = 'right';
    }),
  );

  const totals = makeTable(
    [1, 1],
    [
      makeRow([text('Subtotal'), text('42,000.00')]),
      makeRow([text('Tax (18%)'), text('7,560.00')]),
      makeRow([text('Total due', { bold: true }), text('49,560.00', { bold: true })]),
    ],
    {
      border: { color: 'transparent', width: 0, style: 'solid' },
      innerBorder: { color: '#e5e7eb', width: 0.6, style: 'solid' },
      cellPadding: { top: 5, right: 8, bottom: 5, left: 8 },
      repeatHeader: false,
      widthFactor: 0.45,
    },
  );
  totals.style = { align: 'right' };
  totals.rows.forEach((r) => (r.cells[1].align = 'right'));

  doc.flow = [
    makeTable(
      [1, 1],
      [
        makeRow([
          text(field(f, 'org', 'Azureline Studio'), { bold: true, size: 15 }),
          text(`INVOICE ${field(f, 'number', '#2025-014')}`, { bold: true, size: 15 }),
        ]),
        makeRow([
          text(field(f, 'orgAddress', 'Street address\nCity, State 000000'), { color: '#6b7280', size: 9 }),
          text(`Issued ${field(f, 'date', '25 Aug 2025')}\nDue ${field(f, 'due', '08 Sep 2025')}`, {
            color: '#6b7280',
            size: 9,
          }),
        ]),
      ],
      {
        border: { color: 'transparent', width: 0, style: 'solid' },
        innerBorder: null,
        cellPadding: { top: 0, right: 0, bottom: 4, left: 0 },
        repeatHeader: false,
      },
    ),
    divider('#e5e7eb', 1, { spaceBefore: 10, spaceAfter: 12 }),
    para(text('BILL TO', { bold: true, size: 8, letterSpacing: 1.4, color: '#6b7280' }), {
      spaceAfter: 2,
    }),
    para(text(field(f, 'client', 'Client name'), { bold: true, size: 11 }), { spaceAfter: 1 }),
    para(text(field(f, 'clientAddress', 'Client address'), { color: '#6b7280', size: 9 }), {
      spaceAfter: 16,
    }),
    items,
    totals,
    spacer(10),
    para(text('Payment terms', { bold: true, size: 9.5 }), { spaceAfter: 2 }),
    para(
      text(field(f, 'terms', 'Payment is due within 14 days by bank transfer.'), {
        color: '#6b7280',
        size: 9,
      }),
      {
        border: { color: '#e5e7eb', width: 0.75, style: 'solid', radius: 4 },
        padding: pad(10),
      },
    ),
    ...input.body,
  ];

  return doc;
}

/* ------------------------------------------------------------------ *
 * Blank
 * ------------------------------------------------------------------ */

function blank(input: TemplateInput): PaperDoc {
  const doc = createDocument(input.title || 'Untitled document');
  doc.theme = { ...doc.theme, bodyFamily: 'Arimo', headingFamily: 'Inter' };
  doc.flow = input.body.length
    ? input.body
    : ([{ id: uid('b'), type: 'paragraph', runs: text('Start typing, or paste your content.') }] as Block[]);
  return doc;
}

export const GENERAL_TEMPLATES: TemplateDef[] = [
  {
    id: 'blank',
    name: 'Blank document',
    category: 'School admin',
    description: 'An empty A4 page with sensible margins. Everything else is up to you.',
    preview: ['A4 · 48pt margins', 'No masthead, no furniture'],
    badge: 'Start clean',
    accent: '#64748b',
    fields: [],
    acceptsContent: true,
    build: blank,
  },
  {
    id: 'notice',
    name: 'School notice',
    category: 'School admin',
    description:
      'Bordered circular with reference number, date, subject line and a signature block.',
    preview: ['NOTICE · Ref + Date', 'Body · Principal signature'],
    badge: 'Circular',
    accent: '#b91c1c',
    fields: [
      { key: 'school', label: 'School name', placeholder: 'Green Valley Public School' },
      { key: 'address', label: 'Address line', placeholder: 'Sector 12, New Delhi' },
      { key: 'ref', label: 'Reference number', placeholder: 'GVPS/2025/014' },
      { key: 'date', label: 'Date', placeholder: '25 August 2025' },
      { key: 'subject', label: 'Subject', placeholder: 'Annual Sports Day' },
      { key: 'signatory', label: 'Signed by', placeholder: 'Principal' },
    ],
    acceptsContent: true,
    build: notice,
  },
  {
    id: 'certificate',
    name: 'Certificate',
    category: 'School admin',
    description: 'Landscape certificate with a double gold border and two signature lines.',
    preview: ['Landscape · double border', 'Recipient · reason · signatures'],
    badge: 'Landscape',
    accent: '#b8860b',
    fields: [
      { key: 'school', label: 'School name', placeholder: 'Green Valley Public School' },
      { key: 'title', label: 'Certificate title', placeholder: 'Certificate of Achievement' },
      { key: 'recipient', label: 'Recipient', placeholder: 'Aarav Sharma' },
      { key: 'reason', label: 'Reason', placeholder: 'for outstanding performance…' },
      { key: 'signer1', label: 'Left signature', placeholder: 'Class Teacher' },
      { key: 'signer2', label: 'Right signature', placeholder: 'Principal' },
    ],
    acceptsContent: false,
    build: certificate,
  },
  {
    id: 'form',
    name: 'Form',
    category: 'School admin',
    description: 'Structured field tables with a declaration and signature strip.',
    preview: ['Student details table', 'Guardian details · declaration'],
    badge: 'Fill-in fields',
    accent: '#0891b2',
    fields: [
      { key: 'org', label: 'Organisation', placeholder: 'Green Valley Public School' },
      { key: 'title', label: 'Form title', placeholder: 'Admission enquiry form' },
    ],
    acceptsContent: true,
    build: form,
  },
  {
    id: 'report',
    name: 'Report',
    category: 'Business',
    description: 'Summary-first report layout with running header and section headings.',
    preview: ['Summary · Findings', 'Recommendations'],
    badge: 'Summary first',
    accent: '#0f766e',
    fields: [
      { key: 'org', label: 'Organisation', placeholder: 'Green Valley Public School' },
      { key: 'title', label: 'Report title', placeholder: 'Quarterly progress report' },
      { key: 'author', label: 'Author', placeholder: 'R. Mehta' },
      { key: 'date', label: 'Date', placeholder: 'August 2025' },
    ],
    acceptsContent: true,
    build: report,
  },
  {
    id: 'invoice',
    name: 'Invoice',
    category: 'Business',
    description: 'Line-item table with totals, billing block and payment terms.',
    preview: ['Bill to · line items', 'Subtotal · tax · total due'],
    badge: 'Line items',
    accent: '#1d4ed8',
    fields: [
      { key: 'org', label: 'Your business', placeholder: 'Azureline Studio' },
      { key: 'number', label: 'Invoice number', placeholder: '#2025-014' },
      { key: 'client', label: 'Client', placeholder: 'Acme Pvt Ltd' },
      { key: 'date', label: 'Issue date', placeholder: '25 Aug 2025' },
      { key: 'due', label: 'Due date', placeholder: '08 Sep 2025' },
    ],
    acceptsContent: true,
    build: invoice,
  },
];
