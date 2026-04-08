import React, { Component } from 'react';

import { Box, Dialog, DialogContent, IconButton, Typography } from '@mui/material';
import { Close, OpenInNew, Settings } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';
import type { Theme } from '@mui/material/styles';

import WidgetGeneric, { getTileStyles } from './Generic';

interface WidgetIframeProps {
    id: string;
    url?: string;
    refreshInterval?: number;
    appendTimestamp?: boolean;
    clickAction?: 'dialog' | 'newTab' | 'sameTab';
    size?: '1x1' | '2x0.5' | '2x1';
    color?: string;
    onOpenSettings?: () => void;
    onRemove?: () => void;
    /** Widget dialog ID to auto-open (from hash) */
    openDialogId?: string | null;
    /** Persist opened dialog to the URL hash */
    onOpenWidgetDialog?: (dialogId: string) => void;
    /** Clear the dialog from the URL hash */
    onCloseWidgetDialog?: () => void;
}

interface WidgetIframeState {
    dialogOpen: boolean;
    ts: number;
}

export class WidgetIframe extends Component<WidgetIframeProps, WidgetIframeState> {
    private refreshTimer: ReturnType<typeof setInterval> | null = null;

    constructor(props: WidgetIframeProps) {
        super(props);
        this.state = { dialogOpen: props.openDialogId === props.id, ts: Date.now() };
    }

    componentDidMount(): void {
        this.setupRefreshTimer();
    }

    componentDidUpdate(prevProps: WidgetIframeProps): void {
        if (prevProps.refreshInterval !== this.props.refreshInterval) {
            this.setupRefreshTimer();
        }
    }

    componentWillUnmount(): void {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
    }

    private setupRefreshTimer(): void {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        const interval = Number(this.props.refreshInterval) || 0;
        if (interval > 0) {
            this.refreshTimer = setInterval(() => {
                this.setState({ ts: Date.now() });
            }, interval * 1000);
        }
    }

    private getUrl(forceTs?: boolean): string {
        let url = this.props.url || '';
        if (!url) {
            return '';
        }
        if (this.props.appendTimestamp || forceTs) {
            const sep = url.includes('?') ? '&' : '?';
            url = `${url}${sep}ts=${this.state.ts}`;
        }
        return url;
    }

    private handleClick = (): void => {
        const action = this.props.clickAction || 'dialog';
        const url = this.props.url || '';
        if (!url) {
            return;
        }
        if (action === 'dialog') {
            this.setState({ dialogOpen: true });
            this.props.onOpenWidgetDialog?.(this.props.id);
        } else if (action === 'newTab') {
            window.open(url, '_blank', 'noopener');
        } else {
            window.location.href = url;
        }
    };

    private renderSettingsButton(): React.JSX.Element | null {
        if (!this.props.onOpenSettings) {
            return null;
        }
        return (
            <IconButton
                size="small"
                onClick={e => {
                    e.stopPropagation();
                    this.props.onOpenSettings!();
                }}
                sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    zIndex: 2,
                    opacity: 0.4,
                    '&:hover': { opacity: 1 },
                }}
            >
                <Settings sx={{ fontSize: 16 }} />
            </IconButton>
        );
    }

    static renderIframe(url: string, interactive: boolean): React.JSX.Element {
        return (
            <Box
                component="iframe"
                src={url}
                title="iframe"
                sx={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    display: 'block',
                    pointerEvents: interactive ? 'auto' : 'none',
                }}
            />
        );
    }

    renderCompact(): React.JSX.Element {
        const url = this.getUrl();
        const { color } = this.props;

        return (
            <Box sx={theme => WidgetGeneric.getStyleCompact(theme)}>
                <Box
                    onClick={this.handleClick}
                    sx={(theme: Theme) => ({
                        width: '100%',
                        aspectRatio: '1',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        ...getTileStyles(theme, false, color),
                        padding: 0,
                    })}
                >
                    {url ? (
                        WidgetIframe.renderIframe(url, false)
                    ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary' }}
                            >
                                {I18n.t('wm_Not configured')}
                            </Typography>
                        </Box>
                    )}
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    renderWide(): React.JSX.Element {
        const url = this.getUrl();
        const { color } = this.props;

        return (
            <Box sx={theme => WidgetGeneric.getStyleWide(theme)}>
                <Box
                    onClick={this.handleClick}
                    sx={(theme: Theme) => ({
                        width: '100%',
                        height: 80,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        display: 'flex',
                        ...getTileStyles(theme, false, color),
                        padding: 0,
                    })}
                >
                    {url ? (
                        WidgetIframe.renderIframe(url, false)
                    ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary' }}
                            >
                                {I18n.t('wm_Not configured')}
                            </Typography>
                        </Box>
                    )}
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    renderWideTall(): React.JSX.Element {
        const url = this.getUrl();
        const { color } = this.props;

        return (
            <Box sx={theme => WidgetGeneric.getStyleWideTall(theme)}>
                <Box sx={{ width: 'calc(50% - 6px)', aspectRatio: '1' }} />
                <Box
                    onClick={this.handleClick}
                    sx={(theme: Theme) => ({
                        position: 'absolute',
                        inset: 0,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        display: 'flex',
                        ...getTileStyles(theme, false, color, false),
                        padding: 0,
                    })}
                >
                    {url ? (
                        WidgetIframe.renderIframe(url, false)
                    ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary' }}
                            >
                                {I18n.t('wm_Not configured')}
                            </Typography>
                        </Box>
                    )}
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    renderDialog(): React.JSX.Element | null {
        if (!this.state.dialogOpen) {
            return null;
        }
        const url = this.getUrl(true);

        return (
            <Dialog
                open
                onClose={() => {
                    this.setState({ dialogOpen: false });
                    this.props.onCloseWidgetDialog?.();
                }}
                maxWidth={false}
                slotProps={{
                    paper: {
                        sx: {
                            width: '95vw',
                            height: '95vh',
                            maxWidth: '95vw',
                            maxHeight: '95vh',
                            borderRadius: '12px',
                            '@media (orientation: landscape)': {
                                width: '100dvw',
                                height: '100dvh',
                                maxWidth: '100dvw',
                                maxHeight: '100dvh',
                                borderRadius: 0,
                                margin: 0,
                            },
                        },
                    },
                }}
            >
                <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2, display: 'flex', gap: 1 }}>
                        <IconButton
                            size="small"
                            onClick={() => window.open(this.props.url || '', '_blank', 'noopener')}
                            sx={{ backgroundColor: 'background.paper', '&:hover': { backgroundColor: 'action.hover' } }}
                        >
                            <OpenInNew fontSize="small" />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={() => {
                                this.setState({ dialogOpen: false });
                                this.props.onCloseWidgetDialog?.();
                            }}
                            sx={{ backgroundColor: 'background.paper', '&:hover': { backgroundColor: 'action.hover' } }}
                        >
                            <Close fontSize="small" />
                        </IconButton>
                    </Box>
                    {url ? WidgetIframe.renderIframe(url, true) : null}
                </DialogContent>
            </Dialog>
        );
    }

    render(): React.JSX.Element {
        const size = this.props.size || '2x1';
        let widget: React.JSX.Element;
        if (size === '2x0.5') {
            widget = this.renderWide();
        } else if (size === '2x1') {
            widget = this.renderWideTall();
        } else {
            widget = this.renderCompact();
        }

        return (
            <>
                {widget}
                {this.renderDialog()}
            </>
        );
    }
}

export default WidgetIframe;
