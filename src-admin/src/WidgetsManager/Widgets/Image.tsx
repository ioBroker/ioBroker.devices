import React from 'react';
import { Box, Typography } from '@mui/material';
import { BrokenImage } from '@mui/icons-material';

import WidgetGeneric, {
    isNeumorphicTheme,
    type WidgetGenericProps,
    type WidgetGenericState,
    type WidgetGenericSettings,
} from './Generic';
import type { ConfigItemPanel } from '@iobroker/json-config';

export interface ImageWidgetSettings extends WidgetGenericSettings {
    refreshInterval: number;
    appendTimestamp: boolean;
}

export interface WidgetImageState extends WidgetGenericState {
    url: string | null;
    /** Cache-busting counter incremented by refresh timer */
    tick: number;
}

/** Picture-refresh defaults. Subclasses override {@link WidgetImage.getPictureDefaults}. */
export interface PictureDefaults {
    refreshInterval: number;
    appendTimestamp: boolean;
}

const IMAGE_DEFAULTS: PictureDefaults = { refreshInterval: 0, appendTimestamp: false };

export class WidgetImage<TState extends WidgetImageState = WidgetImageState> extends WidgetGeneric<
    TState,
    ImageWidgetSettings
> {
    protected readonly urlId: string | null;
    private refreshTimer: ReturnType<typeof setInterval> | null = null;

    constructor(props: WidgetGenericProps<ImageWidgetSettings>) {
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

    static getDefaultSettings(): ImageWidgetSettings {
        return {
            ...WidgetGeneric.getDefaultSettings(),
            ...IMAGE_DEFAULTS,
        };
    }

    /**
     * `props.settings` stays undefined until the user opens the settings dialog once, so the values
     * from `getDefaultSettings()` never reach a freshly detected device. Read them from here instead.
     */
    // eslint-disable-next-line class-methods-use-this
    protected getPictureDefaults(): PictureDefaults {
        return IMAGE_DEFAULTS;
    }

    protected get refreshInterval(): number {
        return this.props.settings?.refreshInterval ?? this.getPictureDefaults().refreshInterval;
    }

    protected get appendTimestamp(): boolean {
        return this.props.settings?.appendTimestamp ?? this.getPictureDefaults().appendTimestamp;
    }

    static getConfigSchema(): { name: string; schema: ConfigItemPanel } {
        return {
            name: 'Image settings', // ignored
            schema: {
                type: 'panel',
                items: {
                    refreshInterval: {
                        type: 'number',
                        label: 'wm_Refresh interval',
                        default: 0,
                        min: 0,
                        help: 'wm_Refresh interval help',
                    },
                    appendTimestamp: {
                        type: 'checkbox',
                        label: 'wm_Append timestamp',
                        default: false,
                    },
                },
            },
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.urlId) {
            this.props.stateContext.getState(this.urlId, this.onUrlChange);
        }
        this.setupRefreshTimer();
    }

    componentDidUpdate(prevProps: WidgetGenericProps<ImageWidgetSettings>): void {
        super.componentDidUpdate(prevProps);
        const fallback = this.getPictureDefaults().refreshInterval;
        if ((prevProps.settings?.refreshInterval ?? fallback) !== this.refreshInterval) {
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
        const interval = this.refreshInterval;
        if (interval > 0) {
            this.refreshTimer = setInterval(() => this.bumpTick(), interval * 1000);
        }
    }

    /**
     * `setState` with a partial of the *base* state. `TState` is only known to extend
     * `WidgetImageState`, so TypeScript cannot narrow a literal to `Pick<TState, K>` — the same
     * reason `WidgetGeneric` funnels its own writes through a cast.
     */
    protected patchImageState(patch: Partial<WidgetImageState>): void {
        this.setState(patch as Partial<TState> as TState);
    }

    protected bumpTick(): void {
        this.patchImageState({ tick: this.state.tick + 1 });
    }

    private onUrlChange = (_id: string, state: ioBroker.State): void => {
        const url = state.val != null ? String(state.val) : null;
        if (url !== this.state.url) {
            this.patchImageState({ url });
        }
    };

    /**
     * Build the display URL. A re-render alone never refetches the picture, so a requested refresh
     * has to change the URL — `tick` does that and, unlike a wall-clock stamp, stays stable between
     * refreshes, so unrelated re-renders do not trigger a fetch.
     */
    protected getDisplayUrl(): string | null {
        const { url, tick } = this.state;
        if (!url) {
            return null;
        }
        const separator = url.includes('?') ? '&' : '?';
        if (this.appendTimestamp) {
            return `${url}${separator}ts=${Date.now()}`;
        }
        return tick ? `${url}${separator}ts=${tick}` : url;
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

    /** Shown in place of the picture while there is no URL. Sized like the frame it sits in. */
    private renderPlaceholder(fontSize: number): React.JSX.Element {
        return (
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize,
                    '& .MuiSvgIcon-root': { fontSize: 'inherit !important' },
                    '& img': { width: '1em !important', height: '1em !important' },
                }}
            >
                {this.renderTileIcon()}
            </Box>
        );
    }

    // --- 1x1 compact: image fills the tile ---

    renderCompact(): React.JSX.Element {
        const { name } = this.state;
        const displayUrl = this.getDisplayUrl();
        const isActive = this.isTileActive();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={theme => WidgetGeneric.getStyleCompact(theme)}
            >
                <Box
                    onClick={this.hasTileAction() ? () => this.onTileClick() : undefined}
                    sx={theme => ({
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        alignItems: 'stretch',
                        width: '100%',
                        aspectRatio: '1',
                        textAlign: 'left',
                        overflow: 'hidden',
                        position: 'relative',
                        cursor: this.hasTileAction() ? 'pointer' : 'default',
                        ...this.applyTileStyles(theme, isActive),
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
                        this.renderPlaceholder(48)
                    )}

                    {indicators}

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
                            sx={theme => ({
                                fontWeight: 600,
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                fontSize: 'max(0.875rem, 9cqi)',
                                color: '#fff',
                                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                                ...(isNeumorphicTheme(theme)
                                    ? {
                                          textTransform: 'uppercase' as const,
                                          letterSpacing: '0.08em',
                                          fontSize: 'max(0.6rem, 6cqi)',
                                      }
                                    : {}),
                            })}
                        >
                            {this.props.settings?.name || name || '...'}
                        </Typography>
                    </Box>
                </Box>
            </Box>
        );
    }

    // --- 2x0.5 wide: image on left, name on right ---

    renderWide(): React.JSX.Element {
        const { name } = this.state;
        const displayUrl = this.getDisplayUrl();
        const isActive = this.isTileActive();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={theme => WidgetGeneric.getStyleWide(theme)}
            >
                <Box
                    onClick={this.hasTileAction() ? () => this.onTileClick() : undefined}
                    sx={theme => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0,
                        width: '100%',
                        height: 80,
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: this.hasTileAction() ? 'pointer' : 'default',
                        ...this.applyTileStyles(theme, isActive),
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
                            this.renderPlaceholder(32)
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
            </Box>
        );
    }

    // --- 2x1 wideTall: large image ---

    renderWideTall(): React.JSX.Element {
        const { name } = this.state;
        const displayUrl = this.getDisplayUrl();
        const isActive = this.isTileActive();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={theme => WidgetGeneric.getStyleWideTall(theme)}
            >
                {/* Sizer */}
                <Box sx={{ width: 'calc(50% - 6px)', aspectRatio: '1' }} />
                <Box
                    onClick={this.hasTileAction() ? () => this.onTileClick() : undefined}
                    sx={theme => ({
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        overflow: 'hidden',
                        cursor: this.hasTileAction() ? 'pointer' : 'default',
                        ...this.applyTileStyles(theme, isActive),
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
                        this.renderPlaceholder(64)
                    )}

                    {indicators}

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
            </Box>
        );
    }
}

export default WidgetImage;
