import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { Delete } from '@mui/icons-material';
import { I18n, Icon } from '@iobroker/adapter-react-v5';
import { ConfigGeneric } from '@iobroker/json-config';
import IconPickerDialog from '../IconPickerDialog';
/** Icon selector using the existing IconPickerDialog */
export default class ConfigIconSelect extends ConfigGeneric {
    constructor(props) {
        super(props);
        this.state = {
            ...this.state,
            dialogOpen: false,
        };
    }
    renderItem(_error, _disabled, _defaultValue) {
        const attr = this.props.attr || 'icon';
        const value = ConfigGeneric.getValue(this.props.data, attr) || '';
        return (React.createElement(Box, { sx: { mb: 1 } },
            React.createElement(Typography, { variant: "body2", sx: { mb: 0.5, fontWeight: 500, color: 'text.secondary' } }, I18n.t(this.props.schema.label || '')),
            React.createElement(Box, { onClick: () => this.setState({ dialogOpen: true }), sx: theme => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    borderRadius: 1,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: 'divider',
                    minHeight: 40,
                    '&:hover': {
                        borderColor: theme.palette.text.primary,
                    },
                }) },
                value ? (React.createElement(Icon, { src: value, style: { width: 24, height: 24 } })) : (React.createElement(Typography, { variant: "body2", sx: { color: 'text.disabled', flex: 1 } }, I18n.t('wm_Select icon'))),
                value ? React.createElement(Box, { sx: { flex: 1 } }) : null,
                value ? (React.createElement(IconButton, { size: "small", onClick: e => {
                        e.stopPropagation();
                        void this.onChange(attr, '');
                    } },
                    React.createElement(Delete, { fontSize: "small" }))) : null),
            this.state.dialogOpen ? (React.createElement(IconPickerDialog, { open: true, title: I18n.t(this.props.schema.label || 'wm_Select icon'), value: value, onClose: () => this.setState({ dialogOpen: false }), onSelect: (iconValue) => {
                    void this.onChange(attr, iconValue);
                    this.setState({ dialogOpen: false });
                }, socket: this.props.oContext.socket, theme: this.props.oContext.theme, admin: true, instance: `${this.props.oContext.adapterName}.${this.props.oContext.instance}` })) : null));
    }
}
//# sourceMappingURL=ConfigIconSelect.js.map