'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, CornerDownLeft, Search } from 'lucide-react';
import {
  GROUP_ORDER,
  searchCommands,
  type Command,
  type CommandGroup,
  type CommandHost,
} from '@/lib/commands/registry';
import { useEditor } from '@/lib/store/editorStore';
import { cx } from '@/lib/utils/cx';

/**
 * One box that can reach every feature in the app.
 *
 * Panels answer "what is in this drawer"; this answers "I want to do X". You
 * type roughly what you mean - "water", "two columns", "bigger" - and the thing
 * itself comes to you, which is the difference between using the app and
 * learning where its buttons live. With the box empty it lists everything,
 * which is also the fastest way to find out what the app can do.
 */

const RECENT_KEY = 'docraft:recent-commands';
const RECENT_LIMIT = 6;

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function rememberRecent(id: string) {
  try {
    const next = [id, ...readRecent().filter((x) => x !== id)].slice(0, RECENT_LIMIT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // A browser with storage switched off simply gets no history.
  }
}

interface Row {
  command: Command;
  /** Header to draw above this row, when it opens a new group. */
  heading?: string;
}

export function CommandPalette({ host, onClose }: { host: CommandHost; onClose: () => void }) {
  const state = useEditor();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  // Read once at mount: the palette is only ever mounted on the client, and a
  // fresh read on every open keeps the list current without an effect.
  const [recent] = useState(readRecent);
  const listRef = useRef<HTMLDivElement>(null);

  const rows = useMemo((): Row[] => {
    const matches = searchCommands(state, query);
    const out: Row[] = [];

    if (!query.trim()) {
      const pinned = recent
        .map((id) => matches.find((c) => c.id === id))
        .filter((c): c is Command => !!c);
      pinned.forEach((command, i) => {
        out.push({ command, heading: i === 0 ? 'Recently used' : undefined });
      });

      const seen = new Set(pinned.map((c) => c.id));
      for (const group of GROUP_ORDER) {
        const inGroup = matches.filter((c) => c.group === group && !seen.has(c.id));
        inGroup.forEach((command, i) => {
          out.push({ command, heading: i === 0 ? groupLabel(group) : undefined });
        });
      }
      return out;
    }

    return matches.map((command, i) => ({
      command,
      heading: i === 0 ? `${matches.length} match${matches.length === 1 ? '' : 'es'}` : undefined,
    }));
  }, [state, query, recent]);

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [cursor, rows]);

  const run = (command: Command) => {
    rememberRecent(command.id);
    onClose();
    command.run(host);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' || (event.key === 'n' && event.ctrlKey)) {
      event.preventDefault();
      setCursor((c) => (rows.length ? (c + 1) % rows.length : 0));
    } else if (event.key === 'ArrowUp' || (event.key === 'p' && event.ctrlKey)) {
      event.preventDefault();
      setCursor((c) => (rows.length ? (c - 1 + rows.length) % rows.length : 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const row = rows[cursor];
      if (row) run(row.command);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-ink/25 px-4 pt-[10vh] backdrop-blur-[2px]"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Find a tool"
        className="animate-rise flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-3.5">
          <Search size={17} className="shrink-0 text-faint" />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              // A new search starts from the top; the old cursor means nothing now.
              setQuery(event.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="What do you want to do? Try “marks”, “two columns”, “watermark”…"
            aria-label="Search every tool"
            className="h-12 min-w-0 flex-1 bg-transparent text-[14px] text-ink placeholder:text-faint focus:outline-none"
          />
          <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] text-faint sm:block">
            Esc
          </kbd>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {rows.length === 0 ? (
            <p className="px-3 py-8 text-center text-[13px] text-muted">
              Nothing matches “{query.trim()}”. Try a plainer word — “lines”,
              “picture”, “border”.
            </p>
          ) : null}

          {rows.map((row, index) => (
            <div key={row.command.id}>
              {row.heading ? (
                <p className="px-2 pt-2.5 pb-1 text-[10px] font-semibold tracking-[0.08em] text-faint uppercase">
                  {row.heading}
                </p>
              ) : null}
              <button
                type="button"
                data-active={index === cursor}
                onPointerEnter={() => setCursor(index)}
                onClick={() => run(row.command)}
                className={cx(
                  'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors',
                  index === cursor ? 'bg-question-wash/70' : 'hover:bg-[#f8f5ef]',
                )}
              >
                <span
                  className={cx(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                    row.command.danger
                      ? 'bg-danger-wash text-danger'
                      : 'bg-[#f1ede6] text-ink-soft',
                  )}
                >
                  {row.command.icon}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                  {row.command.label}
                </span>
                {row.command.active?.(state) ? (
                  <Check size={14} className="shrink-0 text-success" />
                ) : null}
                {row.command.hint ? (
                  <span className="shrink-0 text-[11px] text-faint">{row.command.hint}</span>
                ) : null}
                {index === cursor ? (
                  <CornerDownLeft size={13} className="shrink-0 text-faint" />
                ) : null}
              </button>
            </div>
          ))}
        </div>

        <p className="flex items-center gap-3 border-t border-line px-3.5 py-2 text-[11px] text-faint">
          <span>↑↓ to move</span>
          <span>↵ to use</span>
          <span className="ml-auto">Everything this app can do is in this list</span>
        </p>
      </div>
    </div>
  );
}

function groupLabel(group: CommandGroup): string {
  switch (group) {
    case 'Arrange':
      return 'What is selected';
    case 'Format':
      return 'Formatting';
    case 'Insert':
      return 'Add something';
    case 'Page':
      return 'The page';
    case 'Design':
      return 'Look and feel';
    case 'Document':
      return 'Whole document';
    case 'View':
      return 'View';
    case 'File':
      return 'File';
  }
}
