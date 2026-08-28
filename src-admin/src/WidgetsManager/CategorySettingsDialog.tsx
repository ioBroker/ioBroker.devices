import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    Button,
    FormControlLabel,
    Switch,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Slider,
    Tab,
    Tabs,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import { CameraAlt, Close, Delete, Save, CloudUpload, FolderOpen } from '@mui/icons-material';
import { I18n, Icon, type IobTheme, DialogSelectFile } from '@iobroker/gui-components';

import type { CustomWidgetBase, WmAcl } from '../../../packages/dm-widgets/src/index';
import type { WidgetGroup } from './groupUtils';
import IconPickerDialog from './IconPickerDialog';
import AclEditor, { EditorsEditor } from './AclEditor';
import { loadSettingsTab, storeSettingsTab } from './settingsTab';
import type StateContext from './StateContext';

/** How a tile paints its own surface, independent of any background image. */
export type TileStyleId = 'gradient' | 'flat' | 'glass';

/** Available theme presets */
export type WmThemeId =
    | 'auto'
    | 'dark'
    | 'light'
    | 'orangeDark'
    | 'blueDark'
    | 'techBlue'
    | 'cleanLight'
    | 'styling-grey';

export interface CategorySettings {
    /** View permissions of this category (see WidgetsManager/PERMISSIONS.md) */
    acl?: WmAcl;
    /** Who may configure at all — only evaluated on the root category. Empty = admin only. */
    editors?: { groups?: string[]; users?: string[] };
    name: string;
    color: string;
    backgroundColor: string;
    image: string;
    /** 'header' = background only behind header, 'page' = background behind the whole page */
    imageScope: 'header' | 'page';
    /**
     * How a background image is presented on category tiles — a look-and-feel choice next to the
     * theme, so it is set once on the root category and applies to every tile.
     *
     * - `scrim` — full-bleed image behind a flat dimming layer (the original look)
     * - `fade` — image on the trailing edge, fading into the tile so the panel gradient stays visible
     * - `texture` — image kept far back as a faint tint
     *
     * Undefined means `fade`. Root category only.
     */
    imageStyle?: 'scrim' | 'fade' | 'texture';
    /**
     * Surface of every widget and category tile. Root category only, undefined means `gradient`.
     *
     * - `gradient` — diagonal ramp with a lit corner (the default look)
     * - `flat` — plain paper with a hairline border, no ramp
     * - `glass` — translucent and blurred, so a page background shows through
     */
    tileStyle?: TileStyleId;
    customWidgets?: CustomWidgetBase[];
    widgetOrder?: string[];
    widgetGroups?: WidgetGroup[];
    /** Explicit toggle: true = render grouped, false/undefined = sorted list. */
    widgetsGrouped?: boolean;
    /** PWA / Chrome extension icon path — used as a favicon in browser (root only) */
    icon?: string;
    /** Icon shown in front of the root category name (root only) */
    rootIcon?: string;
    /** Widget theme preset (root category only). Default: 'auto' (follows admin theme) */
    wmTheme?: WmThemeId;
    /** Default category ID to show when a page loads without hash (root only) */
    defaultCategory?: string;
    /**
     * Master switch for the per-user view permissions (root only). While off, the permission tabs
     * stay hidden and every stored rule is ignored — a single-user installation is not bothered
     * with the concept at all.
     */
    multiUser?: boolean;
    /** Room value for the power badge. undefined = 'sum' (sum all consumers, default). 'sum' | <stateId>. */
    powerSource?: string;
    /** Room value for temperature. undefined = 'first' (first sensor, default). 'first' | 'avg' | <stateId>. */
    temperatureSource?: string;
    /** Room value for humidity. Same semantics as temperatureSource. */
    humiditySource?: string;
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

/** A selectable detected state offered as a room-value source in the category settings. */
export interface StatusCandidate {
    id: string;
    label: string;
}

/** Detected room-value candidates for a category, grouped by metric. */
export interface StatusCandidates {
    power: StatusCandidate[];
    temperature: StatusCandidate[];
    humidity: StatusCandidate[];
}

interface CategorySettingsDialogProps {
    open: boolean;
    categoryName: string;
    categoryId: string;
    settings: CategorySettings;
    onClose: () => void;
    onSave: (settings: CategorySettings) => void;
    stateContext: StateContext;
    theme: IobTheme;
    /** All available categories for the default-category picker (root only) */
    categoryOptions?: CategoryOption[];
    /** Detected room-value candidates (power/temperature/humidity) for this category */
    statusCandidates?: StatusCandidates | null;
    /** Opens the permission overview — root category only */
    onOpenAclMatrix?: () => void;
    /** Whether the multi-user permissions are switched on (read from the root category) */
    multiUser?: boolean;
}

/** Value the dialog shows when a setting is unset — differing only in that is not an edit. */
const SETTING_FALLBACKS: Partial<Record<keyof CategorySettings, string>> = {
    imageScope: 'header',
    imageStyle: 'fade',
    tileStyle: 'gradient',
    wmTheme: 'auto',
    powerSource: 'sum',
    temperatureSource: 'first',
    humiditySource: 'first',
};

/** Settings the dialog only offers on the root category. */
const ROOT_ONLY_SETTINGS: (keyof CategorySettings)[] = [
    'wmTheme',
    'imageStyle',
    'tileStyle',
    'defaultCategory',
    'multiUser',
    'editors',
];

/**
 * Compare two settings objects the way the user perceives them.
 *
 * Generic on purpose: the previous hand-written chain of comparisons had to be extended for every
 * new field, and forgetting one left Save greyed out after a real change — a failure nobody
 * notices until they lose their edit.
 *
 * @param a Edited settings
 * @param b Stored settings
 * @param isRoot Whether the root category is being edited
 * @param categoryName Name shown when the category has none of its own
 * @returns True when the two differ in anything the dialog can edit
 */
function settingsDiffer(a: CategorySettings, b: CategorySettings, isRoot: boolean, categoryName: string): boolean {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)] as (keyof CategorySettings)[]);
    for (const key of keys) {
        if (!isRoot && ROOT_ONLY_SETTINGS.includes(key)) {
            continue;
        }
        const fallback = key === 'name' ? categoryName : SETTING_FALLBACKS[key];
        // Absent, null and empty all mean "unset" and fall back to the same displayed value
        const normalize = (value: unknown): string =>
            JSON.stringify(value === undefined || value === null || value === '' ? (fallback ?? '') : value);
        if (normalize(a[key]) !== normalize(b[key])) {
            return true;
        }
    }
    return false;
}

export default function CategorySettingsDialog(props: CategorySettingsDialogProps): React.JSX.Element {
    const { open, categoryName, categoryId, settings, onClose, onSave, theme, categoryOptions, stateContext } = props;
    const statusCandidates = props.statusCandidates;
    // In admin, files are served under /files/, in web they are at root
    const [local, setLocal] = useState<CategorySettings>(settings);
    const [preview, setPreview] = useState<string>('');
    const [iconPreview, setIconPreview] = useState<string>('');
    const [rootIconPreview, setRootIconPreview] = useState<string>('');
    const [cameraOpen, setCameraOpen] = useState(false);
    const [fileDialogOpen, setFileDialogOpen] = useState(false);
    const [iconFileDialogOpen, setIconFileDialogOpen] = useState(false);
    const [iconPickerOpen, setIconPickerOpen] = useState(false);
    const [rootIconPickerOpen, setRootIconPickerOpen] = useState(false);
    const [tab, setTab] = useState(0);
    const [widgetScale, setWidgetScale] = useState(() => {
        const stored = localStorage.getItem('wm_widgetScale');
        return stored ? Number(stored) : 100;
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const iconInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        if (open) {
            // Reopen on the tab last used anywhere — setting up permissions means walking through
            // many categories in a row, and landing on the settings every time costs a click each.
            setTab(loadSettingsTab(!!props.multiUser));
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
        // `props.multiUser` is deliberately not a dependency: it is only read when the dialog opens,
        // and re-running this effect would throw away the edits made so far.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings, open, categoryName, stateContext.imagePrefix]);

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
                await stateContext.getSocket().writeFile64(stateContext.instanceId, fileName, base64);
                // Store without prefix so the same path works in admin and web
                const storedPath = `/${stateContext.instanceId}/${fileName}`;
                setPreview(`/${stateContext.imagePrefix}${stateContext.instanceId}/${fileName}?t=${Date.now()}`);
                setLocal(prev => ({ ...prev, image: storedPath }));
            } catch (err) {
                console.error('Failed to upload category image:', err);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [categoryId, stateContext, stateContext.instanceId],
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
                await stateContext.getSocket().writeFile64(stateContext.instanceId, fileName, base64);
                const storedPath = `/${stateContext.instanceId}/${fileName}`;
                setIconPreview(`/${stateContext.imagePrefix}${stateContext.instanceId}/${fileName}?t=${Date.now()}`);
                setLocal(prev => ({ ...prev, icon: storedPath }));
            } catch (err) {
                console.error('Failed to upload icon:', err);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [stateContext, stateContext.imagePrefix],
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
            setIconPreview(`/${stateContext.imagePrefix}${clean}`);
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
    // On the root the switch is edited in this very dialog, so follow the local value — the tab
    // must appear the moment it is turned on.
    const multiUser = isRoot ? !!local.multiUser : !!props.multiUser;

    const hasChanges = settingsDiffer(local, settings, isRoot, categoryName);

    const icon = stateContext.getImagePath(local.icon);

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>{categoryName}</DialogTitle>
                {multiUser ? (
                    <Tabs
                        value={tab}
                        onChange={(_e, value: number) => {
                            setTab(value);
                            storeSettingsTab(value);
                        }}
                        variant="fullWidth"
                    >
                        <Tab label={I18n.t('wm_acl_settings_tab')} />
                        <Tab label={I18n.t('wm_acl_tab')} />
                    </Tabs>
                ) : null}
                <DialogContent sx={{ display: multiUser && tab === 1 ? 'block' : 'none' }}>
                    <AclEditor
                        acl={local.acl}
                        onChange={acl => setLocal(prev => ({ ...prev, acl }))}
                        stateContext={stateContext}
                        hint={I18n.t('wm_acl_category_hint')}
                    />
                    {/* Who may configure at all — a single global setting, only on the root */}
                    {isRoot ? (
                        <Box sx={{ mt: 3 }}>
                            <Typography sx={{ fontWeight: 600 }}>{I18n.t('wm_acl_editors')}</Typography>
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary' }}
                            >
                                {I18n.t('wm_acl_editors_hint')}
                            </Typography>
                            <EditorsEditor
                                editors={local.editors}
                                onChange={editors => setLocal(prev => ({ ...prev, editors }))}
                                stateContext={stateContext}
                            />
                            {props.onOpenAclMatrix ? (
                                <Button
                                    variant="outlined"
                                    sx={{ mt: 2 }}
                                    onClick={props.onOpenAclMatrix}
                                >
                                    {I18n.t('wm_acl_matrix')}
                                </Button>
                            ) : null}
                        </Box>
                    ) : null}
                </DialogContent>
                <DialogContent sx={{ display: !multiUser || tab === 0 ? 'block' : 'none' }}>
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
                                    {icon ? (
                                        <Icon
                                            src={icon}
                                            style={{ width: 32, height: 32 }}
                                        />
                                    ) : (
                                        <CloudUpload sx={{ fontSize: 24, color: 'text.disabled' }} />
                                    )}
                                </Box>
                                {icon ? (
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
                            <MenuItem value="techBlue">{I18n.t('wm_theme_techBlue')}</MenuItem>
                            <MenuItem value="cleanLight">{I18n.t('wm_theme_cleanLight')}</MenuItem>
                            <MenuItem value="styling-grey">{I18n.t('wm_theme_styling-grey')}</MenuItem>
                        </TextField>
                    ) : null}

                    {isRoot ? (
                        <Box sx={{ mt: 2 }}>
                            <Typography
                                variant="body2"
                                sx={{ mb: 1, fontWeight: 500 }}
                            >
                                {I18n.t('wm_Image style')}
                            </Typography>
                            <ToggleButtonGroup
                                value={local.imageStyle || 'fade'}
                                exclusive
                                onChange={(_, value) => {
                                    if (value) {
                                        setLocal({ ...local, imageStyle: value });
                                    }
                                }}
                                size="small"
                            >
                                <ToggleButton value="scrim">{I18n.t('wm_Image full')}</ToggleButton>
                                <ToggleButton value="fade">{I18n.t('wm_Image fade')}</ToggleButton>
                                <ToggleButton value="texture">{I18n.t('wm_Image texture')}</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>
                    ) : null}

                    {isRoot ? (
                        <Box sx={{ mt: 2 }}>
                            <Typography
                                variant="body2"
                                sx={{ mb: 1, fontWeight: 500 }}
                            >
                                {I18n.t('wm_Tile style')}
                            </Typography>
                            <ToggleButtonGroup
                                value={local.tileStyle || 'gradient'}
                                exclusive
                                onChange={(_, value) => {
                                    if (value) {
                                        setLocal({ ...local, tileStyle: value });
                                    }
                                }}
                                size="small"
                            >
                                <ToggleButton value="gradient">{I18n.t('wm_Tile gradient')}</ToggleButton>
                                <ToggleButton value="flat">{I18n.t('wm_Tile flat')}</ToggleButton>
                                <ToggleButton value="glass">{I18n.t('wm_Tile glass')}</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>
                    ) : null}

                    {isRoot ? (
                        <Box sx={{ mt: 2 }}>
                            <Typography
                                variant="body2"
                                sx={{ color: 'text.secondary', mb: 0.5 }}
                            >
                                {I18n.t('wm_Widget size')}
                                {': '}
                                {widgetScale}%
                            </Typography>
                            <Slider
                                value={widgetScale}
                                min={80}
                                max={200}
                                step={5}
                                onChange={(_e, val) => {
                                    const v = val;
                                    setWidgetScale(v);
                                    localStorage.setItem('wm_widgetScale', String(v));
                                    window.dispatchEvent(new Event('wm_widgetScaleChanged'));
                                }}
                                valueLabelDisplay="auto"
                                valueLabelFormat={v => `${v}%`}
                                marks={[
                                    { value: 80, label: '80%' },
                                    { value: 100, label: '100%' },
                                    { value: 150, label: '150%' },
                                    { value: 200, label: '200%' },
                                ]}
                            />
                        </Box>
                    ) : null}

                    {isRoot ? (
                        <FormControlLabel
                            sx={{ mt: 2 }}
                            control={
                                <Switch
                                    size="small"
                                    checked={!!local.multiUser}
                                    onChange={(_e, v) => setLocal(prev => ({ ...prev, multiUser: v || undefined }))}
                                />
                            }
                            label={
                                <Box>
                                    <Typography>{I18n.t('wm_acl_multiuser')}</Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{ color: 'text.secondary' }}
                                    >
                                        {I18n.t('wm_acl_multiuser_hint')}
                                    </Typography>
                                </Box>
                            }
                        />
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

                    {statusCandidates &&
                    (statusCandidates.power.length ||
                        statusCandidates.temperature.length ||
                        statusCandidates.humidity.length) ? (
                        <>
                            <Typography
                                variant="body2"
                                sx={{ color: 'text.secondary', mt: 2, mb: 0.5 }}
                            >
                                {I18n.t('wm_Room status values')}
                            </Typography>
                            {statusCandidates.power.length ? (
                                <TextField
                                    select
                                    fullWidth
                                    variant="filled"
                                    size="small"
                                    label={I18n.t('wm_Power room value')}
                                    value={local.powerSource || 'sum'}
                                    onChange={e => setLocal({ ...local, powerSource: e.target.value })}
                                    sx={{ mt: 1 }}
                                >
                                    <MenuItem value="sum">{I18n.t('wm_Sum all consumers')}</MenuItem>
                                    {statusCandidates.power.map(c => (
                                        <MenuItem
                                            key={c.id}
                                            value={c.id}
                                        >
                                            {c.label}
                                        </MenuItem>
                                    ))}
                                    <MenuItem value="hidden">{I18n.t('wm_Do not show')}</MenuItem>
                                </TextField>
                            ) : null}
                            {statusCandidates.temperature.length ? (
                                <TextField
                                    select
                                    fullWidth
                                    variant="filled"
                                    size="small"
                                    label={I18n.t('wm_Temperature room value')}
                                    value={local.temperatureSource || 'first'}
                                    onChange={e => setLocal({ ...local, temperatureSource: e.target.value })}
                                    sx={{ mt: 1 }}
                                >
                                    <MenuItem value="first">{I18n.t('wm_First sensor')}</MenuItem>
                                    <MenuItem value="avg">{I18n.t('wm_Average of all')}</MenuItem>
                                    {statusCandidates.temperature.map(c => (
                                        <MenuItem
                                            key={c.id}
                                            value={c.id}
                                        >
                                            {c.label}
                                        </MenuItem>
                                    ))}
                                    <MenuItem value="hidden">{I18n.t('wm_Do not show')}</MenuItem>
                                </TextField>
                            ) : null}
                            {statusCandidates.humidity.length ? (
                                <TextField
                                    select
                                    fullWidth
                                    variant="filled"
                                    size="small"
                                    label={I18n.t('wm_Humidity room value')}
                                    value={local.humiditySource || 'first'}
                                    onChange={e => setLocal({ ...local, humiditySource: e.target.value })}
                                    sx={{ mt: 1 }}
                                >
                                    <MenuItem value="first">{I18n.t('wm_First sensor')}</MenuItem>
                                    <MenuItem value="avg">{I18n.t('wm_Average of all')}</MenuItem>
                                    {statusCandidates.humidity.map(c => (
                                        <MenuItem
                                            key={c.id}
                                            value={c.id}
                                        >
                                            {c.label}
                                        </MenuItem>
                                    ))}
                                    <MenuItem value="hidden">{I18n.t('wm_Do not show')}</MenuItem>
                                </TextField>
                            ) : null}
                        </>
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
                        {I18n.t(hasChanges ? 'wm_Cancel' : 'wm_Close')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* File browser dialog */}
            {fileDialogOpen ? (
                <DialogSelectFile
                    socket={stateContext.getSocket()}
                    theme={theme}
                    imagePrefix={stateContext.imagePrefix}
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
                    restrictToFolder={stateContext.instanceId}
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
                    socket={stateContext.getSocket()}
                    theme={theme}
                    admin={stateContext.admin}
                    instance={stateContext.instanceId}
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
                        const displayPath = iconValue
                            ? `/${stateContext.imagePrefix}${iconValue.replace(/^\//, '')}`
                            : '';
                        setRootIconPreview(displayPath);
                        if (iconValue) {
                            setRootIconPickerOpen(false);
                        }
                    }}
                    socket={stateContext.getSocket()}
                    instance={stateContext.instanceId}
                    theme={theme}
                    admin={stateContext.admin}
                />
            ) : null}

            {/* Icon file browser dialog */}
            {iconFileDialogOpen ? (
                <DialogSelectFile
                    socket={stateContext.getSocket()}
                    theme={theme}
                    imagePrefix={stateContext.imagePrefix}
                    filterByType="images"
                    onClose={() => setIconFileDialogOpen(false)}
                    onOk={handleIconFileSelected}
                    allowNonRestricted
                    allowUpload
                    allowDownload
                    allowCreateFolder
                    allowDelete
                    allowView
                    showToolbar
                    restrictToFolder={stateContext.instanceId}
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
        </>
    );
}
