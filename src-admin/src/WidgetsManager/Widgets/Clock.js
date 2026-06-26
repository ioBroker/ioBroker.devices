import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { WbSunny, NightsStay } from '@mui/icons-material';
// @ts-expect-error no types
import { getTimes } from 'suncalc2';
import WidgetGeneric, {} from './Generic';
import { hideBaseFields } from '../configUtils';
const getTimesTypes = getTimes;
const SUN_LABELS = {
    en: { rise: 'Sunrise', set: 'Sunset' },
    de: { rise: 'Sonnenaufgang', set: 'Sonnenuntergang' },
    ru: { rise: 'Восход', set: 'Закат' },
    pt: { rise: 'Nascer do sol', set: 'Pôr do sol' },
    nl: { rise: 'Zonsopgang', set: 'Zonsondergang' },
    fr: { rise: 'Lever du soleil', set: 'Coucher du soleil' },
    it: { rise: 'Alba', set: 'Tramonto' },
    es: { rise: 'Amanecer', set: 'Atardecer' },
    pl: { rise: 'Wschód słońca', set: 'Zachód słońca' },
    uk: { rise: 'Схід сонця', set: 'Захід сонця' },
    'zh-cn': { rise: '日出', set: '日落' },
};
export class WidgetClock extends WidgetGeneric {
    static getConfigSchema() {
        return {
            type: 'panel',
            label: 'wm_Clock',
            items: {
                // Clock has no active/inactive state — hide the base color fields.
                ...hideBaseFields('colorActive', 'color'),
                style: {
                    type: 'select',
                    label: 'wm_Style',
                    options: [
                        { value: 'digital', label: 'wm_Digital' },
                        { value: 'analog', label: 'wm_Analog' },
                    ],
                    default: 'digital',
                    format: 'radio',
                },
                showDate: { type: 'checkbox', label: 'wm_Show date', default: true },
                showDow: { type: 'checkbox', label: 'wm_Show DOW', default: true },
                showSeconds: { type: 'checkbox', label: 'wm_Show seconds', default: true },
                showSun: {
                    type: 'checkbox',
                    label: 'wm_Show sunrise/sunset',
                    default: true,
                    hidden: 'data.size === "1x1"',
                },
            },
        };
    }
    timer = null;
    constructor(props) {
        super(props);
        this.state = {
            ...this.state,
            ...this.getCurrentTime(),
        };
    }
    componentDidMount() {
        super.componentDidMount();
        this.timer = setInterval(() => {
            this.setState(this.getCurrentTime());
        }, 1000);
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    getCurrentTime() {
        const now = new Date();
        const lang = this.props.stateContext.language;
        let sunrise = '';
        let sunset = '';
        if (this.props.settings.showSun !== false &&
            this.props.stateContext.latitude != null &&
            this.props.stateContext.longitude != null) {
            try {
                const times = getTimesTypes(now, this.props.stateContext.latitude, this.props.stateContext.longitude);
                sunrise = times.sunrise.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
                sunset = times.sunset.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
            }
            catch {
                // ignore calculation errors
            }
        }
        return {
            time: now.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }),
            dow: now.toLocaleDateString(lang, { weekday: 'short' }),
            dateStr: now.toLocaleDateString(lang, { day: 'numeric', month: 'short' }),
            seconds: now.getSeconds().toString().padStart(2, '0'),
            hours: now.getHours(),
            minutes: now.getMinutes(),
            secs: now.getSeconds(),
            sunrise,
            sunset,
        };
    }
    /** Build the display date string from dow + dateStr based on show* props */
    get displayDate() {
        const showDate = this.props.settings.showDate !== false;
        const showDow = this.props.settings.showDow !== false;
        if (showDow && showDate) {
            return `${this.state.dow}, ${this.state.dateStr}`;
        }
        if (showDow) {
            return new Date().toLocaleDateString(this.props.stateContext.language, { weekday: 'long' });
        }
        if (showDate) {
            return this.state.dateStr;
        }
        return '';
    }
    get showSeconds() {
        return this.props.settings.showSeconds !== false;
    }
    get isAnalog() {
        return this.props.settings.style === 'analog';
    }
    // --- Analog clock face SVG ---
    renderAnalogFace(size, accentColor, textColor, dimColor) {
        const { hours, minutes, secs } = this.state;
        const cx = 50;
        const cy = 50;
        // Angles in degrees (0° = 12 o'clock, clockwise)
        const secAngle = secs * 6;
        const minAngle = minutes * 6 + secs * 0.1;
        const hourAngle = (hours % 12) * 30 + minutes * 0.5;
        // Hand endpoints from center
        const hand = (angle, length) => {
            const rad = ((angle - 90) * Math.PI) / 180;
            return { x: cx + Math.cos(rad) * length, y: cy + Math.sin(rad) * length };
        };
        const hourEnd = hand(hourAngle, 22);
        const minEnd = hand(minAngle, 32);
        const secEnd = hand(secAngle, 36);
        // Hour markers
        const markers = [];
        for (let i = 0; i < 12; i++) {
            const angle = i * 30;
            const outer = hand(angle, 46);
            const inner = hand(angle, i % 3 === 0 ? 40 : 42);
            markers.push(React.createElement("line", { key: i, x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y, stroke: dimColor, strokeWidth: i % 3 === 0 ? 2 : 1, strokeLinecap: "round" }));
        }
        return (React.createElement("svg", { viewBox: "0 0 100 100", style: { ...(size ? { width: size, height: size } : {}), display: 'block' } },
            React.createElement("circle", { cx: cx, cy: cy, r: 48, fill: "none", stroke: dimColor, strokeWidth: 1.5, opacity: 0.3 }),
            markers,
            React.createElement("line", { x1: cx, y1: cy, x2: hourEnd.x, y2: hourEnd.y, stroke: textColor, strokeWidth: 3.5, strokeLinecap: "round" }),
            React.createElement("line", { x1: cx, y1: cy, x2: minEnd.x, y2: minEnd.y, stroke: textColor, strokeWidth: 2, strokeLinecap: "round" }),
            this.showSeconds ? (React.createElement("line", { x1: cx, y1: cy, x2: secEnd.x, y2: secEnd.y, stroke: accentColor, strokeWidth: 1, strokeLinecap: "round" })) : null,
            React.createElement("circle", { cx: cx, cy: cy, r: 2.5, fill: accentColor })));
    }
    renderSunInfo(fontSize) {
        if (this.props.settings.showSun === false) {
            return null;
        }
        const { sunrise, sunset } = this.state;
        if (!sunrise || !sunset) {
            return null;
        }
        return (React.createElement(Box, { sx: theme => ({
                display: 'flex',
                gap: 2,
                mt: 0.5,
                alignItems: 'center',
                color: theme.palette.text.disabled,
                fontSize: fontSize || 'max(0.7rem, 3.5cqi)',
            }) },
            React.createElement(Tooltip, { title: SUN_LABELS[this.props.stateContext.language]?.rise || 'Sunrise', arrow: true },
                React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
                    React.createElement(WbSunny, { sx: { fontSize: '1.1em', color: '#ffa726' } }),
                    React.createElement("span", null, sunrise))),
            React.createElement(Tooltip, { title: SUN_LABELS[this.props.stateContext.language]?.set || 'Sunset', arrow: true },
                React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
                    React.createElement(NightsStay, { sx: { fontSize: '1.1em', color: '#5c6bc0' } }),
                    React.createElement("span", null, sunset)))));
    }
    // --- Compact 1x1 ---
    renderCompact() {
        if (this.isAnalog) {
            return this.renderAnalogCompact();
        }
        return this.renderDigitalCompact();
    }
    // --- Wide 2x0.5 ---
    renderWide() {
        if (this.isAnalog) {
            return this.renderAnalogWide();
        }
        return this.renderDigitalWide();
    }
    // --- Wide tall 2x1 ---
    renderWideTall() {
        if (this.isAnalog) {
            return this.renderAnalogWideTall();
        }
        return this.renderDigitalWideTall();
    }
    // --- Digital renders ---
    renderDigitalCompact() {
        const { time, seconds } = this.state;
        const date = this.displayDate;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        return (React.createElement(Box, { id: String(this.props.widget.id), className: "widget-clock", sx: theme => WidgetGeneric.getStyleCompact(theme) },
            React.createElement(Box, { sx: theme => ({
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    aspectRatio: '1',
                    overflow: 'hidden',
                    ...this.applyTileStyles(theme, false, { interactive: false }),
                }) },
                indicators,
                React.createElement(Typography, { sx: {
                        fontWeight: 700,
                        lineHeight: 1,
                        fontSize: 'max(1.5rem, 16cqi)',
                        whiteSpace: 'nowrap',
                    } }, time),
                this.showSeconds ? (React.createElement(Typography, { variant: "caption", sx: theme => ({
                        color: theme.palette.text.disabled,
                        fontSize: 'max(0.65rem, 7cqi)',
                        fontVariantNumeric: 'tabular-nums',
                    }) },
                    ":",
                    seconds)) : null,
                date ? (React.createElement(Typography, { variant: "caption", sx: theme => ({
                        color: theme.palette.text.secondary,
                        mt: 0.5,
                        fontSize: 'max(0.7rem, 7cqi)',
                        whiteSpace: 'nowrap',
                    }) }, date)) : null)));
    }
    renderDigitalWide() {
        const { time, seconds } = this.state;
        const date = this.displayDate;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        return (React.createElement(Box, { id: String(this.props.widget.id), className: "widget-clock", sx: theme => WidgetGeneric.getStyleWide(theme) },
            React.createElement(Box, { sx: theme => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    width: '100%',
                    height: 80,
                    overflow: 'hidden',
                    ...this.applyTileStyles(theme, false, { interactive: false }),
                }) },
                indicators,
                React.createElement(Box, { sx: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'baseline' } },
                    React.createElement(Typography, { sx: {
                            fontWeight: 700,
                            lineHeight: 1,
                            fontSize: '2.5rem',
                            whiteSpace: 'nowrap',
                        } }, time),
                    this.showSeconds ? (React.createElement(Typography, { component: "span", variant: "caption", sx: theme => ({
                            color: theme.palette.text.disabled,
                            fontSize: '1rem',
                            fontVariantNumeric: 'tabular-nums',
                            ml: 0.5,
                        }) },
                        ":",
                        seconds)) : null),
                React.createElement(Box, { sx: { flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', pr: 1 } },
                    date ? (React.createElement(Typography, { variant: "body2", sx: theme => ({
                            color: theme.palette.text.secondary,
                            whiteSpace: 'nowrap',
                        }) }, date)) : null,
                    this.renderSunInfo('0.7rem')))));
    }
    renderDigitalWideTall() {
        const { time, seconds } = this.state;
        const date = this.displayDate;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        return (React.createElement(Box, { id: String(this.props.widget.id), className: "widget-clock", sx: theme => WidgetGeneric.getStyleWideTall(theme) },
            React.createElement(Box, { sx: { width: 'calc(50% - 6px)', aspectRatio: '1' } }),
            React.createElement(Box, { sx: theme => ({
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    ...this.applyTileStyles(theme, false, { interactive: false }),
                }) },
                indicators,
                React.createElement(Box, { sx: { display: 'flex', alignItems: 'baseline' } },
                    React.createElement(Typography, { sx: {
                            fontWeight: 700,
                            lineHeight: 1,
                            fontSize: 'max(2.5rem, 14cqi)',
                            whiteSpace: 'nowrap',
                        } }, time),
                    this.showSeconds ? (React.createElement(Typography, { component: "span", variant: "caption", sx: theme => ({
                            color: theme.palette.text.disabled,
                            fontSize: 'max(1rem, 5cqi)',
                            fontVariantNumeric: 'tabular-nums',
                            ml: 0.5,
                        }) },
                        ":",
                        seconds)) : null),
                date ? (React.createElement(Typography, { variant: "body2", sx: theme => ({
                        color: theme.palette.text.secondary,
                        fontSize: 'max(0.9rem, 5cqi)',
                        whiteSpace: 'nowrap',
                        mt: 0.5,
                    }) }, date)) : null,
                this.renderSunInfo('max(0.75rem, 4cqi)'))));
    }
    // --- Analog renders ---
    renderAnalogCompact() {
        const accent = this.props.settings.color;
        const date = this.displayDate;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        return (React.createElement(Box, { id: String(this.props.widget.id), className: "widget-clock", sx: theme => WidgetGeneric.getStyleCompact(theme) },
            React.createElement(Box, { sx: theme => ({
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    aspectRatio: '1',
                    overflow: 'hidden',
                    ...this.applyTileStyles(theme, false, { interactive: false }),
                    padding: 'max(8px, 5cqi)',
                }) },
                indicators,
                React.createElement(Box, { sx: { flex: 1, display: 'flex', alignItems: 'center' } }, this.renderAnalogFace('80cqi', accent || 'var(--mui-palette-primary-main, #1976d2)', 'currentColor', 'currentColor')),
                date ? (React.createElement(Typography, { variant: "caption", sx: theme => ({
                        color: theme.palette.text.secondary,
                        fontSize: 'max(0.6rem, 6cqi)',
                        whiteSpace: 'nowrap',
                        lineHeight: 1,
                    }) }, date)) : null)));
    }
    renderAnalogWide() {
        const { time, seconds } = this.state;
        const accent = this.props.settings.color;
        const date = this.displayDate;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        return (React.createElement(Box, { id: String(this.props.widget.id), className: "widget-clock", sx: theme => WidgetGeneric.getStyleWide(theme) },
            React.createElement(Box, { sx: theme => ({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    width: '100%',
                    height: 80,
                    overflow: 'hidden',
                    ...this.applyTileStyles(theme, false, { interactive: false }),
                }) },
                indicators,
                React.createElement(Box, { sx: { flexShrink: 0, display: 'flex', alignItems: 'center' } }, this.renderAnalogFace(56, accent || 'var(--mui-palette-primary-main, #1976d2)', 'currentColor', 'currentColor')),
                React.createElement(Box, { sx: { minWidth: 0 } },
                    React.createElement(Typography, { sx: {
                            fontWeight: 700,
                            lineHeight: 1,
                            fontSize: '1.25rem',
                            whiteSpace: 'nowrap',
                        } },
                        time,
                        this.showSeconds ? (React.createElement(Typography, { component: "span", variant: "caption", sx: theme => ({
                                color: theme.palette.text.disabled,
                                fontSize: '0.75rem',
                                fontVariantNumeric: 'tabular-nums',
                                ml: 0.5,
                            }) },
                            ":",
                            seconds)) : null),
                    date ? (React.createElement(Typography, { variant: "caption", sx: theme => ({
                            color: theme.palette.text.secondary,
                            whiteSpace: 'nowrap',
                        }) }, date)) : null),
                React.createElement(Box, { sx: { flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', pr: 1 } }, this.renderSunInfo('0.7rem')))));
    }
    renderAnalogWideTall() {
        const accent = this.props.settings.color;
        const date = this.displayDate;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        return (React.createElement(Box, { id: String(this.props.widget.id), className: "widget-clock", sx: theme => WidgetGeneric.getStyleWideTall(theme) },
            React.createElement(Box, { sx: { width: 'calc(50% - 6px)', aspectRatio: '1' } }),
            React.createElement(Box, { sx: theme => ({
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'max(8px, 3cqi)',
                    overflow: 'hidden',
                    ...this.applyTileStyles(theme, false, { interactive: false }),
                    padding: 'max(8px, 3cqi)',
                }) },
                indicators,
                React.createElement(Box, { sx: {
                        flexShrink: 0,
                        height: '80%',
                        aspectRatio: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        '& > svg': { width: '100%', height: '100%' },
                    } }, this.renderAnalogFace(null, accent || 'var(--mui-palette-primary-main, #1976d2)', 'currentColor', 'currentColor')),
                React.createElement(Box, { sx: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start' } },
                    date ? (React.createElement(Typography, { variant: "body1", sx: theme => ({
                            color: theme.palette.text.secondary,
                            fontSize: 'max(1rem, 6cqi)',
                            whiteSpace: 'nowrap',
                            lineHeight: 1.4,
                        }) }, date)) : null,
                    this.renderSunInfo('max(0.85rem, 4.5cqi)')))));
    }
}
export default WidgetClock;
//# sourceMappingURL=Clock.js.map