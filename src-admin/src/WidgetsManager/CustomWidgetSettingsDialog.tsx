import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    List,
    ListItemButton,
    ListItemText,
    MenuItem,
    Select,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { Close, Delete, MyLocation, Save } from '@mui/icons-material';
import { DialogSelectID, I18n, type Connection, type IobTheme } from '@iobroker/adapter-react-v5';

import type { CustomWidgetDef } from '../../../src/widget-utils';

/** Module-level cache for getAdapterInstances results (key = sorted adapter names) */
const adapterInstancesCache: Record<string, { id: string; label: string }[]> = {};

import {
    CUSTOM_WIDGET_CONFIGS,
    getConfigDefault,
    type CwConfigCitySearch,
    type CwConfigColor,
    type CwConfigInstanceSelect,
    type CwConfigItem,
    type CwConfigSelect,
    type CwConfigStateId,
    type CwConfigText,
} from './CustomWidgetConfigs';
import type { WidgetGroup } from './groupUtils';
import GroupSelector from './GroupSelector';

interface CustomWidgetSettingsDialogProps {
    open: boolean;
    widgetDef: CustomWidgetDef | null;
    onClose: () => void;
    onSave: (def: CustomWidgetDef) => void;
    onDelete: () => void;
    /** Socket for dynamic data (e.g., listing adapter instances) */
    socket?: Connection;
    theme?: IobTheme;
    availableGroups?: WidgetGroup[];
    currentGroupId?: string;
    onGroupChange?: (groupId: string) => void;
}

/** Extra keys that citySearch can write besides its own key */
const EXTRA_KEYS = ['latitude', 'longitude'] as const;

// --- Geocoding result type ---

interface GeoResult {
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    admin1?: string;
    country_code?: string;
}

// --- Item renderers ---

function renderSelect(
    key: string,
    item: CwConfigSelect,
    value: string,
    onChange: (v: unknown) => void,
): React.JSX.Element {
    if (item.format === 'radio') {
        return (
            <Box
                key={key}
                sx={{ mb: 2 }}
            >
                <Typography
                    variant="body2"
                    sx={{ mb: 1, fontWeight: 500 }}
                >
                    {I18n.t(item.label)}
                </Typography>
                <ToggleButtonGroup
                    value={value}
                    exclusive
                    onChange={(_, v) => {
                        if (v) {
                            onChange(v);
                        }
                    }}
                    size="small"
                >
                    {item.options.map(opt => (
                        <ToggleButton
                            key={opt.value}
                            value={opt.value}
                        >
                            {opt.icon ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 0.5 }}>
                                    {opt.icon}
                                    <span>{I18n.t(opt.label)}</span>
                                </Box>
                            ) : (
                                I18n.t(opt.label)
                            )}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Box>
        );
    }

    return (
        <Box
            key={key}
            sx={{ mb: 2 }}
        >
            <Typography
                variant="body2"
                sx={{ mb: 1, fontWeight: 500 }}
            >
                {I18n.t(item.label)}
            </Typography>
            <Select
                value={value}
                variant="filled"
                onChange={e => onChange(e.target.value)}
                size="small"
                fullWidth
            >
                {item.options.map(opt => (
                    <MenuItem
                        key={opt.value}
                        value={opt.value}
                    >
                        {I18n.t(opt.label)}
                    </MenuItem>
                ))}
            </Select>
        </Box>
    );
}

function renderColor(
    key: string,
    item: CwConfigColor,
    value: string,
    onChange: (v: unknown) => void,
): React.JSX.Element {
    return (
        <Box
            key={key}
            sx={{ mb: 2 }}
        >
            <Typography
                variant="body2"
                sx={{ mb: 1, fontWeight: 500 }}
            >
                {I18n.t(item.label)}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                    component="input"
                    type="color"
                    value={value || '#1976d2'}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
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
                {value ? (
                    <IconButton
                        size="small"
                        onClick={() => onChange('')}
                    >
                        <Delete fontSize="small" />
                    </IconButton>
                ) : null}
            </Box>
        </Box>
    );
}

function renderText(key: string, item: CwConfigText, value: string, onChange: (v: unknown) => void): React.JSX.Element {
    return (
        <Box
            key={key}
            sx={{ mb: 2 }}
        >
            <Typography
                variant="body2"
                sx={{ mb: 1, fontWeight: 500 }}
            >
                {I18n.t(item.label)}
            </Typography>
            <TextField
                value={value}
                variant="filled"
                onChange={e => onChange(item.inputType === 'number' ? e.target.value : e.target.value)}
                placeholder={item.placeholder ? I18n.t(item.placeholder) : undefined}
                helperText={item.helperText ? I18n.t(item.helperText) : undefined}
                type={item.inputType || 'text'}
                size="small"
                fullWidth
            />
        </Box>
    );
}

/** Dynamic instance selector component */
function InstanceSelect(props: {
    configKey: string;
    item: CwConfigInstanceSelect;
    value: string;
    onChange: (v: unknown) => void;
    socket?: Connection;
}): React.JSX.Element {
    const { configKey, item, value, onChange, socket } = props;
    const [instances, setInstances] = useState<{ id: string; label: string }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!socket) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        const cacheKey = [...item.adapterNames].sort().join(',');

        if (adapterInstancesCache[cacheKey]) {
            const cached = adapterInstancesCache[cacheKey];
            setInstances(cached);
            setLoading(false);
            if (!value && cached.length === 1) {
                onChange(cached[0].id);
            }
            return;
        }

        void (async () => {
            const found: { id: string; label: string }[] = [];
            for (const adapterName of item.adapterNames) {
                try {
                    const res = await socket.getAdapterInstances(adapterName);
                    if (cancelled) {
                        return;
                    }
                    if (Array.isArray(res)) {
                        for (const inst of res) {
                            const instanceId = inst._id.replace('system.adapter.', '');
                            const rawName = inst.common?.name;
                            const name =
                                rawName && typeof rawName === 'object'
                                    ? (rawName as ioBroker.Translated).en || instanceId
                                    : rawName || instanceId;
                            found.push({ id: instanceId, label: `${name} (${instanceId})` });
                        }
                    }
                } catch {
                    // adapter not installed — skip
                }
            }
            if (!cancelled) {
                adapterInstancesCache[cacheKey] = found;
                setInstances(found);
                setLoading(false);
                if (!value && found.length === 1) {
                    onChange(found[0].id);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, item.adapterNames.join(',')]);

    return (
        <Box
            key={configKey}
            sx={{ mb: 2 }}
        >
            <Typography
                variant="body2"
                sx={{ mb: 1, fontWeight: 500 }}
            >
                {I18n.t(item.label)}
            </Typography>
            {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                    <CircularProgress size={18} />
                    <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary' }}
                    >
                        {I18n.t('wm_Loading instances')}...
                    </Typography>
                </Box>
            ) : instances.length === 0 ? (
                <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary' }}
                >
                    {I18n.t('wm_No weather adapters')}
                </Typography>
            ) : (
                <Select
                    value={value}
                    variant="filled"
                    onChange={e => onChange(e.target.value)}
                    size="small"
                    fullWidth
                    displayEmpty
                >
                    <MenuItem
                        value=""
                        disabled
                    >
                        {I18n.t('wm_Select instance')}
                    </MenuItem>
                    {instances.map(inst => (
                        <MenuItem
                            key={inst.id}
                            value={inst.id}
                        >
                            {inst.label}
                        </MenuItem>
                    ))}
                </Select>
            )}
        </Box>
    );
}

/** City search component using open-meteo geocoding API */
function CitySearch(props: {
    configKey: string;
    item: CwConfigCitySearch;
    value: string;
    latitude?: number;
    longitude?: number;
    onChange: (cityName: string, lat?: number, lon?: number) => void;
}): React.JSX.Element {
    const { configKey, item, value, latitude, longitude, onChange } = props;
    const [query, setQuery] = useState(value || '');
    const [results, setResults] = useState<GeoResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync external value changes
    useEffect(() => {
        if (value && value !== query) {
            setQuery(value);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const doSearch = useCallback((q: string) => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        if (!q || q.length < 2) {
            setResults([]);
            setShowResults(false);
            return;
        }
        timerRef.current = setTimeout(() => {
            setSearching(true);
            const lang = I18n.getLanguage() || 'en';
            fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=${lang}`,
            )
                .then(r => r.json())
                .then((data: { results?: GeoResult[] }) => {
                    setResults(data.results || []);
                    setShowResults(true);
                    setSearching(false);
                })
                .catch(() => {
                    setSearching(false);
                    setShowResults(false);
                });
        }, 400);
    }, []);

    useEffect(
        () => () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        },
        [],
    );

    const handleSelect = (r: GeoResult): void => {
        const display = r.admin1 ? `${r.name}, ${r.admin1}, ${r.country || ''}` : `${r.name}, ${r.country || ''}`;
        setQuery(display);
        setResults([]);
        setShowResults(false);
        onChange(display, r.latitude, r.longitude);
    };

    return (
        <Box
            key={configKey}
            sx={{ mb: 2 }}
        >
            <Typography
                variant="body2"
                sx={{ mb: 1, fontWeight: 500 }}
            >
                {I18n.t(item.label)}
            </Typography>
            <TextField
                value={query}
                variant="filled"
                onChange={e => {
                    setQuery(e.target.value);
                    doSearch(e.target.value);
                }}
                placeholder={I18n.t('wm_Search city')}
                size="small"
                fullWidth
                slotProps={{
                    input: {
                        endAdornment: searching ? (
                            <CircularProgress size={16} />
                        ) : (
                            <MyLocation sx={{ fontSize: 18, color: 'text.secondary' }} />
                        ),
                    },
                }}
            />
            {showResults && results.length > 0 ? (
                <List
                    dense
                    sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mt: 0.5,
                        maxHeight: 200,
                        overflow: 'auto',
                    }}
                >
                    {results.map((r, i) => (
                        <ListItemButton
                            key={`${r.latitude}-${r.longitude}-${i}`}
                            onClick={() => handleSelect(r)}
                        >
                            <ListItemText
                                primary={r.name}
                                secondary={[r.admin1, r.country].filter(Boolean).join(', ')}
                            />
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary', ml: 1, whiteSpace: 'nowrap' }}
                            >
                                {r.latitude.toFixed(2)}, {r.longitude.toFixed(2)}
                            </Typography>
                        </ListItemButton>
                    ))}
                </List>
            ) : null}
            {showResults && results.length === 0 && !searching ? (
                <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}
                >
                    {I18n.t('wm_No results')}
                </Typography>
            ) : null}
            {latitude != null && longitude != null ? (
                <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}
                >
                    {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
                </Typography>
            ) : null}
        </Box>
    );
}

/** State ID picker component — shows a text field with a browse button that opens SelectID dialog */
function StateIdPicker(props: {
    configKey: string;
    item: CwConfigStateId;
    value: string;
    onChange: (v: unknown) => void;
    socket?: Connection;
    theme?: IobTheme;
}): React.JSX.Element {
    const { configKey, item, value, onChange, socket, theme } = props;
    const [selectOpen, setSelectOpen] = useState(false);

    return (
        <Box
            key={configKey}
            sx={{ mb: 2 }}
        >
            <Typography
                variant="body2"
                sx={{ mb: 1, fontWeight: 500 }}
            >
                {I18n.t(item.label)}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                    value={value || ''}
                    variant="filled"
                    onChange={e => onChange(e.target.value)}
                    placeholder={I18n.t('wm_State ID')}
                    size="small"
                    fullWidth
                />
                <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setSelectOpen(true)}
                    sx={{ minWidth: 40, px: 1 }}
                >
                    ...
                </Button>
                {value ? (
                    <IconButton
                        size="small"
                        onClick={() => onChange('')}
                    >
                        <Delete fontSize="small" />
                    </IconButton>
                ) : null}
            </Box>
            {selectOpen && socket ? (
                <DialogSelectID
                    theme={theme!}
                    socket={socket}
                    dialogName="windStateSelect"
                    title={I18n.t(item.label)}
                    selected={value || ''}
                    onOk={id => {
                        const selectedId = Array.isArray(id) ? id[0] : id;
                        if (selectedId) {
                            onChange(selectedId);
                        }
                        setSelectOpen(false);
                    }}
                    onClose={() => setSelectOpen(false)}
                />
            ) : null}
        </Box>
    );
}

function renderConfigItem(
    key: string,
    item: CwConfigItem,
    value: unknown,
    onChange: (v: unknown) => void,
    socket?: Connection,
    values?: Record<string, unknown>,
    updateMulti?: (updates: Record<string, unknown>) => void,
    theme?: IobTheme,
): React.JSX.Element | null {
    // Check visibleWhen condition (supports exact value or array of allowed values)
    if (item.visibleWhen && values) {
        for (const [condKey, condVal] of Object.entries(item.visibleWhen)) {
            if (Array.isArray(condVal)) {
                if (!condVal.includes(values[condKey])) {
                    return null;
                }
            } else if (values[condKey] !== condVal) {
                return null;
            }
        }
    }

    switch (item.type) {
        case 'select':
            return renderSelect(key, item, value as string, onChange);
        case 'color':
            return renderColor(key, item, value as string, onChange);
        case 'checkbox':
            return (
                <FormControlLabel
                    key={key}
                    control={
                        <Checkbox
                            checked={value as boolean}
                            onChange={(_e, v) => onChange(v)}
                            size="small"
                        />
                    }
                    label={I18n.t(item.label)}
                />
            );
        case 'instanceSelect':
            return (
                <InstanceSelect
                    key={key}
                    configKey={key}
                    item={item}
                    value={value as string}
                    onChange={onChange}
                    socket={socket}
                />
            );
        case 'text':
            return renderText(key, item, value as string, onChange);
        case 'citySearch':
            return (
                <CitySearch
                    key={key}
                    configKey={key}
                    item={item}
                    value={value as string}
                    latitude={values?.latitude as number | undefined}
                    longitude={values?.longitude as number | undefined}
                    onChange={(cityName, lat, lon) => {
                        if (updateMulti) {
                            const updates: Record<string, unknown> = { [key]: cityName };
                            if (lat != null) {
                                updates.latitude = lat;
                            }
                            if (lon != null) {
                                updates.longitude = lon;
                            }
                            updateMulti(updates);
                        } else {
                            onChange(cityName);
                        }
                    }}
                />
            );
        case 'stateId':
            return (
                <StateIdPicker
                    key={key}
                    configKey={key}
                    item={item}
                    value={value as string}
                    onChange={onChange}
                    socket={socket}
                    theme={theme}
                />
            );
    }
}

// --- Dialog ---

export default function CustomWidgetSettingsDialog(props: CustomWidgetSettingsDialogProps): React.JSX.Element | null {
    const { open, widgetDef, onClose, onSave, onDelete, socket } = props;
    const [values, setValues] = useState<Record<string, unknown>>({});

    const config = widgetDef ? CUSTOM_WIDGET_CONFIGS[widgetDef.type] : null;

    useEffect(() => {
        if (open && widgetDef) {
            const cfg = CUSTOM_WIDGET_CONFIGS[widgetDef.type];
            if (cfg) {
                const initial: Record<string, unknown> = {};
                for (const [key, item] of Object.entries(cfg.items)) {
                    const stored = (widgetDef as unknown as Record<string, unknown>)[key];
                    initial[key] = stored !== undefined ? stored : getConfigDefault(item);
                }
                // Load extra keys (latitude, longitude) that aren't in config.items
                for (const extraKey of EXTRA_KEYS) {
                    const stored = (widgetDef as unknown as Record<string, unknown>)[extraKey];
                    if (stored !== undefined) {
                        initial[extraKey] = stored;
                    }
                }
                setValues(initial);
            }
        }
    }, [open, widgetDef]);

    if (!widgetDef || !config) {
        return null;
    }

    const updateValue = (key: string, value: unknown): void => {
        setValues(prev => ({ ...prev, [key]: value }));
    };

    const updateMulti = (updates: Record<string, unknown>): void => {
        setValues(prev => ({ ...prev, ...updates }));
    };

    const hasChanges =
        Object.entries(config.items).some(([key, item]) => {
            const stored = (widgetDef as unknown as Record<string, unknown>)[key];
            const original = stored !== undefined ? stored : getConfigDefault(item);
            return values[key] !== original;
        }) ||
        EXTRA_KEYS.some(k => {
            const stored = (widgetDef as unknown as Record<string, unknown>)[k];
            return values[k] !== undefined && values[k] !== stored;
        });

    const handleSave = (): void => {
        const newDef: Record<string, unknown> = { id: widgetDef.id, type: widgetDef.type };
        for (const [key, item] of Object.entries(config.items)) {
            const value = values[key];
            const defaultVal = getConfigDefault(item);
            if (value !== defaultVal) {
                newDef[key] = value;
            }
        }
        // Copy extra keys (latitude, longitude) from values
        for (const extraKey of EXTRA_KEYS) {
            if (values[extraKey] != null) {
                newDef[extraKey] = values[extraKey];
            }
        }
        onSave(newDef as unknown as CustomWidgetDef);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
        >
            <DialogTitle>{I18n.t(config.name)}</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 1 }}>
                    {Object.entries(config.items).map(([key, item]) =>
                        renderConfigItem(
                            key,
                            item,
                            values[key],
                            v => updateValue(key, v),
                            socket,
                            values,
                            updateMulti,
                            props.theme,
                        ),
                    )}
                </Box>
                {props.availableGroups?.length ? (
                    <Box sx={{ mb: 2 }}>
                        <GroupSelector
                            availableGroups={props.availableGroups}
                            currentGroupId={props.currentGroupId}
                            onGroupChange={groupId => props.onGroupChange?.(groupId)}
                        />
                    </Box>
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
                    onClick={handleSave}
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
