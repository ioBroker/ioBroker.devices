import React from 'react';
import { Box, Typography } from '@mui/material';
import { Air, Opacity, Speed, Thermostat, WaterDrop, WbSunny, WbCloudy } from '@mui/icons-material';

import WidgetGeneric, {
    isNeumorphicTheme,
    formatFloat,
    type WidgetGenericProps,
    type WidgetGenericState,
} from './Generic';
import { translateWeather } from './weatherTranslations';

interface WidgetWeatherCurrentState extends WidgetGenericState {
    temperature: number | null;
    icon: string | null;
    weather: string | null;
    humidity: number | null;
    windSpeed: number | null;
    windDirection: string | null;
    pressure: number | null;
    precipitationChance: number | null;
    realFeel: number | null;
    uv: number | null;
}

export class WidgetWeatherCurrent extends WidgetGeneric<WidgetWeatherCurrentState> {
    private readonly ids: Record<string, string | null>;

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;

        this.ids = {
            ACTUAL: states.find(s => s.name === 'ACTUAL')?.id ?? null,
            ICON: states.find(s => s.name === 'ICON')?.id ?? null,
            WEATHER: states.find(s => s.name === 'WEATHER')?.id ?? null,
            HUMIDITY: states.find(s => s.name === 'HUMIDITY')?.id ?? null,
            WIND_SPEED: states.find(s => s.name === 'WIND_SPEED')?.id ?? null,
            WIND_DIRECTION: states.find(s => s.name === 'WIND_DIRECTION')?.id ?? null,
            PRESSURE: states.find(s => s.name === 'PRESSURE')?.id ?? null,
            PRECIPITATION_CHANCE: states.find(s => s.name === 'PRECIPITATION_CHANCE')?.id ?? null,
            REAL_FEEL_TEMPERATURE: states.find(s => s.name === 'REAL_FEEL_TEMPERATURE')?.id ?? null,
            UV: states.find(s => s.name === 'UV')?.id ?? null,
        };

        this.state = {
            ...this.state,
            temperature: null,
            icon: null,
            weather: null,
            humidity: null,
            windSpeed: null,
            windDirection: null,
            pressure: null,
            precipitationChance: null,
            realFeel: null,
            uv: null,
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        for (const [name, id] of Object.entries(this.ids)) {
            if (id) {
                this.props.stateContext.getState(id, this.makeHandler(name));
            }
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        for (const [name, id] of Object.entries(this.ids)) {
            if (id) {
                this.props.stateContext.removeState(id, this.makeHandler(name));
            }
        }
    }

    // Stable handler references via a map
    private handlers: Record<string, (id: string, state: ioBroker.State) => void> = {};

    private makeHandler(name: string): (id: string, state: ioBroker.State) => void {
        if (!this.handlers[name]) {
            this.handlers[name] = (_id: string, state: ioBroker.State) => {
                const val = state.val;
                switch (name) {
                    case 'ACTUAL': {
                        const n = val != null ? Number(val) : null;
                        this.setState({ temperature: n != null && !isNaN(n) ? n : null });
                        break;
                    }
                    case 'ICON':
                        this.setState({ icon: val != null ? String(val) : null });
                        break;
                    case 'WEATHER':
                        this.setState({ weather: val != null ? String(val) : null });
                        break;
                    case 'HUMIDITY': {
                        const n = val != null ? Number(val) : null;
                        this.setState({ humidity: n != null && !isNaN(n) ? n : null });
                        break;
                    }
                    case 'WIND_SPEED': {
                        const n = val != null ? Number(val) : null;
                        this.setState({ windSpeed: n != null && !isNaN(n) ? n : null });
                        break;
                    }
                    case 'WIND_DIRECTION':
                        this.setState({ windDirection: val != null ? String(val) : null });
                        break;
                    case 'PRESSURE': {
                        const n = val != null ? Number(val) : null;
                        this.setState({ pressure: n != null && !isNaN(n) ? n : null });
                        break;
                    }
                    case 'PRECIPITATION_CHANCE': {
                        const n = val != null ? Number(val) : null;
                        this.setState({ precipitationChance: n != null && !isNaN(n) ? n : null });
                        break;
                    }
                    case 'REAL_FEEL_TEMPERATURE': {
                        const n = val != null ? Number(val) : null;
                        this.setState({ realFeel: n != null && !isNaN(n) ? n : null });
                        break;
                    }
                    case 'UV': {
                        const n = val != null ? Number(val) : null;
                        this.setState({ uv: n != null && !isNaN(n) ? n : null });
                        break;
                    }
                }
            };
        }
        return this.handlers[name];
    }

    protected getHistoryIds(): { id: string; color: string }[] {
        const ids: { id: string; color: string }[] = [];
        if (this.ids.ACTUAL) {
            ids.push({ id: this.ids.ACTUAL, color: '#ff9800' });
        }
        if (this.ids.HUMIDITY) {
            ids.push({ id: this.ids.HUMIDITY, color: '#2196f3' });
        }
        return ids;
    }

    protected isTileActive(): boolean {
        return this.state.temperature != null;
    }

    private renderWeatherIcon(size: number): React.JSX.Element {
        const { icon } = this.state;
        if (icon) {
            return (
                <img
                    src={icon}
                    alt=""
                    style={{
                        width: size,
                        height: size,
                        objectFit: 'contain',
                    }}
                />
            );
        }
        return <WbCloudy sx={{ fontSize: size, color: 'text.secondary' }} />;
    }

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = super.renderTileIcon();
        if (baseIcon) {
            return baseIcon;
        }
        return this.renderWeatherIcon(40);
    }

    protected renderTileStatus(): React.JSX.Element | null {
        const size = this.props.settings?.size || '1x1';
        if (size !== '1x1') {
            return null;
        }

        const { temperature, weather } = this.state;

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.25 }}>
                <Typography
                    variant="caption"
                    sx={{ fontWeight: 600, fontSize: '1.1rem', lineHeight: 1.2, color: 'text.primary' }}
                >
                    {temperature != null
                        ? `${formatFloat(temperature, 1, this.props.stateContext.isFloatComma)}°`
                        : '—'}
                </Typography>
                {weather ? (
                    <Typography
                        variant="caption"
                        sx={{
                            color: 'text.secondary',
                            lineHeight: 1.1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%',
                        }}
                    >
                        {translateWeather(weather)}
                    </Typography>
                ) : null}
            </Box>
        );
    }

    protected renderTileAction(): React.JSX.Element {
        const { temperature, weather, humidity, windSpeed, windDirection, pressure } = this.state;

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography
                        variant="h5"
                        sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                    >
                        {temperature != null
                            ? `${formatFloat(temperature, 1, this.props.stateContext.isFloatComma)}°`
                            : '—'}
                    </Typography>
                    {weather ? (
                        <Typography
                            variant="body2"
                            sx={{
                                color: 'text.secondary',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {translateWeather(weather)}
                        </Typography>
                    ) : null}
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    {humidity != null ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <WaterDrop sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary' }}
                            >
                                {Math.round(humidity)}%
                            </Typography>
                        </Box>
                    ) : null}
                    {windSpeed != null ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Air sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary' }}
                            >
                                {Math.round(windSpeed)} km/h
                                {windDirection ? ` ${windDirection}°` : ''}
                            </Typography>
                        </Box>
                    ) : null}
                    {pressure != null ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Speed sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary' }}
                            >
                                {Math.round(pressure)} hPa
                            </Typography>
                        </Box>
                    ) : null}
                </Box>
            </Box>
        );
    }

    renderCompact(): React.JSX.Element {
        const { temperature, weather } = this.state;
        const { name } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={theme => WidgetGeneric.getStyleCompact(theme)}
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
                        ...this.applyTileStyles(theme, isActive),
                        padding: 'max(12px, 8cqi)',
                    })}
                >
                    {indicators}

                    {/* Weather icon */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {this.renderWeatherIcon(36)}
                        <Typography
                            sx={{
                                fontWeight: 700,
                                fontSize: 'max(1.2rem, 12cqi)',
                                lineHeight: 1.1,
                            }}
                        >
                            {temperature != null
                                ? `${formatFloat(temperature, 1, this.props.stateContext.isFloatComma)}°`
                                : '—'}
                        </Typography>
                    </Box>

                    {/* Weather state */}
                    {weather ? (
                        <Typography
                            variant="caption"
                            sx={{
                                color: 'text.secondary',
                                fontSize: 'max(0.65rem, 6cqi)',
                                lineHeight: 1.2,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {translateWeather(weather)}
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

                {this.renderChart()}
            </Box>
        );
    }

    renderWideTall(): React.JSX.Element {
        const {
            temperature,
            weather,
            humidity,
            windSpeed,
            windDirection,
            pressure,
            precipitationChance,
            realFeel,
            uv,
        } = this.state;
        const { name } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);

        const details: { icon: React.JSX.Element; label: string }[] = [];
        if (humidity != null) {
            details.push({
                icon: <WaterDrop sx={{ fontSize: 14 }} />,
                label: `${Math.round(humidity)}%`,
            });
        }
        if (windSpeed != null) {
            details.push({
                icon: <Air sx={{ fontSize: 14 }} />,
                label: `${Math.round(windSpeed)} km/h${windDirection ? ` ${windDirection}°` : ''}`,
            });
        }
        if (pressure != null) {
            details.push({
                icon: <Speed sx={{ fontSize: 14 }} />,
                label: `${Math.round(pressure)} hPa`,
            });
        }
        if (precipitationChance != null) {
            details.push({
                icon: <Opacity sx={{ fontSize: 14 }} />,
                label: `${Math.round(precipitationChance)}%`,
            });
        }
        if (realFeel != null) {
            details.push({
                icon: <Thermostat sx={{ fontSize: 14 }} />,
                label: `${formatFloat(realFeel, 1, this.props.stateContext.isFloatComma)}°`,
            });
        }
        if (uv != null) {
            details.push({
                icon: <WbSunny sx={{ fontSize: 14 }} />,
                label: `UV ${uv}`,
            });
        }

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={theme => WidgetGeneric.getStyleWideTall(theme)}
            >
                <Box
                    sx={theme => ({
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        width: '100%',
                        aspectRatio: '2 / 1',
                        overflow: 'hidden',
                        ...this.applyTileStyles(theme, isActive),
                        padding: 'max(12px, 4cqi)',
                    })}
                >
                    {indicators}

                    {/* Top: icon + temp + weather state */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {this.renderWeatherIcon(52)}
                        <Box>
                            <Typography sx={{ fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.1 }}>
                                {temperature != null
                                    ? `${formatFloat(temperature, 1, this.props.stateContext.isFloatComma)}°`
                                    : '—'}
                            </Typography>
                            {weather ? (
                                <Typography
                                    variant="body2"
                                    sx={{ color: 'text.secondary', lineHeight: 1.2 }}
                                >
                                    {translateWeather(weather)}
                                </Typography>
                            ) : null}
                        </Box>
                    </Box>

                    {/* Details grid */}
                    {details.length > 0 ? (
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 1.5,
                                flexWrap: 'wrap',
                                alignItems: 'center',
                            }}
                        >
                            {details.map((d, i) => (
                                <Box
                                    key={i}
                                    sx={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'text.secondary' }}
                                >
                                    {d.icon}
                                    <Typography variant="caption">{d.label}</Typography>
                                </Box>
                            ))}
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

                {this.renderChart()}
            </Box>
        );
    }
}

export default WidgetWeatherCurrent;
