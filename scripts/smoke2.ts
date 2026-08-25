/* Pagination stress test: long content, wide tables, forced breaks. */
import { layoutDocument } from '../src/lib/engine/layout';
import { parseContent } from '../src/lib/parse/content';
import { buildFromTemplate } from '../src/lib/templates';

const long: string[] = ['School: Test High School', 'Subject: History', 'Class: X', 'Time: 3 Hours', 'Maximum Marks: 100', ''];
long.push('Section A');
for (let i = 1; i <= 40; i += 1) {
  long.push(
    `${i}. Explain in detail the causes and consequences of event number ${i}, referring to at least three primary sources and the historiographical debate surrounding them. [${(i % 5) + 1}]`,
  );
  if (i % 7 === 0) long.push('[[lines:3]]');
  if (i === 20) long.push('', 'Section B', '');
}
long.push('', '| Year | Event | Significance |', '| --- | --- | --- |');
for (let i = 0; i < 45; i += 1) long.push(`| 19${(10 + i) % 100} | Event ${i} | Consequence ${i} |`);
long.push('', '[[pagebreak]]', '', '## Appendix', 'A short closing note.');

const parsed = parseContent(long.join('\n'));
const doc = buildFromTemplate('question-paper-classic', { title: 'History', fields: parsed.fields, body: parsed.blocks });
const t0 = process.hrtime.bigint();
const laid = layoutDocument(doc);
const ms = Number(process.hrtime.bigint() - t0) / 1e6;

console.log(`pages=${laid.pages.length}  marks=${laid.totalMarks}  layout=${ms.toFixed(1)}ms  warnings=${laid.warnings.length}`);
for (const p of laid.pages) {
  const kinds: Record<string, number> = {};
  for (const f of p.frames) kinds[f.kind] = (kinds[f.kind] ?? 0) + 1;
  const bottom = Math.max(0, ...p.frames.map((f) => f.y + f.height));
  const tableRows = p.frames.filter((f) => f.kind === 'table').reduce((s, f) => s + (f as { cells: unknown[] }).cells.length, 0);
  console.log(`  p${p.index + 1}: ${JSON.stringify(kinds).padEnd(46)} bottom=${bottom.toFixed(0)} limit=${(p.content.y + p.content.height).toFixed(0)} cells=${tableRows}`);
}
const overflow = laid.pages.filter((p) => Math.max(0, ...p.frames.map((f) => f.y + f.height)) > p.content.y + p.content.height + 0.5);
console.log('pages overflowing the content box:', overflow.map((p) => p.index + 1));

// Re-layout twice: the flow-item cache must not change the result.
const again = layoutDocument(doc);
console.log('stable across runs:', again.pages.length === laid.pages.length);
const t1 = process.hrtime.bigint();
layoutDocument(doc);
console.log(`cached re-layout: ${(Number(process.hrtime.bigint() - t1) / 1e6).toFixed(1)}ms`);
