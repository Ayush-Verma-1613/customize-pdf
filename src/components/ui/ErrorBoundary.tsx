'use client';

import { Component, useEffect, useState, type ReactNode } from 'react';
import { AlertOctagon } from 'lucide-react';
import { Dialog } from './Dialog';

/**
 * What the user is told when something breaks.
 *
 * The failure modes this replaces are the two worst ones: a render that throws
 * takes React's whole tree down and leaves a blank page, and a promise that
 * rejects in the background leaves the screen looking fine while quietly doing
 * nothing. Both of them get read as "the app is stuck" or, worse, as the
 * person's own mistake - so each one is turned into the same plain statement of
 * what happened and what is still safe.
 *
 * The reassurance is the part that matters. Documents are in IndexedDB, not in
 * this component, so a crash here has almost never cost anybody their work -
 * but nobody can know that from looking at a blank page.
 */
function CrashDialog({
  error,
  onDismiss,
  onReload,
}: {
  error: Error;
  onDismiss?: () => void;
  onReload: () => void;
}) {
  return (
    <Dialog
      open
      tone="danger"
      icon={<AlertOctagon size={19} />}
      title="Something went wrong"
      confirmLabel="Reload the page"
      cancelLabel={onDismiss ? 'Carry on anyway' : undefined}
      onConfirm={onReload}
      onCancel={onDismiss}
    >
      <p>
        A part of the editor stopped working. Your document is saved in this
        browser, so reloading should bring it back as it was.
      </p>
      <p className="rounded-lg border border-line-soft bg-[#faf8f4] px-2.5 py-2 font-mono text-[11.5px] break-words text-muted">
        {error.message || String(error)}
      </p>
    </Dialog>
  );
}

/**
 * Catches a throw on the way up out of the tree it wraps.
 *
 * A class, because this is the one thing hooks still cannot do. It keeps
 * rendering its children after a crash rather than replacing them: the editor
 * chrome underneath is usually still perfectly usable, and blanking it would
 * throw away the Save button at the exact moment somebody wants it.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Caught by the editor error boundary:', error);
  }

  render() {
    return (
      <>
        {this.props.children}
        {this.state.error ? (
          <CrashDialog
            error={this.state.error}
            onDismiss={() => this.setState({ error: null })}
            onReload={() => window.location.reload()}
          />
        ) : null}
      </>
    );
  }
}

/**
 * The other half: everything that never passes through a render.
 *
 * An event handler that throws and a promise nobody awaited both bypass the
 * boundary above entirely - React only sees what happens during a render - and
 * they are the ones that produce the "I pressed it and nothing happened"
 * report. Reported once each, because a loop that fails on every frame should
 * not stack a hundred dialogs on top of the thing that is failing.
 */
export function RuntimeErrorReporter() {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const report = (cause: unknown) => {
      setError((current) => {
        if (current) return current;
        return cause instanceof Error ? cause : new Error(String(cause));
      });
    };
    const onError = (event: ErrorEvent) => report(event.error ?? event.message);
    const onRejection = (event: PromiseRejectionEvent) => report(event.reason);

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  if (!error) return null;
  return (
    <CrashDialog
      error={error}
      onDismiss={() => setError(null)}
      onReload={() => window.location.reload()}
    />
  );
}
