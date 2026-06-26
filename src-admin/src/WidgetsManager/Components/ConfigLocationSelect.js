import React from 'react';
import { CircularProgress, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import { I18n } from '@iobroker/adapter-react-v5';
import { ConfigGeneric } from '@iobroker/json-config';
/**
 * Location selector for adapters that expose multiple locations as devices (e.g. open-meteo-weather).
 * Reads the instance from `data.omwInstance`, lists all `device` objects beneath it and lets the user
 * pick one. The selected device id is written to this component's own `attr` (e.g. `omwLocation`).
 */
export default class ConfigLocationSelect extends ConfigGeneric {
    constructor(props) {
        super(props);
        this.state = {
            ...this.state,
            options: [],
            loading: false,
            loadedInstance: '',
        };
    }
    async componentDidMount() {
        await super.componentDidMount();
        await this.loadDevices();
    }
    componentDidUpdate() {
        const instance = this.getInstance();
        if (instance !== this.state.loadedInstance && !this.state.loading) {
            void this.loadDevices();
        }
    }
    /** Instance whose devices should be listed (e.g. "open-meteo-weather.0") */
    getInstance() {
        const instanceAttr = this.props.schema.instanceAttr || 'omwInstance';
        return ConfigGeneric.getValue(this.props.data, instanceAttr) || '';
    }
    async loadDevices() {
        const instance = this.getInstance();
        if (!instance) {
            this.setState({ options: [], loadedInstance: '' });
            return;
        }
        this.setState({ loading: true });
        try {
            const socket = this.props.oContext.socket;
            const objs = (await socket.getObjectViewSystem('device', `${instance}.`, `${instance}.\u9999`));
            const lang = I18n.getLanguage();
            const options = Object.values(objs || {})
                .filter(o => o && o.type === 'device')
                .map(o => {
                // The city is the device id leaf (e.g. "…0.Split" → "Split"). The object's
                // common.name is only a generic "location"/"Standort" label, so prefer the leaf
                // and fall back to common.name only if the leaf is empty.
                const leaf = (o._id.split('.').pop() || '').replace(/_/g, ' ').trim();
                const n = o.common?.name;
                const localized = (typeof n === 'object' ? n[lang] || n.en : n) || '';
                return { id: o._id, name: leaf || String(localized) || o._id };
            })
                .sort((a, b) => a.name.localeCompare(b.name));
            this.setState({ options, loading: false, loadedInstance: instance });
            // Auto-select / clean up the stored value
            const attr = this.props.attr || 'omwLocation';
            const current = ConfigGeneric.getValue(this.props.data, attr) || '';
            if (!current && options.length === 1) {
                // Exactly one location → preselect it
                void this.onChange(attr, options[0].id);
            }
            else if (current && !options.find(o => o.id === current)) {
                // Previously selected location no longer exists under this instance → reset
                void this.onChange(attr, options.length === 1 ? options[0].id : '');
            }
        }
        catch (e) {
            console.warn('ConfigLocationSelect: failed to load devices', e);
            this.setState({ options: [], loading: false, loadedInstance: instance });
        }
    }
    renderItem(_error, disabled, _defaultValue) {
        const attr = this.props.attr || 'omwLocation';
        const value = ConfigGeneric.getValue(this.props.data, attr) || '';
        const label = I18n.t(this.props.schema.label || 'wm_Location');
        if (!this.state.loading && this.getInstance() && this.state.options.length === 0) {
            return (React.createElement(Typography, { variant: "caption", sx: { color: 'text.secondary', display: 'block', mb: 1 } }, I18n.t('wm_No locations found')));
        }
        return (React.createElement(FormControl, { fullWidth: true, variant: "filled", size: "small", sx: { mb: 1 }, disabled: disabled || this.state.loading || !this.state.options.length },
            React.createElement(InputLabel, null, label),
            React.createElement(Select, { value: this.state.options.find(o => o.id === value) ? value : '', onChange: e => void this.onChange(attr, e.target.value), endAdornment: this.state.loading ? (React.createElement(CircularProgress, { size: 16, sx: { mr: 3 } })) : null }, this.state.options.map(o => (React.createElement(MenuItem, { key: o.id, value: o.id }, o.name))))));
    }
}
//# sourceMappingURL=ConfigLocationSelect.js.map