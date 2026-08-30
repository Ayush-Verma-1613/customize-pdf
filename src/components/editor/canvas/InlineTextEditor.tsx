'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { baseStyle } from '@/lib/engine/blocks';
import type { Frame, LaidOutPage, TextFrame } from '@/lib/engine/types';
import { fontStack } from '@/lib/model/defaults';
import type { Block, Run, TextOverlay } from '@/lib/model/types';
import { htmlToRuns, runsToHtml } from '@/lib/parse/richtext';
import { useEditor } from '@/lib/store/editorStore';
import { TextFormatBar, type ActiveMarks } from './TextFormatBar';

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
  // execCommand fires its own input event, so whichever commit lands first
  // has to know this was a formatting step rather than typing.
  const pendingLabel = useRef<string | null>(null);

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

  /**
   * Read the editor back into runs. Declared before the effects that call it so
   * the escape handler always closes over the current document.
   */
  const commit = useCallback(
    (label?: string) => {
      const node = ref.current;
      if (!node) return;
      const html = node.innerHTML;
      if (html === committed.current) return;
      committed.current = html;
      const next = htmlToRuns(html);
      // A label instead of a coalesce key starts a fresh history entry, so
      // "bold that word" is one undo rather than being swallowed by the typing
      // that came before it.
      const named = label ?? pendingLabel.current;
      pendingLabel.current = null;
      const options = named ? { label: named } : { coalesce: `text:${block?.id ?? overlay?.id}` };

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
          options,
        );
      } else if (overlay) {
        store.getState().updateOverlay(overlay.id, { runs: next }, options);
      }
    },
    [block, overlay, store],
  );

  const [marks, setMarks] = useState<ActiveMarks>({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
  });
  const [collapsed, setCollapsed] = useState(true);

  /** The live selection, but only when it is genuinely inside this editor. */
  const selectionInside = useCallback(() => {
    const node = ref.current;
    const selection = window.getSelection();
    if (!node || !selection || selection.rangeCount === 0) return null;
    if (!node.contains(selection.getRangeAt(0).commonAncestorContainer)) return null;
    return selection;
  }, []);

  const readMarks = (): ActiveMarks => {
    try {
      return {
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
      };
    } catch {
      return { bold: false, italic: false, underline: false, strike: false };
    }
  };

  /**
   * Run a formatting command over the chosen words - or, when nothing is
   * chosen, over the whole text, which is what somebody means when they select
   * a box and press bold. Afterwards the caret goes back to the end rather than
   * leaving the whole text looking selected.
   */
  const format = useCallback(
    (label: string, apply: () => void) => {
      const node = ref.current;
      const selection = selectionInside();
      if (!node || !selection) return;

      pendingLabel.current = label;
      const wasCollapsed = selection.isCollapsed;
      if (wasCollapsed) {
        const all = document.createRange();
        all.selectNodeContents(node);
        selection.removeAllRanges();
        selection.addRange(all);
      }

      apply();

      if (wasCollapsed) {
        const end = document.createRange();
        end.selectNodeContents(node);
        end.collapse(false);
        selection.removeAllRanges();
        selection.addRange(end);
      }

      commit(label);
      setMarks(readMarks());
    },
    [commit, selectionInside],
  );

  const COMMANDS: Record<keyof ActiveMarks, { command: string; label: string }> = {
    bold: { command: 'bold', label: 'Bold' },
    italic: { command: 'italic', label: 'Italic' },
    underline: { command: 'underline', label: 'Underline' },
    strike: { command: 'strikeThrough', label: 'Strike through' },
  };

  const toggleMarkHere = (mark: keyof ActiveMarks) => {
    const { command, label } = COMMANDS[mark];
    format(label, () => {
      // Tag mode, not CSS mode: <b>/<i>/<u> are exactly what the run parser
      // understands, so the mark survives the trip back into the model.
      document.execCommand('styleWithCSS', false, 'false');
      document.execCommand(command, false);
    });
  };

  const setColourHere = (colour: string) =>
    format('Text colour', () => {
      // Colour is the opposite: CSS mode gives a span the parser can read,
      // where tag mode would give <font color> - which older browsers still emit.
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('foreColor', false, colour);
    });

  const setHighlightHere = (colour: string | null) =>
    format(colour ? 'Highlight' : 'Remove highlight', () => {
      document.execCommand('styleWithCSS', false, 'true');
      const value = colour ?? 'transparent';
      // Firefox has never implemented hiliteColor; backColor is its spelling.
      if (!document.execCommand('hiliteColor', false, value)) {
        document.execCommand('backColor', false, value);
      }
    });

  /* Keep the bar honest as the caret moves. */
  useEffect(() => {
    if (!editingId) return;
    const onSelectionChange = () => {
      const selection = selectionInside();
      if (!selection) return;
      setCollapsed(selection.isCollapsed);
      setMarks(readMarks());
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [editingId, selectionInside]);

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
  }, [commit, editingId, store]);

  if (!editingId || !frame || !runs || !target) return null;

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
      <TextFormatBar
        marks={marks}
        collapsed={collapsed}
        onToggle={toggleMarkHere}
        onColor={setColourHere}
        onHighlight={setHighlightHere}
        placement={px(frame.y) > 54 ? 'above' : 'below'}
      />

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
        onInput={() => commit()}
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
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
            // The browser would otherwise reverse its own DOM history, which the
            // document knows nothing about, leaving two histories disagreeing.
            event.preventDefault();
            commit();
            const editor = store.getState();
            editor.beginEditing(null);
            if (event.shiftKey) editor.redo();
            else editor.undo();
            return;
          }
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
