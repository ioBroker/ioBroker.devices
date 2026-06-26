import React from 'react';
import { Box, CircularProgress, List, ListItemButton, ListItemText, TextField, Typography } from '@mui/material';
import { MyLocation } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';
import { ConfigGeneric } from '@iobroker/json-config';
/** City search component using open-meteo geocoding API */
export default class ConfigCitySearch extends ConfigGeneric {
    timer = null;
    constructor(props) {
        super(props);
        const attr = this.props.attr || 'cityName';
        const value = ConfigGeneric.getValue(this.props.data, attr);
        this.state = {
            ...this.state,
            query: value || '',
            results: [],
            searching: false,
            showResults: false,
        };
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
    doSearch(q) {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        if (!q || q.length < 2) {
            this.setState({ results: [], showResults: false });
            return;
        }
        this.timer = setTimeout(() => {
            this.timer = null;
            this.setState({ searching: true });
            const lang = I18n.getLanguage() || 'en';
            fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=${lang}`)
                .then(r => r.json())
                .then((data) => this.setState({ results: data.results || [], showResults: true, searching: false }))
                .catch(() => this.setState({ showResults: true, searching: false }));
        }, 400);
    }
    handleSelect = (r) => {
        const display = r.admin1 ? `${r.name}, ${r.admin1}, ${r.country || ''}` : `${r.name}, ${r.country || ''}`;
        this.setState({ query: display, results: [], showResults: false });
        // Update all three fields at once via the data object
        const data = JSON.parse(JSON.stringify(this.props.data));
        ConfigGeneric.setValue(data, this.props.attr || 'cityName', display);
        ConfigGeneric.setValue(data, 'latitude', r.latitude);
        ConfigGeneric.setValue(data, 'longitude', r.longitude);
        this.props.onChange(data);
    };
    renderItem(_error, _disabled, _defaultValue) {
        const latitude = ConfigGeneric.getValue(this.props.data, 'latitude');
        const longitude = ConfigGeneric.getValue(this.props.data, 'longitude');
        return (React.createElement(Box, { sx: { mb: 2 } },
            React.createElement(Typography, { variant: "body2", sx: { mb: 1, fontWeight: 500 } }, I18n.t(this.props.schema.label)),
            React.createElement(TextField, { value: this.state.query, variant: "filled", onChange: e => this.setState({ query: e.target.value }, () => this.doSearch(this.state.query)), placeholder: I18n.t('wm_Search city'), size: "small", fullWidth: true, slotProps: {
                    input: {
                        endAdornment: this.state.searching ? (React.createElement(CircularProgress, { size: 16 })) : (React.createElement(MyLocation, { sx: { fontSize: 18, color: 'text.secondary' } })),
                    },
                } }),
            this.state.showResults && this.state.results.length > 0 ? (React.createElement(List, { dense: true, sx: {
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mt: 0.5,
                    maxHeight: 200,
                    overflow: 'auto',
                } }, this.state.results.map((r, i) => (React.createElement(ListItemButton, { key: `${r.latitude}-${r.longitude}-${i}`, onClick: () => this.handleSelect(r) },
                React.createElement(ListItemText, { primary: r.name, secondary: [r.admin1, r.country].filter(Boolean).join(', ') }),
                React.createElement(Typography, { variant: "caption", sx: { color: 'text.secondary', ml: 1, whiteSpace: 'nowrap' } },
                    r.latitude.toFixed(2),
                    ", ",
                    r.longitude.toFixed(2))))))) : null,
            this.state.showResults && this.state.results.length === 0 && !this.state.searching ? (React.createElement(Typography, { variant: "caption", sx: { color: 'text.secondary', mt: 0.5, display: 'block' } }, I18n.t('wm_No results'))) : null,
            latitude != null && longitude != null ? (React.createElement(Typography, { variant: "caption", sx: { color: 'text.secondary', mt: 0.5, display: 'block' } },
                Number(latitude).toFixed(4),
                "\u00B0, ",
                Number(longitude).toFixed(4),
                "\u00B0")) : null));
    }
}
//# sourceMappingURL=ConfigCitySearch.js.map