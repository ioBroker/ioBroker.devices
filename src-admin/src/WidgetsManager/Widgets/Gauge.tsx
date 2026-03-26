import React, { Component } from 'react';
import { Box, Typography } from '@mui/material';
import { Settings } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';

import type StateContext from '../StateContext';
import type { StateChangeListener } from '../StateContext';
import { getTileStyles, isNeumorphicTheme } from './Generic';
import ChartDialog from './ChartDialog';

interface ColorLevel {
    value: number;
    color: string;
}

const DEFAULT_LEVELS: ColorLevel[] = [
    { value: 30, color: '#4caf50' },
    { value: 70, color: '#ff9800' },
    { value: 100, color: '#f44336' },
];

interface WidgetGaugeProps {
    id: string;
    language: ioBroker.Languages;
    size?: '1x1' | '2x0.5' | '2x1';
    color?: string;
    gaugeStateId?: string;
    minValue?: number;
    maxValue?: number;
    gaugeUnit?: string;
    gaugeName?: string;
    gaugeStateId2?: string;
    colorLevels?: ColorLevel[];
    usePercentage?: boolean;
    stateContext?: StateContext;
    onOpenSettings?: (id: string) => void;
    onRemove?: (id: string) => void;
    defaultHistory?: string;
    instanceId?: string;
}

interface WidgetGaugeState {
    value: number | null;
    unit: string;
    value2: number | null;
    unit2: string;
    chartOpen: boolean;
    historyId: string | null;
    historyInstance: string;
}

export class WidgetGauge extends Component<WidgetGaugeProps, WidgetGaugeState> {
    private handler: StateChangeListener | null = null;
    private handler2: StateChangeListener | null = null;

    constructor(props: WidgetGaugeProps) {
        super(props);
        this.state = {
            value: null,
            unit: '',
            value2: null,
            unit2: '',
            chartOpen: false,
            historyId: null,
            historyInstance: '',
        };
    }

    componentDidMount(): void {
        this.subscribe();
        this.subscribe2();
        this.resolveHistory();
    }

    componentDidUpdate(prevProps: WidgetGaugeProps): void {
        if (prevProps.gaugeStateId !== this.props.gaugeStateId) {
            this.unsubscribe();
            this.subscribe();
            this.resolveHistory();
        }
        if (prevProps.gaugeStateId2 !== this.props.gaugeStateId2) {
            this.unsubscribe2();
            this.subscribe2();
        }
    }

    componentWillUnmount(): void {
        this.unsubscribe();
        this.unsubscribe2();
    }

    private subscribe(): void {
        const { gaugeStateId, stateContext } = this.props;
        if (!gaugeStateId || !stateContext) {
            return;
        }
        this.handler = (_id: string, state: ioBroker.State) => {
            const val = Number(state.val);
            if (!Number.isNaN(val) && val !== this.state.value) {
                this.setState({ value: val });
            }
        };
        stateContext.getState(gaugeStateId, this.handler);

        void stateContext
            .getSocket()
            .getObject(gaugeStateId)
            .then(obj => {
                const u = (obj as ioBroker.StateObject | null)?.common?.unit || '';
                if (u !== this.state.unit) {
                    this.setState({ unit: u });
                }
            })
            .catch(() => {});
    }

    private subscribe2(): void {
        const { gaugeStateId2, stateContext } = this.props;
        if (!gaugeStateId2 || !stateContext) {
            return;
        }
        this.handler2 = (_id: string, state: ioBroker.State) => {
            const val = Number(state.val);
            if (!Number.isNaN(val) && val !== this.state.value2) {
                this.setState({ value2: val });
            }
        };
        stateContext.getState(gaugeStateId2, this.handler2);

        void stateContext
            .getSocket()
            .getObject(gaugeStateId2)
            .then(obj => {
                const u = (obj as ioBroker.StateObject | null)?.common?.unit || '';
                if (u !== this.state.unit2) {
                    this.setState({ unit2: u });
                }
            })
            .catch(() => {});
    }

    private unsubscribe(): void {
        if (this.handler && this.props.gaugeStateId && this.props.stateContext) {
            this.props.stateContext.removeState(this.props.gaugeStateId, this.handler);
            this.handler = null;
        }
    }

    private unsubscribe2(): void {
        if (this.handler2 && this.props.gaugeStateId2 && this.props.stateContext) {
            this.props.stateContext.removeState(this.props.gaugeStateId2, this.handler2);
            this.handler2 = null;
        }
    }

    private resolveHistory(): void {
        const { gaugeStateId, stateContext, defaultHistory } = this.props;
        if (!gaugeStateId || !stateContext) {
            this.setState({ historyId: null, historyInstance: '' });
            return;
        }
        const socket = stateContext.getSocket();

        void (async () => {
            let instance = defaultHistory || '';
            if (!instance) {
                try {
                    const cfg = await socket.getObject('system.config');
                    instance = ((cfg?.common as unknown as Record<string, unknown>)?.defaultHistory as string) || '';
                } catch {
                    // ignore
                }
            }
            if (!instance) {
                this.setState({ historyId: null, historyInstance: '' });
                return;
            }

            try {
                const obj = await socket.getObject(gaugeStateId);
                if ((obj as ioBroker.StateObject)?.common?.custom?.[instance]?.enabled) {
                    this.setState({ historyId: gaugeStateId, historyInstance: instance });
                    return;
                }
                // Follow alias
                const aliasId = (obj as ioBroker.StateObject)?.common?.alias?.id;
                if (aliasId) {
                    const targetId = typeof aliasId === 'object' ? (aliasId as { read?: string }).read : aliasId;
                    if (targetId && targetId !== gaugeStateId) {
                        const targetObj = await socket.getObject(targetId);
                        if ((targetObj as ioBroker.StateObject)?.common?.custom?.[instance]?.enabled) {
                            this.setState({ historyId: targetId, historyInstance: instance });
                            return;
                        }
                    }
                }
            } catch {
                // ignore
            }
            this.setState({ historyId: null, historyInstance: instance });
        })();
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private get min(): number {
        return this.props.minValue ?? 0;
    }

    private get max(): number {
        return this.props.maxValue ?? 100;
    }

    private get levels(): ColorLevel[] {
        return this.props.colorLevels?.length ? this.props.colorLevels : DEFAULT_LEVELS;
    }

    private get displayUnit(): string {
        return this.props.gaugeUnit || this.state.unit || '';
    }

    private get displayName(): string {
        return this.props.gaugeName || this.props.gaugeStateId?.split('.').pop() || I18n.t('wm_Gauge');
    }

    private get hasChart(): boolean {
        return !!this.state.historyId;
    }

    private toFraction(raw: number): number {
        const range = this.max - this.min;
        if (range <= 0) {
            return 0;
        }
        return Math.max(0, Math.min(1, (raw - this.min) / range));
    }

    private getColor(raw: number): string {
        const levels = this.levels;
        const { usePercentage } = this.props;
        const frac = this.toFraction(raw);
        const cmp = usePercentage ? frac * 100 : raw;

        for (const lvl of levels) {
            if (cmp <= lvl.value) {
                return lvl.color;
            }
        }
        return levels[levels.length - 1]?.color || '#2196f3';
    }

    static formatValue(raw: number): string {
        if (Math.abs(raw) >= 100) {
            return raw.toFixed(0);
        }
        if (Math.abs(raw) >= 10) {
            return raw.toFixed(1);
        }
        return raw.toFixed(1);
    }

    private onTileClick = (): void => {
        if (this.hasChart) {
            this.setState({ chartOpen: true });
        }
    };

    // ── Rendering ────────────────────────────────────────────────────

    /** Convert a fraction (0..1) to a point on the arc circle */
    private static arcPoint(cx: number, cy: number, r: number, frac: number): { x: number; y: number } {
        // Arc spans 270° starting at 135° rotation. Fraction 0 = start, 1 = end.
        const angleDeg = frac * 270;
        const rad = (angleDeg * Math.PI) / 180;
        return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
    }

    private renderArc(size: number): React.JSX.Element {
        const { value } = this.state;
        const accent = this.props.color;
        const vb = 100;
        const sw = 10;
        const r = (vb - sw) / 2;
        const cx = vb / 2;
        const cy = vb / 2;
        const circumference = 2 * Math.PI * r;
        const arcLength = circumference * 0.75;

        const raw = value ?? this.min;
        const frac = this.toFraction(raw);
        const color = value != null ? this.getColor(raw) : accent || '#2196f3';

        // Indicator dot position
        const dot = value != null ? WidgetGauge.arcPoint(cx, cy, r, frac) : null;

        return (
            <Box
                sx={{
                    width: size,
                    height: size,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <svg
                    viewBox={`0 0 ${vb} ${vb}`}
                    style={{ width: '100%', height: '100%', transform: 'rotate(135deg)' }}
                >
                    {/* Full background arc (grey) */}
                    <circle
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={sw}
                        strokeDasharray={`${arcLength} ${circumference}`}
                        strokeLinecap="round"
                        opacity={0.12}
                    />
                    {/* Colored segments clipped to current value */}
                    {this.renderColoredSegments(vb, r, sw, circumference, arcLength, frac)}
                    {/* Indicator dot at current position */}
                    {dot ? (
                        <circle
                            cx={dot.x}
                            cy={dot.y}
                            r={sw / 2 + 1}
                            fill={color}
                            stroke="rgba(0,0,0,0.3)"
                            strokeWidth={1}
                        />
                    ) : null}
                </svg>

                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: 'translateY(-4%)',
                    }}
                >
                    {/* Secondary value (smaller, above main) */}
                    {this.state.value2 != null ? (
                        <Typography
                            sx={{
                                fontWeight: 600,
                                fontSize: size * 0.12,
                                lineHeight: 1,
                                color: 'text.secondary',
                                mb: 0.25,
                            }}
                        >
                            {WidgetGauge.formatValue(this.state.value2)}
                            {this.state.unit2 ? ` ${this.state.unit2}` : ''}
                        </Typography>
                    ) : null}
                    <Typography
                        sx={{
                            fontWeight: 700,
                            fontSize: size * (this.state.value2 != null ? 0.19 : 0.22),
                            lineHeight: 1.1,
                            color: value != null ? color : 'text.disabled',
                        }}
                    >
                        {value != null ? WidgetGauge.formatValue(raw) : '—'}
                    </Typography>
                    {this.displayUnit ? (
                        <Typography
                            sx={{
                                fontSize: size * 0.11,
                                color: 'text.secondary',
                                lineHeight: 1,
                            }}
                        >
                            {this.displayUnit}
                        </Typography>
                    ) : null}
                </Box>
            </Box>
        );
    }

    /** Render colored arc segments, clipped to the current value fraction */
    private renderColoredSegments(
        vb: number,
        r: number,
        sw: number,
        circumference: number,
        arcLength: number,
        valueFrac: number,
    ): React.JSX.Element[] {
        const levels = this.levels;
        const { usePercentage } = this.props;
        const segments: React.JSX.Element[] = [];
        let prevFrac = 0;

        for (let i = 0; i < levels.length; i++) {
            const lvl = levels[i];
            let levelFrac: number;
            if (usePercentage) {
                levelFrac = Math.max(0, Math.min(1, lvl.value / 100));
            } else {
                levelFrac = this.toFraction(lvl.value);
            }

            // Clip segment end to current value
            const clippedEnd = Math.min(levelFrac, valueFrac);
            const segStart = prevFrac * arcLength;
            const segLen = Math.max(0, (clippedEnd - prevFrac) * arcLength);

            if (segLen > 0) {
                segments.push(
                    <circle
                        key={i}
                        cx={vb / 2}
                        cy={vb / 2}
                        r={r}
                        fill="none"
                        stroke={lvl.color}
                        strokeWidth={sw}
                        strokeDasharray={`${segLen} ${circumference}`}
                        strokeDashoffset={-segStart}
                        strokeLinecap={i === 0 || clippedEnd >= valueFrac ? 'round' : 'butt'}
                        opacity={0.85}
                    />,
                );
            }

            prevFrac = levelFrac;
            // No more segments needed past the value
            if (levelFrac >= valueFrac) {
                break;
            }
        }

        return segments;
    }

    private renderChartDialog(): React.JSX.Element | null {
        const { chartOpen, historyId, historyInstance } = this.state;
        if (!chartOpen || !historyId || !historyInstance || !this.props.stateContext) {
            return null;
        }
        return (
            <ChartDialog
                open
                onClose={() => this.setState({ chartOpen: false })}
                title={this.displayName}
                historyIds={[{ id: historyId, color: this.props.color || '#2196f3', name: this.displayName }]}
                historyInstance={historyInstance}
                socket={this.props.stateContext.getSocket()}
                unit={this.displayUnit}
                widgetId={this.props.id}
                instanceId={this.props.instanceId}
            />
        );
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
                    bottom: 6,
                    right: 6,
                    p: '3px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 2,
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

    // ── 1x1 compact ──────────────────────────────────────────────────

    private renderCompact(): React.JSX.Element {
        const accent = this.props.color;
        const clickable = this.hasChart;

        return (
            <Box
                id={this.props.id}
                sx={theme => ({
                    position: 'relative',
                    containerType: 'inline-size',
                    overflow: 'hidden',
                    borderRadius: isNeumorphicTheme(theme) ? '24px' : '16px',
                })}
            >
                <Box
                    onClick={clickable ? this.onTileClick : undefined}
                    sx={theme => ({
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        justifyContent: 'space-between',
                        width: '100%',
                        aspectRatio: '1',
                        overflow: 'hidden',
                        position: 'relative',
                        textAlign: 'left',
                        cursor: clickable ? 'pointer' : 'default',
                        ...getTileStyles(theme, this.state.value != null, accent, clickable),
                    })}
                >
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {this.renderArc(100)}
                    </Box>
                    <Box>
                        <Typography
                            variant="body2"
                            noWrap
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
                                          fontSize: 'max(0.7rem, 7cqi)',
                                      }
                                    : {}),
                            })}
                        >
                            {this.displayName}
                        </Typography>
                    </Box>
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    // ── 2x0.5 wide ──────────────────────────────────────────────────

    private renderWide(): React.JSX.Element {
        const { value } = this.state;
        const accent = this.props.color;
        const raw = value ?? this.min;
        const color = value != null ? this.getColor(raw) : undefined;
        const clickable = this.hasChart;

        return (
            <Box
                id={this.props.id}
                sx={theme => ({
                    position: 'relative',
                    gridColumn: 'span 2',
                    containerType: 'inline-size',
                    overflow: 'hidden',
                    borderRadius: isNeumorphicTheme(theme) ? '24px' : '16px',
                })}
            >
                <Box
                    onClick={clickable ? this.onTileClick : undefined}
                    sx={theme => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        width: '100%',
                        height: 80,
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: clickable ? 'pointer' : 'default',
                        ...getTileStyles(theme, value != null, accent, clickable),
                    })}
                >
                    {this.renderArc(56)}

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                            variant="body2"
                            noWrap
                            sx={theme => ({
                                fontWeight: 600,
                                ...(isNeumorphicTheme(theme)
                                    ? {
                                          textTransform: 'uppercase' as const,
                                          letterSpacing: '0.08em',
                                          fontSize: '0.75rem',
                                      }
                                    : {}),
                            })}
                        >
                            {this.displayName}
                        </Typography>
                        <Typography
                            variant="h6"
                            sx={{ fontWeight: 700, color, lineHeight: 1.2 }}
                        >
                            {value != null ? `${WidgetGauge.formatValue(raw)} ${this.displayUnit}` : '—'}
                        </Typography>
                    </Box>
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    // ── 2x1 wide tall ────────────────────────────────────────────────

    private renderWideTall(): React.JSX.Element {
        const accent = this.props.color;
        const clickable = this.hasChart;

        return (
            <Box
                id={this.props.id}
                sx={theme => ({
                    position: 'relative',
                    gridColumn: 'span 2',
                    containerType: 'inline-size',
                    overflow: 'hidden',
                    borderRadius: isNeumorphicTheme(theme) ? '24px' : '16px',
                })}
            >
                {/* Sizer */}
                <Box sx={{ width: 'calc(50% - 6px)', aspectRatio: '1' }} />
                <Box
                    onClick={clickable ? this.onTileClick : undefined}
                    sx={theme => ({
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        overflow: 'hidden',
                        cursor: clickable ? 'pointer' : 'default',
                        ...getTileStyles(theme, this.state.value != null, accent, clickable),
                        padding: isNeumorphicTheme(theme) ? 'max(12px, 4cqi)' : 'max(16px, 5cqi)',
                    })}
                >
                    <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {this.renderArc(120)}
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                            variant="body2"
                            noWrap
                            sx={theme => ({
                                fontWeight: 600,
                                fontSize: 'max(0.875rem, 4.5cqi)',
                                ...(isNeumorphicTheme(theme)
                                    ? {
                                          textTransform: 'uppercase' as const,
                                          letterSpacing: '0.08em',
                                          fontSize: 'max(0.7rem, 3.5cqi)',
                                      }
                                    : {}),
                            })}
                        >
                            {this.displayName}
                        </Typography>
                        {this.renderLevelLegend()}
                    </Box>
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    private renderLevelLegend(): React.JSX.Element {
        const levels = this.levels;
        const { usePercentage } = this.props;

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
                {levels.map((lvl, i) => (
                    <Box
                        key={i}
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                    >
                        <Box
                            sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: lvl.color,
                                flexShrink: 0,
                            }}
                        />
                        <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary', lineHeight: 1.2 }}
                        >
                            {usePercentage ? `${lvl.value}%` : `${lvl.value} ${this.displayUnit}`}
                        </Typography>
                    </Box>
                ))}
            </Box>
        );
    }

    render(): React.JSX.Element {
        const size = this.props.size || '1x1';
        let widget: React.JSX.Element;
        if (size === '2x0.5') {
            widget = this.renderWide();
        } else if (size === '2x1') {
            widget = this.renderWideTall();
        } else {
            widget = this.renderCompact();
        }

        const chartDialog = this.renderChartDialog();
        if (chartDialog) {
            return (
                <>
                    {widget}
                    {chartDialog}
                </>
            );
        }
        return widget;
    }
}

export default WidgetGauge;
