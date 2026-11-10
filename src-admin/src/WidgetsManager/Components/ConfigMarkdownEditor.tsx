import React, { Suspense } from 'react';
import { Box, Divider, IconButton, Link, TextField, Tooltip, Typography } from '@mui/material';
import {
    Checklist,
    Code,
    Edit,
    FormatBold,
    FormatItalic,
    FormatListBulleted,
    FormatListNumbered,
    FormatQuote,
    HorizontalRule,
    InsertLink,
    StrikethroughS,
    TableChart,
    Title,
    Visibility,
} from '@mui/icons-material';
import { I18n } from '@iobroker/gui-components';
import { ConfigGeneric, type ConfigGenericProps, type ConfigGenericState } from '@iobroker/json-config';

const MarkdownView = React.lazy(() => import('../Widgets/MarkdownView'));

const CHEAT_SHEET_URL = 'https://www.markdownguide.org/cheat-sheet/';

/** The text after a toolbar action and what is selected in it */
interface TextEdit {
    text: string;
    start: number;
    end: number;
}

type EditAction = (value: string, start: number, end: number) => TextEdit;

/** Any prefix that makes a line a heading, quote or list item - replaced when the line gets another one */
const ANY_LINE_PREFIX = /^(#{1,6} |> |[-*+] \[[ xX]\] |[-*+] |\d+[.)] )/;

/**
 * Puts `before` and `after` around the selection, or around a placeholder when nothing is selected, and selects the
 * text in between. Takes them away again when the selection is wrapped in them already.
 */
function wrapSelection(
    value: string,
    start: number,
    end: number,
    before: string,
    after: string,
    placeholder: string,
): TextEdit {
    if (
        start !== end &&
        value.slice(start - before.length, start) === before &&
        value.slice(end, end + after.length) === after
    ) {
        return {
            text: value.slice(0, start - before.length) + value.slice(start, end) + value.slice(end + after.length),
            start: start - before.length,
            end: end - before.length,
        };
    }
    const selected = value.slice(start, end) || placeholder;
    return {
        text: value.slice(0, start) + before + selected + after + value.slice(end),
        start: start + before.length,
        end: start + before.length + selected.length,
    };
}

/**
 * Puts a prefix before every line the selection touches, or takes it away when all of them have it already.
 * Empty lines in a selection of several lines stay as they are.
 *
 * @param value the text
 * @param start start of the selection
 * @param end end of the selection
 * @param prefix the prefix of the n-th changed line
 * @param own matches the prefix this action adds
 */
function prefixLines(
    value: string,
    start: number,
    end: number,
    prefix: (index: number) => string,
    own: RegExp,
): TextEdit {
    const blockStart = value.lastIndexOf('\n', start - 1) + 1;
    // A selection that ends right after a line break does not take the next line
    const lastChar = end > start && value[end - 1] === '\n' ? end - 1 : end;
    let blockEnd = value.indexOf('\n', lastChar);
    if (blockEnd === -1) {
        blockEnd = value.length;
    }
    const lines = value.slice(blockStart, blockEnd).split('\n');
    const several = lines.length > 1;
    const filled = lines.filter(line => line.trim());
    const remove = !!filled.length && filled.every(line => own.test(line));
    let n = 0;
    const block = lines
        .map(line => {
            if (several && !line.trim()) {
                return line;
            }
            if (remove) {
                return line.replace(own, '');
            }
            return prefix(n++) + line.replace(ANY_LINE_PREFIX, '');
        })
        .join('\n');
    const text = value.slice(0, blockStart) + block + value.slice(blockEnd);
    // One line: the cursor goes to its end, ready to type; several: they stay selected
    return start === end && !several
        ? { text, start: blockStart + block.length, end: blockStart + block.length }
        : { text, start: blockStart, end: blockStart + block.length };
}

/** Puts a block (rule, table, code) on lines of its own, with an empty line before and after it */
function insertBlock(
    value: string,
    start: number,
    end: number,
    block: string,
    selectFrom = -1,
    selectTo = -1,
): TextEdit {
    const before = value.slice(0, start);
    const after = value.slice(end);
    let lead = '';
    if (before) {
        lead = before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    }
    let trail = '\n';
    if (after) {
        trail = after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
    }
    const offset = before.length + lead.length;
    return {
        text: before + lead + block + trail + after,
        start: selectFrom >= 0 ? offset + selectFrom : offset + block.length,
        end: selectTo >= 0 ? offset + selectTo : offset + block.length,
    };
}

interface ToolbarButton {
    key: string;
    title: string;
    icon: React.JSX.Element;
    action: EditAction;
}

interface ConfigMarkdownEditorState extends ConfigGenericState {
    /** The text as typed; the data of the form follows it */
    text: string;
    preview: boolean;
}

/** Editor for the text of a Markdown tile: a toolbar for the common formats and a preview */
export default class ConfigMarkdownEditor extends ConfigGeneric<ConfigGenericProps, ConfigMarkdownEditorState> {
    private inputRef = React.createRef<HTMLTextAreaElement>();

    constructor(props: ConfigGenericProps) {
        super(props);
        this.state = {
            ...this.state,
            text: this.getStored(props.data),
            preview: false,
        };
    }

    private get attrName(): string {
        return this.props.attr || 'markdown';
    }

    private getStored(data: Record<string, any>): string {
        const value = ConfigGeneric.getValue(data, this.props.attr || 'markdown');
        return typeof value === 'string' ? value : '';
    }

    componentDidUpdate(prevProps: ConfigGenericProps): void {
        // Changed from outside (e.g. the dialog was opened for another tile): take it over
        const stored = this.getStored(this.props.data);
        if (stored !== this.getStored(prevProps.data) && stored !== this.state.text) {
            this.setState({ text: stored });
        }
    }

    private setText(text: string, selection?: { start: number; end: number }): void {
        this.setState({ text }, () => {
            void this.onChange(this.attrName, text);
            const el = this.inputRef.current;
            if (selection && el) {
                el.focus();
                el.setSelectionRange(selection.start, selection.end);
            }
        });
    }

    private apply(action: EditAction): void {
        const el = this.inputRef.current;
        const value = this.state.text;
        const start = el ? el.selectionStart : value.length;
        const end = el ? el.selectionEnd : value.length;
        const result = action(value, start, end);
        this.setText(result.text, result);
    }

    private static getButtons(): ToolbarButton[] {
        const text = I18n.t('wm_md_text');
        return [
            {
                key: 'bold',
                title: `${I18n.t('wm_md_bold')} (Ctrl+B)`,
                icon: <FormatBold />,
                action: (v, s, e) => wrapSelection(v, s, e, '**', '**', text),
            },
            {
                key: 'italic',
                title: `${I18n.t('wm_md_italic')} (Ctrl+I)`,
                icon: <FormatItalic />,
                action: (v, s, e) => wrapSelection(v, s, e, '*', '*', text),
            },
            {
                key: 'strike',
                title: I18n.t('wm_md_strikethrough'),
                icon: <StrikethroughS />,
                action: (v, s, e) => wrapSelection(v, s, e, '~~', '~~', text),
            },
            {
                key: 'heading',
                title: I18n.t('wm_md_heading'),
                icon: <Title />,
                action: (v, s, e) => prefixLines(v, s, e, () => '## ', /^#{1,6} /),
            },
            {
                key: 'bullets',
                title: I18n.t('wm_md_bullets'),
                icon: <FormatListBulleted />,
                action: (v, s, e) => prefixLines(v, s, e, () => '- ', /^[-*+] (?!\[[ xX]\] )/),
            },
            {
                key: 'numbers',
                title: I18n.t('wm_md_numbers'),
                icon: <FormatListNumbered />,
                action: (v, s, e) => prefixLines(v, s, e, i => `${i + 1}. `, /^\d+[.)] /),
            },
            {
                key: 'tasks',
                title: I18n.t('wm_md_tasks'),
                icon: <Checklist />,
                action: (v, s, e) => prefixLines(v, s, e, () => '- [ ] ', /^[-*+] \[[ xX]\] /),
            },
            {
                key: 'quote',
                title: I18n.t('wm_md_quote'),
                icon: <FormatQuote />,
                action: (v, s, e) => prefixLines(v, s, e, () => '> ', /^> /),
            },
            {
                key: 'code',
                title: I18n.t('wm_md_code'),
                icon: <Code />,
                action: (v, s, e) => {
                    const selected = v.slice(s, e);
                    if (selected.includes('\n')) {
                        return insertBlock(v, s, e, `\`\`\`\n${selected}\n\`\`\``, 4, 4 + selected.length);
                    }
                    return wrapSelection(v, s, e, '`', '`', 'code');
                },
            },
            {
                key: 'link',
                title: I18n.t('wm_md_link'),
                icon: <InsertLink />,
                action: (v, s, e) => {
                    const selected = v.slice(s, e).trim();
                    // A selected address becomes the target, otherwise the selected text becomes the label
                    if (/^https?:\/\/\S+$/.test(selected)) {
                        const label = I18n.t('wm_md_link_text');
                        return {
                            text: `${v.slice(0, s)}[${label}](${selected})${v.slice(e)}`,
                            start: s + 1,
                            end: s + 1 + label.length,
                        };
                    }
                    const label = selected || I18n.t('wm_md_link_text');
                    const url = 'https://';
                    return {
                        text: `${v.slice(0, s)}[${label}](${url})${v.slice(e)}`,
                        start: s + label.length + 3,
                        end: s + label.length + 3 + url.length,
                    };
                },
            },
            {
                key: 'table',
                title: I18n.t('wm_md_table'),
                icon: <TableChart />,
                action: (v, s, e) => {
                    const column = I18n.t('wm_md_column');
                    const header = `| ${column} 1 | ${column} 2 |`;
                    return insertBlock(v, s, e, `${header}\n| --- | --- |\n|  |  |`, 2, 2 + column.length + 2);
                },
            },
            {
                key: 'rule',
                title: I18n.t('wm_md_rule'),
                icon: <HorizontalRule />,
                action: (v, s, e) => insertBlock(v, s, e, '---'),
            },
        ];
    }

    private onKeyDown = (e: React.KeyboardEvent): void => {
        if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) {
            return;
        }
        const key = e.key.toLowerCase();
        if (key === 'b' || key === 'i') {
            e.preventDefault();
            const marker = key === 'b' ? '**' : '*';
            this.apply((v, s, en) => wrapSelection(v, s, en, marker, marker, I18n.t('wm_md_text')));
        }
    };

    renderItem(error: unknown, disabled: boolean): React.JSX.Element {
        const { text, preview } = this.state;

        return (
            <Box sx={{ mt: 1 }}>
                <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                >
                    {I18n.t((this.props.schema.label as string) || 'wm_Markdown text')}
                </Typography>
                <Box
                    sx={theme => ({
                        border: `1px solid ${error ? theme.palette.error.main : theme.palette.divider}`,
                        borderRadius: '6px',
                        overflow: 'hidden',
                    })}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: '2px',
                            px: 0.5,
                            py: 0.25,
                            backgroundColor: 'action.hover',
                        }}
                    >
                        {ConfigMarkdownEditor.getButtons().map(button => (
                            <Tooltip
                                key={button.key}
                                title={button.title}
                                slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                            >
                                <span>
                                    <IconButton
                                        size="small"
                                        disabled={disabled || preview}
                                        aria-label={button.title}
                                        // Keeps the selection in the text field
                                        onMouseDown={e => e.preventDefault()}
                                        onClick={() => this.apply(button.action)}
                                        sx={{ '& .MuiSvgIcon-root': { fontSize: 20 } }}
                                    >
                                        {button.icon}
                                    </IconButton>
                                </span>
                            </Tooltip>
                        ))}
                        <Box sx={{ flex: 1 }} />
                        <Divider
                            orientation="vertical"
                            flexItem
                            sx={{ mx: 0.5 }}
                        />
                        <Tooltip
                            title={I18n.t(preview ? 'wm_md_edit' : 'wm_md_preview')}
                            slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                        >
                            <IconButton
                                size="small"
                                color={preview ? 'primary' : 'default'}
                                aria-label={I18n.t(preview ? 'wm_md_edit' : 'wm_md_preview')}
                                onClick={() => this.setState({ preview: !preview })}
                                sx={{ '& .MuiSvgIcon-root': { fontSize: 20 } }}
                            >
                                {preview ? <Edit /> : <Visibility />}
                            </IconButton>
                        </Tooltip>
                    </Box>
                    {preview ? (
                        <Box sx={{ p: 1.5, minHeight: 190, maxHeight: 440, overflowY: 'auto' }}>
                            {text.trim() ? (
                                <Suspense fallback={null}>
                                    <MarkdownView text={text} />
                                </Suspense>
                            ) : (
                                <Typography
                                    variant="caption"
                                    sx={{ color: 'text.secondary' }}
                                >
                                    {I18n.t('wm_Not configured')}
                                </Typography>
                            )}
                        </Box>
                    ) : (
                        <TextField
                            variant="standard"
                            fullWidth
                            multiline
                            minRows={8}
                            maxRows={20}
                            value={text}
                            disabled={disabled}
                            placeholder={I18n.t('wm_md_placeholder')}
                            inputRef={this.inputRef}
                            onKeyDown={this.onKeyDown}
                            onChange={e => this.setText(e.target.value)}
                            slotProps={{
                                input: {
                                    disableUnderline: true,
                                    sx: {
                                        px: 1.5,
                                        py: 1,
                                        fontFamily: 'monospace',
                                        fontSize: 13,
                                        lineHeight: 1.5,
                                    },
                                },
                            }}
                        />
                    )}
                </Box>
                <Typography
                    variant="caption"
                    component="div"
                    sx={{ color: 'text.secondary', mt: 0.5 }}
                >
                    {I18n.t('wm_md_help')}{' '}
                    <Link
                        href={CHEAT_SHEET_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {I18n.t('wm_md_syntax')}
                    </Link>
                </Typography>
            </Box>
        );
    }
}
