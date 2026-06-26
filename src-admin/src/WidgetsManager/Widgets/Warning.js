import React from 'react';
import { Box, Typography } from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { I18n, Icon } from '@iobroker/adapter-react-v5';
import WidgetGeneric, {} from './Generic';
/** Warning level colors: 0 = none/green, 1 = minor/yellow, 2 = moderate/orange, 3 = severe/red, 4+ = extreme/dark red */
const LEVEL_COLORS = ['#4caf50', '#ffeb3b', '#ff9800', '#f44336', '#b71c1c'];
function getLevelColor(level) {
    if (level <= 0) {
        return LEVEL_COLORS[0];
    }
    if (level >= LEVEL_COLORS.length) {
        return LEVEL_COLORS[LEVEL_COLORS.length - 1];
    }
    return LEVEL_COLORS[level];
}
export class WidgetWarning extends WidgetGeneric {
    levelId;
    titleId;
    infoId;
    startId;
    endId;
    constructor(props) {
        super(props);
        const states = props.widget.control.states;
        this.levelId = states.find(s => s.name === 'LEVEL')?.id ?? null;
        this.titleId = states.find(s => s.name === 'TITLE')?.id ?? null;
        this.infoId = states.find(s => s.name === 'INFO')?.id ?? null;
        this.startId = states.find(s => s.name === 'START')?.id ?? null;
        this.endId = states.find(s => s.name === 'END')?.id ?? null;
        this.state = {
            ...this.state,
            level: 0,
            title: null,
            info: null,
            start: null,
            end: null,
        };
    }
    static getDefaultSettings() {
        return {
            ...WidgetGeneric.getDefaultSettings(),
            hideWhenOk: false,
        };
    }
    static getConfigSchema() {
        return {
            name: 'Warning',
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
        if (this.levelId) {
            this.props.stateContext.getState(this.levelId, this.onLevelChange);
        }
        if (this.titleId) {
            this.props.stateContext.getState(this.titleId, this.onTitleChange);
        }
        if (this.infoId) {
            this.props.stateContext.getState(this.infoId, this.onInfoChange);
        }
        if (this.startId) {
            this.props.stateContext.getState(this.startId, this.onStartChange);
        }
        if (this.endId) {
            this.props.stateContext.getState(this.endId, this.onEndChange);
        }
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.levelId) {
            this.props.stateContext.removeState(this.levelId, this.onLevelChange);
        }
        if (this.titleId) {
            this.props.stateContext.removeState(this.titleId, this.onTitleChange);
        }
        if (this.infoId) {
            this.props.stateContext.removeState(this.infoId, this.onInfoChange);
        }
        if (this.startId) {
            this.props.stateContext.removeState(this.startId, this.onStartChange);
        }
        if (this.endId) {
            this.props.stateContext.removeState(this.endId, this.onEndChange);
        }
    }
    onLevelChange = (_id, state) => {
        const level = Math.round(Number(state.val) || 0);
        if (level !== this.state.level) {
            this.setState({ level });
        }
    };
    onTitleChange = (_id, state) => {
        const title = state.val != null ? String(state.val) : null;
        if (title !== this.state.title) {
            this.setState({ title });
        }
    };
    onInfoChange = (_id, state) => {
        const info = state.val != null ? String(state.val) : null;
        if (info !== this.state.info) {
            this.setState({ info });
        }
    };
    onStartChange = (_id, state) => {
        const start = state.val != null ? String(state.val) : null;
        if (start !== this.state.start) {
            this.setState({ start });
        }
    };
    onEndChange = (_id, state) => {
        const end = state.val != null ? String(state.val) : null;
        if (end !== this.state.end) {
            this.setState({ end });
        }
    };
    getAccentColor() {
        if (this.state.level > 0) {
            return super.getAccentColor() || getLevelColor(this.state.level);
        }
        return super.getAccentColor();
    }
    isTileActive() {
        return this.state.level > 0;
    }
    renderTileIcon() {
        const { level } = this.state;
        const color = getLevelColor(level);
        // Active: iconActive, fallback to icon (with active color); Inactive: icon only
        const customIcon = level > 0 ? this.props.settings?.iconActive || this.props.settings?.icon : this.props.settings?.icon;
        if (customIcon) {
            return (React.createElement(Icon, { src: customIcon, style: {
                    width: '1em',
                    height: '1em',
                    color: level > 0 ? color : 'grey',
                    transition: 'color 0.25s ease',
                } }));
        }
        return (React.createElement(WarningIcon, { sx: {
                color: level > 0 ? color : 'text.disabled',
                transition: 'color 0.25s ease',
            } }));
    }
    renderTileStatus() {
        const size = this.props.settings?.size || '1x1';
        if (size === '2x0.5') {
            return null;
        }
        const { level, title } = this.state;
        const color = getLevelColor(level);
        return (React.createElement(Box, { sx: { display: 'flex', flexDirection: 'column' } },
            React.createElement(Typography, { variant: "caption", sx: {
                    fontWeight: 600,
                    color: level > 0 ? color : 'success.main',
                    transition: 'color 0.25s ease',
                } }, level > 0
                ? title || this.props.settings?.textActive || I18n.t('wm_Warning')
                : this.props.settings?.text || I18n.t('wm_OK'))));
    }
    renderTileAction() {
        const { level, title, start, end } = this.state;
        const color = getLevelColor(level);
        return (React.createElement(Box, { sx: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' } },
            React.createElement(Typography, { variant: "h6", sx: {
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    color: level > 0 ? color : 'success.main',
                } }, level > 0
                ? title || this.props.settings?.textActive || I18n.t('wm_Warning')
                : this.props.settings?.text || I18n.t('wm_OK')),
            start || end ? (React.createElement(Typography, { variant: "caption", sx: { color: 'text.disabled', whiteSpace: 'nowrap' } }, start && end ? `${start} – ${end}` : start || end)) : null));
    }
    render() {
        if (this.props.settings?.hideWhenOk && this.state.level <= 0) {
            if (!this.props.onOpenSettings) {
                return (React.createElement("div", { "data-wm-hidden": true, style: { display: 'none' } }));
            }
            return React.createElement(Box, { sx: { opacity: 0.5 } }, super.render());
        }
        return super.render();
    }
}
export default WidgetWarning;
//# sourceMappingURL=Warning.js.map