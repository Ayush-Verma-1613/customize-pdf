'use client';

import { useRef } from 'react';
import {
  AlignLeft,
  CheckSquare,
  Circle,
  Heading1,
  Image as ImageIcon,
  ListOrdered,
  Minus,
  MoveVertical,
  PenLine,
  Rows3,
  Scissors,
  Slash,
  Square,
  Star,
  Table2,
  TextCursorInput,
  Triangle,
  Type,
} from 'lucide-react';
import type { BlockType, OverlayKind, ShapeKind } from '@/lib/model/types';
import { useEditor } from '@/lib/store/editorStore';
import { fileToImage } from '@/lib/export/images';
import { cx } from '@/lib/utils/cx';
import { PanelSection } from '@/components/ui/primitives';

/**
 * The element palette.
 *
 * Items are grouped by what they do to the document, and each group carries its
 * own hue: content that flows (indigo), structure that controls the page
 * (amber), data (cyan), pictures (teal) and free drawing (rose). The colour is
 * doing work here - it is the fastest way to tell a block that reflows apart
 * from a shape you place by hand.
 */

interface FlowItem {
  type: BlockType;
  label: string;
  icon: React.ReactNode;
  hint: string;
}

const CONTENT: FlowItem[] = [
  { type: 'heading', label: 'Heading', icon: <Heading1 size={16} />, hint: 'Section title' },
  { type: 'paragraph', label: 'Paragraph', icon: <AlignLeft size={16} />, hint: 'Body text' },
  { type: 'question', label: 'Question', icon: <TextCursorInput size={16} />, hint: 'Auto-numbered' },
  { type: 'list', label: 'List', icon: <ListOrdered size={16} />, hint: 'Bullets or numbers' },
  { type: 'checklist', label: 'Checkboxes', icon: <CheckSquare size={16} />, hint: 'Tick boxes' },
];

const STRUCTURE: FlowItem[] = [
  { type: 'section', label: 'Section', icon: <Rows3 size={16} />, hint: 'Section A, B, C' },
  { type: 'answerLines', label: 'Answer lines', icon: <PenLine size={16} />, hint: 'Ruled space' },
  { type: 'divider', label: 'Divider', icon: <Minus size={16} />, hint: 'Horizontal rule' },
  { type: 'spacer', label: 'Spacer', icon: <MoveVertical size={16} />, hint: 'Vertical gap' },
  { type: 'pageBreak', label: 'Page break', icon: <Scissors size={16} />, hint: 'Start a new page' },
];

const SHAPES: { shape: ShapeKind; label: string; icon: React.ReactNode }[] = [
  { shape: 'rect', label: 'Rectangle', icon: <Square size={16} /> },
  { shape: 'ellipse', label: 'Ellipse', icon: <Circle size={16} /> },
  { shape: 'triangle', label: 'Triangle', icon: <Triangle size={16} /> },
  { shape: 'star', label: 'Star', icon: <Star size={16} /> },
];

type Hue = 'text' | 'structure' | 'data' | 'media' | 'draw';

const HUE_CLASS: Record<Hue, { wash: string; ink: string; ring: string }> = {
  text: { wash: 'bg-text-wash', ink: 'text-text-hue', ring: 'hover:border-text-hue/40' },
  structure: {
    wash: 'bg-structure-wash',
    ink: 'text-structure-hue',
    ring: 'hover:border-structure-hue/40',
  },
  data: { wash: 'bg-data-wash', ink: 'text-data-hue', ring: 'hover:border-data-hue/40' },
  media: { wash: 'bg-media-wash', ink: 'text-media-hue', ring: 'hover:border-media-hue/40' },
  draw: { wash: 'bg-draw-wash', ink: 'text-draw-hue', ring: 'hover:border-draw-hue/40' },
};

function Tile({
  icon,
  label,
  hint,
  hue,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  hue: Hue;
  onClick: () => void;
}) {
  const tone = HUE_CLASS[hue];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex w-full items-center gap-2.5 rounded-lg border border-line bg-white px-2.5 py-2 text-left transition-colors',
        tone.ring,
      )}
    >
      <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', tone.wash, tone.ink)}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium text-ink">{label}</span>
        {hint ? <span className="block truncate text-[11px] text-faint">{hint}</span> : null}
      </span>
    </button>
  );
}

export function ElementsPanel() {
  const addBlock = useEditor((s) => s.addBlock);
  const addOverlay = useEditor((s) => s.addOverlay);
  const store = useEditor;
  const fileRef = useRef<HTMLInputElement>(null);

  const placeOverlay = (kind: OverlayKind, patch?: Record<string, unknown>) => {
    const id = addOverlay(kind);
    if (patch) store.getState().updateOverlay(id, patch, { label: 'Add element' });
  };

  const onPickImage = async (file: File | undefined) => {
    if (!file) return;
    try {
      const image = await fileToImage(file);
      const width = 240;
      const height = (image.height / image.width) * width;
      const id = addOverlay('image');
      store.getState().updateOverlay(
        id,
        {
          src: image.src,
          naturalWidth: image.width,
          naturalHeight: image.height,
          width,
          height,
        },
        { label: 'Add image' },
      );
    } catch {
      // A rejected file simply produces no element.
    }
  };

  return (
    <div>
      <PanelSection title="Content">
        <div className="grid gap-1.5">
          {CONTENT.map((item) => (
            <Tile
              key={item.type}
              icon={item.icon}
              label={item.label}
              hint={item.hint}
              hue="text"
              onClick={() => addBlock(item.type)}
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-faint">
          Content elements join the flow: they wrap, space themselves and move to
          the next page automatically.
        </p>
      </PanelSection>

      <PanelSection title="Structure">
        <div className="grid gap-1.5">
          {STRUCTURE.map((item) => (
            <Tile
              key={item.type}
              icon={item.icon}
              label={item.label}
              hint={item.hint}
              hue="structure"
              onClick={() => addBlock(item.type)}
            />
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Data">
        <div className="grid gap-1.5">
          <Tile
            icon={<Table2 size={16} />}
            label="Table"
            hint="Splits across pages"
            hue="data"
            onClick={() => addBlock('table')}
          />
          <Tile
            icon={<Table2 size={16} />}
            label="Floating table"
            hint="Placed freely"
            hue="data"
            onClick={() => placeOverlay('table')}
          />
        </div>
      </PanelSection>

      <PanelSection title="Media">
        <div className="grid gap-1.5">
          <Tile
            icon={<ImageIcon size={16} />}
            label="Image"
            hint="Upload a picture"
            hue="media"
            onClick={() => fileRef.current?.click()}
          />
          <Tile
            icon={<ImageIcon size={16} />}
            label="Image in flow"
            hint="Sits between blocks"
            hue="media"
            onClick={() => addBlock('image')}
          />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void onPickImage(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </PanelSection>

      <PanelSection title="Draw">
        <div className="grid grid-cols-2 gap-1.5">
          <Tile
            icon={<Type size={16} />}
            label="Text box"
            hue="draw"
            onClick={() => placeOverlay('text')}
          />
          <Tile
            icon={<Slash size={16} />}
            label="Line"
            hue="draw"
            onClick={() => placeOverlay('line')}
          />
          {SHAPES.map((shape) => (
            <Tile
              key={shape.shape}
              icon={shape.icon}
              label={shape.label}
              hue="draw"
              onClick={() => placeOverlay('shape', { shape: shape.shape })}
            />
          ))}
          <Tile
            icon={<CheckSquare size={16} />}
            label="Checkbox"
            hue="draw"
            onClick={() => placeOverlay('checkbox')}
          />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-faint">
          Drawn elements are pinned to the page you are on and stay exactly where
          you put them.
        </p>
      </PanelSection>
    </div>
  );
}
