'use client';

import { createDocument } from '@/lib/model/factory';
import type { Block, PaperDoc } from '@/lib/model/types';
import { parseContent } from '@/lib/parse/content';
import { normaliseDocument } from '@/lib/model/validate';
import { uid } from '@/lib/utils/id';
import { buildFromTemplate } from '@/lib/templates';
import { fileToImage } from '@/lib/export/images';
import { htmlToBlocks } from './html';

/**
 * Importing somebody else's file.
 *
 * A Docraft document comes back exactly as it left. Everything else - a PDF,
 * a Word file, a text file - is read for its *text and structure*, then run
 * through the same parser the paste box uses, so it arrives as real editable
 * questions, headings and tables rather than a picture of a document.
 */

export interface ImportResult {
  doc: PaperDoc;
  /** How faithful the import was, so the UI can set expectations. */
  fidelity: 'exact' | 'structured' | 'text-only';
  note?: string;
  /**
   * A template the content looks like it wants, offered afterwards rather than
   * applied. An import should arrive as what it is; restyling is a decision.
   */
  suggestedTemplate?: string;
}

export class ImportError extends Error {}

const extension = (name: string) => name.slice(name.lastIndexOf('.') + 1).toLowerCase();

export const ACCEPTED_IMPORT_TYPES =
  '.json,.pdf,.docx,.txt,.md,.markdown,.html,.htm,image/*';

export async function importFile(file: File): Promise<ImportResult> {
  const ext = extension(file.name);

  if (ext === 'json') return fromJson(file);
  if (ext === 'pdf') return fromPdf(file);
  if (ext === 'docx') return fromDocx(file);
  if (ext === 'html' || ext === 'htm') return fromHtml(await file.text(), file.name);
  if (ext === 'txt' || ext === 'md' || ext === 'markdown') {
    return fromPlainText(await file.text(), file.name);
  }
  if (file.type.startsWith('image/')) return fromImage(file);

  if (ext === 'doc') {
    throw new ImportError(
      'The old .doc format cannot be read here. Open it in Word and save it as .docx, then try again.',
    );
  }
  throw new ImportError(
    `Docraft cannot read a .${ext} file. It accepts .json, .pdf, .docx, .txt, .md, .html and images.`,
  );
}

const titleFrom = (fileName: string) =>
  fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Imported document';

/* ------------------------------------------------------------------ *
 * Docraft's own format
 * ------------------------------------------------------------------ */

async function fromJson(file: File): Promise<ImportResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new ImportError('That file is not valid JSON.');
  }
  const doc = normaliseDocument(parsed);
  if (!doc) {
    throw new ImportError('That JSON file is not a Docraft document.');
  }
  return { doc: reKey(doc), fidelity: 'exact' };
}

/** A fresh identity, so importing twice gives two documents rather than a clash. */
function reKey(doc: PaperDoc): PaperDoc {
  const now = new Date().toISOString();
  return { ...doc, id: uid('doc'), createdAt: doc.createdAt || now, updatedAt: now };
}

/* ------------------------------------------------------------------ *
 * PDF
 * ------------------------------------------------------------------ */

async function fromPdf(file: File): Promise<ImportResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());

  // A PDF exported from here carries its own source as an attachment.
  const embedded = await extractAttachedSource(bytes);
  if (embedded) {
    return {
      doc: reKey(embedded),
      fidelity: 'exact',
      note: 'This PDF was made in Docraft, so the original editable document came back with it.',
    };
  }

  const text = await extractPdfText(bytes);
  if (!text.trim()) {
    throw new ImportError(
      'No text could be read from that PDF. Scanned pages are images, so there is nothing to import.',
    );
  }
  return {
    ...fromParsedText(text, titleFrom(file.name)),
    fidelity: 'text-only',
    note: 'The text was read out of the PDF and re-laid-out. Check the numbering and spacing before you print.',
  };
}

/** Pull an embedded Docraft source out of a PDF's attachment table. */
async function extractAttachedSource(bytes: Uint8Array): Promise<PaperDoc | null> {
  try {
    const { PDFDocument, PDFName, PDFRawStream } = await import('pdf-lib');
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, throwOnInvalidObject: false });

    // pdf-lib writes attachments but exposes no reader, so the embedded file
    // streams are picked out of the object table directly.
    for (const [, object] of pdf.context.enumerateIndirectObjects()) {
      if (!(object instanceof PDFRawStream)) continue;
      if (object.dict.get(PDFName.of('Type'))?.toString() !== '/EmbeddedFile') continue;
      try {
        const doc = normaliseDocument(JSON.parse(new TextDecoder().decode(object.getContents())));
        if (doc) return doc;
      } catch {
        // Some other kind of attachment; keep looking.
      }
    }
  } catch {
    // A PDF we cannot open with pdf-lib can still be read for its text below.
  }
  return null;
}

/**
 * Reconstructs reading-order text from a PDF. Items are grouped into lines by
 * their baseline and separated by their horizontal gaps, which is enough for
 * the content parser to recognise question numbers and sections again.
 */
async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  // The worker is bundled alongside the app rather than fetched from a CDN, so
  // importing a PDF keeps working offline.
  pdfjs.GlobalWorkerOptions.workerPort = new Worker(
    new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url),
    { type: 'module' },
  );

  const task = pdfjs.getDocument({ data: bytes });
  const pdf = await task.promise;
  const pages: string[] = [];

  for (let index = 1; index <= pdf.numPages; index += 1) {
    const page = await pdf.getPage(index);
    const content = await page.getTextContent();

    interface Piece {
      text: string;
      x: number;
      y: number;
      width: number;
    }
    const pieces: Piece[] = [];
    for (const item of content.items) {
      if (!('str' in item) || !item.str) continue;
      const transform = item.transform as number[];
      pieces.push({ text: item.str, x: transform[4], y: transform[5], width: item.width ?? 0 });
    }

    // Group by baseline, allowing for slight rounding between glyph runs.
    pieces.sort((a, b) => b.y - a.y || a.x - b.x);
    const lines: Piece[][] = [];
    for (const piece of pieces) {
      const last = lines[lines.length - 1];
      if (last && Math.abs(last[0].y - piece.y) < 2.5) last.push(piece);
      else lines.push([piece]);
    }

    const rendered = lines.map((line) => {
      line.sort((a, b) => a.x - b.x);
      let text = '';
      let cursor = -Infinity;
      for (const piece of line) {
        // A gap wider than a space means a real word break.
        if (cursor > -Infinity && piece.x - cursor > 1.2 && !/\s$/.test(text)) text += ' ';
        text += piece.text;
        cursor = piece.x + piece.width;
      }
      return text.replace(/\s+/g, ' ').trim();
    });

    pages.push(rendered.filter(Boolean).join('\n'));
    page.cleanup();
  }

  await task.destroy();
  return pages.join('\n\n[[pagebreak]]\n\n');
}

/* ------------------------------------------------------------------ *
 * Word
 * ------------------------------------------------------------------ */

async function fromDocx(file: File): Promise<ImportResult> {
  const mammoth = await import('mammoth/mammoth.browser');
  let html: string;
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
    html = result.value;
  } catch {
    throw new ImportError('That Word file could not be read. It may be password protected.');
  }
  if (!html.trim()) {
    throw new ImportError('That Word file appears to be empty.');
  }
  return {
    ...fromHtml(html, file.name),
    fidelity: 'structured',
    note: 'Headings, lists and tables came across. Fonts, colours and page setup are taken from the template.',
  };
}

/* ------------------------------------------------------------------ *
 * HTML and plain text
 * ------------------------------------------------------------------ */

function fromHtml(html: string, fileName: string): ImportResult {
  const blocks = htmlToBlocks(html);
  if (!blocks.length) throw new ImportError('Nothing readable was found in that file.');
  return { ...documentFrom(blocks, titleFrom(fileName)), fidelity: 'structured' };
}

function fromPlainText(text: string, fileName: string): ImportResult {
  if (!text.trim()) throw new ImportError('That file is empty.');
  return { ...fromParsedText(text, titleFrom(fileName)), fidelity: 'structured' };
}

function fromParsedText(text: string, title: string): ImportResult {
  const parsed = parseContent(text);
  if (!parsed.blocks.length) throw new ImportError('Nothing readable was found in that file.');
  return {
    ...documentFrom(parsed.blocks, title, parsed.fields),
    fidelity: 'structured',
  };
}

/* ------------------------------------------------------------------ *
 * Images
 * ------------------------------------------------------------------ */

async function fromImage(file: File): Promise<ImportResult> {
  const image = await fileToImage(file);
  const doc = createDocument(titleFrom(file.name));
  const width = Math.min(420, doc.page.width - doc.page.margins.left - doc.page.margins.right);
  doc.flow = [
    {
      id: uid('b'),
      type: 'image',
      src: image.src,
      naturalWidth: image.width,
      naturalHeight: image.height,
      width,
      fit: 'contain',
    },
  ];
  return {
    doc,
    fidelity: 'structured',
    note: 'The picture was placed on a blank page. Add your own text around it.',
  };
}

/* ------------------------------------------------------------------ *
 * Shared
 * ------------------------------------------------------------------ */

/**
 * Imported content arrives as itself.
 *
 * Dropping somebody's file straight into a question-paper template used to give
 * them back a document with a masthead and instruction box they never asked
 * for, which reads as the import having gone wrong. So the content lands plain,
 * and if it looks like a paper that is offered as a suggestion instead - one
 * click, taken or ignored.
 */
function documentFrom(
  blocks: Block[],
  title: string,
  fields: Record<string, string> = {},
): { doc: PaperDoc; suggestedTemplate?: string } {
  const looksLikeAPaper =
    blocks.some((b) => b.type === 'question') || Object.keys(fields).length > 1;

  const doc = buildFromTemplate('blank', { title, fields, body: blocks });
  doc.id = uid('doc');
  // The template did not ask for them, but a later restyle will want them.
  doc.fields = { ...fields };
  // Nothing here is the template's invention, so nothing may be regenerated away.
  doc.flow = doc.flow.map((block) => {
    const { generated: _generated, ...rest } = block;
    void _generated;
    return rest as Block;
  });

  return {
    doc,
    suggestedTemplate: looksLikeAPaper ? 'question-paper-classic' : undefined,
  };
}
