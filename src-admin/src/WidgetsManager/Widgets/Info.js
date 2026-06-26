import React from 'react';
import { Box, Typography } from '@mui/material';
import { Air, Bolt, ElectricalServices, ElectricMeter, EnergySavingsLeaf, Explore, Grass, Hearing, LightMode, Opacity, Speed, Thermostat, Visibility, Water, WaterDrop, WbSunny, Waves, } from '@mui/icons-material';
import WidgetGeneric, { formatFloat, resolveTranslated, isNeumorphicTheme, } from './Generic';
import { hideBaseFields } from '../configUtils';
/** Map ioBroker roles / units to icons */
const ROLE_ICON_MAP = [
    [/pressure|baro/i, Speed],
    [/voltage/i, Bolt],
    [/current(?!.*weather)/i, ElectricalServices],
    [/power|watt/i, ElectricMeter],
    [/energy|consumption|kwh/i, EnergySavingsLeaf],
    [/frequency|hertz|hz/i, Waves],
    [/humidity|moisture/i, WaterDrop],
    [/temperature|temp/i, Thermostat],
    [/wind.*speed/i, Air],
    [/wind.*dir/i, Explore],
    [/precipitation|rain/i, Opacity],
    [/uv/i, WbSunny],
    [/visibility/i, Visibility],
    [/air.*quality|aqi|pm2|pm10|co2/i, Air],
    [/noise|decibel|dba/i, Hearing],
    [/water.*level|tank/i, Water],
    [/soil/i, Grass],
    [/light|lux|illumin/i, LightMode],
];
function getIconForRole(role, unit) {
    const combined = `${role} ${unit}`;
    for (const [regex, Icon] of ROLE_ICON_MAP) {
        if (regex.test(combined)) {
            return Icon;
        }
    }
    return null;
}
export class WidgetInfo extends WidgetGeneric {
    static getConfigSchema() {
        return {
            name: 'Info',
            schema: { type: 'panel', items: { ...hideBaseFields('colorActive', 'color') } },
        };
    }
    stateIds;
    constructor(props) {
        super(props);
        const states = props.widget.control.states;
        // Collect all ACTUAL states (info type allows multiple)
        this.stateIds = states
            .filter(s => s.name === 'ACTUAL' && s.id)
            .map(s => ({ id: s.id, role: s.stateRole || '' }));
        this.state = {
            ...this.state,
            infoStates: [],
        };
    }
    async componentDidMount() {
        super.componentDidMount();
        // Load object metadata (name, unit) for each state, then subscribe
        const infoStates = [];
        for (const entry of this.stateIds) {
            let unit = '';
            let name = '';
            let role = entry.role;
            try {
                const obj = await this.props.stateContext.getObject(entry.id);
                if (obj?.common) {
                    unit = obj.common.unit || '';
                    name = resolveTranslated(obj.common.name, this.props.stateContext.language);
                    role = obj.common.role || role;
                }
            }
            catch {
                // ignore
            }
            infoStates.push({ id: entry.id, role, unit, name, value: null });
            this.props.stateContext.getState(entry.id, this.onStateChange);
        }
        this.setState({ infoStates });
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        for (const entry of this.stateIds) {
            this.props.stateContext.removeState(entry.id, this.onStateChange);
        }
    }
    onStateChange = (id, state) => {
        this.setState(prev => ({
            infoStates: prev.infoStates.map(s => (s.id === id ? { ...s, value: state.val } : s)),
        }));
    };
    getHistoryIds() {
        const colors = ['#2196f3', '#ff9800', '#4caf50', '#f44336', '#9c27b0', '#00bcd4'];
        return this.stateIds.map((entry, i) => ({
            id: entry.id,
            color: colors[i % colors.length],
        }));
    }
    isTileActive() {
        return this.state.infoStates.some(s => s.value != null);
    }
    formatValue(val, unit) {
        if (val == null) {
            return '—';
        }
        if (typeof val === 'number') {
            // Show reasonable precision
            const str = Number.isInteger(val) ? String(val) : formatFloat(val, 1, this.props.stateContext.isFloatComma);
            return unit ? `${str} ${unit}` : str;
        }
        if (typeof val === 'boolean') {
            return val ? 'ON' : 'OFF';
        }
        return unit ? `${val} ${unit}` : String(val);
    }
    static getStateIcon(s, fontSize) {
        const IconComp = getIconForRole(s.role, s.unit);
        if (!IconComp) {
            return null;
        }
        return React.createElement(IconComp, { sx: { fontSize, color: 'text.secondary', flexShrink: 0 } });
    }
    // --- Tile icon (1-2 states: role icon like Humidity/Temperature) ---
    renderTileIcon() {
        const baseIcon = super.renderTileIcon();
        if (baseIcon) {
            return baseIcon;
        }
        const { infoStates } = this.state;
        // For 1-2 states: show role-based icon in center (like Humidity widget)
        if (infoStates.length >= 1 && infoStates.length <= 2 && infoStates[0]) {
            const IconComp = getIconForRole(infoStates[0].role, infoStates[0].unit);
            if (IconComp) {
                return (React.createElement(IconComp, { sx: {
                        color: infoStates[0].value != null ? '#2196f3' : 'text.disabled',
                        transition: 'color 0.25s ease',
                    } }));
            }
        }
        return React.createElement(ElectricMeter, { sx: { color: 'text.disabled' } });
    }
    // --- Tile status (below name, 1x1 only — value like Humidity shows "65%") ---
    renderTileStatus() {
        const size = this.props.settings?.size || '1x1';
        if (size !== '1x1') {
            return null;
        }
        const { infoStates } = this.state;
        const count = infoStates.length;
        if (count === 1 && infoStates[0]) {
            // Single state: show value below name
            const s = infoStates[0];
            return (React.createElement(Typography, { variant: "caption", sx: {
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    lineHeight: 1.2,
                    color: 'text.primary',
                } }, this.formatValue(s.value, s.unit)));
        }
        if (count === 2 && infoStates[0] && infoStates[1]) {
            // Two states: first value big, second smaller with icon
            const s0 = infoStates[0];
            const s1 = infoStates[1];
            const icon = WidgetInfo.getStateIcon(s1, 12);
            return (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
                React.createElement(Typography, { variant: "caption", sx: {
                        fontWeight: 600,
                        fontSize: '1.1rem',
                        lineHeight: 1.2,
                        color: 'text.primary',
                    } }, this.formatValue(s0.value, s0.unit)),
                React.createElement(Typography, { variant: "caption", sx: {
                        fontWeight: 500,
                        color: 'text.secondary',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                    } },
                    icon,
                    this.formatValue(s1.value, s1.unit))));
        }
        return null;
    }
    // --- Wide / WideTall action area ---
    renderTileAction() {
        const { infoStates } = this.state;
        const count = infoStates.length;
        if (count <= 2) {
            return (React.createElement(Box, { sx: { display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap' } }, infoStates.map((s, i) => {
                const icon = WidgetInfo.getStateIcon(s, i === 0 ? 18 : 14);
                return (React.createElement(Box, { key: s.id, sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
                    icon,
                    React.createElement(Typography, { variant: i === 0 ? 'h5' : 'body2', sx: {
                            fontWeight: i === 0 ? 700 : 500,
                            whiteSpace: 'nowrap',
                            color: i === 0 ? 'text.primary' : 'text.secondary',
                        } }, this.formatValue(s.value, s.unit))));
            })));
        }
        // 3+ states: render as compact table
        return (React.createElement(Box, { sx: {
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '2px 8px',
                alignItems: 'center',
                overflow: 'auto',
                maxHeight: '100%',
            } }, infoStates.map(s => {
            const icon = WidgetInfo.getStateIcon(s, 14);
            return (React.createElement(React.Fragment, { key: s.id },
                React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 } },
                    icon,
                    React.createElement(Typography, { variant: "caption", sx: {
                            color: 'text.secondary',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        } }, s.name)),
                React.createElement(Typography, { variant: "body2", sx: { fontWeight: 600, whiteSpace: 'nowrap' } }, this.formatValue(s.value, s.unit))));
        })));
    }
    // --- 1x1 override for 3+ states: show table instead of icon ---
    renderCompact() {
        if (this.state.infoStates.length <= 2) {
            return super.renderCompact();
        }
        const { infoStates } = this.state;
        // 3+ states: replace icon area with a table
        const { name } = this.state;
        const isActive = this.isTileActive();
        const indicators = this.renderIndicators();
        const chartClickable = this.hasChartAction();
        return (React.createElement(Box, { id: String(this.props.widget.id), className: this.getWidgetClass(), sx: theme => WidgetGeneric.getStyleCompact(theme) },
            React.createElement(Box, { onClick: chartClickable ? () => this.setState({ chartDialogOpen: true }) : undefined, sx: theme => ({
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: chartClickable ? 'pointer' : 'default',
                    justifyContent: 'space-between',
                    alignItems: 'stretch',
                    width: '100%',
                    aspectRatio: '1',
                    textAlign: 'left',
                    overflow: 'hidden',
                    ...this.applyTileStyles(theme, isActive),
                    padding: 'max(12px, 8cqi)',
                }) },
                indicators,
                React.createElement(Box, { sx: {
                        flex: 1,
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr',
                        gap: '1px 6px',
                        alignContent: 'center',
                        alignItems: 'center',
                        overflow: 'hidden',
                        minHeight: 0,
                    } }, infoStates.map(s => {
                    const icon = WidgetInfo.getStateIcon(s, 12);
                    return (React.createElement(React.Fragment, { key: s.id },
                        React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: '3px' } },
                            icon,
                            React.createElement(Typography, { variant: "caption", sx: {
                                    color: 'text.secondary',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    fontSize: 'max(0.65rem, 6cqi)',
                                    lineHeight: 1.3,
                                } }, s.name)),
                        React.createElement(Typography, { variant: "caption", sx: {
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                fontSize: 'max(0.7rem, 7cqi)',
                                lineHeight: 1.3,
                            } }, this.formatValue(s.value, s.unit))));
                })),
                React.createElement(Typography, { variant: "body2", sx: theme => ({
                        fontWeight: 600,
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        fontSize: 'max(0.875rem, 9cqi)',
                        textOverflow: 'ellipsis',
                        ...(isNeumorphicTheme(theme)
                            ? {
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                fontSize: 'max(0.6rem, 6cqi)',
                            }
                            : {}),
                    }) }, this.props.settings?.name || name || '...')),
            this.renderSettingsButton(),
            this.renderChart()));
    }
}
export default WidgetInfo;
//# sourceMappingURL=Info.js.map