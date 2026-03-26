import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import { AccessTime, Air, Close, Language, Speed, WbCloudy } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';

import type { CustomWidgetType } from '../../../src/widget-utils';

interface CustomWidgetOption {
    type: CustomWidgetType;
    icon: React.JSX.Element;
    i18nKey: string;
    descriptionKey: string;
}

const CUSTOM_WIDGETS: CustomWidgetOption[] = [
    {
        type: 'clock',
        icon: <AccessTime />,
        i18nKey: 'wm_Clock',
        descriptionKey: 'wm_Clock_desc',
    },
    {
        type: 'weather',
        icon: <WbCloudy />,
        i18nKey: 'wm_Weather',
        descriptionKey: 'wm_Weather_desc',
    },
    {
        type: 'iframe',
        icon: <Language />,
        i18nKey: 'wm_Iframe',
        descriptionKey: 'wm_Iframe_desc',
    },
    {
        type: 'wind',
        icon: <Air />,
        i18nKey: 'wm_Wind',
        descriptionKey: 'wm_Wind_desc',
    },
    {
        type: 'gauge',
        icon: <Speed />,
        i18nKey: 'wm_Gauge',
        descriptionKey: 'wm_Gauge_desc',
    },
];

interface CustomWidgetDialogProps {
    open: boolean;
    onClose: () => void;
    onAdd: (type: CustomWidgetType) => void;
}

export default function CustomWidgetDialog(props: CustomWidgetDialogProps): React.JSX.Element {
    const { open, onClose, onAdd } = props;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            slotProps={{ paper: { sx: { borderRadius: '16px' } } }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', pr: 6 }}>
                {I18n.t('wm_Add widget')}
                <IconButton
                    size="small"
                    onClick={onClose}
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                >
                    <Close fontSize="small" />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 0 }}>
                <List>
                    {CUSTOM_WIDGETS.map(w => (
                        <ListItemButton
                            key={w.type}
                            onClick={() => {
                                onAdd(w.type);
                                onClose();
                            }}
                        >
                            <ListItemIcon>{w.icon}</ListItemIcon>
                            <ListItemText
                                primary={I18n.t(w.i18nKey)}
                                secondary={I18n.t(w.descriptionKey)}
                            />
                        </ListItemButton>
                    ))}
                </List>
            </DialogContent>
        </Dialog>
    );
}
