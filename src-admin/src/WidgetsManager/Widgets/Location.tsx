import React from 'react';
import { Box, Dialog, DialogContent, IconButton, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import WidgetGeneric, { getTileStyles, type WidgetGenericProps, type WidgetGenericState } from './Generic';

interface WidgetLocationState extends WidgetGenericState {
    latitude: number | null;
    longitude: number | null;
    elevation: number | null;
    radius: number | null;
    accuracy: number | null;
    gpsString: string | null;
    dialogOpen: boolean;
}

/** Shared marker icon factory */
function createMarkerIcon(size = 12): L.DivIcon {
    return L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#1976d2;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
}

/**
 * Widget for Types.location (separate lat/lng) and Types.locationOne (combined GPS string).
 * Always shows map as background. Coordinates display is toggled via settings.
 * Clicking opens a fullscreen interactive map dialog.
 */
export class WidgetLocation extends WidgetGeneric<WidgetLocationState> {
    private readonly latId: string | null;
    private readonly lngId: string | null;
    private readonly gpsId: string | null;
    private readonly elevationId: string | null;
    private readonly radiusId: string | null;
    private readonly accuracyId: string | null;

    /** Tile map */
    private mapContainer: HTMLDivElement | null = null;
    private map: L.Map | null = null;
    private marker: L.Marker | null = null;
    private circle: L.Circle | null = null;
    private lastLat: number | null = null;
    private lastLng: number | null = null;
    private lastRadius: number | null = null;

    /** Dialog map */
    private dialogMapContainer: HTMLDivElement | null = null;
    private dialogMap: L.Map | null = null;
    private dialogMarker: L.Marker | null = null;
    private dialogCircle: L.Circle | null = null;

    constructor(props: WidgetGenericProps) {
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
        };
    }

    componentDidMount(): void {
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
    }

    componentWillUnmount(): void {
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
        this.destroyMap();
        this.destroyDialogMap();
    }

    componentDidUpdate(prevProps: Readonly<WidgetGenericProps>): void {
        super.componentDidUpdate(prevProps);
        const { latitude, longitude, radius, accuracy } = this.state;
        const r = radius || accuracy;
        if (latitude !== this.lastLat || longitude !== this.lastLng || r !== this.lastRadius) {
            this.lastLat = latitude;
            this.lastLng = longitude;
            this.lastRadius = r;
            this.updateMap();
            this.updateDialogMap();
        }
    }

    // --- State handlers ---

    private onLatChange = (_id: string, state: ioBroker.State): void => {
        const val = state.val != null ? Number(state.val) : null;
        const latitude = val != null && !isNaN(val) ? val : null;
        if (latitude !== this.state.latitude) {
            this.setState({ latitude });
        }
    };

    private onLngChange = (_id: string, state: ioBroker.State): void => {
        const val = state.val != null ? Number(state.val) : null;
        const longitude = val != null && !isNaN(val) ? val : null;
        if (longitude !== this.state.longitude) {
            this.setState({ longitude });
        }
    };

    private onGpsChange = (_id: string, state: ioBroker.State): void => {
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

    private onElevationChange = (_id: string, state: ioBroker.State): void => {
        const val = state.val != null ? Number(state.val) : null;
        this.setState({ elevation: val != null && !isNaN(val) ? val : null });
    };

    private onRadiusChange = (_id: string, state: ioBroker.State): void => {
        const val = state.val != null ? Number(state.val) : null;
        this.setState({ radius: val != null && !isNaN(val) ? val : null });
    };

    private onAccuracyChange = (_id: string, state: ioBroker.State): void => {
        const val = state.val != null ? Number(state.val) : null;
        this.setState({ accuracy: val != null && !isNaN(val) ? val : null });
    };

    // --- Tile map (non-interactive) ---

    private initMap(): void {
        if (this.map || !this.mapContainer) {
            return;
        }
        const lat = this.state.latitude ?? 51.505;
        const lng = this.state.longitude ?? 13.404;

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

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
        }).addTo(this.map);

        this.marker = L.marker([lat, lng], { icon: createMarkerIcon(), interactive: false }).addTo(this.map);

        const r = this.state.radius || this.state.accuracy;
        if (r && r > 0) {
            this.circle = L.circle([lat, lng], {
                radius: r,
                color: '#1976d2',
                fillColor: '#1976d2',
                fillOpacity: 0.15,
                weight: 1,
            }).addTo(this.map);
        }
    }

    private updateMap(): void {
        const { latitude, longitude, radius, accuracy } = this.state;
        if (latitude == null || longitude == null) {
            return;
        }
        if (!this.map) {
            setTimeout(() => this.initMap(), 50);
            return;
        }
        const pos: L.LatLngExpression = [latitude, longitude];
        this.map.setView(pos, this.map.getZoom());
        this.marker?.setLatLng(pos);

        const r = radius || accuracy;
        if (r && r > 0) {
            if (this.circle) {
                this.circle.setLatLng(pos);
                this.circle.setRadius(r);
            } else {
                this.circle = L.circle(pos, {
                    radius: r, color: '#1976d2', fillColor: '#1976d2', fillOpacity: 0.15, weight: 1,
                }).addTo(this.map);
            }
        } else if (this.circle) {
            this.circle.remove();
            this.circle = null;
        }
    }

    private destroyMap(): void {
        if (this.map) {
            this.map.remove();
            this.map = null;
            this.marker = null;
            this.circle = null;
        }
    }

    private onMapRef = (el: HTMLDivElement | null): void => {
        if (el && !this.map) {
            this.mapContainer = el;
            this.initMap();
        }
    };

    // --- Dialog map (interactive) ---

    private initDialogMap(): void {
        if (this.dialogMap || !this.dialogMapContainer) {
            return;
        }
        const lat = this.state.latitude ?? 51.505;
        const lng = this.state.longitude ?? 13.404;

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

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
        }).addTo(this.dialogMap);

        this.dialogMarker = L.marker([lat, lng], { icon: createMarkerIcon(16), interactive: false }).addTo(this.dialogMap);

        const r = this.state.radius || this.state.accuracy;
        if (r && r > 0) {
            this.dialogCircle = L.circle([lat, lng], {
                radius: r,
                color: '#1976d2',
                fillColor: '#1976d2',
                fillOpacity: 0.15,
                weight: 1.5,
            }).addTo(this.dialogMap);
        }
    }

    private updateDialogMap(): void {
        if (!this.dialogMap) {
            return;
        }
        const { latitude, longitude, radius, accuracy } = this.state;
        if (latitude == null || longitude == null) {
            return;
        }
        const pos: L.LatLngExpression = [latitude, longitude];
        this.dialogMap.setView(pos, this.dialogMap.getZoom());
        this.dialogMarker?.setLatLng(pos);

        const r = radius || accuracy;
        if (r && r > 0) {
            if (this.dialogCircle) {
                this.dialogCircle.setLatLng(pos);
                this.dialogCircle.setRadius(r);
            } else {
                this.dialogCircle = L.circle(pos, {
                    radius: r, color: '#1976d2', fillColor: '#1976d2', fillOpacity: 0.15, weight: 1.5,
                }).addTo(this.dialogMap);
            }
        } else if (this.dialogCircle) {
            this.dialogCircle.remove();
            this.dialogCircle = null;
        }
    }

    private destroyDialogMap(): void {
        if (this.dialogMap) {
            this.dialogMap.remove();
            this.dialogMap = null;
            this.dialogMarker = null;
            this.dialogCircle = null;
        }
    }

    private onDialogMapRef = (el: HTMLDivElement | null): void => {
        if (el && !this.dialogMap) {
            this.dialogMapContainer = el;
            // Small delay so the dialog has finished layout
            setTimeout(() => this.initDialogMap(), 100);
        }
    };

    private openDialog = (): void => {
        this.setState({ dialogOpen: true });
    };

    private closeDialog = (): void => {
        this.destroyDialogMap();
        this.setState({ dialogOpen: false });
    };

    // --- Formatting ---

    private formatShortPosition(): string {
        const { latitude, longitude } = this.state;
        if (latitude == null || longitude == null) {
            return '—';
        }
        const latDir = latitude >= 0 ? I18n.t('wm_N') : I18n.t('wm_S');
        const lngDir = longitude >= 0 ? I18n.t('wm_E') : I18n.t('wm_W');
        return `${Math.abs(latitude).toFixed(4)}${latDir}, ${Math.abs(longitude).toFixed(4)}${lngDir}`;
    }

    private static formatCoord(val: number, posKey: string, negKey: string): string {
        const abs = Math.abs(val);
        const deg = Math.floor(abs);
        const minFloat = (abs - deg) * 60;
        const min = Math.floor(minFloat);
        const sec = ((minFloat - min) * 60).toFixed(1);
        const dir = val >= 0 ? I18n.t(posKey) : I18n.t(negKey);
        return `${deg}°${min}'${sec}"${dir}`;
    }

    private formatFullPosition(): string {
        const { latitude, longitude } = this.state;
        if (latitude == null || longitude == null) {
            return '—';
        }
        return `${WidgetLocation.formatCoord(latitude, 'wm_N', 'wm_S')} ${WidgetLocation.formatCoord(longitude, 'wm_E', 'wm_W')}`;
    }

    // --- Tile overrides ---

    protected isTileActive(): boolean {
        return this.state.latitude != null && this.state.longitude != null;
    }

    protected hasTileAction(): boolean {
        return true;
    }

    protected onTileClick(): void {
        this.openDialog();
    }

    // --- Map dialog ---

    private renderMapDialog(): React.JSX.Element | null {
        if (!this.state.dialogOpen) {
            return null;
        }

        const { latitude, longitude, elevation } = this.state;
        const { name } = this.state;
        const showCoords = this.props.settings?.showCoordinates;

        return (
            <Dialog
                open
                onClose={this.closeDialog}
                maxWidth={false}
                fullWidth
                slotProps={{
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
                }}
            >
                <DialogContent sx={{ p: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    {/* Close button */}
                    <IconButton
                        onClick={this.closeDialog}
                        sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            zIndex: 1000,
                            bgcolor: 'background.paper',
                            boxShadow: 2,
                            '&:hover': { bgcolor: 'background.paper' },
                        }}
                    >
                        <Close />
                    </IconButton>

                    {/* Info overlay top-left */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            zIndex: 1000,
                            bgcolor: 'rgba(0,0,0,0.6)',
                            color: 'white',
                            borderRadius: 1,
                            px: 1.5,
                            py: 0.5,
                        }}
                    >
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {this.props.settings?.name || name || '...'}
                        </Typography>
                        {showCoords && latitude != null && longitude != null && (
                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                {this.formatFullPosition()}
                                {elevation != null ? ` · ${elevation.toFixed(0)} m` : ''}
                            </Typography>
                        )}
                    </Box>

                    {/* Interactive map */}
                    <Box
                        ref={this.onDialogMapRef}
                        sx={{
                            flex: 1,
                            '& .leaflet-container': {
                                width: '100%',
                                height: '100%',
                            },
                        }}
                    />
                </DialogContent>
            </Dialog>
        );
    }

    // --- Render: always map background ---

    private renderMapTile(
        isWide: boolean,
        aspectRatio?: string,
    ): React.JSX.Element {
        const { name } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const isDisabled = this.props.settings?.enabled === false;
        const indicators = this.renderIndicators();
        const showCoords = this.props.settings?.showCoordinates;

        return (
            <Box
                id={String(this.props.widget.id)}
                sx={{
                    position: 'relative',
                    containerType: 'inline-size',
                    overflow: 'hidden',
                    ...(isWide ? { gridColumn: 'span 2' } : {}),
                }}
            >
                <Box
                    onClick={() => this.onTileClick()}
                    sx={theme => ({
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        width: '100%',
                        ...(aspectRatio ? { aspectRatio } : { height: 80 }),
                        textAlign: 'left',
                        overflow: 'hidden',
                        opacity: isDisabled ? 0.4 : 1,
                        cursor: 'pointer',
                        ...getTileStyles(theme, isActive, accent, false),
                        padding: 0,
                        position: 'relative',
                    })}
                >
                    {/* Map fills entire tile */}
                    <Box
                        ref={this.onMapRef}
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            zIndex: 0,
                            '& .leaflet-container': {
                                width: '100%',
                                height: '100%',
                            },
                        }}
                    />

                    {/* Indicators top-right */}
                    {indicators ? (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 'max(8px, 5cqi)',
                                right: 'max(8px, 5cqi)',
                                zIndex: 2,
                            }}
                        >
                            {indicators}
                        </Box>
                    ) : null}

                    {/* Name + optional coordinates at bottom */}
                    <Box
                        sx={theme => ({
                            position: 'relative',
                            zIndex: 1,
                            background: `linear-gradient(transparent, ${
                                theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.85)'
                            })`,
                            px: isWide ? 2 : 'max(10px, 7cqi)',
                            pb: isWide ? 1 : 'max(8px, 5cqi)',
                            pt: 3,
                        })}
                    >
                        <Typography
                            variant="body2"
                            sx={{
                                fontWeight: 600,
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                textOverflow: 'ellipsis',
                                ...(isWide ? {} : { fontSize: 'max(0.875rem, 9cqi)' }),
                            }}
                        >
                            {this.props.settings?.name || name || '...'}
                        </Typography>
                        {showCoords && (
                            <Typography
                                variant="caption"
                                sx={{
                                    color: 'text.secondary',
                                    whiteSpace: 'nowrap',
                                    ...(isWide ? {} : { fontSize: 'max(0.65rem, 6cqi)' }),
                                }}
                            >
                                {this.formatShortPosition()}
                            </Typography>
                        )}
                    </Box>
                </Box>
                {this.renderSettingsButton()}
                {this.renderMapDialog()}
            </Box>
        );
    }

    renderCompact(): React.JSX.Element {
        return this.renderMapTile(false, '1');
    }

    renderWide(): React.JSX.Element {
        return this.renderMapTile(true);
    }

    renderWideTall(): React.JSX.Element {
        return this.renderMapTile(true, '1');
    }

    render(): React.JSX.Element {
        const size = this.props.settings?.size || this.props.size || '1x1';
        if (size === '2x0.5') {
            return this.renderWide();
        }
        if (size === '2x1') {
            return this.renderWideTall();
        }
        return this.renderCompact();
    }
}

export default WidgetLocation;
