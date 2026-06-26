import React, { useState } from 'react';
import { Box, Button, Dialog, DialogContent, DialogTitle, Divider, IconButton, List, ListItemButton, ListItemIcon, ListItemText, TextField, } from '@mui/material';
import { AccessTime, Air, Bolt, Close, CreateNewFolder, Dashboard, Extension, Language, People, Speed, WbCloudy, WrapText, } from '@mui/icons-material';
import { I18n, Icon } from '@iobroker/adapter-react-v5';
import { resolveTranslated } from './Widgets';
const CUSTOM_WIDGETS = [
    {
        type: 'clock',
        icon: React.createElement(AccessTime, null),
        i18nKey: 'wm_Clock',
        descriptionKey: 'wm_Clock_desc',
    },
    {
        type: 'weather',
        icon: React.createElement(WbCloudy, null),
        i18nKey: 'wm_Weather',
        descriptionKey: 'wm_Weather_desc',
    },
    {
        type: 'iframe',
        icon: React.createElement(Language, null),
        i18nKey: 'wm_Iframe',
        descriptionKey: 'wm_Iframe_desc',
    },
    {
        type: 'wind',
        icon: React.createElement(Air, null),
        i18nKey: 'wm_Wind',
        descriptionKey: 'wm_Wind_desc',
    },
    {
        type: 'gauge',
        icon: React.createElement(Speed, null),
        i18nKey: 'wm_Gauge',
        descriptionKey: 'wm_Gauge_desc',
    },
    {
        type: 'universal',
        icon: React.createElement(Dashboard, null),
        i18nKey: 'wm_Universal',
        descriptionKey: 'wm_Universal_desc',
    },
    {
        type: 'presence',
        icon: React.createElement(People, null),
        i18nKey: 'wm_Presence',
        descriptionKey: 'wm_Presence_desc',
    },
    {
        type: 'energyFlow',
        icon: React.createElement(Bolt, null),
        i18nKey: 'wm_EnergyFlow',
        descriptionKey: 'wm_EnergyFlow_desc',
    },
    {
        type: 'newline',
        icon: React.createElement(WrapText, null),
        i18nKey: 'wm_New line',
        descriptionKey: 'wm_New line_desc',
    },
];
export default function CustomWidgetDialog(props) {
    const { open, onClose, onAdd, onCreateCategory, adapterWidgets, onAddPlugin } = props;
    const [showNameInput, setShowNameInput] = useState(false);
    const [categoryName, setCategoryName] = useState('');
    const handleClose = () => {
        setShowNameInput(false);
        setCategoryName('');
        onClose();
    };
    const handleCreateCategory = () => {
        const name = categoryName.trim();
        if (name && onCreateCategory) {
            onCreateCategory(name);
            handleClose();
        }
    };
    return (React.createElement(Dialog, { open: open, onClose: handleClose, maxWidth: "xs", fullWidth: true, slotProps: { paper: { sx: { borderRadius: '16px' } } } },
        React.createElement(DialogTitle, { sx: { display: 'flex', alignItems: 'center', pr: 6 } },
            I18n.t('wm_Add widget'),
            React.createElement(IconButton, { size: "small", onClick: handleClose, sx: { position: 'absolute', top: 8, right: 8 } },
                React.createElement(Close, { fontSize: "small" }))),
        React.createElement(DialogContent, { sx: { p: 0 } },
            React.createElement(List, null,
                onCreateCategory ? (React.createElement(React.Fragment, null,
                    showNameInput ? (React.createElement(Box, { sx: { px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 } },
                        React.createElement(TextField, { autoFocus: true, size: "small", fullWidth: true, placeholder: I18n.t('wm_Category name'), value: categoryName, onChange: e => setCategoryName(e.target.value), onKeyDown: e => {
                                if (e.key === 'Enter') {
                                    handleCreateCategory();
                                }
                            } }),
                        React.createElement(Button, { variant: "contained", size: "small", disabled: !categoryName.trim(), onClick: handleCreateCategory }, I18n.t('wm_Create')))) : (React.createElement(ListItemButton, { onClick: () => setShowNameInput(true) },
                        React.createElement(ListItemIcon, null,
                            React.createElement(CreateNewFolder, null)),
                        React.createElement(ListItemText, { primary: I18n.t('wm_Category'), secondary: I18n.t('wm_Category_desc') }))),
                    React.createElement(Divider, null))) : null,
                CUSTOM_WIDGETS.map(w => (React.createElement(ListItemButton, { key: w.type, onClick: () => {
                        onAdd(w.type);
                        handleClose();
                    } },
                    React.createElement(ListItemIcon, null, w.icon),
                    React.createElement(ListItemText, { primary: I18n.t(w.i18nKey), secondary: I18n.t(w.descriptionKey) })))),
                adapterWidgets && onAddPlugin && Object.keys(adapterWidgets).length > 0 ? (React.createElement(React.Fragment, null,
                    React.createElement(Divider, null),
                    Object.entries(adapterWidgets).flatMap(([adapter, desc]) => desc.components.map(comp => {
                        const label = resolveTranslated(comp.label, props.language);
                        const description = resolveTranslated(comp.description, props.language);
                        return (React.createElement(ListItemButton, { key: `${adapter}_${comp.name}`, onClick: () => {
                                onAddPlugin(adapter, comp.name, desc.url || 'customDevices.js', label || comp.name);
                                handleClose();
                            } },
                            React.createElement(ListItemIcon, null, comp.icon ? (comp.icon.startsWith('data:') || comp.icon.startsWith('http') ? (React.createElement(Icon, { src: comp.icon, alt: "", style: { width: 24, height: 24 } })) : (React.createElement(Icon, { src: props.admin
                                    ? `../../adapter/${adapter}/dm-widgets/${comp.icon}`
                                    : `../${adapter}.admin/dm-widgets/${comp.icon}`, alt: "", style: { width: 24, height: 24 } }))) : (React.createElement(Extension, null))),
                            React.createElement(ListItemText, { primary: label || comp.name, secondary: description || adapter })));
                    })))) : null))));
}
//# sourceMappingURL=CustomWidgetDialog.js.map