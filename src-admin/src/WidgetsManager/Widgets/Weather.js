import React from 'react';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
import { Air, ArrowDownward, ArrowUpward, Close, Opacity, Speed, Thermostat, WaterDrop, WbCloudy, } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';
import WidgetGeneric, { formatFloat, isNeumorphicTheme, } from './Generic';
import { hideBaseFields } from '../configUtils';
/** WMO weather code → i18n key */
const WMO_KEYS = {
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
function tw(key) {
    return key ? I18n.t(key) : null;
}
/** WMO code → simple weather emoji for display */
function wmoToIcon(code) {
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
function degToCardinal(deg) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(deg / 45) % 8];
}
/** Format ISO date string to localized short day-of-week */
function formatDow(dateStr, language) {
    try {
        const date = new Date(`${dateStr}T12:00:00`);
        return date.toLocaleDateString(language, { weekday: 'short' });
    }
    catch {
        return dateStr;
    }
}
/** Role → state key mapping for current weather */
const CURRENT_ROLES = {
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
const FORECAST_ROLES = {
    'weather.icon.forecast': 'icon',
    'value.temperature.min.forecast': 'tempMin',
    'value.temperature.max.forecast': 'tempMax',
    'dayofweek.forecast': 'dow',
    'weather.state.forecast': 'state',
    'value.precipitation.forecast': 'precipitationChance',
};
/**
 * open-meteo-weather adapter mapping. Unlike the generic adapter discovery (which matches roles),
 * this adapter exposes multiple locations as devices and its forecast roles are inconsistent across
 * days, so we match by the well-defined state-id leaf under `<device>.weather.current|forecast.dayN`.
 */
/** Current weather state leaf → widget current field */
const OMW_CURRENT_FIELDS = {
    temperature_2m: 'temperature',
    apparent_temperature: 'realFeel',
    relative_humidity_2m: 'humidity',
    weather_code: 'wmoCode',
    weather_text: 'weatherState',
    wind_speed_10m: 'windSpeed',
    wind_direction_10m: 'windDirection',
    pressure_msl: 'pressure',
    icon_url: 'icon',
};
/** Forecast dayN state leaf → widget forecast field */
const OMW_FORECAST_FIELDS = {
    temperature_2m_max: 'tempMax',
    temperature_2m_min: 'tempMin',
    weather_code: 'wmoCode',
    weather_text: 'state',
    icon_url: 'icon',
    precipitation_probability_max: 'precipitationChance',
    name_day: 'dow',
    time: 'time',
};
/** Parse a state value to a finite number, or null */
function numOrNull(val) {
    const n = val != null ? Number(val) : null;
    return n != null && !isNaN(n) ? n : null;
}
/** Refresh interval for direct API sources: 30 minutes */
const API_REFRESH_MS = 30 * 60 * 1000;
/** Module-level cache for weather API responses (key = "source|lat|lon") */
const weatherApiCache = {};
/** Cache lifetime: same as a refresh interval */
const WEATHER_CACHE_MS = API_REFRESH_MS;
/** Module-level cache for adapter state object discovery (key = instance) */
const adapterObjectsCache = {};
/** yr.no symbol_code → icon URL (from GitHub raw) */
function yrIconUrl(symbolCode) {
    return `https://raw.githubusercontent.com/metno/weathericons/main/weather/svg/${symbolCode}.svg`;
}
/** yr.no symbol_code → i18n key */
const YR_SYMBOL_KEYS = {
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
function yrSymbolToDescription(code) {
    const base = code.replace(/_(day|night|polartwilight)$/, '');
    const key = YR_SYMBOL_KEYS[base];
    return key ? I18n.t(key) : base;
}
export class WidgetWeather extends WidgetGeneric {
    static getConfigSchema() {
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
                        { value: 'open-meteo-weather', label: 'Open-Meteo (Adapter)' },
                        { value: 'openmeteo', label: 'Open-Meteo (API)' },
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
                omwInstance: {
                    type: 'instance',
                    label: 'wm_Adapter instance',
                    adapters: ['open-meteo-weather'],
                    hidden: "data.weatherSource !== 'open-meteo-weather'",
                },
                omwLocation: {
                    type: 'component',
                    subType: 'locationSelect',
                    label: 'wm_Location',
                    hidden: "data.weatherSource !== 'open-meteo-weather' || !data.omwInstance",
                },
                cityName: {
                    type: 'component',
                    subType: 'citySearch',
                    label: 'wm_City',
                    hidden: "data.weatherSource !== 'openmeteo' && data.weatherSource !== 'yrno'",
                },
            },
        };
    }
    subs = [];
    /** Maps stateId → { target: 'current'|'forecast', key: string, dayIndex?: number } */
    stateMap = new Map();
    refreshTimer = null;
    constructor(props) {
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
    componentDidMount() {
        super.componentDidMount();
        this.startDataSource();
    }
    componentDidUpdate(prevProps) {
        const sourceChanged = prevProps.settings.weatherSource !== this.props.settings.weatherSource;
        const adapterChanged = prevProps.settings.adapterInstance !== this.props.settings.adapterInstance;
        const omwChanged = prevProps.settings.omwInstance !== this.props.settings.omwInstance ||
            prevProps.settings.omwLocation !== this.props.settings.omwLocation;
        const coordsChanged = prevProps.settings.latitude !== this.props.settings.latitude ||
            prevProps.settings.longitude !== this.props.settings.longitude;
        if (sourceChanged || adapterChanged || omwChanged || coordsChanged) {
            this.cleanup();
            this.startDataSource();
        }
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        this.cleanup();
    }
    /** Whether this source uses direct API (coordinates-based) */
    isDirectApi() {
        return this.props.settings.weatherSource === 'openmeteo' || this.props.settings.weatherSource === 'yrno';
    }
    /** Whether this source is the open-meteo-weather adapter (object/device based) */
    isOpenMeteoAdapter() {
        return this.props.settings.weatherSource === 'open-meteo-weather';
    }
    /**
     * Base object path of the selected open-meteo-weather location.
     * Uses the chosen location device, falling back to the instance root if none was picked.
     */
    omwBasePath() {
        return this.props.settings.omwLocation || this.props.settings.omwInstance || null;
    }
    /**
     * Human-readable location label shown in the widget header/footer.
     * For the open-meteo-weather adapter the city is the selected device's id leaf (e.g. "…0.Split"
     * → "Split"); for the other sources it is the geocoded city name from the search field.
     */
    getLocationTitle() {
        if (this.isOpenMeteoAdapter() && this.props.settings.omwLocation) {
            const leaf = (this.props.settings.omwLocation.split('.').pop() || '').replace(/_/g, ' ').trim();
            if (leaf) {
                return leaf;
            }
        }
        return this.props.settings.cityName || I18n.t('wm_Weather');
    }
    /** Get coordinates — from widget settings, falling back to system.config via stateContext */
    getCoordinates() {
        const lat = this.props.settings.latitude ?? this.props.stateContext?.latitude;
        const lon = this.props.settings.longitude ?? this.props.stateContext?.longitude;
        if (lat != null && lon != null) {
            return { latitude: lat, longitude: lon };
        }
        return null;
    }
    isConfigured() {
        if (this.isDirectApi()) {
            return this.getCoordinates() != null;
        }
        if (this.isOpenMeteoAdapter()) {
            return !!this.omwBasePath();
        }
        return !!this.props.settings.adapterInstance;
    }
    startDataSource() {
        if (this.isDirectApi()) {
            if (this.getCoordinates()) {
                const fetcher = () => void this.fetchDirectApi();
                fetcher();
                this.refreshTimer = setInterval(fetcher, API_REFRESH_MS);
            }
            else {
                this.setState({ loading: false });
            }
        }
        else if (this.isOpenMeteoAdapter()) {
            const base = this.omwBasePath();
            if (base) {
                void this.discoverOpenMeteoWeather(base);
            }
            else {
                this.setState({ loading: false });
            }
        }
        else if (this.props.settings.adapterInstance) {
            void this.discoverAndSubscribe(this.props.settings.adapterInstance);
        }
        else {
            this.setState({ loading: false });
        }
    }
    /** Route to the correct API fetcher */
    async fetchDirectApi() {
        if (this.props.settings.weatherSource === 'yrno') {
            await this.fetchYrNo();
        }
        else {
            await this.fetchOpenMeteo();
        }
    }
    cleanup() {
        this.unsubscribeAll();
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }
    unsubscribeAll() {
        for (const sub of this.subs) {
            this.props.stateContext.removeState(sub.stateId, sub.handler);
        }
        this.subs = [];
        this.stateMap.clear();
    }
    // --- Open-Meteo direct API ---
    async fetchOpenMeteo() {
        const coords = this.getCoordinates();
        if (!coords) {
            return;
        }
        const { latitude, longitude } = coords;
        try {
            const cacheKey = `openmeteo|${latitude}|${longitude}`;
            let data;
            const cached = weatherApiCache[cacheKey];
            if (cached && Date.now() - cached.ts < WEATHER_CACHE_MS) {
                data = cached.data;
            }
            else {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
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
            const forecastDays = [];
            if (daily?.time) {
                // Skip day 0 (today, shown in the current section), show days 1-5
                for (let i = 1; i < Math.min(daily.time.length, 8); i++) {
                    const dayWmo = daily.weather_code?.[i];
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
        }
        catch (e) {
            console.warn('Weather widget: open-meteo fetch failed', e);
            this.setState({ loading: false });
        }
    }
    // --- yr.no API ---
    async fetchYrNo() {
        const coords = this.getCoordinates();
        if (!coords) {
            return;
        }
        const { latitude, longitude } = coords;
        try {
            const cacheKey = `yrno|${latitude.toFixed(4)}|${longitude.toFixed(4)}`;
            let data;
            const cached = weatherApiCache[cacheKey];
            if (cached && Date.now() - cached.ts < WEATHER_CACHE_MS) {
                data = cached.data;
            }
            else {
                const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(4)}`;
                const res = await fetch(url, {
                    headers: { 'User-Agent': 'ioBroker.devices/1.0 github.com/ioBroker/ioBroker.devices' },
                });
                data = await res.json();
                weatherApiCache[cacheKey] = { ts: Date.now(), data };
            }
            const timeseries = data?.properties?.timeseries || [];
            if (timeseries.length === 0) {
                this.setState({ loading: false });
                return;
            }
            // Current weather from the first entry
            const now = timeseries[0];
            const instant = now.data.instant.details;
            const symbolCode = now.data.next_1_hours?.summary?.symbol_code || now.data.next_6_hours?.summary?.symbol_code || '';
            // Aggregate daily forecast
            const dayMap = new Map();
            const todayStr = now.time.slice(0, 10);
            for (const entry of timeseries) {
                const dateStr = entry.time.slice(0, 10);
                if (dateStr === todayStr) {
                    continue; // skip today
                }
                const d = entry.data.instant.details;
                const existing = dayMap.get(dateStr);
                // Get symbol from 6h or 1h summary (prefer entries around noon)
                const sym = entry.data.next_6_hours?.summary?.symbol_code ||
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
                }
                else {
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
            const forecastDays = [];
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
                pressure: instant.air_pressure_at_sea_level != null ? Math.round(instant.air_pressure_at_sea_level) : null,
                precipitationChance: null,
                realFeel: null,
                icon: symbolCode ? yrIconUrl(symbolCode) : null,
                wmoCode: undefined,
                forecastDays,
            });
        }
        catch (e) {
            console.warn('Weather widget: yr.no fetch failed', e);
            this.setState({ loading: false });
        }
    }
    // --- Adapter-based discovery ---
    async discoverAndSubscribe(instance) {
        const socket = this.props.stateContext.getSocket();
        try {
            // Get all state objects under this instance (cached per instance)
            let objects;
            if (adapterObjectsCache[instance]) {
                objects = adapterObjectsCache[instance];
            }
            else {
                objects = (await socket.getObjectViewSystem('state', `${instance}.`, `${instance}.\u9999`));
                if (objects) {
                    adapterObjectsCache[instance] = objects;
                }
            }
            if (!objects) {
                this.setState({ loading: false });
                return;
            }
            const forecastIndices = new Set();
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
            const forecastDays = [];
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
                const handler = (id, state) => this.onStateChange(id, state);
                this.subs.push({ stateId, handler });
                this.props.stateContext.getState(stateId, handler);
            }
            this.setState({ loading: false });
        }
        catch (e) {
            console.warn('Weather widget: failed to discover states', e);
            this.setState({ loading: false });
        }
    }
    onStateChange = (id, state) => {
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
        }
        else {
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
    // --- open-meteo-weather adapter discovery ---
    /**
     * Discover and subscribe to the states of one open-meteo-weather location (device).
     * `basePath` is the device id (e.g. `open-meteo-weather.0.Split`) or the instance root.
     */
    async discoverOpenMeteoWeather(basePath) {
        const socket = this.props.stateContext.getSocket();
        try {
            const objects = (await socket.getObjectViewSystem('state', `${basePath}.`, `${basePath}.\u9999`));
            if (!objects) {
                this.setState({ loading: false });
                return;
            }
            const forecastIndices = new Set();
            const currentRe = /\.weather\.current\.([^.]+)$/;
            const forecastRe = /\.weather\.forecast\.day(\d+)\.([^.]+)$/;
            for (const stateId of Object.keys(objects)) {
                const cur = currentRe.exec(stateId);
                if (cur) {
                    const field = OMW_CURRENT_FIELDS[cur[1]];
                    if (field) {
                        this.stateMap.set(stateId, { target: 'current', key: field });
                    }
                    continue;
                }
                const fc = forecastRe.exec(stateId);
                if (fc) {
                    const dayIndex = parseInt(fc[1], 10);
                    // Day 0 is "today" — already shown in the current section, skip it in the forecast row
                    if (dayIndex < 1) {
                        continue;
                    }
                    const field = OMW_FORECAST_FIELDS[fc[2]];
                    if (field) {
                        this.stateMap.set(stateId, { target: 'forecast', key: field, dayIndex });
                        forecastIndices.add(dayIndex);
                    }
                }
            }
            // Initialize forecast days (1..N, capped at 7)
            const maxDay = forecastIndices.size > 0 ? Math.max(...forecastIndices) : -1;
            const forecastDays = [];
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
                const handler = (id, state) => this.onOmwStateChange(id, state);
                this.subs.push({ stateId, handler });
                this.props.stateContext.getState(stateId, handler);
            }
            this.setState({ loading: false });
        }
        catch (e) {
            console.warn('Weather widget: failed to discover open-meteo-weather states', e);
            this.setState({ loading: false });
        }
    }
    onOmwStateChange = (id, state) => {
        const mapping = this.stateMap.get(id);
        if (!mapping) {
            return;
        }
        const val = state?.val;
        if (mapping.target === 'current') {
            switch (mapping.key) {
                case 'temperature':
                    this.setState({ temperature: numOrNull(val) });
                    break;
                case 'realFeel':
                    this.setState({ realFeel: numOrNull(val) });
                    break;
                case 'humidity':
                    this.setState({ humidity: numOrNull(val) });
                    break;
                case 'windSpeed':
                    this.setState({ windSpeed: numOrNull(val) });
                    break;
                case 'pressure': {
                    const n = numOrNull(val);
                    this.setState({ pressure: n != null ? Math.round(n) : null });
                    break;
                }
                case 'windDirection': {
                    const n = numOrNull(val);
                    this.setState({ windDirection: n != null ? degToCardinal(n) : null });
                    break;
                }
                case 'weatherState':
                    this.setState({ weatherState: val != null && val !== '' ? String(val) : null });
                    break;
                case 'wmoCode': {
                    const n = numOrNull(val);
                    this.setState({ wmoCode: n ?? undefined });
                    break;
                }
                case 'icon':
                    this.setState({ icon: val ? String(val) : null });
                    break;
            }
            return;
        }
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
                case 'tempMin':
                    updated.tempMin = numOrNull(val);
                    break;
                case 'tempMax':
                    updated.tempMax = numOrNull(val);
                    break;
                case 'precipitationChance':
                    updated.precipitationChance = numOrNull(val);
                    break;
                case 'state':
                    updated.state = val != null && val !== '' ? String(val) : null;
                    break;
                case 'icon':
                    updated.icon = val ? String(val) : null;
                    break;
                case 'wmoCode':
                    updated.wmoCode = numOrNull(val) ?? undefined;
                    break;
                case 'dow':
                    // Localized day name from the adapter takes precedence
                    if (val) {
                        updated.dow = String(val);
                    }
                    break;
                case 'time':
                    // Fall back to deriving the day-of-week from the ISO date only if not set via name_day
                    if (!updated.dow && val) {
                        updated.dow = formatDow(String(val), this.props.stateContext.language);
                    }
                    break;
            }
            return { forecastDays: days.map(d => (d.index === dayIndex ? updated : d)) };
        });
    };
    static renderWeatherIcon(src, size, wmoCode) {
        if (src) {
            return (React.createElement("img", { src: src, alt: "", style: { width: size, height: size, objectFit: 'contain' } }));
        }
        // For open-meteo: show WMO emoji if available
        if (wmoCode != null) {
            return (React.createElement(Box, { sx: {
                    fontSize: size * 0.75,
                    lineHeight: 1,
                    width: size,
                    height: size,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                } }, wmoToIcon(wmoCode)));
        }
        return React.createElement(WbCloudy, { sx: { fontSize: size, color: 'text.secondary' } });
    }
    static renderForecastRow(day, compact) {
        const fontSize = compact ? '0.7rem' : '0.8rem';
        const iconSize = compact ? 22 : 28;
        return (React.createElement(Box, { key: day.index, sx: { display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 } },
            React.createElement(Typography, { variant: "caption", sx: {
                    fontWeight: 600,
                    fontSize,
                    width: compact ? 28 : 36,
                    flexShrink: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                } }, day.dow || `D${day.index}`),
            WidgetWeather.renderWeatherIcon(day.icon, iconSize, day.wmoCode),
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
    renderCompact() {
        const { icon, temperature, weatherState, loading, wmoCode } = this.state;
        const { color } = this.props.settings;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        if (!this.isConfigured()) {
            return (React.createElement(Box, { sx: theme => WidgetGeneric.getStyleCompact(theme) },
                React.createElement(Box, { sx: theme => ({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        aspectRatio: '1',
                        ...this.applyTileStyles(theme, false, { accent: color, inactiveColor: color }),
                    }) },
                    indicators,
                    React.createElement(Typography, { variant: "caption", sx: { color: 'text.secondary' } }, I18n.t('wm_Not configured')))));
        }
        return (React.createElement(Box, { sx: theme => WidgetGeneric.getStyleCompact(theme) },
            React.createElement(Box, { onClick: this.openDetail, sx: theme => ({
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
                }) },
                indicators,
                loading ? (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 } },
                    React.createElement(Typography, { variant: "caption", sx: { color: 'text.secondary' } }, "..."))) : (React.createElement(React.Fragment, null,
                    React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
                        WidgetWeather.renderWeatherIcon(icon, 36, wmoCode),
                        React.createElement(Typography, { sx: { fontWeight: 700, fontSize: 'max(1.2rem, 12cqi)', lineHeight: 1.1 } }, temperature != null
                            ? `${formatFloat(temperature, 1, this.props.stateContext.isFloatComma)}°`
                            : '\u2014')),
                    weatherState ? (React.createElement(Typography, { variant: "caption", sx: {
                            color: 'text.secondary',
                            fontSize: 'max(0.65rem, 6cqi)',
                            lineHeight: 1.2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        } }, weatherState)) : null,
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
                        }) }, this.getLocationTitle()))))));
    }
    renderWide() {
        const { icon, temperature, weatherState, humidity, windSpeed, pressure, loading, wmoCode } = this.state;
        const { color } = this.props.settings;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        return (React.createElement(Box, { sx: theme => WidgetGeneric.getStyleWide(theme) },
            React.createElement(Box, { onClick: this.openDetail, sx: theme => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    width: '100%',
                    height: 80,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    ...this.applyTileStyles(theme, false, { accent: color, inactiveColor: color }),
                }) },
                indicators,
                loading ? (React.createElement(Typography, { variant: "caption", sx: { color: 'text.secondary', mx: 'auto' } }, "...")) : (React.createElement(React.Fragment, null,
                    WidgetWeather.renderWeatherIcon(icon, 40, wmoCode),
                    React.createElement(Box, { sx: { flex: 1, minWidth: 0 } },
                        React.createElement(Box, { sx: { display: 'flex', alignItems: 'baseline', gap: 1 } },
                            React.createElement(Typography, { variant: "h6", sx: { fontWeight: 700 } }, temperature != null
                                ? `${formatFloat(temperature, 1, this.props.stateContext.isFloatComma)}°`
                                : '\u2014'),
                            weatherState ? (React.createElement(Typography, { variant: "body2", sx: {
                                    color: 'text.secondary',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                } }, weatherState)) : null),
                        React.createElement(Box, { sx: { display: 'flex', gap: 1.5, alignItems: 'center' } },
                            humidity != null ? (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: '3px' } },
                                React.createElement(WaterDrop, { sx: { fontSize: 14, color: 'text.secondary' } }),
                                React.createElement(Typography, { variant: "caption", sx: { color: 'text.secondary' } },
                                    Math.round(humidity),
                                    "%"))) : null,
                            windSpeed != null ? (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: '3px' } },
                                React.createElement(Air, { sx: { fontSize: 14, color: 'text.secondary' } }),
                                React.createElement(Typography, { variant: "caption", sx: { color: 'text.secondary' } },
                                    Math.round(windSpeed),
                                    " km/h"))) : null,
                            pressure != null ? (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: '3px' } },
                                React.createElement(Speed, { sx: { fontSize: 14, color: 'text.secondary' } }),
                                React.createElement(Typography, { variant: "caption", sx: { color: 'text.secondary' } },
                                    Math.round(pressure),
                                    " hPa"))) : null)))))));
    }
    renderWideTall() {
        const { icon, temperature, weatherState, humidity, windSpeed, pressure, precipitationChance, forecastDays, loading, wmoCode, } = this.state;
        const { color } = this.props.settings;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        const visibleDays = forecastDays
            .filter(d => d.icon || d.wmoCode != null || d.tempMin != null || d.tempMax != null)
            .slice(0, 1);
        return (React.createElement(Box, { sx: theme => WidgetGeneric.getStyleWideTall(theme) },
            React.createElement(Box, { sx: { width: 'calc(50% - 6px)', aspectRatio: '1' } }),
            React.createElement(Box, { onClick: this.openDetail, sx: theme => ({
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
                }) },
                indicators,
                loading ? (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 } },
                    React.createElement(Typography, { variant: "caption", sx: { color: 'text.secondary' } }, "..."))) : (React.createElement(React.Fragment, null,
                    React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1.5 } },
                        WidgetWeather.renderWeatherIcon(icon, 52, wmoCode),
                        React.createElement(Box, { sx: { flex: 1, minWidth: 0 } },
                            React.createElement(Typography, { sx: { fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.1 } }, temperature != null
                                ? `${formatFloat(temperature, 1, this.props.stateContext.isFloatComma)}°`
                                : '\u2014'),
                            weatherState ? (React.createElement(Typography, { variant: "body2", sx: { color: 'text.secondary', lineHeight: 1.2 } }, weatherState)) : null)),
                    React.createElement(Box, { sx: { display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' } },
                        humidity != null ? (React.createElement(Box, { sx: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                color: 'text.secondary',
                            } },
                            React.createElement(WaterDrop, { sx: { fontSize: 14 } }),
                            React.createElement(Typography, { variant: "caption" },
                                Math.round(humidity),
                                "%"))) : null,
                        windSpeed != null ? (React.createElement(Box, { sx: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                color: 'text.secondary',
                            } },
                            React.createElement(Air, { sx: { fontSize: 14 } }),
                            React.createElement(Typography, { variant: "caption" },
                                Math.round(windSpeed),
                                " km/h"))) : null,
                        pressure != null ? (React.createElement(Box, { sx: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                color: 'text.secondary',
                            } },
                            React.createElement(Speed, { sx: { fontSize: 14 } }),
                            React.createElement(Typography, { variant: "caption" },
                                Math.round(pressure),
                                " hPa"))) : null,
                        precipitationChance != null ? (React.createElement(Box, { sx: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                color: 'text.secondary',
                            } },
                            React.createElement(Opacity, { sx: { fontSize: 14 } }),
                            React.createElement(Typography, { variant: "caption" },
                                Math.round(precipitationChance),
                                "%"))) : null),
                    visibleDays.length > 0 ? (React.createElement(Box, { sx: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            overflow: 'hidden',
                            flex: 1,
                            minHeight: 0,
                            justifyContent: 'center',
                        } }, visibleDays.map(day => WidgetWeather.renderForecastRow(day, visibleDays.length > 3)))) : null,
                    React.createElement(Typography, { variant: "body2", sx: {
                            fontWeight: 600,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                        } }, this.getLocationTitle()))))));
    }
    openDetail = () => {
        if (this.isConfigured() && !this.state.loading) {
            this.setState({ detailOpen: true });
        }
    };
    renderDetailDialog() {
        if (!this.state.detailOpen) {
            return null;
        }
        const { icon, temperature, weatherState, humidity, windSpeed, windDirection, pressure, precipitationChance, realFeel, wmoCode, forecastDays, } = this.state;
        const allDays = forecastDays.filter(d => d.icon || d.wmoCode != null || d.tempMin != null || d.tempMax != null);
        const title = this.getLocationTitle();
        return (React.createElement(Dialog, { open: true, onClose: () => this.setState({ detailOpen: false }), maxWidth: "xs", fullWidth: true },
            React.createElement(DialogTitle, { sx: { display: 'flex', alignItems: 'center', pr: 1 } },
                React.createElement(Typography, { variant: "h6", sx: { flex: 1, fontWeight: 700 } }, title),
                React.createElement(IconButton, { size: "small", onClick: () => this.setState({ detailOpen: false }) },
                    React.createElement(Close, null))),
            React.createElement(DialogContent, null,
                React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2, mb: 2 } },
                    WidgetWeather.renderWeatherIcon(icon, 64, wmoCode),
                    React.createElement(Box, null,
                        React.createElement(Typography, { variant: "h4", sx: { fontWeight: 700, lineHeight: 1.1 } }, temperature != null
                            ? `${formatFloat(temperature, 1, this.props.stateContext.isFloatComma)}°C`
                            : '\u2014'),
                        weatherState ? (React.createElement(Typography, { variant: "body1", sx: { color: 'text.secondary' } }, weatherState)) : null)),
                React.createElement(Box, { sx: {
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 1,
                        mb: 2.5,
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: 'action.hover',
                    } },
                    humidity != null ? (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
                        React.createElement(WaterDrop, { sx: { fontSize: 18, color: 'text.secondary' } }),
                        React.createElement(Box, null,
                            React.createElement(Typography, { variant: "caption", sx: { color: 'text.secondary', display: 'block', lineHeight: 1.2 } }, I18n.t('wm_Humidity')),
                            React.createElement(Typography, { variant: "body2", sx: { fontWeight: 600 } },
                                Math.round(humidity),
                                "%")))) : null,
                    windSpeed != null ? (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
                        React.createElement(Air, { sx: { fontSize: 18, color: 'text.secondary' } }),
                        React.createElement(Box, null,
                            React.createElement(Typography, { variant: "caption", sx: { color: 'text.secondary', display: 'block', lineHeight: 1.2 } }, I18n.t('wm_Wind')),
                            React.createElement(Typography, { variant: "body2", sx: { fontWeight: 600 } },
                                Math.round(windSpeed),
                                " km/h",
                                windDirection ? ` ${windDirection}` : '')))) : null,
                    pressure != null ? (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
                        React.createElement(Speed, { sx: { fontSize: 18, color: 'text.secondary' } }),
                        React.createElement(Box, null,
                            React.createElement(Typography, { variant: "caption", sx: { color: 'text.secondary', display: 'block', lineHeight: 1.2 } }, I18n.t('wm_Pressure')),
                            React.createElement(Typography, { variant: "body2", sx: { fontWeight: 600 } },
                                Math.round(pressure),
                                " hPa")))) : null,
                    precipitationChance != null ? (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
                        React.createElement(Opacity, { sx: { fontSize: 18, color: 'text.secondary' } }),
                        React.createElement(Box, null,
                            React.createElement(Typography, { variant: "caption", sx: { color: 'text.secondary', display: 'block', lineHeight: 1.2 } }, I18n.t('wm_Precipitation')),
                            React.createElement(Typography, { variant: "body2", sx: { fontWeight: 600 } },
                                Math.round(precipitationChance),
                                "%")))) : null,
                    realFeel != null ? (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
                        React.createElement(Thermostat, { sx: { fontSize: 18, color: 'text.secondary' } }),
                        React.createElement(Box, null,
                            React.createElement(Typography, { variant: "caption", sx: { color: 'text.secondary', display: 'block', lineHeight: 1.2 } }, I18n.t('wm_Feels like')),
                            React.createElement(Typography, { variant: "body2", sx: { fontWeight: 600 } },
                                formatFloat(realFeel, 1, this.props.stateContext.isFloatComma),
                                "\u00B0C")))) : null),
                allDays.length > 0 ? (React.createElement(React.Fragment, null,
                    React.createElement(Typography, { variant: "subtitle2", sx: { fontWeight: 700, mb: 1 } }, I18n.t('wm_Forecast')),
                    React.createElement(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 0.5 } }, allDays.map(day => (React.createElement(Box, { key: day.index, sx: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            py: 0.75,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            '&:last-child': { borderBottom: 'none' },
                        } },
                        React.createElement(Typography, { variant: "body2", sx: { fontWeight: 600, width: 40, flexShrink: 0 } }, day.dow || `D${day.index}`),
                        WidgetWeather.renderWeatherIcon(day.icon, 32, day.wmoCode),
                        React.createElement(Box, { sx: { flex: 1, minWidth: 0 } },
                            React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
                                day.tempMax != null ? (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: '2px' } },
                                    React.createElement(ArrowUpward, { sx: { fontSize: 14, color: '#f44336' } }),
                                    React.createElement(Typography, { variant: "body2", sx: { fontWeight: 600 } },
                                        Math.round(day.tempMax),
                                        "\u00B0"))) : null,
                                day.tempMin != null ? (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: '2px' } },
                                    React.createElement(ArrowDownward, { sx: { fontSize: 14, color: '#2196f3' } }),
                                    React.createElement(Typography, { variant: "body2", sx: { color: 'text.secondary' } },
                                        Math.round(day.tempMin),
                                        "\u00B0"))) : null),
                            day.state ? (React.createElement(Typography, { variant: "caption", sx: { color: 'text.secondary', display: 'block', lineHeight: 1.2 } }, day.state)) : null),
                        day.precipitationChance != null ? (React.createElement(Box, { sx: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                flexShrink: 0,
                            } },
                            React.createElement(Opacity, { sx: { fontSize: 14, color: 'text.secondary' } }),
                            React.createElement(Typography, { variant: "caption", sx: { color: 'text.secondary' } },
                                Math.round(day.precipitationChance),
                                "%"))) : null)))))) : null)));
    }
    render() {
        return (React.createElement(React.Fragment, null,
            super.render(),
            this.renderDetailDialog()));
    }
}
export default WidgetWeather;
//# sourceMappingURL=Weather.js.map