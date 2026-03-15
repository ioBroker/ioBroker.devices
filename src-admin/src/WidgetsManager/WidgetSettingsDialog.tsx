import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    Switch,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { Close, Delete, Save } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';

import type { WidgetSettings } from './Widgets/Generic';

interface WidgetSettingsDialogProps {
    open: boolean;
    widgetName: string;
    settings: WidgetSettings;
    onClose: () => void;
    onSave: (settings: WidgetSettings) => void;
    showChart?: boolean;
    showBlindType?: boolean;
    showPin?: boolean;
    showHideWhenOk?: boolean;
    objectName?: string;
    objectColor?: string;
}

export default function WidgetSettingsDialog(props: WidgetSettingsDialogProps): React.JSX.Element {
    const {
        open,
        widgetName,
        settings,
        onClose,
        onSave,
        showChart,
        showBlindType,
        showPin,
        showHideWhenOk,
        objectName,
        objectColor,
    } = props;
    const [local, setLocal] = useState<WidgetSettings>(settings);

    useEffect(() => {
        if (open) {
            setLocal({
                ...settings,
                name: settings.name || objectName || widgetName,
                color: settings.color || objectColor || '',
            });
        }
    }, [settings, open, widgetName, objectName, objectColor]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
        >
            <DialogTitle>{widgetName}</DialogTitle>
            <DialogContent>
                <TextField
                    fullWidth
                    variant="filled"
                    label={I18n.t('wm_Name')}
                    value={local.name}
                    onChange={e => setLocal({ ...local, name: e.target.value })}
                    placeholder={widgetName}
                    size="small"
                    sx={{ mt: 1, mb: 2 }}
                />

                <Box sx={{ mb: 2 }}>
                    <Typography
                        variant="body2"
                        sx={{ mb: 1, fontWeight: 500 }}
                    >
                        {I18n.t('wm_Color')}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                            component="input"
                            type="color"
                            value={local.color || '#1976d2'}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setLocal({ ...local, color: e.target.value })
                            }
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
                        {local.color ? (
                            <IconButton
                                size="small"
                                onClick={() => setLocal({ ...local, color: '' })}
                            >
                                <Delete fontSize="small" />
                            </IconButton>
                        ) : null}
                    </Box>
                </Box>

                <FormControlLabel
                    control={
                        <Switch
                            checked={local.enabled}
                            onChange={(_, checked) => setLocal({ ...local, enabled: checked })}
                            color="primary"
                        />
                    }
                    label={I18n.t('wm_Enabled')}
                    sx={{ mb: 2 }}
                />

                <Box>
                    <Typography
                        variant="body2"
                        sx={{ mb: 1, fontWeight: 500 }}
                    >
                        {I18n.t('wm_Size')}
                    </Typography>
                    <ToggleButtonGroup
                        value={local.size}
                        exclusive
                        onChange={(_, value) => {
                            if (value) {
                                setLocal({ ...local, size: value });
                            }
                        }}
                        size="small"
                    >
                        <ToggleButton value="1x1">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 0.5 }}>
                                <Box
                                    sx={{
                                        width: 18,
                                        height: 18,
                                        border: '2px solid currentColor',
                                        borderRadius: '3px',
                                    }}
                                />
                                <span>1&times;1</span>
                            </Box>
                        </ToggleButton>
                        <ToggleButton value="2x1">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 0.5 }}>
                                <Box
                                    sx={{
                                        width: 32,
                                        height: 18,
                                        border: '2px solid currentColor',
                                        borderRadius: '3px',
                                    }}
                                />
                                <span>2&times;1</span>
                            </Box>
                        </ToggleButton>
                        <ToggleButton value="2x0.5">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 0.5 }}>
                                <Box
                                    sx={{
                                        width: 32,
                                        height: 10,
                                        border: '2px solid currentColor',
                                        borderRadius: '3px',
                                    }}
                                />
                                <span>2&times;&frac12;</span>
                            </Box>
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {showBlindType ? (
                    <Box sx={{ mt: 2 }}>
                        <Typography
                            variant="body2"
                            sx={{ mb: 1, fontWeight: 500 }}
                        >
                            {I18n.t('wm_BlindType')}
                        </Typography>
                        <ToggleButtonGroup
                            value={local.blindType || 'shutter'}
                            exclusive
                            onChange={(_, value) => {
                                if (value) {
                                    setLocal({ ...local, blindType: value });
                                }
                            }}
                            size="small"
                        >
                            <ToggleButton value="shutter">{I18n.t('wm_Shutter')}</ToggleButton>
                            <ToggleButton value="curtain">{I18n.t('wm_Curtain')}</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                ) : null}

                {showPin ? (
                    <TextField
                        fullWidth
                        variant="filled"
                        label={I18n.t('wm_PIN Code')}
                        value={local.pin || ''}
                        onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            setLocal({ ...local, pin: val });
                        }}
                        placeholder="1234"
                        size="small"
                        slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 8 } }}
                        helperText={I18n.t('wm_PIN help')}
                        sx={{ mt: 2 }}
                    />
                ) : null}

                {showHideWhenOk ? (
                    <FormControlLabel
                        control={
                            <Switch
                                checked={!!local.hideWhenOk}
                                onChange={(_, checked) => setLocal({ ...local, hideWhenOk: checked })}
                                color="primary"
                            />
                        }
                        label={I18n.t('wm_Hide when OK')}
                        sx={{ mt: 1, display: 'flex' }}
                    />
                ) : null}

                {showChart ? (
                    <Box sx={{ mt: 2 }}>
                        <Typography
                            variant="body2"
                            sx={{ mb: 1, fontWeight: 500 }}
                        >
                            {I18n.t('wm_Chart')}
                        </Typography>
                        <ToggleButtonGroup
                            value={local.chartHours}
                            exclusive
                            onChange={(_, value) => {
                                if (value != null) {
                                    setLocal({ ...local, chartHours: value });
                                }
                            }}
                            size="small"
                            sx={{ '& .MuiToggleButton-root': { flex: 1 } }}
                        >
                            <ToggleButton value={0}>{I18n.t('wm_Off')}</ToggleButton>
                            <ToggleButton value={1}>1h</ToggleButton>
                            <ToggleButton value={3}>3h</ToggleButton>
                            <ToggleButton value={6}>6h</ToggleButton>
                            <ToggleButton value={12}>12h</ToggleButton>
                            <ToggleButton value={24}>24h</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                ) : null}
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    disabled={
                        local.enabled === settings.enabled &&
                        local.size === settings.size &&
                        local.chartHours === settings.chartHours &&
                        local.name === (settings.name || objectName || widgetName) &&
                        local.color === (settings.color || objectColor || '') &&
                        local.blindType === settings.blindType &&
                        (local.pin || '') === (settings.pin || '') &&
                        !!local.hideWhenOk === !!settings.hideWhenOk
                    }
                    startIcon={<Save />}
                    onClick={() => onSave(local)}
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
