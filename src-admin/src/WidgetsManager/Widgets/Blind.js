import React from 'react';
import { Box, IconButton, Slider, Tooltip, Typography } from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp, Stop, SwapVert } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';
import WidgetGeneric, { isNeumorphicTheme, } from './Generic';
import { ICON_BLINDS, ICON_CURTAINS } from './configIcons';
// Shared window dimensions
const VW = 60;
const VH = 76;
const FRAME = 2.5;
const INNER_X = FRAME;
const INNER_Y = FRAME;
const INNER_W = VW - FRAME * 2;
const INNER_H = VH - FRAME * 2;
function WindowBase(props) {
    return (React.createElement(React.Fragment, null,
        React.createElement("rect", { x: INNER_X, y: INNER_Y, width: INNER_W, height: INNER_H, rx: 1, fill: props.accent || '#90caf9', opacity: 0.2 }),
        React.createElement("line", { x1: VW / 2, y1: INNER_Y, x2: VW / 2, y2: INNER_Y + INNER_H, stroke: "currentColor", strokeWidth: 1.2, opacity: 0.25 }),
        React.createElement("line", { x1: INNER_X, y1: INNER_Y + INNER_H / 2, x2: INNER_X + INNER_W, y2: INNER_Y + INNER_H / 2, stroke: "currentColor", strokeWidth: 1.2, opacity: 0.25 }),
        props.children,
        React.createElement("rect", { x: FRAME / 2, y: FRAME / 2, width: VW - FRAME, height: VH - FRAME, rx: 2.5, fill: "none", stroke: "currentColor", strokeWidth: FRAME, opacity: 0.5 })));
}
/** SVG window with roller shutter. position: 0 = closed, 100 = fully open */
function ShutterSvg(props) {
    const { position, accent, dragging } = props;
    // Shutter covers (100 - position)% from the top
    const shutterH = ((100 - position) / 100) * INNER_H;
    // Slat lines every 4 units
    const slats = [];
    for (let y = INNER_Y + 4; y < INNER_Y + shutterH - 1; y += 4) {
        slats.push(React.createElement("line", { key: y, x1: INNER_X + 0.5, y1: y, x2: INNER_X + INNER_W - 0.5, y2: y, stroke: "currentColor", strokeWidth: 0.4, opacity: 0.3 }));
    }
    const transition = dragging ? 'none' : 'all 0.2s ease';
    return (React.createElement("svg", { viewBox: `0 0 ${VW} ${VH}`, className: "blind-svg", style: { display: 'block' } },
        React.createElement(WindowBase, { accent: accent },
            shutterH > 0 ? (React.createElement("rect", { x: INNER_X, y: INNER_Y, width: INNER_W, height: shutterH, rx: 1, fill: "currentColor", opacity: 0.35, style: { transition } })) : null,
            React.createElement("g", { style: { transition } }, slats),
            shutterH > 2 ? (React.createElement("rect", { x: INNER_X + 1, y: INNER_Y + shutterH - 2.5, width: INNER_W - 2, height: 2.5, rx: 1, fill: "currentColor", opacity: 0.55, style: { transition } })) : null,
            React.createElement("rect", { x: INNER_X - 0.5, y: INNER_Y - 1, width: INNER_W + 1, height: 3.5, rx: 1.5, fill: "currentColor", opacity: 0.4 }))));
}
/** SVG window with curtains. position: 0 = closed, 100 = fully open */
function CurtainSvg(props) {
    const { position, accent, dragging } = props;
    const transition = dragging ? 'none' : 'all 0.2s ease';
    // Each curtain panel width: at 0% each covers half, at 100% gathered to ~3 units
    const minW = 3;
    const curtainW = minW + ((100 - position) / 100) * (INNER_W / 2 - minW);
    // Curtain rod
    const rodY = INNER_Y + 1;
    // Fold lines for fabric texture
    const leftFolds = [];
    const rightFolds = [];
    const foldStep = 3.5;
    for (let x = INNER_X + foldStep; x < INNER_X + curtainW - 1; x += foldStep) {
        leftFolds.push(React.createElement("line", { key: `l${x}`, x1: x, y1: rodY + 2, x2: x, y2: INNER_Y + INNER_H, stroke: "currentColor", strokeWidth: 0.4, opacity: 0.2 }));
    }
    const rightX = INNER_X + INNER_W - curtainW;
    for (let x = rightX + foldStep; x < INNER_X + INNER_W - 1; x += foldStep) {
        rightFolds.push(React.createElement("line", { key: `r${x}`, x1: x, y1: rodY + 2, x2: x, y2: INNER_Y + INNER_H, stroke: "currentColor", strokeWidth: 0.4, opacity: 0.2 }));
    }
    return (React.createElement("svg", { viewBox: `0 0 ${VW} ${VH}`, className: "blind-svg", style: { display: 'block' } },
        React.createElement(WindowBase, { accent: accent },
            React.createElement("rect", { x: INNER_X, y: rodY + 1.5, width: curtainW, height: INNER_H - rodY - 1.5 + INNER_Y, fill: "currentColor", opacity: 0.3, style: { transition } }),
            React.createElement("g", { style: { transition } }, leftFolds),
            React.createElement("rect", { x: rightX, y: rodY + 1.5, width: curtainW, height: INNER_H - rodY - 1.5 + INNER_Y, fill: "currentColor", opacity: 0.3, style: { transition } }),
            React.createElement("g", { style: { transition } }, rightFolds),
            React.createElement("line", { x1: INNER_X - 1, y1: rodY, x2: INNER_X + INNER_W + 1, y2: rodY, stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", opacity: 0.5 }),
            React.createElement("circle", { cx: INNER_X - 1, cy: rodY, r: 1.5, fill: "currentColor", opacity: 0.5 }),
            React.createElement("circle", { cx: INNER_X + INNER_W + 1, cy: rodY, r: 1.5, fill: "currentColor", opacity: 0.5 }))));
}
/** Render appropriate blind SVG based on type */
function BlindSvg(props) {
    const { blindType, ...rest } = props;
    if (blindType === 'curtain') {
        return React.createElement(CurtainSvg, { ...rest });
    }
    return React.createElement(ShutterSvg, { ...rest });
}
export class WidgetBlind extends WidgetGeneric {
    setId;
    actualId;
    stopId;
    openId;
    closeId;
    tiltSetId;
    tiltActualId;
    tileRef = React.createRef();
    dragStartPos = null;
    dragStartPosition = 0;
    isDragging = false;
    constructor(props) {
        super(props);
        const states = props.widget.control.states;
        const set = states.find(s => s.name === 'SET');
        const actual = states.find(s => s.name === 'ACTUAL');
        const stop = states.find(s => s.name === 'STOP');
        const open = states.find(s => s.name === 'OPEN');
        const close = states.find(s => s.name === 'CLOSE');
        const tiltSet = states.find(s => s.name === 'TILT_SET');
        const tiltActual = states.find(s => s.name === 'TILT_ACTUAL');
        this.setId = set?.id ?? null;
        this.actualId = actual?.id ?? set?.id ?? null;
        this.stopId = stop?.id ?? null;
        this.openId = open?.id ?? null;
        this.closeId = close?.id ?? null;
        this.tiltSetId = tiltSet?.id ?? null;
        this.tiltActualId = tiltActual?.id ?? tiltSet?.id ?? null;
        this.state = {
            ...this.state,
            position: 0,
            dragging: false,
            min: 0,
            max: 100,
            tiltPosition: null,
        };
    }
    static getDefaultSettings() {
        return {
            ...WidgetGeneric.getDefaultSettings(),
            blindType: 'shutter',
        };
    }
    static getConfigSchema() {
        return {
            name: 'Image settings', // ignored
            schema: {
                type: 'panel',
                items: {
                    blindType: {
                        type: 'select',
                        label: 'wm_BlindType',
                        options: [
                            { value: 'shutter', label: 'wm_Shutter', icon: ICON_BLINDS },
                            { value: 'curtain', label: 'wm_Curtain', icon: ICON_CURTAINS },
                        ],
                        default: 'shutter',
                        format: 'radio',
                    },
                },
            },
        };
    }
    componentDidMount() {
        super.componentDidMount();
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onPositionChange);
        }
        if (this.tiltActualId) {
            this.props.stateContext.getState(this.tiltActualId, this.onTiltChange);
        }
        void this.loadBlindObject();
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onPositionChange);
        }
        if (this.tiltActualId) {
            this.props.stateContext.removeState(this.tiltActualId, this.onTiltChange);
        }
    }
    async loadBlindObject() {
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
                    this.setState({ min: min, max: max });
                }
            }
        }
        catch {
            // ignore
        }
    }
    rawToPercent(raw) {
        const { min, max } = this.state;
        const range = max - min;
        if (range <= 0) {
            return 0;
        }
        return Math.round(((raw - min) / range) * 100);
    }
    percentToRaw(percent) {
        const { min, max } = this.state;
        return min + (percent / 100) * (max - min);
    }
    onPositionChange = (_id, state) => {
        if (this.isDragging) {
            return;
        }
        const raw = Number(state.val) || 0;
        const position = this.rawToPercent(raw);
        if (position !== this.state.position) {
            this.setState({ position });
        }
    };
    setPosition = (_e, value) => {
        const percent = value;
        if (this.setId) {
            void this.props.stateContext.getSocket().setState(this.setId, this.percentToRaw(percent));
        }
    };
    onTiltChange = (_id, state) => {
        const val = state.val != null ? Number(state.val) : null;
        const tiltPosition = val != null && !isNaN(val) ? Math.round(val) : null;
        if (tiltPosition !== this.state.tiltPosition) {
            this.setState({ tiltPosition });
        }
    };
    stop = (e) => {
        if (e) {
            e.stopPropagation();
        }
        if (this.stopId) {
            void this.props.stateContext.getSocket().setState(this.stopId, true);
        }
    };
    open = (e) => {
        e.stopPropagation();
        if (this.openId) {
            void this.props.stateContext.getSocket().setState(this.openId, true);
        }
        else if (this.setId) {
            void this.props.stateContext.getSocket().setState(this.setId, this.state.max);
        }
    };
    close = (e) => {
        e.stopPropagation();
        if (this.closeId) {
            void this.props.stateContext.getSocket().setState(this.closeId, true);
        }
        else if (this.setId) {
            void this.props.stateContext.getSocket().setState(this.setId, this.state.min);
        }
    };
    onTiltSliderChange = (_e, value) => {
        if (this.tiltSetId) {
            void this.props.stateContext.getSocket().setState(this.tiltSetId, value);
        }
        this.setState({ tiltPosition: value });
    };
    // --- Vertical drag interaction ---
    onPointerDown = (e) => {
        e.preventDefault();
        e.target.setPointerCapture(e.pointerId);
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this.dragStartPosition = this.state.position;
        this.isDragging = false;
    };
    onPointerMove = (e) => {
        if (!this.dragStartPos) {
            return;
        }
        const isCurtain = this.props.settings?.blindType === 'curtain';
        const d = isCurtain ? e.clientX - this.dragStartPos.x : e.clientY - this.dragStartPos.y;
        const dist = Math.abs(d);
        if (!this.isDragging && dist > 8) {
            this.isDragging = true;
            this.setState({ dragging: true });
        }
        if (this.isDragging) {
            const el = this.tileRef.current;
            const rect = el?.getBoundingClientRect();
            const span = isCurtain ? rect?.width || 150 : rect?.height || 150;
            // Curtain: drag right = open; Shutter: drag up = open
            const delta = ((isCurtain ? d : -d) / span) * 100;
            const percent = Math.max(0, Math.min(100, Math.round(this.dragStartPosition + delta)));
            this.setState({ position: percent });
        }
    };
    onPointerUp = (e) => {
        if (!this.dragStartPos) {
            return;
        }
        if (this.isDragging) {
            const isCurtain = this.props.settings?.blindType === 'curtain';
            const el = this.tileRef.current;
            const rect = el?.getBoundingClientRect();
            const span = isCurtain ? rect?.width || 150 : rect?.height || 150;
            const d = isCurtain ? e.clientX - this.dragStartPos.x : e.clientY - this.dragStartPos.y;
            const delta = ((isCurtain ? d : -d) / span) * 100;
            const percent = Math.max(0, Math.min(100, Math.round(this.dragStartPosition + delta)));
            if (this.setId) {
                void this.props.stateContext.getSocket().setState(this.setId, this.percentToRaw(percent));
            }
        }
        else {
            // Tap — toggle between fully open and closed
            if (this.setId) {
                const target = this.state.position > 50 ? this.state.min : this.state.max;
                void this.props.stateContext.getSocket().setState(this.setId, target);
            }
        }
        this.dragStartPos = null;
        this.isDragging = false;
        this.setState({ dragging: false });
    };
    // --- Overrides ---
    getHistoryIds() {
        const ids = [];
        if (this.actualId) {
            ids.push({ id: this.actualId, color: '#78909c' });
        }
        return ids;
    }
    isTileActive() {
        return this.state.position > 0;
    }
    renderTileIcon() {
        const baseIcon = super.renderTileIcon();
        if (baseIcon) {
            return baseIcon;
        }
        const { position, dragging } = this.state;
        const accent = this.getAccentColor();
        const blindType = this.props.settings?.blindType || 'shutter';
        return (React.createElement(Box, { sx: { '& .blind-svg': { height: 40 } } },
            React.createElement(BlindSvg, { position: position, accent: accent, dragging: dragging, blindType: blindType })));
    }
    renderTileStatus() {
        const { position, tiltPosition } = this.state;
        const isActive = position > 0;
        const accent = this.getAccentColor();
        const posText = position === 100 ? I18n.t('wm_Open') : position === 0 ? I18n.t('wm_Closed') : `${position}%`;
        const tiltText = tiltPosition != null && this.tiltSetId ? ` ↕${tiltPosition}%` : '';
        return (React.createElement(Typography, { variant: "caption", sx: theme => ({
                fontWeight: 500,
                color: isActive ? accent || theme.palette.primary.main : theme.palette.text.secondary,
                transition: 'color 0.25s ease',
            }) },
            posText,
            tiltText));
    }
    renderTileAction() {
        const { position, tiltPosition } = this.state;
        const accent = this.getAccentColor();
        const hasButtons = this.openId || this.closeId || this.stopId;
        return (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
            React.createElement(Slider, { value: position, min: 0, max: 100, size: "small", onClick: e => e.stopPropagation(), onChange: this.setPosition, sx: theme => ({
                    width: 70,
                    color: accent || theme.palette.primary.main,
                    '& .MuiSlider-thumb': { width: 14, height: 14 },
                }) }),
            this.tiltSetId && tiltPosition != null ? (React.createElement(Tooltip, { title: I18n.t('wm_Tilted') },
                React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.25 } },
                    React.createElement(SwapVert, { sx: { fontSize: 14, color: 'text.secondary' } }),
                    React.createElement(Slider, { value: tiltPosition, min: 0, max: 100, size: "small", onClick: e => e.stopPropagation(), onChangeCommitted: this.onTiltSliderChange, sx: theme => ({
                            width: 40,
                            color: accent || theme.palette.text.secondary,
                            '& .MuiSlider-thumb': { width: 10, height: 10 },
                        }) })))) : null,
            hasButtons ? (React.createElement(Box, { sx: { display: 'flex', gap: 0 } },
                this.openId ? (React.createElement(IconButton, { size: "small", onClick: this.open, sx: { color: 'text.secondary', p: 0.25 } },
                    React.createElement(KeyboardArrowUp, { fontSize: "small" }))) : null,
                this.stopId ? (React.createElement(IconButton, { size: "small", onClick: this.stop, sx: { color: 'text.secondary', p: 0.25 } },
                    React.createElement(Stop, { fontSize: "small" }))) : null,
                this.closeId ? (React.createElement(IconButton, { size: "small", onClick: this.close, sx: { color: 'text.secondary', p: 0.25 } },
                    React.createElement(KeyboardArrowDown, { fontSize: "small" }))) : null)) : null));
    }
    renderCompact() {
        const { name, position, dragging } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        return (React.createElement(Box, { id: String(this.props.widget.id), className: this.getWidgetClass(), sx: theme => WidgetGeneric.getStyleCompact(theme) },
            React.createElement(Box, { ref: this.tileRef, onPointerDown: this.onPointerDown, onPointerMove: this.onPointerMove, onPointerUp: this.onPointerUp, onPointerCancel: this.onPointerUp, sx: theme => ({
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'stretch',
                    width: '100%',
                    aspectRatio: '1',
                    textAlign: 'left',
                    overflow: 'hidden',
                    cursor: this.props.settings?.blindType === 'curtain' ? 'ew-resize' : 'ns-resize',
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
                        flex: 1,
                        minHeight: 0,
                        '& .blind-svg': { height: '85%' },
                    } },
                    React.createElement(BlindSvg, { position: position, accent: accent, dragging: dragging, blindType: this.props.settings?.blindType || 'shutter' })),
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
                    this.renderTileStatus()))));
    }
}
export default WidgetBlind;
//# sourceMappingURL=Blind.js.map