import React from 'react';
import { Box, Typography } from '@mui/material';
import { WaterDrop, Thermostat } from '@mui/icons-material';
import WidgetGeneric, { formatFloat } from './Generic';
import { hideBaseFields } from '../configUtils';
export class WidgetHumidity extends WidgetGeneric {
    static getConfigSchema() {
        return {
            name: 'Humidity',
            schema: { type: 'panel', items: { ...hideBaseFields('colorActive', 'color') } },
        };
    }
    actualId;
    temperatureId;
    constructor(props) {
        super(props);
        const states = props.widget.control.states;
        const actual = states.find(s => s.name === 'ACTUAL');
        const second = states.find(s => s.name === 'SECOND');
        this.actualId = actual?.id ?? null;
        this.temperatureId = second?.id ?? null;
        this.state = {
            ...this.state,
            humidity: null,
            temperature: null,
        };
    }
    componentDidMount() {
        super.componentDidMount();
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onHumidityChange);
        }
        if (this.temperatureId) {
            this.props.stateContext.getState(this.temperatureId, this.onTemperatureChange);
        }
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onHumidityChange);
        }
        if (this.temperatureId) {
            this.props.stateContext.removeState(this.temperatureId, this.onTemperatureChange);
        }
    }
    onHumidityChange = (_id, state) => {
        const val = state.val != null ? Number(state.val) : null;
        const humidity = val != null && !isNaN(val) ? val : null;
        if (humidity !== this.state.humidity) {
            this.setState({ humidity });
        }
    };
    onTemperatureChange = (_id, state) => {
        const val = state.val != null ? Number(state.val) : null;
        const temperature = val != null && !isNaN(val) ? val : null;
        if (temperature !== this.state.temperature) {
            this.setState({ temperature });
        }
    };
    getHistoryIds() {
        const ids = [];
        if (this.actualId) {
            ids.push({ id: this.actualId, color: '#2196f3' });
        }
        if (this.temperatureId) {
            ids.push({ id: this.temperatureId, color: '#ff9800' });
        }
        return ids;
    }
    static getHumidityColor(h) {
        if (h == null) {
            return 'text.disabled';
        }
        if (h < 25) {
            return '#ff9800'; // too dry — orange
        }
        if (h <= 60) {
            return '#2196f3'; // comfortable — blue
        }
        if (h <= 70) {
            return '#1565c0'; // humid — darker blue
        }
        return '#7b1fa2'; // very humid — purple
    }
    formatHumidity() {
        if (this.state.humidity == null) {
            return '—';
        }
        return `${Math.round(this.state.humidity)}%`;
    }
    isTileActive() {
        return this.state.humidity != null;
    }
    renderTileIcon() {
        const baseIcon = super.renderTileIcon();
        if (baseIcon) {
            return baseIcon;
        }
        const { humidity } = this.state;
        return (React.createElement(WaterDrop, { sx: {
                color: WidgetHumidity.getHumidityColor(humidity),
                transition: 'color 0.25s ease',
            } }));
    }
    renderTileStatus() {
        // In wide/tall modes, values are shown via renderTileAction
        const size = this.props.settings?.size || '1x1';
        if (size !== '1x1') {
            return null;
        }
        const { temperature } = this.state;
        return (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
            React.createElement(Typography, { variant: "caption", sx: {
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    lineHeight: 1.2,
                    color: 'text.primary',
                } }, this.formatHumidity()),
            temperature != null ? (React.createElement(Typography, { variant: "caption", sx: {
                    fontWeight: 500,
                    color: 'text.secondary',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                } },
                React.createElement(Thermostat, { sx: { fontSize: 12 } }),
                formatFloat(temperature, 1, this.props.stateContext.isFloatComma),
                "\u00B0")) : null));
    }
    renderTileAction() {
        const { temperature } = this.state;
        return (React.createElement(Box, { sx: { display: 'flex', alignItems: 'baseline', gap: 1.5 } },
            React.createElement(Typography, { variant: "h5", sx: { fontWeight: 700, whiteSpace: 'nowrap' } }, this.formatHumidity()),
            temperature != null ? (React.createElement(Typography, { variant: "body2", sx: {
                    color: 'text.secondary',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    whiteSpace: 'nowrap',
                } },
                React.createElement(Thermostat, { sx: { fontSize: 14 } }),
                formatFloat(temperature, 1, this.props.stateContext.isFloatComma),
                "\u00B0")) : null));
    }
}
export default WidgetHumidity;
//# sourceMappingURL=Humidity.js.map