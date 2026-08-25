'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { baseStyle } from '@/lib/engine/blocks';
import type { Frame, LaidOutPage, TextFrame } from '@/lib/engine/types';
import { fontStack } from '@/lib/model/defaults';
import type { Block, Run, TextOverlay } from '@/lib/model/types';
import { htmlToRuns, runsToHtml } from '@/lib/parse/richtext';
import { useEditor } from '@/lib/store/editorStore';

/**
 * Direct, on-page text editing.
 *
 * The engine positions text glyph by glyph, which a caret cannot live inside,
 * so editing swaps in a contentEditable box that mirrors the frame's typography
 * exactly - same face, size, leading, colour, alignment and width. The browser
 * wraps while you type; on commit the engine re-wraps and repaginates, and
 * because both are measuring the same font the two agree line for line.
 */

interface Props {
  page: LaidOutPage;
  zoom: number;
}

/** The text frame a block's editable content belongs to. */
function editableFrame(page: LaidOutPage, id: string): TextFrame | null {
  const candidates = page.frames.filter(
    (f: Frame): f is TextFrame =>
      f.kind === 'text' && f.source.id === id && f.selectable !== false && f.lines.length > 0,
  );
  return candidates[0] ?? null;
}

function runsOf(target: Block | TextOverlay | null): Run[] | null {
  if (!target) return null;
  if ('kind' in target) return target.kind === 'text' ? target.runs : null;
  switch (target.type) {
    case 'heading':
    case 'paragraph':
    case 'question':
    case 'section':
      return target.runs;
    default:
      return null;
  }
}

export function InlineTextEditor({ page, zoom }: Props) {
  const editingId = useEditor((s) => s.editingId);
  const doc = useEditor((s) => s.doc);
  const store = useEditor;
  const ref = useRef<HTMLDivElement>(null);
  const committed = useRef<string>('');

  const block = doc.flow.find((b) => b.id === editingId) ?? null;
  const overlay = (doc.overlays.find((o) => o.id === editingId) ?? null) as TextOverlay | null;
  const target = block ?? overlay;
  const runs = runsOf(target);
  const frame = editingId ? editableFrame(page, editingId) : null;

  const style = block?.style ?? overlay?.style;
  const base = baseStyle(doc.theme, style, {
    size:
      block?.type === 'heading'
        ? doc.theme.bodySize * (doc.theme.headingScale[block.level - 1] ?? 1)
        : undefined,
    bold: block?.type === 'heading' || block?.type === 'section' || undefined,
    family:
      block?.type === 'heading' || block?.type === 'section'
        ? doc.theme.headingFamily
        : undefined,
  });

  useLayoutEffect(() => {
    if (!ref.current || !runs) return;
    const html = runsToHtml(runs);
    committed.current = html;
    ref.current.innerHTML = html;
    // Drop the caret at the end so typing continues the existing text.
    const range = document.createRange();
    range.selectNodeContents(ref.current);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    ref.current.focus();
    // Re-running on every keystroke would fight the caret; key on the id alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  useEffect(() => {
    if (!editingId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        commit();
        store.getState().beginEditing(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  if (!editingId || !frame || !runs || !target) return null;

  const commit = () => {
    const node = ref.current;
    if (!node) return;
    const html = node.innerHTML;
    if (html === committed.current) return;
    committed.current = html;
    const next = htmlToRuns(html);

    if (block) {
      store.getState().updateBlock(
        block.id,
        (draft) => {
          if (
            draft.type === 'heading' ||
            draft.type === 'paragraph' ||
            draft.type === 'question' ||
            draft.type === 'section'
          ) {
            draft.runs = next;
          }
        },
        { coalesce: `text:${block.id}` },
      );
    } else if (overlay) {
      store.getState().updateOverlay(overlay.id, { runs: next }, { coalesce: `text:${overlay.id}` });
    }
  };

  const px = (v: number) => v * zoom;
  const padTop = frame.padding?.top ?? 0;
  const padLeft = frame.padding?.left ?? 0;
  const firstLine = frame.lines[0];

  return (
    <div
      className="absolute z-30"
      style={{
        left: px(frame.x + padLeft),
        top: px(frame.y + padTop),
        width: px(frame.width - padLeft - (frame.padding?.right ?? 0)),
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        spellCheck
        role="textbox"
        aria-multiline="true"
        aria-label="Edit text"
        className="inline-editor rounded-[3px] bg-white/95 ring-2 ring-question-hue/45"
        style={{
          fontFamily: fontStack(base.family),
          fontSize: px(base.size),
          fontWeight: base.bold ? 700 : 400,
          fontStyle: base.italic ? 'italic' : 'normal',
          color: base.color,
          letterSpacing: base.letterSpacing ? px(base.letterSpacing) : undefined,
          lineHeight: `${px(firstLine?.height ?? base.size * base.lineHeight)}px`,
          textAlign: (style?.align === 'justify' ? 'justify' : style?.align) ?? 'left',
          minHeight: px(frame.height - padTop - (frame.padding?.bottom ?? 0)),
          padding: 0,
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
        onInput={commit}
        onBlur={() => {
          commit();
          store.getState().beginEditing(null);
        }}
        onPaste={(event) => {
          // Paste as plain text: pasted HTML carries styling the model cannot
          // express, and silently dropping half of it is worse than dropping all.
          event.preventDefault();
          const text = event.clipboardData.getData('text/plain');
          document.execCommand('insertText', false, text);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && block?.type !== 'paragraph') {
            event.preventDefault();
            commit();
            store.getState().beginEditing(null);
          }
        }}
      />
    </div>
  );
}
