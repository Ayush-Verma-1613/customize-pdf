'use client';

import { useState } from 'react';
import { FileUp, X } from 'lucide-react';
import { takeImport } from '@/lib/import/handoff';
import { useEditor } from '@/lib/store/editorStore';
import { getTemplate } from '@/lib/templates';
import { Button } from '@/components/ui/primitives';

/**
 * What happened to the file you just opened, and what you can do about it.
 *
 * An import arrives as itself rather than being poured into a template, so this
 * is where the template gets offered - once, as a choice, with the alternative
 * being to ignore it and carry on.
 */
export function ImportNotice() {
  const docId = useEditor((s) => s.doc.id);
  // Read once at mount: the handoff is consumed on the way in, so re-reading on
  // a later render would find nothing and flicker the bar away.
  const [handoff] = useState(() => takeImport(docId));
  const [dismissed, setDismissed] = useState(false);

  if (!handoff || dismissed) return null;

  const suggested = handoff.suggestedTemplate ? getTemplate(handoff.suggestedTemplate) : undefined;

  // A Docraft file comes back as itself, so telling its owner that "nothing
  // has been restyled" would be answering a question they never asked.
  const lead =
    handoff.fidelity === 'exact'
      ? 'Opened exactly as it was saved.'
      : handoff.fidelity === 'text-only'
        ? 'Imported as text.'
        : 'Imported as it was.';

  const fallback =
    handoff.fidelity === 'exact'
      ? 'Every setting came back with it - fonts, page setup and everything you placed by hand.'
      : 'Your content came across unchanged. Nothing has been restyled - the design is yours to pick.';

  return (
    <div className="animate-rise flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-question-wash/40 px-3 py-2">
      <FileUp size={15} className="shrink-0 text-question-hue" />

      <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-ink-soft">
        <span className="font-medium text-ink">{lead}</span> {handoff.note ?? fallback}
        {suggested ? ` This looks like a ${suggested.name.toLowerCase()}.` : ''}
      </p>

      {suggested ? (
        <Button
          size="sm"
          tone="primary"
          onClick={() => {
            useEditor.getState().applyTemplate(suggested.id, true);
            setDismissed(true);
          }}
        >
          Use the {suggested.name} design
        </Button>
      ) : null}

      <Button size="sm" tone="ghost" onClick={() => setDismissed(true)}>
        {suggested ? 'No thanks' : 'Got it'}
      </Button>

      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="rounded-md p-1 text-muted transition-colors hover:bg-white hover:text-ink"
      >
        <X size={14} />
      </button>
    </div>
  );
}
