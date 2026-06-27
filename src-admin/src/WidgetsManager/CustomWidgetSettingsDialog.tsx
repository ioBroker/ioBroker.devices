import React, { useState, useEffect, useMemo } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { Close, Delete, Save } from '@mui/icons-material';
import { I18n, type IobTheme } from '@iobroker/adapter-react-v5';
import type { AdminConnection } from '@iobroker/socket-client';

import type { CustomWidgetBase } from '../../../packages/dm-widgets/src/index';
import { getPluginConfigSchema } from './pluginLoader';
import { CUSTOM_WIDGET_CONFIGS, getConfigDefault } from './CustomWidgetConfigs';
import { BASE_WIDGET_ITEMS } from './configUtils';
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

/** Extra keys that citySearch can write besides its own key */
const EXTRA_KEYS = ['latitude', 'longitude'] as const;

/** Custom component registry for JsonConfigComponent */
const CUSTOM_COMPONENTS: Record<string, typeof ConfigGeneric<ConfigGenericProps, any>> = {
    citySearch: ConfigCitySearch,
    colorLevels: ConfigColorLevels,
    iconSelect: ConfigIconSelect,
    urlSelector: ConfigURLSelect,
    locationSelect: ConfigLocationSelect,
};

// --- Dialog ---

export default function CustomWidgetSettingsDialog(props: CustomWidgetSettingsDialogProps): React.JSX.Element | null {
    const { open, widgetDef, onClose, onSave, onDelete, stateContext } = props;
    const [values, setValues] = useState<Record<string, any>>({});

    // Normalize config to ConfigItemPanel — base items (size, color) are prepended automatically
    const config: ConfigItemPanel | null = useMemo(() => {
        if (!widgetDef) {
            return null;
        }

        // Newline has no settings at all
        if (widgetDef.type === 'newline') {
            return CUSTOM_WIDGET_CONFIGS.newline;
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
    }, [widgetDef]);

    // Initialize values from widgetDef when dialog opens
    useEffect(() => {
        if (open && widgetDef && config) {
            const initial: Record<string, any> = {};
            const allItems = flattenItems(config.items);
            for (const [key, item] of Object.entries(allItems)) {
                const stored = (widgetDef as unknown as Record<string, unknown>)[key];
                initial[key] = stored !== undefined ? stored : getConfigDefault(item);
            }
            for (const extraKey of EXTRA_KEYS) {
                const stored = (widgetDef as unknown as Record<string, unknown>)[extraKey];
                if (stored !== undefined) {
                    initial[extraKey] = stored;
                }
            }
            setValues(initial);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, widgetDef]);

    if (!widgetDef || !config) {
        return null;
    }

    const allItems = flattenItems(config.items);
    const hasChanges =
        Object.entries(allItems).some(([key, item]) => {
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
        if (widgetDef.favorite) {
            newDef.favorite = true;
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
        for (const [key, item] of Object.entries(allItems)) {
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
            <DialogContent dividers>
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
                        onChange={(data: Record<string, any>) => setValues(data)}
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
