import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Box,
    Button,
    ButtonBase,
    Chip,
    Dialog,
    IconButton,
    InputAdornment,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    ListSubheader,
    TextField,
    Typography,
    useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
    AccessTime,
    Air,
    Apps,
    Bolt,
    Close,
    CreateNewFolder,
    Dashboard,
    Extension,
    InfoOutlined,
    Insights,
    Language,
    People,
    Search,
    SearchOff,
    Speed,
    StickyNote2,
    ViewQuilt,
    WbCloudy,
    WrapText,
} from '@mui/icons-material';
import { I18n } from '@iobroker/gui-components';

import { getText, resolveManifestUrl, type LoadedWebComponent } from '@iobroker/web-components';

import type { CustomWidgetType } from '../../../packages/dm-widgets/src/index';
import type StateContext from './StateContext';
import { resolveTranslated } from './Widgets';

/** The sets of the widgets this app brings itself */
type BuiltInSetId = 'info' | 'values' | 'layout';

const BUILT_IN_SETS: { id: BuiltInSetId; i18nKey: string; icon: React.JSX.Element }[] = [
    { id: 'info', i18nKey: 'wm_set_info', icon: <InfoOutlined /> },
    { id: 'values', i18nKey: 'wm_set_values', icon: <Insights /> },
    { id: 'layout', i18nKey: 'wm_set_layout', icon: <ViewQuilt /> },
];

interface BuiltInWidget {
    type: CustomWidgetType;
    set: BuiltInSetId;
    icon: React.JSX.Element;
    i18nKey: string;
    descriptionKey: string;
}

const BUILT_IN_WIDGETS: BuiltInWidget[] = [
    { type: 'clock', set: 'info', icon: <AccessTime />, i18nKey: 'wm_Clock', descriptionKey: 'wm_Clock_desc' },
    { type: 'weather', set: 'info', icon: <WbCloudy />, i18nKey: 'wm_Weather', descriptionKey: 'wm_Weather_desc' },
    { type: 'wind', set: 'info', icon: <Air />, i18nKey: 'wm_Wind', descriptionKey: 'wm_Wind_desc' },
    { type: 'presence', set: 'info', icon: <People />, i18nKey: 'wm_Presence', descriptionKey: 'wm_Presence_desc' },
    { type: 'iframe', set: 'info', icon: <Language />, i18nKey: 'wm_Iframe', descriptionKey: 'wm_Iframe_desc' },
    {
        type: 'markdown',
        set: 'info',
        icon: <StickyNote2 />,
        i18nKey: 'wm_Markdown',
        descriptionKey: 'wm_Markdown_desc',
    },
    {
        type: 'universal',
        set: 'values',
        icon: <Dashboard />,
        i18nKey: 'wm_Universal',
        descriptionKey: 'wm_Universal_desc',
    },
    { type: 'gauge', set: 'values', icon: <Speed />, i18nKey: 'wm_Gauge', descriptionKey: 'wm_Gauge_desc' },
    {
        type: 'energyFlow',
        set: 'values',
        icon: <Bolt />,
        i18nKey: 'wm_EnergyFlow',
        descriptionKey: 'wm_EnergyFlow_desc',
    },
    { type: 'newline', set: 'layout', icon: <WrapText />, i18nKey: 'wm_New line', descriptionKey: 'wm_New line_desc' },
];

/** Value of the set filter that shows all sets */
const ALL_SETS = '';
/** The entry that creates a subcategory: it asks for a name before it adds anything */
const CATEGORY_KEY = '__category';
const TITLE_ID = 'wm-add-widget-title';

/** One widget the dialog offers */
interface PaletteItem {
    key: string;
    name: string;
    description: string;
    icon: React.JSX.Element;
    /** Small label under the description, e.g. that it is a web component */
    badge?: string;
    /** Normalized text the search looks in */
    haystack: string;
    /** Adds the widget; not set for the category, which asks for a name first */
    onAdd?: () => void;
}

/** Widgets that belong together: a theme of the built-in ones, or everything one adapter brings */
interface PaletteSet {
    id: string;
    name: string;
    icon: React.JSX.Element;
    builtIn: boolean;
    items: PaletteItem[];
}

/** What the dialog shows of an adapter: its title and its icon */
interface AdapterInfo {
    title?: ioBroker.StringOrTranslated;
    icon?: string;
}

/** Title and icon of the adapters, read once per page */
const adapterInfoCache = new Map<string, Promise<AdapterInfo>>();

function loadAdapterInfo(stateContext: StateContext, adapter: string): Promise<AdapterInfo> {
    let promise = adapterInfoCache.get(adapter);
    if (!promise) {
        promise = stateContext
            .getObject<ioBroker.AdapterObject>(`system.adapter.${adapter}`)
            .then(obj => ({ title: obj?.common?.titleLang || obj?.common?.title, icon: obj?.common?.icon }))
            // the user may not read the adapter object: then the set is named after the adapter
            .catch((): AdapterInfo => ({}));
        adapterInfoCache.set(adapter, promise);
    }
    return promise;
}

/** Lower case and without accents, so that "fur" finds "für" */
function normalize(text: string): string {
    return text
        .toLocaleLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

/** URL of a file in the admin folder of an adapter, from where this page is served */
function adapterFileUrl(adapter: string, file: string, admin: boolean): string {
    if (file.startsWith('data:') || file.startsWith('http')) {
        return file;
    }
    return admin ? `../../adapter/${adapter}/${file}` : `../${adapter}.admin/${file}`;
}

/** Picture of an adapter or of a widget; the puzzle piece, if the adapter does not have the file */
function ImageIcon(props: { src: string; size: number }): React.JSX.Element {
    const [failedSrc, setFailedSrc] = useState('');
    if (failedSrc === props.src) {
        return <Extension />;
    }
    return (
        <img
            src={props.src}
            alt=""
            onError={() => setFailedSrc(props.src)}
            style={{ width: props.size, height: props.size, objectFit: 'contain' }}
        />
    );
}

interface CustomWidgetDialogProps {
    open: boolean;
    onClose: () => void;
    onAdd: (type: CustomWidgetType) => void;
    onCreateCategory?: (name: string) => void;
    /** Plugin widgets from adapter instances */
    adapterWidgets?: Record<string, ioBroker.DevicesWidgets>;
    /** Callback to add a plugin widget */
    onAddPlugin?: (adapter: string, component: string, url: string, label: string) => void;
    /** Web components of the adapters (`common.webComponents`) */
    webComponents?: LoadedWebComponent[];
    /** Callback to add a web component, by the name of its element */
    onAddWebComponent?: (tag: string) => void;
    /** To read the titles and icons of the adapters that bring widgets */
    stateContext?: StateContext;
    admin: boolean;
    language: ioBroker.Languages;
}

/**
 * Palette of the widgets that can be added to a category: the widgets come in sets - the built-in ones by theme,
 * the ones of an adapter (plugin widgets and web components) together - and can be searched and filtered by set
 */
export default function CustomWidgetDialog(props: CustomWidgetDialogProps): React.JSX.Element {
    const {
        open,
        onClose,
        onAdd,
        onCreateCategory,
        adapterWidgets,
        onAddPlugin,
        webComponents,
        onAddWebComponent,
        stateContext,
        admin,
        language,
    } = props;
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const [query, setQuery] = useState('');
    const [selectedSet, setSelectedSet] = useState(ALL_SETS);
    const [showNameInput, setShowNameInput] = useState(false);
    const [categoryName, setCategoryName] = useState('');
    const [adapterInfos, setAdapterInfos] = useState<Record<string, AdapterInfo>>({});
    const searchRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    /** The adapters that bring widgets */
    const adapterNames = useMemo((): string[] => {
        const names = new Set<string>();
        if (adapterWidgets && onAddPlugin) {
            Object.keys(adapterWidgets).forEach(adapter => names.add(adapter));
        }
        if (webComponents && onAddWebComponent) {
            webComponents.forEach(component => component.adapter && names.add(component.adapter));
        }
        return [...names];
    }, [adapterWidgets, onAddPlugin, webComponents, onAddWebComponent]);

    useEffect(() => {
        if (!open || !stateContext) {
            return undefined;
        }
        let active = true;
        for (const adapter of adapterNames) {
            void loadAdapterInfo(stateContext, adapter).then(info => {
                if (active) {
                    setAdapterInfos(prev => (prev[adapter] ? prev : { ...prev, [adapter]: info }));
                }
            });
        }
        return () => {
            active = false;
        };
    }, [open, stateContext, adapterNames]);

    const sets = useMemo((): PaletteSet[] => {
        const builtIn: PaletteSet[] = BUILT_IN_SETS.map(set => ({
            id: set.id,
            name: I18n.t(set.i18nKey),
            icon: set.icon,
            builtIn: true,
            items: [],
        }));
        const builtInById = new Map(builtIn.map(set => [set.id, set]));
        const addItem = (set: PaletteSet, item: Omit<PaletteItem, 'haystack'>, keywords: string): void => {
            set.items.push({
                ...item,
                haystack: normalize(`${item.name} ${item.description} ${set.name} ${keywords}`),
            });
        };

        if (onCreateCategory) {
            addItem(
                builtInById.get('layout')!,
                {
                    key: CATEGORY_KEY,
                    name: I18n.t('wm_Category'),
                    description: I18n.t('wm_Category_desc'),
                    icon: <CreateNewFolder />,
                },
                'category folder',
            );
        }
        for (const widget of BUILT_IN_WIDGETS) {
            addItem(
                builtInById.get(widget.set)!,
                {
                    key: widget.type,
                    name: I18n.t(widget.i18nKey),
                    description: I18n.t(widget.descriptionKey),
                    icon: widget.icon,
                    onAdd: () => onAdd(widget.type),
                },
                widget.type,
            );
        }

        // Everything an adapter brings - plugin widgets and web components - is one set
        const adapterSets = new Map<string, PaletteSet>();
        const getAdapterSet = (adapter: string): PaletteSet => {
            let set = adapterSets.get(adapter);
            if (!set) {
                const info = adapterInfos[adapter];
                set = {
                    id: `adapter:${adapter}`,
                    name: resolveTranslated(info?.title, language) || adapter || I18n.t('wm_Web component'),
                    icon: info?.icon ? (
                        <ImageIcon
                            src={adapterFileUrl(adapter, info.icon, admin)}
                            size={22}
                        />
                    ) : (
                        <Extension />
                    ),
                    builtIn: false,
                    items: [],
                };
                adapterSets.set(adapter, set);
            }
            return set;
        };

        if (adapterWidgets && onAddPlugin) {
            for (const [adapter, desc] of Object.entries(adapterWidgets)) {
                for (const comp of desc.components || []) {
                    const label = resolveTranslated(comp.label, language) || comp.name;
                    const set = getAdapterSet(adapter);
                    addItem(
                        set,
                        {
                            key: `${adapter}_${comp.name}`,
                            name: label,
                            description: resolveTranslated(comp.description, language),
                            icon: comp.icon ? (
                                <ImageIcon
                                    src={adapterFileUrl(adapter, `dm-widgets/${comp.icon}`, admin)}
                                    size={28}
                                />
                            ) : (
                                <Extension />
                            ),
                            onAdd: () => onAddPlugin(adapter, comp.name, desc.url || 'customDevices.js', label),
                        },
                        `${adapter} ${comp.name}`,
                    );
                }
            }
        }
        if (webComponents && onAddWebComponent) {
            for (const component of webComponents) {
                const { manifest } = component;
                const icon = resolveManifestUrl(manifest.icon, component.url);
                const set = getAdapterSet(component.adapter);
                addItem(
                    set,
                    {
                        key: `wc_${manifest.tag}`,
                        name: getText(manifest.name, language) || manifest.tag,
                        description: getText(manifest.description, language),
                        icon: icon ? (
                            <ImageIcon
                                src={icon}
                                size={28}
                            />
                        ) : (
                            <Extension />
                        ),
                        badge: I18n.t('wm_Web component'),
                        onAdd: () => onAddWebComponent(manifest.tag),
                    },
                    `${component.adapter} ${manifest.tag} web component`,
                );
            }
        }

        return [
            ...builtIn.filter(set => set.items.length),
            ...[...adapterSets.values()].sort((a, b) => a.name.localeCompare(b.name)),
        ];
    }, [
        onCreateCategory,
        onAdd,
        adapterWidgets,
        onAddPlugin,
        webComponents,
        onAddWebComponent,
        adapterInfos,
        admin,
        language,
    ]);

    /** The sets with only the widgets that match the search */
    const filteredSets = useMemo((): PaletteSet[] => {
        const words = normalize(query).split(/\s+/).filter(Boolean);
        if (!words.length) {
            return sets;
        }
        return sets.map(set => ({
            ...set,
            items: set.items.filter(item => words.every(word => item.haystack.includes(word))),
        }));
    }, [sets, query]);

    // A set that is gone (e.g. its adapter was removed) shows all
    const currentSet = filteredSets.some(set => set.id === selectedSet) ? selectedSet : ALL_SETS;
    const totalCount = filteredSets.reduce((sum, set) => sum + set.items.length, 0);
    const shownSets = filteredSets.filter(
        set => set.items.length && (currentSet === ALL_SETS || set.id === currentSet),
    );
    const shownItems = shownSets.flatMap(set => set.items);

    const handleClose = (): void => {
        setQuery('');
        setSelectedSet(ALL_SETS);
        setShowNameInput(false);
        setCategoryName('');
        onClose();
    };

    const handleCreateCategory = (): void => {
        const name = categoryName.trim();
        if (name && onCreateCategory) {
            onCreateCategory(name);
            handleClose();
        }
    };

    const cancelCategory = (): void => {
        setShowNameInput(false);
        setCategoryName('');
    };

    const addItem = (item: PaletteItem): void => {
        if (item.onAdd) {
            item.onAdd();
            handleClose();
        } else {
            setShowNameInput(true);
        }
    };

    const selectSet = (id: string): void => {
        setSelectedSet(id);
        resultsRef.current?.scrollTo({ top: 0 });
    };

    const onSearchKeyDown = (e: React.KeyboardEvent): void => {
        if (e.key === 'Enter' && shownItems.length === 1) {
            e.preventDefault();
            addItem(shownItems[0]);
        } else if (e.key === 'ArrowDown') {
            const first = resultsRef.current?.querySelector<HTMLElement>('[data-widget-card]');
            if (first) {
                e.preventDefault();
                first.focus();
            }
        } else if (e.key === 'Escape' && query) {
            // the first Escape clears the search, the second one closes the dialog
            e.stopPropagation();
            setQuery('');
        }
    };

    const iconBoxSx = {
        width: 44,
        height: 44,
        flexShrink: 0,
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'primary.main',
        bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.1),
        '& svg': { fontSize: 26 },
    };
    const cardSx = {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        gap: 1.5,
        p: 1.5,
        width: '100%',
        height: '100%',
        textAlign: 'left',
        borderRadius: '12px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
    } as const;

    const renderCategoryForm = (item: PaletteItem): React.JSX.Element => (
        <Box
            key={item.key}
            sx={{ ...cardSx, flexDirection: 'column', alignItems: 'stretch', gap: 1, borderColor: 'primary.main' }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={iconBoxSx}>{item.icon}</Box>
                <Typography
                    component="span"
                    variant="subtitle2"
                    sx={{ fontWeight: 600 }}
                >
                    {item.name}
                </Typography>
            </Box>
            <TextField
                autoFocus
                size="small"
                fullWidth
                placeholder={I18n.t('wm_Category name')}
                value={categoryName}
                onChange={e => setCategoryName(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') {
                        handleCreateCategory();
                    } else if (e.key === 'Escape') {
                        // closes only the input, not the dialog
                        e.stopPropagation();
                        cancelCategory();
                    }
                }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button
                    size="small"
                    color="inherit"
                    onClick={cancelCategory}
                >
                    {I18n.t('wm_Cancel')}
                </Button>
                <Button
                    size="small"
                    variant="contained"
                    disabled={!categoryName.trim()}
                    onClick={handleCreateCategory}
                >
                    {I18n.t('wm_Create')}
                </Button>
            </Box>
        </Box>
    );

    const renderCard = (item: PaletteItem): React.JSX.Element => {
        if (item.key === CATEGORY_KEY && showNameInput) {
            return renderCategoryForm(item);
        }
        return (
            <ButtonBase
                key={item.key}
                data-widget-card
                focusRipple
                onClick={() => addItem(item)}
                sx={{
                    ...cardSx,
                    transition: theme.transitions.create(
                        ['border-color', 'background-color', 'box-shadow', 'transform'],
                        {
                            duration: theme.transitions.duration.shorter,
                        },
                    ),
                    '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover',
                        boxShadow: 2,
                        transform: 'translateY(-1px)',
                    },
                    '&.Mui-focusVisible': {
                        borderColor: 'primary.main',
                        outline: `2px solid ${theme.palette.primary.main}`,
                        outlineOffset: 1,
                    },
                    '@media (prefers-reduced-motion: reduce)': {
                        transition: 'none',
                        '&:hover': { transform: 'none' },
                    },
                }}
            >
                <Box
                    component="span"
                    sx={iconBoxSx}
                >
                    {item.icon}
                </Box>
                <Box
                    component="span"
                    sx={{ display: 'block', minWidth: 0, flex: 1 }}
                >
                    <Typography
                        component="span"
                        variant="subtitle2"
                        sx={{ display: 'block', fontWeight: 600, lineHeight: 1.3, overflowWrap: 'anywhere' }}
                    >
                        {item.name}
                    </Typography>
                    {item.description ? (
                        <Typography
                            component="span"
                            variant="body2"
                            sx={{
                                display: '-webkit-box',
                                mt: 0.25,
                                fontSize: 13,
                                color: 'text.secondary',
                                overflow: 'hidden',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                            }}
                        >
                            {item.description}
                        </Typography>
                    ) : null}
                    {item.badge ? (
                        <Box
                            component="span"
                            sx={{
                                display: 'inline-block',
                                mt: 0.75,
                                px: 0.75,
                                py: 0.125,
                                borderRadius: '6px',
                                fontSize: 11,
                                fontWeight: 500,
                                color: 'text.secondary',
                                bgcolor: 'action.selected',
                            }}
                        >
                            {item.badge}
                        </Box>
                    ) : null}
                </Box>
            </ButtonBase>
        );
    };

    const renderSetButton = (id: string, name: string, icon: React.JSX.Element, count: number): React.JSX.Element => (
        <ListItemButton
            key={id}
            selected={currentSet === id}
            onClick={() => selectSet(id)}
            sx={{
                mx: 1,
                mb: 0.25,
                borderRadius: '10px',
                // sets without a match stay clickable, but step back
                opacity: count || id === ALL_SETS ? 1 : 0.45,
            }}
        >
            <ListItemIcon sx={{ minWidth: 36, '& svg': { fontSize: 22 } }}>{icon}</ListItemIcon>
            <ListItemText
                primary={name}
                slotProps={{ primary: { noWrap: true, title: name, sx: { fontSize: 14 } } }}
            />
            <Typography
                component="span"
                variant="caption"
                sx={{ ml: 1, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
            >
                {count}
            </Typography>
        </ListItemButton>
    );

    const subheaderSx = {
        position: 'static',
        mt: 1.5,
        px: 2.5,
        lineHeight: '28px',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        color: 'text.secondary',
        bgcolor: 'transparent',
    } as const;
    const builtInSets = filteredSets.filter(set => set.builtIn);
    const adapterSets = filteredSets.filter(set => !set.builtIn);

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullScreen={fullScreen}
            fullWidth
            maxWidth="lg"
            aria-labelledby={TITLE_ID}
            slotProps={{
                paper: {
                    sx: {
                        height: fullScreen ? '100%' : 'min(860px, calc(100% - 64px))',
                        borderRadius: fullScreen ? 0 : '16px',
                        overflow: 'hidden',
                        // the sticky set headers have the same color as the paper
                        backgroundImage: 'none',
                    },
                },
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 1.5,
                    px: { xs: 2, sm: 3 },
                    pt: 2,
                    pb: 1.5,
                    borderBottom: 1,
                    borderColor: 'divider',
                }}
            >
                <Typography
                    id={TITLE_ID}
                    component="h2"
                    variant="h6"
                    sx={{ flexShrink: 0, mr: 1 }}
                >
                    {I18n.t('wm_Add widget')}
                </Typography>
                <TextField
                    inputRef={searchRef}
                    autoFocus={!fullScreen}
                    size="small"
                    value={query}
                    placeholder={I18n.t('wm_Search widgets')}
                    onChange={e => {
                        setQuery(e.target.value);
                        resultsRef.current?.scrollTo({ top: 0 });
                    }}
                    onKeyDown={onSearchKeyDown}
                    sx={{ order: { xs: 3, sm: 0 }, flex: { xs: '1 1 100%', sm: '1 1 auto' }, maxWidth: { sm: 520 } }}
                    slotProps={{
                        input: {
                            sx: { borderRadius: '10px' },
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search fontSize="small" />
                                </InputAdornment>
                            ),
                            endAdornment: query ? (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        edge="end"
                                        aria-label={I18n.t('wm_Clear')}
                                        onClick={() => {
                                            setQuery('');
                                            searchRef.current?.focus();
                                        }}
                                    >
                                        <Close fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ) : null,
                        },
                        htmlInput: { 'aria-label': I18n.t('wm_Search widgets') },
                    }}
                />
                <IconButton
                    aria-label={I18n.t('wm_Close')}
                    onClick={handleClose}
                    sx={{ ml: 'auto' }}
                >
                    <Close />
                </IconButton>
            </Box>

            {/* Narrow screens: the sets as a row of chips instead of the side list */}
            <Box
                sx={{
                    display: { xs: 'flex', md: 'none' },
                    flexShrink: 0,
                    gap: 1,
                    px: { xs: 2, sm: 3 },
                    py: 1,
                    overflowX: 'auto',
                    borderBottom: 1,
                    borderColor: 'divider',
                    scrollbarWidth: 'none',
                }}
            >
                {[{ id: ALL_SETS, name: I18n.t('wm_All widgets'), count: totalCount }]
                    .concat(filteredSets.map(set => ({ id: set.id, name: set.name, count: set.items.length })))
                    .map(set => (
                        <Chip
                            key={set.id}
                            label={`${set.name} · ${set.count}`}
                            color={currentSet === set.id ? 'primary' : 'default'}
                            variant={currentSet === set.id ? 'filled' : 'outlined'}
                            onClick={() => selectSet(set.id)}
                            sx={{ flexShrink: 0, opacity: set.count || set.id === ALL_SETS ? 1 : 0.45 }}
                        />
                    ))}
            </Box>

            <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
                <Box
                    component="nav"
                    aria-label={I18n.t('wm_Widget sets')}
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        width: 260,
                        flexShrink: 0,
                        py: 1,
                        overflowY: 'auto',
                        borderRight: 1,
                        borderColor: 'divider',
                    }}
                >
                    <List
                        dense
                        disablePadding
                    >
                        {renderSetButton(ALL_SETS, I18n.t('wm_All widgets'), <Apps />, totalCount)}
                        {builtInSets.length ? (
                            <ListSubheader sx={subheaderSx}>{I18n.t('wm_Built-in')}</ListSubheader>
                        ) : null}
                        {builtInSets.map(set => renderSetButton(set.id, set.name, set.icon, set.items.length))}
                        {adapterSets.length ? (
                            <ListSubheader sx={subheaderSx}>{I18n.t('wm_From adapters')}</ListSubheader>
                        ) : null}
                        {adapterSets.map(set => renderSetButton(set.id, set.name, set.icon, set.items.length))}
                    </List>
                </Box>

                <Box
                    ref={resultsRef}
                    sx={{ flex: 1, minWidth: 0, overflowY: 'auto', px: { xs: 2, sm: 3 }, pb: 3 }}
                >
                    {shownSets.length ? (
                        shownSets.map(set => (
                            <Box
                                component="section"
                                key={set.id}
                                aria-label={set.name}
                                sx={{ mb: 2 }}
                            >
                                <Box
                                    sx={{
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        pt: 1.5,
                                        pb: 0.75,
                                        bgcolor: 'background.paper',
                                        color: 'text.secondary',
                                        '& svg': { fontSize: 20 },
                                    }}
                                >
                                    {set.icon}
                                    <Typography
                                        component="h3"
                                        variant="subtitle1"
                                        sx={{ fontWeight: 600, color: 'text.primary' }}
                                    >
                                        {set.name}
                                    </Typography>
                                    <Typography
                                        component="span"
                                        variant="body2"
                                    >
                                        {set.items.length}
                                    </Typography>
                                </Box>
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))',
                                        gap: 1.5,
                                        // the lifted first row (shadow, focus ring) must not slide under the sticky header
                                        pt: 0.75,
                                    }}
                                >
                                    {set.items.map(renderCard)}
                                </Box>
                            </Box>
                        ))
                    ) : (
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 1,
                                py: 8,
                                textAlign: 'center',
                                color: 'text.secondary',
                            }}
                        >
                            <SearchOff sx={{ fontSize: 48, opacity: 0.6 }} />
                            <Typography>{I18n.t('wm_No widget matches the search')}</Typography>
                            {currentSet !== ALL_SETS && totalCount ? (
                                <Button onClick={() => selectSet(ALL_SETS)}>{I18n.t('wm_Search in all sets')}</Button>
                            ) : null}
                        </Box>
                    )}
                </Box>
            </Box>
        </Dialog>
    );
}
