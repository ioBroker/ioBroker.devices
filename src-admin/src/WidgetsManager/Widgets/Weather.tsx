import React from 'react';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
import {
    Air,
    ArrowDownward,
    ArrowUpward,
    Close,
    Opacity,
    Speed,
    Thermostat,
    WaterDrop,
    WbCloudy,
} from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';

import type { ConfigItemPanel } from '@iobroker/json-config';

import WidgetGeneric, {
    type WidgetGenericState,
    type WidgetGenericProps,
    formatFloat,
    isNeumorphicTheme,
} from './Generic';
import { hideBaseFields } from '../configUtils';
import type { CustomWidgetBase } from '../../../../packages/dm-widgets/src/index';

/** WMO weather code → i18n key */
const WMO_KEYS: Record<number, string> = {
    0: 'wm_w_Clear sky',
    1: 'wm_w_Mainly clear',
    2: 'wm_w_Partly cloudy',
    3: 'wm_w_Overcast',
    45: 'wm_w_Fog',
    48: 'wm_w_Rime fog',
    51: 'wm_w_Light drizzle',
    53: 'wm_w_Moderate drizzle',
    55: 'wm_w_Dense drizzle',
    56: 'wm_w_Light freezing drizzle',
    57: 'wm_w_Dense freezing drizzle',
    61: 'wm_w_Slight rain',
    63: 'wm_w_Moderate rain',
    65: 'wm_w_Heavy rain',
    66: 'wm_w_Light freezing rain',
    67: 'wm_w_Heavy freezing rain',
    71: 'wm_w_Slight snow',
    73: 'wm_w_Moderate snow',
    75: 'wm_w_Heavy snow',
    77: 'wm_w_Snow grains',
    80: 'wm_w_Slight rain showers',
    81: 'wm_w_Moderate rain showers',
    82: 'wm_w_Violent rain showers',
    85: 'wm_w_Slight snow showers',
    86: 'wm_w_Heavy snow showers',
    95: 'wm_w_Thunderstorm',
    96: 'wm_w_Thunderstorm with hail',
    99: 'wm_w_Thunderstorm with heavy hail',
};

/** Translate a weather i18n key, returns null if the key is missing */
function tw(key: string | undefined): string | null {
    return key ? I18n.t(key) : null;
}

/** WMO code → simple weather emoji for display */
function wmoToIcon(code: number): string {
    if (code === 0) {
        // ☀️
        return '\u2600\uFE0F';
    }
    if (code <= 2) {
        // ⛅
        return '\u26C5';
    }
    if (code === 3) {
        // ☁️
        return '\u2601\uFE0F';
    }
    if (code <= 48) {
        // 🌫️
        return '\uD83C\uDF2B\uFE0F';
    }
    if (code <= 57) {
        // 🌦️
        return '\uD83C\uDF26\uFE0F';
    }
    if (code <= 67) {
        // 🌧️
        return '\uD83C\uDF27\uFE0F';
    }
    if (code <= 77) {
        // 🌨️
        return '\uD83C\uDF28\uFE0F';
    }
    if (code <= 82) {
        // 🌦️
        return '\uD83C\uDF26\uFE0F';
    }
    if (code <= 86) {
        // 🌨️
        return '\uD83C\uDF28\uFE0F';
    }
    return '\u26C8\uFE0F'; // ⛈️
}

/** Convert wind direction degrees to cardinal string */
function degToCardinal(deg: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(deg / 45) % 8];
}

/** Format ISO date string to localized short day-of-week */
function formatDow(dateStr: string, language: string): string {
    try {
        const date = new Date(`${dateStr}T12:00:00`);
        return date.toLocaleDateString(language, { weekday: 'short' });
    } catch {
        return dateStr;
    }
}

/** Role → state key mapping for current weather */
const CURRENT_ROLES: Record<string, string> = {
    'weather.icon': 'icon',
    'value.temperature': 'temperature',
    'weather.state': 'weatherState',
    'value.humidity': 'humidity',
    'value.speed.wind': 'windSpeed',
    'value.direction.wind': 'windDirection',
    'value.pressure': 'pressure',
    'value.precipitation.chance': 'precipitationChance',
    'value.temperature.windchill': 'realFeel',
};

/** Role prefix → forecast field mapping (a role ends with .forecast.N or .N) */
const FORECAST_ROLES: Record<string, string> = {
    'weather.icon.forecast': 'icon',
    'value.temperature.min.forecast': 'tempMin',
    'value.temperature.max.forecast': 'tempMax',
    'dayofweek.forecast': 'dow',
    'weather.state.forecast': 'state',
    'value.precipitation.forecast': 'precipitationChance',
};

interface ForecastDay {
    index: number;
    icon: string | null;
    tempMin: number | null;
    tempMax: number | null;
    dow: string | null;
    state: string | null;
    precipitationChance: number | null;
    /** WMO weather code (open-meteo only) */
    wmoCode?: number;
}

export interface WidgetWeatherSettings extends CustomWidgetBase {
    adapterInstance?: string;
    weatherSource?: 'adapter' | 'openmeteo' | 'yrno';
    latitude?: number;
    longitude?: number;
    cityName?: string;
}

interface WidgetWeatherState extends WidgetGenericState {
    loading: boolean;
    // Current weather
    icon: string | null;
    temperature: number | null;
    weatherState: string | null;
    humidity: number | null;
    windSpeed: number | null;
    windDirection: string | null;
    pressure: number | null;
    precipitationChance: number | null;
    realFeel: number | null;
    /** WMO code for current weather (open-meteo) */
    wmoCode?: number;
    // Forecast
    forecastDays: ForecastDay[];
    /** Detail dialog open */
    detailOpen: boolean;
}

/** Discovered state subscription */
interface StateSub {
    stateId: string;
    handler: (id: string, state: ioBroker.State) => void;
}

/** Refresh interval for direct API sources: 30 minutes */
const API_REFRESH_MS = 30 * 60 * 1000;

interface OpenMeteoCurrentUnits {
    time: string;
    interval: string;
    temperature_2m: string;
    relative_humidity_2m: string;
    weather_code: string;
    wind_speed_10m: string;
    wind_direction_10m: string;
    surface_pressure: string;
}

interface OpenMeteoCurrent {
    time: string;
    interval: number;
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    surface_pressure: number;
}

interface OpenMeteoDailyUnits {
    time: string;
    weather_code: string;
    temperature_2m_max: string;
    temperature_2m_min: string;
    precipitation_probability_max: string;
}

interface OpenMeteoDaily {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
}

interface OpenMeteoResponse {
    latitude: number;
    longitude: number;
    /** Generation time in milliseconds */
    generationtime_ms: number;
    /** UTC offset in seconds */
    utc_offset_seconds: number;
    /** IANA timezone string, e.g. "Europe/Berlin" */
    timezone: string;
    /** Timezone abbreviation, e.g. "CEST" */
    timezone_abbreviation: string;
    /** Elevation in meters */
    elevation: number;
    current_units?: OpenMeteoCurrentUnits;
    current?: OpenMeteoCurrent;
    daily_units?: OpenMeteoDailyUnits;
    daily?: OpenMeteoDaily;
}

/** Module-level cache for weather API responses (key = "source|lat|lon") */
const weatherApiCache: Record<string, { ts: number; data: OpenMeteoResponse }> = {};
/** Cache lifetime: same as a refresh interval */
const WEATHER_CACHE_MS = API_REFRESH_MS;

/** Module-level cache for adapter state object discovery (key = instance) */
const adapterObjectsCache: Record<string, Record<string, ioBroker.StateObject>> = {};

/** yr.no symbol_code → icon URL (from GitHub raw) */
function yrIconUrl(symbolCode: string): string {
    return `https://raw.githubusercontent.com/metno/weathericons/main/weather/svg/${symbolCode}.svg`;
}

/** yr.no symbol_code → i18n key */
const YR_SYMBOL_KEYS: Record<string, string> = {
    clearsky: 'wm_w_Clear sky',
    fair: 'wm_w_Fair',
    partlycloudy: 'wm_w_Partly cloudy',
    cloudy: 'wm_w_Cloudy',
    lightrainshowers: 'wm_w_Light rain showers',
    rainshowers: 'wm_w_Rain showers',
    heavyrainshowers: 'wm_w_Heavy rain showers',
    lightrainshowersandthunder: 'wm_w_Light rain showers and thunder',
    rainshowersandthunder: 'wm_w_Rain showers and thunder',
    heavyrainshowersandthunder: 'wm_w_Heavy rain showers and thunder',
    lightsleetshowers: 'wm_w_Light sleet showers',
    sleetshowers: 'wm_w_Sleet showers',
    heavysleetshowers: 'wm_w_Heavy sleet showers',
    lightsnowshowers: 'wm_w_Light snow showers',
    snowshowers: 'wm_w_Snow showers',
    heavysnowshowers: 'wm_w_Heavy snow showers',
    lightrain: 'wm_w_Light rain',
    rain: 'wm_w_Rain',
    heavyrain: 'wm_w_Heavy rain',
    lightrainandthunder: 'wm_w_Light rain and thunder',
    rainandthunder: 'wm_w_Rain and thunder',
    heavyrainandthunder: 'wm_w_Heavy rain and thunder',
    lightsleet: 'wm_w_Light sleet',
    sleet: 'wm_w_Sleet',
    heavysleet: 'wm_w_Heavy sleet',
    lightsnow: 'wm_w_Light snow',
    snow: 'wm_w_Snow',
    heavysnow: 'wm_w_Heavy snow',
    fog: 'wm_w_Fog',
};

/** Resolve yr.no symbol_code to translated description */
function yrSymbolToDescription(code: string): string {
    const base = code.replace(/_(day|night|polartwilight)$/, '');
    const key = YR_SYMBOL_KEYS[base];
    return key ? I18n.t(key) : base;
}

export class WidgetWeather extends WidgetGeneric<WidgetWeatherState, WidgetWeatherSettings> {
    static getConfigSchema(): ConfigItemPanel {
        return {
            type: 'panel',
            label: 'wm_Weather',
            items: {
                // Pure weather display — no active state, no colour palette.
                ...hideBaseFields('colorActive', 'color'),
                weatherSource: {
                    type: 'select',
                    label: 'wm_Weather source',
                    options: [
                        { value: 'adapter', label: 'wm_Adapter' },
                        { value: 'openmeteo', label: 'Open-Meteo' },
                        { value: 'yrno', label: 'yr.no' },
                    ],
                    default: 'adapter',
                    format: 'radio',
                },
                adapterInstance: {
                    type: 'instance',
                    label: 'wm_Adapter instance',
                    adapters: ['openweathermap', 'yr', 'daswetter', 'weatherunderground'],
                    hidden: "data.weatherSource !== 'adapter'",
                },
                cityName: {
                    type: 'component',
                    subType: 'citySearch',
                    label: 'wm_City',
                    hidden: "data.weatherSource === 'adapter'",
                },
            },
        };
    }

    private subs: StateSub[] = [];
    /** Maps stateId → { target: 'current'|'forecast', key: string, dayIndex?: number } */
    private stateMap: Map<
        string,
        { target: 'current'; key: string } | { target: 'forecast'; key: string; dayIndex: number }
    > = new Map();
    private refreshTimer: ReturnType<typeof setInterval> | null = null;

    constructor(props: WidgetGenericProps<WidgetWeatherSettings>) {
        super(props);
        this.state = {
            ...this.state,
            loading: true,
            icon: null,
            temperature: null,
            weatherState: null,
            humidity: null,
            windSpeed: null,
            windDirection: null,
            pressure: null,
            precipitationChance: null,
            realFeel: null,
            forecastDays: [],
            detailOpen: false,
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.startDataSource();
    }

    componentDidUpdate(prevProps: WidgetGenericProps<WidgetWeatherSettings>): void {
        const sourceChanged = prevProps.settings.weatherSource !== this.props.settings.weatherSource;
        const adapterChanged = prevProps.settings.adapterInstance !== this.props.settings.adapterInstance;
        const coordsChanged =
            prevProps.settings.latitude !== this.props.settings.latitude ||
            prevProps.settings.longitude !== this.props.settings.longitude;

        if (sourceChanged || adapterChanged || coordsChanged) {
            this.cleanup();
            this.startDataSource();
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        this.cleanup();
    }

    /** Whether this source uses direct API (coordinates-based) */
    private isDirectApi(): boolean {
        return this.props.settings.weatherSource === 'openmeteo' || this.props.settings.weatherSource === 'yrno';
    }

    /** Get coordinates — from widget settings, falling back to system.config via stateContext */
    private getCoordinates(): { latitude: number; longitude: number } | null {
        const lat = this.props.settings.latitude ?? this.props.stateContext?.latitude;
        const lon = this.props.settings.longitude ?? this.props.stateContext?.longitude;
        if (lat != null && lon != null) {
            return { latitude: lat, longitude: lon };
        }
        return null;
    }

    private isConfigured(): boolean {
        if (this.isDirectApi()) {
            return this.getCoordinates() != null;
        }
        return !!this.props.settings.adapterInstance;
    }

    private startDataSource(): void {
        if (this.isDirectApi()) {
            if (this.getCoordinates()) {
                const fetcher = (): void => void this.fetchDirectApi();
                fetcher();
                this.refreshTimer = setInterval(fetcher, API_REFRESH_MS);
            } else {
                this.setState({ loading: false });
            }
        } else if (this.props.settings.adapterInstance) {
            void this.discoverAndSubscribe(this.props.settings.adapterInstance);
        } else {
            this.setState({ loading: false });
        }
    }

    /** Route to the correct API fetcher */
    private async fetchDirectApi(): Promise<void> {
        if (this.props.settings.weatherSource === 'yrno') {
            await this.fetchYrNo();
        } else {
            await this.fetchOpenMeteo();
        }
    }

    private cleanup(): void {
        this.unsubscribeAll();
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    private unsubscribeAll(): void {
        for (const sub of this.subs) {
            this.props.stateContext.removeState(sub.stateId, sub.handler);
        }
        this.subs = [];
        this.stateMap.clear();
    }

    // --- Open-Meteo direct API ---

    private async fetchOpenMeteo(): Promise<void> {
        const coords = this.getCoordinates();
        if (!coords) {
            return;
        }
        const { latitude, longitude } = coords;

        try {
            const cacheKey = `openmeteo|${latitude}|${longitude}`;
            let data: OpenMeteoResponse;
            const cached = weatherApiCache[cacheKey];
            if (cached && Date.now() - cached.ts < WEATHER_CACHE_MS) {
                data = cached.data;
            } else {
                const url =
                    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
                    `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure` +
                    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
                    `&timezone=auto&forecast_days=7`;

                const res = await fetch(url);
                data = await res.json();
                weatherApiCache[cacheKey] = { ts: Date.now(), data };
            }

            const current = data.current;
            const daily = data.daily;
            const wmoCode = current?.weather_code;

            const forecastDays: ForecastDay[] = [];
            if (daily?.time) {
                // Skip day 0 (today, shown in the current section), show days 1-5
                for (let i = 1; i < Math.min(daily.time.length, 8); i++) {
                    const dayWmo = daily.weather_code?.[i] as number | undefined;
                    forecastDays.push({
                        index: i,
                        icon: null,
                        tempMin: daily.temperature_2m_min?.[i] ?? null,
                        tempMax: daily.temperature_2m_max?.[i] ?? null,
                        dow: formatDow(daily.time[i], this.props.stateContext.language),
                        state: dayWmo != null ? tw(WMO_KEYS[dayWmo]) : null,
                        precipitationChance: daily.precipitation_probability_max?.[i] ?? null,
                        wmoCode: dayWmo,
                    });
                }
            }

            this.setState({
                loading: false,
                temperature: current?.temperature_2m ?? null,
                humidity: current?.relative_humidity_2m ?? null,
                weatherState: wmoCode != null ? tw(WMO_KEYS[wmoCode]) : null,
                windSpeed: current?.wind_speed_10m ?? null,
                windDirection: current?.wind_direction_10m != null ? degToCardinal(current.wind_direction_10m) : null,
                pressure: current?.surface_pressure != null ? Math.round(current.surface_pressure) : null,
                precipitationChance: null,
                realFeel: null,
                icon: null,
                wmoCode: wmoCode ?? undefined,
                forecastDays,
            });
        } catch (e) {
            console.warn('Weather widget: open-meteo fetch failed', e);
            this.setState({ loading: false });
        }
    }

    // --- yr.no API ---

    private async fetchYrNo(): Promise<void> {
        const coords = this.getCoordinates();
        if (!coords) {
            return;
        }
        const { latitude, longitude } = coords;

        try {
            const cacheKey = `yrno|${latitude.toFixed(4)}|${longitude.toFixed(4)}`;
            let data: any;
            const cached = weatherApiCache[cacheKey];
            if (cached && Date.now() - cached.ts < WEATHER_CACHE_MS) {
                data = cached.data;
            } else {
                const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(4)}`;
                const res = await fetch(url, {
                    headers: { 'User-Agent': 'ioBroker.devices/1.0 github.com/ioBroker/ioBroker.devices' },
                });
                data = await res.json();
                weatherApiCache[cacheKey] = { ts: Date.now(), data };
            }

            const timeseries: Array<{
                time: string;
                data: {
                    instant: { details: Record<string, number> };
                    next_1_hours?: { summary: { symbol_code: string }; details?: Record<string, number> };
                    next_6_hours?: {
                        summary: { symbol_code: string };
                        details?: {
                            air_temperature_min?: number;
                            air_temperature_max?: number;
                            precipitation_amount?: number;
                        };
                    };
                };
            }> = data?.properties?.timeseries || [];

            if (timeseries.length === 0) {
                this.setState({ loading: false });
                return;
            }

            // Current weather from the first entry
            const now = timeseries[0];
            const instant = now.data.instant.details;
            const symbolCode =
                now.data.next_1_hours?.summary?.symbol_code || now.data.next_6_hours?.summary?.symbol_code || '';

            // Aggregate daily forecast
            const dayMap = new Map<
                string,
                { date: string; tempMin: number; tempMax: number; symbol: string; precip: number }
            >();
            const todayStr = now.time.slice(0, 10);

            for (const entry of timeseries) {
                const dateStr = entry.time.slice(0, 10);
                if (dateStr === todayStr) {
                    continue; // skip today
                }

                const d = entry.data.instant.details;
                const existing = dayMap.get(dateStr);

                // Get symbol from 6h or 1h summary (prefer entries around noon)
                const sym =
                    entry.data.next_6_hours?.summary?.symbol_code ||
                    entry.data.next_1_hours?.summary?.symbol_code ||
                    '';
                const hour = parseInt(entry.time.slice(11, 13), 10);
                const isNoon = hour >= 10 && hour <= 14;

                if (existing) {
                    if (d.air_temperature < existing.tempMin) {
                        existing.tempMin = d.air_temperature;
                    }
                    if (d.air_temperature > existing.tempMax) {
                        existing.tempMax = d.air_temperature;
                    }
                    // Prefer noon symbol
                    if (isNoon && sym) {
                        existing.symbol = sym;
                    }
                    // Accumulate precipitation
                    const p6 = entry.data.next_6_hours?.details?.precipitation_amount;
                    if (p6 != null) {
                        existing.precip += p6;
                    }
                } else {
                    dayMap.set(dateStr, {
                        date: dateStr,
                        tempMin: d.air_temperature,
                        tempMax: d.air_temperature,
                        symbol: sym,
                        precip: entry.data.next_6_hours?.details?.precipitation_amount || 0,
                    });
                }
            }

            // Build forecast days (up to 5)
            const forecastDays: ForecastDay[] = [];
            let dayIndex = 1;
            for (const [, day] of dayMap) {
                if (dayIndex > 7) {
                    break;
                }
                forecastDays.push({
                    index: dayIndex,
                    icon: day.symbol ? yrIconUrl(day.symbol) : null,
                    tempMin: day.tempMin,
                    tempMax: day.tempMax,
                    dow: formatDow(day.date, this.props.stateContext.language),
                    state: day.symbol ? yrSymbolToDescription(day.symbol) : null,
                    precipitationChance: null,
                });
                dayIndex++;
            }

            this.setState({
                loading: false,
                temperature: instant.air_temperature ?? null,
                humidity: instant.relative_humidity ?? null,
                weatherState: symbolCode ? yrSymbolToDescription(symbolCode) : null,
                windSpeed: instant.wind_speed != null ? Math.round(instant.wind_speed * 3.6) : null, // m/s → km/h
                windDirection: instant.wind_from_direction != null ? degToCardinal(instant.wind_from_direction) : null,
                pressure:
                    instant.air_pressure_at_sea_level != null ? Math.round(instant.air_pressure_at_sea_level) : null,
                precipitationChance: null,
                realFeel: null,
                icon: symbolCode ? yrIconUrl(symbolCode) : null,
                wmoCode: undefined,
                forecastDays,
            });
        } catch (e) {
            console.warn('Weather widget: yr.no fetch failed', e);
            this.setState({ loading: false });
        }
    }

    // --- Adapter-based discovery ---

    private async discoverAndSubscribe(instance: string): Promise<void> {
        const socket = this.props.stateContext.getSocket();

        try {
            // Get all state objects under this instance (cached per instance)
            let objects: Record<string, ioBroker.StateObject>;
            if (adapterObjectsCache[instance]) {
                objects = adapterObjectsCache[instance];
            } else {
                objects = (await socket.getObjectViewSystem('state', `${instance}.`, `${instance}.\u9999`)) as Record<
                    string,
                    ioBroker.StateObject
                >;
                if (objects) {
                    adapterObjectsCache[instance] = objects;
                }
            }

            if (!objects) {
                this.setState({ loading: false });
                return;
            }

            const forecastIndices = new Set<number>();

            // Match roles to our mapping
            for (const [stateId, obj] of Object.entries(objects)) {
                const role = obj?.common?.role;
                if (!role) {
                    continue;
                }

                // Check current weather roles
                if (CURRENT_ROLES[role]) {
                    this.stateMap.set(stateId, { target: 'current', key: CURRENT_ROLES[role] });
                    continue;
                }

                // Check forecast roles: role like "weather.icon.forecast.0"
                for (const [rolePrefix, fieldKey] of Object.entries(FORECAST_ROLES)) {
                    const regex = new RegExp(`^${rolePrefix.replace(/\./g, '\\.')}\\.(\\d+)$`);
                    const match = regex.exec(role);
                    if (match) {
                        const dayIndex = parseInt(match[1], 10);
                        this.stateMap.set(stateId, { target: 'forecast', key: fieldKey, dayIndex });
                        forecastIndices.add(dayIndex);
                        break;
                    }
                }
            }

            // Initialize forecast days
            const maxDay = forecastIndices.size > 0 ? Math.max(...forecastIndices) : -1;
            const forecastDays: ForecastDay[] = [];
            // Skip day 0 (that's "today" shown in the main area), start from 1
            for (let i = 1; i <= Math.min(maxDay, 7); i++) {
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
            this.setState({ forecastDays });

            // Subscribe to all discovered states
            for (const [stateId] of this.stateMap) {
                const handler = (id: string, state: ioBroker.State): void => this.onStateChange(id, state);
                this.subs.push({ stateId, handler });
                this.props.stateContext.getState(stateId, handler);
            }

            this.setState({ loading: false });
        } catch (e) {
            console.warn('Weather widget: failed to discover states', e);
            this.setState({ loading: false });
        }
    }

    private onStateChange = (id: string, state: ioBroker.State): void => {
        const mapping = this.stateMap.get(id);
        if (!mapping) {
            return;
        }

        const val = state.val;

        if (mapping.target === 'current') {
            const key = mapping.key;
            switch (key) {
                case 'icon':
                    this.setState({ icon: val != null ? String(val) : null });
                    break;
                case 'temperature': {
                    const n = val != null ? Number(val) : null;
                    this.setState({ temperature: n != null && !isNaN(n) ? n : null });
                    break;
                }
                case 'weatherState':
                    this.setState({ weatherState: val != null ? String(val) : null });
                    break;
                case 'humidity': {
                    const n = val != null ? Number(val) : null;
                    this.setState({ humidity: n != null && !isNaN(n) ? n : null });
                    break;
                }
                case 'windSpeed': {
                    const n = val != null ? Number(val) : null;
                    this.setState({ windSpeed: n != null && !isNaN(n) ? n : null });
                    break;
                }
                case 'windDirection':
                    this.setState({ windDirection: val != null ? String(val) : null });
                    break;
                case 'pressure': {
                    const n = val != null ? Number(val) : null;
                    this.setState({ pressure: n != null && !isNaN(n) ? n : null });
                    break;
                }
                case 'precipitationChance': {
                    const n = val != null ? Number(val) : null;
                    this.setState({ precipitationChance: n != null && !isNaN(n) ? n : null });
                    break;
                }
                case 'realFeel': {
                    const n = val != null ? Number(val) : null;
                    this.setState({ realFeel: n != null && !isNaN(n) ? n : null });
                    break;
                }
            }
        } else {
            // Forecast
            const { key, dayIndex } = mapping;
            this.setState(prev => {
                const days = [...prev.forecastDays];
                const day = days.find(d => d.index === dayIndex);
                if (!day) {
                    return null;
                }
                const updated = { ...day };
                switch (key) {
                    case 'icon':
                        updated.icon = val != null ? String(val) : null;
                        break;
                    case 'tempMin': {
                        const n = val != null ? Number(val) : null;
                        updated.tempMin = n != null && !isNaN(n) ? n : null;
                        break;
                    }
                    case 'tempMax': {
                        const n = val != null ? Number(val) : null;
                        updated.tempMax = n != null && !isNaN(n) ? n : null;
                        break;
                    }
                    case 'dow':
                        updated.dow = val != null ? String(val) : null;
                        break;
                    case 'state':
                        updated.state = val != null ? String(val) : null;
                        break;
                    case 'precipitationChance': {
                        const n = val != null ? Number(val) : null;
                        updated.precipitationChance = n != null && !isNaN(n) ? n : null;
                        break;
                    }
                }
                return { forecastDays: days.map(d => (d.index === dayIndex ? updated : d)) };
            });
        }
    };

    static renderWeatherIcon(src: string | null, size: number, wmoCode?: number): React.JSX.Element {
        if (src) {
            return (
                <img
                    src={src}
                    alt=""
                    style={{ width: size, height: size, objectFit: 'contain' }}
                />
            );
        }
        // For open-meteo: show WMO emoji if available
        if (wmoCode != null) {
            return (
                <Box
                    sx={{
                        fontSize: size * 0.75,
                        lineHeight: 1,
                        width: size,
                        height: size,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {wmoToIcon(wmoCode)}
                </Box>
            );
        }
        return <WbCloudy sx={{ fontSize: size, color: 'text.secondary' }} />;
    }

    static renderForecastRow(day: ForecastDay, compact?: boolean): React.JSX.Element {
        const fontSize = compact ? '0.7rem' : '0.8rem';
        const iconSize = compact ? 22 : 28;

        return (
            <Box
                key={day.index}
                sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}
            >
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
                {WidgetWeather.renderWeatherIcon(day.icon, iconSize, day.wmoCode)}
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

    renderCompact(): React.JSX.Element {
        const { icon, temperature, weatherState, loading, wmoCode } = this.state;
        const { color } = this.props.settings;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);

        if (!this.isConfigured()) {
            return (
                <Box sx={theme => WidgetGeneric.getStyleCompact(theme)}>
                    <Box
                        sx={theme => ({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            aspectRatio: '1',
                            ...this.applyTileStyles(theme, false, { accent: color, inactiveColor: color }),
                        })}
                    >
                        {indicators}
                        <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary' }}
                        >
                            {I18n.t('wm_Not configured')}
                        </Typography>
                    </Box>
                </Box>
            );
        }

        return (
            <Box sx={theme => WidgetGeneric.getStyleCompact(theme)}>
                <Box
                    onClick={this.openDetail}
                    sx={theme => ({
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'stretch',
                        width: '100%',
                        aspectRatio: '1',
                        textAlign: 'left',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        ...this.applyTileStyles(theme, false, { accent: color, inactiveColor: color }),
                        padding: 'max(12px, 8cqi)',
                    })}
                >
                    {indicators}
                    {loading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary' }}
                            >
                                ...
                            </Typography>
                        </Box>
                    ) : (
                        <>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {WidgetWeather.renderWeatherIcon(icon, 36, wmoCode)}
                                <Typography sx={{ fontWeight: 700, fontSize: 'max(1.2rem, 12cqi)', lineHeight: 1.1 }}>
                                    {temperature != null
                                        ? `${formatFloat(temperature, 1, this.props.stateContext.isFloatComma)}°`
                                        : '\u2014'}
                                </Typography>
                            </Box>
                            {weatherState ? (
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
                                    {weatherState}
                                </Typography>
                            ) : null}
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
                                {this.props.settings.cityName || I18n.t('wm_Weather')}
                            </Typography>
                        </>
                    )}
                </Box>
            </Box>
        );
    }

    renderWide(): React.JSX.Element {
        const { icon, temperature, weatherState, humidity, windSpeed, pressure, loading, wmoCode } = this.state;
        const { color } = this.props.settings;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);

        return (
            <Box sx={theme => WidgetGeneric.getStyleWide(theme)}>
                <Box
                    onClick={this.openDetail}
                    sx={theme => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        width: '100%',
                        height: 80,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        ...this.applyTileStyles(theme, false, { accent: color, inactiveColor: color }),
                    })}
                >
                    {indicators}
                    {loading ? (
                        <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary', mx: 'auto' }}
                        >
                            ...
                        </Typography>
                    ) : (
                        <>
                            {WidgetWeather.renderWeatherIcon(icon, 40, wmoCode)}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                    <Typography
                                        variant="h6"
                                        sx={{ fontWeight: 700 }}
                                    >
                                        {temperature != null
                                            ? `${formatFloat(temperature, 1, this.props.stateContext.isFloatComma)}°`
                                            : '\u2014'}
                                    </Typography>
                                    {weatherState ? (
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: 'text.secondary',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {weatherState}
                                        </Typography>
                                    ) : null}
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
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
                        </>
                    )}
                </Box>
            </Box>
        );
    }

    renderWideTall(): React.JSX.Element {
        const {
            icon,
            temperature,
            weatherState,
            humidity,
            windSpeed,
            pressure,
            precipitationChance,
            forecastDays,
            loading,
            wmoCode,
        } = this.state;
        const { color } = this.props.settings;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);

        const visibleDays = forecastDays
            .filter(d => d.icon || d.wmoCode != null || d.tempMin != null || d.tempMax != null)
            .slice(0, 1);

        return (
            <Box sx={theme => WidgetGeneric.getStyleWideTall(theme)}>
                {/* Sizer: exactly 1 column wide with aspect-ratio 1 to match 1x1 tile height */}
                <Box sx={{ width: 'calc(50% - 6px)', aspectRatio: '1' }} />
                <Box
                    onClick={this.openDetail}
                    sx={theme => ({
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        ...this.applyTileStyles(theme, false, {
                            interactive: false,
                            accent: color,
                            inactiveColor: color,
                        }),
                        padding: 'max(12px, 4cqi)',
                    })}
                >
                    {indicators}
                    {loading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary' }}
                            >
                                ...
                            </Typography>
                        </Box>
                    ) : (
                        <>
                            {/* Top: current weather */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                {WidgetWeather.renderWeatherIcon(icon, 52, wmoCode)}
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography sx={{ fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.1 }}>
                                        {temperature != null
                                            ? `${formatFloat(temperature, 1, this.props.stateContext.isFloatComma)}°`
                                            : '\u2014'}
                                    </Typography>
                                    {weatherState ? (
                                        <Typography
                                            variant="body2"
                                            sx={{ color: 'text.secondary', lineHeight: 1.2 }}
                                        >
                                            {weatherState}
                                        </Typography>
                                    ) : null}
                                </Box>
                            </Box>

                            {/* Details */}
                            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                                {humidity != null ? (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            color: 'text.secondary',
                                        }}
                                    >
                                        <WaterDrop sx={{ fontSize: 14 }} />
                                        <Typography variant="caption">{Math.round(humidity)}%</Typography>
                                    </Box>
                                ) : null}
                                {windSpeed != null ? (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            color: 'text.secondary',
                                        }}
                                    >
                                        <Air sx={{ fontSize: 14 }} />
                                        <Typography variant="caption">{Math.round(windSpeed)} km/h</Typography>
                                    </Box>
                                ) : null}
                                {pressure != null ? (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            color: 'text.secondary',
                                        }}
                                    >
                                        <Speed sx={{ fontSize: 14 }} />
                                        <Typography variant="caption">{Math.round(pressure)} hPa</Typography>
                                    </Box>
                                ) : null}
                                {precipitationChance != null ? (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            color: 'text.secondary',
                                        }}
                                    >
                                        <Opacity sx={{ fontSize: 14 }} />
                                        <Typography variant="caption">{Math.round(precipitationChance)}%</Typography>
                                    </Box>
                                ) : null}
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
                                        WidgetWeather.renderForecastRow(day, visibleDays.length > 3),
                                    )}
                                </Box>
                            ) : null}

                            {/* Label */}
                            <Typography
                                variant="body2"
                                sx={{
                                    fontWeight: 600,
                                    overflow: 'hidden',
                                    whiteSpace: 'nowrap',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {this.props.settings.cityName || I18n.t('wm_Weather')}
                            </Typography>
                        </>
                    )}
                </Box>
            </Box>
        );
    }

    private openDetail = (): void => {
        if (this.isConfigured() && !this.state.loading) {
            this.setState({ detailOpen: true });
        }
    };

    private renderDetailDialog(): React.JSX.Element | null {
        if (!this.state.detailOpen) {
            return null;
        }

        const {
            icon,
            temperature,
            weatherState,
            humidity,
            windSpeed,
            windDirection,
            pressure,
            precipitationChance,
            realFeel,
            wmoCode,
            forecastDays,
        } = this.state;

        const allDays = forecastDays.filter(d => d.icon || d.wmoCode != null || d.tempMin != null || d.tempMax != null);
        const title = this.props.settings.cityName || I18n.t('wm_Weather');

        return (
            <Dialog
                open
                onClose={() => this.setState({ detailOpen: false })}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', pr: 1 }}>
                    <Typography
                        variant="h6"
                        sx={{ flex: 1, fontWeight: 700 }}
                    >
                        {title}
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={() => this.setState({ detailOpen: false })}
                    >
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    {/* Current weather */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        {WidgetWeather.renderWeatherIcon(icon, 64, wmoCode)}
                        <Box>
                            <Typography
                                variant="h4"
                                sx={{ fontWeight: 700, lineHeight: 1.1 }}
                            >
                                {temperature != null
                                    ? `${formatFloat(temperature, 1, this.props.stateContext.isFloatComma)}°C`
                                    : '\u2014'}
                            </Typography>
                            {weatherState ? (
                                <Typography
                                    variant="body1"
                                    sx={{ color: 'text.secondary' }}
                                >
                                    {weatherState}
                                </Typography>
                            ) : null}
                        </Box>
                    </Box>

                    {/* Current details grid */}
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: 1,
                            mb: 2.5,
                            p: 1.5,
                            borderRadius: 2,
                            backgroundColor: 'action.hover',
                        }}
                    >
                        {humidity != null ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <WaterDrop sx={{ fontSize: 18, color: 'text.secondary' }} />
                                <Box>
                                    <Typography
                                        variant="caption"
                                        sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.2 }}
                                    >
                                        {I18n.t('wm_Humidity')}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 600 }}
                                    >
                                        {Math.round(humidity)}%
                                    </Typography>
                                </Box>
                            </Box>
                        ) : null}
                        {windSpeed != null ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Air sx={{ fontSize: 18, color: 'text.secondary' }} />
                                <Box>
                                    <Typography
                                        variant="caption"
                                        sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.2 }}
                                    >
                                        {I18n.t('wm_Wind')}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 600 }}
                                    >
                                        {Math.round(windSpeed)} km/h{windDirection ? ` ${windDirection}` : ''}
                                    </Typography>
                                </Box>
                            </Box>
                        ) : null}
                        {pressure != null ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Speed sx={{ fontSize: 18, color: 'text.secondary' }} />
                                <Box>
                                    <Typography
                                        variant="caption"
                                        sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.2 }}
                                    >
                                        {I18n.t('wm_Pressure')}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 600 }}
                                    >
                                        {Math.round(pressure)} hPa
                                    </Typography>
                                </Box>
                            </Box>
                        ) : null}
                        {precipitationChance != null ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Opacity sx={{ fontSize: 18, color: 'text.secondary' }} />
                                <Box>
                                    <Typography
                                        variant="caption"
                                        sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.2 }}
                                    >
                                        {I18n.t('wm_Precipitation')}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 600 }}
                                    >
                                        {Math.round(precipitationChance)}%
                                    </Typography>
                                </Box>
                            </Box>
                        ) : null}
                        {realFeel != null ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Thermostat sx={{ fontSize: 18, color: 'text.secondary' }} />
                                <Box>
                                    <Typography
                                        variant="caption"
                                        sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.2 }}
                                    >
                                        {I18n.t('wm_Feels like')}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 600 }}
                                    >
                                        {formatFloat(realFeel, 1, this.props.stateContext.isFloatComma)}°C
                                    </Typography>
                                </Box>
                            </Box>
                        ) : null}
                    </Box>

                    {/* 7-day forecast */}
                    {allDays.length > 0 ? (
                        <>
                            <Typography
                                variant="subtitle2"
                                sx={{ fontWeight: 700, mb: 1 }}
                            >
                                {I18n.t('wm_Forecast')}
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                {allDays.map(day => (
                                    <Box
                                        key={day.index}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1.5,
                                            py: 0.75,
                                            borderBottom: '1px solid',
                                            borderColor: 'divider',
                                            '&:last-child': { borderBottom: 'none' },
                                        }}
                                    >
                                        <Typography
                                            variant="body2"
                                            sx={{ fontWeight: 600, width: 40, flexShrink: 0 }}
                                        >
                                            {day.dow || `D${day.index}`}
                                        </Typography>
                                        {WidgetWeather.renderWeatherIcon(day.icon, 32, day.wmoCode)}
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {day.tempMax != null ? (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                        <ArrowUpward sx={{ fontSize: 14, color: '#f44336' }} />
                                                        <Typography
                                                            variant="body2"
                                                            sx={{ fontWeight: 600 }}
                                                        >
                                                            {Math.round(day.tempMax)}°
                                                        </Typography>
                                                    </Box>
                                                ) : null}
                                                {day.tempMin != null ? (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                        <ArrowDownward sx={{ fontSize: 14, color: '#2196f3' }} />
                                                        <Typography
                                                            variant="body2"
                                                            sx={{ color: 'text.secondary' }}
                                                        >
                                                            {Math.round(day.tempMin)}°
                                                        </Typography>
                                                    </Box>
                                                ) : null}
                                            </Box>
                                            {day.state ? (
                                                <Typography
                                                    variant="caption"
                                                    sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.2 }}
                                                >
                                                    {day.state}
                                                </Typography>
                                            ) : null}
                                        </Box>
                                        {day.precipitationChance != null ? (
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '3px',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <Opacity sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                <Typography
                                                    variant="caption"
                                                    sx={{ color: 'text.secondary' }}
                                                >
                                                    {Math.round(day.precipitationChance)}%
                                                </Typography>
                                            </Box>
                                        ) : null}
                                    </Box>
                                ))}
                            </Box>
                        </>
                    ) : null}
                </DialogContent>
            </Dialog>
        );
    }

    render(): React.JSX.Element {
        return (
            <>
                {super.render()}
                {this.renderDetailDialog()}
            </>
        );
    }
}

export default WidgetWeather;
