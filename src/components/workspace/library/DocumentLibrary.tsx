'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, FileDown, Loader2, ShieldCheck, Trash2, X } from 'lucide-react';
import {
  deleteAllDocuments,
  deleteDocument,
  downloadDocumentFile,
  duplicateDocument,
  listDocuments,
  loadDocument,
  type DocumentSummary,
} from '@/lib/store/storage';
import { getTemplate } from '@/lib/templates';
import { uid } from '@/lib/utils/id';
import { cx } from '@/lib/utils/cx';
import { Button } from '../ui/Button';

/**
 * Everything already made, in a drawer rather than on the workspace.
 *
 * The workspace is for making one document; the library is for the ones that
 * exist. Keeping them apart is what stops the main screen turning into a file
 * manager with a preview stuck to the side of it.
 */
export function DocumentLibrary({
  open,
  onClose,
  onOpenDocument,
}: {
  open: boolean;
  onClose: () => void;
  onOpenDocument: (id: string) => void;
}) {
  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null);
  const [working, setWorking] = useState(false);
  const [confirmingAll, setConfirmingAll] = useState(false);
  // Bumped after anything that changes the store, which is what the read below
  // is subscribed to - rather than the list being refetched imperatively.
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!open) return;
    let live = true;
    void listDocuments().then((list) => {
      if (live) setDocuments(list);
    });
    return () => {
      live = false;
    };
  }, [open, revision]);

  const act = async (job: () => Promise<unknown>) => {
    setWorking(true);
    try {
      await job();
      setRevision((n) => n + 1);
    } finally {
      setWorking(false);
      setConfirmingAll(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 z-40 bg-[#2A241D]/25"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="absolute inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-forge-line bg-[#FCFBF9]"
            aria-label="My documents"
          >
            <header className="flex h-[68px] shrink-0 items-center gap-3 border-b border-forge-line px-5">
              <h2 className="text-[15px] font-semibold text-forge-ink">
                My documents
                {documents?.length ? (
                  <span className="ml-1.5 text-forge-muted">· {documents.length}</span>
                ) : null}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="ml-auto rounded-lg p-1.5 text-forge-muted transition-colors hover:bg-black/[0.05] hover:text-forge-ink"
              >
                <X size={17} />
              </button>
            </header>

            <div className="forge-scroll min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4">
              <p className="mb-3 flex items-start gap-2 rounded-xl border border-forge-line bg-white px-3.5 py-2.5 text-[12px] leading-relaxed text-forge-ink-soft">
                <ShieldCheck size={15} className="mt-px shrink-0 text-forge-green" />
                <span>
                  <span className="font-medium text-forge-ink">Kept on this device.</span> There is
                  no account and no server copy, so export anything that matters — clearing your
                  browsing data would take these with it.
                </span>
              </p>

              {documents === null ? (
                <p className="py-8 text-center text-[13px] text-forge-muted">Looking…</p>
              ) : documents.length === 0 ? (
                <p className="rounded-xl border border-dashed border-forge-line px-4 py-10 text-center text-[13px] text-forge-muted">
                  Nothing saved yet. Make one on the left and it will be waiting here.
                </p>
              ) : (
                documents.map((summary) => (
                  <article
                    key={summary.id}
                    className="rounded-[13px] border border-forge-line bg-white p-3 transition-colors hover:border-[#DCD6CC]"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenDocument(summary.id)}
                      className="block w-full text-left"
                    >
                      <h3 className="truncate text-[13.5px] font-semibold text-forge-ink">
                        {summary.title}
                      </h3>
                      <p className="mt-0.5 text-[12px] text-forge-ink-soft">
                        {getTemplate(summary.templateId ?? '')?.name ?? 'Document'} ·{' '}
                        {summary.pageCount} page{summary.pageCount === 1 ? '' : 's'}
                      </p>
                    </button>

                    <div className="mt-2 flex items-center gap-1">
                      <Tool
                        label="Save a copy to my computer"
                        onClick={() =>
                          void act(async () => {
                            const doc = await loadDocument(summary.id);
                            if (doc) downloadDocumentFile(doc);
                          })
                        }
                      >
                        <FileDown size={14} />
                      </Tool>
                      <Tool
                        label="Duplicate"
                        onClick={() => void act(() => duplicateDocument(summary.id, uid('doc')))}
                      >
                        <Copy size={14} />
                      </Tool>
                      <Tool
                        label="Delete"
                        danger
                        onClick={() => void act(() => deleteDocument(summary.id))}
                      >
                        <Trash2 size={14} />
                      </Tool>
                    </div>
                  </article>
                ))
              )}
            </div>

            {documents?.length ? (
              <footer className="shrink-0 border-t border-forge-line px-5 py-3">
                {confirmingAll ? (
                  <div className="flex items-center gap-2">
                    <p className="flex-1 text-[12.5px] text-[#B4402B]">
                      Delete all {documents.length}? This cannot be undone.
                    </p>
                    <Button
                      variant="dark"
                      onClick={() => void act(deleteAllDocuments)}
                      icon={working ? <Loader2 size={14} className="animate-spin" /> : undefined}
                    >
                      Delete
                    </Button>
                    <Button onClick={() => setConfirmingAll(false)}>Keep</Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingAll(true)}
                    className="text-[12.5px] font-medium text-[#B4402B] transition-colors hover:underline"
                  >
                    Delete all documents
                  </button>
                )}
              </footer>
            ) : null}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function Tool({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cx(
        'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
        danger
          ? 'text-[#B4402B] hover:bg-[#FBE2DC]'
          : 'text-forge-ink-soft hover:bg-forge-cream',
      )}
    >
      {children}
    </button>
  );
}
