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
import { I18n } from '@iobroker/adapter-react-v5';

import type { WidgetSettings } from './Widgets/Generic';

interface WidgetSettingsDialogProps {
    open: boolean;
    widgetName: string;
    settings: WidgetSettings;
    onClose: () => void;
    onSave: (settings: WidgetSettings) => void;
}

export default function WidgetSettingsDialog(props: WidgetSettingsDialogProps): React.JSX.Element {
    const { open, widgetName, settings, onClose, onSave } = props;
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
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{I18n.t('wm_Cancel')}</Button>
                <Button
                    variant="contained"
                    onClick={() => onSave(local)}
                >
                    {I18n.t('wm_Save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
