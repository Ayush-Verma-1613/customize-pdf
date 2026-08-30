'use client';

import { useState } from 'react';
import { ChevronRight, ClipboardList, Plus, Search } from 'lucide-react';
import { selectionCommands, type Command, type CommandHost } from '@/lib/commands/registry';
import { useEditor } from '@/lib/store/editorStore';
import { cx } from '@/lib/utils/cx';
import { Popup } from '@/components/ui/Popup';
import { InsertMenu } from './InsertMenu';

/**
 * Right-click on the page.
 *
 * It is the first thing people try when they cannot see a control, so it
 * answers with exactly what applies to the thing under the pointer - and with
 * a way in to everything else, rather than a dead end.
 */
export function ContextMenu({
  x,
  y,
  host,
  onClose,
  onOpenPalette,
}: {
  x: number;
  y: number;
  host: CommandHost;
  onClose: () => void;
  onOpenPalette: () => void;
}) {
  const state = useEditor();
  const [showInsert, setShowInsert] = useState(false);
  const commands = selectionCommands(state);

  const width = showInsert ? 252 : 232;
  const height = showInsert ? 420 : Math.min(460, commands.length * 32 + 140);
  const left = typeof window === 'undefined' ? x : Math.min(x, window.innerWidth - width - 8);
  const top = typeof window === 'undefined' ? y : Math.min(y, window.innerHeight - height - 8);

  return (
    <Popup
      label="Element actions"
      onClose={onClose}
      className="fixed"
      style={{ left: Math.max(8, left), top: Math.max(8, top), width }}
    >
      {showInsert ? (
        <InsertMenu onDone={onClose} onPickImage={host.pickImage} />
      ) : (
        <>
          {commands.map((command) => (
            <Item key={command.id} command={command} host={host} onDone={onClose} state={state} />
          ))}

          {commands.length ? <div className="my-1 h-px bg-line-soft" /> : null}

          <button
            type="button"
            role="menuitem"
            onClick={() => setShowInsert(true)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] text-ink transition-colors hover:bg-[#f1ede6]"
          >
            <Plus size={15} className="shrink-0 text-ink-soft" />
            <span className="flex-1">Add something here</span>
            <ChevronRight size={13} className="text-faint" />
          </button>

          {state.clipboard ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                state.pasteClipboard();
                onClose();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] text-ink transition-colors hover:bg-[#f1ede6]"
            >
              <ClipboardList size={15} className="shrink-0 text-ink-soft" />
              <span className="flex-1">Paste</span>
              <span className="text-[11px] text-faint">⌘V</span>
            </button>
          ) : null}

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onClose();
              onOpenPalette();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] text-ink transition-colors hover:bg-[#f1ede6]"
          >
            <Search size={15} className="shrink-0 text-ink-soft" />
            <span className="flex-1">Find any tool…</span>
            <span className="text-[11px] text-faint">⌘K</span>
          </button>
        </>
      )}
    </Popup>
  );
}

function Item({
  command,
  host,
  onDone,
  state,
}: {
  command: Command;
  host: CommandHost;
  onDone: () => void;
  state: ReturnType<typeof useEditor.getState>;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        onDone();
        command.run(host);
      }}
      className={cx(
        'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors',
        command.danger ? 'text-danger hover:bg-danger-wash' : 'text-ink hover:bg-[#f1ede6]',
      )}
    >
      <span className={cx('shrink-0', command.danger ? 'text-danger' : 'text-ink-soft')}>
        {command.icon}
      </span>
      <span className="flex-1 truncate">{command.label}</span>
      {command.active?.(state) ? <span className="text-[11px] text-success">on</span> : null}
      {command.hint ? <span className="text-[11px] text-faint">{command.hint}</span> : null}
    </button>
  );
}
