import React from 'react';
import { Box, Typography } from '@mui/material';
import { WbCloudy, ArrowUpward, ArrowDownward } from '@mui/icons-material';

import WidgetGeneric, {
    getTileStyles,
    isNeumorphicTheme,
    type WidgetGenericProps,
    type WidgetGenericState,
} from './Generic';
import { translateWeather } from './weatherTranslations';

interface ForecastDay {
    index: number;
    icon: string | null;
    tempMin: number | null;
    tempMax: number | null;
    dow: string | null;
    state: string | null;
    precipitationChance: number | null;
}

interface WidgetWeatherForecastState extends WidgetGenericState {
    // Day 0 (today)
    icon: string | null;
    tempMin: number | null;
    tempMax: number | null;
    temp: number | null;
    dow: string | null;
    weatherState: string | null;
    humidity: number | null;
    precipitationChance: number | null;
    windSpeed: number | null;
    location: string | null;
    // Multi-day
    forecastDays: ForecastDay[];
}

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
] as const;

export class WidgetWeatherForecast extends WidgetGeneric<WidgetWeatherForecastState> {
    private readonly day0Ids: Record<string, string | null> = {};
    /** Multi-day states: key = "ICON1", "TEMP_MIN2", etc. */
    private readonly multiDayIds: Record<string, string | null> = {};
    private readonly maxDays: number;

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;

        // Collect day-0 state IDs
        for (const name of DAY0_STATES) {
            this.day0Ids[name] = states.find(s => s.name === name)?.id ?? null;
        }

        // Collect multi-day state IDs (ICON1, ICON2, ... TEMP_MIN1, etc.)
        const dayIndices = new Set<number>();
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

        const forecastDays: ForecastDay[] = [];
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

    componentDidMount(): void {
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

    componentWillUnmount(): void {
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

    private day0Handlers: Record<string, (id: string, state: ioBroker.State) => void> = {};
    private multiDayHandlers: Record<string, (id: string, state: ioBroker.State) => void> = {};

    private makeDay0Handler(name: string): (id: string, state: ioBroker.State) => void {
        if (!this.day0Handlers[name]) {
            this.day0Handlers[name] = (_id: string, state: ioBroker.State) => {
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

    private makeMultiDayHandler(fullName: string): (id: string, state: ioBroker.State) => void {
        if (!this.multiDayHandlers[fullName]) {
            const match = /^(\w+?)(\d+)$/.exec(fullName);
            if (!match) {
                this.multiDayHandlers[fullName] = () => {};
                return this.multiDayHandlers[fullName];
            }
            const baseName = match[1];
            const dayIdx = parseInt(match[2], 10);

            this.multiDayHandlers[fullName] = (_id: string, state: ioBroker.State) => {
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

    protected isTileActive(): boolean {
        return this.state.tempMin != null || this.state.tempMax != null;
    }

    static renderWeatherIcon(src: string | null, size: number): React.JSX.Element {
        if (src) {
            return (
                <img
                    src={src}
                    alt=""
                    style={{ width: size, height: size, objectFit: 'contain' }}
                />
            );
        }
        return <WbCloudy sx={{ fontSize: size, color: 'text.secondary' }} />;
    }

    private formatTempRange(): string {
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

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = super.renderTileIcon();
        if (baseIcon) {
            return baseIcon;
        }
        return WidgetWeatherForecast.renderWeatherIcon(this.state.icon, 40);
    }

    protected renderTileStatus(): React.JSX.Element | null {
        const size = this.props.settings?.size || this.props.size || '1x1';
        if (size !== '1x1') {
            return null;
        }

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                <Typography
                    variant="caption"
                    sx={{ fontWeight: 600, fontSize: '1rem', lineHeight: 1.2, color: 'text.primary' }}
                >
                    {this.formatTempRange()}
                </Typography>
                {this.state.weatherState ? (
                    <Typography
                        variant="caption"
                        sx={{
                            color: 'text.secondary',
                            lineHeight: 1.1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {translateWeather(this.state.weatherState)}
                    </Typography>
                ) : null}
            </Box>
        );
    }

    protected renderTileAction(): React.JSX.Element {
        const { weatherState, precipitationChance } = this.state;

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                    {this.formatTempRange()}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {weatherState ? (
                        <Typography
                            variant="body2"
                            sx={{ color: 'text.secondary' }}
                        >
                            {translateWeather(weatherState)}
                        </Typography>
                    ) : null}
                    {precipitationChance != null ? (
                        <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary' }}
                        >
                            {Math.round(precipitationChance)}% rain
                        </Typography>
                    ) : null}
                </Box>
            </Box>
        );
    }

    renderCompact(): React.JSX.Element {
        const { icon, weatherState } = this.state;
        const { name } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const indicators = this.renderIndicators();

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={{ position: 'relative', containerType: 'inline-size', overflow: 'hidden' }}
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
                        ...getTileStyles(theme, isActive, accent),
                        padding: 'max(12px, 8cqi)',
                    })}
                >
                    {indicators ? (
                        <Box sx={{ position: 'absolute', top: 'max(12px, 8cqi)', right: 'max(12px, 8cqi)', zIndex: 1 }}>
                            {indicators}
                        </Box>
                    ) : null}

                    {/* Weather icon + temp range */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {WidgetWeatherForecast.renderWeatherIcon(icon, 32)}
                        <Typography sx={{ fontWeight: 700, fontSize: 'max(1rem, 10cqi)', lineHeight: 1.1 }}>
                            {this.formatTempRange()}
                        </Typography>
                    </Box>

                    {/* Weather state */}
                    {weatherState ? (
                        <Typography
                            variant="caption"
                            sx={{
                                color: 'text.secondary',
                                fontSize: 'max(0.6rem, 5.5cqi)',
                                lineHeight: 1.2,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {translateWeather(weatherState)}
                        </Typography>
                    ) : null}

                    {/* Name */}
                    <Typography
                        variant="body2"
                        sx={theme => ({
                            fontWeight: 600,
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            fontSize: 'max(0.875rem, 9cqi)',
                            textOverflow: 'ellipsis',
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
                {this.renderSettingsButton()}
            </Box>
        );
    }

    /** Render a single forecast day row */
    static renderForecastRow(day: ForecastDay, compact?: boolean): React.JSX.Element {
        const fontSize = compact ? '0.7rem' : '0.8rem';
        const iconSize = compact ? 22 : 28;

        return (
            <Box
                key={day.index}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    minWidth: 0,
                }}
            >
                {/* DOW */}
                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 600,
                        fontSize,
                        width: compact ? 28 : 36,
                        flexShrink: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {day.dow || `D${day.index}`}
                </Typography>

                {/* Icon */}
                {WidgetWeatherForecast.renderWeatherIcon(day.icon, iconSize)}

                {/* Temp range */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                    {day.tempMax != null ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <ArrowUpward sx={{ fontSize: 12, color: '#f44336' }} />
                            <Typography
                                variant="caption"
                                sx={{ fontWeight: 600, fontSize }}
                            >
                                {Math.round(day.tempMax)}°
                            </Typography>
                        </Box>
                    ) : null}
                    {day.tempMin != null ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <ArrowDownward sx={{ fontSize: 12, color: '#2196f3' }} />
                            <Typography
                                variant="caption"
                                sx={{ fontSize, color: 'text.secondary' }}
                            >
                                {Math.round(day.tempMin)}°
                            </Typography>
                        </Box>
                    ) : null}
                </Box>

                {/* Precipitation */}
                {day.precipitationChance != null ? (
                    <Typography
                        variant="caption"
                        sx={{ fontSize: compact ? '0.6rem' : '0.7rem', color: 'text.secondary' }}
                    >
                        {Math.round(day.precipitationChance)}%
                    </Typography>
                ) : null}
            </Box>
        );
    }

    renderWideTall(): React.JSX.Element {
        const { icon, tempMin, tempMax, weatherState, forecastDays } = this.state;
        const { name } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const indicators = this.renderIndicators();

        // Show up to 5 forecast days
        const visibleDays = forecastDays.filter(d => d.icon || d.tempMin != null || d.tempMax != null).slice(0, 5);

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={{ position: 'relative', containerType: 'inline-size', overflow: 'hidden' }}
            >
                <Box
                    sx={theme => ({
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        width: '100%',
                        aspectRatio: '2 / 1',
                        overflow: 'hidden',
                        ...getTileStyles(theme, isActive, accent),
                        padding: 'max(12px, 4cqi)',
                    })}
                >
                    {indicators ? (
                        <Box sx={{ position: 'absolute', top: 'max(12px, 4cqi)', right: 'max(12px, 4cqi)', zIndex: 1 }}>
                            {indicators}
                        </Box>
                    ) : null}

                    {/* Top: today's forecast */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {WidgetWeatherForecast.renderWeatherIcon(icon, 44)}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '1.3rem', lineHeight: 1.1 }}>
                                    {tempMax != null ? `${Math.round(tempMax)}°` : '—'}
                                </Typography>
                                {tempMin != null ? (
                                    <Typography
                                        variant="body2"
                                        sx={{ color: 'text.secondary' }}
                                    >
                                        {Math.round(tempMin)}°
                                    </Typography>
                                ) : null}
                            </Box>
                            {weatherState ? (
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: 'text.secondary',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        display: 'block',
                                    }}
                                >
                                    {translateWeather(weatherState)}
                                </Typography>
                            ) : null}
                        </Box>
                    </Box>

                    {/* Multi-day forecast */}
                    {visibleDays.length > 0 ? (
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                overflow: 'hidden',
                                flex: 1,
                                minHeight: 0,
                                justifyContent: 'center',
                            }}
                        >
                            {visibleDays.map(day =>
                                WidgetWeatherForecast.renderForecastRow(day, visibleDays.length > 3),
                            )}
                        </Box>
                    ) : null}

                    {/* Name */}
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: 600,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {this.props.settings?.name || name || '...'}
                    </Typography>
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }
}

export default WidgetWeatherForecast;
