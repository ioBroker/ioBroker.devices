import React, { useEffect, useState } from 'react';
import {
    Box,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Switch as MuiSwitch,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import { Add, Check, Close, Edit, Palette, Thermostat } from '@mui/icons-material';
import { I18n } from '@iobroker/gui-components';

import { hexToRgb, rgbToHex, hsvToRgb, rgbToHsv, ctToRgb } from './colorUtils';
import TouchSafeSlider from './TouchSafeSlider';

/** A stored state of the light, to be applied again with one tap */
export interface ColorLightPreset {
    /** Color as #rrggbb at full value, set when the preset was saved in color mode */
    color?: string;
    /** Color temperature in Kelvin, set when the preset was saved in CT mode */
    ct?: number;
    /** Brightness in percent, when the light can be dimmed */
    brightness?: number;
}

export interface ColorLightDialogProps {
    open: boolean;
    onClose: () => void;
    color: string;
    brightness: number;
    isOn: boolean;
    hasColor: boolean;
    hasCt: boolean;
    ctMin: number;
    ctMax: number;
    ctValue: number;
    hasPower: boolean;
    hasBrightness: boolean;
    onColorChange: (hex: string) => void;
    onBrightnessChange: (percent: number) => void;
    onCtChange: (kelvin: number) => void;
    onToggle: () => void;
    presets: ColorLightPreset[];
    /** Missing when the presets may not be changed, e.g. read-only */
    onPresetsChange?: (presets: ColorLightPreset[]) => void;
    onApplyPreset: (preset: ColorLightPreset) => void;
}

const RAINBOW = 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)';

const SLIDER_SX = {
    height: 12,
    '& .MuiSlider-rail': {
        opacity: 1,
        height: 12,
        borderRadius: 6,
    },
    '& .MuiSlider-track': {
        display: 'none',
    },
    '& .MuiSlider-thumb': {
        width: 28,
        height: 28,
        backgroundColor: '#fff',
        border: '3px solid',
        borderColor: 'grey.400',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        '&:hover, &.Mui-focusVisible': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        },
    },
} as const;

function isSamePreset(a: ColorLightPreset, b: ColorLightPreset): boolean {
    return (
        (a.color || '').toLowerCase() === (b.color || '').toLowerCase() &&
        a.ct === b.ct &&
        a.brightness === b.brightness
    );
}

function ColorLightDialog(props: ColorLightDialogProps): React.JSX.Element | null {
    const {
        open,
        onClose,
        color,
        brightness,
        isOn,
        hasColor,
        hasCt,
        hasPower,
        hasBrightness,
        ctMin,
        ctMax,
        ctValue,
        onColorChange,
        onBrightnessChange,
        onCtChange,
        onToggle,
        presets,
        onPresetsChange,
        onApplyPreset,
    } = props;

    const [hue, setHue] = useState(0);
    const [sat, setSat] = useState(100);
    const [mode, setMode] = useState<'color' | 'ct'>('color');
    const [editPresets, setEditPresets] = useState(false);

    const setHueSatFrom = (hex: string): void => {
        const [r, g, b] = hexToRgb(hex);
        const [h, s] = rgbToHsv(r, g, b);
        setHue(Math.round(h));
        setSat(Math.round(s * 100));
    };

    useEffect(() => {
        if (open) {
            setHueSatFrom(color);
            setEditPresets(false);
        }
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!open) {
        return null;
    }

    const hasBothModes = hasColor && hasCt;
    const showColor = hasColor && (!hasBothModes || mode === 'color');
    const showCt = hasCt && (!hasBothModes || mode === 'ct');

    const fullHueHex = rgbToHex(...hsvToRgb(hue, 1, 1));
    const currentColorHex = showColor ? rgbToHex(...hsvToRgb(hue, sat / 100, 1)) : rgbToHex(...ctToRgb(ctValue));

    /** The state shown in the dialog, as it would be stored */
    const currentPreset: ColorLightPreset = {};
    if (showColor) {
        currentPreset.color = currentColorHex;
    } else if (showCt) {
        currentPreset.ct = Math.round(ctValue);
    }
    if (hasBrightness) {
        currentPreset.brightness = Math.round(brightness);
    }

    const savePreset = (): void => {
        if (onPresetsChange && !presets.some(p => isSamePreset(p, currentPreset))) {
            onPresetsChange([...presets, currentPreset]);
        }
    };

    const deletePreset = (index: number): void => {
        const next = presets.filter((_p, i) => i !== index);
        if (!next.length) {
            setEditPresets(false);
        }
        onPresetsChange?.(next);
    };

    const applyPreset = (preset: ColorLightPreset): void => {
        if (preset.color && hasColor) {
            setHueSatFrom(preset.color);
            setMode('color');
        } else if (preset.ct !== undefined && hasCt) {
            setMode('ct');
        }
        onApplyPreset(preset);
    };

    const handleHueChange = (_e: Event, value: number | number[]): void => {
        const h = value as number;
        setHue(h);
        // A white lamp has no saturation, so picking a hue would keep it white: go to the full color instead
        let s = sat;
        if (s < 5) {
            s = 100;
            setSat(s);
        }
        const [r, g, b] = hsvToRgb(h, s / 100, 1);
        onColorChange(rgbToHex(r, g, b));
    };

    const handleSatChange = (_e: Event, value: number | number[]): void => {
        const s = value as number;
        setSat(s);
        const [r, g, b] = hsvToRgb(hue, s / 100, 1);
        onColorChange(rgbToHex(r, g, b));
    };

    const handleBrightnessChange = (_e: Event, value: number | number[]): void => {
        onBrightnessChange(value as number);
    };

    const handleCtChange = (_e: Event, value: number | number[]): void => {
        onCtChange(value as number);
    };

    // CT gradient from warm to cool
    let ctGradient = '';
    if (hasCt) {
        const steps = 5;
        const colors: string[] = [];
        for (let i = 0; i <= steps; i++) {
            const k = ctMin + (i / steps) * (ctMax - ctMin);
            const [r, g, b] = ctToRgb(k);
            colors.push(rgbToHex(r, g, b));
        }
        ctGradient = `linear-gradient(to right, ${colors.join(', ')})`;
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="xs"
            slotProps={{
                paper: {
                    sx: { borderRadius: '16px' },
                },
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Typography
                    variant="h6"
                    sx={{ fontWeight: 600 }}
                >
                    {I18n.t('wm_Color')}
                </Typography>
                <IconButton
                    onClick={onClose}
                    size="small"
                >
                    <Close />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 1, pb: 3 }}>
                {/* Color preview */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                    <Box
                        sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            backgroundColor: isOn ? currentColorHex : '#555',
                            opacity: isOn ? 0.3 + (brightness / 100) * 0.7 : 0.3,
                            border: '3px solid',
                            borderColor: 'divider',
                            transition: 'all 0.2s ease',
                            boxShadow: isOn ? `0 0 ${20 + brightness / 3}px ${currentColorHex}40` : 'none',
                        }}
                    />
                </Box>

                {/* Presets — stored states to apply with one tap */}
                {presets.length || onPresetsChange ? (
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 500 }}
                            >
                                {I18n.t('wm_Presets')}
                            </Typography>
                            {onPresetsChange && presets.length ? (
                                <Tooltip title={I18n.t(editPresets ? 'wm_Done' : 'wm_Edit presets')}>
                                    <IconButton
                                        size="small"
                                        onClick={() => setEditPresets(!editPresets)}
                                    >
                                        {editPresets ? <Check fontSize="small" /> : <Edit fontSize="small" />}
                                    </IconButton>
                                </Tooltip>
                            ) : null}
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                            {presets.map((preset, i) => {
                                const swatch = preset.color || rgbToHex(...ctToRgb(preset.ct ?? 4000));
                                const active = !editPresets && isOn && isSamePreset(preset, currentPreset);
                                return (
                                    <Box
                                        key={i}
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: 0.5,
                                        }}
                                    >
                                        <Box
                                            component="button"
                                            type="button"
                                            title={editPresets ? I18n.t('wm_Delete') : undefined}
                                            onClick={() => (editPresets ? deletePreset(i) : applyPreset(preset))}
                                            sx={{
                                                position: 'relative',
                                                width: 36,
                                                height: 36,
                                                p: 0,
                                                borderRadius: '50%',
                                                backgroundColor: swatch,
                                                border: '3px solid',
                                                borderColor: active ? 'text.primary' : 'divider',
                                                cursor: 'pointer',
                                                transition: 'border-color 0.2s ease',
                                            }}
                                        >
                                            {editPresets ? (
                                                <Box
                                                    sx={{
                                                        position: 'absolute',
                                                        top: -8,
                                                        right: -8,
                                                        width: 18,
                                                        height: 18,
                                                        borderRadius: '50%',
                                                        backgroundColor: 'error.main',
                                                        color: 'error.contrastText',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    <Close sx={{ fontSize: 14 }} />
                                                </Box>
                                            ) : null}
                                        </Box>
                                        {preset.brightness !== undefined ? (
                                            <Typography
                                                variant="caption"
                                                sx={{ color: 'text.secondary', lineHeight: 1 }}
                                            >
                                                {preset.brightness}%
                                            </Typography>
                                        ) : null}
                                    </Box>
                                );
                            })}
                            {onPresetsChange && !editPresets ? (
                                <Tooltip title={I18n.t('wm_Save current state')}>
                                    <Box
                                        component="button"
                                        type="button"
                                        onClick={savePreset}
                                        sx={{
                                            width: 36,
                                            height: 36,
                                            p: 0,
                                            borderRadius: '50%',
                                            border: '2px dashed',
                                            borderColor: 'text.secondary',
                                            backgroundColor: 'transparent',
                                            color: 'text.secondary',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <Add fontSize="small" />
                                    </Box>
                                </Tooltip>
                            ) : null}
                        </Box>
                    </Box>
                ) : null}

                {/* Mode toggle — only when both color and CT are available */}
                {hasBothModes ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                        <ToggleButtonGroup
                            value={mode}
                            exclusive
                            onChange={(_e, val) => {
                                if (val) {
                                    setMode(val);
                                }
                            }}
                            size="small"
                        >
                            <ToggleButton value="color">
                                <Palette sx={{ mr: 0.5, fontSize: 18 }} />
                                {I18n.t('wm_Color')}
                            </ToggleButton>
                            <ToggleButton value="ct">
                                <Thermostat sx={{ mr: 0.5, fontSize: 18 }} />
                                {I18n.t('wm_Color temperature')}
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                ) : null}

                {/* Hue slider */}
                {showColor ? (
                    <Box sx={{ mb: 3 }}>
                        <Typography
                            variant="body2"
                            sx={{ mb: 1, fontWeight: 500 }}
                        >
                            {I18n.t('wm_Hue')}
                        </Typography>
                        <TouchSafeSlider
                            value={hue}
                            min={0}
                            max={360}
                            onChange={handleHueChange}
                            sx={{
                                ...SLIDER_SX,
                                '& .MuiSlider-rail': {
                                    ...SLIDER_SX['& .MuiSlider-rail'],
                                    background: RAINBOW,
                                },
                                '& .MuiSlider-thumb': {
                                    ...SLIDER_SX['& .MuiSlider-thumb'],
                                    borderColor: fullHueHex,
                                },
                            }}
                        />
                    </Box>
                ) : null}

                {/* Saturation slider */}
                {showColor ? (
                    <Box sx={{ mb: 3 }}>
                        <Typography
                            variant="body2"
                            sx={{ mb: 1, fontWeight: 500 }}
                        >
                            {I18n.t('wm_Saturation')}
                        </Typography>
                        <TouchSafeSlider
                            value={sat}
                            min={0}
                            max={100}
                            onChange={handleSatChange}
                            sx={{
                                ...SLIDER_SX,
                                '& .MuiSlider-rail': {
                                    ...SLIDER_SX['& .MuiSlider-rail'],
                                    background: `linear-gradient(to right, #ffffff, ${fullHueHex})`,
                                },
                                '& .MuiSlider-thumb': {
                                    ...SLIDER_SX['& .MuiSlider-thumb'],
                                    borderColor: currentColorHex,
                                },
                            }}
                        />
                    </Box>
                ) : null}

                {/* Brightness slider */}
                {hasBrightness ? (
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 500 }}
                            >
                                {I18n.t('wm_Brightness')}
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{ color: 'text.secondary' }}
                            >
                                {Math.round(brightness)}%
                            </Typography>
                        </Box>
                        <TouchSafeSlider
                            value={brightness}
                            min={0}
                            max={100}
                            onChange={handleBrightnessChange}
                            sx={{
                                ...SLIDER_SX,
                                '& .MuiSlider-rail': {
                                    ...SLIDER_SX['& .MuiSlider-rail'],
                                    background: `linear-gradient(to right, #000000, ${currentColorHex})`,
                                },
                            }}
                        />
                    </Box>
                ) : null}

                {/* CT slider */}
                {showCt ? (
                    <Box sx={{ mb: 3 }}>
                        <Typography
                            variant="body2"
                            sx={{ mb: 1, fontWeight: 500 }}
                        >
                            {I18n.t('wm_Color temperature')}
                        </Typography>
                        <TouchSafeSlider
                            value={ctValue}
                            min={ctMin}
                            max={ctMax}
                            onChange={handleCtChange}
                            sx={{
                                ...SLIDER_SX,
                                '& .MuiSlider-rail': {
                                    ...SLIDER_SX['& .MuiSlider-rail'],
                                    background: ctGradient,
                                },
                            }}
                        />
                    </Box>
                ) : null}

                {/* On/Off toggle — only when a dedicated power state exists */}
                {hasPower ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography
                            variant="body2"
                            sx={{ fontWeight: 500 }}
                        >
                            {I18n.t('wm_On/Off')}
                        </Typography>
                        <MuiSwitch
                            checked={isOn}
                            onChange={onToggle}
                        />
                    </Box>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

export default ColorLightDialog;
