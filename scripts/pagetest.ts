/* Add a blank page, then delete it again. */
import { layoutDocument } from '../src/lib/engine/layout';
import { parseContent, SAMPLE_INPUT } from '../src/lib/parse/content';
import { buildFromTemplate } from '../src/lib/templates';
import { deletePage, insertPage, pageRanges } from '../src/lib/store/pages';
import type { PaperDoc } from '../src/lib/model/types';

const show = (label: string, doc: PaperDoc) => {
  const laid = layoutDocument(doc);
  const ranges = pageRanges(doc, laid);
  console.log(`\n${label}: ${laid.pages.length} pages`);
  console.log('  flow:', doc.flow.map((b, i) => `${i}:${b.type === 'pageBreak' ? 'BREAK' : b.type}`).join(' '));
  console.log('  ranges:', ranges.map((r) => `p${r.page}[${r.start},${r.end})`).join(' '));
  return laid;
};

function main() {
  const parsed = parseContent(SAMPLE_INPUT);
  let doc = buildFromTemplate('question-paper-classic', {
    title: 'T', fields: parsed.fields, body: parsed.blocks,
  });

  let laid = show('start', doc);

  doc = insertPage(doc, laid, 0);
  laid = show('after addPage(after 0)', doc);

  for (let target = laid.pages.length - 1; target >= 0; target -= 1) {
    const next = deletePage(doc, laid, target);
    const after = layoutDocument(next);
    console.log(`  deletePage(${target}) -> ${after.pages.length} pages ${next === doc ? '(NO CHANGE)' : ''}`);
  }

  // The case the user reports: delete the blank page that was just added.
  const blank = laid.pages.findIndex((p) => p.frames.length === 0);
  console.log('\n  blank page index:', blank);
  if (blank >= 0) {
    const next = deletePage(doc, laid, blank);
    const after = layoutDocument(next);
    console.log(`  deletePage(blank=${blank}) -> ${after.pages.length} pages, flow:`,
      next.flow.map((b) => (b.type === 'pageBreak' ? 'BREAK' : b.type[0])).join(''));
  }
}
main();
