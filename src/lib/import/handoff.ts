'use client';

/**
 * What the import found, carried from the home screen to the editor.
 *
 * The suggestion has to survive one navigation and then be forgotten, so it
 * lives in sessionStorage rather than in the document - a document should not
 * remember that it was once offered a template.
 */

export interface ImportHandoff {
  docId: string;
  fidelity: 'exact' | 'structured' | 'text-only';
  note?: string;
  suggestedTemplate?: string;
}

const KEY = 'docraft:import-handoff';

export function rememberImport(handoff: ImportHandoff): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(handoff));
  } catch {
    // A browser with storage switched off simply shows no notice.
  }
}

/** Reads the handoff for this document and clears it, so it is shown once. */
export function takeImport(docId: string): ImportHandoff | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ImportHandoff;
    if (!parsed || parsed.docId !== docId) return null;
    sessionStorage.removeItem(KEY);
    return parsed;
  } catch {
    return null;
  }
}
