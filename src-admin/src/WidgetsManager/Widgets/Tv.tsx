import React from 'react';
import { Box, ButtonBase, Dialog, IconButton, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import {
    Add,
    ArrowBack,
    Dialpad,
    ExitToApp,
    FastForward,
    FastRewind,
    Home,
    Info,
    KeyboardArrowDown,
    KeyboardArrowLeft,
    KeyboardArrowRight,
    KeyboardArrowUp,
    ListAlt,
    Menu,
    Palette,
    Pause,
    PlayArrow,
    PowerSettingsNew,
    Remove,
    SkipNext,
    SkipPrevious,
    Stop,
    Tv,
    VolumeOff,
    VolumeUp,
    YouTube,
} from '@mui/icons-material';
import { I18n } from '@iobroker/gui-components';
import { TV_APPS, TV_INPUTS, TV_KEYS } from '@iobroker/type-detector';

import WidgetGeneric, { isNeumorphicTheme, type WidgetGenericProps, type WidgetGenericState } from './Generic';
import TouchSafeSlider from './TouchSafeSlider';
import { parseCommonStates } from './commonStates';

interface WidgetTvState extends WidgetGenericState {
    power: boolean;
    artMode: boolean;
    muted: boolean;
    volume: number | null;
    volumeMin: number;
    volumeMax: number;
    input: string;
    app: string;
    /** Keys of `KEY` the TV supports */
    keys: string[];
    /** App key → label */
    apps: Record<string, string>;
    /** Input key → label */
    inputs: Record<string, string>;
    dialogOpen: boolean;
    showNumbers: boolean;
}

type StateChangeHandler = (id: string, state: ioBroker.State) => void;

/** Brand-like colors of the app buttons */
const APP_COLORS: Record<string, string> = {
    YOUTUBE: '#ff0000',
    YOUTUBE_MUSIC: '#ff0000',
    NETFLIX: '#e50914',
    DISNEY_PLUS: '#113ccf',
    PRIME_VIDEO: '#00a8e1',
    APPLE_TV: '#000000',
    MAX: '#002be7',
    PARAMOUNT_PLUS: '#0064ff',
    DAZN: '#0c161c',
    WOW: '#2b2b2b',
    JOYN: '#e6007e',
    RTL_PLUS: '#000000',
    MAGENTA_TV: '#e20074',
    ARD_MEDIATHEK: '#003480',
    ZDF_MEDIATHEK: '#fa7d19',
    SPOTIFY: '#1db954',
    TWITCH: '#9146ff',
    PLEX: '#e5a00d',
    BROWSER: '#5f6368',
};

const COLOR_KEYS: Record<string, string> = {
    RED: '#e53935',
    GREEN: '#43a047',
    YELLOW: '#fdd835',
    BLUE: '#1e88e5',
};

const NUMBER_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', ''];

const POWER = { color: '#c62828', hover: '#e53935' };
const ART = { color: '#8e6c3a', hover: '#a5824c' };

const REMOTE = {
    dark: {
        body: 'linear-gradient(180deg, #2b2f36 0%, #1c1f24 100%)',
        key: '#3a3f47',
        keyHover: '#4a505a',
        keyActive: '#5b626e',
        text: '#e8eaed',
        textDim: '#9aa0a6',
        ring: '#30343b',
        ok: '#454b54',
        shadow: '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
    },
    light: {
        body: 'linear-gradient(180deg, #f7f7f8 0%, #e3e5e8 100%)',
        key: '#ffffff',
        keyHover: '#f1f3f4',
        keyActive: '#e2e5e8',
        text: '#202124',
        textDim: '#5f6368',
        ring: '#d7dade',
        ok: '#eef0f2',
        shadow: '0 1px 3px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.8)',
    },
};

type RemoteColors = (typeof REMOTE)['dark'];

function remoteColors(theme: Theme): RemoteColors {
    return REMOTE[theme.palette.mode];
}

function stopEvent(e: React.SyntheticEvent): void {
    e.stopPropagation();
}

export class WidgetTv extends WidgetGeneric<WidgetTvState> {
    private readonly powerId: string | null;
    private readonly keyId: string | null;
    private readonly volumeId: string | null;
    private readonly volumeActualId: string | null;
    private readonly muteId: string | null;
    private readonly volumeUpId: string | null;
    private readonly volumeDownId: string | null;
    private readonly inputId: string | null;
    private readonly appId: string | null;
    private readonly artModeId: string | null;
    private readonly playId: string | null;
    private readonly pauseId: string | null;
    private readonly stopId: string | null;
    private readonly nextId: string | null;
    private readonly prevId: string | null;

    private readonly handlers: { id: string; handler: StateChangeHandler }[] = [];

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;
        const find = (name: string): string | null => states.find(s => s.name === name)?.id || null;

        this.powerId = find('POWER');
        this.keyId = find('KEY');
        this.volumeId = find('VOLUME');
        this.volumeActualId = find('VOLUME_ACTUAL') ?? this.volumeId;
        this.muteId = find('MUTE');
        this.volumeUpId = find('VOLUME_UP');
        this.volumeDownId = find('VOLUME_DOWN');
        this.inputId = find('INPUT');
        this.appId = find('APP');
        this.artModeId = find('ART_MODE');
        this.playId = find('PLAY');
        this.pauseId = find('PAUSE');
        this.stopId = find('STOP');
        this.nextId = find('NEXT');
        this.prevId = find('PREV');

        this.state = {
            ...this.state,
            power: false,
            artMode: false,
            muted: false,
            volume: null,
            volumeMin: 0,
            volumeMax: 100,
            input: '',
            app: '',
            keys: [],
            apps: {},
            inputs: {},
            dialogOpen: false,
            showNumbers: false,
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.sub(this.powerId, (_id, state) => this.update('power', !!state.val));
        this.sub(this.artModeId, (_id, state) => this.update('artMode', !!state.val));
        this.sub(this.muteId, (_id, state) => this.update('muted', !!state.val));
        this.sub(this.volumeActualId, (_id, state) =>
            this.update('volume', state.val == null ? null : Math.round(Number(state.val) || 0)),
        );
        this.sub(this.inputId, (_id, state) => this.update('input', String(state.val ?? '')));
        this.sub(this.appId, (_id, state) => this.update('app', String(state.val ?? '')));
        void this.loadObjects();
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

    private update<K extends 'power' | 'artMode' | 'muted' | 'volume' | 'input' | 'app'>(
        key: K,
        value: WidgetTvState[K],
    ): void {
        if (this.state[key] !== value) {
            this.setState({ [key]: value } as Pick<WidgetTvState, K>);
        }
    }

    private send(id: string | null, value: ioBroker.StateValue): void {
        if (id) {
            void this.setValue(id, value);
        }
    }

    private async getObject(id: string | null): Promise<ioBroker.StateObject | null> {
        if (!id) {
            return null;
        }
        try {
            return ((await this.props.stateContext.getSocket().getObject(id)) as ioBroker.StateObject) || null;
        } catch {
            return null;
        }
    }

    /** Supported keys, apps and inputs come from `common.states` of their states */
    private async loadObjects(): Promise<void> {
        const [keyObj, appObj, inputObj, volumeObj] = await Promise.all([
            this.getObject(this.keyId),
            this.getObject(this.appId),
            this.getObject(this.inputId),
            this.getObject(this.volumeId),
        ]);
        const pick = (
            obj: ioBroker.StateObject | null,
            known: Readonly<Record<string, string>>,
        ): Record<string, string> => {
            const result: Record<string, string> = {};
            for (const [key, label] of Object.entries(parseCommonStates(obj?.common?.states))) {
                if (known[key]) {
                    result[key] = label || known[key];
                }
            }
            return result;
        };
        const keys = Object.keys(pick(keyObj, TV_KEYS));
        this.setState({
            // without a list the device takes every key
            keys: keys.length ? keys : Object.keys(TV_KEYS),
            apps: pick(appObj, TV_APPS),
            inputs: pick(inputObj, TV_INPUTS),
            volumeMin: typeof volumeObj?.common?.min === 'number' ? volumeObj.common.min : 0,
            volumeMax: typeof volumeObj?.common?.max === 'number' ? volumeObj.common.max : 100,
        });
    }

    // ── Actions ─────────────────────────────────────────────────────

    private hasKey(key: string): boolean {
        return !!this.keyId && this.state.keys.includes(key);
    }

    private pressKey(key: string): void {
        this.send(this.keyId, key);
    }

    private togglePower = (): void => this.send(this.powerId, !this.state.power);

    private toggleArtMode = (): void => this.send(this.artModeId, !this.state.artMode);

    private toggleMute = (): void => this.send(this.muteId, !this.state.muted);

    private stepVolume(step: 1 | -1): void {
        const buttonId = step > 0 ? this.volumeUpId : this.volumeDownId;
        if (buttonId) {
            this.send(buttonId, true);
        } else if (this.volumeId) {
            const { volume, volumeMin, volumeMax } = this.state;
            this.send(this.volumeId, Math.min(volumeMax, Math.max(volumeMin, (volume ?? volumeMin) + step)));
        }
    }

    private openDialog = (): void => this.setState({ dialogOpen: true });
    private closeDialog = (): void => this.setState({ dialogOpen: false, showNumbers: false });

    /** App keys, YouTube first */
    private getAppKeys(): string[] {
        const keys = Object.keys(this.state.apps);
        return keys.includes('YOUTUBE') ? ['YOUTUBE', ...keys.filter(key => key !== 'YOUTUBE')] : keys;
    }

    private static keyTitle(key: string): string {
        return key.startsWith('NUMBER_') ? TV_KEYS[key] : I18n.t(`wm_${TV_KEYS[key]}`);
    }

    // ── Tile ────────────────────────────────────────────────────────

    private get isOff(): boolean {
        return !this.state.power;
    }

    private getStatusText(): string {
        if (this.state.indicators.unreach) {
            return I18n.t('wm_Unreachable');
        }
        if (this.isOff) {
            return I18n.t('wm_Off');
        }
        return this.state.artMode ? I18n.t('wm_Art mode') : I18n.t('wm_On');
    }

    protected isTileActive(): boolean {
        return this.state.power && !this.state.indicators.unreach;
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
        const active = this.isTileActive();
        const accent = this.getAccentColor();
        return (
            <Tv
                sx={theme => ({
                    color: active ? accent || theme.palette.primary.main : theme.palette.text.disabled,
                    transition: 'color 0.25s ease',
                })}
            />
        );
    }

    protected renderTileStatus(): React.JSX.Element {
        const active = this.isTileActive();
        const accent = this.getAccentColor();
        return (
            <Typography
                variant="caption"
                noWrap
                sx={theme => ({
                    display: 'block',
                    fontWeight: 500,
                    color: this.state.indicators.unreach
                        ? theme.palette.error.main
                        : active
                          ? accent || theme.palette.primary.main
                          : theme.palette.text.secondary,
                    transition: 'color 0.25s ease',
                })}
            >
                {this.getStatusText()}
            </Typography>
        );
    }

    protected renderTileAction(): React.JSX.Element {
        return this.renderQuickButtons(3);
    }

    private renderAppPill(key: string, onTile: boolean): React.JSX.Element {
        const label = this.state.apps[key] || TV_APPS[key];
        const youTube = key === 'YOUTUBE';
        const height = onTile ? 28 : 34;
        return (
            <ButtonBase
                key={key}
                title={label}
                aria-label={label}
                disabled={this.isReadOnly}
                onClick={() => this.send(this.appId, key)}
                sx={theme => ({
                    height,
                    minWidth: youTube && onTile ? 40 : height,
                    maxWidth: onTile ? 96 : undefined,
                    flexShrink: youTube ? 0 : 1,
                    gap: 0.5,
                    px: 1,
                    borderRadius: `${height / 2}px`,
                    backgroundColor: APP_COLORS[key] || remoteColors(theme).key,
                    color: APP_COLORS[key] ? '#ffffff' : remoteColors(theme).text,
                    fontSize: onTile ? 11 : 12,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: youTube ? 'inline-flex' : 'block',
                    textAlign: 'center',
                    lineHeight: `${height}px`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    outline: !onTile && this.state.app === key ? `2px solid ${remoteColors(theme).text}` : 'none',
                    outlineOffset: 2,
                    transition: 'filter 120ms, transform 80ms',
                    '&:hover': { filter: 'brightness(1.15)' },
                    '&:active': { transform: 'scale(0.96)' },
                    '&.Mui-disabled': { opacity: 0.45 },
                })}
            >
                {youTube ? <YouTube sx={{ fontSize: onTile ? 22 : 20, verticalAlign: 'middle' }} /> : null}
                {youTube && onTile ? null : label}
            </ButtonBase>
        );
    }

    /** Power and app buttons on the tile; their clicks do not open the dialog */
    private renderQuickButtons(maxApps: number): React.JSX.Element {
        const apps = this.isOff || !this.appId ? [] : this.getAppKeys().slice(0, maxApps);
        return (
            <Box
                onClick={stopEvent}
                onMouseDown={stopEvent}
                onTouchStart={stopEvent}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, overflow: 'hidden' }}
            >
                <ButtonBase
                    title={I18n.t('wm_Power')}
                    aria-label={I18n.t('wm_Power')}
                    disabled={this.isReadOnly || !this.powerId}
                    onClick={this.togglePower}
                    sx={theme => ({
                        width: 28,
                        height: 28,
                        flexShrink: 0,
                        borderRadius: '50%',
                        backgroundColor: this.state.power ? POWER.color : alpha(theme.palette.text.primary, 0.08),
                        color: this.state.power ? '#ffffff' : theme.palette.text.secondary,
                        '&:hover': {
                            backgroundColor: this.state.power ? POWER.hover : alpha(theme.palette.text.primary, 0.16),
                        },
                        '&.Mui-disabled': { opacity: 0.45 },
                    })}
                >
                    <PowerSettingsNew sx={{ fontSize: 18 }} />
                </ButtonBase>
                {apps.map(key => this.renderAppPill(key, true))}
            </Box>
        );
    }

    /** 1x1 and 2x1: icon at the top, name, status and quick buttons below */
    private renderTile(wide: boolean): React.JSX.Element {
        const isActive = this.isTileActive();
        const clickable = this.tileClickable();
        const indicators = this.renderIndicators(this.renderSettingsButton());
        // cqi refers to the whole tile, which is twice as wide in 2x1
        const k = wide ? 0.5 : 1;

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={theme => (wide ? WidgetGeneric.getStyleWideTall(theme) : WidgetGeneric.getStyleCompact(theme))}
            >
                <Box sx={{ width: wide ? 'calc(50% - 6px)' : '100%', aspectRatio: '1' }} />
                <ButtonBase
                    component="div"
                    disableRipple={!clickable}
                    onClick={clickable ? this.openDialog : undefined}
                    sx={theme => ({
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'stretch',
                        textAlign: 'left',
                        overflow: 'hidden',
                        cursor: clickable ? 'pointer' : 'default',
                        ...this.applyTileStyles(theme, isActive),
                        ...(!clickable && { '&:active': { transform: 'none' } }),
                        padding: isNeumorphicTheme(theme) ? `max(12px, ${8 * k}cqi)` : `max(16px, ${10 * k}cqi)`,
                    })}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            fontSize: `max(32px, ${22 * k}cqi)`,
                            '& .MuiSvgIcon-root': { fontSize: 'inherit !important' },
                            '& img': { width: '1em !important', height: '1em !important' },
                        }}
                    >
                        {this.renderTileIcon()}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            ref={this.nameRef}
                            variant="body2"
                            sx={theme => ({
                                fontWeight: 600,
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                fontSize: `max(0.875rem, ${9 * k}cqi)`,
                                ...(isNeumorphicTheme(theme)
                                    ? {
                                          textTransform: 'uppercase' as const,
                                          letterSpacing: '0.08em',
                                          fontSize: `max(0.7rem, ${7 * k}cqi)`,
                                      }
                                    : {}),
                            })}
                        >
                            {this.props.settings?.name || this.state.name || '...'}
                        </Typography>
                        {this.renderTileStatus()}
                        <Box sx={{ mt: 1 }}>{this.renderQuickButtons(wide ? 6 : 2)}</Box>
                    </Box>
                    {this.renderChart()}
                </ButtonBase>
                {indicators}
            </Box>
        );
    }

    renderCompact(): React.JSX.Element {
        return this.renderTile(false);
    }

    renderWideTall(): React.JSX.Element {
        return this.renderTile(true);
    }

    // ── Remote control dialog ───────────────────────────────────────

    private renderButton(
        id: string,
        content: React.ReactNode,
        title: string,
        onClick: () => void,
        sx: (c: RemoteColors) => Record<string, unknown> = () => ({}),
    ): React.JSX.Element {
        return (
            <ButtonBase
                key={id}
                title={title}
                aria-label={title}
                disabled={this.isReadOnly}
                onClick={onClick}
                sx={theme => {
                    const c = remoteColors(theme);
                    return {
                        width: 52,
                        height: 52,
                        flexShrink: 0,
                        borderRadius: '50%',
                        backgroundColor: c.key,
                        color: c.text,
                        boxShadow: c.shadow,
                        transition: 'background-color 120ms, transform 80ms',
                        '&:hover': { backgroundColor: c.keyHover },
                        '&:active': { backgroundColor: c.keyActive, transform: 'scale(0.95)' },
                        '&.Mui-disabled': { opacity: 0.45 },
                        ...sx(c),
                    };
                }}
            >
                {content}
            </ButtonBase>
        );
    }

    /** A key of `KEY`, or nothing if the TV does not support it */
    private renderKey(
        key: string,
        content: React.ReactNode,
        sx?: (c: RemoteColors) => Record<string, unknown>,
    ): React.JSX.Element | null {
        return this.hasKey(key)
            ? this.renderButton(key, content, WidgetTv.keyTitle(key), () => this.pressKey(key), sx)
            : null;
    }

    /** Media key of `KEY`, else the button state of the media pattern */
    private renderMediaKey(key: string, stateId: string | null, content: React.ReactNode): React.JSX.Element | null {
        const small = (): Record<string, unknown> => ({ width: 40, height: 40 });
        if (this.hasKey(key)) {
            return this.renderKey(key, content, small);
        }
        return stateId
            ? this.renderButton(key, content, WidgetTv.keyTitle(key), () => this.send(stateId, true), small)
            : null;
    }

    private static renderRocker(
        up: React.JSX.Element | null,
        down: React.JSX.Element | null,
        label: React.ReactNode,
    ): React.JSX.Element | null {
        if (!up && !down) {
            return null;
        }
        return (
            <Box
                sx={theme => ({
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    borderRadius: '26px',
                    backgroundColor: remoteColors(theme).key,
                    boxShadow: remoteColors(theme).shadow,
                })}
            >
                {up}
                <Typography
                    sx={theme => ({
                        fontSize: 11,
                        fontWeight: 'bold',
                        letterSpacing: 1,
                        color: remoteColors(theme).textDim,
                    })}
                >
                    {label}
                </Typography>
                {down}
            </Box>
        );
    }

    private renderDpad(): React.JSX.Element | null {
        if (!['UP', 'DOWN', 'LEFT', 'RIGHT', 'SELECT'].some(key => this.hasKey(key))) {
            return null;
        }
        const arrow = (position: Record<string, number>) => (): Record<string, unknown> => ({
            position: 'absolute',
            backgroundColor: 'transparent',
            boxShadow: 'none',
            ...position,
        });
        return (
            <Box
                sx={theme => ({
                    position: 'relative',
                    width: 190,
                    height: 190,
                    flexShrink: 0,
                    borderRadius: '50%',
                    backgroundColor: remoteColors(theme).ring,
                    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.35)',
                })}
            >
                {this.renderKey('UP', <KeyboardArrowUp fontSize="large" />, arrow({ top: 4, left: 69 }))}
                {this.renderKey('DOWN', <KeyboardArrowDown fontSize="large" />, arrow({ bottom: 4, left: 69 }))}
                {this.renderKey('LEFT', <KeyboardArrowLeft fontSize="large" />, arrow({ left: 4, top: 69 }))}
                {this.renderKey('RIGHT', <KeyboardArrowRight fontSize="large" />, arrow({ right: 4, top: 69 }))}
                {this.hasKey('SELECT')
                    ? this.renderButton(
                          'SELECT',
                          <span style={{ fontWeight: 'bold', fontSize: 16 }}>OK</span>,
                          I18n.t('wm_OK'),
                          () => this.pressKey('SELECT'),
                          c => ({
                              position: 'absolute',
                              top: 55,
                              left: 55,
                              width: 80,
                              height: 80,
                              backgroundColor: c.ok,
                          }),
                      )
                    : null}
            </Box>
        );
    }

    private renderInputs(): React.JSX.Element | null {
        const keys = Object.keys(this.state.inputs);
        if (!this.inputId || !keys.length) {
            return null;
        }
        return (
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${Math.min(keys.length, 3)}, 1fr)`,
                    gap: 1,
                    width: '100%',
                }}
            >
                {keys.map(key => {
                    const label = this.state.inputs[key];
                    const active = this.state.input === key;
                    return (
                        <ButtonBase
                            key={key}
                            title={label}
                            disabled={this.isReadOnly}
                            onClick={() => this.send(this.inputId, key)}
                            sx={theme => {
                                const c = remoteColors(theme);
                                return {
                                    height: 34,
                                    px: 1,
                                    borderRadius: '17px',
                                    border: `1px solid ${active ? theme.palette.primary.main : c.textDim}`,
                                    backgroundColor: active ? theme.palette.primary.main : 'transparent',
                                    color: active ? theme.palette.primary.contrastText : c.text,
                                    fontSize: 12,
                                    fontWeight: 'bold',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: 'block',
                                    lineHeight: '32px',
                                    '&:hover': { backgroundColor: active ? theme.palette.primary.dark : c.keyHover },
                                    '&.Mui-disabled': { opacity: 0.45 },
                                };
                            }}
                        >
                            {label}
                        </ButtonBase>
                    );
                })}
            </Box>
        );
    }

    private renderColorKeys(): React.JSX.Element | null {
        const keys = Object.keys(COLOR_KEYS).filter(key => this.hasKey(key));
        if (!keys.length) {
            return null;
        }
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, width: '100%' }}>
                {keys.map(key =>
                    this.renderButton(
                        key,
                        null,
                        WidgetTv.keyTitle(key),
                        () => this.pressKey(key),
                        () => ({ width: 44, height: 16, borderRadius: '8px', backgroundColor: COLOR_KEYS[key] }),
                    ),
                )}
            </Box>
        );
    }

    private renderNumbers(): React.JSX.Element | null {
        if (!NUMBER_KEYS.some(n => n && this.hasKey(`NUMBER_${n}`))) {
            return null;
        }
        const { showNumbers } = this.state;
        return (
            <>
                {this.renderButton(
                    'numbers',
                    <Dialpad />,
                    I18n.t('wm_Number keys'),
                    () => this.setState({ showNumbers: !showNumbers }),
                    c => ({ width: 40, height: 40, color: showNumbers ? c.text : c.textDim }),
                )}
                {showNumbers ? (
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 52px)', gap: 1.5 }}>
                        {NUMBER_KEYS.map((n, i) =>
                            n && this.hasKey(`NUMBER_${n}`) ? (
                                this.renderKey(
                                    `NUMBER_${n}`,
                                    <span style={{ fontWeight: 'bold', fontSize: 18 }}>{n}</span>,
                                )
                            ) : (
                                <Box key={i} />
                            ),
                        )}
                    </Box>
                ) : null}
            </>
        );
    }

    private renderVolumeSlider(): React.JSX.Element | null {
        const { volume, volumeMin, volumeMax, muted } = this.state;
        if (!this.volumeId) {
            return null;
        }
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', px: 0.5 }}>
                <VolumeUp sx={theme => ({ fontSize: 20, color: remoteColors(theme).textDim })} />
                <TouchSafeSlider
                    value={volume ?? volumeMin}
                    min={volumeMin}
                    max={volumeMax}
                    size="small"
                    disabled={this.isReadOnly || (muted && !!this.muteId)}
                    onChange={(_e, val) => this.send(this.volumeId, val)}
                    sx={{ '& .MuiSlider-thumb': { width: 12, height: 12 }, '& .MuiSlider-rail': { opacity: 0.2 } }}
                />
                <Typography
                    sx={theme => ({
                        fontSize: 12,
                        minWidth: 24,
                        textAlign: 'right',
                        color: remoteColors(theme).textDim,
                    })}
                >
                    {volume ?? '-'}
                </Typography>
            </Box>
        );
    }

    private renderStatus(): React.JSX.Element {
        const { power, artMode } = this.state;
        let color = '#5f6368';
        if (this.state.indicators.unreach) {
            color = '#ea4335';
        } else if (power) {
            color = artMode ? '#c49a52' : '#34a853';
        }
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                <Box
                    sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: color,
                        boxShadow: power ? `0 0 6px ${color}` : 'none',
                    }}
                />
                <Typography sx={theme => ({ fontSize: 12, color: remoteColors(theme).textDim })}>
                    {this.getStatusText()}
                </Typography>
            </Box>
        );
    }

    private renderRemote(): React.JSX.Element {
        const off = this.isOff;
        const { artMode, muted } = this.state;
        const row = { display: 'flex', justifyContent: 'space-around', alignItems: 'center', width: '100%' };
        const half = (): Record<string, unknown> => ({ backgroundColor: 'transparent', boxShadow: 'none' });
        const canStep = !!(this.volumeUpId || this.volumeDownId || this.volumeId);
        const media = [
            this.prevId
                ? this.renderButton('PREV', <SkipPrevious fontSize="small" />, I18n.t('wm_Previous'), () =>
                      this.send(this.prevId, true),
                  )
                : null,
            this.renderMediaKey('REWIND', null, <FastRewind fontSize="small" />),
            this.renderMediaKey('PLAY', this.playId, <PlayArrow fontSize="small" />),
            this.renderMediaKey('PAUSE', this.pauseId, <Pause fontSize="small" />),
            this.renderMediaKey('STOP', this.stopId, <Stop fontSize="small" />),
            this.renderMediaKey('FAST_FORWARD', null, <FastForward fontSize="small" />),
            this.nextId
                ? this.renderButton('NEXT', <SkipNext fontSize="small" />, I18n.t('wm_Next'), () =>
                      this.send(this.nextId, true),
                  )
                : null,
        ].filter(Boolean);
        const topKeys = [
            this.renderKey('MENU', <Menu />),
            this.renderKey('GUIDE', <ListAlt />),
            this.renderKey('INFO', <Info />),
        ].filter(Boolean);
        const navKeys = [
            this.renderKey('BACK', <ArrowBack />),
            this.renderKey('HOME', <Home />),
            this.renderKey('EXIT', <ExitToApp />),
            this.muteId
                ? this.renderButton(
                      'MUTE',
                      <VolumeOff />,
                      muted ? I18n.t('wm_Unmute') : I18n.t('wm_Mute'),
                      this.toggleMute,
                      () => (muted ? { backgroundColor: POWER.color, color: '#ffffff' } : {}),
                  )
                : null,
        ].filter(Boolean);
        const volumeRocker = canStep
            ? WidgetTv.renderRocker(
                  this.renderButton('VOLUME_UP', <Add />, I18n.t('wm_Volume up'), () => this.stepVolume(1), half),
                  this.renderButton(
                      'VOLUME_DOWN',
                      <Remove />,
                      I18n.t('wm_Volume down'),
                      () => this.stepVolume(-1),
                      half,
                  ),
                  'VOL',
              )
            : null;
        const channelRocker = WidgetTv.renderRocker(
            this.renderKey('CHANNEL_UP', <KeyboardArrowUp />, half),
            this.renderKey('CHANNEL_DOWN', <KeyboardArrowDown />, half),
            'CH',
        );
        const apps = this.appId ? this.getAppKeys() : [];

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <Box sx={off ? { ...row, justifyContent: 'center' } : row}>
                    {this.powerId
                        ? this.renderButton(
                              'POWER',
                              <PowerSettingsNew />,
                              I18n.t('wm_Power'),
                              this.togglePower,
                              () => ({
                                  backgroundColor: POWER.color,
                                  color: '#ffffff',
                                  '&:hover': { backgroundColor: POWER.hover },
                              }),
                          )
                        : null}
                    {this.artModeId && !off
                        ? this.renderButton('ART_MODE', <Palette />, I18n.t('wm_Art mode'), this.toggleArtMode, c => ({
                              backgroundColor: artMode ? ART.hover : ART.color,
                              color: '#ffffff',
                              boxShadow: artMode ? `0 0 10px ${ART.hover}` : c.shadow,
                              '&:hover': { backgroundColor: ART.hover },
                          }))
                        : null}
                </Box>

                {this.renderStatus()}

                {off ? null : (
                    <>
                        {this.renderInputs()}
                        {topKeys.length ? <Box sx={row}>{topKeys}</Box> : null}
                        {this.renderDpad()}
                        {navKeys.length ? <Box sx={row}>{navKeys}</Box> : null}
                        {volumeRocker || channelRocker ? (
                            <Box sx={{ ...row, alignItems: 'stretch' }}>
                                {volumeRocker}
                                {channelRocker}
                            </Box>
                        ) : null}
                        {this.renderVolumeSlider()}
                        {media.length ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0.5 }}>
                                {media}
                            </Box>
                        ) : null}
                        {this.renderColorKeys()}
                        {this.renderNumbers()}
                        {apps.length ? (
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, width: '100%' }}>
                                {apps.map(key => this.renderAppPill(key, false))}
                            </Box>
                        ) : null}
                    </>
                )}
            </Box>
        );
    }

    private renderRemoteDialog(): React.JSX.Element | null {
        if (!this.state.dialogOpen) {
            return null;
        }
        return (
            <Dialog
                open
                onClose={this.closeDialog}
                maxWidth={false}
                slotProps={{
                    paper: {
                        sx: theme => ({
                            width: 320,
                            maxWidth: 'calc(100% - 32px)',
                            m: 2,
                            borderRadius: '36px',
                            background: remoteColors(theme).body,
                            color: remoteColors(theme).text,
                            maxHeight: '90vh',
                        }),
                    },
                }}
            >
                <Box sx={{ px: 3, py: 2, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                            variant="subtitle1"
                            noWrap
                            sx={{ fontWeight: 600, flex: 1 }}
                        >
                            {this.props.settings?.name || this.state.name || ''}
                        </Typography>
                        <IconButton
                            size="small"
                            onClick={this.closeDialog}
                            title={I18n.t('wm_Close')}
                            sx={theme => ({ color: remoteColors(theme).textDim })}
                        >
                            <KeyboardArrowDown />
                        </IconButton>
                    </Box>
                    {this.renderRemote()}
                </Box>
            </Dialog>
        );
    }

    render(): React.JSX.Element {
        return (
            <>
                {super.render()}
                {this.renderRemoteDialog()}
            </>
        );
    }
}

export default WidgetTv;
