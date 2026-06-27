import React from 'react';
import { Box, Button, IconButton, TextField, Typography } from '@mui/material';
import { Add, Remove } from '@mui/icons-material';

import { I18n } from '@iobroker/adapter-react-v5';
import { ConfigGeneric, type ConfigGenericProps, type ConfigGenericState } from '@iobroker/json-config';

interface ColorLevel {
    value: number;
    color: string;
}

const DEFAULT_LEVELS: ColorLevel[] = [
    { value: 30, color: '#4caf50' },
    { value: 70, color: '#ff9800' },
    { value: 100, color: '#f44336' },
];

/** Color level breakpoints editor for gauge widgets */
export default class ConfigColorLevels extends ConfigGeneric<ConfigGenericProps, ConfigGenericState> {
    constructor(props: ConfigGenericProps) {
        super(props);
        this.state = {
            ...this.state,
        };
    }

    private getLevels(): ColorLevel[] {
        const attr = this.props.attr || 'colorLevels';
        const value = ConfigGeneric.getValue(this.props.data, attr);
        return Array.isArray(value) ? value : DEFAULT_LEVELS;
    }

    private updateLevels(levels: ColorLevel[]): void {
        const attr = this.props.attr || 'colorLevels';
        void this.onChange(attr, levels);
    }

    renderItem(_error: unknown, _disabled: boolean, _defaultValue?: unknown): React.JSX.Element {
        const levels = this.getLevels();

        return (
            <Box sx={{ mt: 1 }}>
                <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                >
                    {I18n.t(this.props.schema.label as string)}
                </Typography>
                {levels.map((lvl, i) => (
                    <Box
                        key={i}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}
                    >
                        <TextField
                            size="small"
                            type="number"
                            value={lvl.value}
                            onChange={e => {
                                const next = [...levels];
                                next[i] = { ...next[i], value: Number(e.target.value) };
                                this.updateLevels(next);
                            }}
                            sx={{ width: 90 }}
                            label={I18n.t('wm_Value')}
                        />
                        <input
                            type="color"
                            value={lvl.color}
                            onChange={e => {
                                const next = [...levels];
                                next[i] = { ...next[i], color: e.target.value };
                                this.updateLevels(next);
                            }}
                            style={{
                                width: 36,
                                height: 36,
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer',
                                padding: 0,
                                background: 'none',
                            }}
                        />
                        <IconButton
                            size="small"
                            onClick={() => {
                                const next = levels.filter((_, j) => j !== i);
                                this.updateLevels(next);
                            }}
                            disabled={levels.length <= 1}
                        >
                            <Remove fontSize="small" />
                        </IconButton>
                    </Box>
                ))}
                <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={() => {
                        const lastVal = levels.length ? levels[levels.length - 1].value + 10 : 50;
                        this.updateLevels([...levels, { value: lastVal, color: '#2196f3' }]);
                    }}
                >
                    {I18n.t('wm_Add level')}
                </Button>
            </Box>
        );
    }
}
