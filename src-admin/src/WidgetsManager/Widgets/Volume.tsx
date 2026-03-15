import React from 'react';
import { Box, Slider, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { VolumeUp, VolumeDown, VolumeMute, VolumeOff } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';

import WidgetGeneric, { getTileStyles, type WidgetGenericProps, type WidgetGenericState } from './Generic';

interface WidgetVolumeState extends WidgetGenericState {
    volume: number;
    dragging: boolean;
}

export class WidgetVolume extends WidgetGeneric<WidgetVolumeState> {
    private readonly setId: string | null;
    private readonly actualId: string | null;
    private readonly muteSetId: string | null;
    private lastNonZeroVolume = 50;

    private arcRef = React.createRef<HTMLDivElement>();
    private dragStartPos: { x: number; y: number } | null = null;
    private isDragging = false;

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;
        const set = states.find(s => s.name === 'SET');
        const actual = states.find(s => s.name === 'ACTUAL');
        const mute = states.find(s => s.name === 'MUTE');

        this.setId = set?.id ?? null;
        this.actualId = actual?.id ?? set?.id ?? null;
        this.muteSetId = mute?.id ?? null;

        this.state = {
            ...this.state,
            volume: 0,
            dragging: false,
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onVolumeChange);
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onVolumeChange);
        }
    }

    private onVolumeChange = (_id: string, state: ioBroker.State): void => {
        if (this.isDragging) {
            return;
        }
        const volume = Math.round(Number(state.val) || 0);
        if (volume !== this.state.volume) {
            if (volume > 0) {
                this.lastNonZeroVolume = volume;
            }
            this.setState({ volume });
        }
    };

    private toggleMute = (): void => {
        const newVol = this.state.volume > 0 ? 0 : this.lastNonZeroVolume;
        if (this.setId) {
            void this.props.stateContext.getSocket().setState(this.setId, newVol);
        }
        if (newVol > 0) {
            this.lastNonZeroVolume = newVol;
        }
        this.setState({ volume: newVol });
    };

    // --- Arc knob pointer interaction ---

    /** Map a screen pointer position to 0..100 along the 270° arc */
    private pointerToPercent(clientX: number, clientY: number): number {
        const el = this.arcRef.current;
        if (!el) {
            return this.state.volume;
        }
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = clientX - cx;
        const dy = clientY - cy;

        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        if (angle < 0) {
            angle += 360;
        }

        // Shift so arc start (135° visual = bottom-left) maps to 0
        let normalized = angle - 135;
        if (normalized < 0) {
            normalized += 360;
        }

        // Arc spans 270°; anything beyond is the 90° dead zone at the bottom
        if (normalized > 270) {
            return normalized > 315 ? 0 : 100;
        }

        return Math.round((normalized / 270) * 100);
    }

    private onArcPointerDown = (e: React.PointerEvent): void => {
        if (this.props.settings?.enabled === false) {
            return;
        }
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this.isDragging = false;
    };

    private onArcPointerMove = (e: React.PointerEvent): void => {
        if (!this.dragStartPos) {
            return;
        }
        const dx = e.clientX - this.dragStartPos.x;
        const dy = e.clientY - this.dragStartPos.y;
        if (!this.isDragging && Math.sqrt(dx * dx + dy * dy) > 8) {
            this.isDragging = true;
            this.setState({ dragging: true });
        }
        if (this.isDragging) {
            const percent = this.pointerToPercent(e.clientX, e.clientY);
            this.setState({ volume: percent });
        }
    };

    private onArcPointerUp = (e: React.PointerEvent): void => {
        if (!this.dragStartPos) {
            return;
        }
        if (this.isDragging) {
            const percent = this.pointerToPercent(e.clientX, e.clientY);
            if (this.setId) {
                void this.props.stateContext.getSocket().setState(this.setId, percent);
            }
            if (percent > 0) {
                this.lastNonZeroVolume = percent;
            }
        } else {
            // Tap — toggle mute
            this.toggleMute();
        }
        this.dragStartPos = null;
        this.isDragging = false;
        this.setState({ dragging: false });
    };

    // --- Slider handlers for wide modes ---

    private onSliderDrag = (_e: Event, value: number | number[]): void => {
        this.setState({ volume: value as number, dragging: true });
    };

    private onSliderCommit = (_e: Event | React.SyntheticEvent, value: number | number[]): void => {
        const volume = value as number;
        if (this.setId) {
            void this.props.stateContext.getSocket().setState(this.setId, volume);
        }
        if (volume > 0) {
            this.lastNonZeroVolume = volume;
        }
        this.setState({ volume, dragging: false });
    };

    // --- Overrides ---

    protected isTileActive(): boolean {
        return this.state.volume > 0;
    }

    // eslint-disable-next-line class-methods-use-this
    protected hasTileAction(): boolean {
        return true;
    }

    protected onTileClick(): void {
        this.toggleMute();
    }

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = this.renderBaseIcon();
        if (baseIcon) {
            return baseIcon;
        }

        const { volume } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();

        const iconSx = (theme: Theme): React.CSSProperties => ({
            fontSize: 32,
            color: isActive ? accent || theme.palette.primary.main : theme.palette.text.disabled,
            transition: 'color 0.25s ease',
        });

        if (volume === 0) {
            return <VolumeOff sx={iconSx} />;
        }
        if (volume < 33) {
            return <VolumeMute sx={iconSx} />;
        }
        if (volume < 67) {
            return <VolumeDown sx={iconSx} />;
        }
        return <VolumeUp sx={iconSx} />;
    }

    protected renderTileStatus(): React.JSX.Element {
        const { volume } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();

        return (
            <Typography
                variant="caption"
                sx={theme => ({
                    fontWeight: 500,
                    color: isActive ? accent || theme.palette.primary.main : theme.palette.text.secondary,
                    transition: 'color 0.25s ease',
                })}
            >
                {isActive ? `${volume}%` : I18n.t('wm_Off')}
            </Typography>
        );
    }

    protected renderTileAction(): React.JSX.Element {
        const { volume } = this.state;
        const accent = this.getAccentColor();

        return (
            <Slider
                value={volume}
                min={0}
                max={100}
                size="small"
                onClick={e => e.stopPropagation()}
                onChange={this.onSliderDrag}
                onChangeCommitted={this.onSliderCommit}
                sx={theme => ({
                    width: 80,
                    color: accent || theme.palette.primary.main,
                    '& .MuiSlider-thumb': { width: 14, height: 14 },
                })}
            />
        );
    }

    // 1x1 — arc knob
    renderCompact(): React.JSX.Element {
        const { name, volume, dragging } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const isDisabled = this.props.settings?.enabled === false;
        const indicators = this.renderIndicators();

        const vb = 100;
        const sw = 8;
        const r = (vb - sw) / 2;
        const circumference = 2 * Math.PI * r;
        const arcLength = circumference * 0.75; // 270°
        const progress = (volume / 100) * arcLength;

        return (
            <Box
                id={String(this.props.widget.id)}
                sx={{ position: 'relative', containerType: 'inline-size', overflow: 'hidden' }}
            >
                <Box
                    ref={this.arcRef}
                    onPointerDown={this.onArcPointerDown}
                    onPointerMove={this.onArcPointerMove}
                    onPointerUp={this.onArcPointerUp}
                    onPointerCancel={this.onArcPointerUp}
                    sx={theme => ({
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'stretch',
                        width: '100%',
                        aspectRatio: '1',
                        textAlign: 'left',
                        overflow: 'hidden',
                        cursor: isDisabled ? 'default' : 'pointer',
                        opacity: isDisabled ? 0.4 : 1,
                        touchAction: 'none',
                        userSelect: 'none',
                        ...getTileStyles(theme, isActive, accent),
                    })}
                >
                    {indicators ? (
                        <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1 }}>{indicators}</Box>
                    ) : null}

                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            flex: 1,
                        }}
                    >
                        <svg
                            viewBox={`0 0 ${vb} ${vb}`}
                            style={{ width: '60%', height: '60%', transform: 'rotate(135deg)' }}
                        >
                            {/* Background arc */}
                            <circle
                                cx={vb / 2}
                                cy={vb / 2}
                                r={r}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={sw}
                                strokeDasharray={`${arcLength} ${circumference}`}
                                strokeLinecap="round"
                                opacity={0.15}
                            />
                            {/* Progress arc */}
                            <circle
                                cx={vb / 2}
                                cy={vb / 2}
                                r={r}
                                fill="none"
                                stroke={isActive ? accent || 'var(--mui-palette-primary-main, #1976d2)' : 'transparent'}
                                strokeWidth={sw}
                                strokeDasharray={`${progress} ${circumference}`}
                                strokeLinecap="round"
                                style={dragging ? undefined : { transition: 'stroke-dasharray 0.3s ease' }}
                            />
                        </svg>
                        <Box
                            sx={{
                                position: 'absolute',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {this.renderTileIcon()}
                        </Box>
                    </Box>

                    <Box>
                        <Typography
                            ref={this.nameRef}
                            variant="body2"
                            sx={{
                                fontWeight: 600,
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {this.props.settings?.name || name || '...'}
                        </Typography>
                        {this.renderTileStatus()}
                    </Box>
                    {this.renderChart()}
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }
}

export default WidgetVolume;
