'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  Copy,
  Download,
  FileUp,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { createDocument } from '@/lib/model/factory';
import { parseContent, SAMPLE_INPUT } from '@/lib/parse/content';
import { TEMPLATES, TEMPLATE_CATEGORIES, buildFromTemplate, getTemplate } from '@/lib/templates';
import {
  deleteAllDocuments,
  deleteDocument,
  duplicateDocument,
  downloadDocumentFile,
  listDocuments,
  loadDocument,
  saveDocument,
  type DocumentSummary,
} from '@/lib/store/storage';
import { ACCEPTED_IMPORT_TYPES, ImportError, importFile } from '@/lib/import';
import { cx } from '@/lib/utils/cx';
import { uid } from '@/lib/utils/id';
import { Button, Field, TextInput } from '@/components/ui/primitives';

/**
 * The starting point: content in, template chosen, straight into the editor.
 * The order of the form follows the order of the decision - what you are
 * making, what it is called, and the words that go in it.
 */
export function HomeClient() {
  const router = useRouter();
  const [templateId, setTemplateId] = useState('question-paper-classic');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProblem, setImportProblem] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const template = getTemplate(templateId) ?? TEMPLATES[0];

  // A counter rather than a direct setState call, so reloading the list is a
  // subscription the effect reacts to instead of a render-time side effect.
  const [reloadToken, setReloadToken] = useState(0);
  const refresh = useCallback(async () => {
    setReloadToken((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    listDocuments().then((rows) => {
      if (!cancelled) setDocuments(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const create = async () => {
    setBusy(true);
    try {
      const parsed = content.trim() ? parseContent(content) : null;
      const merged = { ...(parsed?.fields ?? {}), ...stripEmpty(fields) };
      const doc = buildFromTemplate(templateId, {
        title: title.trim() || defaultTitle(template.name, merged),
        fields: merged,
        body: template.acceptsContent ? (parsed?.blocks ?? []) : [],
      });
      doc.id = uid('doc');
      await saveDocument(doc);
      router.push(`/editor/${doc.id}`);
    } finally {
      setBusy(false);
    }
  };

  const runImport = async (file: File | undefined) => {
    if (!file) return;
    setImportProblem(null);
    setImporting(true);
    try {
      const result = await importFile(file);
      await saveDocument(result.doc);
      router.push(`/editor/${result.doc.id}`);
    } catch (error) {
      setImportProblem(
        error instanceof ImportError
          ? error.message
          : `That file could not be opened. ${error instanceof Error ? error.message : ''}`.trim(),
      );
      setImporting(false);
    }
  };

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-white">
            <Sparkles size={17} />
          </span>
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold text-ink">Paperforge</h1>
            <p className="text-[12px] text-muted">
              Type your content. The layout is handled for you.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              icon={importing ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
              disabled={importing}
              onClick={() => importRef.current?.click()}
              title="Open a PDF, Word file, text file or Paperforge document"
            >
              <span className="hidden sm:inline">
                {importing ? 'Reading the file…' : 'Import a file'}
              </span>
              <span className="sm:hidden">{importing ? '…' : 'Import'}</span>
            </Button>
            <input
              ref={importRef}
              type="file"
              accept={ACCEPTED_IMPORT_TYPES}
              className="hidden"
              onChange={(e) => {
                void runImport(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {importProblem ? (
          <p className="animate-rise mb-4 flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-wash px-4 py-3 text-[13px] leading-relaxed text-danger">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span className="flex-1">{importProblem}</span>
            <button
              type="button"
              onClick={() => setImportProblem(null)}
              className="shrink-0 underline-offset-2 hover:underline"
            >
              Dismiss
            </button>
          </p>
        ) : null}

        <HowItWorks />

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <h2 className="text-[13px] font-semibold tracking-[0.08em] text-muted uppercase">
              1 · Choose a document
            </h2>
            <div className="mt-3 grid gap-5">
              {TEMPLATE_CATEGORIES.map((category) => {
                const items = TEMPLATES.filter((t) => t.category === category);
                if (!items.length) return null;
                return (
                  <div key={category}>
                    <h3 className="mb-2 text-[12px] font-medium text-faint">{category}</h3>
                    <div className="grid grid-cols-2 gap-2.5">
                      {items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setTemplateId(item.id)}
                          className={cx(
                            'rounded-xl border bg-panel p-3 text-left transition-all',
                            item.id === templateId
                              ? 'border-transparent ring-2 ring-ink'
                              : 'border-line hover:border-slate-300 hover:shadow-sm',
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ background: item.accent }}
                            />
                            <span className="text-[13px] font-medium text-ink">{item.name}</span>
                          </span>
                          <span className="mt-1 line-clamp-3 block text-[11px] leading-relaxed text-faint sm:line-clamp-none">
                            {item.description}
                          </span>
                          <span className="mt-2 hidden rounded-lg bg-slate-50 px-2 py-1.5 sm:block">
                            {item.preview.map((line, i) => (
                              <span
                                key={i}
                                className={cx(
                                  'block truncate font-mono text-[10px]',
                                  i === 0 ? 'text-ink-soft' : 'text-faint',
                                )}
                              >
                                {line}
                              </span>
                            ))}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-2xl border border-line bg-panel p-4 panel-shadow">
              <h2 className="text-[13px] font-semibold tracking-[0.08em] text-muted uppercase">
                2 · Fill in the details
              </h2>

              <div className="mt-3 grid gap-2.5">
                <Field label="Document name">
                  <TextInput
                    value={title}
                    placeholder={defaultTitle(template.name, fields)}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </Field>

                {template.fields.map((field) => (
                  <Field key={field.key} label={field.label}>
                    <TextInput
                      value={fields[field.key] ?? ''}
                      placeholder={field.placeholder}
                      onChange={(e) =>
                        setFields((current) => ({ ...current, [field.key]: e.target.value }))
                      }
                    />
                  </Field>
                ))}
              </div>

              {template.acceptsContent ? (
                <div className="mt-4">
                  <h2 className="text-[13px] font-semibold tracking-[0.08em] text-muted uppercase">
                    3 · Paste your content
                  </h2>
                  <p className="mt-1 mb-2 text-[11px] leading-relaxed text-faint">
                    Optional. Numbered lines become questions, <code>Section A</code>{' '}
                    starts a section, and <code>[2]</code> at the end sets the
                    marks.
                  </p>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={7}
                    spellCheck={false}
                    placeholder={"Section A\n\n1. Define photosynthesis. [2]\n2. State Newton's first law. [3]"}
                    className="w-full resize-y rounded-lg border border-line bg-white p-2.5 font-mono text-[12px] leading-relaxed text-ink placeholder:text-faint focus:border-question-hue focus:ring-2 focus:ring-question-hue/15 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setContent(SAMPLE_INPUT)}
                    className="mt-1.5 text-[11px] text-muted underline-offset-2 hover:text-ink hover:underline"
                  >
                    Fill in an example
                  </button>
                </div>
              ) : null}

              <Button
                tone="primary"
                size="lg"
                className="mt-4 w-full"
                disabled={busy}
                onClick={create}
                icon={busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
              >
                Create the document
              </Button>
            </div>
          </div>
        </section>

        <DocumentLibrary
          documents={documents}
          onRefresh={refresh}
          onNewBlank={async () => {
            const doc = createDocument('Untitled document');
            await saveDocument(doc);
            router.push(`/editor/${doc.id}`);
          }}
        />

      </main>
    </div>
  );
}

/**
 * The saved-document list.
 *
 * Deleting is permanent - nothing is stored anywhere but this browser - so both
 * the single and the bulk delete ask once, in place, and say what will be lost.
 * The actions are always visible rather than revealed on hover, because on a
 * phone there is no hover to reveal them with.
 */
function DocumentLibrary({
  documents,
  onRefresh,
  onNewBlank,
}: {
  documents: DocumentSummary[] | null;
  onRefresh: () => Promise<void>;
  onNewBlank: () => void;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [working, setWorking] = useState(false);

  const removeOne = async (id: string) => {
    setWorking(true);
    await deleteDocument(id);
    await onRefresh();
    setConfirmingId(null);
    setWorking(false);
  };

  const removeAll = async () => {
    setWorking(true);
    await deleteAllDocuments();
    await onRefresh();
    setConfirmingAll(false);
    setWorking(false);
  };

  const saveCopy = async (id: string) => {
    const doc = await loadDocument(id);
    if (doc) downloadDocumentFile(doc);
  };

  return (
    <section className="mt-12">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold tracking-[0.08em] text-muted uppercase">
          My documents{documents?.length ? ` · ${documents.length}` : ''}
        </h2>
        <div className="flex items-center gap-1.5">
          <Button size="sm" tone="ghost" icon={<Plus size={13} />} onClick={onNewBlank}>
            Blank page
          </Button>
          {documents?.length ? (
            <Button
              size="sm"
              tone="ghost"
              className="text-danger hover:bg-danger-wash"
              icon={<Trash2 size={13} />}
              onClick={() => {
                setConfirmingId(null);
                setConfirmingAll(true);
              }}
            >
              Delete all
            </Button>
          ) : null}
        </div>
      </div>

      {confirmingAll ? (
        <div className="animate-rise mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-danger/25 bg-danger-wash px-4 py-3">
          <p className="flex-1 text-[13px] leading-relaxed text-danger">
            Delete all {documents?.length ?? 0} documents? They are stored only
            in this browser, so this cannot be undone.
          </p>
          <Button
            size="sm"
            tone="danger"
            disabled={working}
            icon={working ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            onClick={removeAll}
          >
            Yes, delete everything
          </Button>
          <Button size="sm" onClick={() => setConfirmingAll(false)}>
            Keep them
          </Button>
        </div>
      ) : null}

      {documents === null ? (
        <p className="text-sm text-muted">Looking for your documents…</p>
      ) : documents.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-panel px-4 py-8 text-center text-sm text-muted">
          Nothing saved yet. Create your first document above — it is stored in
          this browser, so it will be waiting when you come back.
        </p>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((summary) => (
            <li
              key={summary.id}
              className="flex flex-col rounded-xl border border-line bg-panel p-3.5 transition-shadow hover:shadow-sm"
            >
              <Link href={`/editor/${summary.id}`} className="block min-w-0">
                <p className="truncate text-[14px] font-medium text-ink">{summary.title}</p>
                <p className="mt-0.5 text-[11px] text-faint">
                  {getTemplate(summary.templateId ?? '')?.name ?? 'Document'} ·{' '}
                  {summary.pageCount} page{summary.pageCount === 1 ? '' : 's'}
                </p>
                <p className="mt-2 text-[11px] text-faint">
                  Edited {formatWhen(summary.updatedAt)}
                </p>
              </Link>

              {confirmingId === summary.id ? (
                <div className="animate-rise mt-3 flex items-center gap-1.5 border-t border-line-soft pt-2.5">
                  <span className="flex-1 text-[11.5px] leading-snug text-danger">
                    Delete this document?
                  </span>
                  <Button size="sm" tone="danger" disabled={working} onClick={() => removeOne(summary.id)}>
                    Delete
                  </Button>
                  <Button size="sm" tone="ghost" onClick={() => setConfirmingId(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-0.5 border-t border-line-soft pt-2.5">
                  <CardAction
                    label="Duplicate"
                    onClick={async () => {
                      await duplicateDocument(summary.id, uid('doc'));
                      await onRefresh();
                    }}
                  >
                    <Copy size={13} />
                  </CardAction>
                  <CardAction label="Save a copy to my computer" onClick={() => saveCopy(summary.id)}>
                    <Download size={13} />
                  </CardAction>
                  <CardAction
                    label="Delete"
                    danger
                    className="ml-auto"
                    onClick={() => {
                      setConfirmingAll(false);
                      setConfirmingId(summary.id);
                    }}
                  >
                    <Trash2 size={13} />
                  </CardAction>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CardAction({
  label,
  onClick,
  danger,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cx(
        'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
        danger ? 'text-danger hover:bg-danger-wash' : 'text-muted hover:bg-slate-100',
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * A short explainer above the fold. New users arrive here first and the whole
 * product rests on one idea - you supply the words, the layout is worked out -
 * so it is worth thirty seconds of their attention before the form.
 */
function HowItWorks() {
  const [open, setOpen] = useState(false);

  const steps = [
    { n: '1', title: 'Enter your content', body: 'Type it, or paste it straight out of Word.' },
    { n: '2', title: 'Pick a document', body: 'A question paper, worksheet, notice, certificate…' },
    { n: '3', title: 'It lays itself out', body: 'Numbering, spacing and page breaks are automatic.' },
    { n: '4', title: 'Change anything', body: 'Click any part of the page and edit it.' },
    { n: '5', title: 'Export a PDF', body: 'What you see is exactly what prints.' },
  ];

  return (
    <section className="rounded-2xl border border-line bg-panel p-4 panel-shadow">
      <div className="grid gap-3 sm:grid-cols-5">
        {steps.map((step) => (
          <div key={step.n} className="flex gap-2.5 sm:block">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white sm:mb-1.5">
              {step.n}
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-ink">{step.title}</span>
              <span className="mt-0.5 block text-[11.5px] leading-relaxed text-faint">
                {step.body}
              </span>
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mt-3 flex items-center gap-1 text-[12px] font-medium text-muted transition-colors hover:text-ink"
      >
        What can I paste in?
        <ChevronDown size={13} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {open ? (
        <div className="animate-rise mt-2.5 grid gap-1.5 border-t border-line-soft pt-3 sm:grid-cols-2">
          {[
            ['Subject: Science', 'Fills in a heading field'],
            ['Section A', 'Starts a new section'],
            ['1. Your question [2]', 'A question worth 2 marks'],
            ['(a) A sub-part [1]', 'Sub-part of the question above'],
            ['a) An option', 'Multiple-choice option'],
            ['- A bullet', 'Bulleted list'],
            ['| Cell | Cell |', 'A table row'],
            ['[[lines:4]]', 'Four ruled answer lines'],
            ['[[pagebreak]]', 'Start a new page'],
            ['**bold** *italic*', 'Emphasis inside a line'],
          ].map(([pattern, meaning]) => (
            <div key={pattern} className="flex items-baseline gap-2">
              <code className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] text-ink-soft">
                {pattern}
              </code>
              <span className="min-w-0 flex-1 text-[11px] text-faint">{meaning}</span>
            </div>
          ))}
          <p className="text-[11px] text-faint sm:col-span-2">
            None of this is required — you can also start with a blank page and
            build it by hand, or use <strong className="text-muted">Import a
            file</strong> to open a Word document, a PDF, a text file or a
            Paperforge document you saved earlier. Everything the layout decides
            can be overridden afterwards.
          </p>
        </div>
      ) : null}
    </section>
  );
}

const stripEmpty = (fields: Record<string, string>) =>
  Object.fromEntries(Object.entries(fields).filter(([, value]) => value.trim()));

function defaultTitle(templateName: string, fields: Record<string, string>) {
  const subject = fields.subject?.trim();
  const klass = fields.class?.trim();
  if (subject && klass) return `${subject} — Class ${klass}`;
  if (subject) return subject;
  return templateName;
}

function formatWhen(iso: string) {
  const then = new Date(iso).getTime();
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
}
