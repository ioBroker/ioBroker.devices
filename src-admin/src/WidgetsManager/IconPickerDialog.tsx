import React, { useState, useRef } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    SvgIcon,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import { Close, CloudUpload, Delete, FolderOpen, GridView } from '@mui/icons-material';
import { I18n, Icon, type Connection, type IobTheme, DialogSelectFile } from '@iobroker/adapter-react-v5';

import { PREDEFINED_ICONS, ICON_CATEGORIES, pathToDataUri, type PredefinedIcon } from './predefinedIcons';

type IconSource = 'predefined' | 'upload' | 'iobroker';

interface IconPickerDialogProps {
    open: boolean;
    title: string;
    value: string;
    onClose: () => void;
    onSelect: (iconValue: string) => void;
    socket: Connection;
    theme: IobTheme;
    admin: boolean;
}

/** Inline SVG icon rendered from a path string – used for the predefined grid */
function PathIcon({ d, size = 24 }: { d: string; size?: number }): React.JSX.Element {
    return (
        <SvgIcon
            sx={{ fontSize: size }}
            viewBox="0 0 24 24"
        >
            <path d={d} />
        </SvgIcon>
    );
}

export default function IconPickerDialog(props: IconPickerDialogProps): React.JSX.Element {
    const { open, title, value, onClose, onSelect, socket, theme, admin } = props;
    const [source, setSource] = useState<IconSource>('predefined');
    const [fileDialogOpen, setFileDialogOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            onSelect(reader.result as string);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleFileSelected = (selected: string | string[] | undefined): void => {
        setFileDialogOpen(false);
        if (!selected) {
            return;
        }
        const filePath = Array.isArray(selected) ? selected[0] : selected;
        if (filePath) {
            const clean = filePath.startsWith('/') ? filePath.substring(1) : filePath;
            // Store as URL path (not base64) for ioBroker files
            const prefix = admin ? './files/' : '../';
            onSelect(`${prefix}${clean}`);
        }
    };

    const handlePredefinedSelect = (icon: PredefinedIcon): void => {
        onSelect(pathToDataUri(icon.path));
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>{title}</DialogTitle>
                <DialogContent>
                    {/* Current icon preview */}
                    {value ? (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                mb: 2,
                                p: 1,
                                borderRadius: 1,
                                bgcolor: 'action.hover',
                            }}
                        >
                            <Icon
                                src={value}
                                style={{ width: 32, height: 32 }}
                            />
                            <Typography
                                variant="body2"
                                sx={{ flex: 1, color: 'text.secondary' }}
                            >
                                {I18n.t('wm_Current icon')}
                            </Typography>
                            <IconButton
                                size="small"
                                onClick={() => onSelect('')}
                            >
                                <Delete fontSize="small" />
                            </IconButton>
                        </Box>
                    ) : null}

                    {/* Source selector */}
                    <ToggleButtonGroup
                        value={source}
                        exclusive
                        onChange={(_, v) => {
                            if (v) {
                                setSource(v);
                            }
                        }}
                        size="small"
                        fullWidth
                        sx={{ mb: 2 }}
                    >
                        <ToggleButton value="predefined">
                            <GridView sx={{ fontSize: 16, mr: 0.5 }} />
                            {I18n.t('wm_Predefined')}
                        </ToggleButton>
                        <ToggleButton value="upload">
                            <CloudUpload sx={{ fontSize: 16, mr: 0.5 }} />
                            {I18n.t('wm_Upload')}
                        </ToggleButton>
                        <ToggleButton value="iobroker">
                            <FolderOpen sx={{ fontSize: 16, mr: 0.5 }} />
                            ioBroker
                        </ToggleButton>
                    </ToggleButtonGroup>

                    {/* Predefined icons grid */}
                    {source === 'predefined' ? (
                        <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                            {ICON_CATEGORIES.map(cat => {
                                const icons = PREDEFINED_ICONS.filter(i => i.category === cat.id);
                                if (!icons.length) {
                                    return null;
                                }
                                return (
                                    <Box
                                        key={cat.id}
                                        sx={{ mb: 1.5 }}
                                    >
                                        <Typography
                                            variant="caption"
                                            sx={{ color: 'text.secondary', fontWeight: 500, display: 'block', mb: 0.5 }}
                                        >
                                            {I18n.t(cat.label)}
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {icons.map(icon => {
                                                const iconUri = pathToDataUri(icon.path);
                                                const selected = value === iconUri;
                                                return (
                                                    <Tooltip
                                                        key={icon.id}
                                                        title={icon.label}
                                                    >
                                                        <Box
                                                            onClick={() => handlePredefinedSelect(icon)}
                                                            sx={t => ({
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
                                                            })}
                                                        >
                                                            <PathIcon
                                                                d={icon.path}
                                                                size={22}
                                                            />
                                                        </Box>
                                                    </Tooltip>
                                                );
                                            })}
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    ) : null}

                    {/* Upload */}
                    {source === 'upload' ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 3 }}>
                            <Button
                                variant="outlined"
                                startIcon={<CloudUpload />}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {I18n.t('wm_Upload')}
                            </Button>
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary' }}
                            >
                                SVG, PNG, JPG
                            </Typography>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,.svg"
                                style={{ display: 'none' }}
                                onChange={handleUpload}
                            />
                        </Box>
                    ) : null}

                    {/* ioBroker file browser */}
                    {source === 'iobroker' ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 3 }}>
                            <Button
                                variant="outlined"
                                startIcon={<FolderOpen />}
                                onClick={() => setFileDialogOpen(true)}
                            >
                                {I18n.t('wm_Browse')}
                            </Button>
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary' }}
                            >
                                {I18n.t('wm_Browse ioBroker')}
                            </Typography>
                        </Box>
                    ) : null}
                </DialogContent>
                <DialogActions>
                    <Button
                        color="grey"
                        startIcon={<Close />}
                        onClick={onClose}
                    >
                        {I18n.t('wm_Cancel')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ioBroker file dialog */}
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
        </>
    );
}
