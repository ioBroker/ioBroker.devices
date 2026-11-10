import React from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Box } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';

/**
 * Renders the text of a Markdown tile.
 *
 * Kept in its own module and imported lazily: the Markdown parser is only loaded when a page shows such a tile.
 * Raw HTML in the text is not rendered and links with unsafe protocols (`javascript:` etc.) are dropped by
 * `react-markdown`, so a note cannot run code on the page of somebody else.
 */

export interface MarkdownViewProps {
    /** The Markdown text */
    text: string;
    /** CSS font size of the body text; headings are scaled from it */
    fontSize?: string;
    /** Horizontal alignment of the text */
    align?: 'left' | 'center';
}

/** GitHub flavour: tables, task lists, strikethrough and bare URLs as links */
const REMARK_PLUGINS = [remarkGfm];

const COMPONENTS: Components = {
    // A link leaves the dashboard, and the click must not reach the tile, which opens its dialog on click
    a: ({ node: _node, ...props }) => (
        <a
            {...props}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
        />
    ),
    img: ({ node: _node, alt, ...props }) => (
        <img
            {...props}
            alt={alt || ''}
            loading="lazy"
        />
    ),
};

function getStyle(theme: Theme, fontSize: string, align: 'left' | 'center'): Record<string, unknown> {
    const tint = alpha(theme.palette.text.primary, 0.08);
    return {
        fontSize,
        lineHeight: 1.45,
        textAlign: align,
        color: theme.palette.text.primary,
        overflowWrap: 'anywhere',
        '& > :first-child': { marginTop: 0 },
        '& > :last-child': { marginBottom: 0 },
        '& h1, & h2, & h3, & h4, & h5, & h6': { margin: '0.5em 0 0.3em', lineHeight: 1.25, fontWeight: 600 },
        '& h1': { fontSize: '1.5em' },
        '& h2': { fontSize: '1.3em' },
        '& h3': { fontSize: '1.15em' },
        '& h4, & h5, & h6': { fontSize: '1em' },
        '& p': { margin: '0.4em 0' },
        '& ul, & ol': { margin: '0.4em 0', paddingLeft: '1.4em' },
        '& li': { margin: '0.15em 0' },
        '& li > p': { margin: 0 },
        '& ul.contains-task-list': { listStyle: 'none', paddingLeft: '0.2em' },
        '& li.task-list-item input': { margin: '0 0.45em 0 0', verticalAlign: 'middle' },
        '& a': { color: theme.palette.primary.main },
        '& code': {
            fontFamily: 'monospace',
            fontSize: '0.9em',
            padding: '0.1em 0.3em',
            borderRadius: '4px',
            backgroundColor: tint,
        },
        '& pre': {
            margin: '0.5em 0',
            padding: '0.6em 0.8em',
            borderRadius: '6px',
            overflowX: 'auto',
            backgroundColor: tint,
            textAlign: 'left',
        },
        '& pre code': { padding: 0, backgroundColor: 'transparent' },
        '& blockquote': {
            margin: '0.5em 0',
            paddingLeft: '0.8em',
            borderLeft: `3px solid ${theme.palette.primary.main}`,
            color: theme.palette.text.secondary,
        },
        '& hr': { border: 'none', borderTop: `1px solid ${theme.palette.divider}`, margin: '0.6em 0' },
        // A block of its own, so that a wide table scrolls instead of widening the tile
        '& table': {
            display: align === 'center' ? 'inline-block' : 'block',
            borderCollapse: 'collapse',
            margin: '0.5em 0',
            maxWidth: '100%',
            overflowX: 'auto',
            textAlign: 'left',
        },
        '& th, & td': { border: `1px solid ${theme.palette.divider}`, padding: '0.2em 0.5em' },
        '& th': { fontWeight: 600, backgroundColor: alpha(theme.palette.text.primary, 0.05) },
        '& img': { maxWidth: '100%', height: 'auto', borderRadius: '4px' },
        // Centered text: a list stays one block in the middle, its lines still start on the left
        ...(align === 'center' ? { '& > ul, & > ol': { display: 'inline-block', textAlign: 'left' } } : {}),
    };
}

export default function MarkdownView(props: MarkdownViewProps): React.JSX.Element {
    const fontSize = props.fontSize || '0.875rem';
    const align = props.align || 'left';
    return (
        <Box
            className="wm-markdown"
            sx={theme => getStyle(theme, fontSize, align)}
        >
            <Markdown
                remarkPlugins={REMARK_PLUGINS}
                components={COMPONENTS}
            >
                {props.text}
            </Markdown>
        </Box>
    );
}
