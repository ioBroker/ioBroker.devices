import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Switch,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { Close, Save } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';

import type { WidgetSettings } from './Widgets/Generic';

interface WidgetSettingsDialogProps {
    open: boolean;
    widgetName: string;
    settings: WidgetSettings;
    onClose: () => void;
    onSave: (settings: WidgetSettings) => void;
    showChart?: boolean;
}

export default function WidgetSettingsDialog(props: WidgetSettingsDialogProps): React.JSX.Element {
    const { open, widgetName, settings, onClose, onSave, showChart } = props;
    const [local, setLocal] = useState<WidgetSettings>(settings);

    useEffect(() => {
        if (open) {
            setLocal(settings);
        }
    }, [settings, open]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
        >
            <DialogTitle>{widgetName}</DialogTitle>
            <DialogContent>
                <FormControlLabel
                    control={
                        <Switch
                            checked={local.enabled}
                            onChange={(_, checked) => setLocal({ ...local, enabled: checked })}
                            color="primary"
                        />
                    }
                    label={I18n.t('wm_Enabled')}
                    sx={{ mb: 2, mt: 1 }}
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
                    </ToggleButtonGroup>
                </Box>

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
                        >
                            <ToggleButton value={0}>{I18n.t('wm_Off')}</ToggleButton>
                            <ToggleButton value={1}>1h</ToggleButton>
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
                        local.chartHours === settings.chartHours
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
