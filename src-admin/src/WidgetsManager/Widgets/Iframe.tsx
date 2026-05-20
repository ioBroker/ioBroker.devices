import React from 'react';

import { Box, Dialog, DialogContent, IconButton, Typography } from '@mui/material';
import { Close, OpenInNew } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';
import type { Theme } from '@mui/material/styles';

import type { ConfigItemPanel } from '@iobroker/json-config';

import WidgetGeneric, { type WidgetGenericState, type WidgetGenericProps } from './Generic';
import { SIZE_OPTIONS_WITH_2X2, hideBaseFields } from '../configUtils';
import type { CustomWidgetBase } from '../../../../packages/dm-widgets/src/index';
import { DETECT_APPLICATIONS } from '../Utils';

export interface WidgetIframeSettings extends CustomWidgetBase {
    url?: string;
    refreshInterval?: number;
    appendTimestamp?: boolean;
    clickAction?: 'dialog' | 'newTab' | 'sameTab';
}

interface WidgetIframeState extends WidgetGenericState {
    dialogOpen: boolean;
    ts: number;
    webPort: number;
}

export class WidgetIframe extends WidgetGeneric<WidgetIframeState, WidgetIframeSettings> {
    private refreshTimer: ReturnType<typeof setInterval> | null = null;

    static getConfigSchema(): ConfigItemPanel {
        return {
            type: 'panel',
            label: 'wm_Iframe',
            items: {
                // Iframe shows a web page — no active/inactive colour palette applies.
                ...hideBaseFields('colorActive', 'color'),
                // Override the base size dropdown to also offer 2×2 for the iFrame's web view.
                size: {
                    type: 'select',
                    label: 'wm_Size',
                    options: SIZE_OPTIONS_WITH_2X2,
                    default: '1x1',
                    format: 'radio',
                    horizontal: true,
                    noTranslation: true,
                },
                url: { type: 'component', subType: 'urlSelector', title: 'wm_URL', placeholder: 'wm_URL placeholder' },
                doNotModifyUrl: {
                    type: 'checkbox',
                    label: 'wm_Do not modify URL',
                    hidden: '["/vis/", "/vis-2/", "/echarts/", "/flot/", "/jarvis/"].find(e=>(data.url || "").includes(e))',
                },
                refreshInterval: {
                    type: 'number',
                    label: 'wm_Refresh interval',
                    default: 0,
                    help: 'wm_Refresh interval help',
                },
                appendTimestamp: { type: 'checkbox', label: 'wm_Append timestamp', default: false },
                clickAction: {
                    type: 'select',
                    label: 'wm_Click action',
                    options: [
                        { value: 'dialog', label: 'wm_Open in dialog' },
                        { value: 'newTab', label: 'wm_Open in new tab' },
                        { value: 'sameTab', label: 'wm_Open in same tab' },
                    ],
                    default: 'dialog',
                    format: 'dropdown',
                },
            },
        };
    }

    constructor(props: WidgetGenericProps<WidgetIframeSettings>) {
        super(props);
        this.state = {
            ...this.state,
            dialogOpen: props.openDialogId === String(props.widget.id),
            ts: Date.now(),
            webPort: 0,
        };
    }

    async componentDidMount(): Promise<void> {
        super.componentDidMount();
        this.setupRefreshTimer();
        const url = this.props.settings.url || '';
        let webPort = 0;
        if (this.props.stateContext.admin && url && DETECT_APPLICATIONS.find(e => url.includes(e))) {
            // read web port
            const instances = await this.props.stateContext.getSocket().getAdapterInstances('web');
            // find not localhost instance
            for (const instance of instances) {
                if (
                    instance.common.enabled &&
                    instance.native.host !== 'localhost' &&
                    ((window.location.protocol === 'http:' && !instance.native.secure) ||
                        (window.location.protocol === 'https:' && instance.native.secure))
                ) {
                    webPort = instance.native.port;
                }
            }
            if (!webPort) {
                for (const instance of instances) {
                    if (instance.common.enabled && instance.native.host !== 'localhost') {
                        webPort = instance.native.port;
                    }
                }
            }
            if (!webPort) {
                for (const instance of instances) {
                    if (instance.common.enabled) {
                        webPort = instance.native.port;
                    }
                }
            }
            if (!webPort) {
                for (const instance of instances) {
                    webPort = instance.native.port;
                    break;
                }
            }
            this.setState({ webPort });
        }
    }

    componentDidUpdate(prevProps: WidgetGenericProps<WidgetIframeSettings>): void {
        if (prevProps.settings.refreshInterval !== this.props.settings.refreshInterval) {
            this.setupRefreshTimer();
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
    }

    private setupRefreshTimer(): void {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        const interval = Number(this.props.settings.refreshInterval) || 0;
        if (interval > 0) {
            this.refreshTimer = setInterval(() => {
                this.setState({ ts: Date.now() });
            }, interval * 1000);
        }
    }

    private getUrl(forceTs?: boolean): string {
        let url = this.props.settings.url || '';
        if (!url) {
            return '';
        }

        if (DETECT_APPLICATIONS.find(e => url.startsWith(e))) {
            // if we are in admin, so find WEB port
            // if we are in web, use directly
            // if in cloud, use directly
            if (!window.location.hostname.includes('iobroker.') && this.props.stateContext.admin) {
                url = `${window.location.protocol}//${window.location.hostname}:${this.state.webPort}${url}`;
            }
        }
        if (this.props.settings.appendTimestamp || forceTs) {
            const sep = url.includes('?') ? '&' : '?';
            url = `${url}${sep}ts=${this.state.ts}`;
        }
        return url;
    }

    private handleClick = (): void => {
        const action = this.props.settings.clickAction || 'dialog';
        const url = this.props.settings.url || '';
        if (!url) {
            return;
        }
        if (action === 'dialog') {
            this.setState({ dialogOpen: true });
            this.props.onOpenWidgetDialog?.(String(this.props.widget.id));
        } else if (action === 'newTab') {
            window.open(url, '_blank', 'noopener');
        } else {
            window.location.href = url;
        }
    };

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
        const { color } = this.props.settings;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);

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
                        ...this.applyTileStyles(theme, false, { accent: color, inactiveColor: color }),
                        padding: 0,
                    })}
                >
                    {indicators}
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
            </Box>
        );
    }

    renderWide(): React.JSX.Element {
        const url = this.getUrl();
        const { color } = this.props.settings;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);

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
                        ...this.applyTileStyles(theme, false, { accent: color, inactiveColor: color }),
                        padding: 0,
                    })}
                >
                    {indicators}
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
            </Box>
        );
    }

    renderHuge(): React.JSX.Element {
        const url = this.getUrl();
        const { color } = this.props.settings;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);

        return (
            <Box sx={theme => WidgetGeneric.getStyleHuge(theme)}>
                <Box
                    onClick={this.handleClick}
                    sx={(theme: Theme) => ({
                        width: '100%',
                        aspectRatio: '1',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        ...this.applyTileStyles(theme, false, { accent: color, inactiveColor: color }),
                        padding: 0,
                    })}
                >
                    {indicators}
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
            </Box>
        );
    }

    renderWideTall(): React.JSX.Element {
        const url = this.getUrl();
        const { color } = this.props.settings;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);

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
                        ...this.applyTileStyles(theme, false, {
                            interactive: false,
                            accent: color,
                            inactiveColor: color,
                        }),
                        padding: 0,
                    })}
                >
                    {indicators}
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
                            onClick={() => window.open(this.props.settings.url || '', '_blank', 'noopener')}
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
        return (
            <>
                {super.render()}
                {this.renderDialog()}
            </>
        );
    }
}

export default WidgetIframe;
