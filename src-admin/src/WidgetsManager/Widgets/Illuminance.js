import React from 'react';
import { Box, Typography } from '@mui/material';
import { DarkMode, LightMode, NightsStay, WbTwilight } from '@mui/icons-material';
import WidgetGeneric, {} from './Generic';
import { hideBaseFields } from '../configUtils';
export class WidgetIlluminance extends WidgetGeneric {
    static getConfigSchema() {
        return {
            name: 'Illuminance',
            schema: { type: 'panel', items: { ...hideBaseFields('colorActive', 'color') } },
        };
    }
    actualId;
    constructor(props) {
        super(props);
        const states = props.widget.control.states;
        const actual = states.find(s => s.name === 'ACTUAL');
        this.actualId = actual?.id ?? null;
        this.state = {
            ...this.state,
            illuminance: null,
        };
    }
    componentDidMount() {
        super.componentDidMount();
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onIlluminanceChange);
        }
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onIlluminanceChange);
        }
    }
    onIlluminanceChange = (_id, state) => {
        const val = state.val != null ? Number(state.val) : null;
        const illuminance = val != null && !isNaN(val) ? val : null;
        if (illuminance !== this.state.illuminance) {
            this.setState({ illuminance });
        }
    };
    getHistoryIds() {
        if (this.actualId) {
            return [{ id: this.actualId, color: '#ffc107' }];
        }
        return [];
    }
    static getIlluminanceColor(lux) {
        if (lux == null) {
            return 'text.disabled';
        }
        if (lux < 50) {
            return '#5c6bc0'; // dark — indigo
        }
        if (lux < 200) {
            return '#ffa726'; // dim — orange
        }
        if (lux < 1000) {
            return '#ffca28'; // moderate — amber
        }
        return '#fdd835'; // bright — yellow
    }
    formatIlluminance() {
        if (this.state.illuminance == null) {
            return '—';
        }
        return `${Math.round(this.state.illuminance)} lx`;
    }
    isTileActive() {
        return this.state.illuminance != null;
    }
    renderTileIcon() {
        const baseIcon = super.renderTileIcon();
        if (baseIcon) {
            return baseIcon;
        }
        const lux = this.state.illuminance;
        const color = WidgetIlluminance.getIlluminanceColor(lux);
        const sx = { color, transition: 'color 0.25s ease' };
        if (lux != null && lux < 10) {
            return React.createElement(DarkMode, { sx: sx });
        }
        if (lux != null && lux < 50) {
            return React.createElement(NightsStay, { sx: sx });
        }
        if (lux != null && lux < 200) {
            return React.createElement(WbTwilight, { sx: sx });
        }
        return React.createElement(LightMode, { sx: sx });
    }
    renderTileStatus() {
        const size = this.props.settings?.size || '1x1';
        if (size === '2x0.5') {
            return null;
        }
        return (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
            React.createElement(Typography, { variant: "caption", sx: {
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    lineHeight: 1.2,
                    color: 'text.primary',
                } }, this.formatIlluminance())));
    }
    renderTileAction() {
        return (React.createElement(Box, { sx: { display: 'flex', alignItems: 'baseline', gap: 1.5 } },
            React.createElement(Typography, { variant: "h5", sx: { fontWeight: 700, whiteSpace: 'nowrap' } }, this.formatIlluminance())));
    }
}
export default WidgetIlluminance;
//# sourceMappingURL=Illuminance.js.map