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
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { Close, Delete, Save } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';

import type { CustomWidgetDef } from '../../../src/widget-utils';

const TYPE_NAME_MAP: Record<string, string> = {
    clock: 'wm_Clock',
};

interface CustomWidgetSettingsDialogProps {
    open: boolean;
    widgetDef: CustomWidgetDef | null;
    onClose: () => void;
    onSave: (def: CustomWidgetDef) => void;
    onDelete: () => void;
}

export default function CustomWidgetSettingsDialog(props: CustomWidgetSettingsDialogProps): React.JSX.Element | null {
    const { open, widgetDef, onClose, onSave, onDelete } = props;
    const [size, setSize] = useState<'1x1' | '2x0.5' | '2x1'>('1x1');
    const [color, setColor] = useState('');
    const [style, setStyle] = useState('');
    const [showDate, setShowDate] = useState(true);
    const [showDow, setShowDow] = useState(true);
    const [showSeconds, setShowSeconds] = useState(true);

    useEffect(() => {
        if (open && widgetDef) {
            setSize(widgetDef.size || '1x1');
            setColor(widgetDef.color || '');
            setStyle(widgetDef.style || '');
            setShowDate(widgetDef.showDate !== false);
            setShowDow(widgetDef.showDow !== false);
            setShowSeconds(widgetDef.showSeconds !== false);
        }
    }, [open, widgetDef]);

    if (!widgetDef) {
        return null;
    }

    const hasChanges =
        size !== (widgetDef.size || '1x1') ||
        color !== (widgetDef.color || '') ||
        style !== (widgetDef.style || '') ||
        showDate !== (widgetDef.showDate !== false) ||
        showDow !== (widgetDef.showDow !== false) ||
        showSeconds !== (widgetDef.showSeconds !== false);
    const typeName = I18n.t(TYPE_NAME_MAP[widgetDef.type] || widgetDef.type);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
        >
            <DialogTitle>{typeName}</DialogTitle>
            <DialogContent>
                <Box sx={{ mb: 2, mt: 1 }}>
                    <Typography
                        variant="body2"
                        sx={{ mb: 1, fontWeight: 500 }}
                    >
                        {I18n.t('wm_Size')}
                    </Typography>
                    <ToggleButtonGroup
                        value={size}
                        exclusive
                        onChange={(_, v) => {
                            if (v) {
                                setSize(v);
                            }
                        }}
                        size="small"
                    >
                        <ToggleButton value="1x1">1&#xD7;1</ToggleButton>
                        <ToggleButton value="2x0.5">2&#xD7;&#xBD;</ToggleButton>
                        <ToggleButton value="2x1">2&#xD7;1</ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                <Box sx={{ mb: 3 }}>
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
                            value={color || '#1976d2'}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setColor(e.target.value)}
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
                        {color ? (
                            <IconButton
                                size="small"
                                onClick={() => setColor('')}
                            >
                                <Delete fontSize="small" />
                            </IconButton>
                        ) : null}
                    </Box>
                </Box>

                {widgetDef.type === 'clock' ? (
                    <>
                        <Box sx={{ mb: 2 }}>
                            <Typography
                                variant="body2"
                                sx={{ mb: 1, fontWeight: 500 }}
                            >
                                {I18n.t('wm_Style')}
                            </Typography>
                            <ToggleButtonGroup
                                value={style || 'digital'}
                                exclusive
                                onChange={(_, v) => {
                                    if (v) {
                                        setStyle(v === 'digital' ? '' : v);
                                    }
                                }}
                                size="small"
                            >
                                <ToggleButton value="digital">{I18n.t('wm_Digital')}</ToggleButton>
                                <ToggleButton value="analog">{I18n.t('wm_Analog')}</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>
                        <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column' }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={showDate}
                                        onChange={(_e, v) => setShowDate(v)}
                                        size="small"
                                    />
                                }
                                label={I18n.t('wm_Show date')}
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={showDow}
                                        onChange={(_e, v) => setShowDow(v)}
                                        size="small"
                                    />
                                }
                                label={I18n.t('wm_Show DOW')}
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={showSeconds}
                                        onChange={(_e, v) => setShowSeconds(v)}
                                        size="small"
                                    />
                                }
                                label={I18n.t('wm_Show seconds')}
                            />
                        </Box>
                    </>
                ) : null}

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
                    onClick={() =>
                        onSave({
                            ...widgetDef,
                            size,
                            color: color || undefined,
                            style: style || undefined,
                            showDate: showDate ? undefined : false,
                            showDow: showDow ? undefined : false,
                            showSeconds: showSeconds ? undefined : false,
                        })
                    }
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
