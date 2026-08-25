'use client';

import type { PaperDoc } from '@/lib/model/types';
import { normaliseDocument } from '@/lib/model/validate';

/**
 * Everything runs in the browser, so documents live in IndexedDB. It is the
 * only client store big enough for a worksheet full of embedded images -
 * localStorage caps out around 5MB and a single scanned diagram can eat that.
 *
 * A localStorage mirror of the most recent document is kept alongside as a
 * crash-recovery net, since it can be written synchronously during unload.
 */

export interface DocumentSummary {
  id: string;
  title: string;
  templateId?: string;
  pageCount: number;
  updatedAt: string;
  createdAt: string;
}

const DB_NAME = 'paperforge';
const DB_VERSION = 1;
const STORE = 'documents';
const RECOVERY_KEY = 'paperforge:recovery';

const summarise = (doc: PaperDoc, pageCount?: number): DocumentSummary => ({
  id: doc.id,
  title: doc.title,
  templateId: doc.templateId,
  pageCount: pageCount ?? doc.flow.filter((b) => b.type === 'pageBreak').length + 1,
  updatedAt: doc.updatedAt,
  createdAt: doc.createdAt,
});

interface StoredRecord {
  id: string;
  doc: PaperDoc;
  summary: DocumentSummary;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser has no IndexedDB.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('updatedAt', 'summary.updatedAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open the local database.'));
  });
  return dbPromise;
}

function transact<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = run(tx.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Local storage request failed.'));
      }),
  );
}

export async function listDocuments(limit = 60): Promise<DocumentSummary[]> {
  try {
    const rows = await transact<StoredRecord[]>('readonly', (store) => store.getAll());
    return rows
      .map((row) => row.summary)
      .filter(Boolean)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function loadDocument(id: string): Promise<PaperDoc | null> {
  try {
    const row = await transact<StoredRecord | undefined>('readonly', (store) => store.get(id));
    return row ? normaliseDocument(row.doc) : null;
  } catch {
    return null;
  }
}

export async function saveDocument(doc: PaperDoc, pageCount?: number): Promise<void> {
  const record: StoredRecord = { id: doc.id, doc, summary: summarise(doc, pageCount) };
  await transact('readwrite', (store) => store.put(record));
}

export async function deleteDocument(id: string): Promise<void> {
  await transact('readwrite', (store) => store.delete(id));
}

export async function duplicateDocument(id: string, newId: string): Promise<PaperDoc | null> {
  const source = await loadDocument(id);
  if (!source) return null;
  const now = new Date().toISOString();
  const copy: PaperDoc = {
    ...structuredClone(source),
    id: newId,
    title: `${source.title} (copy)`,
    createdAt: now,
    updatedAt: now,
  };
  await saveDocument(copy);
  return copy;
}

/* ------------------------------------------------------------------ *
 * Crash recovery
 * ------------------------------------------------------------------ */

export interface RecoveryEntry {
  doc: PaperDoc;
  savedAt: string;
}

/** Synchronous mirror, safe to call from a beforeunload handler. */
export function writeRecovery(doc: PaperDoc): void {
  try {
    localStorage.setItem(
      RECOVERY_KEY,
      JSON.stringify({ doc, savedAt: new Date().toISOString() }),
    );
  } catch {
    // Quota exceeded (a document full of images). IndexedDB still has it.
  }
}

export function readRecovery(): RecoveryEntry | null {
  try {
    const raw = localStorage.getItem(RECOVERY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RecoveryEntry;
    const doc = normaliseDocument(parsed.doc);
    return doc ? { doc, savedAt: parsed.savedAt } : null;
  } catch {
    return null;
  }
}

export function clearRecovery(): void {
  try {
    localStorage.removeItem(RECOVERY_KEY);
  } catch {
    // Nothing to do; recovery is best-effort by design.
  }
}

/* ------------------------------------------------------------------ *
 * Import / export of the document file itself
 * ------------------------------------------------------------------ */

export function downloadDocumentFile(doc: PaperDoc): void {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${doc.title.replace(/[^\w\s-]+/g, '').trim().replace(/\s+/g, '-') || 'document'}.paperforge.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function readDocumentFile(file: File): Promise<PaperDoc | null> {
  try {
    return normaliseDocument(JSON.parse(await file.text()));
  } catch {
    return null;
  }
}
