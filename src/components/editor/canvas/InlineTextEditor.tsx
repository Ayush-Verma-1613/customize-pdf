'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { baseStyle } from '@/lib/engine/blocks';
import type { Frame, LaidOutPage, TextFrame } from '@/lib/engine/types';
import { fontStack } from '@/lib/model/defaults';
import type { Block, Run, TextOverlay } from '@/lib/model/types';
import { htmlToRuns, runsToHtml } from '@/lib/parse/richtext';
import { useEditor } from '@/lib/store/editorStore';
import { useCoarsePointer } from '@/lib/utils/useMedia';
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

/** Where in the text a screen point lands, across the two browser spellings. */
function caretAt(x: number, y: number): { node: Node; offset: number } | null {
  const api = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  if (typeof api.caretPositionFromPoint === 'function') {
    const position = api.caretPositionFromPoint(x, y);
    return position ? { node: position.offsetNode, offset: position.offset } : null;
  }
  const range = api.caretRangeFromPoint?.(x, y);
  return range ? { node: range.startContainer, offset: range.startOffset } : null;
}

const WORD_CHARACTER = /[\p{L}\p{N}_'\u2019-]/u;

/**
 * Select the word under a point, for the finger that held it.
 *
 * `Selection.modify` knows about word boundaries in every language the browser
 * does, so it is asked first; it is not in any standard, though, so the run of
 * word characters either side of the caret is the fallback.
 */
function selectWordAt(host: HTMLElement, x: number, y: number): boolean {
  const hit = caretAt(x, y);
  const selection = window.getSelection();
  if (!hit || !selection || !host.contains(hit.node)) return false;

  const caret = document.createRange();
  try {
    caret.setStart(hit.node, hit.offset);
  } catch {
    return false;
  }
  caret.collapse(true);
  selection.removeAllRanges();
  selection.addRange(caret);

  const extendable = selection as Selection & {
    modify?: (alter: string, direction: string, granularity: string) => void;
  };
  if (typeof extendable.modify === 'function') {
    extendable.modify('move', 'backward', 'word');
    extendable.modify('extend', 'forward', 'word');
    if (!selection.isCollapsed) return true;
  }

  if (hit.node.nodeType !== Node.TEXT_NODE) return false;
  const text = hit.node.textContent ?? '';
  let start = Math.min(hit.offset, text.length);
  let end = start;
  while (start > 0 && WORD_CHARACTER.test(text[start - 1])) start -= 1;
  while (end < text.length && WORD_CHARACTER.test(text[end])) end += 1;
  if (start === end) return false;

  const word = document.createRange();
  word.setStart(hit.node, start);
  word.setEnd(hit.node, end);
  selection.removeAllRanges();
  selection.addRange(word);
  return true;
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
  const coarse = useCoarsePointer();
  const store = useEditor;
  const ref = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const committed = useRef<string>('');
  /** The last selection that was genuinely inside the editable. */
  const liveRange = useRef<Range | null>(null);
  /** The same, snapshotted the instant a format control was pressed. */
  const pressRange = useRef<Range | null>(null);
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
      const selection = window.getSelection();
      if (!node || !selection) return;

      // Put back the words that were chosen when the control was pressed. On a
      // phone they are already gone by now, which is why every mark used to
      // land on the whole box however carefully a word had been selected.
      const saved = pressRange.current ?? liveRange.current;
      if (saved && node.contains(saved.commonAncestorContainer)) {
        node.focus({ preventScroll: true });
        selection.removeAllRanges();
        selection.addRange(saved);
      } else if (!selectionInside()) {
        // Nothing to act on and nothing to put back: park the caret so the
        // whole-text path below still has somewhere to start from.
        node.focus({ preventScroll: true });
        const caret = document.createRange();
        caret.selectNodeContents(node);
        caret.collapse(false);
        selection.removeAllRanges();
        selection.addRange(caret);
      }

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
      pressRange.current = null;
      liveRange.current = selection.isCollapsed
        ? null
        : selection.getRangeAt(0).cloneRange();
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
      liveRange.current = selection.isCollapsed ? null : selection.getRangeAt(0).cloneRange();
      setCollapsed(selection.isCollapsed);
      setMarks(readMarks());
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [editingId, selectionInside]);

  /* A new target starts with no remembered selection. */
  useEffect(() => {
    liveRange.current = null;
    pressRange.current = null;
  }, [editingId]);

  /**
   * Called as a format control is pressed, before the browser reacts to it.
   *
   * A touch screen drops the selection on the way down - by the time the click
   * arrives the chosen words are no longer chosen - so the range is taken here,
   * while it still exists. A press that finds nothing keeps what the last one
   * captured: opening a colour popover and then picking a swatch is two
   * presses, and only the first of them happens while the words are still live.
   */
  const capturePress = useCallback(() => {
    const selection = selectionInside();
    if (selection && !selection.isCollapsed) {
      pressRange.current = selection.getRangeAt(0).cloneRange();
    }
  }, [selectionInside]);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || !runs) return;
    const html = runsToHtml(runs);
    committed.current = html;
    node.innerHTML = html;
    node.focus({ preventScroll: true });

    // A press that arrived with a point behind it was aimed at one word, so
    // that word is what gets selected - the caret at the end is for everything
    // else, where typing should carry on from where the text left off.
    //
    // The point is in page space and is turned back into a screen coordinate
    // here, against the box as it stands right now. Between the press and this
    // moment a phone may have scrolled the canvas or lifted the whole page on
    // the software keyboard, and a screen coordinate captured earlier would by
    // then be pointing at a different line, or off the box altogether.
    const seed = store.getState().editingSeed;
    let picked = false;
    if (seed) {
      const rect = node.getBoundingClientRect();
      const padLeft = frame?.padding?.left ?? 0;
      const padTop = frame?.padding?.top ?? 0;
      const originX = frame ? frame.x + padLeft : 0;
      const originY = frame ? frame.y + padTop : 0;
      // Kept just inside the edge, so a press that landed on the box's invisible
      // grab margin still finds the nearest word rather than nothing at all.
      const x = Math.min(Math.max(rect.left + (seed.x - originX) * zoom, rect.left + 1), rect.right - 1);
      const y = Math.min(Math.max(rect.top + (seed.y - originY) * zoom, rect.top + 1), rect.bottom - 1);
      picked = selectWordAt(node, x, y);
      store.getState().clearEditingSeed();
    }

    if (!picked) {
      const range = document.createRange();
      range.selectNodeContents(node);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    const selection = window.getSelection();
    liveRange.current =
      picked && selection && !selection.isCollapsed
        ? selection.getRangeAt(0).cloneRange()
        : null;
    setCollapsed(!picked);
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
      ref={shellRef}
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
        onPressStart={capturePress}
        touch={coarse}
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
        onBlur={(event) => {
          // Touching a button in the format bar takes the focus off the text.
          // Treating that as "finished editing" closed the editor out from
          // under the very command that was being asked for.
          const next = event.relatedTarget as Node | null;
          if (next && shellRef.current?.contains(next)) return;
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
