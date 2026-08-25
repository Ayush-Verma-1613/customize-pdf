'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Copy,
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
  deleteDocument,
  duplicateDocument,
  listDocuments,
  readDocumentFile,
  saveDocument,
  type DocumentSummary,
} from '@/lib/store/storage';
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
  const importRef = useRef<HTMLInputElement>(null);

  const template = getTemplate(templateId) ?? TEMPLATES[0];

  const refresh = useCallback(async () => {
    setDocuments(await listDocuments());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    const doc = await readDocumentFile(file);
    if (!doc) return;
    doc.id = uid('doc');
    await saveDocument(doc);
    router.push(`/editor/${doc.id}`);
  };

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
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
              icon={<FileUp size={14} />}
              onClick={() => importRef.current?.click()}
            >
              Import a file
            </Button>
            <input
              ref={importRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                void importFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
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
                    <div className="grid gap-2.5 sm:grid-cols-2">
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
                          <span className="mt-1 block text-[11px] leading-relaxed text-faint">
                            {item.description}
                          </span>
                          <span className="mt-2 block rounded-lg bg-slate-50 px-2 py-1.5">
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

        <section className="mt-12">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold tracking-[0.08em] text-muted uppercase">
              My documents
            </h2>
            <Button
              size="sm"
              tone="ghost"
              icon={<Plus size={13} />}
              onClick={async () => {
                const doc = createDocument('Untitled document');
                await saveDocument(doc);
                router.push(`/editor/${doc.id}`);
              }}
            >
              Blank page
            </Button>
          </div>

          {documents === null ? (
            <p className="text-sm text-muted">Looking for your documents…</p>
          ) : documents.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line bg-panel px-4 py-8 text-center text-sm text-muted">
              Nothing saved yet. Create your first document above — it is stored
              in this browser, so it will be waiting when you come back.
            </p>
          ) : (
            <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((summary) => (
                <li
                  key={summary.id}
                  className="group relative rounded-xl border border-line bg-panel p-3.5 transition-shadow hover:shadow-sm"
                >
                  <Link href={`/editor/${summary.id}`} className="block">
                    <p className="truncate text-[14px] font-medium text-ink">{summary.title}</p>
                    <p className="mt-0.5 text-[11px] text-faint">
                      {getTemplate(summary.templateId ?? '')?.name ?? 'Document'} ·{' '}
                      {summary.pageCount} page{summary.pageCount === 1 ? '' : 's'}
                    </p>
                    <p className="mt-2 text-[11px] text-faint">
                      Edited {formatWhen(summary.updatedAt)}
                    </p>
                  </Link>

                  <span className="absolute top-2.5 right-2.5 hidden gap-0.5 group-hover:flex">
                    <button
                      type="button"
                      title="Duplicate"
                      aria-label="Duplicate"
                      onClick={async () => {
                        await duplicateDocument(summary.id, uid('doc'));
                        void refresh();
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-slate-100"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      aria-label="Delete"
                      onClick={async () => {
                        await deleteDocument(summary.id);
                        void refresh();
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-danger hover:bg-danger-wash"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
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
