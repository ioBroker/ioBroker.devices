import React, { useEffect, useState } from 'react';
import {
    Box,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Slider,
    Switch as MuiSwitch,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { Close, Palette, Thermostat } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';

import { hexToRgb, rgbToHex, hsvToRgb, rgbToHsv, ctToRgb } from './colorUtils';

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
    } = props;

    const [hue, setHue] = useState(0);
    const [sat, setSat] = useState(100);
    const [mode, setMode] = useState<'color' | 'ct'>('color');

    useEffect(() => {
        if (open) {
            const [r, g, b] = hexToRgb(color);
            const [h, s] = rgbToHsv(r, g, b);
            setHue(Math.round(h));
            setSat(Math.round(s * 100));
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

    const handleHueChange = (_e: Event, value: number | number[]): void => {
        const h = value as number;
        setHue(h);
        const [r, g, b] = hsvToRgb(h, sat / 100, 1);
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
            PaperProps={{
                sx: { borderRadius: '16px' },
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
                        <Slider
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
                        <Slider
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
                        <Slider
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
                        <Slider
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
                            {I18n.t('wm_Power')}
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
