/* Add and delete a blank page in the middle of a multi-page document. */
import { layoutDocument } from '../src/lib/engine/layout';
import { parseContent } from '../src/lib/parse/content';
import { buildFromTemplate } from '../src/lib/templates';
import { deletePage, insertPage } from '../src/lib/store/pages';

function main() {
  const lines = ['School: T', 'Subject: S', ''];
  for (let i = 1; i <= 30; i += 1) {
    lines.push(`${i}. A reasonably long question number ${i} that takes a line or two of space on the page. [2]`);
  }
  const parsed = parseContent(lines.join('\n'));
  let doc = buildFromTemplate('question-paper-classic', { title: 'T', fields: parsed.fields, body: parsed.blocks });
  let laid = layoutDocument(doc);
  console.log('start pages:', laid.pages.length);

  for (const after of [0, 1]) {
    const withPage = insertPage(doc, laid, after);
    const laid2 = layoutDocument(withPage);
    const blanks = laid2.pages.filter((p) => p.frames.length === 0).map((p) => p.index);
    console.log(`\naddPage(after ${after}) -> ${laid2.pages.length} pages, blank pages: [${blanks}]`);

    for (const blank of blanks) {
      const removed = deletePage(withPage, laid2, blank);
      const laid3 = layoutDocument(removed);
      const stillBlank = laid3.pages.filter((p) => p.frames.length === 0).map((p) => p.index);
      console.log(
        `  deletePage(${blank}) -> ${laid3.pages.length} pages (was ${laid2.pages.length}), blanks now [${stillBlank}]`,
      );
    }
  }

  // Deleting a real content page should take its content with it.
  const before = laid.pages.length;
  const removed = deletePage(doc, laid, 1);
  console.log(`\ndeletePage(1) on content page -> ${layoutDocument(removed).pages.length} pages (was ${before})`);
  void doc; void laid;
}
main();
