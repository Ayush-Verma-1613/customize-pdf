# Docraft

A browser-based document designer for teachers. Paste your questions in as plain
text, pick a template, and get a laid-out question paper, worksheet or
certificate you can edit anywhere and export as a PDF that prints exactly as the
screen showed it.

Everything runs client-side. There is no server, no account and no upload — your
documents never leave the browser.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm run build     # production build
npm run lint      # eslint
npx tsc --noEmit  # type check
```

## What it does

- **13 templates** across teaching (question papers, exam booklets, worksheets,
  assignments, answer sheets), school admin (notices, certificates, forms),
  business (reports, invoices) and personal (a CV in three layouts).
- **Body layouts.** A template can arrange its body more than one way — the CV
  ships as a one-column ATS-safe layout, a two-column one and a student one.
  Switching between them keeps your words, your fonts and your margins; only
  the arrangement underneath changes.
- **Text in, document out.** Numbered lines become numbered questions, `Section A`
  starts a section, `[2]` sets the marks. Insert a question in the middle and
  everything after it renumbers and reflows.
- **Two kinds of element.** Content *flows* — headings, paragraphs, questions,
  lists, tables and images sit in a stream that wraps and spills onto the next
  page on its own. Drawn elements — text boxes, shapes, lines, logos — are
  *pinned* to one page at the exact spot you drop them.
- **Real typesetting.** Multi-column flow, widows and orphans, keep-together and
  keep-with-next, tables that split across pages and repeat their header row,
  per-section question numbering, headers and footers with `{{token}}`
  substitution, watermarks.
- **Import** `.json`, `.pdf`, `.docx`, `.txt`, `.md`, `.html` and images. Anything
  that is not a Docraft document is read for its text and structure and run
  through the same parser the paste box uses, so it arrives as editable
  questions and tables rather than a picture of a document.
- **Export** to PDF, optionally with the editable document embedded as an
  attachment — reopening that PDF here restores the document exactly.
- **Imports arrive as themselves.** A `.docx`, PDF or text file is never poured
  into a template behind your back; the content lands plain and, if it looks
  like a question paper, that template is *offered* afterwards in one click.
- **Works on a phone.** Panels become a bottom sheet, pinch zooms, and the
  selected element's controls dock above the tab bar.

## Finding things

The panels down the left are for browsing. They only help once you already know
which drawer a thing lives in, so most of the app reaches you a different way.

- **`Ctrl/⌘K` finds any tool by name.** Type roughly what you mean — "watermark",
  "two columns", "bigger", "arial" — and the thing itself comes to you. Leave the
  box empty and it lists everything the app can do, grouped.
- **Selecting something brings its own controls to it.** A heading offers H1–H4,
  alignment and colour; a question offers marks, answer lines and sub-parts; a
  table offers add row, add column and repeat-header. The full inspector is still
  a click away for the long tail.
- **Every gap between blocks is an insertion point.** Point at the space between
  two questions and a `+` appears there; what you add lands where you pointed,
  and what you copied can be pasted straight into that gap.
- **Right-click** anything for the actions that apply to it.
- **Formatting follows what you selected.** Double-click into text and a format bar
  appears: with words selected it bolds, italicises, underlines, colours or
  highlights just those words; with the caret parked and nothing selected it
  applies to the whole text. Ctrl+B/I/U work there too.

## Paste syntax

Every rule is a fixed pattern. There is no guessing and no model involved, so the
same input always produces the same document.

| You type | You get |
| --- | --- |
| `Subject: Science` | Fills a heading field (school, exam, class, time, marks, date, …) |
| `Section A` | A new section, with numbering optionally restarting |
| `Instructions: …` | The section's instruction line |
| `# Heading` … `#### Heading` | Headings, levels 1–4 |
| `1. Your question [2]` | A question worth 2 marks |
| `(a) A sub-part [1]` | A sub-part of the question above |
| `a) An option` | A multiple-choice option |
| `- A bullet` | A bulleted list |
| `[ ] A tick box` | A checkbox item |
| `\| Cell \| Cell \|` | A table row |
| `[[lines:4]]` | Four ruled answer lines |
| `[[pagebreak]]` | Start a new page here |
| `---` | A divider |

Marks can be written `[2]`, `(2)` or `(2 marks)`. Inline markup is a small closed
set that round-trips losslessly back to plain text: `**bold**`, `*italic*`,
`__underline__`, `~~strike~~`, `==highlight==`, `^{super}`, `_{sub}`.

## How it works

The whole app rests on one decision: **the layout engine runs once, and both
renderers draw its output.**

```
PaperDoc  ──layoutDocument()──▶  LaidOutDoc  ──┬──▶  PageSvg   (the editor)
(the data)                       (frames)      └──▶  pdf.ts    (the export)
```

A `LaidOutDoc` is a flat list of frames per page with absolute geometry and no
remaining decisions — every line break, baseline and column position is already
fixed. Nothing is re-flowed on the way out, so "the PDF matches the editor" is
true by construction rather than by keeping two renderers carefully in step.

Three things hold that together:

**One coordinate space.** All geometry is in PostScript points, origin top-left,
y growing downwards. That is exactly SVG's user space and exactly the PDF drawing
model, so nothing has to be translated between what the engine computed, what the
screen shows and what gets printed. The canvas is SVG rather than positioned
HTML for the same reason — `<text y>` names the alphabetic baseline in both — and
it stays crisp at any zoom.

**One measurer.** `engine/measure.ts` measures text with Canvas2D against the
very same TTF that the exporter embeds, which is why wrapped lines break in the
same place on screen and on paper. Five families ship with the app (Tinos,
Arimo, Inter, Lora, Cousine — Times-, Arial- and Courier-compatible among them),
four styles each. Until every face has loaded, layout falls back to a
deterministic width approximation and reports itself as inexact; it is
recomputed once the real fonts are in.

**Memoised measurement.** Measuring dominates layout cost, so compiled flow items
are cached in a `WeakMap` keyed on the block object itself. Edits are immutable,
so every changed block gets a fresh identity — which invalidates exactly the
blocks that actually changed and nothing else.

## Project layout

```
src/
  app/                    Next.js routes — a home page and /editor/[id]
  lib/
    model/                The document model: blocks, overlays, theme, defaults
    engine/               Layout: text wrapping, blocks, tables, numbering, pagination
    parse/                Plain text and inline markup → blocks
    import/               .pdf / .docx / .html / image → a document
    export/               LaidOutDoc → PDF, via pdf-lib and fontkit
    store/                Zustand editor state, undo/redo, IndexedDB persistence
    templates/            The 12 starting points
  components/
    home/                 Content in, template chosen, into the editor
    editor/canvas/        The SVG page, selection, drag, inline text editing
    editor/panels/        Elements, content, templates, pages, document, help
    ui/                   Buttons, fields, colour picker, bottom sheet
scripts/                  Headless engine checks — run with npx tsx
public/fonts/             The five shipped faces, 20 files
```

## Storage

**Nothing leaves the browser.** There is no account and no server copy — which
also means this browser is the only place a document lives, so anything that
matters should be exported as a PDF or saved as a copy. Clearing site data takes
the documents with it. The app says so on the home screen and in the document
menu rather than leaving people to find out.

Documents live in IndexedDB, because a worksheet full of embedded images will
blow straight past the ~5MB localStorage ceiling. A localStorage mirror of the
most recent document is kept alongside as a crash-recovery net, since it can be
written synchronously during page unload. Editing saves itself about a second
after you stop typing, and the Save control in the toolbar both reports the
state and writes immediately when pressed. "Save a copy to my computer" writes a
`.docraft.json` file that imports back byte-for-byte.

## Keyboard

| | |
| --- | --- |
| `Ctrl/Cmd Z`, `Ctrl/Cmd Shift Z` | Undo, redo |
| `Ctrl/Cmd D` | Duplicate the selection |
| `Ctrl/Cmd C`, `Ctrl/Cmd V` | Copy, paste |
| `Ctrl/Cmd` + scroll | Zoom the page |
| `Enter` | Edit the selected element's text |
| Arrow keys | Nudge a drawn element by 1pt, or 10pt with `Shift` |
| `Delete`, `Escape` | Delete the selection, clear the selection |

## Known limits

- There is no automated test suite. `scripts/` holds headless smoke checks that
  print their results for a human to read; the engine is pure and DOM-free, so
  golden-file tests over `LaidOutDoc` would be the obvious next step.
- Only the five shipped font families are available, since measurement and
  embedding both depend on having the file locally.
- A body layout owns the flow and nothing else, so a variant cannot change the
  page orientation or column count — those stay separate templates.
- Character-level formatting covers weight, slant, underline, strike, colour and
  highlight. Per-word *font* and *size* are not exposed: neither survives the
  contentEditable round trip without extending the HTML bridge on both sides.
- The old `.doc` format cannot be read; save as `.docx` first.
- PDF import recovers text and structure, not the original visual design, unless
  the PDF was exported from Docraft with its source attached.
