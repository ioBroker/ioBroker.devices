import React, { useState, useEffect, useMemo } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Tab, Tabs } from '@mui/material';
import { Close, Save } from '@mui/icons-material';
import { I18n, IconTrash, type IobTheme } from '@iobroker/gui-components';
import type { AdminConnection } from '@iobroker/socket-client';

import { getText } from '@iobroker/web-components';

import type { CustomWidgetBase, CustomWidgetWebComponent, WmAcl } from '../../../packages/dm-widgets/src/index';
import AclEditor from './AclEditor';
import { loadSettingsTab, storeSettingsTab } from './settingsTab';
import { getPluginConfigSchema } from './pluginLoader';
import { CUSTOM_WIDGET_CONFIGS, getConfigDefault } from './CustomWidgetConfigs';
import { BASE_WIDGET_ITEMS, SIZE_OPTIONS_WITH_2X2 } from './configUtils';
import { getLoadedWebComponent, getWebComponentConfigItems, getWebComponentValueNames } from './webComponents';
import {
    type ConfigGeneric,
    type ConfigGenericProps,
    type ConfigItemAny,
    type ConfigItemPanel,
    JsonConfigComponent,
} from '@iobroker/json-config';
import type { WidgetGroup } from './groupUtils';
import GroupSelector from './GroupSelector';
import ConfigCitySearch from './Components/ConfigCitySearch';
import ConfigColorLevels from './Components/ConfigColorLevels';
import ConfigIconSelect from './Components/ConfigIconSelect';
import ConfigURLSelect from './Components/ConfigURLSelect';
import ConfigLocationSelect from './Components/ConfigLocationSelect';
import ConfigMarkdownEditor from './Components/ConfigMarkdownEditor';
import type StateContext from './StateContext';

interface CustomWidgetSettingsDialogProps {
    open: boolean;
    widgetDef: CustomWidgetBase | null;
    onClose: () => void;
    onSave: (def: CustomWidgetBase) => void;
    onDelete: () => void;
    theme?: IobTheme;
    availableGroups?: WidgetGroup[];
    currentGroupId?: string;
    onGroupChange?: (groupId: string) => void;
    stateContext: StateContext;
    /** Permissions are only offered when the multi-user mode is switched on for the root */
    multiUser?: boolean;
}

/** Recursively collect all data-bearing items from a panel (flattening nested panels) */
function flattenItems(items: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, item] of Object.entries(items)) {
        if (item && typeof item === 'object' && item.type === 'panel' && item.items) {
            // Nested panel — recurse into its items (don't add the panel key itself)
            Object.assign(result, flattenItems(item.items));
        } else if (!key.startsWith('_')) {
            // Regular data item (skip internal keys like _iconsHeader)
            result[key] = item;
        }
    }
    return result;
}

/**
 * The fields of a web component tile: size and color of the tile, then the settings of the component.
 *
 * The active color is left out - the tile of a component is never "active" - and the size too if the component
 * works in its own size only.
 *
 * @param def the tile
 * @param lang language of the user
 */
function getWebComponentConfig(def: CustomWidgetWebComponent, lang: ioBroker.Languages): ConfigItemPanel {
    const component = getLoadedWebComponent(def.wcTag);
    const items: Record<string, ConfigItemAny> = {};
    if (!component?.manifest.size?.noResize) {
        items.size = { ...BASE_WIDGET_ITEMS.size, options: SIZE_OPTIONS_WITH_2X2 } as ConfigItemAny;
    }
    items.color = { ...BASE_WIDGET_ITEMS.color, sm: 12 };
    if (component) {
        Object.assign(items, getWebComponentConfigItems(component.manifest, Object.keys(BASE_WIDGET_ITEMS)));
    }
    return {
        type: 'panel',
        label: (component && getText(component.manifest.name, lang)) || def.wcTag,
        items,
    };
}

/**
 * The settings of a web component in the tile: name -> default of the manifest
 *
 * @param def the tile
 */
function getWebComponentDefaults(def: CustomWidgetBase): Map<string, unknown> {
    const defaults = new Map<string, unknown>();
    if (def.type !== 'webComponent') {
        return defaults;
    }
    const component = getLoadedWebComponent((def as CustomWidgetWebComponent).wcTag);
    if (component) {
        const items = getWebComponentConfigItems(component.manifest, Object.keys(BASE_WIDGET_ITEMS));
        for (const name of getWebComponentValueNames(component.manifest)) {
            if (items[name]) {
                defaults.set(name, (items[name] as { default?: unknown }).default);
            }
        }
    }
    return defaults;
}

/** Extra keys that citySearch can write besides its own key */
const EXTRA_KEYS = ['latitude', 'longitude'] as const;

/** Custom component registry for JsonConfigComponent */
const CUSTOM_COMPONENTS: Record<string, typeof ConfigGeneric<ConfigGenericProps, any>> = {
    citySearch: ConfigCitySearch,
    colorLevels: ConfigColorLevels,
    iconSelect: ConfigIconSelect,
    urlSelector: ConfigURLSelect,
    locationSelect: ConfigLocationSelect,
    markdownEditor: ConfigMarkdownEditor,
};

// --- Dialog ---

export default function CustomWidgetSettingsDialog(props: CustomWidgetSettingsDialogProps): React.JSX.Element | null {
    const { open, widgetDef, onClose, onSave, onDelete, stateContext } = props;
    const [values, setValues] = useState<Record<string, any>>({});
    /** Rules of this widget — kept outside `values`, it is not part of the JsonConfig schema */
    const [acl, setAcl] = useState<WmAcl | undefined>(undefined);
    const [tab, setTab] = useState(0);

    // Normalize config to ConfigItemPanel — base items (size, color) are prepended automatically
    const config: ConfigItemPanel | null = useMemo(() => {
        if (!widgetDef) {
            return null;
        }

        // Newline has no settings at all
        if (widgetDef.type === 'newline') {
            return CUSTOM_WIDGET_CONFIGS.newline;
        }

        if (widgetDef.type === 'webComponent') {
            return getWebComponentConfig(widgetDef as CustomWidgetWebComponent, stateContext.language);
        }

        const wd = widgetDef as any;
        if (widgetDef.type === 'plugin' && wd.pluginAdapter && wd.pluginComponent) {
            const pluginSchema = getPluginConfigSchema(wd.pluginAdapter, wd.pluginComponent);
            if (pluginSchema) {
                if (pluginSchema.schema.type === 'panel') {
                    return {
                        ...pluginSchema.schema,
                        items: { ...BASE_WIDGET_ITEMS, ...pluginSchema.schema.items },
                        label: pluginSchema.name || pluginSchema.schema.label || wd.pluginAdapter,
                    };
                }
                // Tabs: flatten into a single panel
                const allItems: Record<string, ConfigItemAny> = { ...BASE_WIDGET_ITEMS };
                for (const tabKey of Object.keys(pluginSchema.schema.items)) {
                    const tab = pluginSchema.schema.items[tabKey];
                    if (tab.items) {
                        Object.assign(allItems, tab.items);
                    }
                }
                return { type: 'panel', label: pluginSchema.name, items: allItems };
            }
        }

        // Built-in widgets: prepend base items to the widget's own schema
        const widgetConfig = CUSTOM_WIDGET_CONFIGS[widgetDef.type];
        if (widgetConfig) {
            return {
                ...widgetConfig,
                items: { ...BASE_WIDGET_ITEMS, ...widgetConfig.items },
            };
        }

        return null;
    }, [widgetDef, stateContext.language]);

    /** The settings of a web component, kept in `wcSettings` of the tile, not next to its size */
    const wcDefaults = useMemo(
        () => (widgetDef ? getWebComponentDefaults(widgetDef) : new Map<string, unknown>()),
        [widgetDef],
    );

    /**
     * The value of a field as stored in the tile
     *
     * @param def the tile
     * @param key name of the field
     * @param item the field
     */
    const getStored = (def: CustomWidgetBase, key: string, item: ConfigItemAny): unknown => {
        if (wcDefaults.has(key)) {
            return (def as CustomWidgetWebComponent).wcSettings?.[key] ?? wcDefaults.get(key);
        }
        const stored = (def as unknown as Record<string, unknown>)[key];
        return stored !== undefined ? stored : getConfigDefault(item);
    };

    // Initialize values from widgetDef when dialog opens
    useEffect(() => {
        if (open && widgetDef && config) {
            const initial: Record<string, any> = {};
            const allItems = flattenItems(config.items);
            for (const [key, item] of Object.entries(allItems)) {
                initial[key] = getStored(widgetDef, key, item);
            }
            for (const extraKey of EXTRA_KEYS) {
                const stored = (widgetDef as unknown as Record<string, unknown>)[extraKey];
                if (stored !== undefined) {
                    initial[extraKey] = stored;
                }
            }
            setValues(initial);
            setAcl(widgetDef.acl);
            setTab(loadSettingsTab(!!props.multiUser));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, widgetDef]);

    if (!widgetDef || !config) {
        return null;
    }

    const allItems = flattenItems(config.items);
    const hasChanges =
        Object.entries(allItems).some(([key, item]) => values[key] !== getStored(widgetDef, key, item)) ||
        EXTRA_KEYS.some(k => {
            const stored = (widgetDef as unknown as Record<string, unknown>)[k];
            return values[k] !== undefined && values[k] !== stored;
        }) ||
        // Nested object — a reference comparison would miss every edit inside the rules
        JSON.stringify(acl ?? null) !== JSON.stringify(widgetDef.acl ?? null);

    const handleSave = (): void => {
        const newDef: Record<string, unknown> = { id: widgetDef.id, type: widgetDef.type };
        if (widgetDef.favorite) {
            newDef.favorite = true;
        }
        // `newDef` is rebuilt from the schema, so everything outside it has to be carried over
        if (acl) {
            newDef.acl = acl;
        }
        if (widgetDef.type === 'plugin') {
            const p = widgetDef as any;
            if (p.pluginAdapter) {
                newDef.pluginAdapter = p.pluginAdapter;
            }
            if (p.pluginComponent) {
                newDef.pluginComponent = p.pluginComponent;
            }
            if (p.pluginUrl) {
                newDef.pluginUrl = p.pluginUrl;
            }
        }
        if (widgetDef.type === 'webComponent') {
            const wc = widgetDef as CustomWidgetWebComponent;
            newDef.wcAdapter = wc.wcAdapter;
            newDef.wcTag = wc.wcTag;
            // a component that works in its own size only has no size field: its tile keeps the size it got
            if (!allItems.size && wc.size) {
                newDef.size = wc.size;
            }
            const wcSettings: Record<string, unknown> = {};
            for (const [key, defaultVal] of wcDefaults) {
                const value = values[key];
                if (value !== undefined && value !== null && value !== defaultVal) {
                    wcSettings[key] = value;
                }
            }
            if (Object.keys(wcSettings).length) {
                newDef.wcSettings = wcSettings;
            }
        }
        for (const [key, item] of Object.entries(allItems)) {
            if (wcDefaults.has(key)) {
                continue;
            }
            const value = values[key];
            const defaultVal = getConfigDefault(item);
            if (value !== defaultVal) {
                newDef[key] = value;
            }
        }
        for (const extraKey of EXTRA_KEYS) {
            if (values[extraKey] != null) {
                newDef[extraKey] = values[extraKey];
            }
        }
        onSave(newDef as unknown as CustomWidgetBase);
    };

    const socket = stateContext.getSocket() as unknown as AdminConnection;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            slotProps={{ paper: { sx: { maxHeight: '90vh' } } }}
        >
            <DialogTitle>{I18n.t((config.label as string) || '')}</DialogTitle>
            {props.multiUser ? (
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
            <DialogContent
                dividers
                sx={{ display: props.multiUser && tab === 1 ? 'block' : 'none' }}
            >
                <AclEditor
                    acl={acl}
                    onChange={setAcl}
                    stateContext={stateContext}
                />
            </DialogContent>
            {/* Stays mounted while the permissions tab is shown: JsonConfigComponent builds its
                form when it mounts, so unmounting it would drop the edits made so far. */}
            <DialogContent
                dividers
                sx={{ display: !props.multiUser || tab === 0 ? 'block' : 'none' }}
            >
                {socket && props.theme ? (
                    <JsonConfigComponent
                        socket={socket}
                        themeName={props.theme.name}
                        themeType={props.theme.palette.mode}
                        adapterName={stateContext.instanceId?.replace(/\.\d+$/, '') || 'devices'}
                        instance={parseInt(stateContext.instanceId?.match(/\.(\d+)$/)?.[1] || '0', 10)}
                        isFloatComma={stateContext.isFloatComma}
                        dateFormat={stateContext.dateFormat}
                        schema={config}
                        data={values}
                        onError={() => {}}
                        onChange={(data: Record<string, any> | null) => data && setValues(data)}
                        theme={props.theme}
                        customComponents={CUSTOM_COMPONENTS}
                        embedded
                        imagePrefix={stateContext.admin ? '../..' : '../..'}
                    />
                ) : null}
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
                    startIcon={<IconTrash />}
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
                    {I18n.t(hasChanges ? 'wm_Cancel' : 'wm_Close')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
