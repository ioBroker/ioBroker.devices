import React from 'react';
import { Box, Typography } from '@mui/material';
import { BrokenImage } from '@mui/icons-material';

import WidgetGeneric, { getTileStyles, type WidgetGenericProps, type WidgetGenericState } from './Generic';

interface WidgetImageState extends WidgetGenericState {
    url: string | null;
    /** Cache-busting counter incremented by refresh timer */
    tick: number;
}

export class WidgetImage extends WidgetGeneric<WidgetImageState> {
    private readonly urlId: string | null;
    private refreshTimer: ReturnType<typeof setInterval> | null = null;

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;
        const urlState = states.find(s => s.name === 'URL');

        this.urlId = urlState?.id ?? null;

        this.state = {
            ...this.state,
            url: null,
            tick: 0,
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.urlId) {
            this.props.stateContext.getState(this.urlId, this.onUrlChange);
        }
        this.setupRefreshTimer();
    }

    componentDidUpdate(prevProps: WidgetGenericProps): void {
        const prevInterval = prevProps.settings?.refreshInterval ?? 0;
        const newInterval = this.props.settings?.refreshInterval ?? 0;
        if (prevInterval !== newInterval) {
            this.setupRefreshTimer();
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.urlId) {
            this.props.stateContext.removeState(this.urlId, this.onUrlChange);
        }
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    private setupRefreshTimer(): void {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        const interval = this.props.settings?.refreshInterval ?? 0;
        if (interval > 0) {
            this.refreshTimer = setInterval(() => {
                this.setState(prev => ({ tick: prev.tick + 1 }));
            }, interval * 1000);
        }
    }

    private onUrlChange = (_id: string, state: ioBroker.State): void => {
        const url = state.val != null ? String(state.val) : null;
        if (url !== this.state.url) {
            this.setState({ url });
        }
    };

    /** Build the display URL, optionally appending a cache-busting timestamp */
    private getDisplayUrl(): string | null {
        const { url } = this.state;
        if (!url) {
            return null;
        }
        const appendTs = this.props.settings?.appendTimestamp;
        if (!appendTs) {
            return url;
        }
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}ts=${Date.now()}`;
    }

    protected isTileActive(): boolean {
        return !!this.state.url;
    }

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = this.renderBaseIcon();
        if (baseIcon) {
            return baseIcon;
        }
        return <BrokenImage sx={{ color: 'text.disabled' }} />;
    }

    // --- 1x1 compact: image fills the tile ---

    renderCompact(): React.JSX.Element {
        const { name } = this.state;
        const displayUrl = this.getDisplayUrl();
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const isDisabled = this.props.settings?.enabled === false;
        const indicators = this.renderIndicators();

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={{ position: 'relative', containerType: 'inline-size', overflow: 'hidden' }}
            >
                <Box
                    sx={theme => ({
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        alignItems: 'stretch',
                        width: '100%',
                        aspectRatio: '1',
                        textAlign: 'left',
                        overflow: 'hidden',
                        opacity: isDisabled ? 0.4 : 1,
                        position: 'relative',
                        ...getTileStyles(theme, isActive, accent),
                        padding: 0,
                    })}
                >
                    {/* Image fills entire tile */}
                    {displayUrl ? (
                        <Box
                            component="img"
                            src={displayUrl}
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: '16px',
                            }}
                        />
                    ) : (
                        <Box
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <BrokenImage sx={{ fontSize: 48, color: 'text.disabled' }} />
                        </Box>
                    )}

                    {indicators ? (
                        <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 1 }}>{indicators}</Box>
                    ) : null}

                    {/* Name overlay at bottom */}
                    <Box
                        sx={{
                            position: 'relative',
                            zIndex: 1,
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                            borderRadius: '0 0 16px 16px',
                            px: 'max(12px, 8cqi)',
                            py: 'max(8px, 5cqi)',
                        }}
                    >
                        <Typography
                            ref={this.nameRef}
                            variant="body2"
                            sx={{
                                fontWeight: 600,
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                fontSize: 'max(0.875rem, 9cqi)',
                                color: '#fff',
                                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                            }}
                        >
                            {this.props.settings?.name || name || '...'}
                        </Typography>
                    </Box>
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    // --- 2x0.5 wide: image on left, name on right ---

    renderWide(): React.JSX.Element {
        const { name } = this.state;
        const displayUrl = this.getDisplayUrl();
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const isDisabled = this.props.settings?.enabled === false;
        const indicators = this.renderIndicators();

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={{ position: 'relative', gridColumn: 'span 2', containerType: 'inline-size', overflow: 'hidden' }}
            >
                <Box
                    sx={theme => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0,
                        width: '100%',
                        height: 80,
                        position: 'relative',
                        overflow: 'hidden',
                        opacity: isDisabled ? 0.4 : 1,
                        ...getTileStyles(theme, isActive, accent),
                        padding: 0,
                    })}
                >
                    {/* Image on left */}
                    <Box
                        sx={{
                            width: 80,
                            height: 80,
                            flexShrink: 0,
                            position: 'relative',
                            overflow: 'hidden',
                            borderRadius: '16px 0 0 16px',
                        }}
                    >
                        {displayUrl ? (
                            <Box
                                component="img"
                                src={displayUrl}
                                sx={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                }}
                            />
                        ) : (
                            <Box
                                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}
                            >
                                <BrokenImage sx={{ fontSize: 32, color: 'text.disabled' }} />
                            </Box>
                        )}
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0, px: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography
                                ref={this.nameRef}
                                variant="body2"
                                sx={{ fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap' }}
                            >
                                {this.props.settings?.name || name || '...'}
                            </Typography>
                            {indicators}
                        </Box>
                    </Box>
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    // --- 2x1 wideTall: large image ---

    renderWideTall(): React.JSX.Element {
        const { name } = this.state;
        const displayUrl = this.getDisplayUrl();
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const isDisabled = this.props.settings?.enabled === false;
        const indicators = this.renderIndicators();

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={{ position: 'relative', gridColumn: 'span 2', containerType: 'inline-size', overflow: 'hidden' }}
            >
                {/* Sizer */}
                <Box sx={{ width: 'calc(50% - 6px)', aspectRatio: '1' }} />
                <Box
                    sx={theme => ({
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        overflow: 'hidden',
                        opacity: isDisabled ? 0.4 : 1,
                        ...getTileStyles(theme, isActive, accent),
                        padding: 0,
                    })}
                >
                    {/* Image fills entire tile */}
                    {displayUrl ? (
                        <Box
                            component="img"
                            src={displayUrl}
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: '16px',
                            }}
                        />
                    ) : (
                        <Box
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <BrokenImage sx={{ fontSize: 64, color: 'text.disabled' }} />
                        </Box>
                    )}

                    {indicators ? (
                        <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1 }}>{indicators}</Box>
                    ) : null}

                    {/* Name overlay at bottom */}
                    <Box
                        sx={{
                            position: 'relative',
                            zIndex: 1,
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                            borderRadius: '0 0 16px 16px',
                            px: 2,
                            py: 1.5,
                        }}
                    >
                        <Typography
                            ref={this.nameRef}
                            variant="body2"
                            sx={{
                                fontWeight: 600,
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                color: '#fff',
                                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                            }}
                        >
                            {this.props.settings?.name || name || '...'}
                        </Typography>
                    </Box>
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }
}

export default WidgetImage;
