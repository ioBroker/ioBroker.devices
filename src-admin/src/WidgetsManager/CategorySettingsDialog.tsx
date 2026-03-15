import React, { useState, useEffect, useRef } from 'react';
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
import { CameraAlt, Close, Delete, Save, CloudUpload } from '@mui/icons-material';
import { I18n, type Connection } from '@iobroker/adapter-react-v5';

export interface CategorySettings {
    name: string;
    color: string;
    image: string;
    /** 'header' = background only behind header, 'page' = background behind whole page */
    imageScope: 'header' | 'page';
}

export const DEFAULT_CATEGORY_SETTINGS: CategorySettings = {
    name: '',
    color: '',
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
}

export default function CategorySettingsDialog(props: CategorySettingsDialogProps): React.JSX.Element {
    const { open, categoryName, categoryId, settings, onClose, onSave, socket, instance } = props;
    const [local, setLocal] = useState<CategorySettings>(settings);
    const [preview, setPreview] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setLocal({
                ...settings,
                name: settings.name || categoryName,
            });
            setPreview(settings.image || '');
        }
    }, [settings, open, categoryName]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev: ProgressEvent<FileReader>): void => {
            const img = new Image();
            img.src = ev.target?.result as string;
            img.onload = async () => {
                // Resize to max 800px wide, keep aspect ratio
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
                const dataUrl = canvas.toDataURL('image/webp', 0.8);
                const base64 = dataUrl.replace(/^data:image\/webp;base64,/, '');
                const fileName = `room_${String(categoryId).replace(/[^a-zA-Z0-9_-]/g, '_')}.webp`;

                try {
                    await socket.writeFile64(instance, fileName, base64);
                    const imageUrl = `/${instance}/${fileName}?t=${Date.now()}`;
                    setPreview(imageUrl);
                    setLocal(prev => ({ ...prev, image: imageUrl }));
                } catch (err) {
                    console.error('Failed to upload room image:', err);
                }
            };
        };
        reader.readAsDataURL(file);
        // reset input so same file can be re-selected
        e.target.value = '';
    };

    const handleDeleteImage = (): void => {
        setPreview('');
        setLocal(prev => ({ ...prev, image: '' }));
    };

    const hasChanges =
        local.name !== (settings.name || categoryName) ||
        local.color !== (settings.color || '') ||
        local.image !== (settings.image || '') ||
        local.imageScope !== (settings.imageScope || 'header');

    return (
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
                        {I18n.t('wm_Background image')}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<CloudUpload />}
                            onClick={() => fileInputRef.current?.click()}
                            sx={{ textTransform: 'none' }}
                        >
                            {I18n.t('wm_Upload')}
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<CameraAlt />}
                            onClick={() => cameraInputRef.current?.click()}
                            sx={{ textTransform: 'none' }}
                        >
                            {I18n.t('wm_Take photo')}
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleImageUpload}
                        />
                        <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
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
    );
}
