import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { CameraAlt, Close, Delete, Save, CloudUpload, FolderOpen } from '@mui/icons-material';
import { I18n, type Connection, type IobTheme, DialogSelectFile } from '@iobroker/adapter-react-v5';

import type { CustomWidgetDef } from '../../../src/widget-utils';

export interface CategorySettings {
    name: string;
    color: string;
    backgroundColor: string;
    image: string;
    /** 'header' = background only behind header, 'page' = background behind whole page */
    imageScope: 'header' | 'page';
    customWidgets?: CustomWidgetDef[];
}

export const DEFAULT_CATEGORY_SETTINGS: CategorySettings = {
    name: '',
    color: '',
    backgroundColor: '',
    image: '',
    imageScope: 'header',
};

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
}

export default function CategorySettingsDialog(props: CategorySettingsDialogProps): React.JSX.Element {
    const { open, categoryName, categoryId, settings, onClose, onSave, socket, instance, theme, admin } = props;
    // In admin, files are served under /files/, in web they are at root
    const filePrefix = admin ? 'files/' : '';
    const [local, setLocal] = useState<CategorySettings>(settings);
    const [preview, setPreview] = useState<string>('');
    const [cameraOpen, setCameraOpen] = useState(false);
    const [fileDialogOpen, setFileDialogOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
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

    // --- Camera ---

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

    const hasChanges =
        local.name !== (settings.name || categoryName) ||
        local.color !== (settings.color || '') ||
        local.backgroundColor !== (settings.backgroundColor || '') ||
        local.image !== (settings.image || '') ||
        local.imageScope !== (settings.imageScope || 'header');

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
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<CameraAlt />}
                                onClick={() => void openCamera()}
                                sx={{ textTransform: 'none', flex: 1 }}
                            >
                                {I18n.t('wm_Take photo')}
                            </Button>
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
        </>
    );
}
