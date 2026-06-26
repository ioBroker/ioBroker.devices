import React, { useState, useRef } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, SvgIcon, ToggleButton, ToggleButtonGroup, Tooltip, Typography, } from '@mui/material';
import { Close, CloudUpload, Delete, FolderOpen, GridView } from '@mui/icons-material';
import { I18n, Icon, DialogSelectFile } from '@iobroker/adapter-react-v5';
import { PREDEFINED_ICONS, ICON_CATEGORIES, pathToDataUri } from './predefinedIcons';
/** Inline SVG icon rendered from a path string – used for the predefined grid */
function PathIcon({ d, size = 24 }) {
    return (React.createElement(SvgIcon, { sx: { fontSize: size }, viewBox: "0 0 24 24" },
        React.createElement("path", { d: d })));
}
export default function IconPickerDialog(props) {
    const { open, title, value, onClose, onSelect, socket, theme, admin } = props;
    const [source, setSource] = useState('predefined');
    const [fileDialogOpen, setFileDialogOpen] = useState(false);
    const fileInputRef = useRef(null);
    const handleUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            onSelect(reader.result);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };
    const handleFileSelected = (selected) => {
        setFileDialogOpen(false);
        if (!selected) {
            return;
        }
        const filePath = Array.isArray(selected) ? selected[0] : selected;
        if (filePath) {
            const clean = filePath.startsWith('/') ? filePath.substring(1) : filePath;
            // Store as URL path (not base64) for ioBroker files
            onSelect(clean);
        }
    };
    const handlePredefinedSelect = (icon) => {
        onSelect(pathToDataUri(icon.path));
    };
    return (React.createElement(React.Fragment, null,
        React.createElement(Dialog, { open: open, onClose: onClose, maxWidth: "xs", fullWidth: true },
            React.createElement(DialogTitle, null, title),
            React.createElement(DialogContent, null,
                value ? (React.createElement(Box, { sx: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 2,
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                    } },
                    React.createElement(Icon, { src: value, style: { width: 32, height: 32 } }),
                    React.createElement(Typography, { variant: "body2", sx: { flex: 1, color: 'text.secondary' } }, I18n.t('wm_Current icon')),
                    React.createElement(IconButton, { size: "small", onClick: () => onSelect('') },
                        React.createElement(Delete, { fontSize: "small" })))) : null,
                React.createElement(ToggleButtonGroup, { value: source, exclusive: true, onChange: (_, v) => {
                        if (v) {
                            setSource(v);
                        }
                    }, size: "small", fullWidth: true, sx: { mb: 2 } },
                    React.createElement(ToggleButton, { value: "predefined" },
                        React.createElement(GridView, { sx: { fontSize: 16, mr: 0.5 } }),
                        I18n.t('wm_Predefined')),
                    React.createElement(ToggleButton, { value: "upload" },
                        React.createElement(CloudUpload, { sx: { fontSize: 16, mr: 0.5 } }),
                        I18n.t('wm_Upload')),
                    React.createElement(ToggleButton, { value: "iobroker" },
                        React.createElement(FolderOpen, { sx: { fontSize: 16, mr: 0.5 } }),
                        "ioBroker")),
                source === 'predefined' ? (React.createElement(Box, { sx: { maxHeight: 300, overflowY: 'auto' } }, ICON_CATEGORIES.map(cat => {
                    const icons = PREDEFINED_ICONS.filter(i => i.category === cat.id);
                    if (!icons.length) {
                        return null;
                    }
                    return (React.createElement(Box, { key: cat.id, sx: { mb: 1.5 } },
                        React.createElement(Typography, { variant: "caption", sx: { color: 'text.secondary', fontWeight: 500, display: 'block', mb: 0.5 } }, I18n.t(cat.label)),
                        React.createElement(Box, { sx: { display: 'flex', flexWrap: 'wrap', gap: 0.5 } }, icons.map(icon => {
                            const iconUri = pathToDataUri(icon.path);
                            const selected = value === iconUri;
                            return (React.createElement(Tooltip, { key: icon.id, title: icon.label },
                                React.createElement(Box, { onClick: () => handlePredefinedSelect(icon), sx: t => ({
                                        width: 36,
                                        height: 36,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: 1,
                                        cursor: 'pointer',
                                        border: `2px solid ${selected ? t.palette.primary.main : 'transparent'}`,
                                        bgcolor: selected ? 'action.selected' : 'action.hover',
                                        '&:hover': { bgcolor: 'action.focus' },
                                    }) },
                                    React.createElement(PathIcon, { d: icon.path, size: 22 }))));
                        }))));
                }))) : null,
                source === 'upload' ? (React.createElement(Box, { sx: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 3 } },
                    React.createElement(Button, { variant: "outlined", startIcon: React.createElement(CloudUpload, null), onClick: () => fileInputRef.current?.click() }, I18n.t('wm_Upload')),
                    React.createElement(Typography, { variant: "caption", sx: { color: 'text.secondary' } }, "SVG, PNG, JPG"),
                    React.createElement("input", { ref: fileInputRef, type: "file", accept: "image/*,.svg", style: { display: 'none' }, onChange: handleUpload }))) : null,
                source === 'iobroker' ? (React.createElement(Box, { sx: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 3 } },
                    React.createElement(Button, { variant: "outlined", startIcon: React.createElement(FolderOpen, null), onClick: () => setFileDialogOpen(true) }, I18n.t('wm_Browse')),
                    React.createElement(Typography, { variant: "caption", sx: { color: 'text.secondary' } }, I18n.t('wm_Browse ioBroker')))) : null),
            React.createElement(DialogActions, null,
                React.createElement(Button, { color: "grey", startIcon: React.createElement(Close, null), onClick: onClose }, I18n.t('wm_Cancel')))),
        fileDialogOpen ? (React.createElement(DialogSelectFile, { socket: socket, theme: theme, imagePrefix: admin ? '../../files/' : '../', filterByType: "images", onClose: () => setFileDialogOpen(false), onOk: handleFileSelected, allowNonRestricted: true, allowUpload: true, allowDownload: true, allowCreateFolder: true, allowDelete: true, allowView: true, showToolbar: true, restrictToFolder: props.instance })) : null));
}
//# sourceMappingURL=IconPickerDialog.js.map