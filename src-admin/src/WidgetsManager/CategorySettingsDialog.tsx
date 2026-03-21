import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import { CameraAlt, Close, Delete, Save, CloudUpload, FolderOpen } from '@mui/icons-material';
import { I18n, Icon, type Connection, type IobTheme, DialogSelectFile } from '@iobroker/adapter-react-v5';

import type { CustomWidgetDef } from '../../../src/widget-utils';
import type { WidgetGroup } from './groupUtils';
import IconPickerDialog from './IconPickerDialog';

/** Available theme presets */
export type WmThemeId = 'auto' | 'dark' | 'light' | 'orangeDark' | 'blueDark';

export interface CategorySettings {
    name: string;
    color: string;
    backgroundColor: string;
    image: string;
    /** 'header' = background only behind header, 'page' = background behind whole page */
    imageScope: 'header' | 'page';
    customWidgets?: CustomWidgetDef[];
    widgetOrder?: string[];
    widgetGroups?: WidgetGroup[];
    /** Hide the config/play toggle button (root category only) */
    hideConfigButton?: boolean;
    /** PWA / Chrome extension icon path — used as favicon in browser (root only) */
    icon?: string;
    /** Icon shown in front of the root category name (root only) */
    rootIcon?: string;
    /** Widget theme preset (root category only). Default: 'auto' (follows admin theme) */
    wmTheme?: WmThemeId;
    /** Default category ID to show when page loads without hash (root only) */
    defaultCategory?: string;
}

export const DEFAULT_CATEGORY_SETTINGS: CategorySettings = {
    name: '',
    color: '',
    backgroundColor: '',
    image: '',
    imageScope: 'header',
};

export interface CategoryOption {
    id: string;
    label: string;
    icon?: string;
}

interface CategorySettingsDialogProps {
    open: boolean;
    categoryName: string;
    categoryId: string;
    settings: CategorySettings;
    onClose: () => void;
    onSave: (settings: CategorySettings) => void;
    socket: Connection;
    instance: string;
    theme: IobTheme;
    /** true if running in admin, false if in web */
    admin: boolean;
    /** All available categories for the default-category picker (root only) */
    categoryOptions?: CategoryOption[];
}

export default function CategorySettingsDialog(props: CategorySettingsDialogProps): React.JSX.Element {
    const { open, categoryName, categoryId, settings, onClose, onSave, socket, instance, theme, admin, categoryOptions } = props;
    // In admin, files are served under /files/, in web they are at root
    const filePrefix = admin ? 'files/' : '';
    const [local, setLocal] = useState<CategorySettings>(settings);
    const [preview, setPreview] = useState<string>('');
    const [iconPreview, setIconPreview] = useState<string>('');
    const [rootIconPreview, setRootIconPreview] = useState<string>('');
    const [cameraOpen, setCameraOpen] = useState(false);
    const [fileDialogOpen, setFileDialogOpen] = useState(false);
    const [iconFileDialogOpen, setIconFileDialogOpen] = useState(false);
    const [iconPickerOpen, setIconPickerOpen] = useState(false);
    const [rootIconPickerOpen, setRootIconPickerOpen] = useState(false);
    const [hideConfigWarning, setHideConfigWarning] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const iconInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        if (open) {
            setLocal({
                ...settings,
                name: settings.name || categoryName,
            });
            // Stored path has no prefix; add prefix for display
            const img = settings.image || '';
            setPreview(img ? `/${filePrefix}${img.replace(/^\//, '')}` : '');
            const ico = settings.icon || '';
            setIconPreview(ico ? `/${filePrefix}${ico.replace(/^\//, '')}` : '');
            const rIco = settings.rootIcon || '';
            setRootIconPreview(rIco ? `/${filePrefix}${rIco.replace(/^\//, '')}` : '');
        }
    }, [settings, open, categoryName, filePrefix]);

    const processImage = useCallback(
        async (dataUrl: string): Promise<void> => {
            const img = new Image();
            img.src = dataUrl;
            await new Promise<void>(resolve => {
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
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, w, h);
            const webpDataUrl = canvas.toDataURL('image/webp', 0.8);
            const base64 = webpDataUrl.replace(/^data:image\/webp;base64,/, '');
            const fileName = `category_${String(categoryId).replace(/[^a-zA-Z0-9_-]/g, '_')}.webp`;

            try {
                await socket.writeFile64(instance, fileName, base64);
                // Store without prefix so the same path works in admin and web
                const storedPath = `/${instance}/${fileName}`;
                setPreview(`/${filePrefix}${instance}/${fileName}?t=${Date.now()}`);
                setLocal(prev => ({ ...prev, image: storedPath }));
            } catch (err) {
                console.error('Failed to upload category image:', err);
            }
        },
        [categoryId, socket, instance, filePrefix],
    );

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev: ProgressEvent<FileReader>): void => {
            void processImage(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleDeleteImage = (): void => {
        setPreview('');
        setLocal(prev => ({ ...prev, image: '' }));
    };

    // --- Icon (PWA / Chrome extension) ---

    const processIcon = useCallback(
        async (dataUrl: string): Promise<void> => {
            const img = new Image();
            img.src = dataUrl;
            await new Promise<void>(resolve => {
                img.onload = () => resolve();
            });
            // Resize to 512x512 square for PWA
            const size = 512;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d')!;
            // Center-crop to square
            const srcSize = Math.min(img.width, img.height);
            const sx = (img.width - srcSize) / 2;
            const sy = (img.height - srcSize) / 2;
            ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, size, size);
            const pngDataUrl = canvas.toDataURL('image/png');
            const base64 = pngDataUrl.replace(/^data:image\/png;base64,/, '');
            const fileName = 'pwa_icon.png';

            try {
                await socket.writeFile64(instance, fileName, base64);
                const storedPath = `/${instance}/${fileName}`;
                setIconPreview(`/${filePrefix}${instance}/${fileName}?t=${Date.now()}`);
                setLocal(prev => ({ ...prev, icon: storedPath }));
            } catch (err) {
                console.error('Failed to upload icon:', err);
            }
        },
        [socket, instance, filePrefix],
    );

    const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev: ProgressEvent<FileReader>): void => {
            void processIcon(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleIconFileSelected = (selected: string | string[] | undefined): void => {
        setIconFileDialogOpen(false);
        if (!selected) {
            return;
        }
        const filePath = Array.isArray(selected) ? selected[0] : selected;
        if (filePath) {
            const clean = filePath.startsWith('/') ? filePath.substring(1) : filePath;
            const storedPath = `/${clean}`;
            setIconPreview(`/${filePrefix}${clean}`);
            setLocal(prev => ({ ...prev, icon: storedPath }));
        }
    };

    const handleDeleteIcon = (): void => {
        setIconPreview('');
        setLocal(prev => ({ ...prev, icon: '' }));
    };

    // --- Camera ---

    const cameraAvailable =
        typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext !== false;

    const stopCamera = useCallback((): void => {
        if (streamRef.current) {
            for (const track of streamRef.current.getTracks()) {
                track.stop();
            }
            streamRef.current = null;
        }
    }, []);

    const openCamera = async (): Promise<void> => {
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
        } catch (err) {
            console.error('Camera access denied:', err);
        }
    };

    const takePhoto = (): void => {
        const video = videoRef.current;
        if (!video) {
            return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        stopCamera();
        setCameraOpen(false);
        void processImage(dataUrl);
    };

    const closeCamera = (): void => {
        stopCamera();
        setCameraOpen(false);
    };

    // --- File Dialog ---
    const handleFileSelected = (selected: string | string[] | undefined): void => {
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
            setPreview(`/${filePrefix}${clean}`);
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

    const hasChanges =
        local.name !== (settings.name || categoryName) ||
        local.color !== (settings.color || '') ||
        local.backgroundColor !== (settings.backgroundColor || '') ||
        local.image !== (settings.image || '') ||
        local.imageScope !== (settings.imageScope || 'header') ||
        (isRoot && !!local.hideConfigButton !== !!settings.hideConfigButton) ||
        (isRoot && (local.wmTheme || 'auto') !== (settings.wmTheme || 'auto')) ||
        (isRoot && (local.defaultCategory || '') !== (settings.defaultCategory || '')) ||
        (local.icon || '') !== (settings.icon || '') ||
        (local.rootIcon || '') !== (settings.rootIcon || '');

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>{categoryName}</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        variant="filled"
                        label={I18n.t('wm_Name')}
                        value={local.name}
                        onChange={e => setLocal({ ...local, name: e.target.value })}
                        placeholder={categoryName}
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

                    <Box sx={{ mb: 2 }}>
                        <Typography
                            variant="body2"
                            sx={{ mb: 1, fontWeight: 500 }}
                        >
                            {I18n.t('wm_Background color')}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                                component="input"
                                type="color"
                                value={local.backgroundColor || '#121212'}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setLocal({ ...local, backgroundColor: e.target.value })
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
                            {local.backgroundColor ? (
                                <IconButton
                                    size="small"
                                    onClick={() => setLocal({ ...local, backgroundColor: '' })}
                                >
                                    <Delete fontSize="small" />
                                </IconButton>
                            ) : null}
                        </Box>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                        <Typography
                            variant="body2"
                            sx={{ mb: 1, fontWeight: 500 }}
                        >
                            {I18n.t('wm_Background image')}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<CloudUpload />}
                                onClick={() => fileInputRef.current?.click()}
                                sx={{ textTransform: 'none', flex: 1 }}
                            >
                                {I18n.t('wm_Upload')}
                            </Button>
                            <Tooltip
                                title={cameraAvailable ? '' : I18n.t('wm_Camera requires HTTPS')}
                                arrow
                            >
                                <span style={{ flex: 1 }}>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<CameraAlt />}
                                        onClick={() => void openCamera()}
                                        disabled={!cameraAvailable}
                                        sx={{ textTransform: 'none', width: '100%' }}
                                    >
                                        {I18n.t('wm_Take photo')}
                                    </Button>
                                </span>
                            </Tooltip>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<FolderOpen />}
                                onClick={() => setFileDialogOpen(true)}
                                sx={{ textTransform: 'none', flex: 1 }}
                            >
                                {I18n.t('wm_Browse')}
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleImageUpload}
                            />
                            {preview ? (
                                <IconButton
                                    size="small"
                                    onClick={handleDeleteImage}
                                >
                                    <Delete fontSize="small" />
                                </IconButton>
                            ) : null}
                        </Box>
                        {preview ? (
                            <Box
                                component="img"
                                src={preview}
                                sx={{
                                    mt: 1,
                                    width: '100%',
                                    maxHeight: 120,
                                    objectFit: 'cover',
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                }}
                            />
                        ) : null}
                    </Box>

                    {preview ? (
                        <Box>
                            <Typography
                                variant="body2"
                                sx={{ mb: 1, fontWeight: 500 }}
                            >
                                {I18n.t('wm_Image scope')}
                            </Typography>
                            <ToggleButtonGroup
                                value={local.imageScope}
                                exclusive
                                onChange={(_, value) => {
                                    if (value) {
                                        setLocal({ ...local, imageScope: value });
                                    }
                                }}
                                size="small"
                            >
                                <ToggleButton value="header">{I18n.t('wm_Header only')}</ToggleButton>
                                <ToggleButton value="page">{I18n.t('wm_Whole page')}</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>
                    ) : null}
                    {!isRoot ? (
                        <Box sx={{ mt: 2 }}>
                            <Typography
                                variant="body2"
                                sx={{ mb: 1, fontWeight: 500 }}
                            >
                                {I18n.t('wm_Icons')}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box
                                    onClick={() => setIconPickerOpen(true)}
                                    sx={{
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
                                    }}
                                >
                                    {local.icon ? (
                                        <Icon
                                            src={local.icon}
                                            style={{ width: 32, height: 32 }}
                                        />
                                    ) : (
                                        <CloudUpload sx={{ fontSize: 24, color: 'text.disabled' }} />
                                    )}
                                </Box>
                                {local.icon ? (
                                    <IconButton
                                        size="small"
                                        onClick={() => setLocal(prev => ({ ...prev, icon: '' }))}
                                    >
                                        <Delete fontSize="small" />
                                    </IconButton>
                                ) : null}
                            </Box>
                        </Box>
                    ) : null}

                    {isRoot ? (
                        <TextField
                            select
                            fullWidth
                            variant="filled"
                            size="small"
                            label={I18n.t('wm_Theme')}
                            value={local.wmTheme || 'auto'}
                            onChange={e => setLocal({ ...local, wmTheme: e.target.value as WmThemeId })}
                            sx={{ mt: 2 }}
                        >
                            <MenuItem value="auto">{I18n.t('wm_theme_auto')}</MenuItem>
                            <MenuItem value="dark">{I18n.t('wm_theme_dark')}</MenuItem>
                            <MenuItem value="light">{I18n.t('wm_theme_light')}</MenuItem>
                            <MenuItem value="orangeDark">{I18n.t('wm_theme_orangeDark')}</MenuItem>
                            <MenuItem value="blueDark">{I18n.t('wm_theme_blueDark')}</MenuItem>
                        </TextField>
                    ) : null}

                    {isRoot && categoryOptions ? (
                        <TextField
                            select
                            fullWidth
                            variant="filled"
                            size="small"
                            label={I18n.t('wm_Default category')}
                            value={local.defaultCategory || ''}
                            onChange={e => setLocal({ ...local, defaultCategory: e.target.value || '' })}
                            sx={{ mt: 2 }}
                        >
                            <MenuItem value="">{I18n.t('wm_None (root)')}</MenuItem>
                            {categoryOptions.map(opt => (
                                <MenuItem
                                    key={opt.id}
                                    value={opt.id}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {opt.icon ? (
                                            <Icon
                                                src={opt.icon}
                                                style={{ width: 20, height: 20, flexShrink: 0 }}
                                            />
                                        ) : null}
                                        <span>{opt.label}</span>
                                    </Box>
                                </MenuItem>
                            ))}
                        </TextField>
                    ) : null}

                    {isRoot ? (
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={!!local.hideConfigButton}
                                    onChange={(_e, v) => {
                                        if (v && !admin) {
                                            setHideConfigWarning(true);
                                        } else {
                                            setLocal({ ...local, hideConfigButton: v });
                                        }
                                    }}
                                    size="small"
                                />
                            }
                            label={I18n.t('wm_Hide config button')}
                            sx={{ mt: 1 }}
                        />
                    ) : null}

                    {isRoot ? (
                        <Box sx={{ mt: 2 }}>
                            <Tooltip title={I18n.t('wm_App icon tooltip')}>
                                <Typography
                                    variant="body2"
                                    sx={{ mb: 1, fontWeight: 500 }}
                                >
                                    {I18n.t('wm_App icon')}
                                </Typography>
                            </Tooltip>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {iconPreview ? (
                                    <Box
                                        component="img"
                                        src={iconPreview}
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 1,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            objectFit: 'cover',
                                        }}
                                    />
                                ) : null}
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<CloudUpload />}
                                    onClick={() => iconInputRef.current?.click()}
                                    sx={{ textTransform: 'none' }}
                                >
                                    {I18n.t('wm_Upload')}
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<FolderOpen />}
                                    onClick={() => setIconFileDialogOpen(true)}
                                    sx={{ textTransform: 'none' }}
                                >
                                    {I18n.t('wm_Browse')}
                                </Button>
                                <input
                                    ref={iconInputRef}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={handleIconUpload}
                                />
                                {iconPreview ? (
                                    <IconButton
                                        size="small"
                                        onClick={handleDeleteIcon}
                                    >
                                        <Delete fontSize="small" />
                                    </IconButton>
                                ) : null}
                            </Box>
                        </Box>
                    ) : null}

                    {isRoot ? (
                        <Box sx={{ mt: 2 }}>
                            <Typography
                                variant="body2"
                                sx={{ mb: 1, fontWeight: 500 }}
                            >
                                {I18n.t('wm_Root icon')}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {rootIconPreview ? (
                                    <Icon
                                        src={rootIconPreview}
                                        style={{
                                            width: 36,
                                            height: 36,
                                        }}
                                    />
                                ) : null}
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<FolderOpen />}
                                    onClick={() => setRootIconPickerOpen(true)}
                                    sx={{ textTransform: 'none' }}
                                >
                                    {I18n.t('wm_Browse')}
                                </Button>
                                {rootIconPreview ? (
                                    <IconButton
                                        size="small"
                                        onClick={() => {
                                            setRootIconPreview('');
                                            setLocal(prev => ({ ...prev, rootIcon: '' }));
                                        }}
                                    >
                                        <Delete fontSize="small" />
                                    </IconButton>
                                ) : null}
                            </Box>
                        </Box>
                    ) : null}
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        disabled={!hasChanges}
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

            {/* File browser dialog */}
            {fileDialogOpen ? (
                <DialogSelectFile
                    socket={socket}
                    theme={theme}
                    imagePrefix={admin ? './files/' : '../'}
                    filterByType="images"
                    onClose={() => setFileDialogOpen(false)}
                    onOk={handleFileSelected}
                    allowNonRestricted
                    allowUpload
                    allowDownload
                    allowCreateFolder
                    allowDelete
                    allowView
                    showToolbar
                    restrictToFolder={`${this.adapterName}.${this.instance}`}
                />
            ) : null}

            {/* Category icon picker dialog (non-root) */}
            {iconPickerOpen ? (
                <IconPickerDialog
                    open
                    title={I18n.t('wm_Icons')}
                    value={local.icon || ''}
                    onClose={() => setIconPickerOpen(false)}
                    onSelect={iconValue => {
                        setLocal(prev => ({ ...prev, icon: iconValue }));
                        if (iconValue) {
                            setIconPickerOpen(false);
                        }
                    }}
                    socket={socket}
                    theme={theme}
                    admin={admin}
                />
            ) : null}

            {/* Root icon picker dialog */}
            {rootIconPickerOpen ? (
                <IconPickerDialog
                    open
                    title={I18n.t('wm_Root icon')}
                    value={local.rootIcon || ''}
                    onClose={() => setRootIconPickerOpen(false)}
                    onSelect={iconValue => {
                        setLocal(prev => ({ ...prev, rootIcon: iconValue }));
                        const displayPath = iconValue ? `/${filePrefix}${iconValue.replace(/^\//, '')}` : '';
                        setRootIconPreview(displayPath);
                        if (iconValue) {
                            setRootIconPickerOpen(false);
                        }
                    }}
                    socket={socket}
                    theme={theme}
                    admin={admin}
                />
            ) : null}

            {/* Icon file browser dialog */}
            {iconFileDialogOpen ? (
                <DialogSelectFile
                    socket={socket}
                    theme={theme}
                    imagePrefix={admin ? './files/' : '../'}
                    filterByType="images"
                    onClose={() => setIconFileDialogOpen(false)}
                    onOk={handleIconFileSelected}
                />
            ) : null}

            {/* Camera capture dialog */}
            <Dialog
                open={cameraOpen}
                onClose={closeCamera}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>{I18n.t('wm_Take photo')}</DialogTitle>
                <DialogContent sx={{ p: 0, display: 'flex', justifyContent: 'center', backgroundColor: 'black' }}>
                    <Box
                        component="video"
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        sx={{ width: '100%', maxHeight: '60vh', objectFit: 'contain' }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        startIcon={<CameraAlt />}
                        onClick={takePhoto}
                    >
                        {I18n.t('wm_Capture')}
                    </Button>
                    <Button
                        color="grey"
                        startIcon={<Close />}
                        onClick={closeCamera}
                    >
                        {I18n.t('wm_Cancel')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Warning: hiding config button from web */}
            <Dialog
                open={hideConfigWarning}
                onClose={() => setHideConfigWarning(false)}
                maxWidth="xs"
            >
                <DialogTitle>{I18n.t('wm_Warning')}</DialogTitle>
                <DialogContent>
                    <Typography>{I18n.t('wm_Hide config warning')}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setLocal(prev => ({ ...prev, hideConfigButton: true }));
                            setHideConfigWarning(false);
                        }}
                        color="warning"
                    >
                        {I18n.t('wm_OK')}
                    </Button>
                    <Button onClick={() => setHideConfigWarning(false)}>{I18n.t('wm_Cancel')}</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
