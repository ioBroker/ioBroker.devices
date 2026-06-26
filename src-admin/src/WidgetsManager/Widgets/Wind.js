import React from 'react';
import { Box, Typography } from '@mui/material';
import { I18n } from '@iobroker/adapter-react-v5';
import WidgetGeneric, { formatFloat } from './Generic';
import { hideBaseFields } from '../configUtils';
/** Helper: polar to cartesian */
function polar(cx, cy, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
}
export class WidgetWind extends WidgetGeneric {
    static getConfigSchema() {
        return {
            type: 'panel',
            label: 'wm_Wind',
            items: {
                // Wind is a passive display widget — no active state, no tint.
                ...hideBaseFields('colorActive', 'color'),
                directionStateId: { type: 'objectId', label: 'wm_Wind direction' },
                speedStateId: { type: 'objectId', label: 'wm_Wind speed' },
                gustsStateId: { type: 'objectId', label: 'wm_Wind gusts' },
            },
        };
    }
    dirHandler = null;
    speedHandler = null;
    gustsHandler = null;
    constructor(props) {
        super(props);
        this.state = {
            ...this.state,
            direction: null,
            speed: null,
            gusts: null,
            speedUnit: '',
            gustsUnit: '',
        };
    }
    componentDidMount() {
        super.componentDidMount();
        this.subscribe();
    }
    componentDidUpdate(prevProps) {
        if (prevProps.settings.directionStateId !== this.props.settings.directionStateId ||
            prevProps.settings.speedStateId !== this.props.settings.speedStateId ||
            prevProps.settings.gustsStateId !== this.props.settings.gustsStateId) {
            this.unsubscribe(prevProps.settings);
            this.subscribe();
        }
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        this.unsubscribe(this.props.settings);
    }
    subscribe() {
        const ctx = this.props.stateContext;
        if (!ctx) {
            return;
        }
        if (this.props.settings.directionStateId) {
            this.dirHandler = (_id, state) => {
                this.setState({ direction: state?.val != null ? Number(state.val) : null });
            };
            ctx.getState(this.props.settings.directionStateId, this.dirHandler);
        }
        if (this.props.settings.speedStateId) {
            this.speedHandler = (_id, state) => {
                this.setState({ speed: state?.val != null ? Number(state.val) : null });
            };
            ctx.getState(this.props.settings.speedStateId, this.speedHandler);
            void ctx
                .getObject(this.props.settings.speedStateId)
                .then(obj => {
                if (obj?.common?.unit) {
                    this.setState({ speedUnit: obj.common.unit });
                }
            })
                .catch(() => { });
        }
        if (this.props.settings.gustsStateId) {
            this.gustsHandler = (_id, state) => {
                this.setState({ gusts: state?.val != null ? Number(state.val) : null });
            };
            ctx.getState(this.props.settings.gustsStateId, this.gustsHandler);
            void ctx
                .getObject(this.props.settings.gustsStateId)
                .then(obj => {
                if (obj?.common?.unit) {
                    this.setState({ gustsUnit: obj.common.unit });
                }
            })
                .catch(() => { });
        }
    }
    unsubscribe(settings) {
        const ctx = this.props.stateContext;
        if (!ctx) {
            return;
        }
        if (settings.directionStateId && this.dirHandler) {
            ctx.removeState(settings.directionStateId, this.dirHandler);
            this.dirHandler = null;
        }
        if (settings.speedStateId && this.speedHandler) {
            ctx.removeState(settings.speedStateId, this.speedHandler);
            this.speedHandler = null;
        }
        if (settings.gustsStateId && this.gustsHandler) {
            ctx.removeState(settings.gustsStateId, this.gustsHandler);
            this.gustsHandler = null;
        }
    }
    /**
     * Full compass SVG — Apple Watch style.
     * Speed & unit rendered as SVG text inside the center circle.
     * isDark controls palette (dark bg with light elements vs. light bg with dark elements).
     */
    static renderCompass(size, dirDeg, speed, speedUnit, gusts, gustsUnit, isDark, isFloatComma) {
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
        const ticks = [];
        for (let deg = 0; deg < 360; deg += 2) {
            const isCardinal = deg % 90 === 0;
            const is30 = deg % 30 === 0;
            const is10 = deg % 10 === 0;
            let innerR;
            let width;
            let color;
            if (isCardinal) {
                innerR = tickOuterR - 10;
                width = 2;
                color = tickBright;
            }
            else if (is30) {
                innerR = tickOuterR - 7;
                width = 1.5;
                color = tickBright;
            }
            else if (is10) {
                innerR = tickOuterR - 5;
                width = 1;
                color = tickColor;
            }
            else {
                innerR = tickOuterR - 3;
                width = 0.6;
                color = tickColor;
            }
            const p1 = polar(cx, cy, innerR, deg);
            const p2 = polar(cx, cy, tickOuterR, deg);
            ticks.push(React.createElement("line", { key: deg, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, stroke: color, strokeWidth: width, strokeLinecap: "butt" }));
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
        let arrow = null;
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
            arrow = (React.createElement("g", null,
                React.createElement("line", { x1: tail.x, y1: tail.y, x2: tip.x, y2: tip.y, stroke: arrowColor, strokeWidth: 2.5, strokeLinecap: "round" }),
                React.createElement("polygon", { points: `${tip.x},${tip.y} ${hw1x},${hw1y} ${hw2x},${hw2y}`, fill: arrowColor }),
                React.createElement("circle", { cx: tail.x, cy: tail.y, r: circleR, fill: "none", stroke: arrowColor, strokeWidth: 2.5 })));
        }
        // Speed display text
        const speedStr = speed != null ? String(Math.round(speed)) : '–';
        return (React.createElement("svg", { viewBox: "0 0 200 200", style: { width: size, height: size, display: 'block' } },
            React.createElement("circle", { cx: cx, cy: cy, r: outerR, fill: bgColor }),
            React.createElement("circle", { cx: cx, cy: cy, r: outerR, fill: "none", stroke: ringColor, strokeWidth: 8 }),
            ticks,
            React.createElement("polygon", { points: `${nTriTop.x},${nTriTop.y} ${nTriL.x},${nTriL.y} ${nTriR.x},${nTriR.y}`, fill: "#e53935" }),
            labels.map(l => {
                const p = polar(cx, cy, 62, l.angle);
                return (React.createElement("text", { key: l.label, x: p.x, y: p.y, textAnchor: "middle", dominantBaseline: "central", fill: l.color || labelColor, fontSize: 14, fontWeight: 700, fontFamily: "system-ui, sans-serif" }, l.label));
            }),
            arrow,
            React.createElement("circle", { cx: cx, cy: cy, r: 38, fill: centerBg }),
            React.createElement("text", { x: cx, y: cy - 4, textAnchor: "middle", dominantBaseline: "central", fill: speedColor, fontSize: 36, fontWeight: 700, fontFamily: "system-ui, sans-serif" }, speedStr),
            React.createElement("text", { x: cx, y: cy + 20, textAnchor: "middle", dominantBaseline: "central", fill: unitColor, fontSize: 11, fontFamily: "system-ui, sans-serif" }, speedUnit || ''),
            gusts != null ? (React.createElement("text", { x: cx, y: cy + 48, textAnchor: "middle", dominantBaseline: "central", fill: unitColor, fontSize: 9, fontFamily: "system-ui, sans-serif" }, `${formatFloat(Math.round(gusts * 10) / 10, 1, isFloatComma)}${gustsUnit ? ` ${gustsUnit}` : ''}`)) : null));
    }
    static formatValue(val, unit, isFloatComma) {
        if (val == null) {
            return '–';
        }
        const rounded = Math.round(val * 10) / 10;
        const str = formatFloat(rounded, 1, isFloatComma);
        return unit ? `${str} ${unit}` : str;
    }
    // --- Compact 1x1 layout: compass fills the whole tile ---
    renderCompact() {
        const { direction, speed, gusts, speedUnit, gustsUnit } = this.state;
        const hasData = this.props.settings.directionStateId ||
            this.props.settings.speedStateId ||
            this.props.settings.gustsStateId;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        return (React.createElement(Box, { id: String(this.props.widget.id), className: "widget-wind", sx: theme => WidgetGeneric.getStyleCompact(theme) },
            React.createElement(Box, { sx: theme => ({
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    aspectRatio: '1',
                    overflow: 'hidden',
                    ...this.applyTileStyles(theme, false, { interactive: false }),
                    p: 0,
                }) },
                indicators,
                hasData ? (React.createElement(Box, { sx: {
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        '& > svg': { width: '100%', height: '100%' },
                    } }, WidgetWind.renderCompass('100%', direction, speed, speedUnit, gusts, gustsUnit, true, // always dark bg for the compass instrument
                this.props.stateContext.isFloatComma))) : (React.createElement(Typography, { variant: "caption", sx: theme => ({ color: theme.palette.text.secondary }) }, I18n.t('wm_Not configured'))))));
    }
    // --- Wide 2x0.5 layout: compass left, details right ---
    renderWide() {
        const { direction, speed, gusts, speedUnit, gustsUnit } = this.state;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        return (React.createElement(Box, { id: String(this.props.widget.id), className: "widget-wind", sx: theme => WidgetGeneric.getStyleWide(theme) },
            React.createElement(Box, { sx: theme => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    width: '100%',
                    height: 80,
                    overflow: 'hidden',
                    px: 0.5,
                    ...this.applyTileStyles(theme, false, { interactive: false }),
                }) },
                indicators,
                React.createElement(Box, { sx: { flexShrink: 0, display: 'flex', alignItems: 'center', height: '100%', py: 0.5 } }, WidgetWind.renderCompass(72, direction, speed, speedUnit, gusts, gustsUnit, true, this.props.stateContext.isFloatComma)),
                React.createElement(Box, { sx: { flex: 1, minWidth: 0 } },
                    this.props.settings.speedStateId ? (React.createElement(Box, { sx: { display: 'flex', alignItems: 'baseline', gap: 0.5 } },
                        React.createElement(Typography, { variant: "caption", sx: theme => ({ color: theme.palette.text.secondary, fontSize: '0.7rem' }) },
                            I18n.t('wm_Speed'),
                            ":"),
                        React.createElement(Typography, { sx: { fontWeight: 600, fontSize: '0.9rem' } }, WidgetWind.formatValue(speed, speedUnit, this.props.stateContext.isFloatComma)))) : null,
                    this.props.settings.gustsStateId ? (React.createElement(Box, { sx: { display: 'flex', alignItems: 'baseline', gap: 0.5 } },
                        React.createElement(Typography, { variant: "caption", sx: theme => ({ color: theme.palette.text.secondary, fontSize: '0.7rem' }) },
                            I18n.t('wm_Wind gusts'),
                            ":"),
                        React.createElement(Typography, { sx: { fontSize: '0.85rem' } }, WidgetWind.formatValue(gusts, gustsUnit, this.props.stateContext.isFloatComma)))) : null,
                    direction != null ? (React.createElement(Typography, { variant: "caption", sx: theme => ({ color: theme.palette.text.secondary, fontSize: '0.7rem' }) },
                        Math.round(direction),
                        "\u00B0")) : null))));
    }
    // --- Wide tall 2x1 layout: compass left, details right ---
    renderWideTall() {
        const { direction, speed, gusts, speedUnit, gustsUnit } = this.state;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        return (React.createElement(Box, { id: String(this.props.widget.id), className: "widget-wind", sx: theme => WidgetGeneric.getStyleWideTall(theme) },
            React.createElement(Box, { sx: { width: 'calc(50% - 6px)', aspectRatio: '1' } }),
            React.createElement(Box, { sx: theme => ({
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    overflow: 'hidden',
                    px: 0.5,
                    ...this.applyTileStyles(theme, false, { interactive: false }),
                }) },
                indicators,
                React.createElement(Box, { sx: {
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        py: 0.5,
                        '& > svg': { width: 'auto', height: '100%' },
                    } }, WidgetWind.renderCompass('100%', direction, speed, speedUnit, gusts, gustsUnit, true, this.props.stateContext.isFloatComma)),
                React.createElement(Box, { sx: { flex: 1, minWidth: 0, overflow: 'hidden' } },
                    this.props.settings.speedStateId ? (React.createElement(Typography, { noWrap: true, style: {
                            display: 'flex',
                            marginBottom: 2.6,
                            fontSize: '0.85rem',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        } },
                        React.createElement(Box, { component: "span", sx: theme => ({ color: theme.palette.text.secondary }) },
                            I18n.t('wm_Speed'),
                            ":"),
                        ' ',
                        React.createElement(Box, { component: "span", sx: { fontWeight: 700, minWidth: 40 } }, WidgetWind.formatValue(speed, speedUnit, this.props.stateContext.isFloatComma)))) : null,
                    this.props.settings.gustsStateId ? (React.createElement(Typography, { noWrap: true, style: {
                            display: 'flex',
                            marginBottom: 2.6,
                            fontSize: '0.85rem',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        } },
                        React.createElement(Box, { component: "span", sx: theme => ({ color: theme.palette.text.secondary }) },
                            I18n.t('wm_Wind gusts'),
                            ":"),
                        ' ',
                        React.createElement(Box, { component: "span", sx: { fontWeight: 700, minWidth: 40 } }, WidgetWind.formatValue(gusts, gustsUnit, this.props.stateContext.isFloatComma)))) : null,
                    direction != null ? (React.createElement(Typography, { noWrap: true, style: {
                            display: 'flex',
                            marginBottom: 2.6,
                            fontSize: '0.85rem',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        } },
                        React.createElement(Box, { component: "span", sx: theme => ({ color: theme.palette.text.secondary }) },
                            I18n.t('wm_Direction'),
                            ":"),
                        ' ',
                        React.createElement(Box, { component: "span", sx: { fontWeight: 700, minWidth: 40 } },
                            Math.round(direction),
                            "\u00B0"))) : null))));
    }
}
export default WidgetWind;
//# sourceMappingURL=Wind.js.map