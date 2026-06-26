import React from 'react';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import { Close } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';
import { ConfigGeneric } from '@iobroker/json-config';
import { DETECT_APPLICATIONS } from '../Utils';
/** Icon selector using the existing IconPickerDialog */
export default class ConfigURLSelect extends ConfigGeneric {
    renderItem(error, disabled, _defaultValue) {
        const attr = this.props.attr || 'icon';
        const value = ConfigGeneric.getValue(this.props.data, attr) || '';
        const doNotModifyUrl = ConfigGeneric.getValue(this.props.data, 'doNotModifyUrl') || false;
        return (React.createElement(TextField, { sx: { mb: 1 }, label: I18n.t(this.props.schema.label || ''), value: value, error: !!error, helperText: typeof error === 'string' && error ? error : null, placeholder: I18n.t(this.props.schema.placeholder || ''), slotProps: {
                input: {
                    endAdornment: value && !disabled && (React.createElement(InputAdornment, { position: "end" },
                        React.createElement(IconButton, { size: "large", tabIndex: -1, onClick: e => {
                                e.preventDefault();
                                e.stopPropagation();
                                void this.onChange(attr, '');
                            }, edge: "end" }, React.createElement(Close, null)))),
                },
            }, onChange: ev => {
                let value = ev.target.value;
                if (!doNotModifyUrl && DETECT_APPLICATIONS.find(e => value.includes(e))) {
                    // If we are in admin, replace "http(s)://IP:port/vis/" with vis
                    const parts = value.trim().match(/^https?:\/\/([-_\w.]+)(:\d+)\//);
                    if (parts && parts[1] === window.location.hostname) {
                        value = value.replace(parts[0], '/');
                    }
                }
                if (value.includes('/devices/')) {
                    value = '';
                }
                void this.onChange(attr, value);
            } }));
    }
}
//# sourceMappingURL=ConfigURLSelect.js.map