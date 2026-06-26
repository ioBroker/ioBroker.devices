import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { Garage, KeyboardArrowDown, KeyboardArrowUp, Stop } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';
import WidgetGeneric, { isNeumorphicTheme } from './Generic';
export class WidgetGate extends WidgetGeneric {
    setId;
    actualId;
    stopId;
    constructor(props) {
        super(props);
        const states = props.widget.control.states;
        const find = (name) => states.find(s => s.name === name)?.id ?? null;
        this.setId = find('SET');
        this.actualId = find('ACTUAL');
        this.stopId = find('STOP');
        this.state = {
            ...this.state,
            position: 0,
            dragging: false,
        };
    }
    componentDidMount() {
        super.componentDidMount();
        const listenId = this.actualId || this.setId;
        if (listenId) {
            this.props.stateContext.getState(listenId, this.onPositionChange);
        }
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        const listenId = this.actualId || this.setId;
        if (listenId) {
            this.props.stateContext.removeState(listenId, this.onPositionChange);
        }
    }
    onPositionChange = (_id, state) => {
        if (this.state.dragging) {
            return;
        }
        const val = state.val;
        let position;
        if (typeof val === 'boolean') {
            position = val ? 100 : 0;
        }
        else {
            position = Math.max(0, Math.min(100, Math.round(Number(val) || 0)));
        }
        if (position !== this.state.position) {
            this.setState({ position });
        }
    };
    // ── Actions ──────────────────────────────────────────────────────
    toggle = () => {
        if (this.setId) {
            if (this.actualId) {
                // Has position: toggle between 0 and 100
                const target = this.state.position > 50 ? 0 : 100;
                void this.props.stateContext.getSocket().setState(this.setId, target);
            }
            else {
                // Boolean: toggle
                void this.props.stateContext.getSocket().setState(this.setId, !this.state.position);
            }
        }
    };
    open = () => {
        if (this.setId) {
            void this.props.stateContext.getSocket().setState(this.setId, this.actualId ? 100 : true);
        }
    };
    close = () => {
        if (this.setId) {
            void this.props.stateContext.getSocket().setState(this.setId, this.actualId ? 0 : false);
        }
    };
    stop = () => {
        if (this.stopId) {
            void this.props.stateContext.getSocket().setState(this.stopId, true);
        }
    };
    // ── Overrides ────────────────────────────────────────────────────
    getHistoryIds() {
        const id = this.actualId || this.setId;
        if (!id) {
            return [];
        }
        return [{ id, color: this.getAccentColor() || '#ff9800' }];
    }
    isTileActive() {
        return this.state.position > 0;
    }
    // eslint-disable-next-line class-methods-use-this
    hasTileAction() {
        return true;
    }
    onTileClick() {
        this.toggle();
    }
    renderTileIcon() {
        const baseIcon = this.renderBaseIcon();
        if (baseIcon) {
            return baseIcon;
        }
        const { position } = this.state;
        const isOpen = position > 0;
        const accent = this.getAccentColor();
        return (React.createElement(Garage, { sx: theme => ({
                color: isOpen ? accent || theme.palette.warning.main : theme.palette.text.disabled,
                transition: 'color 0.25s ease',
            }) }));
    }
    renderTileStatus() {
        const { position } = this.state;
        const accent = this.getAccentColor();
        const isOpen = position > 0;
        let text;
        if (this.actualId) {
            // Has position feedback
            if (position === 0) {
                text = I18n.t('wm_Closed');
            }
            else if (position >= 100) {
                text = I18n.t('wm_Open');
            }
            else {
                text = `${position}%`;
            }
        }
        else {
            text = isOpen ? I18n.t('wm_Open') : I18n.t('wm_Closed');
        }
        return (React.createElement(Typography, { variant: "caption", noWrap: true, sx: theme => ({
                fontWeight: 500,
                maxWidth: '100%',
                color: isOpen ? accent || theme.palette.warning.main : theme.palette.text.secondary,
                transition: 'color 0.25s ease',
            }) }, text));
    }
    renderTileAction() {
        const accent = this.getAccentColor();
        const btnSx = (theme) => ({
            color: this.isTileActive() ? accent || theme.palette.warning.main : theme.palette.text.secondary,
            p: 0.5,
        });
        return (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.25 } },
            React.createElement(IconButton, { size: "small", onClick: e => {
                    e.stopPropagation();
                    this.open();
                }, sx: btnSx },
                React.createElement(KeyboardArrowUp, { fontSize: "small" })),
            this.stopId ? (React.createElement(IconButton, { size: "small", onClick: e => {
                    e.stopPropagation();
                    this.stop();
                }, sx: btnSx },
                React.createElement(Stop, { fontSize: "small" }))) : null,
            React.createElement(IconButton, { size: "small", onClick: e => {
                    e.stopPropagation();
                    this.close();
                }, sx: btnSx },
                React.createElement(KeyboardArrowDown, { fontSize: "small" }))));
    }
    // ── Compact 1x1 ──────────────────────────────────────────────────
    renderCompact() {
        const { name, position } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        return (React.createElement(Box, { id: String(this.props.widget.id), className: this.getWidgetClass(), sx: theme => WidgetGeneric.getStyleCompact(theme) },
            React.createElement(Box, { onClick: () => this.toggle(), sx: theme => ({
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'stretch',
                    width: '100%',
                    aspectRatio: '1',
                    textAlign: 'left',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    userSelect: 'none',
                    position: 'relative',
                    ...this.applyTileStyles(theme, isActive),
                }) },
                indicators,
                React.createElement(Box, { sx: {
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                    } }, WidgetGate.renderGateSvg(position, accent)),
                React.createElement(Box, { sx: {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.5,
                    } },
                    React.createElement(IconButton, { size: "small", onClick: e => {
                            e.stopPropagation();
                            this.open();
                        }, sx: theme => ({ color: theme.palette.text.primary, p: 0.25 }) },
                        React.createElement(KeyboardArrowUp, { sx: { fontSize: 'max(1rem, 10cqi)' } })),
                    this.stopId ? (React.createElement(IconButton, { size: "small", onClick: e => {
                            e.stopPropagation();
                            this.stop();
                        }, sx: theme => ({ color: theme.palette.text.primary, p: 0.25 }) },
                        React.createElement(Stop, { sx: { fontSize: 'max(1rem, 10cqi)' } }))) : null,
                    React.createElement(IconButton, { size: "small", onClick: e => {
                            e.stopPropagation();
                            this.close();
                        }, sx: theme => ({ color: theme.palette.text.primary, p: 0.25 }) },
                        React.createElement(KeyboardArrowDown, { sx: { fontSize: 'max(1rem, 10cqi)' } }))),
                React.createElement(Box, null,
                    React.createElement(Typography, { ref: this.nameRef, variant: "body2", noWrap: true, sx: theme => ({
                            fontWeight: 600,
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            fontSize: 'max(0.875rem, 9cqi)',
                            ...(isNeumorphicTheme(theme)
                                ? {
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    fontSize: 'max(0.7rem, 7cqi)',
                                }
                                : {}),
                        }) }, this.props.settings?.name || name || '...'),
                    this.renderTileStatus()),
                this.renderChart())));
    }
    // ── Gate SVG visualization ────────────────────────────────────────
    static renderGateSvg(position, accent) {
        const vw = 60;
        const vh = 50;
        const doorH = vh * 0.8;
        const openH = (position / 100) * doorH;
        const closedH = doorH - openH;
        const slats = 5;
        return (React.createElement("svg", { viewBox: `0 0 ${vw} ${vh}`, style: { width: '60%', maxWidth: 80, height: 'auto' } },
            React.createElement("rect", { x: 2, y: 2, width: vw - 4, height: vh - 4, rx: 2, fill: "none", stroke: "currentColor", strokeWidth: 2, opacity: 0.2 }),
            React.createElement("rect", { x: 4, y: 4, width: vw - 8, height: openH, fill: accent || '#ff9800', opacity: 0.15 }),
            Array.from({ length: slats }, (_, i) => {
                const slatH = closedH / slats;
                const y = 4 + openH + i * slatH;
                return (React.createElement("rect", { key: i, x: 5, y: y + 1, width: vw - 10, height: slatH - 2, rx: 1, fill: "currentColor", opacity: 0.35 + i * 0.05 }));
            })));
    }
}
export default WidgetGate;
//# sourceMappingURL=Gate.js.map