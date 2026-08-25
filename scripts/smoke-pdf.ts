/* Renders the smoke document to a real PDF, with fonts served off disk. */
import { readFile, writeFile } from 'node:fs/promises';
import { buildPdf } from '../src/lib/export/pdf';
import { layoutDocument } from '../src/lib/engine/layout';
import { parseContent, SAMPLE_INPUT } from '../src/lib/parse/content';
import { buildFromTemplate } from '../src/lib/templates';

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.startsWith('/fonts/')) {
    const bytes = await readFile(`public${url}`);
    return new Response(new Uint8Array(bytes));
  }
  return realFetch(input as RequestInfo, init);
}) as typeof fetch;

async function main() {
const parsed = parseContent(SAMPLE_INPUT);
const doc = buildFromTemplate('question-paper-classic', {
  title: 'Science — Half Yearly',
  fields: parsed.fields,
  body: parsed.blocks,
});
const laid = layoutDocument(doc);
const bytes = await buildPdf(doc, laid, { onProgress: (d, t) => console.log(`page ${d}/${t}`) });
  await writeFile('/tmp/claude-1000/-home-digital-guru-ji/37cb2623-8232-469e-931a-4124cd2ce8a9/scratchpad/paper.pdf', bytes);
  console.log('wrote', bytes.length, 'bytes');
}

main().catch((e) => { console.error(e); process.exit(1); });
