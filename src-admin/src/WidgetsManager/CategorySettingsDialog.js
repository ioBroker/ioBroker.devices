import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, MenuItem, Slider, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography, } from '@mui/material';
import { CameraAlt, Close, Delete, Save, CloudUpload, FolderOpen } from '@mui/icons-material';
import { I18n, Icon, DialogSelectFile } from '@iobroker/adapter-react-v5';
import IconPickerDialog from './IconPickerDialog';
export const DEFAULT_CATEGORY_SETTINGS = {
    name: '',
    color: '',
    backgroundColor: '',
    image: '',
    imageScope: 'header',
};
export default function CategorySettingsDialog(props) {
    const { open, categoryName, categoryId, settings, onClose, onSave, theme, categoryOptions, stateContext } = props;
    // In admin, files are served under /files/, in web they are at root
    const [local, setLocal] = useState(settings);
    const [preview, setPreview] = useState('');
    const [iconPreview, setIconPreview] = useState('');
    const [rootIconPreview, setRootIconPreview] = useState('');
    const [cameraOpen, setCameraOpen] = useState(false);
    const [fileDialogOpen, setFileDialogOpen] = useState(false);
    const [iconFileDialogOpen, setIconFileDialogOpen] = useState(false);
    const [iconPickerOpen, setIconPickerOpen] = useState(false);
    const [rootIconPickerOpen, setRootIconPickerOpen] = useState(false);
    const [hideConfigWarning, setHideConfigWarning] = useState(false);
    const [widgetScale, setWidgetScale] = useState(() => {
        const stored = localStorage.getItem('wm_widgetScale');
        return stored ? Number(stored) : 100;
    });
    const fileInputRef = useRef(null);
    const iconInputRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    useEffect(() => {
        if (open) {
            setLocal({
                ...settings,
                name: settings.name || categoryName,
            });
            // Stored path has no prefix; add prefix for display
            const img = settings.image || '';
            setPreview(img ? `/${stateContext.imagePrefix}${img.replace(/^\//, '')}` : '');
            const ico = settings.icon || '';
            setIconPreview(ico ? `/${stateContext.imagePrefix}${ico.replace(/^\//, '')}` : '');
            const rIco = settings.rootIcon || '';
            setRootIconPreview(rIco ? `/${stateContext.imagePrefix}${rIco.replace(/^\//, '')}` : '');
        }
    }, [settings, open, categoryName, stateContext.imagePrefix]);
    const processImage = useCallback(async (dataUrl) => {
        const img = new Image();
        img.src = dataUrl;
        await new Promise(resolve => {
            img.onload = () => resolve();
        });
        const maxW = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxW) {
            h = Math.round(h * (maxW / w));
            w = maxW;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const webpDataUrl = canvas.toDataURL('image/webp', 0.8);
        const base64 = webpDataUrl.replace(/^data:image\/webp;base64,/, '');
        const fileName = `category_${String(categoryId).replace(/[^a-zA-Z0-9_-]/g, '_')}.webp`;
        try {
            await stateContext.getSocket().writeFile64(stateContext.instanceId, fileName, base64);
            // Store without prefix so the same path works in admin and web
            const storedPath = `/${stateContext.instanceId}/${fileName}`;
            setPreview(`/${stateContext.imagePrefix}${stateContext.instanceId}/${fileName}?t=${Date.now()}`);
            setLocal(prev => ({ ...prev, image: storedPath }));
        }
        catch (err) {
            console.error('Failed to upload category image:', err);
        }
    }, 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categoryId, stateContext, stateContext.instanceId]);
    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            void processImage(ev.target?.result);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };
    const handleDeleteImage = () => {
        setPreview('');
        setLocal(prev => ({ ...prev, image: '' }));
    };
    // --- Icon (PWA / Chrome extension) ---
    const processIcon = useCallback(async (dataUrl) => {
        const img = new Image();
        img.src = dataUrl;
        await new Promise(resolve => {
            img.onload = () => resolve();
        });
        // Resize to 512x512 square for PWA
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        // Center-crop to square
        const srcSize = Math.min(img.width, img.height);
        const sx = (img.width - srcSize) / 2;
        const sy = (img.height - srcSize) / 2;
        ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, size, size);
        const pngDataUrl = canvas.toDataURL('image/png');
        const base64 = pngDataUrl.replace(/^data:image\/png;base64,/, '');
        const fileName = 'pwa_icon.png';
        try {
            await stateContext.getSocket().writeFile64(stateContext.instanceId, fileName, base64);
            const storedPath = `/${stateContext.instanceId}/${fileName}`;
            setIconPreview(`/${stateContext.imagePrefix}${stateContext.instanceId}/${fileName}?t=${Date.now()}`);
            setLocal(prev => ({ ...prev, icon: storedPath }));
        }
        catch (err) {
            console.error('Failed to upload icon:', err);
        }
    }, 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stateContext, stateContext.imagePrefix]);
    const handleIconUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            void processIcon(ev.target?.result);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };
    const handleIconFileSelected = (selected) => {
        setIconFileDialogOpen(false);
        if (!selected) {
            return;
        }
        const filePath = Array.isArray(selected) ? selected[0] : selected;
        if (filePath) {
            const clean = filePath.startsWith('/') ? filePath.substring(1) : filePath;
            const storedPath = `/${clean}`;
            setIconPreview(`/${stateContext.imagePrefix}${clean}`);
            setLocal(prev => ({ ...prev, icon: storedPath }));
        }
    };
    const handleDeleteIcon = () => {
        setIconPreview('');
        setLocal(prev => ({ ...prev, icon: '' }));
    };
    // --- Camera ---
    const cameraAvailable = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext !== false;
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            for (const track of streamRef.current.getTracks()) {
                track.stop();
            }
            streamRef.current = null;
        }
    }, []);
    const openCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 } },
            });
            streamRef.current = stream;
            setCameraOpen(true);
            // Attach stream after dialog renders
            requestAnimationFrame(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            });
        }
        catch (err) {
            console.error('Camera access denied:', err);
        }
    };
    const takePhoto = () => {
        const video = videoRef.current;
        if (!video) {
            return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        stopCamera();
        setCameraOpen(false);
        void processImage(dataUrl);
    };
    const closeCamera = () => {
        stopCamera();
        setCameraOpen(false);
    };
    // --- File Dialog ---
    const handleFileSelected = (selected) => {
        setFileDialogOpen(false);
        if (!selected) {
            return;
        }
        const filePath = Array.isArray(selected) ? selected[0] : selected;
        if (filePath) {
            // DialogSelectFile returns paths like "adapter.0/file.png"
            const clean = filePath.startsWith('/') ? filePath.substring(1) : filePath;
            // Store without prefix, display with prefix
            const storedPath = `/${clean}`;
            setPreview(`/${stateContext.imagePrefix}${clean}`);
            setLocal(prev => ({ ...prev, image: storedPath }));
        }
    };
    // Stop camera when main dialog closes
    useEffect(() => {
        if (!open) {
            stopCamera();
            setCameraOpen(false);
            setFileDialogOpen(false);
        }
    }, [open, stopCamera]);
    const isRoot = categoryId === '__root__';
    const hasChanges = local.name !== (settings.name || categoryName) ||
        local.color !== (settings.color || '') ||
        local.backgroundColor !== (settings.backgroundColor || '') ||
        local.image !== (settings.image || '') ||
        local.imageScope !== (settings.imageScope || 'header') ||
        (isRoot && !!local.hideConfigButton !== !!settings.hideConfigButton) ||
        (isRoot && (local.wmTheme || 'auto') !== (settings.wmTheme || 'auto')) ||
        (isRoot && (local.defaultCategory || '') !== (settings.defaultCategory || '')) ||
        (local.icon || '') !== (settings.icon || '') ||
        (local.rootIcon || '') !== (settings.rootIcon || '');
    const icon = stateContext.getImagePath(local.icon);
    return (React.createElement(React.Fragment, null,
        React.createElement(Dialog, { open: open, onClose: onClose, maxWidth: "xs", fullWidth: true },
            React.createElement(DialogTitle, null, categoryName),
            React.createElement(DialogContent, null,
                React.createElement(TextField, { fullWidth: true, variant: "filled", label: I18n.t('wm_Name'), value: local.name, onChange: e => setLocal({ ...local, name: e.target.value }), placeholder: categoryName, size: "small", sx: { mt: 1, mb: 2 } }),
                React.createElement(Box, { sx: { mb: 2 } },
                    React.createElement(Typography, { variant: "body2", sx: { mb: 1, fontWeight: 500 } }, I18n.t('wm_Color')),
                    React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
                        React.createElement(Box, { component: "input", type: "color", value: local.color || '#1976d2', onChange: (e) => setLocal({ ...local, color: e.target.value }), sx: {
                                width: 40,
                                height: 40,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                cursor: 'pointer',
                                p: '2px',
                                backgroundColor: 'transparent',
                            } }),
                        local.color ? (React.createElement(IconButton, { size: "small", onClick: () => setLocal({ ...local, color: '' }) },
                            React.createElement(Delete, { fontSize: "small" }))) : null)),
                React.createElement(Box, { sx: { mb: 2 } },
                    React.createElement(Typography, { variant: "body2", sx: { mb: 1, fontWeight: 500 } }, I18n.t('wm_Background color')),
                    React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
                        React.createElement(Box, { component: "input", type: "color", value: local.backgroundColor || '#121212', onChange: (e) => setLocal({ ...local, backgroundColor: e.target.value }), sx: {
                                width: 40,
                                height: 40,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                cursor: 'pointer',
                                p: '2px',
                                backgroundColor: 'transparent',
                            } }),
                        local.backgroundColor ? (React.createElement(IconButton, { size: "small", onClick: () => setLocal({ ...local, backgroundColor: '' }) },
                            React.createElement(Delete, { fontSize: "small" }))) : null)),
                React.createElement(Box, { sx: { mb: 2 } },
                    React.createElement(Typography, { variant: "body2", sx: { mb: 1, fontWeight: 500 } }, I18n.t('wm_Background image')),
                    React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
                        React.createElement(Button, { variant: "outlined", size: "small", startIcon: React.createElement(CloudUpload, null), onClick: () => fileInputRef.current?.click(), sx: { textTransform: 'none', flex: 1 } }, I18n.t('wm_Upload')),
                        React.createElement(Tooltip, { title: cameraAvailable ? '' : I18n.t('wm_Camera requires HTTPS'), arrow: true },
                            React.createElement("span", { style: { flex: 1 } },
                                React.createElement(Button, { variant: "outlined", size: "small", startIcon: React.createElement(CameraAlt, null), onClick: () => void openCamera(), disabled: !cameraAvailable, sx: { textTransform: 'none', width: '100%' } }, I18n.t('wm_Take photo')))),
                        React.createElement(Button, { variant: "outlined", size: "small", startIcon: React.createElement(FolderOpen, null), onClick: () => setFileDialogOpen(true), sx: { textTransform: 'none', flex: 1 } }, I18n.t('wm_Browse')),
                        React.createElement("input", { ref: fileInputRef, type: "file", accept: "image/*", style: { display: 'none' }, onChange: handleImageUpload }),
                        preview ? (React.createElement(IconButton, { size: "small", onClick: handleDeleteImage },
                            React.createElement(Delete, { fontSize: "small" }))) : null),
                    preview ? (React.createElement(Box, { component: "img", src: preview, sx: {
                            mt: 1,
                            width: '100%',
                            maxHeight: 120,
                            objectFit: 'cover',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                        } })) : null),
                preview ? (React.createElement(Box, null,
                    React.createElement(Typography, { variant: "body2", sx: { mb: 1, fontWeight: 500 } }, I18n.t('wm_Image scope')),
                    React.createElement(ToggleButtonGroup, { value: local.imageScope, exclusive: true, onChange: (_, value) => {
                            if (value) {
                                setLocal({ ...local, imageScope: value });
                            }
                        }, size: "small" },
                        React.createElement(ToggleButton, { value: "header" }, I18n.t('wm_Header only')),
                        React.createElement(ToggleButton, { value: "page" }, I18n.t('wm_Whole page'))))) : null,
                !isRoot ? (React.createElement(Box, { sx: { mt: 2 } },
                    React.createElement(Typography, { variant: "body2", sx: { mb: 1, fontWeight: 500 } }, I18n.t('wm_Icons')),
                    React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
                        React.createElement(Box, { onClick: () => setIconPickerOpen(true), sx: {
                                width: 48,
                                height: 48,
                                borderRadius: 1,
                                border: '2px dashed',
                                borderColor: 'divider',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                '&:hover': { borderColor: 'primary.main' },
                            } }, icon ? (React.createElement(Icon, { src: icon, style: { width: 32, height: 32 } })) : (React.createElement(CloudUpload, { sx: { fontSize: 24, color: 'text.disabled' } }))),
                        icon ? (React.createElement(IconButton, { size: "small", onClick: () => setLocal(prev => ({ ...prev, icon: '' })) },
                            React.createElement(Delete, { fontSize: "small" }))) : null))) : null,
                isRoot ? (React.createElement(TextField, { select: true, fullWidth: true, variant: "filled", size: "small", label: I18n.t('wm_Theme'), value: local.wmTheme || 'auto', onChange: e => setLocal({ ...local, wmTheme: e.target.value }), sx: { mt: 2 } },
                    React.createElement(MenuItem, { value: "auto" }, I18n.t('wm_theme_auto')),
                    React.createElement(MenuItem, { value: "dark" }, I18n.t('wm_theme_dark')),
                    React.createElement(MenuItem, { value: "light" }, I18n.t('wm_theme_light')),
                    React.createElement(MenuItem, { value: "orangeDark" }, I18n.t('wm_theme_orangeDark')),
                    React.createElement(MenuItem, { value: "blueDark" }, I18n.t('wm_theme_blueDark')),
                    React.createElement(MenuItem, { value: "styling-grey" }, I18n.t('wm_theme_styling-grey')))) : null,
                isRoot ? (React.createElement(Box, { sx: { mt: 2 } },
                    React.createElement(Typography, { variant: "body2", sx: { color: 'text.secondary', mb: 0.5 } },
                        I18n.t('wm_Widget size'),
                        ': ',
                        widgetScale,
                        "%"),
                    React.createElement(Slider, { value: widgetScale, min: 80, max: 200, step: 5, onChange: (_e, val) => {
                            const v = val;
                            setWidgetScale(v);
                            localStorage.setItem('wm_widgetScale', String(v));
                            window.dispatchEvent(new Event('wm_widgetScaleChanged'));
                        }, valueLabelDisplay: "auto", valueLabelFormat: v => `${v}%`, marks: [
                            { value: 80, label: '80%' },
                            { value: 100, label: '100%' },
                            { value: 150, label: '150%' },
                            { value: 200, label: '200%' },
                        ] }))) : null,
                isRoot && categoryOptions ? (React.createElement(TextField, { select: true, fullWidth: true, variant: "filled", size: "small", label: I18n.t('wm_Default category'), value: local.defaultCategory || '', onChange: e => setLocal({ ...local, defaultCategory: e.target.value || '' }), sx: { mt: 2 } },
                    React.createElement(MenuItem, { value: "" }, I18n.t('wm_None (root)')),
                    categoryOptions.map(opt => (React.createElement(MenuItem, { key: opt.id, value: opt.id },
                        React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
                            opt.icon ? (React.createElement(Icon, { src: opt.icon, style: { width: 20, height: 20, flexShrink: 0 } })) : null,
                            React.createElement("span", null, opt.label))))))) : null,
                isRoot ? (React.createElement(FormControlLabel, { control: React.createElement(Checkbox, { checked: !!local.hideConfigButton, onChange: (_e, v) => {
                            if (v && !stateContext.admin) {
                                setHideConfigWarning(true);
                            }
                            else {
                                setLocal({ ...local, hideConfigButton: v });
                            }
                        }, size: "small" }), label: I18n.t('wm_Hide config button'), sx: { mt: 1 } })) : null,
                isRoot ? (React.createElement(Box, { sx: { mt: 2 } },
                    React.createElement(Tooltip, { title: I18n.t('wm_App icon tooltip') },
                        React.createElement(Typography, { variant: "body2", sx: { mb: 1, fontWeight: 500 } }, I18n.t('wm_App icon'))),
                    React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
                        iconPreview ? (React.createElement(Box, { component: "img", src: iconPreview, sx: {
                                width: 48,
                                height: 48,
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                objectFit: 'cover',
                            } })) : null,
                        React.createElement(Button, { variant: "outlined", size: "small", startIcon: React.createElement(CloudUpload, null), onClick: () => iconInputRef.current?.click(), sx: { textTransform: 'none' } }, I18n.t('wm_Upload')),
                        React.createElement(Button, { variant: "outlined", size: "small", startIcon: React.createElement(FolderOpen, null), onClick: () => setIconFileDialogOpen(true), sx: { textTransform: 'none' } }, I18n.t('wm_Browse')),
                        React.createElement("input", { ref: iconInputRef, type: "file", accept: "image/*", style: { display: 'none' }, onChange: handleIconUpload }),
                        iconPreview ? (React.createElement(IconButton, { size: "small", onClick: handleDeleteIcon },
                            React.createElement(Delete, { fontSize: "small" }))) : null))) : null,
                isRoot ? (React.createElement(Box, { sx: { mt: 2 } },
                    React.createElement(Typography, { variant: "body2", sx: { mb: 1, fontWeight: 500 } }, I18n.t('wm_Root icon')),
                    React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
                        rootIconPreview ? (React.createElement(Icon, { src: rootIconPreview, style: {
                                width: 36,
                                height: 36,
                            } })) : null,
                        React.createElement(Button, { variant: "outlined", size: "small", startIcon: React.createElement(FolderOpen, null), onClick: () => setRootIconPickerOpen(true), sx: { textTransform: 'none' } }, I18n.t('wm_Browse')),
                        rootIconPreview ? (React.createElement(IconButton, { size: "small", onClick: () => {
                                setRootIconPreview('');
                                setLocal(prev => ({ ...prev, rootIcon: '' }));
                            } },
                            React.createElement(Delete, { fontSize: "small" }))) : null))) : null),
            React.createElement(DialogActions, null,
                React.createElement(Button, { variant: "contained", disabled: !hasChanges, startIcon: React.createElement(Save, null), onClick: () => onSave(local) }, I18n.t('wm_Save')),
                React.createElement(Button, { color: "grey", startIcon: React.createElement(Close, null), onClick: onClose }, I18n.t('wm_Cancel')))),
        fileDialogOpen ? (React.createElement(DialogSelectFile, { socket: stateContext.getSocket(), theme: theme, imagePrefix: stateContext.imagePrefix, filterByType: "images", onClose: () => setFileDialogOpen(false), onOk: handleFileSelected, allowNonRestricted: true, allowUpload: true, allowDownload: true, allowCreateFolder: true, allowDelete: true, allowView: true, showToolbar: true, restrictToFolder: stateContext.instanceId })) : null,
        iconPickerOpen ? (React.createElement(IconPickerDialog, { open: true, title: I18n.t('wm_Icons'), value: local.icon || '', onClose: () => setIconPickerOpen(false), onSelect: iconValue => {
                setLocal(prev => ({ ...prev, icon: iconValue }));
                if (iconValue) {
                    setIconPickerOpen(false);
                }
            }, socket: stateContext.getSocket(), theme: theme, admin: stateContext.admin, instance: stateContext.instanceId })) : null,
        rootIconPickerOpen ? (React.createElement(IconPickerDialog, { open: true, title: I18n.t('wm_Root icon'), value: local.rootIcon || '', onClose: () => setRootIconPickerOpen(false), onSelect: iconValue => {
                setLocal(prev => ({ ...prev, rootIcon: iconValue }));
                const displayPath = iconValue
                    ? `/${stateContext.imagePrefix}${iconValue.replace(/^\//, '')}`
                    : '';
                setRootIconPreview(displayPath);
                if (iconValue) {
                    setRootIconPickerOpen(false);
                }
            }, socket: stateContext.getSocket(), instance: stateContext.instanceId, theme: theme, admin: stateContext.admin })) : null,
        iconFileDialogOpen ? (React.createElement(DialogSelectFile, { socket: stateContext.getSocket(), theme: theme, imagePrefix: stateContext.imagePrefix, filterByType: "images", onClose: () => setIconFileDialogOpen(false), onOk: handleIconFileSelected, allowNonRestricted: true, allowUpload: true, allowDownload: true, allowCreateFolder: true, allowDelete: true, allowView: true, showToolbar: true, restrictToFolder: stateContext.instanceId })) : null,
        React.createElement(Dialog, { open: cameraOpen, onClose: closeCamera, maxWidth: "sm", fullWidth: true },
            React.createElement(DialogTitle, null, I18n.t('wm_Take photo')),
            React.createElement(DialogContent, { sx: { p: 0, display: 'flex', justifyContent: 'center', backgroundColor: 'black' } },
                React.createElement(Box, { component: "video", ref: videoRef, autoPlay: true, playsInline: true, muted: true, sx: { width: '100%', maxHeight: '60vh', objectFit: 'contain' } })),
            React.createElement(DialogActions, null,
                React.createElement(Button, { variant: "contained", startIcon: React.createElement(CameraAlt, null), onClick: takePhoto }, I18n.t('wm_Capture')),
                React.createElement(Button, { color: "grey", startIcon: React.createElement(Close, null), onClick: closeCamera }, I18n.t('wm_Cancel')))),
        React.createElement(Dialog, { open: hideConfigWarning, onClose: () => setHideConfigWarning(false), maxWidth: "xs" },
            React.createElement(DialogTitle, null, I18n.t('wm_Warning')),
            React.createElement(DialogContent, null,
                React.createElement(Typography, null, I18n.t('wm_Hide config warning'))),
            React.createElement(DialogActions, null,
                React.createElement(Button, { onClick: () => {
                        setLocal(prev => ({ ...prev, hideConfigButton: true }));
                        setHideConfigWarning(false);
                    }, color: "warning" }, I18n.t('wm_OK')),
                React.createElement(Button, { onClick: () => setHideConfigWarning(false) }, I18n.t('wm_Cancel'))))));
}
//# sourceMappingURL=CategorySettingsDialog.js.map