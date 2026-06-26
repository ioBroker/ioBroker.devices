import React from 'react';
import { Box, Button, ButtonBase, Dialog, DialogContent, IconButton, Slider, Tooltip, Typography } from '@mui/material';
import { AcUnit, Add, Air, AutoMode, Close, EnergySavingsLeaf, LocalFireDepartment, PowerSettingsNew, Remove, SwapVert, Tune, Whatshot, } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';
import WidgetGeneric, { formatFloat, isNeumorphicTheme, } from './Generic';
export class WidgetAirCondition extends WidgetGeneric {
    setId;
    actualId;
    humidityId;
    boostId;
    powerId;
    modeId;
    speedId;
    swingId;
    arcRef = React.createRef();
    constructor(props) {
        super(props);
        const states = props.widget.control.states;
        this.setId = states.find(s => s.name === 'SET')?.id ?? null;
        this.actualId = states.find(s => s.name === 'ACTUAL')?.id ?? null;
        this.humidityId = states.find(s => s.name === 'HUMIDITY')?.id ?? null;
        this.boostId = states.find(s => s.name === 'BOOST')?.id ?? null;
        this.powerId = states.find(s => s.name === 'POWER')?.id ?? null;
        this.modeId = states.find(s => s.name === 'MODE')?.id ?? null;
        this.speedId = states.find(s => s.name === 'SPEED')?.id ?? null;
        this.swingId = states.find(s => s.name === 'SWING')?.id ?? null;
        this.state = {
            ...this.state,
            setTemp: null,
            actualTemp: null,
            humidity: null,
            boost: false,
            power: null,
            mode: null,
            modeStates: {},
            speed: null,
            speedStates: {},
            swing: null,
            swingStates: {},
            swingIsBoolean: false,
            setMin: 16,
            setMax: 30,
            setStep: 0.5,
            dragging: false,
            dialogOpen: false,
        };
    }
    componentDidMount() {
        super.componentDidMount();
        if (this.setId) {
            this.props.stateContext.getState(this.setId, this.onSetChange);
        }
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onActualChange);
        }
        if (this.humidityId) {
            this.props.stateContext.getState(this.humidityId, this.onHumidityChange);
        }
        if (this.boostId) {
            this.props.stateContext.getState(this.boostId, this.onBoostChange);
        }
        if (this.powerId) {
            this.props.stateContext.getState(this.powerId, this.onPowerChange);
        }
        if (this.modeId) {
            this.props.stateContext.getState(this.modeId, this.onModeChange);
            void this.loadStatesObject(this.modeId, 'modeStates');
        }
        if (this.speedId) {
            this.props.stateContext.getState(this.speedId, this.onSpeedChange);
            void this.loadStatesObject(this.speedId, 'speedStates');
        }
        if (this.swingId) {
            this.props.stateContext.getState(this.swingId, this.onSwingChange);
            void this.loadSwingObject();
        }
        void this.loadSetObject();
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.setId) {
            this.props.stateContext.removeState(this.setId, this.onSetChange);
        }
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onActualChange);
        }
        if (this.humidityId) {
            this.props.stateContext.removeState(this.humidityId, this.onHumidityChange);
        }
        if (this.boostId) {
            this.props.stateContext.removeState(this.boostId, this.onBoostChange);
        }
        if (this.powerId) {
            this.props.stateContext.removeState(this.powerId, this.onPowerChange);
        }
        if (this.modeId) {
            this.props.stateContext.removeState(this.modeId, this.onModeChange);
        }
        if (this.speedId) {
            this.props.stateContext.removeState(this.speedId, this.onSpeedChange);
        }
        if (this.swingId) {
            this.props.stateContext.removeState(this.swingId, this.onSwingChange);
        }
    }
    async loadStatesObject(id, stateKey) {
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(id));
            if (obj?.common?.states && typeof obj.common.states === 'object') {
                if (stateKey === 'modeStates') {
                    this.setState({ modeStates: obj.common.states });
                }
                else {
                    this.setState({ speedStates: obj.common.states });
                }
            }
        }
        catch {
            // ignore
        }
    }
    async loadSwingObject() {
        if (!this.swingId) {
            return;
        }
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(this.swingId));
            if (obj?.common) {
                const isBoolean = obj.common.type === 'boolean';
                this.setState({ swingIsBoolean: isBoolean });
                if (!isBoolean && obj.common.states && typeof obj.common.states === 'object') {
                    this.setState({ swingStates: obj.common.states });
                }
            }
        }
        catch {
            // ignore
        }
    }
    async loadSetObject() {
        if (!this.setId) {
            return;
        }
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(this.setId));
            if (obj?.common) {
                const min = obj.common.min != null ? Number(obj.common.min) : 16;
                const max = obj.common.max != null ? Number(obj.common.max) : 30;
                const step = obj.common.step != null ? Number(obj.common.step) : 0.5;
                if (!isNaN(min) && !isNaN(max) && max > min) {
                    this.setState({ setMin: min, setMax: max, setStep: step > 0 ? step : 0.5 });
                }
            }
        }
        catch {
            // ignore
        }
    }
    // --- State change handlers ---
    onSetChange = (_id, state) => {
        if (this.state.dragging) {
            return;
        }
        const val = state.val != null ? Number(state.val) : null;
        const setTemp = val != null && !isNaN(val) ? val : null;
        if (setTemp !== this.state.setTemp) {
            this.setState({ setTemp });
        }
    };
    onActualChange = (_id, state) => {
        const val = state.val != null ? Number(state.val) : null;
        const actualTemp = val != null && !isNaN(val) ? val : null;
        if (actualTemp !== this.state.actualTemp) {
            this.setState({ actualTemp });
        }
    };
    onHumidityChange = (_id, state) => {
        const val = state.val != null ? Number(state.val) : null;
        const humidity = val != null && !isNaN(val) ? val : null;
        if (humidity !== this.state.humidity) {
            this.setState({ humidity });
        }
    };
    onBoostChange = (_id, state) => {
        const boost = !!state.val;
        if (boost !== this.state.boost) {
            this.setState({ boost });
        }
    };
    onPowerChange = (_id, state) => {
        const power = !!state.val;
        if (power !== this.state.power) {
            this.setState({ power });
        }
    };
    onModeChange = (_id, state) => {
        const val = state.val != null ? Number(state.val) : null;
        const mode = val != null && !isNaN(val) ? val : null;
        if (mode !== this.state.mode) {
            this.setState({ mode });
        }
    };
    onSpeedChange = (_id, state) => {
        const val = state.val != null ? Number(state.val) : null;
        const speed = val != null && !isNaN(val) ? val : null;
        if (speed !== this.state.speed) {
            this.setState({ speed });
        }
    };
    onSwingChange = (_id, state) => {
        const swing = state.val;
        if (swing !== this.state.swing) {
            this.setState({ swing: swing });
        }
    };
    // --- Actions ---
    togglePower = () => {
        if (this.powerId) {
            const newVal = !this.state.power;
            void this.props.stateContext.getSocket().setState(this.powerId, newVal);
            this.setState({ power: newVal });
        }
    };
    toggleBoost = () => {
        if (this.boostId) {
            const newVal = !this.state.boost;
            void this.props.stateContext.getSocket().setState(this.boostId, newVal);
            this.setState({ boost: newVal });
        }
    };
    setMode = (value) => {
        if (this.modeId) {
            void this.props.stateContext.getSocket().setState(this.modeId, value);
            this.setState({ mode: value });
        }
    };
    setSpeed = (value) => {
        if (this.speedId) {
            void this.props.stateContext.getSocket().setState(this.speedId, value);
            this.setState({ speed: value });
        }
    };
    setSwing = (value) => {
        if (this.swingId) {
            void this.props.stateContext.getSocket().setState(this.swingId, value);
            this.setState({ swing: value });
        }
    };
    sendSetTemp(value) {
        if (this.setId) {
            const clamped = Math.max(this.state.setMin, Math.min(this.state.setMax, value));
            void this.props.stateContext.getSocket().setState(this.setId, clamped);
        }
    }
    adjustTemp = (delta) => {
        const current = this.state.setTemp ?? this.state.setMin;
        const newVal = Math.max(this.state.setMin, Math.min(this.state.setMax, current + delta));
        this.sendSetTemp(newVal);
        this.setState({ setTemp: newVal });
    };
    // --- Arc drag ---
    angleToTemp(clientX, clientY) {
        const el = this.arcRef.current;
        if (!el) {
            return this.state.setTemp ?? this.state.setMin;
        }
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = clientX - cx;
        const dy = clientY - cy;
        let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
        if (angle < 0) {
            angle += 360;
        }
        let normalized = (angle - 225 + 360) % 360;
        if (normalized > 270) {
            normalized = normalized > 315 ? 0 : 270;
        }
        const { setMin, setMax, setStep } = this.state;
        const fraction = normalized / 270;
        const raw = setMin + fraction * (setMax - setMin);
        return Math.max(setMin, Math.min(setMax, Math.round(raw / setStep) * setStep));
    }
    onArcPointerDown = (e) => {
        e.preventDefault();
        e.target.setPointerCapture(e.pointerId);
        const temp = this.angleToTemp(e.clientX, e.clientY);
        this.setState({ dragging: true, setTemp: temp });
    };
    onArcPointerMove = (e) => {
        if (!this.state.dragging) {
            return;
        }
        const temp = this.angleToTemp(e.clientX, e.clientY);
        this.setState({ setTemp: temp });
    };
    onArcPointerUp = (e) => {
        if (!this.state.dragging) {
            return;
        }
        const temp = this.angleToTemp(e.clientX, e.clientY);
        this.sendSetTemp(temp);
        this.setState({ setTemp: temp, dragging: false });
    };
    // --- Mode helpers ---
    static MODE_MAP = {
        auto: { color: '#9c27b0', i18nKey: 'wm_mode_auto' },
        cool: { color: '#2196f3', i18nKey: 'wm_mode_cool' },
        dry: { color: '#00bcd4', i18nKey: 'wm_mode_dry' },
        eco: { color: '#4caf50', i18nKey: 'wm_mode_eco' },
        fan_only: { color: '#03a9f4', i18nKey: 'wm_mode_fan_only' },
        heat: { color: '#ff5722', i18nKey: 'wm_mode_heat' },
        off: { color: '#9e9e9e', i18nKey: 'wm_mode_off' },
        manual: { color: '#607d8b', i18nKey: 'wm_mode_manual' },
        boost: { color: '#f44336', i18nKey: 'wm_mode_boost' },
    };
    static getModeInfo(label) {
        const key = label.toLowerCase().trim();
        const meta = WidgetAirCondition.MODE_MAP[key];
        if (meta) {
            return { color: meta.color, displayName: I18n.t(meta.i18nKey) };
        }
        return { color: '#9e9e9e', displayName: label };
    }
    static renderModeIcon(label, fontSize, color) {
        const key = label.toLowerCase().trim();
        const sx = { fontSize, color: color || WidgetAirCondition.getModeInfo(label).color };
        switch (key) {
            case 'auto':
                return React.createElement(AutoMode, { sx: sx });
            case 'cool':
                return React.createElement(AcUnit, { sx: sx });
            case 'dry':
                return React.createElement(Air, { sx: sx });
            case 'eco':
                return React.createElement(EnergySavingsLeaf, { sx: sx });
            case 'fan_only':
                return React.createElement(Air, { sx: sx });
            case 'heat':
                return React.createElement(Whatshot, { sx: sx });
            case 'off':
                return React.createElement(PowerSettingsNew, { sx: sx });
            case 'manual':
                return React.createElement(Tune, { sx: sx });
            case 'boost':
                return React.createElement(LocalFireDepartment, { sx: sx });
            default:
                return React.createElement(Tune, { sx: sx });
        }
    }
    // --- Speed helpers ---
    static SPEED_MAP = {
        auto: { i18nKey: 'wm_speed_auto' },
        high: { i18nKey: 'wm_speed_high' },
        low: { i18nKey: 'wm_speed_low' },
        medium: { i18nKey: 'wm_speed_medium' },
        quiet: { i18nKey: 'wm_speed_quiet' },
        turbo: { i18nKey: 'wm_speed_turbo' },
    };
    static getSpeedLabel(label) {
        const key = label.toLowerCase().trim();
        const meta = WidgetAirCondition.SPEED_MAP[key];
        return meta ? I18n.t(meta.i18nKey) : label;
    }
    // --- Swing helpers ---
    static SWING_MAP = {
        auto: { i18nKey: 'wm_swing_auto' },
        horizontal: { i18nKey: 'wm_swing_horizontal' },
        stationary: { i18nKey: 'wm_swing_stationary' },
        vertical: { i18nKey: 'wm_swing_vertical' },
    };
    static getSwingLabel(label) {
        const key = label.toLowerCase().trim();
        const meta = WidgetAirCondition.SWING_MAP[key];
        return meta ? I18n.t(meta.i18nKey) : label;
    }
    // --- Derived state helpers ---
    getCurrentModeLabel() {
        const { mode, modeStates } = this.state;
        if (mode == null) {
            return null;
        }
        return modeStates[String(mode)] || null;
    }
    getCurrentSpeedLabel() {
        const { speed, speedStates } = this.state;
        if (speed == null) {
            return null;
        }
        return speedStates[String(speed)] || null;
    }
    isPoweredOff() {
        if (this.powerId && this.state.power === false) {
            return true;
        }
        const modeLabel = this.getCurrentModeLabel();
        return !!(this.modeId && modeLabel && modeLabel.toLowerCase().trim() === 'off');
    }
    // --- Color helpers ---
    getModeColor() {
        const modeLabel = this.getCurrentModeLabel();
        if (!modeLabel) {
            return '#2196f3';
        }
        return WidgetAirCondition.getModeInfo(modeLabel).color;
    }
    static getTempColor(t) {
        if (t == null) {
            return 'text.disabled';
        }
        if (t < 18) {
            return '#2196f3';
        }
        if (t < 22) {
            return '#4caf50';
        }
        if (t < 26) {
            return '#ff9800';
        }
        return '#f44336';
    }
    static formatTemp(t, isFloatComma) {
        if (t == null) {
            return '—';
        }
        return `${formatFloat(t, 1, isFloatComma)}°`;
    }
    // --- History ---
    getHistoryIds() {
        const ids = [];
        if (this.actualId) {
            ids.push({ id: this.actualId, color: '#ff9800' });
        }
        if (this.setId) {
            ids.push({ id: this.setId, color: '#f44336' });
        }
        if (this.humidityId) {
            ids.push({ id: this.humidityId, color: '#2196f3' });
        }
        return ids;
    }
    // --- Tile overrides ---
    isTileActive() {
        return !this.isPoweredOff() && (this.state.setTemp != null || this.state.actualTemp != null);
    }
    // eslint-disable-next-line class-methods-use-this
    hasTileAction() {
        return true;
    }
    onTileClick() {
        this.setState({ dialogOpen: true });
    }
    renderTileIcon() {
        const baseIcon = this.renderBaseIcon();
        if (baseIcon) {
            return baseIcon;
        }
        const modeLabel = this.getCurrentModeLabel();
        const modeColor = this.getModeColor();
        if (modeLabel) {
            return WidgetAirCondition.renderModeIcon(modeLabel, 24, this.isPoweredOff() ? undefined : modeColor);
        }
        return React.createElement(AcUnit, { sx: { color: this.isPoweredOff() ? 'text.disabled' : '#2196f3' } });
    }
    renderTileStatus() {
        const size = this.props.settings?.size || '1x1';
        if (size === '2x0.5') {
            return null;
        }
        const { setTemp, actualTemp, humidity, boost, power } = this.state;
        const modeLabel = this.getCurrentModeLabel();
        const speedLabel = this.getCurrentSpeedLabel();
        return (React.createElement(Box, { sx: { display: 'flex', flexDirection: 'column' } },
            React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
                actualTemp != null ? (React.createElement(Tooltip, { title: I18n.t('wm_Actual temperature') },
                    React.createElement(Typography, { variant: "caption", sx: { fontWeight: 600, fontSize: '1.1rem', lineHeight: 1.2, color: 'text.primary' } }, WidgetAirCondition.formatTemp(actualTemp, this.props.stateContext.isFloatComma)))) : null,
                setTemp != null ? (React.createElement(Tooltip, { title: I18n.t('wm_Set temperature') },
                    React.createElement(Typography, { variant: "caption", sx: { fontWeight: 500, color: 'text.secondary' } },
                        "\u2192 ",
                        WidgetAirCondition.formatTemp(setTemp, this.props.stateContext.isFloatComma)))) : null,
                boost ? React.createElement(LocalFireDepartment, { sx: { fontSize: 14, color: '#f44336' } }) : null,
                power === false ? (React.createElement(Tooltip, { title: I18n.t('wm_On/Off') },
                    React.createElement(PowerSettingsNew, { sx: { fontSize: 14, color: 'text.disabled' } }))) : null,
                modeLabel ? (React.createElement(Tooltip, { title: WidgetAirCondition.getModeInfo(modeLabel).displayName }, WidgetAirCondition.renderModeIcon(modeLabel, 14))) : null),
            humidity != null || speedLabel ? (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
                humidity != null ? (React.createElement(Typography, { variant: "caption", sx: {
                        fontWeight: 500,
                        color: 'text.secondary',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                    } },
                    "\uD83D\uDCA7 ",
                    Math.round(humidity),
                    "%")) : null,
                speedLabel ? (React.createElement(Typography, { variant: "caption", sx: { fontWeight: 500, color: 'text.secondary' } },
                    React.createElement(Air, { sx: { fontSize: 12, verticalAlign: 'middle', mr: 0.25 } }),
                    WidgetAirCondition.getSpeedLabel(speedLabel))) : null)) : null));
    }
    renderTileAction() {
        const { setTemp, actualTemp, humidity, boost, power } = this.state;
        const modeLabel = this.getCurrentModeLabel();
        const speedLabel = this.getCurrentSpeedLabel();
        return (React.createElement(Box, { sx: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' } },
            React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
                actualTemp != null ? (React.createElement(Typography, { variant: "body2", sx: { color: 'text.secondary', whiteSpace: 'nowrap' } }, WidgetAirCondition.formatTemp(actualTemp, this.props.stateContext.isFloatComma))) : null,
                React.createElement(Typography, { variant: "h6", sx: { fontWeight: 700, whiteSpace: 'nowrap' } },
                    "\u2192 ",
                    WidgetAirCondition.formatTemp(setTemp, this.props.stateContext.isFloatComma)),
                boost ? React.createElement(LocalFireDepartment, { sx: { fontSize: 18, color: '#f44336' } }) : null,
                power === false ? React.createElement(PowerSettingsNew, { sx: { fontSize: 18, color: 'text.disabled' } }) : null,
                modeLabel ? (React.createElement(Tooltip, { title: WidgetAirCondition.getModeInfo(modeLabel).displayName }, WidgetAirCondition.renderModeIcon(modeLabel, 18))) : null),
            humidity != null || speedLabel ? (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
                humidity != null ? (React.createElement(Typography, { variant: "body2", sx: {
                        color: 'text.secondary',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        whiteSpace: 'nowrap',
                    } },
                    "\uD83D\uDCA7 ",
                    Math.round(humidity),
                    "%")) : null,
                speedLabel ? (React.createElement(Typography, { variant: "body2", sx: { color: 'text.secondary', display: 'flex', alignItems: 'center', gap: '3px' } },
                    React.createElement(Air, { sx: { fontSize: 14 } }),
                    WidgetAirCondition.getSpeedLabel(speedLabel))) : null)) : null));
    }
    // --- Dialog ---
    renderDialog() {
        if (!this.state.dialogOpen) {
            return null;
        }
        const { name, setTemp, actualTemp, humidity, boost, power, mode, modeStates, speed, speedStates, swing, swingStates, swingIsBoolean, setMin, setMax, setStep, dragging, } = this.state;
        const displayTemp = actualTemp ?? setTemp;
        const modeEntries = Object.entries(modeStates);
        const speedEntries = Object.entries(speedStates);
        const swingEntries = Object.entries(swingStates);
        const currentModeLabel = mode != null ? modeStates[String(mode)] || null : null;
        const poweredOff = this.isPoweredOff();
        const dimmedSx = poweredOff ? { opacity: 0.5, transition: 'opacity 0.25s ease' } : {};
        // Arc parameters
        const vb = 100;
        const sw = 8;
        const r = (vb - sw) / 2;
        const circumference = 2 * Math.PI * r;
        const arcLength = circumference * 0.75;
        const range = setMax - setMin;
        const progress = setTemp != null && range > 0 ? ((setTemp - setMin) / range) * arcLength : 0;
        return (React.createElement(Dialog, { open: true, onClose: () => this.setState({ dialogOpen: false }), maxWidth: "xs", fullWidth: true, slotProps: { paper: { sx: { borderRadius: '24px' } } } },
            React.createElement(DialogContent, { sx: { p: 3, pt: 2, position: 'relative' } },
                React.createElement(IconButton, { size: "small", onClick: () => this.setState({ dialogOpen: false }), sx: { position: 'absolute', top: 8, right: 8 } },
                    React.createElement(Close, { fontSize: "small" })),
                React.createElement(Typography, { variant: "h6", sx: { fontWeight: 600, mb: 2, pr: 4 } }, this.props.settings?.name || name || '...'),
                React.createElement(Box, { sx: { display: 'flex', justifyContent: 'center', mb: 2, ...dimmedSx } },
                    React.createElement(Box, { ref: this.arcRef, onPointerDown: this.onArcPointerDown, onPointerMove: this.onArcPointerMove, onPointerUp: this.onArcPointerUp, onPointerCancel: this.onArcPointerUp, sx: {
                            position: 'relative',
                            width: 200,
                            height: 200,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            touchAction: 'none',
                            userSelect: 'none',
                        } },
                        React.createElement("svg", { viewBox: `0 0 ${vb} ${vb}`, style: { width: '100%', height: '100%', transform: 'rotate(135deg)' } },
                            React.createElement("circle", { cx: vb / 2, cy: vb / 2, r: r, fill: "none", stroke: "currentColor", strokeWidth: sw, strokeDasharray: `${arcLength} ${circumference}`, strokeLinecap: "round", opacity: 0.15 }),
                            React.createElement("circle", { cx: vb / 2, cy: vb / 2, r: r, fill: "none", stroke: WidgetAirCondition.getTempColor(displayTemp), strokeWidth: sw, strokeDasharray: `${progress} ${circumference}`, strokeLinecap: "round", style: dragging ? undefined : { transition: 'stroke-dasharray 0.3s ease' } })),
                        React.createElement(Box, { sx: {
                                position: 'absolute',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 0.5,
                            } },
                            React.createElement(Typography, { variant: "h3", sx: { fontWeight: 700, lineHeight: 1 } }, WidgetAirCondition.formatTemp(setTemp, this.props.stateContext.isFloatComma)),
                            actualTemp != null && setTemp != null ? (React.createElement(Typography, { variant: "body2", sx: { color: 'text.secondary' } },
                                I18n.t('wm_Actual'),
                                ":",
                                ' ',
                                WidgetAirCondition.formatTemp(actualTemp, this.props.stateContext.isFloatComma))) : null))),
                React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1, px: 1, mb: 2, ...dimmedSx } },
                    React.createElement(IconButton, { onClick: () => this.adjustTemp(-setStep), sx: theme => ({ border: `1px solid ${theme.palette.divider}` }) },
                        React.createElement(Remove, null)),
                    React.createElement(Slider, { value: setTemp ?? setMin, min: setMin, max: setMax, step: setStep, onMouseDown: () => this.setState({ dragging: true }), onTouchStart: () => this.setState({ dragging: true }), onChange: (_e, value) => this.setState({ setTemp: value }), onChangeCommitted: (_e, value) => {
                            this.sendSetTemp(value);
                            this.setState({ dragging: false });
                        }, sx: { flex: 1, color: WidgetAirCondition.getTempColor(setTemp) } }),
                    React.createElement(IconButton, { onClick: () => this.adjustTemp(setStep), sx: theme => ({ border: `1px solid ${theme.palette.divider}` }) },
                        React.createElement(Add, null))),
                humidity != null || boost || currentModeLabel ? (React.createElement(Box, { sx: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        justifyContent: 'center',
                        mb: 2,
                        ...dimmedSx,
                    } },
                    humidity != null ? (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
                        React.createElement(Typography, { variant: "body1", sx: { color: 'text.secondary' } },
                            "\uD83D\uDCA7 ",
                            Math.round(humidity),
                            "%"))) : null,
                    boost ? (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
                        React.createElement(LocalFireDepartment, { sx: { fontSize: 20, color: '#f44336' } }),
                        React.createElement(Typography, { variant: "body1", sx: { color: '#f44336' } }, "Boost"))) : null,
                    currentModeLabel ? (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
                        WidgetAirCondition.renderModeIcon(currentModeLabel, 20),
                        React.createElement(Typography, { variant: "body1", sx: { color: WidgetAirCondition.getModeInfo(currentModeLabel).color } }, WidgetAirCondition.getModeInfo(currentModeLabel).displayName))) : null)) : null,
                this.powerId || this.boostId ? (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center', mb: 2 } },
                    this.powerId ? (React.createElement(Button, { variant: power ? 'contained' : 'outlined', color: power ? 'success' : 'inherit', startIcon: React.createElement(PowerSettingsNew, null), onClick: this.togglePower, size: "small", sx: { textTransform: 'none', borderRadius: '20px' } }, I18n.t('wm_On/Off'))) : null,
                    this.boostId ? (React.createElement(Button, { variant: boost ? 'contained' : 'outlined', color: boost ? 'error' : 'inherit', startIcon: React.createElement(LocalFireDepartment, null), onClick: this.toggleBoost, size: "small", sx: { textTransform: 'none', borderRadius: '20px' } }, "Boost")) : null)) : null,
                modeEntries.length > 0 ? (React.createElement(Box, { sx: { mb: 2 } },
                    React.createElement(Typography, { variant: "body2", sx: { fontWeight: 600, mb: 0.75, color: 'text.secondary' } }, I18n.t('wm_Mode')),
                    React.createElement(Box, { sx: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.75,
                            justifyContent: 'center',
                            flexWrap: 'wrap',
                            ...dimmedSx,
                        } }, modeEntries.map(([key, label]) => {
                        const numKey = Number(key);
                        const isActive = mode === numKey;
                        const info = WidgetAirCondition.getModeInfo(label);
                        return (React.createElement(Button, { key: key, variant: isActive ? 'contained' : 'outlined', color: "inherit", startIcon: WidgetAirCondition.renderModeIcon(label, 18, isActive ? '#fff' : info.color), onClick: () => this.setMode(numKey), size: "small", sx: {
                                textTransform: 'none',
                                borderRadius: '20px',
                                minWidth: 0,
                                px: 1.5,
                                ...(isActive
                                    ? {
                                        backgroundColor: info.color,
                                        color: '#fff',
                                        '&:hover': { backgroundColor: info.color, opacity: 0.9 },
                                    }
                                    : {}),
                            } }, info.displayName));
                    })))) : null,
                speedEntries.length > 0 ? (React.createElement(Box, { sx: { mb: 2 } },
                    React.createElement(Typography, { variant: "body2", sx: { fontWeight: 600, mb: 0.75, color: 'text.secondary' } },
                        React.createElement(Air, { sx: { fontSize: 16, verticalAlign: 'middle', mr: 0.5 } }),
                        I18n.t('wm_Speed')),
                    React.createElement(Box, { sx: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.75,
                            justifyContent: 'center',
                            flexWrap: 'wrap',
                            ...dimmedSx,
                        } }, speedEntries.map(([key, label]) => {
                        const numKey = Number(key);
                        const isActive = speed === numKey;
                        return (React.createElement(Button, { key: key, variant: isActive ? 'contained' : 'outlined', color: isActive ? 'primary' : 'inherit', onClick: () => this.setSpeed(numKey), size: "small", sx: { textTransform: 'none', borderRadius: '20px', minWidth: 0, px: 1.5 } }, WidgetAirCondition.getSpeedLabel(label)));
                    })))) : null,
                this.swingId ? (React.createElement(Box, null,
                    React.createElement(Typography, { variant: "body2", sx: { fontWeight: 600, mb: 0.75, color: 'text.secondary' } },
                        React.createElement(SwapVert, { sx: { fontSize: 16, verticalAlign: 'middle', mr: 0.5 } }),
                        I18n.t('wm_Swing')),
                    swingIsBoolean ? (React.createElement(Box, { sx: { display: 'flex', justifyContent: 'center', ...dimmedSx } },
                        React.createElement(Button, { variant: swing ? 'contained' : 'outlined', color: swing ? 'primary' : 'inherit', onClick: () => this.setSwing(!swing), size: "small", sx: { textTransform: 'none', borderRadius: '20px' } }, swing ? I18n.t('wm_On') : I18n.t('wm_Off')))) : swingEntries.length > 0 ? (React.createElement(Box, { sx: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.75,
                            justifyContent: 'center',
                            flexWrap: 'wrap',
                            ...dimmedSx,
                        } }, swingEntries.map(([key, label]) => {
                        const numKey = Number(key);
                        const isActive = swing === numKey;
                        return (React.createElement(Button, { key: key, variant: isActive ? 'contained' : 'outlined', color: isActive ? 'primary' : 'inherit', onClick: () => this.setSwing(numKey), size: "small", sx: {
                                textTransform: 'none',
                                borderRadius: '20px',
                                minWidth: 0,
                                px: 1.5,
                            } }, WidgetAirCondition.getSwingLabel(label)));
                    }))) : null)) : null)));
    }
    // --- Compact 1x1 ---
    renderCompact() {
        const { name, setTemp, actualTemp, boost, power, setMin, setMax, dragging } = this.state;
        const modeLabel = this.getCurrentModeLabel();
        const isActive = this.isTileActive();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        const displayTemp = actualTemp ?? setTemp;
        const poweredOff = this.isPoweredOff();
        // Arc parameters
        const vb = 100;
        const sw = 8;
        const r = (vb - sw) / 2;
        const circumference = 2 * Math.PI * r;
        const arcLength = circumference * 0.75;
        const range = setMax - setMin;
        const progress = setTemp != null && range > 0 ? ((setTemp - setMin) / range) * arcLength : 0;
        return (React.createElement(Box, { id: String(this.props.widget.id), className: this.getWidgetClass(), sx: theme => WidgetGeneric.getStyleCompact(theme) },
            React.createElement(ButtonBase, { component: "div", onClick: () => this.onTileClick(), sx: theme => ({
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'stretch',
                    width: '100%',
                    aspectRatio: '1',
                    textAlign: 'left',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    ...this.applyTileStyles(theme, isActive && !poweredOff),
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
                        React.createElement("circle", { cx: vb / 2, cy: vb / 2, r: r, fill: "none", stroke: isActive ? WidgetAirCondition.getTempColor(displayTemp) : 'transparent', strokeWidth: sw, strokeDasharray: `${progress} ${circumference}`, strokeLinecap: "round", style: dragging ? undefined : { transition: 'stroke-dasharray 0.3s ease' } })),
                    React.createElement(Box, { sx: {
                            position: 'absolute',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        } },
                        this.renderTileIcon(),
                        setTemp != null ? (React.createElement(Typography, { variant: "caption", sx: { fontWeight: 700, fontSize: 'max(0.75rem, 7cqi)', lineHeight: 1 } }, WidgetAirCondition.formatTemp(setTemp, this.props.stateContext.isFloatComma))) : null)),
                React.createElement(Box, { sx: { textAlign: 'center', minWidth: 0 } },
                    React.createElement(Typography, { ref: this.nameRef, variant: "body2", sx: theme => ({
                            fontWeight: 600,
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            fontSize: 'max(0.75rem, 8cqi)',
                            ...(isNeumorphicTheme(theme)
                                ? {
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    fontSize: 'max(0.6rem, 6cqi)',
                                }
                                : {}),
                        }) }, this.props.settings?.name || name || '...'),
                    React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 } },
                        actualTemp != null && setTemp != null ? (React.createElement(Typography, { variant: "caption", sx: { color: 'text.secondary', fontSize: 'max(0.6rem, 6cqi)' } }, WidgetAirCondition.formatTemp(actualTemp, this.props.stateContext.isFloatComma))) : null,
                        boost ? (React.createElement(LocalFireDepartment, { sx: { fontSize: 'max(12px, 7cqi)', color: '#f44336' } })) : null,
                        power === false ? (React.createElement(PowerSettingsNew, { sx: { fontSize: 'max(12px, 7cqi)', color: 'text.disabled' } })) : null,
                        modeLabel ? WidgetAirCondition.renderModeIcon(modeLabel, 14) : null)),
                this.renderChart()),
            this.renderDialog()));
    }
    // --- WideTall 2x1 ---
    renderWideTall() {
        const { name, setTemp, actualTemp, humidity, boost, power } = this.state;
        const modeLabel = this.getCurrentModeLabel();
        const speedLabel = this.getCurrentSpeedLabel();
        const isActive = this.isTileActive();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        const poweredOff = this.isPoweredOff();
        return (React.createElement(Box, { id: String(this.props.widget.id), className: this.getWidgetClass(), sx: theme => WidgetGeneric.getStyleWideTall(theme) },
            React.createElement(Box, { sx: { width: 'calc(50% - 6px)', aspectRatio: '1' } }),
            React.createElement(ButtonBase, { component: "div", onClick: () => this.onTileClick(), sx: theme => ({
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    textAlign: 'left',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    ...this.applyTileStyles(theme, isActive && !poweredOff),
                    padding: 'max(16px, 5cqi)',
                }) },
                indicators,
                React.createElement(Typography, { ref: this.nameRef, variant: "body2", sx: {
                        fontWeight: 600,
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        fontSize: 'max(0.875rem, 4.5cqi)',
                        whiteSpace: 'nowrap',
                        mb: 0.5,
                    } }, this.props.settings?.name || name || '...'),
                React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 } },
                    React.createElement(Box, { sx: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            '& .MuiSvgIcon-root': { fontSize: 'max(48px, 16cqi) !important' },
                        } }, this.renderTileIcon()),
                    React.createElement(Box, { sx: { flex: 1, minWidth: 0 } },
                        React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' } },
                            actualTemp != null ? (React.createElement(Typography, { variant: "body2", sx: { color: 'text.secondary', whiteSpace: 'nowrap' } }, WidgetAirCondition.formatTemp(actualTemp, this.props.stateContext.isFloatComma))) : null,
                            React.createElement(Typography, { variant: "h6", sx: { fontWeight: 700, whiteSpace: 'nowrap' } },
                                "\u2192 ",
                                WidgetAirCondition.formatTemp(setTemp, this.props.stateContext.isFloatComma)),
                            boost ? React.createElement(LocalFireDepartment, { sx: { fontSize: 20, color: '#f44336' } }) : null,
                            power === false ? (React.createElement(PowerSettingsNew, { sx: { fontSize: 20, color: 'text.disabled' } })) : null,
                            modeLabel ? (React.createElement(Tooltip, { title: WidgetAirCondition.getModeInfo(modeLabel).displayName }, WidgetAirCondition.renderModeIcon(modeLabel, 20))) : null),
                        React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
                            humidity != null ? (React.createElement(Typography, { variant: "body2", sx: {
                                    color: 'text.secondary',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                } },
                                "\uD83D\uDCA7 ",
                                Math.round(humidity),
                                "%")) : null,
                            speedLabel ? (React.createElement(Typography, { variant: "body2", sx: {
                                    color: 'text.secondary',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                } },
                                React.createElement(Air, { sx: { fontSize: 14 } }),
                                WidgetAirCondition.getSpeedLabel(speedLabel))) : null))),
                this.renderChart()),
            this.renderDialog()));
    }
}
export default WidgetAirCondition;
//# sourceMappingURL=AirCondition.js.map