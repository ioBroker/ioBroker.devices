import React from 'react';
import { Box, Dialog, DialogContent, IconButton, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import WidgetGeneric, { isNeumorphicTheme, formatFloat, } from './Generic';
import { ICON_MAP, ICON_DARK_MODE, ICON_SATELLITE } from './configIcons';
import { SIZE_OPTIONS_WITH_2X2 } from '../configUtils';
const EXTRA_POSITIONS = [1, 2, 3];
const MAP_THEMES = {
    standard: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
    },
    dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 20,
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri',
        maxZoom: 18,
    },
};
// --- Predefined marker icon options (also used in settings dropdown) ---
const MARKER_ICON_KEYS = ['', 'person', 'car', 'moped', 'bicycle', 'boat', 'yacht'];
const MARKER_ICON_LABELS = {
    '': 'wm_marker_dot',
    person: 'wm_marker_person',
    car: 'wm_marker_car',
    moped: 'wm_marker_moped',
    bicycle: 'wm_marker_bicycle',
    boat: 'wm_marker_boat',
    yacht: 'wm_marker_yacht',
};
// --- Predefined marker icon SVG paths (Material Design) ---
const PREDEFINED_ICON_PATHS = {
    person: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
    boat: 'M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.48.26-.6.5s-.15.52-.06.78L3.95 19zM6 6h12v3.97L12 8 6 9.97V6z',
    car: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z',
    moped: 'M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-2.21 0-4 1.79-4 4v3h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4.48L19 10.35V7zM7 17c-.55 0-1-.45-1-1h2c0 .55-.45 1-1 1zm12-1c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z',
    bicycle: 'M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5zm14-8.5c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5zM12.8 10L10.2 16H6v-2h2.8l1.7-2.8L8.8 8l2-3.3L14 8h3V6h-4l-2.8 4z',
    yacht: 'M12 3L5 16h7V3zm0 3l5 8h-5V6zM3 18q9 4 18 0H3z',
};
/** Create a pin-shaped SVG marker with an inner icon */
function createPinSvg(innerPath, color) {
    return (`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">` +
        `<path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 28 16 28s16-16 16-28C32 7.16 24.84 0 16 0z" fill="${color}"/>` +
        `<circle cx="16" cy="14" r="10" fill="white" opacity="0.25"/>` +
        `<g transform="translate(6,4) scale(0.833)" fill="white"><path d="${innerPath}"/></g>` +
        `</svg>`);
}
/** Create the default dot marker icon */
function createDefaultMarkerIcon(size = 12, color = '#1976d2') {
    return L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
}
/** Create a Leaflet icon based on markerIcon setting value */
function createMarkerIcon(markerIconSetting, size = 'small', color = '#1976d2') {
    // Custom uploaded image (base64 data URI)
    if (markerIconSetting?.startsWith('data:')) {
        const s = size === 'large' ? 40 : 28;
        return L.icon({
            iconUrl: markerIconSetting,
            iconSize: [s, s],
            iconAnchor: [s / 2, s],
        });
    }
    // Predefined icon type
    const path = PREDEFINED_ICON_PATHS[markerIconSetting];
    if (path) {
        const pinW = size === 'large' ? 32 : 24;
        const pinH = size === 'large' ? 44 : 33;
        const svg = createPinSvg(path, color);
        return L.divIcon({
            className: '',
            html: `<div style="width:${pinW}px;height:${pinH}px">${svg}</div>`,
            iconSize: [pinW, pinH],
            iconAnchor: [pinW / 2, pinH],
        });
    }
    // Default dot
    return createDefaultMarkerIcon(size === 'large' ? 16 : 12, color);
}
/**
 * Widget for `Types.location` (separate lat/lng) and Types.locationOne (combined GPS string).
 * Always shows map as background. Coordinates display is toggled via settings.
 * Clicking opens a fullscreen interactive map dialog.
 */
export class WidgetLocation extends WidgetGeneric {
    latId;
    lngId;
    gpsId;
    elevationId;
    radiusId;
    accuracyId;
    /** Tile map */
    mapContainer = null;
    map = null;
    tileLayer = null;
    marker = null;
    circle = null;
    extraMarkers = {};
    lastLat = null;
    lastLng = null;
    lastRadius = null;
    lastMapTheme = '';
    lastMarkerIcon = '';
    /** Cache of subscribed extra-position state IDs (so we unsubscribe on settings change). */
    extraSubscriptions = {};
    /** Dialog map */
    dialogMapContainer = null;
    dialogMap = null;
    dialogTileLayer = null;
    dialogMarker = null;
    dialogCircle = null;
    dialogExtraMarkers = {};
    constructor(props) {
        super(props);
        const states = props.widget.control.states;
        const lat = states.find(s => s.name === 'LATITUDE');
        const lng = states.find(s => s.name === 'LONGITUDE');
        const gps = states.find(s => s.name === 'GPS');
        this.latId = lat?.id ?? null;
        this.lngId = lng?.id ?? null;
        this.gpsId = gps?.id ?? null;
        this.elevationId = states.find(s => s.name === 'ELEVATION')?.id ?? null;
        this.radiusId = states.find(s => s.name === 'RADIUS')?.id ?? null;
        this.accuracyId = states.find(s => s.name === 'ACCURACY')?.id ?? null;
        this.state = {
            ...this.state,
            latitude: null,
            longitude: null,
            elevation: null,
            radius: null,
            accuracy: null,
            gpsString: null,
            dialogOpen: false,
            extras: {
                1: { latitude: null, longitude: null },
                2: { latitude: null, longitude: null },
                3: { latitude: null, longitude: null },
            },
        };
    }
    static getDefaultSettings() {
        return {
            ...WidgetGeneric.getDefaultSettings(),
            showCoordinates: false,
            markerIcon: '',
            mapTheme: 'standard',
        };
    }
    static getConfigSchema() {
        const iconOptions = MARKER_ICON_KEYS.map(k => ({ value: k, label: MARKER_ICON_LABELS[k] }));
        const items = {
            // Override base size to also expose 2x2
            size: {
                type: 'select',
                label: 'wm_Size',
                options: SIZE_OPTIONS_WITH_2X2,
                default: '1x1',
                format: 'radio',
                horizontal: true,
                noTranslation: true,
            },
            showCoordinates: {
                type: 'checkbox',
                label: 'wm_Show coordinates',
                default: false,
            },
            mapTheme: {
                type: 'select',
                label: 'wm_Map theme',
                options: [
                    { value: 'standard', label: 'wm_map_standard', icon: ICON_MAP },
                    { value: 'dark', label: 'wm_map_dark', icon: ICON_DARK_MODE },
                    { value: 'satellite', label: 'wm_map_satellite', icon: ICON_SATELLITE },
                ],
                default: 'standard',
                format: 'radio',
            },
            markerIcon: {
                type: 'select',
                label: 'wm_Marker icon',
                options: iconOptions,
                default: '',
            },
        };
        // Extra positions 1..3 — each has a GPS state ID ("lat,lng"), an optional name, and its own icon
        for (const i of EXTRA_POSITIONS) {
            items[`extraPosition${i}Id`] = {
                type: 'objectId',
                label: `wm_Additional position ${i}`,
                newLine: true,
            };
            items[`extraPosition${i}Name`] = {
                type: 'text',
                label: 'wm_Position name',
                hidden: `!data.extraPosition${i}Id`,
            };
            items[`extraPosition${i}Icon`] = {
                type: 'select',
                label: 'wm_Marker icon',
                options: iconOptions,
                default: '',
                hidden: `!data.extraPosition${i}Id`,
            };
        }
        return {
            name: 'Location',
            schema: { type: 'panel', items },
        };
    }
    componentDidMount() {
        super.componentDidMount();
        if (this.latId) {
            this.props.stateContext.getState(this.latId, this.onLatChange);
        }
        if (this.lngId) {
            this.props.stateContext.getState(this.lngId, this.onLngChange);
        }
        if (this.gpsId) {
            this.props.stateContext.getState(this.gpsId, this.onGpsChange);
        }
        if (this.elevationId) {
            this.props.stateContext.getState(this.elevationId, this.onElevationChange);
        }
        if (this.radiusId) {
            this.props.stateContext.getState(this.radiusId, this.onRadiusChange);
        }
        if (this.accuracyId) {
            this.props.stateContext.getState(this.accuracyId, this.onAccuracyChange);
        }
        this.syncExtraSubscriptions();
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.latId) {
            this.props.stateContext.removeState(this.latId, this.onLatChange);
        }
        if (this.lngId) {
            this.props.stateContext.removeState(this.lngId, this.onLngChange);
        }
        if (this.gpsId) {
            this.props.stateContext.removeState(this.gpsId, this.onGpsChange);
        }
        if (this.elevationId) {
            this.props.stateContext.removeState(this.elevationId, this.onElevationChange);
        }
        if (this.radiusId) {
            this.props.stateContext.removeState(this.radiusId, this.onRadiusChange);
        }
        if (this.accuracyId) {
            this.props.stateContext.removeState(this.accuracyId, this.onAccuracyChange);
        }
        // Unsubscribe extras
        for (const i of EXTRA_POSITIONS) {
            const id = this.extraSubscriptions[i];
            if (id) {
                this.props.stateContext.removeState(id, this.makeExtraHandler(i));
            }
        }
        this.destroyMap();
        this.destroyDialogMap();
    }
    /** Subscribe/unsubscribe extra-position states based on current settings. Called on mount + componentDidUpdate. */
    syncExtraSubscriptions() {
        for (const i of EXTRA_POSITIONS) {
            const settingsKey = `extraPosition${i}Id`;
            const newId = this.props.settings?.[settingsKey] || '';
            const oldId = this.extraSubscriptions[i] || '';
            if (newId === oldId) {
                continue;
            }
            const handler = this.makeExtraHandler(i);
            if (oldId) {
                this.props.stateContext.removeState(oldId, handler);
            }
            if (newId) {
                this.extraSubscriptions[i] = newId;
                this.props.stateContext.getState(newId, handler);
            }
            else {
                delete this.extraSubscriptions[i];
                // Clear coordinates if id removed
                this.setState(prev => ({
                    extras: { ...prev.extras, [i]: { latitude: null, longitude: null } },
                }));
            }
        }
    }
    /** Memoized per-index handler so add/removeState match. */
    extraHandlers = {};
    makeExtraHandler(i) {
        this.extraHandlers[i] ||= (_id, state) => {
            const parsed = WidgetLocation.parseLatLng(state?.val);
            this.setState(prev => ({
                extras: { ...prev.extras, [i]: parsed },
            }));
        };
        return this.extraHandlers[i];
    }
    static parseLatLng(raw) {
        if (typeof raw !== 'string' || !raw) {
            return { latitude: null, longitude: null };
        }
        const parts = raw.split(/[,;]/);
        if (parts.length < 2) {
            return { latitude: null, longitude: null };
        }
        const lat = parseFloat(parts[0].trim());
        const lng = parseFloat(parts[1].trim());
        if (isNaN(lat) || isNaN(lng)) {
            return { latitude: null, longitude: null };
        }
        return { latitude: lat, longitude: lng };
    }
    componentDidUpdate(prevProps) {
        super.componentDidUpdate(prevProps);
        const { latitude, longitude, radius, accuracy } = this.state;
        const r = radius || accuracy;
        // Position/radius change
        if (latitude !== this.lastLat || longitude !== this.lastLng || r !== this.lastRadius) {
            this.lastLat = latitude;
            this.lastLng = longitude;
            this.lastRadius = r;
            this.updateMap();
            this.updateDialogMap();
        }
        // Map theme change
        const newTheme = this.props.settings?.mapTheme || 'standard';
        if (newTheme !== this.lastMapTheme) {
            this.lastMapTheme = newTheme;
            this.updateTileTheme(this.map, 'tile');
            this.updateTileTheme(this.dialogMap, 'dialog');
        }
        // Marker icon change
        const newMarker = this.props.settings?.markerIcon || '';
        if (newMarker !== this.lastMarkerIcon) {
            this.lastMarkerIcon = newMarker;
            this.updateMarkerIcons();
        }
        // Extra-position settings change → re-subscribe and refresh markers
        let extrasChanged = false;
        for (const i of EXTRA_POSITIONS) {
            const idKey = `extraPosition${i}Id`;
            const iconKey = `extraPosition${i}Icon`;
            const nameKey = `extraPosition${i}Name`;
            if (this.props.settings?.[idKey] !== prevProps.settings?.[idKey] ||
                this.props.settings?.[iconKey] !== prevProps.settings?.[iconKey] ||
                this.props.settings?.[nameKey] !== prevProps.settings?.[nameKey]) {
                extrasChanged = true;
            }
        }
        if (extrasChanged) {
            this.syncExtraSubscriptions();
        }
        // Always refresh extra markers (positions change frequently, settings change rarely — both go here)
        this.updateExtraMarkers(this.map, this.extraMarkers, 'small');
        this.updateExtraMarkers(this.dialogMap, this.dialogExtraMarkers, 'large');
    }
    // --- State handlers ---
    onLatChange = (_id, state) => {
        const val = state.val != null ? Number(state.val) : null;
        const latitude = val != null && !isNaN(val) ? val : null;
        if (latitude !== this.state.latitude) {
            this.setState({ latitude });
        }
    };
    onLngChange = (_id, state) => {
        const val = state.val != null ? Number(state.val) : null;
        const longitude = val != null && !isNaN(val) ? val : null;
        if (longitude !== this.state.longitude) {
            this.setState({ longitude });
        }
    };
    onGpsChange = (_id, state) => {
        const raw = state.val;
        if (typeof raw !== 'string' || !raw) {
            this.setState({ gpsString: null, latitude: null, longitude: null });
            return;
        }
        const parts = raw.split(/[,;]/);
        if (parts.length >= 2) {
            const lat = parseFloat(parts[0].trim());
            const lng = parseFloat(parts[1].trim());
            if (!isNaN(lat) && !isNaN(lng)) {
                this.setState({ gpsString: raw, latitude: lat, longitude: lng });
                return;
            }
        }
        this.setState({ gpsString: raw, latitude: null, longitude: null });
    };
    onElevationChange = (_id, state) => {
        const val = state.val != null ? Number(state.val) : null;
        this.setState({ elevation: val != null && !isNaN(val) ? val : null });
    };
    onRadiusChange = (_id, state) => {
        const val = state.val != null ? Number(state.val) : null;
        this.setState({ radius: val != null && !isNaN(val) ? val : null });
    };
    onAccuracyChange = (_id, state) => {
        const val = state.val != null ? Number(state.val) : null;
        this.setState({ accuracy: val != null && !isNaN(val) ? val : null });
    };
    // --- Helpers ---
    getThemeConfig() {
        const key = this.props.settings?.mapTheme || 'standard';
        return MAP_THEMES[key] || MAP_THEMES.standard;
    }
    getMarkerColor() {
        return this.props.settings?.color || '#1976d2';
    }
    // --- Tile theme update ---
    updateTileTheme(map, which) {
        if (!map) {
            return;
        }
        const theme = this.getThemeConfig();
        const layerRef = which === 'tile' ? this.tileLayer : this.dialogTileLayer;
        if (layerRef) {
            layerRef.remove();
        }
        const newLayer = L.tileLayer(theme.url, {
            maxZoom: theme.maxZoom,
            ...(which === 'dialog' ? { attribution: theme.attribution } : {}),
        }).addTo(map);
        if (which === 'tile') {
            this.tileLayer = newLayer;
        }
        else {
            this.dialogTileLayer = newLayer;
        }
    }
    // --- Marker icon update ---
    updateMarkerIcons() {
        const markerSetting = this.props.settings?.markerIcon || '';
        const color = this.getMarkerColor();
        if (this.marker) {
            this.marker.setIcon(createMarkerIcon(markerSetting, 'small', color));
        }
        if (this.dialogMarker) {
            this.dialogMarker.setIcon(createMarkerIcon(markerSetting, 'large', color));
        }
    }
    /**
     * Sync extra-position markers onto a map. For each configured position:
     * - If it has valid coordinates, add/update the marker (with current icon + tooltip).
     * - Otherwise, remove the existing marker.
     * Called on every componentDidUpdate so positions/icons stay live.
     */
    updateExtraMarkers(map, markers, size) {
        if (!map) {
            return;
        }
        const color = this.getMarkerColor();
        for (const i of EXTRA_POSITIONS) {
            const pos = this.state.extras[i];
            const idKey = `extraPosition${i}Id`;
            const id = this.props.settings?.[idKey];
            const hasValidPos = id && pos.latitude != null && pos.longitude != null;
            if (!hasValidPos) {
                if (markers[i]) {
                    markers[i].remove();
                    delete markers[i];
                }
                continue;
            }
            const iconKey = `extraPosition${i}Icon`;
            const nameKey = `extraPosition${i}Name`;
            const icon = createMarkerIcon(this.props.settings?.[iconKey] || '', size, color);
            const name = this.props.settings?.[nameKey] || '';
            const latlng = [pos.latitude, pos.longitude];
            if (markers[i]) {
                markers[i].setLatLng(latlng);
                markers[i].setIcon(icon);
            }
            else {
                markers[i] = L.marker(latlng, { icon, interactive: !!name }).addTo(map);
            }
            // Refresh tooltip
            markers[i].unbindTooltip();
            if (name) {
                markers[i].bindTooltip(name, { direction: 'top', offset: [0, size === 'large' ? -40 : -28] });
            }
        }
    }
    // --- Tile map (non-interactive) ---
    initMap() {
        if (this.map || !this.mapContainer) {
            return;
        }
        const lat = this.state.latitude ?? 51.505;
        const lng = this.state.longitude ?? 13.404;
        const theme = this.getThemeConfig();
        const markerSetting = this.props.settings?.markerIcon || '';
        const color = this.getMarkerColor();
        this.lastMapTheme = this.props.settings?.mapTheme || 'standard';
        this.lastMarkerIcon = markerSetting;
        this.map = L.map(this.mapContainer, {
            center: [lat, lng],
            zoom: 15,
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            touchZoom: false,
            boxZoom: false,
            keyboard: false,
        });
        this.tileLayer = L.tileLayer(theme.url, {
            maxZoom: theme.maxZoom,
        }).addTo(this.map);
        this.marker = L.marker([lat, lng], {
            icon: createMarkerIcon(markerSetting, 'small', color),
            interactive: false,
        }).addTo(this.map);
        const r = this.state.radius || this.state.accuracy;
        if (r && r > 0) {
            this.circle = L.circle([lat, lng], {
                radius: r,
                color,
                fillColor: color,
                fillOpacity: 0.15,
                weight: 1,
            }).addTo(this.map);
        }
        this.updateExtraMarkers(this.map, this.extraMarkers, 'small');
    }
    updateMap() {
        const { latitude, longitude, radius, accuracy } = this.state;
        if (latitude == null || longitude == null) {
            return;
        }
        if (!this.map) {
            setTimeout(() => this.initMap(), 50);
            return;
        }
        const pos = [latitude, longitude];
        this.map.setView(pos, this.map.getZoom());
        this.marker?.setLatLng(pos);
        const r = radius || accuracy;
        const color = this.getMarkerColor();
        if (r && r > 0) {
            if (this.circle) {
                this.circle.setLatLng(pos);
                this.circle.setRadius(r);
            }
            else {
                this.circle = L.circle(pos, {
                    radius: r,
                    color,
                    fillColor: color,
                    fillOpacity: 0.15,
                    weight: 1,
                }).addTo(this.map);
            }
        }
        else if (this.circle) {
            this.circle.remove();
            this.circle = null;
        }
    }
    destroyMap() {
        if (this.map) {
            this.map.remove();
            this.map = null;
            this.tileLayer = null;
            this.marker = null;
            this.circle = null;
            this.extraMarkers = {};
        }
    }
    onMapRef = (el) => {
        if (el && !this.map) {
            this.mapContainer = el;
            this.initMap();
        }
    };
    // --- Dialog map (interactive) ---
    initDialogMap() {
        if (this.dialogMap || !this.dialogMapContainer) {
            return;
        }
        const lat = this.state.latitude ?? 51.505;
        const lng = this.state.longitude ?? 13.404;
        const theme = this.getThemeConfig();
        const markerSetting = this.props.settings?.markerIcon || '';
        const color = this.getMarkerColor();
        this.dialogMap = L.map(this.dialogMapContainer, {
            center: [lat, lng],
            zoom: 15,
            zoomControl: true,
            attributionControl: true,
            dragging: true,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            touchZoom: true,
            boxZoom: true,
            keyboard: true,
        });
        this.dialogTileLayer = L.tileLayer(theme.url, {
            maxZoom: theme.maxZoom,
            attribution: theme.attribution,
        }).addTo(this.dialogMap);
        this.dialogMarker = L.marker([lat, lng], {
            icon: createMarkerIcon(markerSetting, 'large', color),
            interactive: false,
        }).addTo(this.dialogMap);
        const r = this.state.radius || this.state.accuracy;
        if (r && r > 0) {
            this.dialogCircle = L.circle([lat, lng], {
                radius: r,
                color,
                fillColor: color,
                fillOpacity: 0.15,
                weight: 1.5,
            }).addTo(this.dialogMap);
        }
        this.updateExtraMarkers(this.dialogMap, this.dialogExtraMarkers, 'large');
    }
    updateDialogMap() {
        if (!this.dialogMap) {
            return;
        }
        const { latitude, longitude, radius, accuracy } = this.state;
        if (latitude == null || longitude == null) {
            return;
        }
        const pos = [latitude, longitude];
        this.dialogMap.setView(pos, this.dialogMap.getZoom());
        this.dialogMarker?.setLatLng(pos);
        const r = radius || accuracy;
        const color = this.getMarkerColor();
        if (r && r > 0) {
            if (this.dialogCircle) {
                this.dialogCircle.setLatLng(pos);
                this.dialogCircle.setRadius(r);
            }
            else {
                this.dialogCircle = L.circle(pos, {
                    radius: r,
                    color,
                    fillColor: color,
                    fillOpacity: 0.15,
                    weight: 1.5,
                }).addTo(this.dialogMap);
            }
        }
        else if (this.dialogCircle) {
            this.dialogCircle.remove();
            this.dialogCircle = null;
        }
    }
    destroyDialogMap() {
        if (this.dialogMap) {
            this.dialogMap.remove();
            this.dialogMap = null;
            this.dialogTileLayer = null;
            this.dialogMarker = null;
            this.dialogCircle = null;
            this.dialogExtraMarkers = {};
        }
    }
    onDialogMapRef = (el) => {
        if (el && !this.dialogMap) {
            this.dialogMapContainer = el;
            // Small delay so the dialog has finished layout
            setTimeout(() => this.initDialogMap(), 100);
        }
    };
    openDialog = () => {
        this.setState({ dialogOpen: true });
    };
    closeDialog = () => {
        this.destroyDialogMap();
        this.setState({ dialogOpen: false });
    };
    // --- Formatting ---
    formatShortPosition() {
        const { latitude, longitude } = this.state;
        if (latitude == null || longitude == null) {
            return '—';
        }
        const latDir = latitude >= 0 ? I18n.t('wm_N') : I18n.t('wm_S');
        const lngDir = longitude >= 0 ? I18n.t('wm_E') : I18n.t('wm_W');
        return `${formatFloat(Math.abs(latitude), 4, this.props.stateContext.isFloatComma)}${latDir}, ${formatFloat(Math.abs(longitude), 4, this.props.stateContext.isFloatComma)}${lngDir}`;
    }
    static formatCoord(val, posKey, negKey, isFloatComma) {
        const abs = Math.abs(val);
        const deg = Math.floor(abs);
        const minFloat = (abs - deg) * 60;
        const min = Math.floor(minFloat);
        const sec = formatFloat((minFloat - min) * 60, 1, isFloatComma);
        const dir = val >= 0 ? I18n.t(posKey) : I18n.t(negKey);
        return `${deg}°${min}'${sec}"${dir}`;
    }
    formatFullPosition() {
        const { latitude, longitude } = this.state;
        if (latitude == null || longitude == null) {
            return '—';
        }
        return `${WidgetLocation.formatCoord(latitude, 'wm_N', 'wm_S', this.props.stateContext.isFloatComma)} ${WidgetLocation.formatCoord(longitude, 'wm_E', 'wm_W', this.props.stateContext.isFloatComma)}`;
    }
    // --- Tile overrides ---
    isTileActive() {
        return this.state.latitude != null && this.state.longitude != null;
    }
    // eslint-disable-next-line class-methods-use-this
    hasTileAction() {
        return true;
    }
    onTileClick() {
        this.openDialog();
    }
    // --- Map dialog ---
    renderMapDialog() {
        if (!this.state.dialogOpen) {
            return null;
        }
        const { latitude, longitude, elevation } = this.state;
        const { name } = this.state;
        const showCoords = this.props.settings?.showCoordinates;
        return (React.createElement(Dialog, { open: true, onClose: this.closeDialog, maxWidth: false, fullWidth: true, slotProps: {
                paper: {
                    sx: {
                        width: '95vw',
                        height: '90vh',
                        maxWidth: '95vw',
                        maxHeight: '90vh',
                        m: 0,
                        overflow: 'hidden',
                    },
                },
            } },
            React.createElement(DialogContent, { sx: { p: 0, position: 'relative', display: 'flex', flexDirection: 'column' } },
                React.createElement(IconButton, { onClick: this.closeDialog, sx: {
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 1000,
                        bgcolor: 'background.paper',
                        boxShadow: 2,
                        '&:hover': { bgcolor: 'background.paper' },
                    } },
                    React.createElement(Close, null)),
                React.createElement(Box, { sx: {
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        zIndex: 1000,
                        bgcolor: 'rgba(0,0,0,0.6)',
                        color: 'white',
                        borderRadius: 1,
                        px: 1.5,
                        py: 0.5,
                    } },
                    React.createElement(Typography, { variant: "body2", sx: { fontWeight: 600 } }, this.props.settings?.name || name || '...'),
                    showCoords && latitude != null && longitude != null && (React.createElement(Typography, { variant: "caption", sx: { opacity: 0.8 } },
                        this.formatFullPosition(),
                        elevation != null ? ` · ${elevation.toFixed(0)} m` : ''))),
                React.createElement(Box, { ref: this.onDialogMapRef, sx: {
                        flex: 1,
                        '& .leaflet-container': {
                            width: '100%',
                            height: '100%',
                        },
                    } }))));
    }
    // --- Render: always map background ---
    renderMapTile(isWide, aspectRatio, huge) {
        const { name } = this.state;
        const isActive = this.isTileActive();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        const showCoords = this.props.settings?.showCoordinates;
        return (React.createElement(Box, { id: String(this.props.widget.id), className: this.getWidgetClass(), sx: theme => huge
                ? WidgetGeneric.getStyleHuge(theme)
                : isWide
                    ? WidgetGeneric.getStyleCompact(theme)
                    : WidgetGeneric.getStyleWide(theme) },
            React.createElement(Box, { onClick: () => this.onTileClick(), sx: theme => ({
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    width: '100%',
                    ...(aspectRatio ? { aspectRatio } : { height: 80 }),
                    textAlign: 'left',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    ...this.applyTileStyles(theme, isActive, { interactive: false }),
                    padding: 0,
                    position: 'relative',
                }) },
                React.createElement(Box, { ref: this.onMapRef, sx: {
                        position: 'absolute',
                        inset: 0,
                        zIndex: 0,
                        '& .leaflet-container': {
                            width: '100%',
                            height: '100%',
                        },
                    } }),
                indicators,
                React.createElement(Box, { sx: theme => ({
                        position: 'relative',
                        zIndex: 1,
                        background: `linear-gradient(transparent, ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.85)'})`,
                        px: isWide ? 2 : 'max(10px, 7cqi)',
                        pb: isWide ? 1 : 'max(8px, 5cqi)',
                        pt: 3,
                    }) },
                    React.createElement(Typography, { variant: "body2", sx: theme => ({
                            fontWeight: 600,
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            ...(isWide ? {} : { fontSize: 'max(0.875rem, 9cqi)' }),
                            ...(isNeumorphicTheme(theme)
                                ? {
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    fontSize: 'max(0.6rem, 6cqi)',
                                }
                                : {}),
                        }) }, this.props.settings?.name || name || '...'),
                    showCoords && (React.createElement(Typography, { variant: "caption", sx: {
                            color: 'text.secondary',
                            whiteSpace: 'nowrap',
                            ...(isWide ? {} : { fontSize: 'max(0.65rem, 6cqi)' }),
                        } }, this.formatShortPosition())))),
            this.renderMapDialog()));
    }
    renderCompact() {
        return this.renderMapTile(false, '1');
    }
    renderWide() {
        return this.renderMapTile(true);
    }
    renderWideTall() {
        return this.renderMapTile(true, '1');
    }
    renderHuge() {
        return this.renderMapTile(true, '1', true);
    }
    render() {
        const size = this.props.settings?.size || '1x1';
        if (size === '2x0.5') {
            return this.renderWide();
        }
        if (size === '2x1') {
            return this.renderWideTall();
        }
        if (size === '2x2') {
            return this.renderHuge();
        }
        return this.renderCompact();
    }
}
export default WidgetLocation;
//# sourceMappingURL=Location.js.map