import React from 'react';
import { Box, Slider, Switch as MuiSwitch, Tooltip, Typography } from '@mui/material';
import { LightbulbOutlined } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';
import { Types } from '@iobroker/type-detector';
import WidgetGeneric, { isNeumorphicTheme, } from './Generic';
import { hexToRgb, rgbToHex, hsvToRgb, rgbToHsv, ctToRgb, rgbToCie, cieToRgb } from './colorUtils';
import ColorLightDialog from './ColorLightDialog';
// --- Widget ---
export class WidgetColorLight extends WidgetGeneric {
    // Dimmer states
    setId;
    actualId;
    onSetId;
    onActualId;
    // Color states — filled per subtype
    rgbId; // rgbSingle: RGB string
    rgbwId; // rgbwSingle: RGBW string
    redId; // rgb: separate channels
    greenId;
    blueId;
    whiteId;
    hueId; // hue type
    saturationId;
    ctId; // color temperature
    cieId; // CIE xy string
    arcRef = React.createRef();
    dragStartPos = null;
    isDragging = false;
    longPressTimer = null;
    longPressTriggered = false;
    constructor(props) {
        super(props);
        const states = props.widget.control.states;
        const find = (name) => states.find(s => s.name === name)?.id ?? null;
        // Dimmer
        const set = find('SET');
        const actual = find('ACTUAL');
        this.setId = set;
        this.actualId = actual ?? set;
        this.onSetId = find('ON_SET') ?? find('ON');
        this.onActualId = find('ON_ACTUAL') ?? this.onSetId;
        // Color — all optional, availability depends on device type
        this.rgbId = find('RGB');
        this.rgbwId = find('RGBW');
        this.redId = find('RED');
        this.greenId = find('GREEN');
        this.blueId = find('BLUE');
        this.whiteId = find('WHITE');
        this.hueId = find('HUE');
        this.saturationId = find('SATURATION');
        this.ctId = find('TEMPERATURE');
        this.cieId = find('CIE');
        // Dimmer may not exist for some pure-color types
        const dimmer = find('DIMMER') ?? find('BRIGHTNESS');
        if (dimmer) {
            if (!this.setId) {
                this.setId = dimmer;
            }
            if (!this.actualId) {
                this.actualId = dimmer;
            }
        }
        this.state = {
            ...this.state,
            brightness: 0,
            isOn: false,
            dragging: false,
            dimMin: 0,
            dimMax: 100,
            color: '#ffffff',
            dialogOpen: false,
            ctValue: 4000,
            ctMin: 2000,
            ctMax: 6500,
        };
    }
    static getDefaultSettings() {
        return {
            ...WidgetGeneric.getDefaultSettings(),
            onBrightness: 100,
        };
    }
    static getConfigSchema() {
        return {
            name: 'Image settings', // ignored
            schema: {
                type: 'panel',
                items: {
                    onBrightness: {
                        type: 'number',
                        label: 'wm_On brightness',
                        default: 100,
                        min: 1,
                        max: 100,
                        unit: '%',
                    },
                    _dialogChartHint: {
                        newLine: true,
                        type: 'staticText',
                        text: 'wm_RGB color',
                        style: {
                            fontStyle: 'italic',
                        },
                        sm: 12,
                    },
                },
            },
        };
    }
    // --- Lifecycle ---
    componentDidMount() {
        super.componentDidMount();
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onBrightnessChange);
        }
        if (this.onActualId && this.onActualId !== this.actualId) {
            this.props.stateContext.getState(this.onActualId, this.onOnOffChange);
        }
        // Color subscriptions
        if (this.rgbId) {
            this.props.stateContext.getState(this.rgbId, this.onRgbChange);
        }
        if (this.rgbwId) {
            this.props.stateContext.getState(this.rgbwId, this.onRgbwChange);
        }
        if (this.redId) {
            this.props.stateContext.getState(this.redId, this.onChannelChange);
        }
        if (this.greenId) {
            this.props.stateContext.getState(this.greenId, this.onChannelChange);
        }
        if (this.blueId) {
            this.props.stateContext.getState(this.blueId, this.onChannelChange);
        }
        if (this.hueId) {
            this.props.stateContext.getState(this.hueId, this.onHsvChange);
        }
        if (this.saturationId) {
            this.props.stateContext.getState(this.saturationId, this.onHsvChange);
        }
        if (this.ctId) {
            this.props.stateContext.getState(this.ctId, this.onCtChange);
        }
        if (this.cieId) {
            this.props.stateContext.getState(this.cieId, this.onCieChange);
        }
        void this.loadDimmerObject();
        void this.loadCtObject();
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onBrightnessChange);
        }
        if (this.onActualId && this.onActualId !== this.actualId) {
            this.props.stateContext.removeState(this.onActualId, this.onOnOffChange);
        }
        if (this.rgbId) {
            this.props.stateContext.removeState(this.rgbId, this.onRgbChange);
        }
        if (this.rgbwId) {
            this.props.stateContext.removeState(this.rgbwId, this.onRgbwChange);
        }
        if (this.redId) {
            this.props.stateContext.removeState(this.redId, this.onChannelChange);
        }
        if (this.greenId) {
            this.props.stateContext.removeState(this.greenId, this.onChannelChange);
        }
        if (this.blueId) {
            this.props.stateContext.removeState(this.blueId, this.onChannelChange);
        }
        if (this.hueId) {
            this.props.stateContext.removeState(this.hueId, this.onHsvChange);
        }
        if (this.saturationId) {
            this.props.stateContext.removeState(this.saturationId, this.onHsvChange);
        }
        if (this.ctId) {
            this.props.stateContext.removeState(this.ctId, this.onCtChange);
        }
        if (this.cieId) {
            this.props.stateContext.removeState(this.cieId, this.onCieChange);
        }
    }
    // --- Object loaders ---
    async loadDimmerObject() {
        const id = this.setId || this.actualId;
        if (!id) {
            return;
        }
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(id));
            if (obj?.common) {
                const min = obj.common.min != null ? Number(obj.common.min) : 0;
                const max = obj.common.max != null ? Number(obj.common.max) : 100;
                if (!isNaN(min) && !isNaN(max) && max > min) {
                    this.setState({ dimMin: min, dimMax: max });
                }
            }
        }
        catch {
            // ignore
        }
    }
    async loadCtObject() {
        if (!this.ctId) {
            return;
        }
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(this.ctId));
            if (obj?.common) {
                const min = obj.common.min != null ? Number(obj.common.min) : 2000;
                const max = obj.common.max != null ? Number(obj.common.max) : 6500;
                if (!isNaN(min) && !isNaN(max) && max > min) {
                    this.setState({ ctMin: min, ctMax: max });
                }
            }
        }
        catch {
            // ignore
        }
    }
    rawToPercent(raw) {
        const { dimMin, dimMax } = this.state;
        const range = dimMax - dimMin;
        if (range <= 0) {
            return 0;
        }
        return Math.round(((raw - dimMin) / range) * 100);
    }
    percentToRaw(percent) {
        const { dimMin, dimMax } = this.state;
        return dimMin + (percent / 100) * (dimMax - dimMin);
    }
    // --- State change callbacks ---
    onBrightnessChange = (_id, state) => {
        if (this.isDragging) {
            return;
        }
        const raw = Number(state.val) || 0;
        const brightness = this.rawToPercent(raw);
        if (brightness !== this.state.brightness) {
            if (!this.onActualId || this.onActualId === this.actualId) {
                this.setState({ brightness, isOn: brightness > 0 });
            }
            else {
                this.setState({ brightness });
            }
        }
    };
    onOnOffChange = (_id, state) => {
        const isOn = !!state.val;
        if (isOn !== this.state.isOn) {
            this.setState({ isOn });
        }
    };
    // --- Color state callbacks ---
    /** Raw channel values for RGB separate mode */
    channelValues = { r: 0, g: 0, b: 0 };
    onRgbChange = (_id, state) => {
        const val = String(state.val || '').replace(/^#/, '');
        if (val.length >= 6) {
            this.setState({ color: `#${val.slice(0, 6)}` });
        }
    };
    onRgbwChange = (_id, state) => {
        // RGBW: take first 6 hex chars as RGB
        const val = String(state.val || '').replace(/^#/, '');
        if (val.length >= 6) {
            this.setState({ color: `#${val.slice(0, 6)}` });
        }
    };
    onChannelChange = (id, state) => {
        const val = Math.round(Number(state.val) || 0);
        if (id === this.redId) {
            this.channelValues.r = val;
        }
        else if (id === this.greenId) {
            this.channelValues.g = val;
        }
        else if (id === this.blueId) {
            this.channelValues.b = val;
        }
        const { r, g, b } = this.channelValues;
        this.setState({ color: rgbToHex(r, g, b) });
    };
    /** Hue/saturation raw values */
    hsvValues = { h: 0, s: 100 };
    onHsvChange = (id, state) => {
        const val = Number(state.val) || 0;
        if (id === this.hueId) {
            this.hsvValues.h = val;
        }
        else if (id === this.saturationId) {
            this.hsvValues.s = val;
        }
        const [r, g, b] = hsvToRgb(this.hsvValues.h, this.hsvValues.s / 100, 1);
        this.setState({ color: rgbToHex(r, g, b) });
    };
    onCtChange = (_id, state) => {
        const kelvin = Number(state.val) || 4000;
        const [r, g, b] = ctToRgb(kelvin);
        this.setState({ color: rgbToHex(r, g, b), ctValue: kelvin });
    };
    onCieChange = (_id, state) => {
        const val = String(state.val || '');
        const parts = val.split(',').map(Number);
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const [r, g, b] = cieToRgb(parts[0], parts[1]);
            this.setState({ color: rgbToHex(r, g, b) });
        }
    };
    // --- Send color to device ---
    sendColor(hex) {
        const type = this.props.widget.control.type;
        const socket = this.props.stateContext.getSocket();
        const [r, g, b] = hexToRgb(hex);
        if (type === Types.rgbSingle && this.rgbId) {
            void socket.setState(this.rgbId, hex.replace(/^#/, ''));
        }
        else if (type === Types.rgbwSingle && this.rgbwId) {
            // Keep existing white channel
            void socket.setState(this.rgbwId, `${hex.replace(/^#/, '')}00`);
        }
        else if (type === Types.rgb) {
            if (this.redId) {
                void socket.setState(this.redId, r);
            }
            if (this.greenId) {
                void socket.setState(this.greenId, g);
            }
            if (this.blueId) {
                void socket.setState(this.blueId, b);
            }
        }
        else if (type === Types.hue) {
            const [h, s] = rgbToHsv(r, g, b);
            if (this.hueId) {
                void socket.setState(this.hueId, Math.round(h));
            }
            if (this.saturationId) {
                void socket.setState(this.saturationId, Math.round(s * 100));
            }
        }
        else if (type === Types.cie && this.cieId) {
            const [cx, cy] = rgbToCie(r, g, b);
            void socket.setState(this.cieId, `${cx.toFixed(4)},${cy.toFixed(4)}`);
        }
        // CT is not set from RGB hex — it has its own control
    }
    // --- Dimmer controls ---
    toggleOnOff = () => {
        if (this.onSetId) {
            void this.props.stateContext.getSocket().setState(this.onSetId, !this.state.isOn);
        }
        else if (this.setId) {
            const onPercent = this.props.settings?.onBrightness ?? 100;
            void this.props.stateContext
                .getSocket()
                .setState(this.setId, this.state.isOn ? this.state.dimMin : this.percentToRaw(onPercent));
        }
    };
    onSliderChange = (_e, value) => {
        const percent = value;
        if (this.setId) {
            void this.props.stateContext.getSocket().setState(this.setId, this.percentToRaw(percent));
        }
        if (this.onSetId && !this.state.isOn && percent > 0) {
            void this.props.stateContext.getSocket().setState(this.onSetId, true);
        }
    };
    // --- Dialog callbacks ---
    hasColorControl() {
        const type = this.props.widget.control.type;
        return type !== Types.ct;
    }
    onDialogColorChange = (hex) => {
        this.setState({ color: hex });
        this.sendColor(hex);
    };
    onDialogBrightnessChange = (percent) => {
        this.setState({ brightness: percent, isOn: percent > 0 });
        if (this.setId) {
            void this.props.stateContext.getSocket().setState(this.setId, this.percentToRaw(percent));
        }
        if (this.onSetId && !this.state.isOn && percent > 0) {
            void this.props.stateContext.getSocket().setState(this.onSetId, true);
        }
    };
    onDialogCtChange = (kelvin) => {
        this.setState({ ctValue: kelvin });
        if (this.ctId) {
            void this.props.stateContext.getSocket().setState(this.ctId, kelvin);
        }
    };
    openDialog = () => {
        this.setState({ dialogOpen: true });
    };
    closeDialog = () => {
        this.setState({ dialogOpen: false });
    };
    // --- Arc knob ---
    pointerToPercent(clientX, clientY) {
        const el = this.arcRef.current;
        if (!el) {
            return this.state.brightness;
        }
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = clientX - cx;
        const dy = clientY - cy;
        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        if (angle < 0) {
            angle += 360;
        }
        let normalized = angle - 135;
        if (normalized < 0) {
            normalized += 360;
        }
        if (normalized > 270) {
            return normalized > 315 ? 0 : 100;
        }
        return Math.round((normalized / 270) * 100);
    }
    onArcPointerDown = (e) => {
        e.preventDefault();
        e.target.setPointerCapture(e.pointerId);
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this.isDragging = false;
        this.longPressTriggered = false;
        // When power control exists (dedicated or brightness-simulated): tap = toggle, long press = dialog
        if (this.onSetId || this.setId) {
            this.longPressTimer = setTimeout(() => {
                this.longPressTriggered = true;
                this.dragStartPos = null;
                if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                    navigator.vibrate(50);
                }
                this.setState({ dialogOpen: true });
            }, 500);
        }
    };
    onArcPointerMove = (e) => {
        if (!this.dragStartPos) {
            return;
        }
        const dx = e.clientX - this.dragStartPos.x;
        const dy = e.clientY - this.dragStartPos.y;
        if (!this.isDragging && Math.sqrt(dx * dx + dy * dy) > 8) {
            this.isDragging = true;
            this.setState({ dragging: true });
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
        }
        if (this.isDragging) {
            const percent = this.pointerToPercent(e.clientX, e.clientY);
            this.setState({ brightness: percent, isOn: this.state.isOn || percent > 0 });
        }
    };
    onArcPointerUp = (e) => {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        // Long-press already opened the dialog — swallow the trailing pointerUp/cancel.
        if (this.longPressTriggered) {
            this.longPressTriggered = false;
            this.dragStartPos = null;
            this.isDragging = false;
            this.setState({ dragging: false });
            return;
        }
        if (this.isDragging) {
            const percent = this.pointerToPercent(e.clientX, e.clientY);
            if (this.setId) {
                void this.props.stateContext.getSocket().setState(this.setId, this.percentToRaw(percent));
            }
            if (this.onSetId && !this.state.isOn && percent > 0) {
                void this.props.stateContext.getSocket().setState(this.onSetId, true);
            }
        }
        else if (this.onSetId || this.setId) {
            // Tap with power control — toggle on/off
            this.toggleOnOff();
        }
        else {
            // Tap without any power control — open dialog directly
            this.openDialog();
        }
        this.dragStartPos = null;
        this.isDragging = false;
        this.setState({ dragging: false });
    };
    // --- Overrides ---
    isTileActive() {
        if (this.onActualId && this.onActualId !== this.actualId) {
            return this.state.isOn;
        }
        return this.state.brightness > 0 || this.state.isOn;
    }
    // eslint-disable-next-line class-methods-use-this
    hasTileAction() {
        return true;
    }
    onTileClick() {
        if (this.onSetId || this.setId) {
            this.toggleOnOff();
        }
        else {
            this.openDialog();
        }
    }
    renderTileIcon() {
        const baseIcon = this.renderBaseIcon();
        if (baseIcon) {
            return baseIcon;
        }
        const isActive = this.isTileActive();
        const { color, brightness } = this.state;
        return (React.createElement(LightbulbOutlined, { sx: theme => ({
                color: isActive ? color : theme.palette.text.disabled,
                transition: 'color 0.25s ease',
                filter: isActive ? `drop-shadow(0 0 ${4 + brightness / 10}px ${color})` : 'none',
            }) }));
    }
    renderTileStatus() {
        const isActive = this.isTileActive();
        const { color, brightness } = this.state;
        return (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
            isActive ? (React.createElement(Box, { sx: {
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: '1px solid',
                    borderColor: 'divider',
                    flexShrink: 0,
                } })) : null,
            React.createElement(Typography, { variant: "caption", sx: theme => ({
                    fontWeight: 500,
                    color: isActive ? theme.palette.text.primary : theme.palette.text.secondary,
                    transition: 'color 0.25s ease',
                }) }, isActive ? `${Math.round(brightness)}%` : I18n.t('wm_Off'))));
    }
    renderTileAction() {
        const { brightness, color } = this.state;
        const accent = this.getAccentColor();
        return (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
            React.createElement(Box, { onClick: (e) => {
                    e.stopPropagation();
                    this.openDialog();
                }, sx: {
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: '2px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'background-color 0.2s ease',
                } }),
            this.setId ? (React.createElement(Slider, { value: brightness, min: 0, max: 100, size: "small", onClick: e => e.stopPropagation(), onChange: this.onSliderChange, sx: theme => ({
                    width: 60,
                    color: accent || theme.palette.primary.main,
                    '& .MuiSlider-thumb': { width: 14, height: 14 },
                }) })) : null,
            this.onSetId || this.setId ? (React.createElement(MuiSwitch, { checked: this.isTileActive(), onClick: e => e.stopPropagation(), onChange: this.toggleOnOff, size: "small" })) : null));
    }
    // --- Compact (1x1): arc knob with color ring ---
    renderCompact() {
        const { name, brightness, dragging, color } = this.state;
        const isActive = this.isTileActive();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        const vb = 100;
        const sw = 8;
        const r = (vb - sw) / 2;
        const circumference = 2 * Math.PI * r;
        const arcLength = circumference * 0.75;
        const progress = (brightness / 100) * arcLength;
        const arcColor = isActive ? color : 'transparent';
        const tile = (React.createElement(Box, { id: String(this.props.widget.id), className: this.getWidgetClass(), sx: theme => WidgetGeneric.getStyleCompact(theme) },
            React.createElement(Box, { ref: this.arcRef, onPointerDown: this.onArcPointerDown, onPointerMove: this.onArcPointerMove, onPointerUp: this.onArcPointerUp, onPointerCancel: this.onArcPointerUp, sx: theme => ({
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'stretch',
                    width: '100%',
                    aspectRatio: '1',
                    textAlign: 'left',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    touchAction: 'none',
                    userSelect: 'none',
                    ...this.applyTileStyles(theme, isActive),
                    padding: isNeumorphicTheme(theme) ? 'max(12px, 8cqi)' : 'max(16px, 10cqi)',
                }) },
                indicators,
                React.createElement(Box, { sx: {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        flex: 1,
                    } },
                    React.createElement("svg", { viewBox: `0 0 ${vb} ${vb}`, style: { width: '60%', height: '60%', transform: 'rotate(135deg)' } },
                        React.createElement("circle", { cx: vb / 2, cy: vb / 2, r: r, fill: "none", stroke: "currentColor", strokeWidth: sw, strokeDasharray: `${arcLength} ${circumference}`, strokeLinecap: "round", opacity: 0.15 }),
                        React.createElement("circle", { cx: vb / 2, cy: vb / 2, r: r, fill: "none", stroke: arcColor, strokeWidth: sw, strokeDasharray: `${progress} ${circumference}`, strokeLinecap: "round", style: dragging ? undefined : { transition: 'stroke-dasharray 0.3s ease' } })),
                    React.createElement(Box, { sx: {
                            position: 'absolute',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        } }, this.renderTileIcon())),
                React.createElement(Box, null,
                    React.createElement(Typography, { ref: this.nameRef, variant: "body2", sx: theme => ({
                            fontWeight: 600,
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            ...(isNeumorphicTheme(theme)
                                ? {
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    fontSize: 'max(0.6rem, 6cqi)',
                                }
                                : {}),
                        }) }, this.props.settings?.name || name || '...'),
                    this.renderTileStatus()),
                this.renderChart())));
        if (this.onSetId || this.setId) {
            return (React.createElement(Tooltip, { title: I18n.t('wm_Long press for settings'), disableTouchListener: true, enterDelay: 500 }, tile));
        }
        return tile;
    }
    // --- Render with dialog ---
    render() {
        return (React.createElement(React.Fragment, null,
            super.render(),
            React.createElement(ColorLightDialog, { open: this.state.dialogOpen, onClose: this.closeDialog, color: this.state.color, brightness: this.state.brightness, isOn: this.state.isOn, hasColor: this.hasColorControl(), hasPower: !!(this.onSetId || this.setId), hasBrightness: !!(this.setId || this.actualId), hasCt: !!this.ctId, ctMin: this.state.ctMin, ctMax: this.state.ctMax, ctValue: this.state.ctValue, onColorChange: this.onDialogColorChange, onBrightnessChange: this.onDialogBrightnessChange, onCtChange: this.onDialogCtChange, onToggle: this.toggleOnOff })));
    }
}
export default WidgetColorLight;
//# sourceMappingURL=ColorLight.js.map