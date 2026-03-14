import React from 'react';
import { Box, Slider, Switch as MuiSwitch, Typography } from '@mui/material';
import { LightbulbOutlined } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';

import WidgetGeneric, { getTileStyles, type WidgetGenericProps, type WidgetGenericState } from './Generic';

interface WidgetDimmerState extends WidgetGenericState {
    brightness: number;
    isOn: boolean;
    dragging: boolean;
}

export class WidgetDimmer extends WidgetGeneric<WidgetDimmerState> {
    private readonly setId: string | null;
    private readonly actualId: string | null;
    private readonly onSetId: string | null;
    private readonly onActualId: string | null;

    private arcRef = React.createRef<HTMLDivElement>();
    private dragStartPos: { x: number; y: number } | null = null;
    private isDragging = false;

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;
        const set = states.find(s => s.name === 'SET');
        const actual = states.find(s => s.name === 'ACTUAL');
        const onSet = states.find(s => s.name === 'ON_SET');
        const onActual = states.find(s => s.name === 'ON_ACTUAL');

        this.setId = set?.id ?? null;
        this.actualId = actual?.id ?? set?.id ?? null;
        this.onSetId = onSet?.id ?? null;
        this.onActualId = onActual?.id ?? onSet?.id ?? null;

        this.state = {
            ...this.state,
            brightness: 0,
            isOn: false,
            dragging: false,
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onBrightnessChange);
        }
        if (this.onActualId) {
            this.props.stateContext.getState(this.onActualId, this.onOnOffChange);
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onBrightnessChange);
        }
        if (this.onActualId) {
            this.props.stateContext.removeState(this.onActualId, this.onOnOffChange);
        }
    }

    onBrightnessChange = (_id: string, state: ioBroker.State): void => {
        // Ignore backend updates while user is dragging
        if (this.isDragging) {
            return;
        }
        const brightness = Number(state.val) || 0;
        if (brightness !== this.state.brightness) {
            if (!this.onActualId) {
                this.setState({ brightness, isOn: brightness > 0 });
            } else {
                this.setState({ brightness });
            }
        }
    };

    onOnOffChange = (_id: string, state: ioBroker.State): void => {
        const isOn = !!state.val;
        if (isOn !== this.state.isOn) {
            this.setState({ isOn });
        }
    };

    setBrightness = (_e: Event, value: number | number[]): void => {
        const level = value as number;
        if (this.setId) {
            void this.props.stateContext.getSocket().setState(this.setId, level);
        }
        if (this.onSetId && !this.state.isOn && level > 0) {
            void this.props.stateContext.getSocket().setState(this.onSetId, true);
        }
    };

    toggleOnOff = (): void => {
        if (this.onSetId) {
            void this.props.stateContext.getSocket().setState(this.onSetId, !this.state.isOn);
        } else if (this.setId) {
            void this.props.stateContext.getSocket().setState(this.setId, this.state.isOn ? 0 : 100);
        }
    };

    // --- Arc pointer interaction ---

    /** Map a screen pointer position to 0..100 brightness along the 270° arc */
    private pointerToPercent(clientX: number, clientY: number): number {
        const el = this.arcRef.current;
        if (!el) {
            return this.state.brightness;
        }
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = clientX - cx;
        const dy = clientY - cy;

        // atan2 in screen coords: 0° = right, clockwise positive (y is down)
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
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (!this.isDragging && dist > 8) {
            this.isDragging = true;
            this.setState({ dragging: true });
        }

        if (this.isDragging) {
            const percent = this.pointerToPercent(e.clientX, e.clientY);
            if (this.onActualId) {
                // Show as active during drag if moving above 0
                this.setState({ brightness: percent, isOn: this.state.isOn || percent > 0 });
            } else {
                this.setState({ brightness: percent, isOn: percent > 0 });
            }
        }
    };

    private onArcPointerUp = (e: React.PointerEvent): void => {
        if (!this.dragStartPos) {
            return;
        }

        if (this.isDragging) {
            // Drag end — send final brightness and activate if off
            const percent = this.pointerToPercent(e.clientX, e.clientY);
            if (this.setId) {
                void this.props.stateContext.getSocket().setState(this.setId, percent);
            }
            if (this.onSetId && !this.state.isOn && percent > 0) {
                void this.props.stateContext.getSocket().setState(this.onSetId, true);
            }
        } else {
            // Tap — toggle on/off
            this.toggleOnOff();
        }

        this.dragStartPos = null;
        this.isDragging = false;
        this.setState({ dragging: false });
    };

    // --- Overrides ---

    protected isTileActive(): boolean {
        if (this.onActualId) {
            return this.state.isOn;
        }
        return this.state.brightness > 0;
    }

    protected onTileClick(): void {
        this.toggleOnOff();
    }

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = super.renderTileIcon();
        if (baseIcon) {
            return baseIcon;
        }

        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const { brightness } = this.state;

        return (
            <LightbulbOutlined
                sx={theme => ({
                    fontSize: 32,
                    color: isActive ? accent || theme.palette.primary.main : theme.palette.text.disabled,
                    transition: 'color 0.25s ease',
                    filter: isActive
                        ? `drop-shadow(0 0 ${4 + brightness / 10}px ${accent || theme.palette.primary.main})`
                        : 'none',
                })}
            />
        );
    }

    protected renderTileStatus(): React.JSX.Element {
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const { brightness } = this.state;

        return (
            <Typography
                variant="caption"
                sx={theme => ({
                    fontWeight: 500,
                    color: isActive ? accent || theme.palette.primary.main : theme.palette.text.secondary,
                    transition: 'color 0.25s ease',
                })}
            >
                {isActive ? `${Math.round(brightness)}%` : I18n.t('wm_Off')}
            </Typography>
        );
    }

    protected renderTileAction(): React.JSX.Element {
        const { brightness } = this.state;
        const accent = this.getAccentColor();

        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Slider
                    value={brightness}
                    min={0}
                    max={100}
                    size="small"
                    onClick={e => e.stopPropagation()}
                    onChange={this.setBrightness}
                    sx={theme => ({
                        width: 80,
                        color: accent || theme.palette.primary.main,
                        '& .MuiSlider-thumb': {
                            width: 14,
                            height: 14,
                        },
                    })}
                />
                <MuiSwitch
                    checked={this.isTileActive()}
                    onClick={e => e.stopPropagation()}
                    onChange={this.toggleOnOff}
                    size="small"
                    sx={
                        accent
                            ? {
                                  '& .MuiSwitch-switchBase.Mui-checked': { color: accent },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                      backgroundColor: accent,
                                  },
                              }
                            : undefined
                    }
                />
            </Box>
        );
    }

    // In compact (1x1) mode, show an interactive brightness arc
    renderCompact(): React.JSX.Element {
        const { name, brightness, dragging } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const isDisabled = this.props.settings?.enabled === false;
        const indicators = this.renderIndicators();

        // Circular progress parameters — fixed viewBox, sized by CSS percentage
        const vb = 100;
        const sw = 8;
        const r = (vb - sw) / 2;
        const circumference = 2 * Math.PI * r;
        const arcLength = circumference * 0.75;
        const progress = (brightness / 100) * arcLength;

        return (
            <Box sx={{ position: 'relative' }}>
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
                        <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1 }}>
                            {indicators}
                        </Box>
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
                            variant="body2"
                            sx={{
                                fontWeight: 600,
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {name ?? '...'}
                        </Typography>
                        {this.renderTileStatus()}
                    </Box>
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }
}

export default WidgetDimmer;
