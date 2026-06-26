import React, { useEffect, useState } from 'react';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Slider, Switch as MuiSwitch, ToggleButton, ToggleButtonGroup, Typography, } from '@mui/material';
import { Close, Palette, Thermostat } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';
import { hexToRgb, rgbToHex, hsvToRgb, rgbToHsv, ctToRgb } from './colorUtils';
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
};
function ColorLightDialog(props) {
    const { open, onClose, color, brightness, isOn, hasColor, hasCt, hasPower, hasBrightness, ctMin, ctMax, ctValue, onColorChange, onBrightnessChange, onCtChange, onToggle, } = props;
    const [hue, setHue] = useState(0);
    const [sat, setSat] = useState(100);
    const [mode, setMode] = useState('color');
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
    const handleHueChange = (_e, value) => {
        const h = value;
        setHue(h);
        const [r, g, b] = hsvToRgb(h, sat / 100, 1);
        onColorChange(rgbToHex(r, g, b));
    };
    const handleSatChange = (_e, value) => {
        const s = value;
        setSat(s);
        const [r, g, b] = hsvToRgb(hue, s / 100, 1);
        onColorChange(rgbToHex(r, g, b));
    };
    const handleBrightnessChange = (_e, value) => {
        onBrightnessChange(value);
    };
    const handleCtChange = (_e, value) => {
        onCtChange(value);
    };
    // CT gradient from warm to cool
    let ctGradient = '';
    if (hasCt) {
        const steps = 5;
        const colors = [];
        for (let i = 0; i <= steps; i++) {
            const k = ctMin + (i / steps) * (ctMax - ctMin);
            const [r, g, b] = ctToRgb(k);
            colors.push(rgbToHex(r, g, b));
        }
        ctGradient = `linear-gradient(to right, ${colors.join(', ')})`;
    }
    return (React.createElement(Dialog, { open: open, onClose: onClose, fullWidth: true, maxWidth: "xs", PaperProps: {
            sx: { borderRadius: '16px' },
        } },
        React.createElement(DialogTitle, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 } },
            React.createElement(Typography, { variant: "h6", sx: { fontWeight: 600 } }, I18n.t('wm_Color')),
            React.createElement(IconButton, { onClick: onClose, size: "small" },
                React.createElement(Close, null))),
        React.createElement(DialogContent, { sx: { pt: 1, pb: 3 } },
            React.createElement(Box, { sx: { display: 'flex', justifyContent: 'center', mb: 3 } },
                React.createElement(Box, { sx: {
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        backgroundColor: isOn ? currentColorHex : '#555',
                        opacity: isOn ? 0.3 + (brightness / 100) * 0.7 : 0.3,
                        border: '3px solid',
                        borderColor: 'divider',
                        transition: 'all 0.2s ease',
                        boxShadow: isOn ? `0 0 ${20 + brightness / 3}px ${currentColorHex}40` : 'none',
                    } })),
            hasBothModes ? (React.createElement(Box, { sx: { display: 'flex', justifyContent: 'center', mb: 3 } },
                React.createElement(ToggleButtonGroup, { value: mode, exclusive: true, onChange: (_e, val) => {
                        if (val) {
                            setMode(val);
                        }
                    }, size: "small" },
                    React.createElement(ToggleButton, { value: "color" },
                        React.createElement(Palette, { sx: { mr: 0.5, fontSize: 18 } }),
                        I18n.t('wm_Color')),
                    React.createElement(ToggleButton, { value: "ct" },
                        React.createElement(Thermostat, { sx: { mr: 0.5, fontSize: 18 } }),
                        I18n.t('wm_Color temperature'))))) : null,
            showColor ? (React.createElement(Box, { sx: { mb: 3 } },
                React.createElement(Typography, { variant: "body2", sx: { mb: 1, fontWeight: 500 } }, I18n.t('wm_Hue')),
                React.createElement(Slider, { value: hue, min: 0, max: 360, onChange: handleHueChange, sx: {
                        ...SLIDER_SX,
                        '& .MuiSlider-rail': {
                            ...SLIDER_SX['& .MuiSlider-rail'],
                            background: RAINBOW,
                        },
                        '& .MuiSlider-thumb': {
                            ...SLIDER_SX['& .MuiSlider-thumb'],
                            borderColor: fullHueHex,
                        },
                    } }))) : null,
            showColor ? (React.createElement(Box, { sx: { mb: 3 } },
                React.createElement(Typography, { variant: "body2", sx: { mb: 1, fontWeight: 500 } }, I18n.t('wm_Saturation')),
                React.createElement(Slider, { value: sat, min: 0, max: 100, onChange: handleSatChange, sx: {
                        ...SLIDER_SX,
                        '& .MuiSlider-rail': {
                            ...SLIDER_SX['& .MuiSlider-rail'],
                            background: `linear-gradient(to right, #ffffff, ${fullHueHex})`,
                        },
                        '& .MuiSlider-thumb': {
                            ...SLIDER_SX['& .MuiSlider-thumb'],
                            borderColor: currentColorHex,
                        },
                    } }))) : null,
            hasBrightness ? (React.createElement(Box, { sx: { mb: 3 } },
                React.createElement(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 1 } },
                    React.createElement(Typography, { variant: "body2", sx: { fontWeight: 500 } }, I18n.t('wm_Brightness')),
                    React.createElement(Typography, { variant: "body2", sx: { color: 'text.secondary' } },
                        Math.round(brightness),
                        "%")),
                React.createElement(Slider, { value: brightness, min: 0, max: 100, onChange: handleBrightnessChange, sx: {
                        ...SLIDER_SX,
                        '& .MuiSlider-rail': {
                            ...SLIDER_SX['& .MuiSlider-rail'],
                            background: `linear-gradient(to right, #000000, ${currentColorHex})`,
                        },
                    } }))) : null,
            showCt ? (React.createElement(Box, { sx: { mb: 3 } },
                React.createElement(Typography, { variant: "body2", sx: { mb: 1, fontWeight: 500 } }, I18n.t('wm_Color temperature')),
                React.createElement(Slider, { value: ctValue, min: ctMin, max: ctMax, onChange: handleCtChange, sx: {
                        ...SLIDER_SX,
                        '& .MuiSlider-rail': {
                            ...SLIDER_SX['& .MuiSlider-rail'],
                            background: ctGradient,
                        },
                    } }))) : null,
            hasPower ? (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
                React.createElement(Typography, { variant: "body2", sx: { fontWeight: 500 } }, I18n.t('wm_On/Off')),
                React.createElement(MuiSwitch, { checked: isOn, onChange: onToggle }))) : null)));
}
export default ColorLightDialog;
//# sourceMappingURL=ColorLightDialog.js.map