import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    SvgIcon,
    Switch,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    Close,
    CloudUpload,
    Delete,
    DirectionsBoat,
    DirectionsCar,
    FiberManualRecord,
    PedalBike,
    Person,
    Sailing,
    Save,
    Speed,
    Tune,
    TwoWheeler,
} from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';

import type { WidgetSettings } from './Widgets/Generic';
import { SIZE_OPTIONS } from './CustomWidgetConfigs';

/** Gate valve icon with handle */
function ValveIcon(props: React.ComponentProps<typeof SvgIcon>): React.JSX.Element {
    return (
        <SvgIcon {...props} viewBox="0 0 24 24">
            <rect x="7" y="2" width="10" height="2.5" rx="1.25" />
            <rect x="11" y="4.5" width="2" height="4" />
            <path d="M3,8.5 L21,8.5 L12,14 Z" />
            <path d="M3,15.5 L21,15.5 L12,10 Z" />
            <rect x="10" y="15.5" width="4" height="6.5" />
        </SvgIcon>
    );
}

/** Ventilator / fan blade icon (MDI fan) */
function FanIcon(props: React.ComponentProps<typeof SvgIcon>): React.JSX.Element {
    return (
        <SvgIcon {...props}>
            <path d="M12,11A1,1 0 0,0 11,12A1,1 0 0,0 12,13A1,1 0 0,0 13,12A1,1 0 0,0 12,11M12.5,2C17,2 17.11,5.57 14.75,6.75C13.76,7.24 13.32,8.29 13.13,9.22C13.61,9.42 14.03,9.73 14.35,10.13C18.05,8.13 22.03,8.92 22.03,12.5C22.03,17 18.46,17.1 17.28,14.73C16.78,13.74 15.72,13.3 14.79,13.11C14.59,13.59 14.28,14 13.88,14.34C15.87,18.03 15.08,22 11.5,22C7,22 6.91,18.42 9.27,17.24C10.25,16.75 10.69,15.71 10.89,14.79C10.4,14.59 9.97,14.27 9.65,13.87C5.96,15.85 2,15.07 2,11.5C2,7 5.56,6.89 6.74,9.26C7.24,10.25 8.29,10.68 9.22,10.87C9.41,10.39 9.73,9.97 10.14,9.65C8.15,5.96 8.94,2 12.5,2Z" />
        </SvgIcon>
    );
}

const PREDEFINED_MARKERS: { value: string; label: string; icon: React.JSX.Element }[] = [
    { value: '', label: 'wm_Default', icon: <FiberManualRecord sx={{ fontSize: 20 }} /> },
    { value: 'person', label: 'wm_Person', icon: <Person sx={{ fontSize: 20 }} /> },
    { value: 'car', label: 'wm_Car', icon: <DirectionsCar sx={{ fontSize: 20 }} /> },
    { value: 'boat', label: 'wm_Boat', icon: <DirectionsBoat sx={{ fontSize: 20 }} /> },
    { value: 'yacht', label: 'wm_Yacht', icon: <Sailing sx={{ fontSize: 20 }} /> },
    { value: 'moped', label: 'wm_Moped', icon: <TwoWheeler sx={{ fontSize: 20 }} /> },
    { value: 'bicycle', label: 'wm_Bicycle', icon: <PedalBike sx={{ fontSize: 20 }} /> },
];

interface WidgetSettingsDialogProps {
    open: boolean;
    widgetName: string;
    settings: WidgetSettings;
    onClose: () => void;
    onSave: (settings: WidgetSettings) => void;
    showChart?: boolean;
    showBlindType?: boolean;
    showPin?: boolean;
    showHideWhenOk?: boolean;
    showOnBrightness?: boolean;
    showCoordinates?: boolean;
    showMarkerIcon?: boolean;
    showMapTheme?: boolean;
    showSliderType?: boolean;
    showWideSliderStyle?: boolean;
    showAnimation?: boolean;
    showRefreshInterval?: boolean;
    objectName?: string;
    objectColor?: string;
}

export default function WidgetSettingsDialog(props: WidgetSettingsDialogProps): React.JSX.Element {
    const {
        open,
        widgetName,
        settings,
        onClose,
        onSave,
        showChart,
        showBlindType,
        showPin,
        showHideWhenOk,
        showOnBrightness,
        showCoordinates,
        showMarkerIcon,
        showMapTheme,
        showSliderType,
        showWideSliderStyle,
        showAnimation,
        showRefreshInterval,
        objectName,
        objectColor,
    } = props;
    const [local, setLocal] = useState<WidgetSettings>(settings);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setLocal({
                ...settings,
                name: settings.name || objectName || widgetName,
                color: settings.color || objectColor || '',
            });
        }
    }, [settings, open, widgetName, objectName, objectColor]);

    const isCustomIcon = local.markerIcon?.startsWith('data:');

    const handleMarkerUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setLocal({ ...local, markerIcon: reader.result as string });
        };
        reader.readAsDataURL(file);
        // Reset so the same file can be re-selected
        e.target.value = '';
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
        >
            <DialogTitle>{widgetName}</DialogTitle>
            <DialogContent>
                <TextField
                    fullWidth
                    variant="filled"
                    label={I18n.t('wm_Name')}
                    value={local.name}
                    onChange={e => setLocal({ ...local, name: e.target.value })}
                    placeholder={widgetName}
                    size="small"
                    sx={{ mt: 1, mb: 2 }}
                />

                <Box sx={{ mb: 2 }}>
                    <Typography
                        variant="body2"
                        sx={{ mb: 1, fontWeight: 500 }}
                    >
                        {I18n.t('wm_Color')}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                            component="input"
                            type="color"
                            value={local.color || '#1976d2'}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setLocal({ ...local, color: e.target.value })
                            }
                            sx={{
                                width: 40,
                                height: 40,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                cursor: 'pointer',
                                p: '2px',
                                backgroundColor: 'transparent',
                            }}
                        />
                        {local.color ? (
                            <IconButton
                                size="small"
                                onClick={() => setLocal({ ...local, color: '' })}
                            >
                                <Delete fontSize="small" />
                            </IconButton>
                        ) : null}
                    </Box>
                </Box>

                <FormControlLabel
                    control={
                        <Switch
                            checked={local.enabled}
                            onChange={(_, checked) => setLocal({ ...local, enabled: checked })}
                            color="primary"
                        />
                    }
                    label={I18n.t('wm_Enabled')}
                    sx={{ mb: 2 }}
                />

                <Box>
                    <Typography
                        variant="body2"
                        sx={{ mb: 1, fontWeight: 500 }}
                    >
                        {I18n.t('wm_Size')}
                    </Typography>
                    <ToggleButtonGroup
                        value={local.size}
                        exclusive
                        onChange={(_, value) => {
                            if (value) {
                                setLocal({ ...local, size: value });
                            }
                        }}
                        size="small"
                    >
                        {SIZE_OPTIONS.map(opt => (
                            <ToggleButton
                                key={opt.value}
                                value={opt.value}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 0.5 }}>
                                    {opt.icon}
                                    <span>{opt.label}</span>
                                </Box>
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                </Box>

                {showBlindType ? (
                    <Box sx={{ mt: 2 }}>
                        <Typography
                            variant="body2"
                            sx={{ mb: 1, fontWeight: 500 }}
                        >
                            {I18n.t('wm_BlindType')}
                        </Typography>
                        <ToggleButtonGroup
                            value={local.blindType || 'shutter'}
                            exclusive
                            onChange={(_, value) => {
                                if (value) {
                                    setLocal({ ...local, blindType: value });
                                }
                            }}
                            size="small"
                        >
                            <ToggleButton value="shutter">{I18n.t('wm_Shutter')}</ToggleButton>
                            <ToggleButton value="curtain">{I18n.t('wm_Curtain')}</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                ) : null}

                {showPin ? (
                    <TextField
                        fullWidth
                        variant="filled"
                        label={I18n.t('wm_PIN Code')}
                        value={local.pin || ''}
                        onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            setLocal({ ...local, pin: val });
                        }}
                        placeholder="1234"
                        size="small"
                        slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 8 } }}
                        helperText={I18n.t('wm_PIN help')}
                        sx={{ mt: 2 }}
                    />
                ) : null}

                {showHideWhenOk ? (
                    <FormControlLabel
                        control={
                            <Switch
                                checked={!!local.hideWhenOk}
                                onChange={(_, checked) => setLocal({ ...local, hideWhenOk: checked })}
                                color="primary"
                            />
                        }
                        label={I18n.t('wm_Hide when OK')}
                        sx={{ mt: 1, display: 'flex' }}
                    />
                ) : null}

                {showOnBrightness ? (
                    <TextField
                        fullWidth
                        variant="filled"
                        label={I18n.t('wm_On brightness')}
                        type="number"
                        value={local.onBrightness ?? 100}
                        onChange={e => {
                            const val = Math.max(1, Math.min(100, Number(e.target.value) || 100));
                            setLocal({ ...local, onBrightness: val });
                        }}
                        size="small"
                        slotProps={{ htmlInput: { min: 1, max: 100 } }}
                        helperText="%"
                        sx={{ mt: 2 }}
                    />
                ) : null}

                {showCoordinates ? (
                    <FormControlLabel
                        control={
                            <Switch
                                checked={!!local.showCoordinates}
                                onChange={(_, checked) => setLocal({ ...local, showCoordinates: checked })}
                                color="primary"
                            />
                        }
                        label={I18n.t('wm_Show coordinates')}
                        sx={{ mt: 1, display: 'flex' }}
                    />
                ) : null}

                {showSliderType ? (
                    <Box sx={{ mt: 2 }}>
                        <Typography
                            variant="body2"
                            sx={{ mb: 1, fontWeight: 500 }}
                        >
                            {I18n.t('wm_Slider type')}
                        </Typography>
                        <ToggleButtonGroup
                            value={local.sliderType || 'normal'}
                            exclusive
                            onChange={(_, value) => {
                                if (value) {
                                    setLocal({ ...local, sliderType: value });
                                }
                            }}
                            size="small"
                        >
                            <ToggleButton value="normal">
                                <Tooltip title={I18n.t('wm_slider_normal')}>
                                    <Tune sx={{ fontSize: 18, mr: 0.5 }} />
                                </Tooltip>
                                {I18n.t('wm_slider_normal')}
                            </ToggleButton>
                            <ToggleButton value="valve">
                                <Tooltip title={I18n.t('wm_slider_valve')}>
                                    <ValveIcon sx={{ fontSize: 18, mr: 0.5 }} />
                                </Tooltip>
                                {I18n.t('wm_slider_valve')}
                            </ToggleButton>
                            <ToggleButton value="fan">
                                <Tooltip title={I18n.t('wm_slider_fan')}>
                                    <FanIcon sx={{ fontSize: 18, mr: 0.5 }} />
                                </Tooltip>
                                {I18n.t('wm_slider_fan')}
                            </ToggleButton>
                            <ToggleButton value="gauge">
                                <Tooltip title={I18n.t('wm_slider_gauge')}>
                                    <Speed sx={{ fontSize: 18, mr: 0.5 }} />
                                </Tooltip>
                                {I18n.t('wm_slider_gauge')}
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                ) : null}

                {showWideSliderStyle && (local.size === '2x0.5' || local.size === '2x1') ? (
                    <Box sx={{ mt: 2 }}>
                        <Typography
                            variant="body2"
                            sx={{ mb: 1, fontWeight: 500 }}
                        >
                            {I18n.t('wm_Wide slider style')}
                        </Typography>
                        <ToggleButtonGroup
                            value={local.wideSliderStyle || 'horizontal'}
                            exclusive
                            onChange={(_, value) => {
                                if (value) {
                                    setLocal({ ...local, wideSliderStyle: value });
                                }
                            }}
                            size="small"
                        >
                            <ToggleButton value="horizontal">{I18n.t('wm_slider_horizontal')}</ToggleButton>
                            <ToggleButton value="round">{I18n.t('wm_slider_round')}</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                ) : null}

                {showAnimation ? (
                    <FormControlLabel
                        control={
                            <Switch
                                checked={local.showAnimation !== false}
                                onChange={(_, checked) => setLocal({ ...local, showAnimation: checked })}
                                color="primary"
                            />
                        }
                        label={I18n.t('wm_Show animation')}
                        sx={{ mt: 1, display: 'flex' }}
                    />
                ) : null}

                {showRefreshInterval ? (
                    <Box sx={{ mt: 2 }}>
                        <TextField
                            fullWidth
                            variant="filled"
                            label={I18n.t('wm_Refresh interval')}
                            type="number"
                            value={local.refreshInterval ?? 0}
                            onChange={e => {
                                const val = Math.max(0, Number(e.target.value) || 0);
                                setLocal({ ...local, refreshInterval: val });
                            }}
                            size="small"
                            slotProps={{ htmlInput: { min: 0 } }}
                            helperText={I18n.t('wm_Refresh interval help')}
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={!!local.appendTimestamp}
                                    onChange={(_, checked) => setLocal({ ...local, appendTimestamp: checked })}
                                    color="primary"
                                />
                            }
                            label={I18n.t('wm_Append timestamp')}
                            sx={{ mt: 1, display: 'flex' }}
                        />
                    </Box>
                ) : null}

                {showMarkerIcon ? (
                    <Box sx={{ mt: 2 }}>
                        <Typography
                            variant="body2"
                            sx={{ mb: 1, fontWeight: 500 }}
                        >
                            {I18n.t('wm_Marker icon')}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                            {PREDEFINED_MARKERS.map(m => {
                                const selected = !isCustomIcon && (local.markerIcon || '') === m.value;
                                return (
                                    <Tooltip
                                        key={m.value || '__default'}
                                        title={I18n.t(m.label)}
                                    >
                                        <Box
                                            onClick={() => setLocal({ ...local, markerIcon: m.value })}
                                            sx={theme => ({
                                                width: 36,
                                                height: 36,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: 1,
                                                cursor: 'pointer',
                                                border: `2px solid ${selected ? theme.palette.primary.main : 'transparent'}`,
                                                bgcolor: selected ? 'action.selected' : 'action.hover',
                                                '&:hover': { bgcolor: 'action.focus' },
                                            })}
                                        >
                                            {m.icon}
                                        </Box>
                                    </Tooltip>
                                );
                            })}
                            {/* Upload custom icon button */}
                            <Tooltip title={I18n.t('wm_Custom')}>
                                <Box
                                    onClick={() => fileInputRef.current?.click()}
                                    sx={theme => ({
                                        width: 36,
                                        height: 36,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: 1,
                                        cursor: 'pointer',
                                        border: `2px solid ${isCustomIcon ? theme.palette.primary.main : 'transparent'}`,
                                        bgcolor: isCustomIcon ? 'action.selected' : 'action.hover',
                                        '&:hover': { bgcolor: 'action.focus' },
                                    })}
                                >
                                    {isCustomIcon ? (
                                        <Box
                                            component="img"
                                            src={local.markerIcon}
                                            sx={{ width: 20, height: 20, objectFit: 'contain' }}
                                        />
                                    ) : (
                                        <CloudUpload sx={{ fontSize: 20 }} />
                                    )}
                                </Box>
                            </Tooltip>
                            {isCustomIcon ? (
                                <IconButton
                                    size="small"
                                    onClick={() => setLocal({ ...local, markerIcon: '' })}
                                >
                                    <Delete fontSize="small" />
                                </IconButton>
                            ) : null}
                        </Box>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,.svg"
                            style={{ display: 'none' }}
                            onChange={handleMarkerUpload}
                        />
                    </Box>
                ) : null}

                {showMapTheme ? (
                    <Box sx={{ mt: 2 }}>
                        <Typography
                            variant="body2"
                            sx={{ mb: 1, fontWeight: 500 }}
                        >
                            {I18n.t('wm_Map theme')}
                        </Typography>
                        <ToggleButtonGroup
                            value={local.mapTheme || 'standard'}
                            exclusive
                            onChange={(_, value) => {
                                if (value) {
                                    setLocal({ ...local, mapTheme: value });
                                }
                            }}
                            size="small"
                        >
                            <ToggleButton value="standard">{I18n.t('wm_map_standard')}</ToggleButton>
                            <ToggleButton value="dark">{I18n.t('wm_map_dark')}</ToggleButton>
                            <ToggleButton value="satellite">{I18n.t('wm_map_satellite')}</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                ) : null}

                {showChart ? (
                    <Box sx={{ mt: 2 }}>
                        <Typography
                            variant="body2"
                            sx={{ mb: 1, fontWeight: 500 }}
                        >
                            {I18n.t('wm_Chart')}
                        </Typography>
                        <ToggleButtonGroup
                            value={local.chartHours}
                            exclusive
                            onChange={(_, value) => {
                                if (value != null) {
                                    setLocal({ ...local, chartHours: value });
                                }
                            }}
                            size="small"
                            sx={{ '& .MuiToggleButton-root': { flex: 1 } }}
                        >
                            <ToggleButton value={0}>{I18n.t('wm_Off')}</ToggleButton>
                            <ToggleButton value={1}>1h</ToggleButton>
                            <ToggleButton value={3}>3h</ToggleButton>
                            <ToggleButton value={6}>6h</ToggleButton>
                            <ToggleButton value={12}>12h</ToggleButton>
                            <ToggleButton value={24}>24h</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                ) : null}
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    disabled={
                        local.enabled === settings.enabled &&
                        local.size === settings.size &&
                        local.chartHours === settings.chartHours &&
                        local.name === (settings.name || objectName || widgetName) &&
                        local.color === (settings.color || objectColor || '') &&
                        local.blindType === settings.blindType &&
                        (local.pin || '') === (settings.pin || '') &&
                        !!local.hideWhenOk === !!settings.hideWhenOk &&
                        (local.onBrightness ?? 100) === (settings.onBrightness ?? 100) &&
                        !!local.showCoordinates === !!settings.showCoordinates &&
                        (local.markerIcon || '') === (settings.markerIcon || '') &&
                        (local.mapTheme || 'standard') === (settings.mapTheme || 'standard') &&
                        (local.sliderType || 'normal') === (settings.sliderType || 'normal') &&
                        (local.wideSliderStyle || 'horizontal') === (settings.wideSliderStyle || 'horizontal') &&
                        (local.showAnimation !== false) === (settings.showAnimation !== false) &&
                        (local.refreshInterval ?? 0) === (settings.refreshInterval ?? 0) &&
                        !!local.appendTimestamp === !!settings.appendTimestamp
                    }
                    startIcon={<Save />}
                    onClick={() => onSave(local)}
                >
                    {I18n.t('wm_Save')}
                </Button>
                <Button
                    color="grey"
                    startIcon={<Close />}
                    onClick={onClose}
                >
                    {I18n.t('wm_Cancel')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
