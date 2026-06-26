import React from 'react';
import { Box, Typography } from '@mui/material';
import { SensorWindow, SensorWindowOutlined } from '@mui/icons-material';
import { I18n, Icon } from '@iobroker/adapter-react-v5';
import WidgetGeneric, {} from './Generic';
export class WidgetWindow extends WidgetGeneric {
    actualId;
    agoTimer = null;
    constructor(props) {
        super(props);
        const states = props.widget.control.states;
        const actual = states.find(s => s.name === 'ACTUAL');
        this.actualId = actual?.id ?? null;
        this.state = {
            ...this.state,
            isOpen: false,
            openState: 0,
            lastChanged: null,
            lastChangedAgo: '',
        };
    }
    componentDidMount() {
        super.componentDidMount();
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onWindowChange);
        }
        this.agoTimer = setInterval(() => this.updateAgo(), 60_000);
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onWindowChange);
        }
        if (this.agoTimer) {
            clearInterval(this.agoTimer);
            this.agoTimer = null;
        }
    }
    updateAgo() {
        const { lastChanged } = this.state;
        if (lastChanged) {
            const ago = this.fromNow(lastChanged);
            if (ago !== this.state.lastChangedAgo) {
                this.setState({ lastChangedAgo: ago });
            }
        }
    }
    onWindowChange = (_id, state) => {
        let openState;
        if (typeof state.val === 'number') {
            openState = state.val === 2 ? 2 : state.val ? 1 : 0;
        }
        else {
            openState = state.val ? 1 : 0;
        }
        const isOpen = openState !== 0;
        const lc = state.lc || state.ts || Date.now();
        if (openState !== this.state.openState || isOpen !== this.state.isOpen) {
            this.setState({ isOpen, openState, lastChanged: lc, lastChangedAgo: this.fromNow(lc) });
        }
        else if (!this.state.lastChanged && lc) {
            this.setState({ lastChanged: lc, lastChangedAgo: this.fromNow(lc) });
        }
    };
    isTileActive() {
        return this.state.isOpen;
    }
    getWindowStatusText() {
        if (this.state.openState === 2) {
            return I18n.t('wm_Tilted');
        }
        return this.state.isOpen
            ? this.props.settings?.textActive || I18n.t('wm_Open')
            : this.props.settings?.text || I18n.t('wm_Closed');
    }
    renderTileIcon() {
        const { isOpen, openState } = this.state;
        const accent = this.getAccentColor();
        // Active: iconActive, fallback to icon (with active color); Inactive: icon only
        const customIcon = isOpen
            ? this.props.settings?.iconActive || this.props.settings?.icon
            : this.props.settings?.icon;
        if (customIcon) {
            return (React.createElement(Icon, { src: customIcon, style: {
                    width: '1em',
                    height: '1em',
                    color: isOpen ? accent || '#0288d1' : 'grey',
                    transition: 'color 0.25s ease',
                } }));
        }
        // Tilted: rotated filled icon
        if (openState === 2) {
            return (React.createElement(SensorWindow, { sx: theme => ({
                    color: accent || theme.palette.info.main,
                    transform: 'rotate(15deg)',
                    transition: 'color 0.25s ease, transform 0.25s ease',
                }) }));
        }
        // Open: outlined icon
        if (isOpen) {
            return (React.createElement(SensorWindowOutlined, { sx: theme => ({
                    color: accent || theme.palette.warning.main,
                    transition: 'color 0.25s ease',
                }) }));
        }
        // Closed: filled icon
        return (React.createElement(SensorWindow, { sx: theme => ({
                color: theme.palette.text.disabled,
                transition: 'color 0.25s ease',
            }) }));
    }
    renderTileStatus() {
        const size = this.props.settings?.size || '1x1';
        if (size === '2x0.5') {
            return null;
        }
        const { isOpen, openState, lastChangedAgo } = this.state;
        const accent = this.getAccentColor();
        return (React.createElement(Box, { sx: { display: 'flex', flexDirection: 'column' } },
            React.createElement(Typography, { variant: "caption", sx: theme => ({
                    fontWeight: 600,
                    color: openState === 2
                        ? accent || theme.palette.info.main
                        : isOpen
                            ? accent || theme.palette.warning.main
                            : theme.palette.text.secondary,
                    transition: 'color 0.25s ease',
                }) }, this.getWindowStatusText()),
            size !== '2x1' && lastChangedAgo ? (React.createElement(Typography, { variant: "caption", sx: { fontSize: '0.65rem', color: 'text.disabled', lineHeight: 1.2 } }, lastChangedAgo)) : null));
    }
    renderTileAction() {
        const { isOpen, openState, lastChangedAgo } = this.state;
        const accent = this.getAccentColor();
        return (React.createElement(Box, { sx: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' } },
            React.createElement(Typography, { variant: "h6", sx: theme => ({
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    color: openState === 2
                        ? accent || theme.palette.info.main
                        : isOpen
                            ? accent || theme.palette.warning.main
                            : theme.palette.text.secondary,
                }) }, this.getWindowStatusText()),
            lastChangedAgo ? (React.createElement(Typography, { variant: "caption", sx: { color: 'text.disabled', whiteSpace: 'nowrap' } }, lastChangedAgo)) : null));
    }
}
export default WidgetWindow;
//# sourceMappingURL=Window.js.map