import React from 'react';
import { Box, Button, IconButton, TextField, Typography } from '@mui/material';
import { Add, Remove } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';
import { ConfigGeneric } from '@iobroker/json-config';
const DEFAULT_LEVELS = [
    { value: 30, color: '#4caf50' },
    { value: 70, color: '#ff9800' },
    { value: 100, color: '#f44336' },
];
/** Color level breakpoints editor for gauge widgets */
export default class ConfigColorLevels extends ConfigGeneric {
    constructor(props) {
        super(props);
        this.state = {
            ...this.state,
        };
    }
    getLevels() {
        const attr = this.props.attr || 'colorLevels';
        const value = ConfigGeneric.getValue(this.props.data, attr);
        return Array.isArray(value) ? value : DEFAULT_LEVELS;
    }
    updateLevels(levels) {
        const attr = this.props.attr || 'colorLevels';
        void this.onChange(attr, levels);
    }
    renderItem(_error, _disabled, _defaultValue) {
        const levels = this.getLevels();
        return (React.createElement(Box, { sx: { mt: 1 } },
            React.createElement(Typography, { variant: "body2", sx: { color: 'text.secondary', mb: 0.5 } }, I18n.t(this.props.schema.label)),
            levels.map((lvl, i) => (React.createElement(Box, { key: i, sx: { display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 } },
                React.createElement(TextField, { size: "small", type: "number", value: lvl.value, onChange: e => {
                        const next = [...levels];
                        next[i] = { ...next[i], value: Number(e.target.value) };
                        this.updateLevels(next);
                    }, sx: { width: 90 }, label: I18n.t('wm_Value') }),
                React.createElement("input", { type: "color", value: lvl.color, onChange: e => {
                        const next = [...levels];
                        next[i] = { ...next[i], color: e.target.value };
                        this.updateLevels(next);
                    }, style: {
                        width: 36,
                        height: 36,
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        padding: 0,
                        background: 'none',
                    } }),
                React.createElement(IconButton, { size: "small", onClick: () => {
                        const next = levels.filter((_, j) => j !== i);
                        this.updateLevels(next);
                    }, disabled: levels.length <= 1 },
                    React.createElement(Remove, { fontSize: "small" }))))),
            React.createElement(Button, { size: "small", startIcon: React.createElement(Add, null), onClick: () => {
                    const lastVal = levels.length ? levels[levels.length - 1].value + 10 : 50;
                    this.updateLevels([...levels, { value: lastVal, color: '#2196f3' }]);
                } }, I18n.t('wm_Add level'))));
    }
}
//# sourceMappingURL=ConfigColorLevels.js.map