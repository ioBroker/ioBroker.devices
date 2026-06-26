import React from 'react';
import { Box, Typography } from '@mui/material';
import { WbCloudy, ArrowUpward, ArrowDownward } from '@mui/icons-material';
import WidgetGeneric, { isNeumorphicTheme } from './Generic';
import { hideBaseFields } from '../configUtils';
import { translateWeather } from './weatherTranslations';
/** State names for day-0 of forecast */
const DAY0_STATES = [
    'ICON',
    'TEMP_MIN',
    'TEMP_MAX',
    'TEMP',
    'DOW',
    'STATE',
    'HUMIDITY',
    'PRECIPITATION_CHANCE',
    'WIND_SPEED',
    'LOCATION',
];
export class WidgetWeatherForecast extends WidgetGeneric {
    static getConfigSchema() {
        return {
            name: 'WeatherForecast',
            schema: { type: 'panel', items: { ...hideBaseFields('colorActive', 'color') } },
        };
    }
    day0Ids = {};
    /** Multi-day states: key = "ICON1", "TEMP_MIN2", etc. */
    multiDayIds = {};
    maxDays;
    constructor(props) {
        super(props);
        const states = props.widget.control.states;
        // Collect day-0 state IDs
        for (const name of DAY0_STATES) {
            this.day0Ids[name] = states.find(s => s.name === name)?.id ?? null;
        }
        // Collect multi-day state IDs (ICON1, ICON2, ... TEMP_MIN1, etc.)
        const dayIndices = new Set();
        for (const s of states) {
            const match = /^(\w+?)(\d+)$/.exec(s.name);
            if (match && s.id) {
                const dayIdx = parseInt(match[2], 10);
                if (dayIdx >= 1 && dayIdx <= 7) {
                    this.multiDayIds[s.name] = s.id;
                    dayIndices.add(dayIdx);
                }
            }
        }
        this.maxDays = dayIndices.size > 0 ? Math.max(...dayIndices) : 0;
        const forecastDays = [];
        for (let i = 1; i <= this.maxDays; i++) {
            forecastDays.push({
                index: i,
                icon: null,
                tempMin: null,
                tempMax: null,
                dow: null,
                state: null,
                precipitationChance: null,
            });
        }
        this.state = {
            ...this.state,
            icon: null,
            tempMin: null,
            tempMax: null,
            temp: null,
            dow: null,
            weatherState: null,
            humidity: null,
            precipitationChance: null,
            windSpeed: null,
            location: null,
            forecastDays,
        };
    }
    componentDidMount() {
        super.componentDidMount();
        // Subscribe day-0
        for (const [name, id] of Object.entries(this.day0Ids)) {
            if (id) {
                this.props.stateContext.getState(id, this.makeDay0Handler(name));
            }
        }
        // Subscribe multi-day
        for (const [name, id] of Object.entries(this.multiDayIds)) {
            if (id) {
                this.props.stateContext.getState(id, this.makeMultiDayHandler(name));
            }
        }
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        for (const [name, id] of Object.entries(this.day0Ids)) {
            if (id) {
                this.props.stateContext.removeState(id, this.makeDay0Handler(name));
            }
        }
        for (const [name, id] of Object.entries(this.multiDayIds)) {
            if (id) {
                this.props.stateContext.removeState(id, this.makeMultiDayHandler(name));
            }
        }
    }
    day0Handlers = {};
    multiDayHandlers = {};
    makeDay0Handler(name) {
        if (!this.day0Handlers[name]) {
            this.day0Handlers[name] = (_id, state) => {
                const val = state.val;
                switch (name) {
                    case 'ICON':
                        this.setState({ icon: val != null ? String(val) : null });
                        break;
                    case 'TEMP_MIN': {
                        const n = val != null ? Number(val) : null;
                        this.setState({ tempMin: n != null && !isNaN(n) ? n : null });
                        break;
                    }
                    case 'TEMP_MAX': {
                        const n = val != null ? Number(val) : null;
                        this.setState({ tempMax: n != null && !isNaN(n) ? n : null });
                        break;
                    }
                    case 'TEMP': {
                        const n = val != null ? Number(val) : null;
                        this.setState({ temp: n != null && !isNaN(n) ? n : null });
                        break;
                    }
                    case 'DOW':
                        this.setState({ dow: val != null ? String(val) : null });
                        break;
                    case 'STATE':
                        this.setState({ weatherState: val != null ? String(val) : null });
                        break;
                    case 'HUMIDITY': {
                        const n = val != null ? Number(val) : null;
                        this.setState({ humidity: n != null && !isNaN(n) ? n : null });
                        break;
                    }
                    case 'PRECIPITATION_CHANCE': {
                        const n = val != null ? Number(val) : null;
                        this.setState({ precipitationChance: n != null && !isNaN(n) ? n : null });
                        break;
                    }
                    case 'WIND_SPEED': {
                        const n = val != null ? Number(val) : null;
                        this.setState({ windSpeed: n != null && !isNaN(n) ? n : null });
                        break;
                    }
                    case 'LOCATION':
                        this.setState({ location: val != null ? String(val) : null });
                        break;
                }
            };
        }
        return this.day0Handlers[name];
    }
    makeMultiDayHandler(fullName) {
        if (!this.multiDayHandlers[fullName]) {
            const match = /^(\w+?)(\d+)$/.exec(fullName);
            if (!match) {
                this.multiDayHandlers[fullName] = () => { };
                return this.multiDayHandlers[fullName];
            }
            const baseName = match[1];
            const dayIdx = parseInt(match[2], 10);
            this.multiDayHandlers[fullName] = (_id, state) => {
                const val = state.val;
                this.setState(prev => {
                    const days = [...prev.forecastDays];
                    const day = days.find(d => d.index === dayIdx);
                    if (!day) {
                        return null;
                    }
                    const updated = { ...day };
                    switch (baseName) {
                        case 'ICON':
                            updated.icon = val != null ? String(val) : null;
                            break;
                        case 'TEMP_MIN': {
                            const n = val != null ? Number(val) : null;
                            updated.tempMin = n != null && !isNaN(n) ? n : null;
                            break;
                        }
                        case 'TEMP_MAX': {
                            const n = val != null ? Number(val) : null;
                            updated.tempMax = n != null && !isNaN(n) ? n : null;
                            break;
                        }
                        case 'DOW':
                            updated.dow = val != null ? String(val) : null;
                            break;
                        case 'STATE':
                            updated.state = val != null ? String(val) : null;
                            break;
                        case 'PRECIPITATION_CHANCE': {
                            const n = val != null ? Number(val) : null;
                            updated.precipitationChance = n != null && !isNaN(n) ? n : null;
                            break;
                        }
                    }
                    return { forecastDays: days.map(d => (d.index === dayIdx ? updated : d)) };
                });
            };
        }
        return this.multiDayHandlers[fullName];
    }
    isTileActive() {
        return this.state.tempMin != null || this.state.tempMax != null;
    }
    static renderWeatherIcon(src, size) {
        if (src) {
            return (React.createElement("img", { src: src, alt: "", style: { width: size, height: size, objectFit: 'contain' } }));
        }
        return React.createElement(WbCloudy, { sx: { fontSize: size, color: 'text.secondary' } });
    }
    formatTempRange() {
        const { tempMin, tempMax } = this.state;
        if (tempMin != null && tempMax != null) {
            return `${Math.round(tempMin)}° / ${Math.round(tempMax)}°`;
        }
        if (tempMax != null) {
            return `${Math.round(tempMax)}°`;
        }
        if (tempMin != null) {
            return `${Math.round(tempMin)}°`;
        }
        return '—';
    }
    renderTileIcon() {
        const baseIcon = super.renderTileIcon();
        if (baseIcon) {
            return baseIcon;
        }
        return WidgetWeatherForecast.renderWeatherIcon(this.state.icon, 40);
    }
    renderTileStatus() {
        const size = this.props.settings?.size || '1x1';
        if (size !== '1x1') {
            return null;
        }
        return (React.createElement(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 0.25 } },
            React.createElement(Typography, { variant: "caption", sx: { fontWeight: 600, fontSize: '1rem', lineHeight: 1.2, color: 'text.primary' } }, this.formatTempRange()),
            this.state.weatherState ? (React.createElement(Typography, { variant: "caption", sx: {
                    color: 'text.secondary',
                    lineHeight: 1.1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                } }, translateWeather(this.state.weatherState))) : null));
    }
    renderTileAction() {
        const { weatherState, precipitationChance } = this.state;
        return (React.createElement(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 0.5 } },
            React.createElement(Typography, { variant: "h5", sx: { fontWeight: 700, whiteSpace: 'nowrap' } }, this.formatTempRange()),
            React.createElement(Box, { sx: { display: 'flex', gap: 1, alignItems: 'center' } },
                weatherState ? (React.createElement(Typography, { variant: "body2", sx: { color: 'text.secondary' } }, translateWeather(weatherState))) : null,
                precipitationChance != null ? (React.createElement(Typography, { variant: "caption", sx: { color: 'text.secondary' } },
                    Math.round(precipitationChance),
                    "% rain")) : null)));
    }
    renderCompact() {
        const { icon, weatherState } = this.state;
        const { name } = this.state;
        const isActive = this.isTileActive();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        return (React.createElement(Box, { id: String(this.props.widget.id), className: this.getWidgetClass(), sx: theme => WidgetGeneric.getStyleCompact(theme) },
            React.createElement(Box, { sx: theme => ({
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
                }) },
                indicators,
                React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
                    WidgetWeatherForecast.renderWeatherIcon(icon, 32),
                    React.createElement(Typography, { sx: { fontWeight: 700, fontSize: 'max(1rem, 10cqi)', lineHeight: 1.1 } }, this.formatTempRange())),
                weatherState ? (React.createElement(Typography, { variant: "caption", sx: {
                        color: 'text.secondary',
                        fontSize: 'max(0.6rem, 5.5cqi)',
                        lineHeight: 1.2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    } }, translateWeather(weatherState))) : null,
                React.createElement(Typography, { variant: "body2", sx: theme => ({
                        fontWeight: 600,
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        fontSize: 'max(0.875rem, 9cqi)',
                        textOverflow: 'ellipsis',
                        ...(isNeumorphicTheme(theme)
                            ? {
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                fontSize: 'max(0.6rem, 6cqi)',
                            }
                            : {}),
                    }) }, this.props.settings?.name || name || '...'))));
    }
    /** Render a single forecast day row */
    static renderForecastRow(day, compact) {
        const fontSize = compact ? '0.7rem' : '0.8rem';
        const iconSize = compact ? 22 : 28;
        return (React.createElement(Box, { key: day.index, sx: {
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                minWidth: 0,
            } },
            React.createElement(Typography, { variant: "caption", sx: {
                    fontWeight: 600,
                    fontSize,
                    width: compact ? 28 : 36,
                    flexShrink: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                } }, day.dow || `D${day.index}`),
            WidgetWeatherForecast.renderWeatherIcon(day.icon, iconSize),
            React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 } },
                day.tempMax != null ? (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: '2px' } },
                    React.createElement(ArrowUpward, { sx: { fontSize: 12, color: '#f44336' } }),
                    React.createElement(Typography, { variant: "caption", sx: { fontWeight: 600, fontSize } },
                        Math.round(day.tempMax),
                        "\u00B0"))) : null,
                day.tempMin != null ? (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: '2px' } },
                    React.createElement(ArrowDownward, { sx: { fontSize: 12, color: '#2196f3' } }),
                    React.createElement(Typography, { variant: "caption", sx: { fontSize, color: 'text.secondary' } },
                        Math.round(day.tempMin),
                        "\u00B0"))) : null),
            day.precipitationChance != null ? (React.createElement(Typography, { variant: "caption", sx: { fontSize: compact ? '0.6rem' : '0.7rem', color: 'text.secondary' } },
                Math.round(day.precipitationChance),
                "%")) : null));
    }
    renderWideTall() {
        const { icon, tempMin, tempMax, weatherState, forecastDays } = this.state;
        const { name } = this.state;
        const isActive = this.isTileActive();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        // Show up to 5 forecast days
        const visibleDays = forecastDays.filter(d => d.icon || d.tempMin != null || d.tempMax != null).slice(0, 5);
        return (React.createElement(Box, { id: String(this.props.widget.id), className: this.getWidgetClass(), sx: theme => WidgetGeneric.getStyleWideTall(theme) },
            React.createElement(Box, { sx: theme => ({
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    width: '100%',
                    aspectRatio: '2 / 1',
                    overflow: 'hidden',
                    ...this.applyTileStyles(theme, isActive),
                    padding: 'max(12px, 4cqi)',
                }) },
                indicators,
                React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1.5 } },
                    WidgetWeatherForecast.renderWeatherIcon(icon, 44),
                    React.createElement(Box, { sx: { flex: 1, minWidth: 0 } },
                        React.createElement(Box, { sx: { display: 'flex', alignItems: 'baseline', gap: 1 } },
                            React.createElement(Typography, { sx: { fontWeight: 700, fontSize: '1.3rem', lineHeight: 1.1 } }, tempMax != null ? `${Math.round(tempMax)}°` : '—'),
                            tempMin != null ? (React.createElement(Typography, { variant: "body2", sx: { color: 'text.secondary' } },
                                Math.round(tempMin),
                                "\u00B0")) : null),
                        weatherState ? (React.createElement(Typography, { variant: "caption", sx: {
                                color: 'text.secondary',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'block',
                            } }, translateWeather(weatherState))) : null)),
                visibleDays.length > 0 ? (React.createElement(Box, { sx: {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        overflow: 'hidden',
                        flex: 1,
                        minHeight: 0,
                        justifyContent: 'center',
                    } }, visibleDays.map(day => WidgetWeatherForecast.renderForecastRow(day, visibleDays.length > 3)))) : null,
                React.createElement(Typography, { variant: "body2", sx: {
                        fontWeight: 600,
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                    } }, this.props.settings?.name || name || '...'))));
    }
}
export default WidgetWeatherForecast;
//# sourceMappingURL=WeatherForecast.js.map