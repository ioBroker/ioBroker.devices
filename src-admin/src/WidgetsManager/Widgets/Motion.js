import React from 'react';
import { Box, Typography } from '@mui/material';
import { DirectionsRun, LightMode } from '@mui/icons-material';
import { I18n, Icon } from '@iobroker/adapter-react-v5';
import WidgetGeneric, {} from './Generic';
export class WidgetMotion extends WidgetGeneric {
    actualId;
    brightnessId;
    agoTimer = null;
    constructor(props) {
        super(props);
        const states = props.widget.control.states;
        const actual = states.find(s => s.name === 'ACTUAL');
        const second = states.find(s => s.name === 'SECOND');
        this.actualId = actual?.id ?? null;
        this.brightnessId = second?.id ?? null;
        this.state = {
            ...this.state,
            motion: false,
            brightness: null,
            brightnessUnit: '',
            brightnessMin: null,
            brightnessMax: null,
            lastMotion: null,
            lastMotionAgo: '',
        };
    }
    componentDidMount() {
        super.componentDidMount();
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onMotionChange);
        }
        if (this.brightnessId) {
            this.props.stateContext.getState(this.brightnessId, this.onBrightnessChange);
            void this.loadBrightnessObject();
        }
        // Update relative time every 60 seconds
        this.agoTimer = setInterval(() => this.updateAgo(), 60_000);
    }
    async loadBrightnessObject() {
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(this.brightnessId));
            if (obj?.common) {
                const unit = (obj.common.unit || '').trim().toLowerCase();
                const max = obj.common.max != null ? Number(obj.common.max) : null;
                const min = obj.common.min != null ? Number(obj.common.min) : null;
                this.setState({
                    brightnessUnit: unit,
                    brightnessMax: max != null && !isNaN(max) ? max : null,
                    brightnessMin: min != null && !isNaN(min) ? min : null,
                });
            }
        }
        catch {
            // ignore
        }
    }
    formatBrightness(value) {
        const { brightnessUnit, brightnessMin, brightnessMax } = this.state;
        if (brightnessUnit === 'lux') {
            return `${Math.round(value)} lux`;
        }
        if (brightnessUnit === '%') {
            return `${Math.round(value)}%`;
        }
        if (brightnessMax != null) {
            const min = brightnessMin || 0;
            const range = brightnessMax - min;
            return range > 0 ? `${Math.round(((value - min) / range) * 100)}%` : '0%';
        }
        return `${Math.round(value)}`;
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onMotionChange);
        }
        if (this.brightnessId) {
            this.props.stateContext.removeState(this.brightnessId, this.onBrightnessChange);
        }
        if (this.agoTimer) {
            clearInterval(this.agoTimer);
            this.agoTimer = null;
        }
    }
    updateAgo() {
        const { lastMotion } = this.state;
        if (lastMotion) {
            const ago = this.fromNow(lastMotion);
            if (ago !== this.state.lastMotionAgo) {
                this.setState({ lastMotionAgo: ago });
            }
        }
    }
    onMotionChange = (_id, state) => {
        const motion = !!state.val;
        const lc = state.lc || state.ts || Date.now();
        if (motion && motion !== this.state.motion) {
            // Motion just started — record when it was detected
            this.setState({ motion, lastMotion: lc, lastMotionAgo: this.fromNow(lc) });
        }
        else if (!motion && motion !== this.state.motion) {
            // Motion cleared — keep lastMotion, but if we never had one use lc
            const lastMotion = this.state.lastMotion || lc;
            this.setState({ motion, lastMotion, lastMotionAgo: this.fromNow(lastMotion) });
        }
        else if (!motion && !this.state.lastMotion && lc) {
            // Initial load with motion=false — use lc as approximation
            this.setState({ lastMotion: lc, lastMotionAgo: this.fromNow(lc) });
        }
    };
    onBrightnessChange = (_id, state) => {
        const val = state.val != null ? Number(state.val) : null;
        const brightness = val != null && !isNaN(val) ? val : null;
        if (brightness !== this.state.brightness) {
            this.setState({ brightness });
        }
    };
    getHistoryIds() {
        const ids = [];
        if (this.brightnessId) {
            ids.push({ id: this.brightnessId, color: '#ffc107' });
        }
        return ids;
    }
    isTileActive() {
        return this.state.motion;
    }
    renderTileIcon() {
        const { motion } = this.state;
        const accent = this.getAccentColor();
        // Active: iconActive, fallback to icon (with active color); Inactive: icon only
        const customIcon = motion
            ? this.props.settings?.iconActive || this.props.settings?.icon
            : this.props.settings?.icon;
        if (customIcon) {
            return (React.createElement(Icon, { src: customIcon, style: {
                    width: '1em',
                    height: '1em',
                    color: motion ? accent || '#ed6c02' : 'grey',
                    transition: 'color 0.25s ease',
                } }));
        }
        return (React.createElement(DirectionsRun, { sx: theme => ({
                color: motion ? accent || theme.palette.primary.main : theme.palette.text.disabled,
                transition: 'color 0.25s ease',
            }) }));
    }
    renderTileStatus() {
        const size = this.props.settings?.size || '1x1';
        if (size === '2x0.5' || size === '2x1') {
            // 2x0.5 has no status row; 2x1 already shows motion text + brightness in renderTileAction
            return null;
        }
        const { motion, brightness, lastMotionAgo } = this.state;
        const accent = this.getAccentColor();
        return (React.createElement(Box, { sx: { display: 'flex', flexDirection: 'column' } },
            React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
                React.createElement(Typography, { variant: "caption", sx: theme => ({
                        fontWeight: 600,
                        color: motion ? accent || theme.palette.primary.main : theme.palette.text.secondary,
                        transition: 'color 0.25s ease',
                    }) }, motion
                    ? this.props.settings?.textActive || I18n.t('wm_Motion')
                    : this.props.settings?.text || I18n.t('wm_Clear')),
                brightness != null ? (React.createElement(Typography, { variant: "caption", sx: {
                        fontWeight: 500,
                        color: 'text.secondary',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                    } },
                    React.createElement(LightMode, { sx: { fontSize: 12 } }),
                    this.formatBrightness(brightness))) : null),
            !motion && lastMotionAgo ? (React.createElement(Typography, { variant: "caption", sx: { fontSize: '0.65rem', color: 'text.disabled', lineHeight: 1.2 } }, lastMotionAgo)) : null));
    }
    renderTileAction() {
        const { motion, brightness, lastMotionAgo } = this.state;
        const accent = this.getAccentColor();
        return (React.createElement(Box, { sx: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' } },
            React.createElement(Box, { sx: { display: 'flex', alignItems: 'baseline', gap: 1.5 } },
                React.createElement(Typography, { variant: "h6", sx: theme => ({
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        color: motion ? accent || theme.palette.primary.main : theme.palette.text.secondary,
                    }) }, motion
                    ? this.props.settings?.textActive || I18n.t('wm_Motion')
                    : this.props.settings?.text || I18n.t('wm_Clear')),
                brightness != null ? (React.createElement(Typography, { variant: "body2", sx: {
                        color: 'text.secondary',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        whiteSpace: 'nowrap',
                    } },
                    React.createElement(LightMode, { sx: { fontSize: 14 } }),
                    this.formatBrightness(brightness))) : null),
            !motion && lastMotionAgo ? (React.createElement(Typography, { variant: "caption", sx: { color: 'text.disabled', whiteSpace: 'nowrap' } }, lastMotionAgo)) : null));
    }
}
export default WidgetMotion;
//# sourceMappingURL=Motion.js.map