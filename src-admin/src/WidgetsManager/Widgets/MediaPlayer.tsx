import React from 'react';
import { Box, Dialog, IconButton, Slider, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import {
    PlayArrow,
    Pause,
    SkipPrevious,
    SkipNext,
    Stop,
    MusicNote,
    VolumeDown,
    VolumeUp,
    VolumeOff,
    KeyboardArrowDown,
} from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';

import WidgetGeneric, {
    getTileStyles,
    isNeumorphicTheme,
    type WidgetGenericProps,
    type WidgetGenericState,
} from './Generic';

interface WidgetMediaPlayerState extends WidgetGenericState {
    playing: boolean;
    title: string;
    artist: string;
    album: string;
    cover: string;
    volume: number;
    duration: number;
    elapsed: number;
    dialogOpen: boolean;
}

type StateChangeHandler = (id: string, state: ioBroker.State) => void;

export class WidgetMediaPlayer extends WidgetGeneric<WidgetMediaPlayerState> {
    private readonly stateId: string | null;
    private readonly playId: string | null;
    private readonly pauseId: string | null;
    private readonly stopId: string | null;
    private readonly nextId: string | null;
    private readonly prevId: string | null;
    private readonly titleId: string | null;
    private readonly artistId: string | null;
    private readonly albumId: string | null;
    private readonly coverId: string | null;
    private readonly volumeId: string | null;
    private readonly durationId: string | null;
    private readonly elapsedId: string | null;

    private readonly handlers: { id: string; handler: StateChangeHandler }[] = [];

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;
        const find = (name: string): string | null => states.find(s => s.name === name)?.id ?? null;

        this.stateId = find('STATE');
        this.playId = find('PLAY');
        this.pauseId = find('PAUSE');
        this.stopId = find('STOP');
        this.nextId = find('NEXT');
        this.prevId = find('PREV');
        this.titleId = find('TITLE');
        this.artistId = find('ARTIST');
        this.albumId = find('ALBUM');
        this.coverId = find('COVER');
        this.volumeId = find('VOLUME') || find('SET');
        this.durationId = find('DURATION');
        this.elapsedId = find('ELAPSED');

        this.state = {
            ...this.state,
            playing: false,
            title: '',
            artist: '',
            album: '',
            cover: '',
            volume: 0,
            duration: 0,
            elapsed: 0,
            dialogOpen: false,
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.sub(this.stateId, this.onPlayState);
        this.sub(this.titleId, this.onTitle);
        this.sub(this.artistId, this.onArtist);
        this.sub(this.albumId, this.onAlbum);
        this.sub(this.coverId, this.onCover);
        this.sub(this.volumeId, this.onVolume);
        this.sub(this.durationId, this.onDuration);
        this.sub(this.elapsedId, this.onElapsed);
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        for (const { id, handler } of this.handlers) {
            this.props.stateContext.removeState(id, handler);
        }
    }

    private sub(id: string | null, handler: StateChangeHandler): void {
        if (id) {
            this.handlers.push({ id, handler });
            this.props.stateContext.getState(id, handler);
        }
    }

    private send(id: string | null, value: boolean | number): void {
        if (id) {
            void this.props.stateContext.getSocket().setState(id, value);
        }
    }

    // ── State handlers ──────────────────────────────────────────────

    private onPlayState = (_id: string, state: ioBroker.State): void => {
        const val = state.val;
        const playing = typeof val === 'boolean' ? val : Number(val) === 1;
        if (playing !== this.state.playing) {
            this.setState({ playing });
        }
    };

    private onTitle = (_id: string, state: ioBroker.State): void => {
        const title = String(state.val || '');
        if (title !== this.state.title) {
            this.setState({ title });
        }
    };

    private onArtist = (_id: string, state: ioBroker.State): void => {
        const artist = String(state.val || '');
        if (artist !== this.state.artist) {
            this.setState({ artist });
        }
    };

    private onAlbum = (_id: string, state: ioBroker.State): void => {
        const album = String(state.val || '');
        if (album !== this.state.album) {
            this.setState({ album });
        }
    };

    private onCover = (_id: string, state: ioBroker.State): void => {
        const cover = String(state.val || '');
        if (cover !== this.state.cover) {
            this.setState({ cover });
        }
    };

    private onVolume = (_id: string, state: ioBroker.State): void => {
        const volume = Math.round(Number(state.val) || 0);
        if (volume !== this.state.volume) {
            this.setState({ volume });
        }
    };

    private onDuration = (_id: string, state: ioBroker.State): void => {
        const duration = Number(state.val) || 0;
        if (duration !== this.state.duration) {
            this.setState({ duration });
        }
    };

    private onElapsed = (_id: string, state: ioBroker.State): void => {
        const elapsed = Number(state.val) || 0;
        if (elapsed !== this.state.elapsed) {
            this.setState({ elapsed });
        }
    };

    // ── Actions ─────────────────────────────────────────────────────

    private togglePlay = (): void => {
        if (this.state.playing) {
            this.send(this.pauseId || this.stateId, this.pauseId ? true : false);
        } else {
            this.send(this.playId || this.stateId, true);
        }
    };

    private onPrev = (): void => this.send(this.prevId, true);
    private onNext = (): void => this.send(this.nextId, true);
    private onStop = (): void => this.send(this.stopId || this.stateId, this.stopId ? true : false);

    private openDialog = (): void => this.setState({ dialogOpen: true });
    private closeDialog = (): void => this.setState({ dialogOpen: false });

    // ── Helpers ──────────────────────────────────────────────────────

    private static formatTime(seconds: number): string {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    // ── Progress bar (thin, non-interactive) ─────────────────────────

    private renderProgressBar(accentColor?: string, height = 3): React.JSX.Element | null {
        const { elapsed, duration } = this.state;
        if (!duration) {
            return null;
        }
        const pct = Math.min(100, (elapsed / duration) * 100);

        return (
            <Box
                sx={theme => ({
                    width: '100%',
                    height,
                    borderRadius: height / 2,
                    backgroundColor: alpha(theme.palette.common.white, 0.15),
                    overflow: 'hidden',
                    flexShrink: 0,
                })}
            >
                <Box
                    sx={{
                        width: `${pct}%`,
                        height: '100%',
                        borderRadius: 'inherit',
                        backgroundColor: accentColor || '#1db954',
                        transition: 'width 0.5s linear',
                    }}
                />
            </Box>
        );
    }

    // ── Overrides ───────────────────────────────────────────────────

    protected isTileActive(): boolean {
        return this.state.playing;
    }

    // eslint-disable-next-line class-methods-use-this
    protected hasTileAction(): boolean {
        return true;
    }

    protected onTileClick(): void {
        this.openDialog();
    }

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = this.renderBaseIcon();
        if (baseIcon) {
            return baseIcon;
        }
        const { playing, cover } = this.state;
        const accent = this.getAccentColor();

        if (cover) {
            return (
                <Box
                    sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '4px',
                        overflow: 'hidden',
                        flexShrink: 0,
                    }}
                >
                    <img
                        src={cover}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </Box>
            );
        }

        const iconSx = (theme: Theme): React.CSSProperties => ({
            color: playing ? accent || theme.palette.primary.main : theme.palette.text.disabled,
            transition: 'color 0.25s ease',
        });

        return playing ? <PlayArrow sx={iconSx} /> : <MusicNote sx={iconSx} />;
    }

    protected renderTileStatus(): React.JSX.Element {
        const { playing, title, artist } = this.state;
        const accent = this.getAccentColor();
        const text = playing ? title || artist || I18n.t('wm_Playing') : I18n.t('wm_Off');

        return (
            <Typography
                variant="caption"
                noWrap
                sx={theme => ({
                    fontWeight: 500,
                    maxWidth: '100%',
                    color: playing ? accent || theme.palette.primary.main : theme.palette.text.secondary,
                    transition: 'color 0.25s ease',
                })}
            >
                {text}
            </Typography>
        );
    }

    // No action buttons on tile — controls are in the dialog
    // eslint-disable-next-line class-methods-use-this
    protected renderTileAction(): React.JSX.Element {
        return <Box />;
    }

    // ── Compact 1x1: cover fills entire background ───────────────────

    renderCompact(): React.JSX.Element {
        const { name, playing, title, artist, cover, elapsed, duration } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const indicators = this.renderIndicators();

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={{ position: 'relative', containerType: 'inline-size', overflow: 'hidden', borderRadius: '16px' }}
            >
                <Box
                    onClick={this.openDialog}
                    sx={theme => ({
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        width: '100%',
                        aspectRatio: '1',
                        textAlign: 'left',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        userSelect: 'none',
                        position: 'relative',
                        ...getTileStyles(theme, isActive, accent),
                        padding: 0,
                    })}
                >
                    {/* Cover as full background */}
                    {cover ? (
                        <Box
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                backgroundImage: `url(${cover})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
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
                            <MusicNote
                                sx={theme => ({
                                    fontSize: 'max(3rem, 30cqi)',
                                    color: isActive
                                        ? accent || theme.palette.primary.main
                                        : theme.palette.text.disabled,
                                })}
                            />
                        </Box>
                    )}

                    {/* Gradient overlay at bottom for readability */}
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            background: cover
                                ? 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)'
                                : 'none',
                            pointerEvents: 'none',
                        }}
                    />

                    {indicators ? (
                        <Box
                            sx={theme => ({
                                position: 'absolute',
                                top: isNeumorphicTheme(theme) ? 'max(12px, 8cqi)' : 8,
                                right: isNeumorphicTheme(theme) ? 'max(12px, 8cqi)' : 8,
                                zIndex: 2,
                            })}
                        >
                            {indicators}
                        </Box>
                    ) : null}

                    {/* Play/Pause indicator */}
                    {cover ? (
                        <Box
                            sx={{
                                position: 'absolute',
                                bottom: 'calc(50% + 4px)',
                                left: 8,
                                zIndex: 2,
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                borderRadius: '6px',
                                width: 28,
                                height: 28,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {playing ? (
                                <Pause sx={{ fontSize: 18, color: '#fff' }} />
                            ) : (
                                <PlayArrow sx={{ fontSize: 18, color: '#fff' }} />
                            )}
                        </Box>
                    ) : null}

                    {/* Info overlay at bottom */}
                    <Box
                        sx={{
                            position: 'relative',
                            zIndex: 1,
                            p: 'max(8px, 6cqi)',
                            pt: 0,
                        }}
                    >
                        <Typography
                            ref={this.nameRef}
                            variant="body2"
                            noWrap
                            sx={{
                                fontWeight: 700,
                                lineHeight: 1.3,
                                color: cover ? '#fff' : undefined,
                                fontSize: 'max(0.75rem, 7.5cqi)',
                                textShadow: cover ? '0 1px 3px rgba(0,0,0,0.5)' : undefined,
                            }}
                        >
                            {title || this.props.settings?.name || name || '...'}
                        </Typography>
                        {artist ? (
                            <Typography
                                variant="caption"
                                noWrap
                                sx={{
                                    display: 'block',
                                    fontWeight: 500,
                                    color: cover ? 'rgba(255,255,255,0.7)' : undefined,
                                    fontSize: 'max(0.6rem, 6cqi)',
                                    textShadow: cover ? '0 1px 2px rgba(0,0,0,0.5)' : undefined,
                                }}
                            >
                                {artist}
                            </Typography>
                        ) : null}

                        {/* Thin progress bar */}
                        {duration ? (
                            <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontSize: 'max(0.5rem, 5cqi)',
                                        color: cover ? 'rgba(255,255,255,0.6)' : undefined,
                                        lineHeight: 1,
                                    }}
                                >
                                    {WidgetMediaPlayer.formatTime(elapsed)}
                                </Typography>
                                <Box sx={{ flex: 1 }}>{this.renderProgressBar(accent || '#1db954', 3)}</Box>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontSize: 'max(0.5rem, 5cqi)',
                                        color: cover ? 'rgba(255,255,255,0.6)' : undefined,
                                        lineHeight: 1,
                                    }}
                                >
                                    {WidgetMediaPlayer.formatTime(duration)}
                                </Typography>
                            </Box>
                        ) : null}
                    </Box>
                    {this.renderChart()}
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    // ── Wide 2x0.5: cover background + thumbnail + text + progress ──

    renderWide(): React.JSX.Element {
        const { name, title, artist, cover, duration } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const indicators = this.renderIndicators();

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={{ position: 'relative', gridColumn: 'span 2', containerType: 'inline-size', overflow: 'hidden', borderRadius: '16px' }}
            >
                <Box
                    onClick={this.openDialog}
                    sx={theme => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        width: '100%',
                        height: 80,
                        position: 'relative',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        ...getTileStyles(theme, isActive, accent),
                    })}
                >
                    {/* Cover as full blurred background */}
                    {cover ? (
                        <Box
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                backgroundImage: `url(${cover})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                filter: 'blur(12px) brightness(0.4)',
                                transform: 'scale(1.15)',
                            }}
                        />
                    ) : null}

                    {/* Album thumbnail */}
                    <Box
                        sx={{
                            flexShrink: 0,
                            width: 48,
                            height: 48,
                            borderRadius: '8px',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            zIndex: 1,
                            boxShadow: cover ? '0 2px 8px rgba(0,0,0,0.3)' : undefined,
                        }}
                    >
                        {cover ? (
                            <img
                                src={cover}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <MusicNote
                                sx={theme => ({
                                    fontSize: 28,
                                    color: isActive
                                        ? accent || theme.palette.primary.main
                                        : theme.palette.text.disabled,
                                })}
                            />
                        )}
                    </Box>

                    {/* Text + progress */}
                    <Box
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.25,
                            position: 'relative',
                            zIndex: 1,
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography
                                ref={this.nameRef}
                                variant="body2"
                                noWrap
                                sx={theme => ({
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    color: cover ? '#fff' : undefined,
                                    textShadow: cover ? '0 1px 3px rgba(0,0,0,0.5)' : undefined,
                                    ...(isNeumorphicTheme(theme)
                                        ? {
                                              textTransform: 'uppercase' as const,
                                              letterSpacing: '0.08em',
                                              fontSize: '0.75rem',
                                          }
                                        : {}),
                                })}
                            >
                                {title || this.props.settings?.name || name || '...'}
                            </Typography>
                            {artist ? (
                                <Typography
                                    variant="caption"
                                    noWrap
                                    sx={{
                                        color: cover ? 'rgba(255,255,255,0.7)' : undefined,
                                        flexShrink: 1,
                                        minWidth: 0,
                                        textShadow: cover ? '0 1px 2px rgba(0,0,0,0.5)' : undefined,
                                    }}
                                >
                                    {'· '}
                                    {artist}
                                </Typography>
                            ) : null}
                            {indicators ? <Box sx={{ position: 'relative', zIndex: 1 }}>{indicators}</Box> : null}
                        </Box>
                        {duration ? this.renderProgressBar(accent || '#1db954', 4) : null}
                    </Box>
                    {this.renderChart()}
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    // ── WideTall 2x1: large cover + info + progress ──────────────────

    renderWideTall(): React.JSX.Element {
        const { name, playing, title, artist, cover, elapsed, duration } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const indicators = this.renderIndicators();

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={{ position: 'relative', gridColumn: 'span 2', containerType: 'inline-size', overflow: 'hidden', borderRadius: '16px' }}
            >
                {/* Sizer to match 1x1 height */}
                <Box sx={{ width: 'calc(50% - 6px)', aspectRatio: '1' }} />
                <Box
                    onClick={this.openDialog}
                    sx={theme => ({
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        ...getTileStyles(theme, isActive, accent),
                        padding: 0,
                    })}
                >
                    {/* Cover area (top ~60%) */}
                    <Box
                        sx={{
                            position: 'relative',
                            flex: '1 1 60%',
                            overflow: 'hidden',
                        }}
                    >
                        {cover ? (
                            <img
                                src={cover}
                                alt=""
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    display: 'block',
                                }}
                            />
                        ) : (
                            <Box
                                sx={theme => ({
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: alpha(theme.palette.text.primary, 0.05),
                                })}
                            >
                                <MusicNote
                                    sx={theme => ({
                                        fontSize: 64,
                                        color: isActive
                                            ? accent || theme.palette.primary.main
                                            : theme.palette.text.disabled,
                                    })}
                                />
                            </Box>
                        )}

                        {/* Play button overlay on cover */}
                        <Box
                            sx={{
                                position: 'absolute',
                                bottom: 8,
                                right: 12,
                                backgroundColor: 'rgba(0,0,0,0.55)',
                                borderRadius: '8px',
                                width: 36,
                                height: 36,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backdropFilter: 'blur(4px)',
                            }}
                        >
                            {playing ? (
                                <Pause sx={{ fontSize: 22, color: '#fff' }} />
                            ) : (
                                <PlayArrow sx={{ fontSize: 22, color: '#fff' }} />
                            )}
                        </Box>

                        {indicators ? (
                            <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>{indicators}</Box>
                        ) : null}
                    </Box>

                    {/* Info area (bottom) */}
                    <Box sx={{ p: 1.5, pt: 1 }}>
                        <Typography
                            ref={this.nameRef}
                            variant="body2"
                            noWrap
                            sx={theme => ({
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                ...(isNeumorphicTheme(theme)
                                    ? {
                                          textTransform: 'uppercase' as const,
                                          letterSpacing: '0.08em',
                                          fontSize: '0.8rem',
                                      }
                                    : {}),
                            })}
                        >
                            {title || this.props.settings?.name || name || '...'}
                        </Typography>
                        {artist ? (
                            <Typography
                                variant="caption"
                                noWrap
                                sx={theme => ({
                                    display: 'block',
                                    fontWeight: 500,
                                    color: isActive
                                        ? accent || theme.palette.primary.main
                                        : theme.palette.text.secondary,
                                })}
                            >
                                {artist}
                            </Typography>
                        ) : null}

                        {/* Progress bar with times */}
                        {duration ? (
                            <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography
                                    variant="caption"
                                    sx={theme => ({
                                        fontSize: '0.65rem',
                                        color: isActive
                                            ? accent || theme.palette.primary.main
                                            : theme.palette.text.secondary,
                                        lineHeight: 1,
                                    })}
                                >
                                    {WidgetMediaPlayer.formatTime(elapsed)}
                                </Typography>
                                <Box sx={{ flex: 1 }}>{this.renderProgressBar(accent || '#1db954', 4)}</Box>
                                <Typography
                                    variant="caption"
                                    sx={theme => ({
                                        fontSize: '0.65rem',
                                        color: theme.palette.text.secondary,
                                        lineHeight: 1,
                                    })}
                                >
                                    {WidgetMediaPlayer.formatTime(duration)}
                                </Typography>
                            </Box>
                        ) : null}
                    </Box>
                    {this.renderChart()}
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    // ── Spotify-style full dialog ────────────────────────────────────

    private renderPlayerDialog(): React.JSX.Element | null {
        if (!this.state.dialogOpen) {
            return null;
        }

        const { playing, title, artist, album, cover, volume, elapsed, duration } = this.state;
        const accent = this.getAccentColor() || '#1db954';

        return (
            <Dialog
                open
                onClose={this.closeDialog}
                fullWidth
                maxWidth="xs"
                slotProps={{
                    paper: {
                        sx: theme => ({
                            borderRadius: '24px',
                            background:
                                theme.palette.mode === 'dark'
                                    ? 'linear-gradient(180deg, #1a1a2e 0%, #0d0d14 100%)'
                                    : 'linear-gradient(180deg, #f5f5f5 0%, #e0e0e0 100%)',
                            overflow: 'hidden',
                            maxHeight: '90vh',
                        }),
                    },
                }}
            >
                <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', maxHeight: '85vh' }}>
                    {/* Header with close button */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                        <IconButton
                            onClick={this.closeDialog}
                            size="small"
                            sx={theme => ({ color: theme.palette.text.secondary })}
                        >
                            <KeyboardArrowDown fontSize="medium" />
                        </IconButton>
                        <Typography
                            variant="caption"
                            sx={theme => ({
                                textTransform: 'uppercase',
                                fontWeight: 700,
                                letterSpacing: '0.1em',
                                color: theme.palette.text.secondary,
                                fontSize: '0.65rem',
                            })}
                        >
                            {album || I18n.t('wm_Now playing')}
                        </Typography>
                        <Box sx={{ width: 34 }} />
                    </Box>

                    {/* Album cover — constrained in landscape */}
                    <Box
                        sx={{
                            width: '100%',
                            maxHeight: '40vh',
                            aspectRatio: '1',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                            flexShrink: 0,
                            alignSelf: 'center',
                        }}
                    >
                        {cover ? (
                            <img
                                src={cover}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                        ) : (
                            <Box
                                sx={theme => ({
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: alpha(theme.palette.text.primary, 0.08),
                                })}
                            >
                                <MusicNote sx={theme => ({ fontSize: 80, color: theme.palette.text.disabled })} />
                            </Box>
                        )}
                    </Box>

                    {/* Title & Artist */}
                    <Box>
                        <Typography
                            variant="h6"
                            noWrap
                            sx={{ fontWeight: 700, lineHeight: 1.3 }}
                        >
                            {title || this.props.settings?.name || this.state.name || '...'}
                        </Typography>
                        <Typography
                            variant="body2"
                            noWrap
                            sx={theme => ({ color: theme.palette.text.secondary, fontWeight: 500 })}
                        >
                            {artist || '\u00A0'}
                        </Typography>
                    </Box>

                    {/* Seek slider */}
                    {duration ? (
                        <Box>
                            <Slider
                                value={elapsed}
                                min={0}
                                max={duration}
                                size="small"
                                onChange={(_e, val) => {
                                    if (this.elapsedId) {
                                        this.send(this.elapsedId, val as number);
                                    }
                                }}
                                sx={{
                                    color: accent,
                                    height: 4,
                                    p: '4px 0 !important',
                                    '& .MuiSlider-thumb': {
                                        width: 12,
                                        height: 12,
                                        '&:hover, &.Mui-focusVisible': {
                                            boxShadow: `0 0 0 6px ${alpha(accent, 0.2)}`,
                                        },
                                    },
                                    '& .MuiSlider-rail': {
                                        opacity: 0.2,
                                    },
                                }}
                            />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: -0.5 }}>
                                <Typography
                                    variant="caption"
                                    sx={theme => ({ color: theme.palette.text.secondary, fontSize: '0.7rem' })}
                                >
                                    {WidgetMediaPlayer.formatTime(elapsed)}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={theme => ({ color: theme.palette.text.secondary, fontSize: '0.7rem' })}
                                >
                                    {WidgetMediaPlayer.formatTime(duration)}
                                </Typography>
                            </Box>
                        </Box>
                    ) : null}

                    {/* Transport controls */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2,
                        }}
                    >
                        {this.prevId ? (
                            <IconButton
                                onClick={this.onPrev}
                                sx={theme => ({ color: theme.palette.text.primary })}
                            >
                                <SkipPrevious sx={{ fontSize: 32 }} />
                            </IconButton>
                        ) : (
                            <Box sx={{ width: 48 }} />
                        )}

                        {/* Large play/pause button */}
                        <IconButton
                            onClick={this.togglePlay}
                            sx={theme => ({
                                backgroundColor: theme.palette.mode === 'dark' ? '#fff' : '#000',
                                color: theme.palette.mode === 'dark' ? '#000' : '#fff',
                                width: 64,
                                height: 64,
                                '&:hover': {
                                    backgroundColor:
                                        theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)',
                                    transform: 'scale(1.05)',
                                },
                                transition: 'transform 0.15s ease',
                            })}
                        >
                            {playing ? <Pause sx={{ fontSize: 36 }} /> : <PlayArrow sx={{ fontSize: 36 }} />}
                        </IconButton>

                        {this.nextId ? (
                            <IconButton
                                onClick={this.onNext}
                                sx={theme => ({ color: theme.palette.text.primary })}
                            >
                                <SkipNext sx={{ fontSize: 32 }} />
                            </IconButton>
                        ) : (
                            <Box sx={{ width: 48 }} />
                        )}
                    </Box>

                    {/* Stop button (if available) */}
                    {this.stopId ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <IconButton
                                onClick={this.onStop}
                                size="small"
                                sx={theme => ({ color: theme.palette.text.secondary })}
                            >
                                <Stop fontSize="small" />
                            </IconButton>
                        </Box>
                    ) : null}

                    {/* Volume control */}
                    {this.volumeId ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1 }}>
                            <IconButton
                                size="small"
                                onClick={() => this.send(this.volumeId, volume > 0 ? 0 : 50)}
                                sx={theme => ({ color: theme.palette.text.secondary, p: 0.5 })}
                            >
                                {volume === 0 ? (
                                    <VolumeOff sx={{ fontSize: 20 }} />
                                ) : (
                                    <VolumeDown sx={{ fontSize: 20 }} />
                                )}
                            </IconButton>
                            <Slider
                                value={volume}
                                min={0}
                                max={100}
                                size="small"
                                onChange={(_e, val) => this.send(this.volumeId, val as number)}
                                sx={{
                                    color: accent,
                                    '& .MuiSlider-thumb': {
                                        width: 12,
                                        height: 12,
                                    },
                                    '& .MuiSlider-rail': {
                                        opacity: 0.2,
                                    },
                                }}
                            />
                            <VolumeUp sx={theme => ({ fontSize: 20, color: theme.palette.text.secondary })} />
                        </Box>
                    ) : null}
                </Box>
            </Dialog>
        );
    }

    // ── Main render ──────────────────────────────────────────────────

    render(): React.JSX.Element {
        const size = this.props.settings?.size || this.props.size || '1x1';
        let widget: React.JSX.Element;
        if (size === '2x0.5') {
            widget = this.renderWide();
        } else if (size === '2x1') {
            widget = this.renderWideTall();
        } else {
            widget = this.renderCompact();
        }

        const playerDialog = this.renderPlayerDialog();
        const chartDialog = this.renderChartDialog();

        return (
            <>
                {widget}
                {playerDialog}
                {chartDialog}
            </>
        );
    }
}

export default WidgetMediaPlayer;
