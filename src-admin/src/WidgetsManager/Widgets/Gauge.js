import React from 'react';
import { Box, Typography } from '@mui/material';
import { I18n } from '@iobroker/adapter-react-v5';
import WidgetGeneric, { isNeumorphicTheme, formatFloat, } from './Generic';
import ChartDialog from './ChartDialog';
const DEFAULT_LEVELS = [
    { value: 30, color: '#4caf50' },
    { value: 70, color: '#ff9800' },
    { value: 100, color: '#f44336' },
];
const GRADIENT_SEGMENTS = 60;
function hexToRgb(hex) {
    const m = hex.replace('#', '');
    const v = m.length === 3
        ? m
            .split('')
            .map(c => c + c)
            .join('')
        : m;
    return {
        r: parseInt(v.slice(0, 2), 16) || 0,
        g: parseInt(v.slice(2, 4), 16) || 0,
        b: parseInt(v.slice(4, 6), 16) || 0,
    };
}
function rgbToHex(r, g, b) {
    const h = (n) => Math.max(0, Math.min(255, Math.round(n)))
        .toString(16)
        .padStart(2, '0');
    return `#${h(r)}${h(g)}${h(b)}`;
}
function lerpColor(a, b, t) {
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    return rgbToHex(ca.r + (cb.r - ca.r) * t, ca.g + (cb.g - ca.g) * t, ca.b + (cb.b - ca.b) * t);
}
export class WidgetGauge extends WidgetGeneric {
    static getConfigSchema() {
        return {
            type: 'panel',
            label: 'wm_Gauge',
            items: {
                gaugeStateId: { type: 'objectId', label: 'wm_State ID' },
                gaugeStateId2: { type: 'objectId', label: 'wm_Secondary value' },
                gaugeName: { type: 'text', label: 'wm_Name', default: '' },
                minValue: { type: 'number', label: 'wm_Min value', default: 0 },
                maxValue: { type: 'number', label: 'wm_Max value', default: 100 },
                gaugeUnit: { type: 'text', label: 'wm_Unit', default: '' },
                decimals: { type: 'number', label: 'wm_Digits after comma', min: 0, max: 5 },
                usePercentage: { type: 'checkbox', label: 'wm_Color levels as percent', default: true },
                smoothGradient: { type: 'checkbox', label: 'wm_Smooth gradient', default: false },
                colorLevels: { type: 'component', subType: 'colorLevels', label: 'wm_Color levels' },
            },
        };
    }
    handler = null;
    handler2 = null;
    constructor(props) {
        super(props);
        this.state = {
            ...this.state,
            value: null,
            unit: '',
            value2: null,
            unit2: '',
            chartOpen: false,
            historyId: null,
            historyInstance: '',
        };
    }
    componentDidMount() {
        super.componentDidMount();
        this.subscribe();
        this.subscribe2();
        this.resolveHistory();
    }
    componentDidUpdate(prevProps) {
        super.componentDidUpdate(prevProps);
        if (prevProps.settings.gaugeStateId !== this.props.settings.gaugeStateId) {
            this.unsubscribe();
            this.subscribe();
            this.resolveHistory();
        }
        if (prevProps.settings.gaugeStateId2 !== this.props.settings.gaugeStateId2) {
            this.unsubscribe2();
            this.subscribe2();
        }
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        this.unsubscribe();
        this.unsubscribe2();
    }
    subscribe() {
        const { gaugeStateId } = this.props.settings;
        const { stateContext } = this.props;
        if (!gaugeStateId || !stateContext) {
            return;
        }
        this.handler = (_id, state) => {
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
            const u = obj?.common?.unit || '';
            if (u !== this.state.unit) {
                this.setState({ unit: u });
            }
        })
            .catch(() => { });
    }
    subscribe2() {
        const { gaugeStateId2 } = this.props.settings;
        const { stateContext } = this.props;
        if (!gaugeStateId2 || !stateContext) {
            return;
        }
        this.handler2 = (_id, state) => {
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
            const u = obj?.common?.unit || '';
            if (u !== this.state.unit2) {
                this.setState({ unit2: u });
            }
        })
            .catch(() => { });
    }
    unsubscribe() {
        if (this.handler && this.props.settings.gaugeStateId && this.props.stateContext) {
            this.props.stateContext.removeState(this.props.settings.gaugeStateId, this.handler);
            this.handler = null;
        }
    }
    unsubscribe2() {
        if (this.handler2 && this.props.settings.gaugeStateId2 && this.props.stateContext) {
            this.props.stateContext.removeState(this.props.settings.gaugeStateId2, this.handler2);
            this.handler2 = null;
        }
    }
    resolveHistory() {
        const { gaugeStateId } = this.props.settings;
        const { stateContext } = this.props;
        if (!gaugeStateId || !stateContext) {
            this.setState({ historyId: null, historyInstance: '' });
            return;
        }
        const socket = stateContext.getSocket();
        void (async () => {
            let instance = stateContext.defaultHistory || '';
            if (!instance) {
                try {
                    const cfg = await socket.getObject('system.config');
                    instance = cfg?.common?.defaultHistory || '';
                }
                catch {
                    // ignore
                }
            }
            if (!instance) {
                this.setState({ historyId: null, historyInstance: '' });
                return;
            }
            try {
                const obj = await socket.getObject(gaugeStateId);
                if (obj?.common?.custom?.[instance]?.enabled) {
                    this.setState({ historyId: gaugeStateId, historyInstance: instance });
                    return;
                }
                // Follow alias
                const aliasId = obj?.common?.alias?.id;
                if (aliasId) {
                    const targetId = typeof aliasId === 'object' ? aliasId.read : aliasId;
                    if (targetId && targetId !== gaugeStateId) {
                        const targetObj = await socket.getObject(targetId);
                        if (targetObj?.common?.custom?.[instance]?.enabled) {
                            this.setState({ historyId: targetId, historyInstance: instance });
                            return;
                        }
                    }
                }
            }
            catch {
                // ignore
            }
            this.setState({ historyId: null, historyInstance: instance });
        })();
    }
    // -- Helpers --
    get min() {
        return this.props.settings.minValue ?? 0;
    }
    get max() {
        return this.props.settings.maxValue ?? 100;
    }
    get levels() {
        return this.props.settings.colorLevels?.length ? this.props.settings.colorLevels : DEFAULT_LEVELS;
    }
    get displayUnit() {
        return this.props.settings.gaugeUnit || this.state.unit || '';
    }
    get displayName() {
        return (this.props.settings.gaugeName || this.props.settings.gaugeStateId?.split('.').pop() || I18n.t('wm_Gauge'));
    }
    get hasChart() {
        return !!this.state.historyId;
    }
    toFraction(raw) {
        const range = this.max - this.min;
        if (range <= 0) {
            return 0;
        }
        return Math.max(0, Math.min(1, (raw - this.min) / range));
    }
    getColor(raw) {
        const levels = this.levels;
        const { usePercentage, smoothGradient } = this.props.settings;
        const frac = this.toFraction(raw);
        if (smoothGradient) {
            return this.getInterpolatedColor(frac);
        }
        const cmp = usePercentage ? frac * 100 : raw;
        for (const lvl of levels) {
            if (cmp <= lvl.value) {
                return lvl.color;
            }
        }
        return levels[levels.length - 1]?.color || '#2196f3';
    }
    /** Sorted color stops as fractions [0..1], used for smooth-gradient interpolation */
    getStops() {
        const { usePercentage } = this.props.settings;
        return this.levels
            .map(lvl => ({
            frac: usePercentage ? Math.max(0, Math.min(1, lvl.value / 100)) : this.toFraction(lvl.value),
            color: lvl.color,
        }))
            .sort((a, b) => a.frac - b.frac);
    }
    getInterpolatedColor(frac) {
        const stops = this.getStops();
        if (!stops.length) {
            return '#2196f3';
        }
        if (frac <= stops[0].frac) {
            return stops[0].color;
        }
        if (frac >= stops[stops.length - 1].frac) {
            return stops[stops.length - 1].color;
        }
        for (let i = 0; i < stops.length - 1; i++) {
            const a = stops[i];
            const b = stops[i + 1];
            if (frac <= b.frac) {
                const range = b.frac - a.frac;
                const t = range > 0 ? (frac - a.frac) / range : 0;
                return lerpColor(a.color, b.color, t);
            }
        }
        return stops[stops.length - 1].color;
    }
    static formatValue(raw, isFloatComma, decimals) {
        if (decimals !== undefined && decimals !== null) {
            return formatFloat(raw, decimals, isFloatComma);
        }
        if (Math.abs(raw) >= 100) {
            return formatFloat(raw, 0, isFloatComma);
        }
        if (Math.abs(raw) >= 10) {
            return formatFloat(raw, 1, isFloatComma);
        }
        return formatFloat(raw, 1, isFloatComma);
    }
    onTileClick() {
        if (this.hasChart) {
            this.setState({ chartOpen: true });
        }
    }
    // -- Rendering --
    /** Convert a fraction (0..1) to a point on the arc circle */
    static arcPoint(cx, cy, r, frac) {
        // Arc spans 270 deg starting at 135 deg rotation. Fraction 0 = start, 1 = end.
        const angleDeg = frac * 270;
        const rad = (angleDeg * Math.PI) / 180;
        return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
    }
    renderArc(size) {
        const { value } = this.state;
        const accent = this.props.settings.color;
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
        return (React.createElement(Box, { sx: {
                width: size,
                height: size,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            } },
            React.createElement("svg", { viewBox: `0 0 ${vb} ${vb}`, style: { width: '100%', height: '100%', transform: 'rotate(135deg)' } },
                React.createElement("circle", { cx: cx, cy: cy, r: r, fill: "none", stroke: "currentColor", strokeWidth: sw, strokeDasharray: `${arcLength} ${circumference}`, strokeLinecap: "round", opacity: 0.12 }),
                this.props.settings.smoothGradient
                    ? this.renderSmoothSegments(vb, r, sw, circumference, arcLength, frac)
                    : this.renderColoredSegments(vb, r, sw, circumference, arcLength, frac),
                dot ? (React.createElement("circle", { cx: dot.x, cy: dot.y, r: sw / 2 + 1, fill: color, stroke: "rgba(0,0,0,0.3)", strokeWidth: 1 })) : null),
            React.createElement(Box, { sx: {
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: 'translateY(-4%)',
                } },
                this.state.value2 != null ? (React.createElement(Typography, { sx: {
                        fontWeight: 600,
                        fontSize: size * 0.12,
                        lineHeight: 1,
                        color: 'text.secondary',
                        mb: 0.25,
                    } },
                    WidgetGauge.formatValue(this.state.value2, this.props.stateContext.isFloatComma, this.props.settings.decimals),
                    this.state.unit2 ? ` ${this.state.unit2}` : '')) : null,
                React.createElement(Typography, { sx: {
                        fontWeight: 700,
                        fontSize: size * (this.state.value2 != null ? 0.19 : 0.22),
                        lineHeight: 1.1,
                        color: value != null ? color : 'text.disabled',
                    } }, value != null
                    ? WidgetGauge.formatValue(raw, this.props.stateContext.isFloatComma, this.props.settings.decimals)
                    : '\u2014'),
                this.displayUnit ? (React.createElement(Typography, { sx: {
                        fontSize: size * 0.11,
                        color: 'text.secondary',
                        lineHeight: 1,
                    } }, this.displayUnit)) : null)));
    }
    /** Render colored arc segments, clipped to the current value fraction */
    renderColoredSegments(vb, r, sw, circumference, arcLength, valueFrac) {
        const levels = this.levels;
        const { usePercentage } = this.props.settings;
        const segments = [];
        let prevFrac = 0;
        for (let i = 0; i < levels.length; i++) {
            const lvl = levels[i];
            let levelFrac;
            if (usePercentage) {
                levelFrac = Math.max(0, Math.min(1, lvl.value / 100));
            }
            else {
                levelFrac = this.toFraction(lvl.value);
            }
            // Clip segment end to current value
            const clippedEnd = Math.min(levelFrac, valueFrac);
            const segStart = prevFrac * arcLength;
            const segLen = Math.max(0, (clippedEnd - prevFrac) * arcLength);
            if (segLen > 0) {
                segments.push(React.createElement("circle", { key: i, cx: vb / 2, cy: vb / 2, r: r, fill: "none", stroke: lvl.color, strokeWidth: sw, strokeDasharray: `${segLen} ${circumference}`, strokeDashoffset: -segStart, strokeLinecap: i === 0 || clippedEnd >= valueFrac ? 'round' : 'butt', opacity: 0.85 }));
            }
            prevFrac = levelFrac;
            // No more segments needed past the value
            if (levelFrac >= valueFrac) {
                break;
            }
        }
        return segments;
    }
    /** Render the arc as many small segments with interpolated colors for a smooth gradient (no fixed boundaries) */
    renderSmoothSegments(vb, r, sw, circumference, arcLength, valueFrac) {
        if (valueFrac <= 0) {
            return [];
        }
        const segments = [];
        const totalSegments = Math.max(1, Math.ceil(GRADIENT_SEGMENTS * valueFrac));
        const cx = vb / 2;
        const cy = vb / 2;
        for (let i = 0; i < totalSegments; i++) {
            const startFrac = (i / GRADIENT_SEGMENTS) * 1;
            const endFrac = Math.min((i + 1) / GRADIENT_SEGMENTS, valueFrac);
            if (endFrac <= startFrac) {
                continue;
            }
            const midFrac = (startFrac + endFrac) / 2;
            const color = this.getInterpolatedColor(midFrac);
            const segStart = startFrac * arcLength;
            // Slight overlap (0.5) to hide seams between adjacent segments
            const segLen = (endFrac - startFrac) * arcLength + 0.5;
            const isFirst = i === 0;
            const isLast = i === totalSegments - 1;
            segments.push(React.createElement("circle", { key: i, cx: cx, cy: cy, r: r, fill: "none", stroke: color, strokeWidth: sw, strokeDasharray: `${segLen} ${circumference}`, strokeDashoffset: -segStart, strokeLinecap: isFirst || isLast ? 'round' : 'butt', opacity: 0.85 }));
        }
        return segments;
    }
    renderChartDialog() {
        const { chartOpen, historyId, historyInstance } = this.state;
        if (!chartOpen || !historyId || !historyInstance || !this.props.stateContext) {
            return null;
        }
        return (React.createElement(ChartDialog, { open: true, onClose: () => this.setState({ chartOpen: false }), title: this.displayName, historyIds: [{ id: historyId, color: this.props.settings.color || '#2196f3', name: this.displayName }], historyInstance: historyInstance, socket: this.props.stateContext.getSocket(), unit: this.displayUnit, widgetId: String(this.props.widget.id), instanceId: this.props.stateContext.instanceId }));
    }
    // -- 1x1 compact --
    renderCompact() {
        const clickable = this.hasChart;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        return (React.createElement(Box, { id: String(this.props.widget.id), sx: theme => WidgetGeneric.getStyleCompact(theme) },
            React.createElement(Box, { onClick: clickable ? () => this.onTileClick() : undefined, sx: theme => ({
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
                    ...this.applyTileStyles(theme, this.state.value != null, { interactive: clickable }),
                }) },
                indicators,
                React.createElement(Box, { sx: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, this.renderArc(100)),
                React.createElement(Box, null,
                    React.createElement(Typography, { variant: "body2", noWrap: true, sx: theme => ({
                            fontWeight: 600,
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            fontSize: 'max(0.875rem, 9cqi)',
                            ...(isNeumorphicTheme(theme)
                                ? {
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    fontSize: 'max(0.7rem, 7cqi)',
                                }
                                : {}),
                        }) }, this.displayName)))));
    }
    // -- 2x0.5 wide --
    renderWide() {
        const { value } = this.state;
        const raw = value ?? this.min;
        const color = value != null ? this.getColor(raw) : undefined;
        const clickable = this.hasChart;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        return (React.createElement(Box, { id: String(this.props.widget.id), sx: theme => WidgetGeneric.getStyleWide(theme) },
            React.createElement(Box, { onClick: clickable ? () => this.onTileClick() : undefined, sx: theme => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    width: '100%',
                    height: 80,
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: clickable ? 'pointer' : 'default',
                    ...this.applyTileStyles(theme, value != null, { interactive: clickable }),
                }) },
                indicators,
                this.renderArc(56),
                React.createElement(Box, { sx: { flex: 1, minWidth: 0 } },
                    React.createElement(Typography, { variant: "body2", noWrap: true, sx: theme => ({
                            fontWeight: 600,
                            ...(isNeumorphicTheme(theme)
                                ? {
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    fontSize: '0.75rem',
                                }
                                : {}),
                        }) }, this.displayName),
                    React.createElement(Typography, { variant: "h6", sx: { fontWeight: 700, color, lineHeight: 1.2 } }, value != null
                        ? `${WidgetGauge.formatValue(raw, this.props.stateContext.isFloatComma, this.props.settings.decimals)} ${this.displayUnit}`
                        : '\u2014')))));
    }
    // -- 2x1 wide tall --
    renderWideTall() {
        const clickable = this.hasChart;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        return (React.createElement(Box, { id: String(this.props.widget.id), sx: theme => WidgetGeneric.getStyleWideTall(theme) },
            React.createElement(Box, { sx: { width: 'calc(50% - 6px)', aspectRatio: '1' } }),
            React.createElement(Box, { onClick: clickable ? () => this.onTileClick() : undefined, sx: theme => ({
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    overflow: 'hidden',
                    cursor: clickable ? 'pointer' : 'default',
                    ...this.applyTileStyles(theme, this.state.value != null, { interactive: clickable }),
                    padding: isNeumorphicTheme(theme) ? 'max(12px, 4cqi)' : 'max(16px, 5cqi)',
                }) },
                indicators,
                React.createElement(Box, { sx: { flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, this.renderArc(120)),
                React.createElement(Box, { sx: { flex: 1, minWidth: 0 } },
                    React.createElement(Typography, { variant: "body2", noWrap: true, sx: theme => ({
                            fontWeight: 600,
                            fontSize: 'max(0.875rem, 4.5cqi)',
                            ...(isNeumorphicTheme(theme)
                                ? {
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    fontSize: 'max(0.7rem, 3.5cqi)',
                                }
                                : {}),
                        }) }, this.displayName),
                    this.renderLevelLegend()))));
    }
    renderLevelLegend() {
        const levels = this.levels;
        const { usePercentage } = this.props.settings;
        return (React.createElement(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 } }, levels.map((lvl, i) => (React.createElement(Box, { key: i, sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
            React.createElement(Box, { sx: {
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: lvl.color,
                    flexShrink: 0,
                } }),
            React.createElement(Typography, { variant: "caption", sx: { color: 'text.secondary', lineHeight: 1.2 } }, usePercentage ? `${lvl.value}%` : `${lvl.value} ${this.displayUnit}`))))));
    }
}
export default WidgetGauge;
//# sourceMappingURL=Gauge.js.map