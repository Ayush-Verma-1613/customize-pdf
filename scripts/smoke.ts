/* Engine smoke test: parse -> template -> layout, with no DOM involved. */
import { layoutDocument } from '../src/lib/engine/layout';
import { parseContent, SAMPLE_INPUT } from '../src/lib/parse/content';
import { buildFromTemplate } from '../src/lib/templates';

const parsed = parseContent(SAMPLE_INPUT);
console.log('fields:', parsed.fields);
console.log('blocks:', parsed.blocks.map((b) => b.type).join(', '));

const doc = buildFromTemplate('question-paper-classic', {
  title: 'Science — Half Yearly',
  fields: parsed.fields,
  body: parsed.blocks,
});

const laid = layoutDocument(doc);
console.log('\npages:', laid.pages.length, '| totalMarks:', laid.totalMarks, '| exact:', laid.exact);
console.log('warnings:', laid.warnings);
console.log('numbers:', laid.numbers);

for (const page of laid.pages) {
  const kinds: Record<string, number> = {};
  for (const f of page.frames) kinds[f.kind] = (kinds[f.kind] ?? 0) + 1;
  console.log(`page ${page.index + 1}:`, kinds, 'master:', page.masterFrames.length);
}

const firstPage = laid.pages[0];
console.log('\n--- first page text ---');
for (const f of firstPage.frames) {
  if (f.kind !== 'text') continue;
  for (const line of f.lines) {
    const s = line.items.map((i) => i.text).join('');
    if (s.trim()) console.log(`${Math.round(f.y + line.y).toString().padStart(4)}  ${Math.round(f.x).toString().padStart(3)}  ${s}`);
  }
}
