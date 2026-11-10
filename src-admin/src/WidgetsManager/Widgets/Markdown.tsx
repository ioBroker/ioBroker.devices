import React, { Suspense } from 'react';

import { Box, Button, Dialog, DialogActions, DialogContent, Typography } from '@mui/material';
import { Close, OpenInFull } from '@mui/icons-material';
import type { Theme } from '@mui/material/styles';
import { I18n } from '@iobroker/gui-components';

import type { ConfigItemPanel } from '@iobroker/json-config';

import WidgetGeneric, { type WidgetGenericState, type WidgetGenericProps } from './Generic';
import { SIZE_OPTIONS_WITH_2X2, hideBaseFields } from '../configUtils';
import type { CustomWidgetBase } from '../../../../packages/dm-widgets/src/index';

/** The Markdown parser is loaded only when a page shows such a tile */
const MarkdownView = React.lazy(() => import('./MarkdownView'));

export type WidgetMarkdownFontSize = 's' | 'm' | 'l' | 'xl';

export interface WidgetMarkdownSettings extends CustomWidgetBase {
    /** The text of the note */
    markdown?: string;
    fontSize?: WidgetMarkdownFontSize;
    align?: 'left' | 'center';
}

interface WidgetMarkdownState extends WidgetGenericState {
    dialogOpen: boolean;
    /** The text is longer than the tile: it fades out, and a click shows all of it */
    overflowing: boolean;
}

/**
 * The size a new note gets - room for a few lines.
 *
 * The settings dialog leaves a value out of the tile when it equals the default, so the tile reads it from here too,
 * the same way the grid does.
 */
const DEFAULT_SIZE = '2x1';

export const MARKDOWN_FONT_SIZES: Record<WidgetMarkdownFontSize, string> = {
    s: '0.75rem',
    m: '0.875rem',
    l: '1.0625rem',
    xl: '1.375rem',
};

/** Height of the faded bottom of a text that does not fit */
const FADE = '2.2em';

/** A tile with any text written in Markdown: notes, comments, instructions for the household */
export class WidgetMarkdown extends WidgetGeneric<WidgetMarkdownState, WidgetMarkdownSettings> {
    private viewportEl: HTMLDivElement | null = null;
    private contentEl: HTMLDivElement | null = null;
    private resizeObserver: ResizeObserver | null = null;

    static getConfigSchema(): ConfigItemPanel {
        return {
            type: 'panel',
            label: 'wm_Markdown',
            items: {
                // A note is never "active"
                ...hideBaseFields('colorActive'),
                size: {
                    type: 'select',
                    label: 'wm_Size',
                    options: SIZE_OPTIONS_WITH_2X2,
                    default: DEFAULT_SIZE,
                    format: 'radio',
                    horizontal: true,
                    noTranslation: true,
                },
                color: { type: 'color', label: 'wm_Color', xs: 12 },
                markdown: {
                    type: 'component',
                    subType: 'markdownEditor',
                    label: 'wm_Markdown text',
                    default: '',
                    xs: 12,
                },
                fontSize: {
                    type: 'select',
                    label: 'wm_Font size',
                    options: [
                        { value: 's', label: 'wm_md_font_s' },
                        { value: 'm', label: 'wm_md_font_m' },
                        { value: 'l', label: 'wm_md_font_l' },
                        { value: 'xl', label: 'wm_md_font_xl' },
                    ],
                    default: 'm',
                    xs: 12,
                    sm: 6,
                },
                align: {
                    type: 'select',
                    label: 'wm_Alignment',
                    options: [
                        { value: 'left', label: 'wm_md_align_left' },
                        { value: 'center', label: 'wm_md_align_center' },
                    ],
                    default: 'left',
                    xs: 12,
                    sm: 6,
                },
            },
        };
    }

    constructor(props: WidgetGenericProps<WidgetMarkdownSettings>) {
        super(props);
        this.state = {
            ...this.state,
            dialogOpen: props.openDialogId === String(props.widget.id),
            overflowing: false,
        };
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
    }

    /** There is nothing to operate on a note, so the lock of a read-only widget would only puzzle */
    // eslint-disable-next-line class-methods-use-this
    protected get isReadOnly(): boolean {
        return false;
    }

    private get text(): string {
        return (this.props.settings.markdown || '').trim();
    }

    private setViewportEl = (el: HTMLDivElement | null): void => {
        this.viewportEl = el;
        this.observe();
    };

    private setContentEl = (el: HTMLDivElement | null): void => {
        this.contentEl = el;
        this.observe();
    };

    /** Watches the tile and its text: the text changes its height when the parser arrives or an image loads */
    private observe(): void {
        this.resizeObserver?.disconnect();
        if (!this.viewportEl || !this.contentEl || typeof ResizeObserver === 'undefined') {
            return;
        }
        this.resizeObserver ||= new ResizeObserver(() => this.checkOverflow());
        this.resizeObserver.observe(this.viewportEl);
        this.resizeObserver.observe(this.contentEl);
        this.checkOverflow();
    }

    private checkOverflow(): void {
        if (!this.viewportEl) {
            return;
        }
        const overflowing = this.viewportEl.scrollHeight > this.viewportEl.clientHeight + 1;
        if (overflowing !== this.state.overflowing) {
            this.setState({ overflowing });
        }
    }

    private openDialog = (): void => {
        if (!this.state.overflowing) {
            return;
        }
        this.setState({ dialogOpen: true });
        this.props.onOpenWidgetDialog?.(String(this.props.widget.id));
    };

    private closeDialog = (): void => {
        this.setState({ dialogOpen: false });
        this.props.onCloseWidgetDialog?.();
    };

    private renderText(): React.JSX.Element {
        const { fontSize, align } = this.props.settings;
        return (
            <Suspense fallback={null}>
                <MarkdownView
                    text={this.text}
                    fontSize={MARKDOWN_FONT_SIZES[fontSize || 'm'] || MARKDOWN_FONT_SIZES.m}
                    align={align === 'center' ? 'center' : 'left'}
                />
            </Suspense>
        );
    }

    /**
     * The tile itself; the caller gives it its size
     *
     * @param sizeSx the size of the tile in the cell of the grid
     */
    private renderTile(sizeSx: Record<string, unknown>): React.JSX.Element {
        const { overflowing } = this.state;
        const indicators = this.renderIndicators(this.renderSettingsButton());
        const centered = this.props.settings.align === 'center';
        const text = this.text;

        return (
            <Box
                onClick={this.openDialog}
                sx={(theme: Theme) => ({
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    cursor: overflowing ? 'pointer' : 'default',
                    ...this.applyTileStyles(theme, false, { interactive: overflowing }),
                    padding: 'max(10px, 3cqi) max(12px, 3.5cqi)',
                    ...sizeSx,
                })}
            >
                {indicators}
                <Box
                    ref={this.setViewportEl}
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        ...(overflowing
                            ? {
                                  maskImage: `linear-gradient(to bottom, black calc(100% - ${FADE}), transparent)`,
                                  WebkitMaskImage: `linear-gradient(to bottom, black calc(100% - ${FADE}), transparent)`,
                              }
                            : undefined),
                    }}
                >
                    <Box
                        ref={this.setContentEl}
                        // Centered vertically while it fits; when it is longer, auto margins drop to 0 and it starts at the top
                        sx={{ flexShrink: 0, my: centered ? 'auto' : 0 }}
                    >
                        {/* Keeps the first lines clear of the settings button */}
                        {indicators ? <Box sx={{ float: 'right', width: 24, height: 20 }} /> : null}
                        {text ? (
                            this.renderText()
                        ) : (
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary' }}
                            >
                                {I18n.t('wm_Not configured')}
                            </Typography>
                        )}
                    </Box>
                </Box>
                {overflowing ? (
                    <OpenInFull
                        sx={{
                            position: 'absolute',
                            right: 'max(6px, 2cqi)',
                            bottom: 'max(6px, 2cqi)',
                            fontSize: 16,
                            opacity: 0.55,
                            pointerEvents: 'none',
                        }}
                    />
                ) : null}
            </Box>
        );
    }

    renderCompact(): React.JSX.Element {
        return (
            <Box
                id={String(this.props.widget.id)}
                className="widget-markdown"
                sx={theme => WidgetGeneric.getStyleCompact(theme)}
            >
                {this.renderTile({ width: '100%', aspectRatio: '1' })}
            </Box>
        );
    }

    renderWide(): React.JSX.Element {
        return (
            <Box
                id={String(this.props.widget.id)}
                className="widget-markdown"
                sx={theme => WidgetGeneric.getStyleWide(theme)}
            >
                {this.renderTile({ width: '100%', height: 80 })}
            </Box>
        );
    }

    renderWideTall(): React.JSX.Element {
        return (
            <Box
                id={String(this.props.widget.id)}
                className="widget-markdown"
                sx={theme => WidgetGeneric.getStyleWideTall(theme)}
            >
                {/* Gives the cell the height of a 1x1 tile; the text must not decide it */}
                <Box sx={{ width: 'calc(50% - 6px)', aspectRatio: '1' }} />
                {this.renderTile({ position: 'absolute', inset: 0 })}
            </Box>
        );
    }

    renderHuge(): React.JSX.Element {
        return (
            <Box
                id={String(this.props.widget.id)}
                className="widget-markdown"
                sx={theme => WidgetGeneric.getStyleHuge(theme)}
            >
                {this.renderTile({ width: '100%', aspectRatio: '1' })}
            </Box>
        );
    }

    private renderDialog(): React.JSX.Element | null {
        if (!this.state.dialogOpen) {
            return null;
        }
        return (
            <Dialog
                open
                onClose={this.closeDialog}
                maxWidth="md"
                fullWidth
            >
                <DialogContent sx={{ pt: 3 }}>{this.renderText()}</DialogContent>
                <DialogActions>
                    <Button
                        color="grey"
                        variant="contained"
                        startIcon={<Close />}
                        onClick={this.closeDialog}
                    >
                        {I18n.t('wm_Close')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    render(): React.JSX.Element {
        const size = this.props.settings.size || DEFAULT_SIZE;
        let tile: React.JSX.Element;
        if (size === '2x0.5') {
            tile = this.renderWide();
        } else if (size === '2x1') {
            tile = this.renderWideTall();
        } else if (size === '2x2') {
            tile = this.renderHuge();
        } else {
            tile = this.renderCompact();
        }
        return (
            <>
                {tile}
                {this.renderDialog()}
            </>
        );
    }
}

export default WidgetMarkdown;
