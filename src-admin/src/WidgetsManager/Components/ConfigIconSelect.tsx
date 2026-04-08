import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { Delete } from '@mui/icons-material';
import { I18n, Icon, type Connection } from '@iobroker/adapter-react-v5';

import { ConfigGeneric, type ConfigGenericProps, type ConfigGenericState } from '@iobroker/json-config';
import IconPickerDialog from '../IconPickerDialog';

interface ConfigIconSelectState extends ConfigGenericState {
    dialogOpen: boolean;
}

/** Icon selector using the existing IconPickerDialog */
export default class ConfigIconSelect extends ConfigGeneric<ConfigGenericProps, ConfigIconSelectState> {
    constructor(props: ConfigGenericProps) {
        super(props);
        this.state = {
            ...this.state,
            dialogOpen: false,
        };
    }

    renderItem(_error: unknown, _disabled: boolean, _defaultValue?: unknown): React.JSX.Element {
        const attr = this.props.attr || 'icon';
        const value = (ConfigGeneric.getValue(this.props.data, attr) as string) || '';

        return (
            <Box sx={{ mb: 1 }}>
                <Typography
                    variant="body2"
                    sx={{ mb: 0.5, fontWeight: 500, color: 'text.secondary' }}
                >
                    {I18n.t((this.props.schema.label as string) || '')}
                </Typography>
                <Box
                    onClick={() => this.setState({ dialogOpen: true })}
                    sx={theme => ({
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
                    })}
                >
                    {value ? (
                        <Icon
                            src={value}
                            style={{ width: 24, height: 24 }}
                        />
                    ) : (
                        <Typography
                            variant="body2"
                            sx={{ color: 'text.disabled', flex: 1 }}
                        >
                            {I18n.t('wm_Select icon')}
                        </Typography>
                    )}
                    {value ? <Box sx={{ flex: 1 }} /> : null}
                    {value ? (
                        <IconButton
                            size="small"
                            onClick={e => {
                                e.stopPropagation();
                                void this.onChange(attr, '');
                            }}
                        >
                            <Delete fontSize="small" />
                        </IconButton>
                    ) : null}
                </Box>
                {this.state.dialogOpen ? (
                    <IconPickerDialog
                        open
                        title={I18n.t((this.props.schema.label as string) || 'wm_Select icon')}
                        value={value}
                        onClose={() => this.setState({ dialogOpen: false })}
                        onSelect={(iconValue: string) => {
                            void this.onChange(attr, iconValue);
                            this.setState({ dialogOpen: false });
                        }}
                        socket={this.props.oContext.socket as unknown as Connection}
                        theme={this.props.oContext.theme}
                        admin
                        instance={`${this.props.oContext.adapterName}.${this.props.oContext.instance}`}
                    />
                ) : null}
            </Box>
        );
    }
}
