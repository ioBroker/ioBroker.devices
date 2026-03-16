import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    MenuItem,
    Select,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { Close, Delete, Save } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';

import type { CustomWidgetDef } from '../../../src/widget-utils';
import {
    CUSTOM_WIDGET_CONFIGS,
    getConfigDefault,
    type CwConfigColor,
    type CwConfigItem,
    type CwConfigSelect,
} from './CustomWidgetConfigs';

interface CustomWidgetSettingsDialogProps {
    open: boolean;
    widgetDef: CustomWidgetDef | null;
    onClose: () => void;
    onSave: (def: CustomWidgetDef) => void;
    onDelete: () => void;
}

// --- Item renderers ---

function renderSelect(
    key: string,
    item: CwConfigSelect,
    value: string,
    onChange: (v: unknown) => void,
): React.JSX.Element {
    if (item.format === 'radio') {
        return (
            <Box
                key={key}
                sx={{ mb: 2 }}
            >
                <Typography
                    variant="body2"
                    sx={{ mb: 1, fontWeight: 500 }}
                >
                    {I18n.t(item.label)}
                </Typography>
                <ToggleButtonGroup
                    value={value}
                    exclusive
                    onChange={(_, v) => {
                        if (v) {
                            onChange(v);
                        }
                    }}
                    size="small"
                >
                    {item.options.map(opt => (
                        <ToggleButton
                            key={opt.value}
                            value={opt.value}
                        >
                            {opt.icon ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 0.5 }}>
                                    {opt.icon}
                                    <span>{I18n.t(opt.label)}</span>
                                </Box>
                            ) : (
                                I18n.t(opt.label)
                            )}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Box>
        );
    }

    return (
        <Box
            key={key}
            sx={{ mb: 2 }}
        >
            <Typography
                variant="body2"
                sx={{ mb: 1, fontWeight: 500 }}
            >
                {I18n.t(item.label)}
            </Typography>
            <Select
                value={value}
                onChange={e => onChange(e.target.value)}
                size="small"
                fullWidth
            >
                {item.options.map(opt => (
                    <MenuItem
                        key={opt.value}
                        value={opt.value}
                    >
                        {I18n.t(opt.label)}
                    </MenuItem>
                ))}
            </Select>
        </Box>
    );
}

function renderColor(
    key: string,
    item: CwConfigColor,
    value: string,
    onChange: (v: unknown) => void,
): React.JSX.Element {
    return (
        <Box
            key={key}
            sx={{ mb: 2 }}
        >
            <Typography
                variant="body2"
                sx={{ mb: 1, fontWeight: 500 }}
            >
                {I18n.t(item.label)}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                    component="input"
                    type="color"
                    value={value || '#1976d2'}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
                    sx={{
                        width: 40,
                        height: 40,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        cursor: 'pointer',
                        p: '2px',
                        backgroundColor: 'transparent',
                    }}
                />
                {value ? (
                    <IconButton
                        size="small"
                        onClick={() => onChange('')}
                    >
                        <Delete fontSize="small" />
                    </IconButton>
                ) : null}
            </Box>
        </Box>
    );
}

function renderConfigItem(
    key: string,
    item: CwConfigItem,
    value: unknown,
    onChange: (v: unknown) => void,
): React.JSX.Element {
    switch (item.type) {
        case 'select':
            return renderSelect(key, item, value as string, onChange);
        case 'color':
            return renderColor(key, item, value as string, onChange);
        case 'checkbox':
            return (
                <FormControlLabel
                    key={key}
                    control={
                        <Checkbox
                            checked={value as boolean}
                            onChange={(_e, v) => onChange(v)}
                            size="small"
                        />
                    }
                    label={I18n.t(item.label)}
                />
            );
    }
}

// --- Dialog ---

export default function CustomWidgetSettingsDialog(props: CustomWidgetSettingsDialogProps): React.JSX.Element | null {
    const { open, widgetDef, onClose, onSave, onDelete } = props;
    const [values, setValues] = useState<Record<string, unknown>>({});

    const config = widgetDef ? CUSTOM_WIDGET_CONFIGS[widgetDef.type] : null;

    useEffect(() => {
        if (open && widgetDef) {
            const cfg = CUSTOM_WIDGET_CONFIGS[widgetDef.type];
            if (cfg) {
                const initial: Record<string, unknown> = {};
                for (const [key, item] of Object.entries(cfg.items)) {
                    const stored = (widgetDef as unknown as Record<string, unknown>)[key];
                    initial[key] = stored !== undefined ? stored : getConfigDefault(item);
                }
                setValues(initial);
            }
        }
    }, [open, widgetDef]);

    if (!widgetDef || !config) {
        return null;
    }

    const updateValue = (key: string, value: unknown): void => {
        setValues(prev => ({ ...prev, [key]: value }));
    };

    const hasChanges = Object.entries(config.items).some(([key, item]) => {
        const stored = (widgetDef as unknown as Record<string, unknown>)[key];
        const original = stored !== undefined ? stored : getConfigDefault(item);
        return values[key] !== original;
    });

    const handleSave = (): void => {
        const newDef: Record<string, unknown> = { id: widgetDef.id, type: widgetDef.type };
        for (const [key, item] of Object.entries(config.items)) {
            const value = values[key];
            const defaultVal = getConfigDefault(item);
            if (value !== defaultVal) {
                newDef[key] = value;
            }
        }
        onSave(newDef as unknown as CustomWidgetDef);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
        >
            <DialogTitle>{I18n.t(config.name)}</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 1 }}>
                    {Object.entries(config.items).map(([key, item]) =>
                        renderConfigItem(key, item, values[key], v => updateValue(key, v)),
                    )}
                </Box>
                <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Delete />}
                    onClick={() => {
                        onDelete();
                        onClose();
                    }}
                    fullWidth
                >
                    {I18n.t('wm_Delete')}
                </Button>
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    disabled={!hasChanges}
                    startIcon={<Save />}
                    onClick={handleSave}
                >
                    {I18n.t('wm_Save')}
                </Button>
                <Button
                    color="grey"
                    startIcon={<Close />}
                    onClick={onClose}
                >
                    {I18n.t('wm_Cancel')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
