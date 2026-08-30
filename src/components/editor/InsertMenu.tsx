'use client';

import { INSERTABLE, PLACEABLE } from '@/lib/commands/registry';
import { useEditor } from '@/lib/store/editorStore';

/**
 * What you can add, shown where you are adding it.
 *
 * The same list appears wherever adding is possible - under the selected
 * block, at the end of the document, in the right-click menu - so there is
 * never a trip to a panel on the far side of the screen just to place a table.
 */
export function InsertMenu({
  at,
  onDone,
  onPickImage,
}: {
  /** Flow position for the new block. Left out, it lands after the selection. */
  at?: number;
  onDone: () => void;
  onPickImage: () => void;
}) {
  const store = useEditor;

  return (
    <div className="max-h-[min(60vh,420px)] w-60 overflow-y-auto">
      <p className="px-2 pt-1 pb-1.5 text-[10px] font-semibold tracking-[0.08em] text-faint uppercase">
        Flows with the text
      </p>
      {INSERTABLE.map((item) => (
        <Row
          key={item.type}
          icon={item.icon}
          label={item.label}
          hint={item.hint}
          hue="text"
          onClick={() => {
            store.getState().addBlock(item.type, at);
            onDone();
          }}
        />
      ))}

      <p className="mt-1 border-t border-line-soft px-2 pt-2 pb-1.5 text-[10px] font-semibold tracking-[0.08em] text-faint uppercase">
        Stays where you put it
      </p>
      {PLACEABLE.map((item) => (
        <Row
          key={item.id}
          icon={item.icon}
          label={item.label}
          hue="draw"
          onClick={() => {
            if (item.id === 'image') onPickImage();
            else item.place();
            onDone();
          }}
        />
      ))}
    </div>
  );
}

function Row({
  icon,
  label,
  hint,
  hue,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  hue: 'text' | 'draw';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[#f1ede6]"
    >
      <span
        className={
          hue === 'text'
            ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-text-wash text-text-hue'
            : 'flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-draw-wash text-draw-hue'
        }
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] text-ink">{label}</span>
        {hint ? <span className="block truncate text-[11px] text-faint">{hint}</span> : null}
      </span>
    </button>
  );
}
