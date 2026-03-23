import React, { Component } from 'react';
import { Box, Typography } from '@mui/material';
import { Settings } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';

import type StateContext from '../StateContext';
import type { StateChangeListener } from '../StateContext';
import { getTileStyles, isNeumorphicTheme } from './Generic';

interface WidgetWindProps {
    id: string;
    language: ioBroker.Languages;
    size?: '1x1' | '2x0.5' | '2x1';
    color?: string;
    directionStateId?: string;
    speedStateId?: string;
    gustsStateId?: string;
    stateContext?: StateContext;
    onOpenSettings?: (id: string) => void;
    onRemove?: (id: string) => void;
}

interface WidgetWindState {
    direction: number | null;
    speed: number | null;
    gusts: number | null;
    speedUnit: string;
    gustsUnit: string;
}

/** Helper: polar to cartesian */
function polar(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
}

export class WidgetWind extends Component<WidgetWindProps, WidgetWindState> {
    private dirHandler: StateChangeListener | null = null;
    private speedHandler: StateChangeListener | null = null;
    private gustsHandler: StateChangeListener | null = null;

    constructor(props: WidgetWindProps) {
        super(props);
        this.state = {
            direction: null,
            speed: null,
            gusts: null,
            speedUnit: '',
            gustsUnit: '',
        };
    }

    componentDidMount(): void {
        this.subscribe();
    }

    componentDidUpdate(prevProps: WidgetWindProps): void {
        if (
            prevProps.directionStateId !== this.props.directionStateId ||
            prevProps.speedStateId !== this.props.speedStateId ||
            prevProps.gustsStateId !== this.props.gustsStateId
        ) {
            this.unsubscribe(prevProps);
            this.subscribe();
        }
    }

    componentWillUnmount(): void {
        this.unsubscribe(this.props);
    }

    private subscribe(): void {
        const ctx = this.props.stateContext;
        if (!ctx) {
            return;
        }

        if (this.props.directionStateId) {
            this.dirHandler = (_id, state) => {
                this.setState({ direction: state?.val != null ? Number(state.val) : null });
            };
            ctx.getState(this.props.directionStateId, this.dirHandler);
        }
        if (this.props.speedStateId) {
            this.speedHandler = (_id, state) => {
                this.setState({ speed: state?.val != null ? Number(state.val) : null });
            };
            ctx.getState(this.props.speedStateId, this.speedHandler);
            void ctx
                .getObject<ioBroker.StateObject>(this.props.speedStateId)
                .then(obj => {
                    if (obj?.common?.unit) {
                        this.setState({ speedUnit: obj.common.unit });
                    }
                })
                .catch(() => {});
        }
        if (this.props.gustsStateId) {
            this.gustsHandler = (_id, state) => {
                this.setState({ gusts: state?.val != null ? Number(state.val) : null });
            };
            ctx.getState(this.props.gustsStateId, this.gustsHandler);
            void ctx
                .getObject<ioBroker.StateObject>(this.props.gustsStateId)
                .then(obj => {
                    if (obj?.common?.unit) {
                        this.setState({ gustsUnit: obj.common.unit });
                    }
                })
                .catch(() => {});
        }
    }

    private unsubscribe(props: WidgetWindProps): void {
        const ctx = this.props.stateContext;
        if (!ctx) {
            return;
        }
        if (props.directionStateId && this.dirHandler) {
            ctx.removeState(props.directionStateId, this.dirHandler);
            this.dirHandler = null;
        }
        if (props.speedStateId && this.speedHandler) {
            ctx.removeState(props.speedStateId, this.speedHandler);
            this.speedHandler = null;
        }
        if (props.gustsStateId && this.gustsHandler) {
            ctx.removeState(props.gustsStateId, this.gustsHandler);
            this.gustsHandler = null;
        }
    }

    private renderSettingsButton(): React.JSX.Element | null {
        if (!this.props.onOpenSettings) {
            return null;
        }
        return (
            <Box
                component="span"
                role="button"
                tabIndex={0}
                onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    this.props.onOpenSettings!(this.props.id);
                }}
                onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        this.props.onOpenSettings!(this.props.id);
                    }
                }}
                sx={theme => ({
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    p: '3px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 1,
                    color: theme.palette.primary.main,
                    opacity: 0.6,
                    transition: 'opacity 0.2s, background-color 0.2s',
                    '&:hover': {
                        opacity: 1,
                        backgroundColor: theme.palette.action.hover,
                    },
                })}
            >
                <Settings sx={{ fontSize: 16 }} />
            </Box>
        );
    }

    /**
     * Full compass SVG — Apple Watch style.
     * Speed & unit rendered as SVG text inside the center circle.
     * isDark controls palette (dark bg with light elements vs. light bg with dark elements).
     */
    static renderCompass(
        size: number | string,
        dirDeg: number | null,
        speed: number | null,
        speedUnit: string,
        gusts: number | null,
        gustsUnit: string,
        isDark: boolean,
    ): React.JSX.Element {
        const cx = 100;
        const cy = 100;
        const outerR = 96;
        const tickOuterR = 93;

        // Colors adapted to theme
        const bgColor = isDark ? '#1a1a1a' : '#f0f0f0';
        const ringColor = isDark ? '#2a2a2a' : '#e0e0e0';
        const tickColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
        const tickBright = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)';
        const labelColor = isDark ? '#ffffff' : '#1a1a1a';
        const centerBg = isDark ? 'rgba(60,60,60,0.7)' : 'rgba(0,0,0,0.08)';
        const speedColor = isDark ? '#ffffff' : '#1a1a1a';
        const unitColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
        const arrowColor = isDark ? '#ffffff' : '#1a1a1a';

        // Build tick marks — every 2 degrees
        const ticks: React.JSX.Element[] = [];
        for (let deg = 0; deg < 360; deg += 2) {
            const isCardinal = deg % 90 === 0;
            const is30 = deg % 30 === 0;
            const is10 = deg % 10 === 0;

            let innerR: number;
            let width: number;
            let color: string;
            if (isCardinal) {
                innerR = tickOuterR - 10;
                width = 2;
                color = tickBright;
            } else if (is30) {
                innerR = tickOuterR - 7;
                width = 1.5;
                color = tickBright;
            } else if (is10) {
                innerR = tickOuterR - 5;
                width = 1;
                color = tickColor;
            } else {
                innerR = tickOuterR - 3;
                width = 0.6;
                color = tickColor;
            }

            const p1 = polar(cx, cy, innerR, deg);
            const p2 = polar(cx, cy, tickOuterR, deg);
            ticks.push(
                <line
                    key={deg}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={color}
                    strokeWidth={width}
                    strokeLinecap="butt"
                />,
            );
        }

        // Cardinal labels
        const labels = [
            { label: I18n.t('wm_N'), angle: 0, color: '#e53935' },
            { label: I18n.t('wm_E'), angle: 90 },
            { label: I18n.t('wm_S'), angle: 180 },
            { label: I18n.t('wm_W'), angle: 270 },
        ];

        // North triangle marker
        const nTriTop = polar(cx, cy, outerR + 1, 0);
        const nTriL = polar(cx, cy, outerR - 4, -4);
        const nTriR = polar(cx, cy, outerR - 4, 4);

        // Direction arrow
        let arrow: React.JSX.Element | null = null;
        if (dirDeg != null) {
            const arrowTipR = tickOuterR - 12;
            const arrowTailR = arrowTipR; // same length on the opposite side
            const circleR = 5;

            const tip = polar(cx, cy, arrowTipR, dirDeg);
            const tail = polar(cx, cy, arrowTailR, dirDeg + 180);

            // Arrowhead
            const headLen = 10;
            const headW = 5;
            const backDir = dirDeg + 180;
            const hb = polar(tip.x, tip.y, headLen, backDir);
            const hw1x = hb.x + Math.cos((dirDeg * Math.PI) / 180) * headW;
            const hw1y = hb.y + Math.sin((dirDeg * Math.PI) / 180) * headW;
            const hw2x = hb.x - Math.cos((dirDeg * Math.PI) / 180) * headW;
            const hw2y = hb.y - Math.sin((dirDeg * Math.PI) / 180) * headW;

            arrow = (
                <g>
                    {/* Shaft line */}
                    <line
                        x1={tail.x}
                        y1={tail.y}
                        x2={tip.x}
                        y2={tip.y}
                        stroke={arrowColor}
                        strokeWidth={2.5}
                        strokeLinecap="round"
                    />
                    {/* Arrowhead (tip side) */}
                    <polygon
                        points={`${tip.x},${tip.y} ${hw1x},${hw1y} ${hw2x},${hw2y}`}
                        fill={arrowColor}
                    />
                    {/* Open circle (tail side) */}
                    <circle
                        cx={tail.x}
                        cy={tail.y}
                        r={circleR}
                        fill="none"
                        stroke={arrowColor}
                        strokeWidth={2.5}
                    />
                </g>
            );
        }

        // Speed display text
        const speedStr = speed != null ? String(Math.round(speed)) : '–';

        return (
            <svg
                viewBox="0 0 200 200"
                style={{ width: size as number, height: size as number, display: 'block' }}
            >
                {/* Background circle */}
                <circle
                    cx={cx}
                    cy={cy}
                    r={outerR}
                    fill={bgColor}
                />
                {/* Outer ring band */}
                <circle
                    cx={cx}
                    cy={cy}
                    r={outerR}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth={8}
                />
                {/* Tick marks */}
                {ticks}
                {/* North triangle marker */}
                <polygon
                    points={`${nTriTop.x},${nTriTop.y} ${nTriL.x},${nTriL.y} ${nTriR.x},${nTriR.y}`}
                    fill="#e53935"
                />
                {/* Cardinal labels */}
                {labels.map(l => {
                    const p = polar(cx, cy, 70, l.angle);
                    return (
                        <text
                            key={l.label}
                            x={p.x}
                            y={p.y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill={l.color || labelColor}
                            fontSize={14}
                            fontWeight={700}
                            fontFamily="system-ui, sans-serif"
                        >
                            {l.label}
                        </text>
                    );
                })}
                {/* Direction arrow — rendered UNDER the center circle */}
                {arrow}
                {/* Center circle background */}
                <circle
                    cx={cx}
                    cy={cy}
                    r={38}
                    fill={centerBg}
                />
                {/* Speed number */}
                <text
                    x={cx}
                    y={cy - 4}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={speedColor}
                    fontSize={36}
                    fontWeight={700}
                    fontFamily="system-ui, sans-serif"
                >
                    {speedStr}
                </text>
                {/* Unit */}
                <text
                    x={cx}
                    y={cy + 20}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={unitColor}
                    fontSize={11}
                    fontFamily="system-ui, sans-serif"
                >
                    {speedUnit || ''}
                </text>
                {/* Gusts — small line below unit, between the center circle and S label */}
                {gusts != null ? (
                    <text
                        x={cx}
                        y={cy + 48}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={unitColor}
                        fontSize={9}
                        fontFamily="system-ui, sans-serif"
                    >
                        {`${Math.round(gusts * 10) / 10}${gustsUnit ? ` ${gustsUnit}` : ''}`}
                    </text>
                ) : null}
            </svg>
        );
    }

    static formatValue(val: number | null, unit: string): string {
        if (val == null) {
            return '–';
        }
        const rounded = Math.round(val * 10) / 10;
        return unit ? `${rounded} ${unit}` : String(rounded);
    }

    // --- Compact 1x1 layout: compass fills the whole tile ---
    private renderCompact(): React.JSX.Element {
        const { direction, speed, gusts, speedUnit, gustsUnit } = this.state;
        const accent = this.props.color;
        const hasData = this.props.directionStateId || this.props.speedStateId || this.props.gustsStateId;

        return (
            <Box
                id={this.props.id}
                className="widget-wind"
                sx={{ position: 'relative', containerType: 'inline-size', overflow: 'hidden' }}
            >
                <Box
                    sx={theme => ({
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%',
                        aspectRatio: '1',
                        overflow: 'hidden',
                        ...getTileStyles(theme, false, accent, false),
                        p: 0,
                    })}
                >
                    {hasData ? (
                        <Box
                            sx={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                '& > svg': { width: '100%', height: '100%' },
                            }}
                        >
                            {WidgetWind.renderCompass(
                                '100%' as unknown as number,
                                direction,
                                speed,
                                speedUnit,
                                gusts,
                                gustsUnit,
                                true, // always dark bg for the compass instrument
                            )}
                        </Box>
                    ) : (
                        <Typography
                            variant="caption"
                            sx={theme => ({ color: theme.palette.text.secondary })}
                        >
                            {I18n.t('wm_Not configured')}
                        </Typography>
                    )}
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    // --- Wide 2x0.5 layout: compass left, details right ---
    private renderWide(): React.JSX.Element {
        const { direction, speed, gusts, speedUnit, gustsUnit } = this.state;
        const accent = this.props.color;

        return (
            <Box
                id={this.props.id}
                className="widget-wind"
                sx={{ position: 'relative', gridColumn: 'span 2' }}
            >
                <Box
                    sx={theme => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        width: '100%',
                        height: 80,
                        overflow: 'hidden',
                        px: 0.5,
                        ...getTileStyles(theme, false, accent, false),
                    })}
                >
                    <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', height: '100%', py: 0.5 }}>
                        {WidgetWind.renderCompass(72, direction, speed, speedUnit, gusts, gustsUnit, true)}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        {this.props.speedStateId ? (
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                <Typography
                                    variant="caption"
                                    sx={theme => ({ color: theme.palette.text.secondary, fontSize: '0.7rem' })}
                                >
                                    {I18n.t('wm_Speed')}:
                                </Typography>
                                <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                    {WidgetWind.formatValue(speed, speedUnit)}
                                </Typography>
                            </Box>
                        ) : null}
                        {this.props.gustsStateId ? (
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                <Typography
                                    variant="caption"
                                    sx={theme => ({ color: theme.palette.text.secondary, fontSize: '0.7rem' })}
                                >
                                    {I18n.t('wm_Wind gusts')}:
                                </Typography>
                                <Typography sx={{ fontSize: '0.85rem' }}>
                                    {WidgetWind.formatValue(gusts, gustsUnit)}
                                </Typography>
                            </Box>
                        ) : null}
                        {direction != null ? (
                            <Typography
                                variant="caption"
                                sx={theme => ({ color: theme.palette.text.secondary, fontSize: '0.7rem' })}
                            >
                                {Math.round(direction)}°
                            </Typography>
                        ) : null}
                    </Box>
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    // --- Wide tall 2x1 layout: compass left, details right ---
    private renderWideTall(): React.JSX.Element {
        const { direction, speed, gusts, speedUnit, gustsUnit } = this.state;
        const accent = this.props.color;

        return (
            <Box
                id={this.props.id}
                className="widget-wind"
                sx={{ position: 'relative', gridColumn: 'span 2', containerType: 'inline-size', overflow: 'hidden' }}
            >
                <Box sx={{ width: 'calc(50% - 6px)', aspectRatio: '1' }} />
                <Box
                    sx={theme => ({
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        overflow: 'hidden',
                        px: 0.5,
                        ...getTileStyles(theme, false, accent, false),
                    })}
                >
                    <Box
                        sx={{
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            py: 0.5,
                            '& > svg': { width: 'auto', height: '100%' },
                        }}
                    >
                        {WidgetWind.renderCompass(
                            '100%' as unknown as number,
                            direction,
                            speed,
                            speedUnit,
                            gusts,
                            gustsUnit,
                            true,
                        )}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        {this.props.speedStateId ? (
                            <Typography
                                noWrap
                                style={{
                                    display: 'flex',
                                    marginBottom: 2.6,
                                    fontSize: '0.85rem',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <Box
                                    component="span"
                                    sx={theme => ({ color: theme.palette.text.secondary })}
                                >
                                    {I18n.t('wm_Speed')}:
                                </Box>{' '}
                                <Box
                                    component="span"
                                    sx={{ fontWeight: 700, minWidth: 40 }}
                                >
                                    {WidgetWind.formatValue(speed, speedUnit)}
                                </Box>
                            </Typography>
                        ) : null}
                        {this.props.gustsStateId ? (
                            <Typography
                                noWrap
                                style={{
                                    display: 'flex',
                                    marginBottom: 2.6,
                                    fontSize: '0.85rem',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <Box
                                    component="span"
                                    sx={theme => ({ color: theme.palette.text.secondary })}
                                >
                                    {I18n.t('wm_Wind gusts')}:
                                </Box>{' '}
                                <Box
                                    component="span"
                                    sx={{ fontWeight: 700, minWidth: 40 }}
                                >
                                    {WidgetWind.formatValue(gusts, gustsUnit)}
                                </Box>
                            </Typography>
                        ) : null}
                        {direction != null ? (
                            <Typography
                                noWrap
                                style={{
                                    display: 'flex',
                                    marginBottom: 2.6,
                                    fontSize: '0.85rem',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <Box
                                    component="span"
                                    sx={theme => ({ color: theme.palette.text.secondary })}
                                >
                                    {I18n.t('wm_Direction')}:
                                </Box>{' '}
                                <Box
                                    component="span"
                                    sx={{ fontWeight: 700, minWidth: 40 }}
                                >
                                    {Math.round(direction)}°
                                </Box>
                            </Typography>
                        ) : null}
                    </Box>
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    render(): React.JSX.Element {
        const size = this.props.size || '1x1';
        if (size === '2x0.5') {
            return this.renderWide();
        }
        if (size === '2x1') {
            return this.renderWideTall();
        }
        return this.renderCompact();
    }
}

export default WidgetWind;
