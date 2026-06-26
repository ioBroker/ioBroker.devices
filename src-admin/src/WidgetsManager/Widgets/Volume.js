import React from 'react';
import { Box, Slider, Typography } from '@mui/material';
import { VolumeUp, VolumeDown, VolumeMute, VolumeOff } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';
import WidgetGeneric, { isNeumorphicTheme, } from './Generic';
export class WidgetVolume extends WidgetGeneric {
    setId;
    actualId;
    muteSetId;
    lastNonZeroVolume = 50;
    arcRef = React.createRef();
    dragStartPos = null;
    isDragging = false;
    constructor(props) {
        super(props);
        const states = props.widget.control.states;
        const set = states.find(s => s.name === 'SET');
        const actual = states.find(s => s.name === 'ACTUAL');
        const mute = states.find(s => s.name === 'MUTE');
        this.setId = set?.id ?? null;
        this.actualId = actual?.id ?? set?.id ?? null;
        this.muteSetId = mute?.id ?? null;
        this.state = {
            ...this.state,
            volume: 0,
            dragging: false,
        };
    }
    static getConfigSchema() {
        return {
            name: 'Volume',
            schema: {
                type: 'panel',
                items: {
                    wideSliderStyle: {
                        type: 'select',
                        label: 'wm_Wide slider style',
                        options: [
                            { value: 'horizontal', label: 'wm_slider_horizontal' },
                            { value: 'round', label: 'wm_slider_round' },
                        ],
                        default: 'horizontal',
                        format: 'radio',
                        hidden: "data.size === '1x1'",
                    },
                },
            },
        };
    }
    componentDidMount() {
        super.componentDidMount();
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onVolumeChange);
        }
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onVolumeChange);
        }
    }
    onVolumeChange = (_id, state) => {
        if (this.isDragging) {
            return;
        }
        const volume = Math.round(Number(state.val) || 0);
        if (volume !== this.state.volume) {
            if (volume > 0) {
                this.lastNonZeroVolume = volume;
            }
            this.setState({ volume });
        }
    };
    toggleMute = () => {
        const newVol = this.state.volume > 0 ? 0 : this.lastNonZeroVolume;
        if (this.setId) {
            void this.props.stateContext.getSocket().setState(this.setId, newVol);
        }
        if (newVol > 0) {
            this.lastNonZeroVolume = newVol;
        }
        this.setState({ volume: newVol });
    };
    // --- Arc knob pointer interaction ---
    /** Map a screen pointer position to 0..100 along the 270° arc */
    pointerToPercent(clientX, clientY) {
        const el = this.arcRef.current;
        if (!el) {
            return this.state.volume;
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
        // Shift so arc start (135° visual = bottom-left) maps to 0
        let normalized = angle - 135;
        if (normalized < 0) {
            normalized += 360;
        }
        // Arc spans 270°; anything beyond is the 90° dead zone at the bottom
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
        }
        if (this.isDragging) {
            const percent = this.pointerToPercent(e.clientX, e.clientY);
            this.setState({ volume: percent });
        }
    };
    onArcPointerUp = (e) => {
        if (!this.dragStartPos) {
            return;
        }
        if (this.isDragging) {
            const percent = this.pointerToPercent(e.clientX, e.clientY);
            if (this.setId) {
                void this.props.stateContext.getSocket().setState(this.setId, percent);
            }
            if (percent > 0) {
                this.lastNonZeroVolume = percent;
            }
        }
        else {
            // Tap — toggle mute
            this.toggleMute();
        }
        this.dragStartPos = null;
        this.isDragging = false;
        this.setState({ dragging: false });
    };
    // --- Slider handlers for wide modes ---
    onSliderDrag = (_e, value) => {
        this.setState({ volume: value, dragging: true });
    };
    onSliderCommit = (_e, value) => {
        const volume = value;
        if (this.setId) {
            void this.props.stateContext.getSocket().setState(this.setId, volume);
        }
        if (volume > 0) {
            this.lastNonZeroVolume = volume;
        }
        this.setState({ volume, dragging: false });
    };
    // --- Overrides ---
    isTileActive() {
        return this.state.volume > 0;
    }
    // eslint-disable-next-line class-methods-use-this
    hasTileAction() {
        return true;
    }
    onTileClick() {
        this.toggleMute();
    }
    renderTileIcon() {
        const baseIcon = this.renderBaseIcon();
        if (baseIcon) {
            return baseIcon;
        }
        const { volume } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const iconSx = (theme) => ({
            color: isActive ? accent || theme.palette.primary.main : theme.palette.text.disabled,
            transition: 'color 0.25s ease',
        });
        if (volume === 0) {
            return React.createElement(VolumeOff, { sx: iconSx });
        }
        if (volume < 33) {
            return React.createElement(VolumeMute, { sx: iconSx });
        }
        if (volume < 67) {
            return React.createElement(VolumeDown, { sx: iconSx });
        }
        return React.createElement(VolumeUp, { sx: iconSx });
    }
    renderTileStatus() {
        const { volume } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        return (React.createElement(Typography, { variant: "caption", sx: theme => ({
                fontWeight: 500,
                color: isActive ? accent || theme.palette.primary.main : theme.palette.text.secondary,
                transition: 'color 0.25s ease',
            }) }, isActive ? `${volume}%` : I18n.t('wm_Off')));
    }
    renderArcKnob() {
        const { volume, dragging } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const vb = 100;
        const sw = 10;
        const r = (vb - sw) / 2;
        const circumference = 2 * Math.PI * r;
        const arcLength = circumference * 0.75;
        const progress = (volume / 100) * arcLength;
        return (React.createElement(Box, { ref: this.arcRef, onPointerDown: this.onArcPointerDown, onPointerMove: this.onArcPointerMove, onPointerUp: this.onArcPointerUp, onPointerCancel: this.onArcPointerUp, onClick: e => e.stopPropagation(), sx: {
                width: 48,
                height: 48,
                flexShrink: 0,
                touchAction: 'none',
                userSelect: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
            } },
            React.createElement("svg", { viewBox: `0 0 ${vb} ${vb}`, style: { width: '100%', height: '100%', transform: 'rotate(135deg)' } },
                React.createElement("circle", { cx: vb / 2, cy: vb / 2, r: r, fill: "none", stroke: "currentColor", strokeWidth: sw, strokeDasharray: `${arcLength} ${circumference}`, strokeLinecap: "round", opacity: 0.15 }),
                React.createElement("circle", { cx: vb / 2, cy: vb / 2, r: r, fill: "none", stroke: isActive ? accent || 'var(--mui-palette-primary-main, #1976d2)' : 'transparent', strokeWidth: sw, strokeDasharray: `${progress} ${circumference}`, strokeLinecap: "round", style: dragging ? undefined : { transition: 'stroke-dasharray 0.3s ease' } })),
            React.createElement(Typography, { sx: {
                    position: 'absolute',
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    lineHeight: 1,
                    color: isActive ? accent || 'primary.main' : 'text.secondary',
                } },
                volume,
                "%")));
    }
    renderTileAction() {
        const { volume } = this.state;
        const accent = this.getAccentColor();
        if ((this.props.settings?.wideSliderStyle || 'horizontal') === 'round') {
            return this.renderArcKnob();
        }
        return (React.createElement(Slider, { value: volume, min: 0, max: 100, size: "small", onClick: e => e.stopPropagation(), onChange: this.onSliderDrag, onChangeCommitted: this.onSliderCommit, sx: theme => ({
                width: 80,
                color: accent || theme.palette.primary.main,
                '& .MuiSlider-thumb': { width: 14, height: 14 },
            }) }));
    }
    // 1x1 — arc knob
    renderCompact() {
        const { name, volume, dragging } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        const vb = 100;
        const sw = 8;
        const r = (vb - sw) / 2;
        const circumference = 2 * Math.PI * r;
        const arcLength = circumference * 0.75; // 270°
        const progress = (volume / 100) * arcLength;
        return (React.createElement(Box, { id: String(this.props.widget.id), className: this.getWidgetClass(), sx: theme => WidgetGeneric.getStyleCompact(theme) },
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
                    ...(isNeumorphicTheme(theme) ? { padding: 'max(12px, 8cqi)' } : {}),
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
                        React.createElement("circle", { cx: vb / 2, cy: vb / 2, r: r, fill: "none", stroke: isActive ? accent || 'var(--mui-palette-primary-main, #1976d2)' : 'transparent', strokeWidth: sw, strokeDasharray: `${progress} ${circumference}`, strokeLinecap: "round", style: dragging ? undefined : { transition: 'stroke-dasharray 0.3s ease' } })),
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
    }
}
export default WidgetVolume;
//# sourceMappingURL=Volume.js.map