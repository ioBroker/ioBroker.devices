import React from 'react';
import { Box, Typography } from '@mui/material';
import { Water } from '@mui/icons-material';
import { I18n, Icon } from '@iobroker/adapter-react-v5';
import WidgetGeneric, {} from './Generic';
const FLOOD_COLOR = '#00838f';
export class WidgetFloodAlarm extends WidgetGeneric {
    actualId;
    agoTimer = null;
    constructor(props) {
        super(props);
        const states = props.widget.control.states;
        const actual = states.find(s => s.name === 'ACTUAL');
        this.actualId = actual?.id ?? null;
        this.state = {
            ...this.state,
            alarm: false,
            lastChanged: null,
            lastChangedAgo: '',
        };
    }
    static getConfigSchema() {
        return {
            name: 'Image settings', // ignored
            schema: {
                type: 'panel',
                items: {
                    hideWhenOk: {
                        type: 'checkbox',
                        label: 'wm_Hide when OK',
                        default: false,
                    },
                },
            },
        };
    }
    componentDidMount() {
        super.componentDidMount();
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onStateChange);
        }
        this.agoTimer = setInterval(() => this.updateAgo(), 60_000);
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onStateChange);
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
    onStateChange = (_id, state) => {
        const alarm = !!state.val;
        const lc = state.lc || state.ts || Date.now();
        if (alarm !== this.state.alarm) {
            this.setState({ alarm, lastChanged: lc, lastChangedAgo: this.fromNow(lc) });
        }
        else if (!this.state.lastChanged && lc) {
            this.setState({ lastChanged: lc, lastChangedAgo: this.fromNow(lc) });
        }
    };
    getAccentColor() {
        if (this.state.alarm) {
            return super.getAccentColor() || FLOOD_COLOR;
        }
        return super.getAccentColor();
    }
    isTileActive() {
        return this.state.alarm;
    }
    renderTileIcon() {
        const { alarm } = this.state;
        const accent = this.getAccentColor();
        // Active: iconActive, fallback to icon (with active color); Inactive: icon only
        const customIcon = alarm
            ? this.props.settings?.iconActive || this.props.settings?.icon
            : this.props.settings?.icon;
        if (customIcon) {
            return (React.createElement(Icon, { src: customIcon, style: {
                    width: '1em',
                    height: '1em',
                    color: alarm ? accent || FLOOD_COLOR : 'grey',
                    transition: 'color 0.25s ease',
                } }));
        }
        return (React.createElement(Water, { sx: {
                color: alarm ? accent || FLOOD_COLOR : 'text.disabled',
                transition: 'color 0.25s ease',
            } }));
    }
    renderTileStatus() {
        const size = this.props.settings?.size || '1x1';
        if (size === '2x0.5') {
            return null;
        }
        const { alarm, lastChangedAgo } = this.state;
        const accent = this.getAccentColor();
        return (React.createElement(Box, { sx: { display: 'flex', flexDirection: 'column' } },
            React.createElement(Typography, { variant: "caption", sx: {
                    fontWeight: 600,
                    color: alarm ? accent || FLOOD_COLOR : 'success.main',
                    transition: 'color 0.25s ease',
                } }, alarm
                ? this.props.settings?.textActive || I18n.t('wm_Flood')
                : this.props.settings?.text || I18n.t('wm_Dry')),
            size !== '2x1' && lastChangedAgo ? (React.createElement(Typography, { variant: "caption", sx: { fontSize: '0.65rem', color: 'text.disabled', lineHeight: 1.2 } }, lastChangedAgo)) : null));
    }
    renderTileAction() {
        const { alarm, lastChangedAgo } = this.state;
        const accent = this.getAccentColor();
        return (React.createElement(Box, { sx: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' } },
            React.createElement(Typography, { variant: "h6", sx: {
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    color: alarm ? accent || FLOOD_COLOR : 'success.main',
                } }, alarm
                ? this.props.settings?.textActive || I18n.t('wm_Flood')
                : this.props.settings?.text || I18n.t('wm_Dry')),
            lastChangedAgo ? (React.createElement(Typography, { variant: "caption", sx: { color: 'text.disabled', whiteSpace: 'nowrap' } }, lastChangedAgo)) : null));
    }
    render() {
        if (this.props.settings?.hideWhenOk && !this.state.alarm) {
            if (!this.props.onOpenSettings) {
                return (React.createElement("div", { "data-wm-hidden": true, style: { display: 'none' } }));
            }
            return React.createElement(Box, { sx: { opacity: 0.5 } }, super.render());
        }
        return super.render();
    }
}
export default WidgetFloodAlarm;
//# sourceMappingURL=FloodAlarm.js.map