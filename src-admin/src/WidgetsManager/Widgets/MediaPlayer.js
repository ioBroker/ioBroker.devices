import React from 'react';
import { Box, Dialog, IconButton, Slider, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { PlayArrow, Pause, SkipPrevious, SkipNext, Stop, MusicNote, VolumeDown, VolumeUp, VolumeOff, KeyboardArrowDown, } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';
import WidgetGeneric, { isNeumorphicTheme } from './Generic';
export class WidgetMediaPlayer extends WidgetGeneric {
    stateId;
    playId;
    pauseId;
    stopId;
    nextId;
    prevId;
    titleId;
    artistId;
    albumId;
    coverId;
    volumeId;
    durationId;
    elapsedId;
    handlers = [];
    constructor(props) {
        super(props);
        const states = props.widget.control.states;
        const find = (name) => states.find(s => s.name === name)?.id ?? null;
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
    componentDidMount() {
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
    componentWillUnmount() {
        super.componentWillUnmount();
        for (const { id, handler } of this.handlers) {
            this.props.stateContext.removeState(id, handler);
        }
    }
    sub(id, handler) {
        if (id) {
            this.handlers.push({ id, handler });
            this.props.stateContext.getState(id, handler);
        }
    }
    send(id, value) {
        if (id) {
            void this.props.stateContext.getSocket().setState(id, value);
        }
    }
    // ── State handlers ──────────────────────────────────────────────
    onPlayState = (_id, state) => {
        const val = state.val;
        const playing = typeof val === 'boolean' ? val : Number(val) === 1;
        if (playing !== this.state.playing) {
            this.setState({ playing });
        }
    };
    onTitle = (_id, state) => {
        const title = String(state.val || '');
        if (title !== this.state.title) {
            this.setState({ title });
        }
    };
    onArtist = (_id, state) => {
        const artist = String(state.val || '');
        if (artist !== this.state.artist) {
            this.setState({ artist });
        }
    };
    onAlbum = (_id, state) => {
        const album = String(state.val || '');
        if (album !== this.state.album) {
            this.setState({ album });
        }
    };
    onCover = (_id, state) => {
        const cover = String(state.val || '');
        if (cover !== this.state.cover) {
            this.setState({ cover });
        }
    };
    onVolume = (_id, state) => {
        const volume = Math.round(Number(state.val) || 0);
        if (volume !== this.state.volume) {
            this.setState({ volume });
        }
    };
    onDuration = (_id, state) => {
        const duration = Number(state.val) || 0;
        if (duration !== this.state.duration) {
            this.setState({ duration });
        }
    };
    onElapsed = (_id, state) => {
        const elapsed = Number(state.val) || 0;
        if (elapsed !== this.state.elapsed) {
            this.setState({ elapsed });
        }
    };
    // ── Actions ─────────────────────────────────────────────────────
    togglePlay = () => {
        if (this.state.playing) {
            this.send(this.pauseId || this.stateId, this.pauseId ? true : false);
        }
        else {
            this.send(this.playId || this.stateId, true);
        }
    };
    onPrev = () => this.send(this.prevId, true);
    onNext = () => this.send(this.nextId, true);
    onStop = () => this.send(this.stopId || this.stateId, this.stopId ? true : false);
    openDialog = () => this.setState({ dialogOpen: true });
    closeDialog = () => this.setState({ dialogOpen: false });
    // ── Helpers ──────────────────────────────────────────────────────
    static formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
    // ── Progress bar (thin, non-interactive) ─────────────────────────
    renderProgressBar(accentColor, height = 3) {
        const { elapsed, duration } = this.state;
        if (!duration) {
            return null;
        }
        const pct = Math.min(100, (elapsed / duration) * 100);
        return (React.createElement(Box, { sx: theme => ({
                width: '100%',
                height,
                borderRadius: height / 2,
                backgroundColor: alpha(theme.palette.common.white, 0.15),
                overflow: 'hidden',
                flexShrink: 0,
            }) },
            React.createElement(Box, { sx: {
                    width: `${pct}%`,
                    height: '100%',
                    borderRadius: 'inherit',
                    backgroundColor: accentColor || '#1db954',
                    transition: 'width 0.5s linear',
                } })));
    }
    // ── Overrides ───────────────────────────────────────────────────
    isTileActive() {
        return this.state.playing;
    }
    // eslint-disable-next-line class-methods-use-this
    hasTileAction() {
        return true;
    }
    onTileClick() {
        this.openDialog();
    }
    renderTileIcon() {
        const baseIcon = this.renderBaseIcon();
        if (baseIcon) {
            return baseIcon;
        }
        const { playing, cover } = this.state;
        const accent = this.getAccentColor();
        if (cover) {
            return (React.createElement(Box, { sx: {
                    width: 28,
                    height: 28,
                    borderRadius: '4px',
                    overflow: 'hidden',
                    flexShrink: 0,
                } },
                React.createElement("img", { src: cover, alt: "", style: { width: '100%', height: '100%', objectFit: 'cover' } })));
        }
        const iconSx = (theme) => ({
            color: playing ? accent || theme.palette.primary.main : theme.palette.text.disabled,
            transition: 'color 0.25s ease',
        });
        return playing ? React.createElement(PlayArrow, { sx: iconSx }) : React.createElement(MusicNote, { sx: iconSx });
    }
    renderTileStatus() {
        const { playing, title, artist } = this.state;
        const accent = this.getAccentColor();
        const text = playing ? title || artist || I18n.t('wm_Playing') : I18n.t('wm_Off');
        return (React.createElement(Typography, { variant: "caption", noWrap: true, sx: theme => ({
                fontWeight: 500,
                maxWidth: '100%',
                color: playing ? accent || theme.palette.primary.main : theme.palette.text.secondary,
                transition: 'color 0.25s ease',
            }) }, text));
    }
    // No action buttons on tile — controls are in the dialog
    // eslint-disable-next-line class-methods-use-this
    renderTileAction() {
        return React.createElement(Box, null);
    }
    // ── Compact 1x1: cover fills entire background ───────────────────
    renderCompact() {
        const { name, playing, title, artist, cover, elapsed, duration } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        return (React.createElement(Box, { id: String(this.props.widget.id), className: this.getWidgetClass(), sx: theme => WidgetGeneric.getStyleCompact(theme) },
            React.createElement(Box, { onClick: this.openDialog, sx: theme => ({
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
                    ...this.applyTileStyles(theme, isActive),
                    padding: 0,
                }) },
                cover ? (React.createElement(Box, { sx: {
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${cover})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    } })) : (React.createElement(Box, { sx: {
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    } },
                    React.createElement(MusicNote, { sx: theme => ({
                            fontSize: 'max(3rem, 30cqi)',
                            color: isActive
                                ? accent || theme.palette.primary.main
                                : theme.palette.text.disabled,
                        }) }))),
                React.createElement(Box, { sx: {
                        position: 'absolute',
                        inset: 0,
                        background: cover
                            ? 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)'
                            : 'none',
                        pointerEvents: 'none',
                    } }),
                indicators,
                cover ? (React.createElement(Box, { sx: {
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
                    } }, playing ? (React.createElement(Pause, { sx: { fontSize: 18, color: '#fff' } })) : (React.createElement(PlayArrow, { sx: { fontSize: 18, color: '#fff' } })))) : null,
                React.createElement(Box, { sx: {
                        position: 'relative',
                        zIndex: 1,
                        p: 'max(8px, 6cqi)',
                        pt: 0,
                    } },
                    React.createElement(Typography, { ref: this.nameRef, variant: "body2", noWrap: true, sx: {
                            fontWeight: 700,
                            lineHeight: 1.3,
                            color: cover ? '#fff' : undefined,
                            fontSize: 'max(0.75rem, 7.5cqi)',
                            textShadow: cover ? '0 1px 3px rgba(0,0,0,0.5)' : undefined,
                        } }, title || this.props.settings?.name || name || '...'),
                    artist ? (React.createElement(Typography, { variant: "caption", noWrap: true, sx: {
                            display: 'block',
                            fontWeight: 500,
                            color: cover ? 'rgba(255,255,255,0.7)' : undefined,
                            fontSize: 'max(0.6rem, 6cqi)',
                            textShadow: cover ? '0 1px 2px rgba(0,0,0,0.5)' : undefined,
                        } }, artist)) : null,
                    duration ? (React.createElement(Box, { sx: { mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 } },
                        React.createElement(Typography, { variant: "caption", sx: {
                                fontSize: 'max(0.5rem, 5cqi)',
                                color: cover ? 'rgba(255,255,255,0.6)' : undefined,
                                lineHeight: 1,
                            } }, WidgetMediaPlayer.formatTime(elapsed)),
                        React.createElement(Box, { sx: { flex: 1 } }, this.renderProgressBar(accent || '#1db954', 3)),
                        React.createElement(Typography, { variant: "caption", sx: {
                                fontSize: 'max(0.5rem, 5cqi)',
                                color: cover ? 'rgba(255,255,255,0.6)' : undefined,
                                lineHeight: 1,
                            } }, WidgetMediaPlayer.formatTime(duration)))) : null),
                this.renderChart())));
    }
    // ── Wide 2x0.5: cover background + thumbnail + text + progress ──
    renderWide() {
        const { name, title, artist, cover, duration } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        return (React.createElement(Box, { id: String(this.props.widget.id), className: this.getWidgetClass(), sx: theme => WidgetGeneric.getStyleWide(theme) },
            React.createElement(Box, { onClick: this.openDialog, sx: theme => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    width: '100%',
                    height: 80,
                    position: 'relative',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    ...this.applyTileStyles(theme, isActive),
                }) },
                cover ? (React.createElement(Box, { sx: {
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${cover})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'blur(12px) brightness(0.4)',
                        transform: 'scale(1.15)',
                    } })) : null,
                React.createElement(Box, { sx: {
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
                    } }, cover ? (React.createElement("img", { src: cover, alt: "", style: { width: '100%', height: '100%', objectFit: 'cover' } })) : (React.createElement(MusicNote, { sx: theme => ({
                        fontSize: 28,
                        color: isActive
                            ? accent || theme.palette.primary.main
                            : theme.palette.text.disabled,
                    }) }))),
                React.createElement(Box, { sx: {
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.25,
                        position: 'relative',
                        zIndex: 1,
                    } },
                    React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
                        React.createElement(Typography, { ref: this.nameRef, variant: "body2", noWrap: true, sx: theme => ({
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                color: cover ? '#fff' : undefined,
                                textShadow: cover ? '0 1px 3px rgba(0,0,0,0.5)' : undefined,
                                ...(isNeumorphicTheme(theme)
                                    ? {
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.08em',
                                        fontSize: '0.75rem',
                                    }
                                    : {}),
                            }) }, title || this.props.settings?.name || name || '...'),
                        artist ? (React.createElement(Typography, { variant: "caption", noWrap: true, sx: {
                                color: cover ? 'rgba(255,255,255,0.7)' : undefined,
                                flexShrink: 1,
                                minWidth: 0,
                                textShadow: cover ? '0 1px 2px rgba(0,0,0,0.5)' : undefined,
                            } },
                            '· ',
                            artist)) : null,
                        indicators),
                    duration ? this.renderProgressBar(accent || '#1db954', 4) : null),
                this.renderChart())));
    }
    // ── WideTall 2x1: large cover + info + progress ──────────────────
    renderWideTall() {
        const { name, playing, title, artist, cover, elapsed, duration } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        return (React.createElement(Box, { id: String(this.props.widget.id), className: this.getWidgetClass(), sx: theme => WidgetGeneric.getStyleWideTall(theme) },
            React.createElement(Box, { sx: { width: 'calc(50% - 6px)', aspectRatio: '1' } }),
            React.createElement(Box, { onClick: this.openDialog, sx: theme => ({
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    ...this.applyTileStyles(theme, isActive),
                    padding: 0,
                }) },
                React.createElement(Box, { sx: {
                        position: 'relative',
                        flex: '1 1 60%',
                        overflow: 'hidden',
                    } },
                    cover ? (React.createElement("img", { src: cover, alt: "", style: {
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                        } })) : (React.createElement(Box, { sx: theme => ({
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: alpha(theme.palette.text.primary, 0.05),
                        }) },
                        React.createElement(MusicNote, { sx: theme => ({
                                fontSize: 64,
                                color: isActive
                                    ? accent || theme.palette.primary.main
                                    : theme.palette.text.disabled,
                            }) }))),
                    React.createElement(Box, { sx: {
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
                        } }, playing ? (React.createElement(Pause, { sx: { fontSize: 22, color: '#fff' } })) : (React.createElement(PlayArrow, { sx: { fontSize: 22, color: '#fff' } }))),
                    indicators),
                React.createElement(Box, { sx: { p: 1.5, pt: 1 } },
                    React.createElement(Typography, { ref: this.nameRef, variant: "body2", noWrap: true, sx: theme => ({
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            ...(isNeumorphicTheme(theme)
                                ? {
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    fontSize: '0.8rem',
                                }
                                : {}),
                        }) }, title || this.props.settings?.name || name || '...'),
                    artist ? (React.createElement(Typography, { variant: "caption", noWrap: true, sx: theme => ({
                            display: 'block',
                            fontWeight: 500,
                            color: isActive
                                ? accent || theme.palette.primary.main
                                : theme.palette.text.secondary,
                        }) }, artist)) : null,
                    duration ? (React.createElement(Box, { sx: { mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 } },
                        React.createElement(Typography, { variant: "caption", sx: theme => ({
                                fontSize: '0.65rem',
                                color: isActive
                                    ? accent || theme.palette.primary.main
                                    : theme.palette.text.secondary,
                                lineHeight: 1,
                            }) }, WidgetMediaPlayer.formatTime(elapsed)),
                        React.createElement(Box, { sx: { flex: 1 } }, this.renderProgressBar(accent || '#1db954', 4)),
                        React.createElement(Typography, { variant: "caption", sx: theme => ({
                                fontSize: '0.65rem',
                                color: theme.palette.text.secondary,
                                lineHeight: 1,
                            }) }, WidgetMediaPlayer.formatTime(duration)))) : null),
                this.renderChart())));
    }
    // ── Spotify-style full dialog ────────────────────────────────────
    renderPlayerDialog() {
        if (!this.state.dialogOpen) {
            return null;
        }
        const { playing, title, artist, album, cover, volume, elapsed, duration } = this.state;
        const accent = this.getAccentColor() || '#1db954';
        return (React.createElement(Dialog, { open: true, onClose: this.closeDialog, fullWidth: true, maxWidth: "xs", slotProps: {
                paper: {
                    sx: theme => ({
                        borderRadius: '24px',
                        background: theme.palette.mode === 'dark'
                            ? 'linear-gradient(180deg, #1a1a2e 0%, #0d0d14 100%)'
                            : 'linear-gradient(180deg, #f5f5f5 0%, #e0e0e0 100%)',
                        overflow: 'hidden',
                        maxHeight: '90vh',
                    }),
                },
            } },
            React.createElement(Box, { sx: {
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    overflowY: 'auto',
                    maxHeight: '85vh',
                } },
                React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 } },
                    React.createElement(IconButton, { onClick: this.closeDialog, size: "small", sx: theme => ({ color: theme.palette.text.secondary }) },
                        React.createElement(KeyboardArrowDown, { fontSize: "medium" })),
                    React.createElement(Typography, { variant: "caption", sx: theme => ({
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            color: theme.palette.text.secondary,
                            fontSize: '0.65rem',
                        }) }, album || I18n.t('wm_Now playing')),
                    React.createElement(Box, { sx: { width: 34 } })),
                React.createElement(Box, { sx: {
                        width: '100%',
                        maxHeight: '40vh',
                        aspectRatio: '1',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        flexShrink: 0,
                        alignSelf: 'center',
                    } }, cover ? (React.createElement("img", { src: cover, alt: "", style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } })) : (React.createElement(Box, { sx: theme => ({
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: alpha(theme.palette.text.primary, 0.08),
                    }) },
                    React.createElement(MusicNote, { sx: theme => ({ fontSize: 80, color: theme.palette.text.disabled }) })))),
                React.createElement(Box, null,
                    React.createElement(Typography, { variant: "h6", noWrap: true, sx: { fontWeight: 700, lineHeight: 1.3 } }, title || this.props.settings?.name || this.state.name || '...'),
                    React.createElement(Typography, { variant: "body2", noWrap: true, sx: theme => ({ color: theme.palette.text.secondary, fontWeight: 500 }) }, artist || '\u00A0')),
                duration ? (React.createElement(Box, null,
                    React.createElement(Slider, { value: elapsed, min: 0, max: duration, size: "small", onChange: (_e, val) => {
                            if (this.elapsedId) {
                                this.send(this.elapsedId, val);
                            }
                        }, sx: {
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
                        } }),
                    React.createElement(Box, { sx: { display: 'flex', justifyContent: 'space-between', mt: -0.5 } },
                        React.createElement(Typography, { variant: "caption", sx: theme => ({ color: theme.palette.text.secondary, fontSize: '0.7rem' }) }, WidgetMediaPlayer.formatTime(elapsed)),
                        React.createElement(Typography, { variant: "caption", sx: theme => ({ color: theme.palette.text.secondary, fontSize: '0.7rem' }) }, WidgetMediaPlayer.formatTime(duration))))) : null,
                React.createElement(Box, { sx: {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                    } },
                    this.prevId ? (React.createElement(IconButton, { onClick: this.onPrev, sx: theme => ({ color: theme.palette.text.primary }) },
                        React.createElement(SkipPrevious, { sx: { fontSize: 32 } }))) : (React.createElement(Box, { sx: { width: 48 } })),
                    React.createElement(IconButton, { onClick: this.togglePlay, sx: theme => ({
                            backgroundColor: theme.palette.mode === 'dark' ? '#fff' : '#000',
                            color: theme.palette.mode === 'dark' ? '#000' : '#fff',
                            width: 64,
                            height: 64,
                            '&:hover': {
                                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)',
                                transform: 'scale(1.05)',
                            },
                            transition: 'transform 0.15s ease',
                        }) }, playing ? React.createElement(Pause, { sx: { fontSize: 36 } }) : React.createElement(PlayArrow, { sx: { fontSize: 36 } })),
                    this.nextId ? (React.createElement(IconButton, { onClick: this.onNext, sx: theme => ({ color: theme.palette.text.primary }) },
                        React.createElement(SkipNext, { sx: { fontSize: 32 } }))) : (React.createElement(Box, { sx: { width: 48 } }))),
                this.stopId ? (React.createElement(Box, { sx: { display: 'flex', justifyContent: 'center' } },
                    React.createElement(IconButton, { onClick: this.onStop, size: "small", sx: theme => ({ color: theme.palette.text.secondary }) },
                        React.createElement(Stop, { fontSize: "small" })))) : null,
                this.volumeId ? (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1.5, px: 1 } },
                    React.createElement(IconButton, { size: "small", onClick: () => this.send(this.volumeId, volume > 0 ? 0 : 50), sx: theme => ({ color: theme.palette.text.secondary, p: 0.5 }) }, volume === 0 ? (React.createElement(VolumeOff, { sx: { fontSize: 20 } })) : (React.createElement(VolumeDown, { sx: { fontSize: 20 } }))),
                    React.createElement(Slider, { value: volume, min: 0, max: 100, size: "small", onChange: (_e, val) => this.send(this.volumeId, val), sx: {
                            color: accent,
                            '& .MuiSlider-thumb': {
                                width: 12,
                                height: 12,
                            },
                            '& .MuiSlider-rail': {
                                opacity: 0.2,
                            },
                        } }),
                    React.createElement(VolumeUp, { sx: theme => ({ fontSize: 20, color: theme.palette.text.secondary }) }))) : null)));
    }
    // ── Main render ──────────────────────────────────────────────────
    render() {
        const size = this.props.settings?.size || '1x1';
        let widget;
        if (size === '2x0.5') {
            widget = this.renderWide();
        }
        else if (size === '2x1') {
            widget = this.renderWideTall();
        }
        else {
            widget = this.renderCompact();
        }
        const playerDialog = this.renderPlayerDialog();
        const chartDialog = this.renderChartDialog();
        return (React.createElement(React.Fragment, null,
            widget,
            playerDialog,
            chartDialog));
    }
}
export default WidgetMediaPlayer;
//# sourceMappingURL=MediaPlayer.js.map