import { SCHEMA_VERSION, type PaperDoc } from './types';
import { defaultMaster, defaultNumbering, defaultPageSetup, defaultTheme } from './defaults';

/**
 * Documents arrive from the network and from localStorage recovery, so every
 * load goes through a normaliser rather than a trust boundary. Anything missing
 * is filled from the defaults; anything unrecognised is dropped.
 */
export function normaliseDocument(input: unknown): PaperDoc | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Partial<PaperDoc>;
  if (typeof raw.id !== 'string' || !raw.id) return null;

  const now = new Date().toISOString();
  return {
    id: raw.id,
    title: typeof raw.title === 'string' && raw.title ? raw.title.slice(0, 200) : 'Untitled document',
    templateId: typeof raw.templateId === 'string' ? raw.templateId : undefined,
    page: { ...defaultPageSetup(), ...(raw.page ?? {}) },
    theme: { ...defaultTheme(), ...(raw.theme ?? {}) },
    numbering: { ...defaultNumbering(), ...(raw.numbering ?? {}) },
    master: {
      ...defaultMaster(),
      ...(raw.master ?? {}),
      header: { ...defaultMaster().header, ...(raw.master?.header ?? {}) },
      footer: { ...defaultMaster().footer, ...(raw.master?.footer ?? {}) },
      watermark: { ...defaultMaster().watermark, ...(raw.master?.watermark ?? {}) },
    },
    flow: Array.isArray(raw.flow) ? raw.flow.filter((b) => b && typeof b.id === 'string') : [],
    overlays: Array.isArray(raw.overlays)
      ? raw.overlays.filter((o) => o && typeof o.id === 'string' && typeof o.page === 'number')
      : [],
    fields: raw.fields && typeof raw.fields === 'object' ? (raw.fields as Record<string, string>) : {},
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
    schema: SCHEMA_VERSION,
  };
}

/** Rough serialised size, used to keep a document under the storage limit. */
export const documentBytes = (doc: PaperDoc) => JSON.stringify(doc).length;

export const MAX_DOCUMENT_BYTES = 14 * 1024 * 1024;
