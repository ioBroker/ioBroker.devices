import React from 'react';
import { Box, ButtonBase, IconButton, Slider, Tooltip, Typography, type Theme } from '@mui/material';
import {
    KeyboardArrowDown,
    KeyboardArrowUp,
    KeyboardDoubleArrowDown,
    KeyboardDoubleArrowUp,
    Stop,
    SwapVert,
} from '@mui/icons-material';
import { I18n } from '@iobroker/gui-components';

import WidgetGeneric, { isNeumorphicTheme, type WidgetGenericProps, type WidgetGenericState } from './Generic';

interface WidgetBlindButtonsState extends WidgetGenericState {
    /** Direction: 0 = none, 1 = up/open, 2 = down/close */
    direction: number;
    /** Tilt direction: 0 = none, 1 = open, 2 = close */
    tiltDirection: number;
    /** Raw tilt level, `null` while unknown or when the device has no tilt level */
    tiltPosition: number | null;
    tiltMin: number;
    tiltMax: number;
}

/**
 * Tilt has no required stop state, so a tilt-open/close press must expire on its own — otherwise the
 * arrow and the whole tile would stay lit forever on devices without `TILT_STOP`.
 */
const TILT_DIRECTION_TIMEOUT_MS = 20_000;

export class WidgetBlindButtons extends WidgetGeneric<WidgetBlindButtonsState> {
    private readonly stopId: string | null;
    private readonly openId: string | null;
    private readonly closeId: string | null;
    private readonly tiltSetId: string | null;
    private readonly tiltActualId: string | null;
    private readonly tiltStopId: string | null;
    private readonly tiltOpenId: string | null;
    private readonly tiltCloseId: string | null;
    private tiltDirectionTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;
        const find = (name: string): string | null => states.find(s => s.name === name)?.id ?? null;

        this.stopId = find('STOP');
        this.openId = find('OPEN');
        this.closeId = find('CLOSE');
        this.tiltSetId = find('TILT_SET');
        this.tiltActualId = find('TILT_ACTUAL') ?? this.tiltSetId;
        this.tiltStopId = find('TILT_STOP');
        this.tiltOpenId = find('TILT_OPEN');
        this.tiltCloseId = find('TILT_CLOSE');

        this.state = {
            ...this.state,
            direction: 0,
            tiltDirection: 0,
            tiltPosition: null,
            tiltMin: 0,
            tiltMax: 100,
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.tiltActualId) {
            this.props.stateContext.getState(this.tiltActualId, this.onTiltChange);
        }
        void this.loadTiltRange();
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.tiltActualId) {
            this.props.stateContext.removeState(this.tiltActualId, this.onTiltChange);
        }
        if (this.tiltDirectionTimer) {
            clearTimeout(this.tiltDirectionTimer);
            this.tiltDirectionTimer = null;
        }
    }

    /** `level.tilt` is often 0..90 degrees or 0..255, not percent. */
    private async loadTiltRange(): Promise<void> {
        const id = this.tiltSetId ?? this.tiltActualId;
        if (!id) {
            return;
        }
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(id)) as
                | ioBroker.StateObject
                | null
                | undefined;
            const min = obj?.common?.min != null ? Number(obj.common.min) : 0;
            const max = obj?.common?.max != null ? Number(obj.common.max) : 100;
            if (!isNaN(min) && !isNaN(max) && max > min) {
                this.setState({ tiltMin: min, tiltMax: max });
            }
        } catch {
            // keep the 0..100 default
        }
    }

    private setTiltDirection(tiltDirection: number): void {
        if (this.tiltDirectionTimer) {
            clearTimeout(this.tiltDirectionTimer);
            this.tiltDirectionTimer = null;
        }
        this.setState({ tiltDirection });
        if (tiltDirection !== 0) {
            this.tiltDirectionTimer = setTimeout(() => {
                this.tiltDirectionTimer = null;
                this.setState({ tiltDirection: 0 });
            }, TILT_DIRECTION_TIMEOUT_MS);
        }
    }

    private onTiltChange = (_id: string, state: ioBroker.State): void => {
        const val = Number(state.val);
        const tiltPosition = state.val != null && !isNaN(val) ? Math.round(val) : null;
        if (tiltPosition !== this.state.tiltPosition) {
            this.setState({ tiltPosition });
        }
    };

    private get hasTiltButtons(): boolean {
        return !!(this.tiltOpenId || this.tiltCloseId || this.tiltStopId);
    }

    /**
     * The range is only known after `common.min`/`max` have been read, and a value can arrive before
     * that — an unclamped one pushes the slider thumb off its track.
     */
    private clampTilt(value: number): number {
        return Math.min(this.state.tiltMax, Math.max(this.state.tiltMin, value));
    }

    /** Percent is only the right unit when the state really is 0..100 */
    private formatTilt(value: number): string {
        return this.state.tiltMin === 0 && this.state.tiltMax === 100 ? `${value}%` : String(value);
    }

    protected isTileActive(): boolean {
        return this.state.direction !== 0 || this.state.tiltDirection !== 0;
    }

    // eslint-disable-next-line class-methods-use-this
    protected hasTileAction(): boolean {
        return true;
    }

    private sendOpen = (e: React.MouseEvent): void => {
        e.stopPropagation();
        if (this.openId) {
            void this.setValue(this.openId, true);
        }
        this.setState({ direction: 1 });
    };

    private sendStop = (e: React.MouseEvent): void => {
        e.stopPropagation();
        if (this.stopId) {
            void this.setValue(this.stopId, true);
        }
        this.setState({ direction: 0 });
    };

    private sendClose = (e: React.MouseEvent): void => {
        e.stopPropagation();
        if (this.closeId) {
            void this.setValue(this.closeId, true);
        }
        this.setState({ direction: 2 });
    };

    private sendTiltOpen = (e: React.MouseEvent): void => {
        e.stopPropagation();
        if (this.tiltOpenId) {
            void this.props.stateContext.getSocket().setState(this.tiltOpenId, true);
        }
        this.setTiltDirection(1);
    };

    private sendTiltStop = (e: React.MouseEvent): void => {
        e.stopPropagation();
        if (this.tiltStopId) {
            void this.props.stateContext.getSocket().setState(this.tiltStopId, true);
        }
        this.setTiltDirection(0);
    };

    private sendTiltClose = (e: React.MouseEvent): void => {
        e.stopPropagation();
        if (this.tiltCloseId) {
            void this.props.stateContext.getSocket().setState(this.tiltCloseId, true);
        }
        this.setTiltDirection(2);
    };

    private onTiltSliderChange = (_e: Event | React.SyntheticEvent, value: number | number[]): void => {
        if (this.tiltSetId) {
            void this.props.stateContext.getSocket().setState(this.tiltSetId, value as number);
        }
        this.setState({ tiltPosition: value as number });
    };

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = this.renderBaseIcon();
        if (baseIcon) {
            return baseIcon;
        }
        const { direction } = this.state;
        const accent = this.getAccentColor();

        if (direction === 1) {
            return <KeyboardArrowUp sx={theme => ({ color: accent || theme.palette.primary.main })} />;
        }
        if (direction === 2) {
            return <KeyboardArrowDown sx={theme => ({ color: accent || theme.palette.primary.main })} />;
        }
        return <Stop sx={{ color: 'text.disabled' }} />;
    }

    protected renderTileStatus(): React.JSX.Element {
        const { direction, tiltPosition } = this.state;
        const accent = this.getAccentColor();

        const text = direction === 1 ? I18n.t('wm_Open') : direction === 2 ? I18n.t('wm_Closed') : I18n.t('wm_Off');
        const tiltText = tiltPosition != null ? ` ↕${this.formatTilt(this.clampTilt(tiltPosition))}` : '';

        return (
            <Typography
                variant="caption"
                sx={theme => ({
                    fontWeight: 500,
                    color: direction !== 0 ? accent || theme.palette.primary.main : theme.palette.text.secondary,
                })}
            >
                {text}
                {tiltText}
            </Typography>
        );
    }

    protected renderTileAction(): React.JSX.Element {
        const accent = this.getAccentColor();
        const { direction, tiltDirection, tiltPosition } = this.state;

        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {this.tiltSetId && tiltPosition != null ? (
                    <Tooltip title={I18n.t('wm_Tilt')}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                            <SwapVert sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Slider
                                value={this.clampTilt(tiltPosition)}
                                min={this.state.tiltMin}
                                max={this.state.tiltMax}
                                size="small"
                                onClick={e => e.stopPropagation()}
                                onChangeCommitted={this.onTiltSliderChange}
                                sx={theme => ({
                                    width: 40,
                                    color: accent || theme.palette.text.secondary,
                                    '& .MuiSlider-thumb': { width: 10, height: 10 },
                                })}
                            />
                        </Box>
                    </Tooltip>
                ) : null}
                {this.hasTiltButtons ? (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {this.tiltOpenId ? (
                            <IconButton
                                size="small"
                                onClick={this.sendTiltOpen}
                                title={I18n.t('wm_Tilt open')}
                                sx={theme => ({
                                    p: 0.25,
                                    color:
                                        tiltDirection === 1 ? accent || theme.palette.primary.main : 'text.secondary',
                                })}
                            >
                                <KeyboardDoubleArrowUp fontSize="small" />
                            </IconButton>
                        ) : null}
                        {this.tiltStopId ? (
                            <IconButton
                                size="small"
                                onClick={this.sendTiltStop}
                                title={I18n.t('wm_Tilt stop')}
                                sx={{ p: 0.25, color: 'text.secondary' }}
                            >
                                <Stop fontSize="small" />
                            </IconButton>
                        ) : null}
                        {this.tiltCloseId ? (
                            <IconButton
                                size="small"
                                onClick={this.sendTiltClose}
                                title={I18n.t('wm_Tilt close')}
                                sx={theme => ({
                                    p: 0.25,
                                    color:
                                        tiltDirection === 2 ? accent || theme.palette.primary.main : 'text.secondary',
                                })}
                            >
                                <KeyboardDoubleArrowDown fontSize="small" />
                            </IconButton>
                        ) : null}
                    </Box>
                ) : null}
                <IconButton
                    size="small"
                    onClick={this.sendOpen}
                    sx={theme => ({
                        color: direction === 1 ? accent || theme.palette.primary.main : 'text.secondary',
                    })}
                >
                    <KeyboardArrowUp />
                </IconButton>
                <IconButton
                    size="small"
                    onClick={this.sendStop}
                    sx={{ color: 'text.secondary' }}
                >
                    <Stop />
                </IconButton>
                <IconButton
                    size="small"
                    onClick={this.sendClose}
                    sx={theme => ({
                        color: direction === 2 ? accent || theme.palette.primary.main : 'text.secondary',
                    })}
                >
                    <KeyboardArrowDown />
                </IconButton>
            </Box>
        );
    }

    // 1x1 compact — three large buttons
    renderCompact(): React.JSX.Element {
        const { name, direction, tiltDirection, tiltPosition } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        const showTiltButtons = this.hasTiltButtons;
        const showTiltSlider = !!this.tiltSetId && tiltPosition != null;

        const btnSx = (active: boolean) => (theme: Theme) => ({
            flex: 1,
            borderRadius: '12px',
            color: active ? accent || theme.palette.primary.main : theme.palette.text.secondary,
            backgroundColor: active ? `${accent || theme.palette.primary.main}22` : 'transparent',
            transition: 'all 0.2s',
            '&:hover': { backgroundColor: `${accent || theme.palette.primary.main}18` },
        });

        const iconSize = showTiltButtons ? 'max(20px, 13cqi)' : 'max(28px, 18cqi)';
        const stopIconSize = showTiltButtons ? 'max(18px, 11cqi)' : 'max(24px, 16cqi)';

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={theme => WidgetGeneric.getStyleCompact(theme)}
            >
                <Box
                    sx={theme => ({
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'stretch',
                        width: '100%',
                        aspectRatio: '1',
                        textAlign: 'left',
                        overflow: 'hidden',
                        ...this.applyTileStyles(theme, isActive),
                        padding: 'max(12px, 8cqi)',
                    })}
                >
                    {indicators}

                    <Box sx={{ display: 'flex', gap: 'max(4px, 2cqi)', flex: 1, alignItems: 'stretch' }}>
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 'max(4px, 2cqi)',
                                flex: 1,
                                justifyContent: 'center',
                            }}
                        >
                            <ButtonBase
                                onClick={this.sendOpen}
                                sx={btnSx(direction === 1)}
                            >
                                <KeyboardArrowUp sx={{ fontSize: iconSize }} />
                            </ButtonBase>
                            <ButtonBase
                                onClick={this.sendStop}
                                sx={btnSx(false)}
                            >
                                <Stop sx={{ fontSize: stopIconSize }} />
                            </ButtonBase>
                            <ButtonBase
                                onClick={this.sendClose}
                                sx={btnSx(direction === 2)}
                            >
                                <KeyboardArrowDown sx={{ fontSize: iconSize }} />
                            </ButtonBase>
                        </Box>
                        {showTiltButtons ? (
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'max(4px, 2cqi)',
                                    flex: 1,
                                    justifyContent: 'center',
                                }}
                            >
                                <ButtonBase
                                    onClick={this.sendTiltOpen}
                                    disabled={!this.tiltOpenId}
                                    sx={btnSx(tiltDirection === 1)}
                                >
                                    <KeyboardDoubleArrowUp sx={{ fontSize: iconSize }} />
                                </ButtonBase>
                                <ButtonBase
                                    onClick={this.sendTiltStop}
                                    disabled={!this.tiltStopId}
                                    sx={btnSx(false)}
                                >
                                    <Stop sx={{ fontSize: stopIconSize }} />
                                </ButtonBase>
                                <ButtonBase
                                    onClick={this.sendTiltClose}
                                    disabled={!this.tiltCloseId}
                                    sx={btnSx(tiltDirection === 2)}
                                >
                                    <KeyboardDoubleArrowDown sx={{ fontSize: iconSize }} />
                                </ButtonBase>
                            </Box>
                        ) : null}
                    </Box>

                    {showTiltSlider ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 0.5 }}>
                            <SwapVert sx={{ fontSize: 'max(12px, 7cqi)', color: 'text.secondary', flexShrink: 0 }} />
                            <Slider
                                value={this.clampTilt(tiltPosition)}
                                min={this.state.tiltMin}
                                max={this.state.tiltMax}
                                size="small"
                                onClick={e => e.stopPropagation()}
                                onChangeCommitted={this.onTiltSliderChange}
                                sx={theme => ({
                                    color: accent || theme.palette.primary.main,
                                    '& .MuiSlider-thumb': { width: 10, height: 10 },
                                })}
                            />
                        </Box>
                    ) : null}

                    {/* Name */}
                    <Box>
                        <Typography
                            ref={this.nameRef}
                            variant="body2"
                            sx={theme => ({
                                fontWeight: 600,
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                fontSize: 'max(0.875rem, 9cqi)',
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
}

export default WidgetBlindButtons;
