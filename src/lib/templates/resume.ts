import { createDocument, makeCell, makeRow, makeTable, text } from '@/lib/model/factory';
import type { Block, PaperDoc, Run } from '@/lib/model/types';
import {
  bullets,
  divider,
  field,
  heading,
  infoStrip,
  para,
  spacer,
  type TemplateDef,
  type TemplateInput,
} from './kit';

/**
 * A CV, in three arrangements.
 *
 * The masthead, page setup and typography are the same in all three; only the
 * body underneath changes. That is the whole point of a variant - somebody can
 * try the two-column look, decide against it, and go back without retyping a
 * word.
 */

const ACCENT = '#0f766e';

const RESUME_FIELDS = [
  { key: 'name', label: 'Your name', placeholder: 'Aarav Sharma' },
  { key: 'role', label: 'Role or headline', placeholder: 'Front-end Developer' },
  { key: 'email', label: 'Email', placeholder: 'aarav.sharma@email.com' },
  { key: 'phone', label: 'Phone', placeholder: '+91 98765 43210' },
  { key: 'location', label: 'Location', placeholder: 'Bengaluru, India' },
  { key: 'links', label: 'Links', placeholder: 'linkedin.com/in/aarav · github.com/aarav' },
  {
    key: 'summary',
    label: 'Profile',
    placeholder: 'Two lines on what you do and what you are looking for.',
    multiline: true,
  },
];

/** "email · phone · location · links", skipping whatever was left blank. */
const contactLine = (f: Record<string, string>): string =>
  [
    field(f, 'email', 'aarav.sharma@email.com'),
    field(f, 'phone', '+91 98765 43210'),
    field(f, 'location', 'Bengaluru, India'),
    field(f, 'links', 'linkedin.com/in/aarav'),
  ]
    .filter(Boolean)
    .join('  ·  ');

const DEFAULT_SUMMARY =
  'Front-end developer with four years building accessible, fast interfaces for education and ' +
  'fintech products. Happiest where design and engineering meet.';

/** The name block every variant opens with. */
function nameplate(f: Record<string, string>, rule: boolean): Block[] {
  return [
    heading(
      text(field(f, 'name', 'Aarav Sharma'), { letterSpacing: 0.2 }),
      1,
      { size: 23, spaceAfter: 1 },
    ),
    para(
      text(field(f, 'role', 'Front-end Developer').toUpperCase(), {
        bold: true,
        size: 9.5,
        color: ACCENT,
        letterSpacing: 1.5,
        family: 'Inter',
      }),
      { spaceAfter: 5 },
    ),
    para(text(contactLine(f), { color: '#6b7280', size: 9.5 }), { spaceAfter: rule ? 8 : 12 }),
    ...(rule ? [divider('#e5e7eb', 1, { spaceAfter: 12 })] : []),
  ];
}

/** A shared page and type setup, so the three variants are one document design. */
function shell(input: TemplateInput): PaperDoc {
  const f = input.fields;
  const doc = createDocument(input.title || `${field(f, 'name', 'Aarav Sharma')} — CV`);
  doc.theme = {
    bodyFamily: 'Arimo',
    headingFamily: 'Inter',
    bodySize: 10,
    lineHeight: 1.45,
    textColor: '#111827',
    accent: ACCENT,
    muted: '#6b7280',
    headingScale: [2.3, 1.22, 1.05, 1],
  };
  doc.page.margins = { top: 46, right: 52, bottom: 46, left: 52 };
  doc.fields = { ...f };
  // A CV is read, not paginated - a page number on a one-page CV looks anxious.
  doc.master.footer = { ...doc.master.footer, enabled: false };
  return doc;
}

/** A section title: small, spaced capitals with a hairline under them. */
const sectionTitle = (label: string): Block[] => [
  para(
    text(label.toUpperCase(), {
      bold: true,
      size: 9,
      color: ACCENT,
      letterSpacing: 1.4,
      family: 'Inter',
    }),
    { spaceBefore: 10, spaceAfter: 3 },
  ),
  divider('#e5e7eb', 0.75, { spaceAfter: 6 }),
];

/** "Role, Company" on the left with the dates set against the right margin. */
const entryLine = (left: string, right: string): Block =>
  infoStrip([[left, right]], { size: 10 });

/* ------------------------------------------------------------------ *
 * Classic - one column, plain, safe for applicant-tracking systems
 * ------------------------------------------------------------------ */

function resumeClassic(input: TemplateInput): PaperDoc {
  const doc = shell(input);
  const f = input.fields;

  doc.flow = [
    ...nameplate(f, true),
    ...sectionTitle('Profile'),
    para(field(f, 'summary', DEFAULT_SUMMARY), { align: 'justify', spaceAfter: 2 }),

    ...(input.body.length
      ? input.body
      : [
          ...sectionTitle('Experience'),
          entryLine('Senior Front-end Developer, Northwind Labs', '2022 — Present'),
          bullets(
            [
              'Rebuilt the marking dashboard used by 4,000 teachers, cutting load time from 4.1s to 0.9s.',
              'Introduced an accessibility review step; the product now passes WCAG 2.2 AA.',
              'Mentored three juniors, two of whom now lead their own areas.',
            ],
            { size: 9.5, spaceAfter: 8 },
          ),
          entryLine('Front-end Developer, Kestrel Software', '2020 — 2022'),
          bullets(
            [
              'Built the component library still used across four products.',
              'Took the checkout flow from 62% to 81% completion with staged form redesign.',
            ],
            { size: 9.5, spaceAfter: 8 },
          ),

          ...sectionTitle('Education'),
          entryLine('B.Tech, Computer Science — Delhi Technological University', '2016 — 2020'),
          para(text('First class, 8.4 CGPA. Final year project on offline-first web apps.', {
            color: '#6b7280',
            size: 9.5,
          }), { spaceAfter: 4 }),

          ...sectionTitle('Skills'),
          para(
            text('TypeScript · React · Next.js · Node · PostgreSQL · Testing Library · Figma · CI/CD', {
              size: 9.5,
            }),
          ),

          ...sectionTitle('Projects'),
          entryLine('Docraft — browser-based document designer', 'Side project'),
          para(text('A layout engine and editor that produces print-exact PDFs entirely client-side.', {
            color: '#6b7280',
            size: 9.5,
          })),
        ]),
  ];

  return doc;
}

/* ------------------------------------------------------------------ *
 * Modern - a narrow rail beside the main column
 * ------------------------------------------------------------------ */

/** Stacked "LABEL / item / item" groups for a rail cell, as one run list. */
function rail(groups: [string, string[]][]): Run[] {
  const runs: Run[] = [];
  groups.forEach(([label, items], i) => {
    runs.push({
      text: `${label.toUpperCase()}\n`,
      bold: true,
      size: 8.5,
      color: ACCENT,
      letterSpacing: 1.3,
      family: 'Inter',
    });
    runs.push({
      text: items.join('\n') + (i === groups.length - 1 ? '' : '\n\n'),
      size: 9.5,
      color: '#374151',
    });
  });
  return runs;
}

/** The wide column, where a bold line opens each block of prose. */
function column(groups: { title: string; lines: string[] }[]): Run[] {
  const runs: Run[] = [];
  groups.forEach((group, i) => {
    runs.push({
      text: `${group.title.toUpperCase()}\n`,
      bold: true,
      size: 8.5,
      color: ACCENT,
      letterSpacing: 1.3,
      family: 'Inter',
    });
    runs.push({
      text: group.lines.join('\n') + (i === groups.length - 1 ? '' : '\n\n'),
      size: 9.5,
    });
  });
  return runs;
}

function resumeModern(input: TemplateInput): PaperDoc {
  const doc = shell(input);
  const f = input.fields;

  /**
   * The flow is a single stream, so a genuine side-by-side rail has to be a
   * table: page columns would split the name block too, and overlays would not
   * reflow when the text grows. One row keeps the two columns independent -
   * separate rows would drag the short column down to the tall one's height.
   */
  const body = makeTable(
    [1, 2.15],
    [
      makeRow([
        makeCell(
          rail([
            [
              'Contact',
              [
                field(f, 'email', 'aarav.sharma@email.com'),
                field(f, 'phone', '+91 98765 43210'),
                field(f, 'location', 'Bengaluru, India'),
                field(f, 'links', 'linkedin.com/in/aarav'),
              ].filter(Boolean),
            ],
            ['Skills', ['TypeScript', 'React · Next.js', 'Node · PostgreSQL', 'Testing Library']],
            ['Tools', ['Figma', 'Git · CI/CD', 'Playwright']],
            ['Languages', ['English — fluent', 'Hindi — native']],
          ]),
          {
            vAlign: 'top',
            border: {
              right: { color: '#e5e7eb', width: 0.75, style: 'solid' },
            },
          },
        ),
        makeCell(
          column([
            { title: 'Profile', lines: [field(f, 'summary', DEFAULT_SUMMARY)] },
            {
              title: 'Experience',
              lines: [
                'Senior Front-end Developer — Northwind Labs, 2022 to now',
                'Rebuilt the marking dashboard used by 4,000 teachers, cutting load time from 4.1s to 0.9s.',
                'Introduced an accessibility review step; the product now passes WCAG 2.2 AA.',
                '',
                'Front-end Developer — Kestrel Software, 2020 to 2022',
                'Built the component library still used across four products.',
                'Took checkout completion from 62% to 81% with a staged form redesign.',
              ],
            },
            {
              title: 'Education',
              lines: [
                'B.Tech Computer Science — Delhi Technological University, 2016 to 2020',
                'First class, 8.4 CGPA.',
              ],
            },
          ]),
          { vAlign: 'top' },
        ),
      ]),
    ],
    {
      border: { color: 'transparent', width: 0, style: 'solid' },
      innerBorder: null,
      repeatHeader: false,
      cellPadding: { top: 0, right: 14, bottom: 0, left: 0 },
    },
  );
  body.rows[0].cells[1].padding = { top: 0, right: 0, bottom: 0, left: 16 };

  doc.flow = [...nameplate(f, true), body, ...(input.body.length ? [spacer(10), ...input.body] : [])];

  return doc;
}

/* ------------------------------------------------------------------ *
 * Student - education first, for somebody with little work history
 * ------------------------------------------------------------------ */

function resumeFresher(input: TemplateInput): PaperDoc {
  const doc = shell(input);
  const f = input.fields;

  const results = makeTable(
    [2.4, 1.4, 1, 1],
    [
      makeRow(['Qualification', 'Institution', 'Year', 'Result'], { isHeader: true }),
      makeRow(['B.Tech, Computer Science', 'Delhi Technological University', '2024', '8.4 CGPA']),
      makeRow(['Class XII (CBSE)', 'Green Valley Public School', '2020', '92.4%']),
      makeRow(['Class X (CBSE)', 'Green Valley Public School', '2018', '95.0%']),
    ],
    {
      border: { color: '#e5e7eb', width: 0.75, style: 'solid' },
      innerBorder: { color: '#eef2f7', width: 0.5, style: 'solid' },
      cellPadding: { top: 4, right: 7, bottom: 4, left: 7 },
      style: { size: 9.5 },
    },
  );
  results.rows[0].cells.forEach((cell) => {
    cell.bold = true;
    cell.background = '#f8fafc';
  });

  doc.flow = [
    ...nameplate(f, true),

    ...sectionTitle('Career objective'),
    para(
      field(
        f,
        'summary',
        'Computer science graduate looking for a first front-end role where I can keep learning ' +
          'from people who care about craft.',
      ),
      { align: 'justify' },
    ),

    ...sectionTitle('Education'),
    results,

    ...(input.body.length
      ? input.body
      : [
          ...sectionTitle('Projects'),
          entryLine('Class timetable planner — final year project', '2024'),
          bullets(
            [
              'Built with React and a constraint solver; used by three departments.',
              'Wrote the scheduling algorithm and the printable export.',
            ],
            { size: 9.5, spaceAfter: 6 },
          ),
          entryLine('Library book tracker', '2023'),
          para(text('A small offline-first app for the school library, still in use.', {
            color: '#6b7280',
            size: 9.5,
          })),

          ...sectionTitle('Internships'),
          entryLine('Front-end intern, Kestrel Software', 'Jun — Aug 2023'),
          bullets(['Shipped four components into the design system.'], { size: 9.5 }),

          ...sectionTitle('Skills and certifications'),
          para(text('JavaScript · TypeScript · React · Python · SQL · Git', { size: 9.5 }), {
            spaceAfter: 3,
          }),
          para(text('Meta Front-End Developer Certificate (2024) · NPTEL Data Structures (2023)', {
            color: '#6b7280',
            size: 9.5,
          })),

          ...sectionTitle('Activities'),
          bullets(
            [
              'Secretary, college coding club — ran a 200-student hackathon.',
              'Volunteer tutor, weekend maths class for Class X students.',
            ],
            { size: 9.5 },
          ),
        ]),

    spacer(8),
    para(
      text('References available on request.', { color: '#6b7280', size: 9, italic: true }),
    ),
  ];

  return doc;
}

/* ------------------------------------------------------------------ *
 * The template
 * ------------------------------------------------------------------ */

const BUILDERS: Record<string, (input: TemplateInput) => PaperDoc> = {
  classic: resumeClassic,
  modern: resumeModern,
  student: resumeFresher,
};

export const RESUME_TEMPLATES: TemplateDef[] = [
  {
    id: 'resume',
    name: 'CV / Résumé',
    category: 'Personal',
    description:
      'A one-page curriculum vitae in three arrangements. Switch the body layout ' +
      'without retyping anything.',
    preview: ['Name · role · contact', 'Profile · Experience · Education'],
    badge: 'Three layouts',
    accent: ACCENT,
    fields: RESUME_FIELDS,
    acceptsContent: true,
    variants: [
      {
        id: 'classic',
        name: 'Classic, one column',
        description: 'Plain single column. The safest choice for employers who scan CVs by machine.',
        preview: ['Profile · Experience', 'Education · Skills'],
      },
      {
        id: 'modern',
        name: 'Two columns',
        description: 'A narrow rail of contact and skills beside the main column.',
        preview: ['Contact · Skills │ Profile', 'Tools · Languages │ Experience'],
      },
      {
        id: 'student',
        name: 'Student or first job',
        description: 'Leads with education and a results table, then projects and internships.',
        preview: ['Objective · Education table', 'Projects · Internships'],
      },
    ],
    build: (input) => (BUILDERS[input.variant ?? 'classic'] ?? resumeClassic)(input),
  },
];
