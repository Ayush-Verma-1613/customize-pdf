import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * A small Markdown reader for the articles.
 *
 * It covers exactly what the writing uses - headings, paragraphs, both kinds
 * of list, a quoted aside, pipe tables, and inline bold, italic, code and
 * links - and nothing else. That is deliberate: the posts are written in this
 * repository rather than pasted in from outside, so the renderer can build
 * React nodes directly and never hand a string to dangerouslySetInnerHTML.
 */

type Block =
  | { kind: 'heading'; level: 2 | 3; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'table'; head: string[]; rows: string[][] };

const splitRow = (line: string) =>
  line
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim());

function parseBlocks(markdown: string): Block[] {
  const chunks = markdown.trim().split(/\n{2,}/);
  const blocks: Block[] = [];

  for (const chunk of chunks) {
    const lines = chunk.split('\n').filter((line) => line.trim().length > 0);
    if (lines.length === 0) continue;

    const heading = lines[0].match(/^(#{2,3})\s+(.*)$/);
    if (heading) {
      blocks.push({
        kind: 'heading',
        level: heading[1].length === 2 ? 2 : 3,
        text: heading[2].trim(),
      });
      continue;
    }

    if (lines.every((line) => /^[-*]\s+/.test(line))) {
      blocks.push({
        kind: 'list',
        ordered: false,
        items: lines.map((line) => line.replace(/^[-*]\s+/, '')),
      });
      continue;
    }

    if (lines.every((line) => /^\d+[.)]\s+/.test(line))) {
      blocks.push({
        kind: 'list',
        ordered: true,
        items: lines.map((line) => line.replace(/^\d+[.)]\s+/, '')),
      });
      continue;
    }

    if (lines.every((line) => line.startsWith('>'))) {
      blocks.push({
        kind: 'quote',
        text: lines.map((line) => line.replace(/^>\s?/, '')).join(' '),
      });
      continue;
    }

    // A table needs its header, the dashed rule under it, and at least one row.
    if (lines.length >= 3 && lines[0].includes('|') && /^[\s|:-]+$/.test(lines[1])) {
      blocks.push({
        kind: 'table',
        head: splitRow(lines[0]),
        rows: lines.slice(2).map(splitRow),
      });
      continue;
    }

    blocks.push({ kind: 'paragraph', text: lines.join(' ') });
  }

  return blocks;
}

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

/** Bold, italic, code and links. Anything unmatched passes through as text. */
function inline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).filter(Boolean).map((token, index) => {
    const key = `${keyPrefix}-${index}`;

    if (token.startsWith('**') && token.endsWith('**')) {
      return (
        <strong key={key} className="font-semibold text-forge-ink">
          {token.slice(2, -2)}
        </strong>
      );
    }

    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code
          key={key}
          className="rounded bg-forge-cream px-1.5 py-0.5 font-mono text-[0.88em] text-forge-accent"
        >
          {token.slice(1, -1)}
        </code>
      );
    }

    if (token.startsWith('*') && token.endsWith('*')) {
      return <em key={key}>{token.slice(1, -1)}</em>;
    }

    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const [, label, href] = link;
      const internal = href.startsWith('/');
      const className =
        'font-medium text-forge-accent underline decoration-forge-accent/30 underline-offset-2 transition-colors hover:decoration-forge-accent';

      return internal ? (
        <Link key={key} href={href} className={className}>
          {label}
        </Link>
      ) : (
        <a key={key} href={href} rel="noopener noreferrer" target="_blank" className={className}>
          {label}
        </a>
      );
    }

    return <span key={key}>{token}</span>;
  });
}

export function Markdown({ children }: { children: string }) {
  return (
    <>
      {parseBlocks(children).map((block, index) => {
        const key = `b${index}`;

        switch (block.kind) {
          case 'heading':
            return block.level === 2 ? (
              <h2
                key={key}
                className="mt-11 mb-3 font-serif text-[25px] leading-tight font-semibold text-forge-ink sm:text-[28px]"
              >
                {inline(block.text, key)}
              </h2>
            ) : (
              <h3
                key={key}
                className="mt-8 mb-2.5 text-[17.5px] leading-snug font-semibold text-forge-ink sm:text-[19px]"
              >
                {inline(block.text, key)}
              </h3>
            );

          case 'list': {
            const ListTag = block.ordered ? 'ol' : 'ul';
            return (
              <ListTag
                key={key}
                className={
                  block.ordered
                    ? 'my-5 list-decimal space-y-2 pl-5 marker:text-forge-muted'
                    : 'my-5 list-disc space-y-2 pl-5 marker:text-forge-accent/60'
                }
              >
                {block.items.map((item, itemIndex) => (
                  <li
                    key={`${key}-${itemIndex}`}
                    className="text-[16px] leading-[1.75] text-forge-ink-soft sm:text-[16.5px]"
                  >
                    {inline(item, `${key}-${itemIndex}`)}
                  </li>
                ))}
              </ListTag>
            );
          }

          case 'quote':
            return (
              <blockquote
                key={key}
                className="my-6 rounded-r-lg border-l-[3px] border-forge-accent/45 bg-forge-wash/60 py-3.5 pr-4 pl-4 text-[15.5px] leading-relaxed text-forge-ink-soft sm:text-[16px]"
              >
                {inline(block.text, key)}
              </blockquote>
            );

          case 'table':
            return (
              /* Tables are the one block that can outgrow a phone, so this one
                 scrolls inside its own frame rather than widening the article. */
              <div
                key={key}
                className="my-6 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:rounded-lg sm:border sm:border-forge-line sm:px-0"
              >
                <table className="w-full min-w-[420px] border-collapse text-left">
                  <thead>
                    <tr className="bg-forge-cream">
                      {block.head.map((cell, cellIndex) => (
                        <th
                          key={cellIndex}
                          className="border-b border-forge-line px-3.5 py-2.5 text-[12px] font-semibold tracking-[0.05em] text-forge-ink uppercase"
                        >
                          {cell}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-forge-line/60 last:border-0">
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="px-3.5 py-2.5 align-top text-[15px] leading-relaxed text-forge-ink-soft"
                          >
                            {inline(cell, `${key}-${rowIndex}-${cellIndex}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          default:
            return (
              <p
                key={key}
                className="my-5 text-[16px] leading-[1.78] text-forge-ink-soft sm:text-[16.5px]"
              >
                {inline(block.text, key)}
              </p>
            );
        }
      })}
    </>
  );
}
