import React from 'react';

/**
 * A deliberately small markdown subset for staff messages.
 *
 * Emits React elements and NEVER an HTML string, so there is no
 * dangerouslySetInnerHTML anywhere and therefore no sanitisation surface to get
 * wrong. That is the whole reason this exists rather than a markdown library:
 * these messages are composed by admins but rendered on every staff device, and
 * the safe version of "render arbitrary formatting" is to support a fixed list
 * of things and treat everything else as literal text.
 *
 * Supported: **bold**, *italic*, `code`, [links](https://…), - bullets,
 * 1. numbered lists, blank-line paragraphs, single-line breaks.
 *
 * Anything else — raw HTML, images, tables — renders as the characters that
 * were typed. A sender seeing their `<script>` come out as visible text learns
 * the rule immediately, which is a better outcome than it silently vanishing.
 */

type Block =
    | { type: 'p'; lines: string[] }
    | { type: 'ul'; items: string[] }
    | { type: 'ol'; items: string[] };

export function renderMessageBody(body: string): React.ReactNode {
    return toBlocks(body).map((block, index) => {
        if (block.type === 'ul') {
            return (
                <ul key={index} className="list-disc pl-5 space-y-0.5 my-2">
                    {block.items.map((item, i) => (
                        <li key={i}>{inline(item)}</li>
                    ))}
                </ul>
            );
        }

        if (block.type === 'ol') {
            return (
                <ol key={index} className="list-decimal pl-5 space-y-0.5 my-2">
                    {block.items.map((item, i) => (
                        <li key={i}>{inline(item)}</li>
                    ))}
                </ol>
            );
        }

        return (
            <p key={index} className="my-2 first:mt-0 last:mb-0">
                {block.lines.map((line, i) => (
                    <React.Fragment key={i}>
                        {i > 0 && <br />}
                        {inline(line)}
                    </React.Fragment>
                ))}
            </p>
        );
    });
}

/** Group lines into paragraphs and lists. */
function toBlocks(body: string): Block[] {
    const blocks: Block[] = [];
    let paragraph: string[] = [];

    const flush = () => {
        if (paragraph.length) {
            blocks.push({ type: 'p', lines: paragraph });
            paragraph = [];
        }
    };

    for (const rawLine of body.replace(/\r\n/g, '\n').split('\n')) {
        const line = rawLine.trimEnd();

        if (line.trim() === '') {
            flush();
            continue;
        }

        const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
        const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);

        if (bullet) {
            flush();
            const last = blocks[blocks.length - 1];
            if (last?.type === 'ul') last.items.push(bullet[1]);
            else blocks.push({ type: 'ul', items: [bullet[1]] });
            continue;
        }

        if (numbered) {
            flush();
            const last = blocks[blocks.length - 1];
            if (last?.type === 'ol') last.items.push(numbered[1]);
            else blocks.push({ type: 'ol', items: [numbered[1]] });
            continue;
        }

        paragraph.push(line);
    }

    flush();
    return blocks;
}

// Ordered so the greedier patterns are tried first; `**a**` must not be read as
// two italics.
const INLINE = [
    { re: /\*\*([^*]+)\*\*/, render: (t: string, k: number) => <strong key={k}>{t}</strong> },
    { re: /\*([^*]+)\*/, render: (t: string, k: number) => <em key={k}>{t}</em> },
    {
        re: /`([^`]+)`/,
        render: (t: string, k: number) => (
            <code key={k} className="px-1 py-0.5 rounded bg-neutral-light border border-[#e3ddd0] text-[0.9em]">
                {t}
            </code>
        ),
    },
];

const LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/;

function inline(text: string, depth = 0): React.ReactNode {
    // Bounded so a pathological string cannot recurse without end.
    if (depth > 6) return text;

    const link = LINK.exec(text);
    if (link) {
        return (
            <>
                {inline(text.slice(0, link.index), depth + 1)}
                <a
                    href={link[2]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2"
                >
                    {link[1]}
                </a>
                {inline(text.slice(link.index + link[0].length), depth + 1)}
            </>
        );
    }

    for (const { re, render } of INLINE) {
        const match = re.exec(text);
        if (match) {
            return (
                <>
                    {inline(text.slice(0, match.index), depth + 1)}
                    {render(match[1], depth)}
                    {inline(text.slice(match.index + match[0].length), depth + 1)}
                </>
            );
        }
    }

    return text;
}
