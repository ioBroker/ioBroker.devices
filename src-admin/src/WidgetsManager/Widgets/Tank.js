import React from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { I18n } from '@iobroker/adapter-react-v5';
import WidgetGeneric, { formatFloat, isNeumorphicTheme, } from './Generic';
/** Color based on fill level */
function getFillColor(percent, accent) {
    if (accent) {
        return accent;
    }
    if (percent <= 15) {
        return '#f44336'; // low — red
    }
    if (percent <= 30) {
        return '#ff9800'; // warning — orange
    }
    return '#2196f3'; // normal — blue
}
/** SVG tank icon: rounded rect outline with fill level + wave inside */
function TankIcon(props) {
    const { level, fillColor, id, animate = true } = props;
    const vb = 100;
    const wall = 6;
    const r = 14;
    const innerW = vb - wall * 2;
    const innerH = vb - wall * 2;
    const fillH = (level / 100) * innerH;
    const clipId = `tank-icon-clip-${id}`;
    return (React.createElement("svg", { viewBox: `0 0 ${vb} ${vb}`, style: { width: '100%', height: '100%' } },
        React.createElement("rect", { x: wall / 2, y: wall / 2, width: vb - wall, height: vb - wall, rx: r, ry: r, fill: "none", stroke: "currentColor", strokeWidth: wall, opacity: 0.3 }),
        React.createElement("defs", null,
            React.createElement("clipPath", { id: clipId },
                React.createElement("rect", { x: wall, y: wall, width: innerW, height: innerH, rx: r - 2, ry: r - 2 }))),
        React.createElement("g", { clipPath: `url(#${clipId})` },
            React.createElement("rect", { x: wall, y: wall + innerH - fillH, width: innerW, height: fillH, fill: fillColor, opacity: 0.5, style: { transition: 'y 0.5s ease, height 0.5s ease' } }),
            animate && level > 0 && level < 100 ? (React.createElement("path", { d: `M${wall},${wall + innerH - fillH} q${innerW / 4},-5 ${innerW / 2},0 t${innerW / 2},0 v5 H${wall} Z`, fill: fillColor, opacity: 0.3 },
                React.createElement("animateTransform", { attributeName: "transform", type: "translate", values: "0,0;0,3;0,0;0,-3;0,0", dur: "3s", repeatCount: "indefinite" }))) : null)));
}
/** Names handled by the base class or by Tank itself — not shown as extra states */
const HANDLED_NAMES = new Set([
    // Indicator names
    'WORKING',
    'UNREACH',
    'LOWBAT',
    'MAINTAIN',
    'ERROR',
    'DIRECTION',
    'CONNECTED',
    'BATTERY',
    // Extra info names
    'ELECTRIC_POWER',
    'CURRENT',
    'VOLTAGE',
    'CONSUMPTION',
    'FREQUENCY',
]);
export class WidgetTank extends WidgetGeneric {
    actualId;
    extraStateIds = [];
    constructor(props) {
        super(props);
        const states = props.widget.control.states;
        const actual = states.find(s => s.name === 'ACTUAL' && /value\.fill|level\.tank|tank/i.test(s.stateRole || ''));
        this.actualId = actual?.id ?? null;
        // Collect all other states that are not handled by base class or Tank
        for (const s of states) {
            if (s.id && this.actualId !== s.id && !HANDLED_NAMES.has(s.name)) {
                this.extraStateIds.push({ id: s.id, name: s.name });
            }
        }
        this.state = {
            ...this.state,
            level: 0,
            rawValue: 0,
            rawMin: 0,
            rawMax: 100,
            unit: '%',
            tankExtra: [],
        };
    }
    componentDidMount() {
        super.componentDidMount();
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onLevelChange);
        }
        void this.loadObjectConfig();
        void this.loadExtraStates();
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onLevelChange);
        }
        for (const s of this.extraStateIds) {
            this.props.stateContext.removeState(s.id, this.onExtraStateChange);
        }
    }
    static getDefaultSettings() {
        return {
            ...WidgetGeneric.getDefaultSettings(),
            showAnimation: true,
        };
    }
    static getConfigSchema() {
        return {
            name: 'Tank',
            schema: {
                type: 'panel',
                items: {
                    showAnimation: {
                        type: 'checkbox',
                        label: 'wm_Show animation',
                        default: true,
                    },
                },
            },
        };
    }
    async loadExtraStates() {
        const entries = [];
        for (const { id, name } of this.extraStateIds) {
            let unit = '';
            let label = name;
            try {
                const obj = (await this.props.stateContext.getSocket().getObject(id));
                if (obj?.common) {
                    unit = obj.common.unit || '';
                    const n = obj.common.name;
                    if (n) {
                        label = typeof n === 'object' ? n[I18n.getLanguage()] || n.en || name : n;
                    }
                }
            }
            catch {
                // ignore
            }
            entries.push({ id, name, label, unit, value: null });
            this.props.stateContext.getState(id, this.onExtraStateChange);
        }
        if (entries.length) {
            this.setState({ tankExtra: entries });
        }
    }
    onExtraStateChange = (id, state) => {
        this.setState(prev => ({
            tankExtra: prev.tankExtra.map(e => (e.id === id ? { ...e, value: state.val } : e)),
        }));
    };
    async loadObjectConfig() {
        if (!this.actualId) {
            return;
        }
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(this.actualId));
            if (obj?.common) {
                const min = obj.common.min != null ? Number(obj.common.min) : 0;
                const max = obj.common.max != null ? Number(obj.common.max) : 100;
                const unit = obj.common.unit || '%';
                if (!isNaN(min) && !isNaN(max) && max > min) {
                    this.setState({ rawMin: min, rawMax: max, unit });
                }
            }
        }
        catch {
            // ignore
        }
    }
    rawToPercent(raw) {
        const { rawMin, rawMax } = this.state;
        const range = rawMax - rawMin;
        if (range <= 0) {
            return 0;
        }
        return Math.max(0, Math.min(100, Math.round(((raw - rawMin) / range) * 100)));
    }
    onLevelChange = (_id, state) => {
        const rawValue = Number(state.val) || 0;
        const level = this.rawToPercent(rawValue);
        if (level !== this.state.level || rawValue !== this.state.rawValue) {
            this.setState({ level, rawValue });
        }
    };
    getHistoryIds() {
        if (!this.actualId) {
            return [];
        }
        return [{ id: this.actualId, color: this.getAccentColor() || '#2196f3' }];
    }
    isTileActive() {
        return this.state.level > 0;
    }
    renderExtraStates() {
        const { tankExtra } = this.state;
        const visible = tankExtra.filter(e => e.value != null);
        if (!visible.length) {
            return null;
        }
        return (React.createElement(Box, { sx: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '2px',
            } }, visible.map(e => {
            const val = typeof e.value === 'number'
                ? Number.isInteger(e.value)
                    ? e.value
                    : formatFloat(e.value, 1, this.props.stateContext.isFloatComma)
                : typeof e.value === 'boolean'
                    ? e.value
                        ? I18n.t('wm_On')
                        : I18n.t('wm_Off')
                    : String(e.value);
            return (React.createElement(Typography, { key: e.id, variant: "caption", sx: {
                    fontSize: 'max(0.55rem, 6cqi)',
                    lineHeight: 1.2,
                    opacity: 0.7,
                    whiteSpace: 'nowrap',
                } },
                val,
                e.unit ? ` ${e.unit}` : ''));
        })));
    }
    getDisplayValue() {
        const { level, rawValue, unit } = this.state;
        if (unit === '%') {
            return `${level}%`;
        }
        return `${Number.isInteger(rawValue) ? rawValue : formatFloat(rawValue, 1, this.props.stateContext.isFloatComma)} ${unit}`;
    }
    shouldAnimate() {
        return this.props.settings?.showAnimation !== false;
    }
    /** Background fill from bottom — used on all tile sizes */
    renderFillBackground(fillColor) {
        const { level } = this.state;
        const animate = this.shouldAnimate();
        return (React.createElement(Box, { sx: {
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${level}%`,
                backgroundColor: fillColor,
                opacity: 0.15,
                borderRadius: '0 0 14px 14px',
                transition: 'height 0.5s ease',
                pointerEvents: 'none',
                overflow: 'hidden',
            } }, animate && level > 0 && level < 100 ? (React.createElement("svg", { viewBox: "0 0 200 10", preserveAspectRatio: "none", style: { position: 'absolute', top: -5, left: 0, width: '100%', height: 10 } },
            React.createElement("path", { d: "M0,5 q25,-5 50,0 t50,0 t50,0 t50,0 v10 H0 Z", fill: fillColor, opacity: 0.4 },
                React.createElement("animateTransform", { attributeName: "transform", type: "translate", values: "0,0;-50,0", dur: "3s", repeatCount: "indefinite" })))) : null));
    }
    // --- Tile overrides (used by base class renderWide / renderWideTall) ---
    renderTileIcon() {
        const baseIcon = this.renderBaseIcon();
        if (baseIcon) {
            return baseIcon;
        }
        const { level } = this.state;
        const fillColor = getFillColor(level, this.getAccentColor());
        return (React.createElement(Box, { sx: { width: '1em', height: '1em' } },
            React.createElement(TankIcon, { level: level, fillColor: fillColor, id: this.props.widget.id, animate: this.shouldAnimate() })));
    }
    renderTileStatus() {
        const { level } = this.state;
        const fillColor = getFillColor(level, this.getAccentColor());
        return (React.createElement(Typography, { variant: "caption", sx: {
                fontWeight: 500,
                color: level > 0 ? fillColor : 'text.secondary',
                transition: 'color 0.25s ease',
            } }, level > 0 ? this.getDisplayValue() : I18n.t('wm_Off')));
    }
    renderTileAction() {
        return (React.createElement(Typography, { variant: "h5", sx: { fontWeight: 700, whiteSpace: 'nowrap' } }, this.getDisplayValue()));
    }
    // --- 1x1 compact ---
    renderCompact() {
        const { name, level } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const extraStates = this.renderExtraStates();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton, extraStates);
        const fillColor = getFillColor(level, accent);
        const chartAction = this.hasChartAction();
        return (React.createElement(Box, { id: String(this.props.widget.id), className: this.getWidgetClass(), sx: theme => WidgetGeneric.getStyleCompact(theme) },
            React.createElement(ButtonBase, { component: "div", disableRipple: !chartAction, onClick: chartAction ? () => this.setState({ chartDialogOpen: true }) : undefined, sx: theme => ({
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'stretch',
                    width: '100%',
                    aspectRatio: '1',
                    textAlign: 'left',
                    overflow: 'hidden',
                    position: 'relative',
                    cursor: chartAction ? 'pointer' : 'default',
                    ...this.applyTileStyles(theme, isActive),
                    ...(!chartAction && { '&:active': { transform: 'none' } }),
                    padding: isNeumorphicTheme(theme) ? 'max(12px, 8cqi)' : 'max(16px, 10cqi)',
                }) },
                this.renderFillBackground(fillColor),
                indicators,
                React.createElement(Box, { sx: {
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 1,
                        position: 'relative',
                        zIndex: 1,
                    } },
                    React.createElement(Box, { sx: { width: 'max(56px, 34cqi)', height: 'max(56px, 34cqi)' } },
                        React.createElement(TankIcon, { level: level, fillColor: fillColor, id: `compact-${this.props.widget.id}`, animate: this.shouldAnimate() })),
                    React.createElement(Typography, { variant: "body2", sx: {
                            fontWeight: 700,
                            fontSize: 'max(1.2rem, 14cqi)',
                            mt: 0.5,
                            color: isActive ? fillColor : 'text.secondary',
                            transition: 'color 0.25s ease',
                        } }, isActive ? this.getDisplayValue() : I18n.t('wm_Off'))),
                React.createElement(Box, { sx: { position: 'relative', zIndex: 1 } },
                    React.createElement(Typography, { ref: this.nameRef, variant: "body2", sx: theme => ({
                            fontWeight: 600,
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            fontSize: 'max(0.875rem, 9cqi)',
                            ...(isNeumorphicTheme(theme)
                                ? {
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    fontSize: 'max(0.6rem, 6cqi)',
                                }
                                : {}),
                        }) }, this.props.settings?.name || name || '...')),
                this.renderChart())));
    }
    // --- 2x0.5 wide ---
    renderWide() {
        const { name, level } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const extraStates = this.renderExtraStates();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton, extraStates);
        const fillColor = getFillColor(level, accent);
        const chartAction = this.hasChartAction();
        return (React.createElement(Box, { id: String(this.props.widget.id), className: this.getWidgetClass(), sx: theme => WidgetGeneric.getStyleWide(theme) },
            React.createElement(ButtonBase, { component: "div", disableRipple: !chartAction, onClick: chartAction ? () => this.setState({ chartDialogOpen: true }) : undefined, sx: theme => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    width: '100%',
                    height: 80,
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: chartAction ? 'pointer' : 'default',
                    ...this.applyTileStyles(theme, isActive),
                    ...(!chartAction && { '&:active': { transform: 'none' } }),
                }) },
                this.renderFillBackground(fillColor),
                React.createElement(Box, { sx: {
                        flexShrink: 0,
                        fontSize: 'max(32px, 10cqi)',
                        position: 'relative',
                        zIndex: 1,
                        '& .MuiSvgIcon-root': { fontSize: 'inherit !important' },
                    } }, this.renderTileIcon()),
                React.createElement(Box, { sx: { flex: 1, minWidth: 0, position: 'relative', zIndex: 1 } },
                    React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
                        React.createElement(Typography, { ref: this.nameRef, variant: "body2", sx: { fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap' } }, this.props.settings?.name || name || '...'),
                        indicators),
                    this.renderTileStatus()),
                extraStates ? React.createElement(Box, { sx: { position: 'relative', zIndex: 1 } }, extraStates) : null,
                React.createElement(Box, { sx: { position: 'relative', zIndex: 1 } }, this.renderTileAction()),
                this.renderChart())));
    }
    // --- 2x1 wideTall ---
    renderWideTall() {
        const { name, level } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const extraStates = this.renderExtraStates();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton, extraStates);
        const fillColor = getFillColor(level, accent);
        const chartAction = this.hasChartAction();
        return (React.createElement(Box, { id: String(this.props.widget.id), className: this.getWidgetClass(), sx: theme => WidgetGeneric.getStyleWideTall(theme) },
            React.createElement(Box, { sx: { width: 'calc(50% - 6px)', aspectRatio: '1' } }),
            React.createElement(ButtonBase, { component: "div", disableRipple: !chartAction, onClick: chartAction ? () => this.setState({ chartDialogOpen: true }) : undefined, sx: theme => ({
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 2,
                    width: '100%',
                    height: '100%',
                    textAlign: 'left',
                    overflow: 'hidden',
                    cursor: chartAction ? 'pointer' : 'default',
                    ...this.applyTileStyles(theme, isActive),
                    ...(!chartAction && { '&:active': { transform: 'none' } }),
                    padding: 'max(16px, 5cqi)',
                }) },
                this.renderFillBackground(fillColor),
                indicators,
                React.createElement(Box, { sx: {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: 'max(48px, 16cqi)',
                        position: 'relative',
                        zIndex: 1,
                        '& .MuiSvgIcon-root': { fontSize: 'inherit !important' },
                    } }, this.renderTileIcon()),
                React.createElement(Box, { sx: { flex: 1, minWidth: 0, position: 'relative', zIndex: 1 } },
                    React.createElement(Typography, { ref: this.nameRef, variant: "body2", sx: {
                            fontWeight: 600,
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            fontSize: 'max(0.875rem, 4.5cqi)',
                        } }, this.props.settings?.name || name || '...'),
                    this.renderTileStatus()),
                React.createElement(Box, { sx: { position: 'relative', zIndex: 1 } }, this.renderTileAction()),
                this.renderChart())));
    }
}
export default WidgetTank;
//# sourceMappingURL=Tank.js.map