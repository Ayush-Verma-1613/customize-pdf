'use client';

import { memo, useId } from 'react';
import { ascentPt, descentPt } from '@/lib/engine/fonts';
import {
  checkPath,
  dashAttr,
  DECORATION_THICKNESS,
  shapePath,
  STRIKE_OFFSET,
  UNDERLINE_OFFSET,
} from '@/lib/engine/shapes';
import type {
  CellFrame,
  Frame,
  LaidOutPage,
  LineBox,
  TextFrame,
} from '@/lib/engine/types';
import { fontStack } from '@/lib/model/defaults';
import type { BoxBorder, CropRect } from '@/lib/model/types';
import { isTransparent } from '@/lib/utils/color';
import { sourceRect, destRect } from '@/lib/export/images';

/**
 * The document canvas is SVG rather than positioned HTML.
 *
 * SVG's user space is exactly the layout's coordinate space - points, y-down,
 * with `<text y>` naming the alphabetic baseline - which is the same contract
 * the PDF drawing model uses. Nothing has to be translated between what the
 * engine computed, what the screen shows and what gets printed, and the page
 * stays crisp at any zoom because it scales as vectors.
 */

const round = (n: number) => Math.round(n * 1000) / 1000;

function TextRun({ line, originX, originY }: { line: LineBox; originX: number; originY: number }) {
  const baseline = originY + line.y + line.baseline;
  return (
    <>
      {line.items.map((item, i) => {
        if (!item.text) return null;
        const x = originX + line.x + item.x;
        const y = baseline - item.rise;
        const ruleThickness = Math.max(0.4, item.font.size * DECORATION_THICKNESS);
        return (
          <g key={i}>
            {item.highlight ? (
              <rect
                x={round(x)}
                y={round(y - ascentPt(item.font))}
                width={round(item.width)}
                height={round(ascentPt(item.font) + descentPt(item.font))}
                fill={item.highlight}
              />
            ) : null}
            <text
              x={round(x)}
              y={round(y)}
              fill={item.color}
              fontFamily={fontStack(item.font.family)}
              fontSize={item.font.size}
              fontWeight={item.font.bold ? 700 : 400}
              fontStyle={item.font.italic ? 'italic' : 'normal'}
              letterSpacing={item.font.letterSpacing || undefined}
              xmlSpace="preserve"
              className="frame-text"
            >
              {item.text}
            </text>
            {item.underline ? (
              <rect
                x={round(x)}
                y={round(y + item.font.size * UNDERLINE_OFFSET)}
                width={round(item.width)}
                height={round(ruleThickness)}
                fill={item.color}
              />
            ) : null}
            {item.strike ? (
              <rect
                x={round(x)}
                y={round(y + item.font.size * STRIKE_OFFSET)}
                width={round(item.width)}
                height={round(ruleThickness)}
                fill={item.color}
              />
            ) : null}
          </g>
        );
      })}
    </>
  );
}

function BoxDecoration({
  x,
  y,
  width,
  height,
  background,
  border,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  background?: string;
  border?: BoxBorder;
}) {
  const hasFill = background && !isTransparent(background);
  const hasStroke = border && border.width > 0 && !isTransparent(border.color);
  if (!hasFill && !hasStroke) return null;
  const inset = hasStroke ? border.width / 2 : 0;
  return (
    <rect
      x={round(x + inset)}
      y={round(y + inset)}
      width={round(Math.max(0, width - inset * 2))}
      height={round(Math.max(0, height - inset * 2))}
      rx={border?.radius ?? 0}
      fill={hasFill ? background : 'none'}
      stroke={hasStroke ? border.color : undefined}
      strokeWidth={hasStroke ? border.width : undefined}
      strokeDasharray={hasStroke ? dashAttr(border.style, border.width) : undefined}
    />
  );
}

function ImageContent({
  frame,
  clipId,
}: {
  frame: Extract<Frame, { kind: 'image' }>;
  clipId: string;
}) {
  if (!frame.src) {
    return (
      <g>
        <rect
          x={round(frame.x)}
          y={round(frame.y)}
          width={round(frame.width)}
          height={round(frame.height)}
          rx={frame.radius || 3}
          fill="#f1f5f9"
          stroke="#cbd5e1"
          strokeWidth={0.75}
          strokeDasharray="4 3"
        />
        <text
          x={round(frame.x + frame.width / 2)}
          y={round(frame.y + frame.height / 2)}
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
          fontSize={Math.min(10, frame.height / 4)}
          fill="#94a3b8"
        >
          Add a picture
        </text>
      </g>
    );
  }

  // A crop is applied by scaling the source into place behind a clip window;
  // fit modes without a crop map straight onto preserveAspectRatio.
  const cropped = frame.crop ? cropGeometry(frame, frame.crop) : null;

  return (
    <g clipPath={`url(#${clipId})`}>
      <defs>
        <clipPath id={clipId}>
          <rect
            x={round(frame.x)}
            y={round(frame.y)}
            width={round(frame.width)}
            height={round(frame.height)}
            rx={frame.radius || 0}
          />
        </clipPath>
      </defs>
      {cropped ? (
        <image
          href={frame.src}
          x={round(cropped.x)}
          y={round(cropped.y)}
          width={round(cropped.width)}
          height={round(cropped.height)}
          preserveAspectRatio="none"
        />
      ) : (
        <image
          href={frame.src}
          x={round(frame.x)}
          y={round(frame.y)}
          width={round(frame.width)}
          height={round(frame.height)}
          preserveAspectRatio={
            frame.fit === 'fill'
              ? 'none'
              : frame.fit === 'cover'
                ? 'xMidYMid slice'
                : 'xMidYMid meet'
          }
        />
      )}
    </g>
  );
}

/** Position the full image so the requested crop window lands in the box. */
function cropGeometry(
  frame: Extract<Frame, { kind: 'image' }>,
  crop: CropRect,
) {
  const safeW = Math.max(0.01, crop.w);
  const safeH = Math.max(0.01, crop.h);
  // In `contain` the cropped region is letterboxed rather than stretched.
  const region = sourceRect({ width: 1, height: 1 }, frame.width, frame.height, frame.fit, crop);
  const dest = destRect(region.w, region.h, frame.width, frame.height, frame.fit);
  const scaleX = dest.w / safeW;
  const scaleY = dest.h / safeH;
  return {
    x: frame.x + dest.x - crop.x * scaleX,
    y: frame.y + dest.y - crop.y * scaleY,
    width: scaleX,
    height: scaleY,
  };
}

function TableContent({ frame }: { frame: Extract<Frame, { kind: 'table' }> }) {
  return (
    <g>
      {frame.cells.map((cell: CellFrame, i) => {
        const x = frame.x + cell.x;
        const y = frame.y + cell.y;
        return (
          <g key={`bg-${i}`}>
            {cell.background && !isTransparent(cell.background) ? (
              <rect
                x={round(x)}
                y={round(y)}
                width={round(cell.width)}
                height={round(cell.height)}
                fill={cell.background}
              />
            ) : null}
          </g>
        );
      })}
      {frame.cells.map((cell, i) => {
        const x = frame.x + cell.x;
        const y = frame.y + cell.y;
        const sides: [BoxBorder | null | undefined, number, number, number, number][] = [
          [cell.borders.top, x, y, x + cell.width, y],
          [cell.borders.bottom, x, y + cell.height, x + cell.width, y + cell.height],
          [cell.borders.left, x, y, x, y + cell.height],
          [cell.borders.right, x + cell.width, y, x + cell.width, y + cell.height],
        ];
        return (
          <g key={`b-${i}`}>
            {sides.map(([border, x1, y1, x2, y2], k) =>
              border && border.width > 0 && !isTransparent(border.color) ? (
                <line
                  key={k}
                  x1={round(x1)}
                  y1={round(y1)}
                  x2={round(x2)}
                  y2={round(y2)}
                  stroke={border.color}
                  strokeWidth={border.width}
                  strokeDasharray={dashAttr(border.style, border.width)}
                  shapeRendering="crispEdges"
                />
              ) : null,
            )}
          </g>
        );
      })}
      {frame.cells.map((cell, i) => (
        <g key={`t-${i}`}>
          {cell.lines.map((line, k) => (
            <TextRun
              key={k}
              line={line}
              originX={frame.x + cell.x + cell.textX}
              originY={frame.y + cell.y + cell.textY}
            />
          ))}
        </g>
      ))}
    </g>
  );
}

function FrameShape({ frame }: { frame: Frame }) {
  const clipId = useId().replace(/[:]/g, '');
  const rotation = frame.rotation ?? 0;
  const transform = rotation
    ? `rotate(${round(rotation)} ${round(frame.x + frame.width / 2)} ${round(frame.y + frame.height / 2)})`
    : undefined;
  const opacity = frame.opacity ?? 1;

  let content: React.ReactNode = null;

  switch (frame.kind) {
    case 'text': {
      const tf = frame as TextFrame;
      content = (
        <>
          <BoxDecoration
            x={tf.x}
            y={tf.y}
            width={tf.width}
            height={tf.height}
            background={tf.background}
            border={tf.border}
          />
          {tf.lines.map((line, i) => (
            <TextRun key={i} line={line} originX={tf.x} originY={tf.y + (tf.padding?.top ?? 0)} />
          ))}
        </>
      );
      break;
    }
    case 'rule':
      content = (
        <rect
          x={round(frame.x)}
          y={round(frame.y)}
          width={round(frame.width)}
          height={round(Math.max(frame.thickness, 0.3))}
          fill={frame.dash === 'solid' ? frame.color : 'none'}
          stroke={frame.dash === 'solid' ? undefined : frame.color}
          strokeWidth={frame.dash === 'solid' ? undefined : frame.thickness}
          strokeDasharray={dashAttr(frame.dash, frame.thickness)}
        />
      );
      break;
    case 'line':
      content = (
        <line
          x1={round(frame.x)}
          y1={round(frame.y)}
          x2={round(frame.x2)}
          y2={round(frame.y2)}
          stroke={frame.stroke}
          strokeWidth={frame.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={dashAttr(frame.dash, frame.strokeWidth)}
        />
      );
      break;
    case 'shape': {
      const stroked = frame.strokeWidth > 0 && !isTransparent(frame.stroke);
      const filled = !isTransparent(frame.fill);
      content =
        frame.shape === 'rect' ? (
          <rect
            x={round(frame.x)}
            y={round(frame.y)}
            width={round(frame.width)}
            height={round(frame.height)}
            rx={frame.radius}
            fill={filled ? frame.fill : 'none'}
            stroke={stroked ? frame.stroke : undefined}
            strokeWidth={stroked ? frame.strokeWidth : undefined}
            strokeDasharray={stroked ? dashAttr(frame.dash, frame.strokeWidth) : undefined}
          />
        ) : frame.shape === 'ellipse' ? (
          <ellipse
            cx={round(frame.x + frame.width / 2)}
            cy={round(frame.y + frame.height / 2)}
            rx={round(frame.width / 2)}
            ry={round(frame.height / 2)}
            fill={filled ? frame.fill : 'none'}
            stroke={stroked ? frame.stroke : undefined}
            strokeWidth={stroked ? frame.strokeWidth : undefined}
            strokeDasharray={stroked ? dashAttr(frame.dash, frame.strokeWidth) : undefined}
          />
        ) : (
          <path
            d={shapePath(frame.shape, frame.width, frame.height)}
            transform={`translate(${round(frame.x)} ${round(frame.y)})`}
            fill={filled ? frame.fill : 'none'}
            stroke={stroked ? frame.stroke : undefined}
            strokeWidth={stroked ? frame.strokeWidth : undefined}
            strokeLinejoin="round"
            strokeDasharray={stroked ? dashAttr(frame.dash, frame.strokeWidth) : undefined}
          />
        );
      break;
    }
    case 'checkbox':
      content = (
        <>
          <rect
            x={round(frame.x)}
            y={round(frame.y)}
            width={round(frame.size)}
            height={round(frame.size)}
            rx={frame.size * 0.12}
            fill="none"
            stroke={frame.stroke}
            strokeWidth={Math.max(0.5, frame.size * 0.07)}
          />
          {frame.checked ? (
            <path
              d={checkPath(frame.size)}
              transform={`translate(${round(frame.x)} ${round(frame.y)})`}
              fill="none"
              stroke={frame.stroke}
              strokeWidth={Math.max(0.8, frame.size * 0.12)}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </>
      );
      break;
    case 'image':
      content = <ImageContent frame={frame} clipId={`clip-${clipId}`} />;
      break;
    case 'table':
      content = <TableContent frame={frame} />;
      break;
  }

  return (
    <g transform={transform} opacity={opacity === 1 ? undefined : opacity}>
      {content}
    </g>
  );
}

export interface PageSvgProps {
  page: LaidOutPage;
  /** Draw the margin guides and the content box outline. */
  showGuides?: boolean;
  showGrid?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

function PageSvgInner({ page, showGuides, showGrid, className, style }: PageSvgProps) {
  const gridId = `grid-${page.index}`;
  return (
    <svg
      viewBox={`0 0 ${page.width} ${page.height}`}
      width={page.width}
      height={page.height}
      className={className}
      style={style}
      role="img"
      aria-label={`Page ${page.index + 1}`}
    >
      <rect x={0} y={0} width={page.width} height={page.height} fill={page.background ?? '#ffffff'} />

      {showGrid ? (
        <>
          <defs>
            <pattern id={gridId} width={18} height={18} patternUnits="userSpaceOnUse">
              <path d="M 18 0 L 0 0 0 18" fill="none" stroke="#e2e8f0" strokeWidth={0.4} />
            </pattern>
          </defs>
          <rect x={0} y={0} width={page.width} height={page.height} fill={`url(#${gridId})`} />
        </>
      ) : null}

      {showGuides ? (
        <rect
          x={page.content.x}
          y={page.content.y}
          width={page.content.width}
          height={page.content.height}
          fill="none"
          stroke="#c7d2fe"
          strokeWidth={0.6}
          strokeDasharray="4 4"
        />
      ) : null}

      {page.masterFrames
        .filter((f) => f.source.id === 'watermark' || f.source.id === 'border')
        .map((frame) => (
          <FrameShape key={frame.id} frame={frame} />
        ))}

      {page.frames.map((frame) => (
        <FrameShape key={frame.id} frame={frame} />
      ))}

      {page.masterFrames
        .filter((f) => f.source.id !== 'watermark' && f.source.id !== 'border')
        .map((frame) => (
          <FrameShape key={frame.id} frame={frame} />
        ))}
    </svg>
  );
}

export const PageSvg = memo(PageSvgInner);
