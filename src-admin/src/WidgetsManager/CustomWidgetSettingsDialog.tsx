import React, { useState, useEffect, useMemo } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { Close, Delete, Save } from '@mui/icons-material';
import { I18n, type Connection, type IobTheme } from '@iobroker/adapter-react-v5';
import type { AdminConnection } from '@iobroker/socket-client';

import type { CustomWidgetDef } from '../../../src/widget-utils';
import { getPluginConfigSchema } from './pluginLoader';
import { CUSTOM_WIDGET_CONFIGS, getConfigDefault } from './CustomWidgetConfigs';
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

interface CustomWidgetSettingsDialogProps {
    open: boolean;
    widgetDef: CustomWidgetDef | null;
    onClose: () => void;
    onSave: (def: CustomWidgetDef) => void;
    onDelete: () => void;
    socket?: Connection;
    theme?: IobTheme;
    availableGroups?: WidgetGroup[];
    currentGroupId?: string;
    onGroupChange?: (groupId: string) => void;
    language: ioBroker.Languages;
    isFloatComma: boolean;
    dateFormat: string;
    /** Adapter instance ID, e.g. "devices.0" */
    selectedInstance?: string;
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
    citySearch: ConfigCitySearch as unknown as typeof ConfigGeneric<ConfigGenericProps, any>,
    colorLevels: ConfigColorLevels as unknown as typeof ConfigGeneric<ConfigGenericProps, any>,
    iconSelect: ConfigIconSelect as unknown as typeof ConfigGeneric<ConfigGenericProps, any>,
};

// --- Dialog ---

export default function CustomWidgetSettingsDialog(props: CustomWidgetSettingsDialogProps): React.JSX.Element | null {
    const { open, widgetDef, onClose, onSave, onDelete, socket } = props;
    const [values, setValues] = useState<Record<string, any>>({});

    // Normalize config to ConfigItemPanel
    const config: ConfigItemPanel | null = useMemo(() => {
        if (!widgetDef) {
            return null;
        }
        if (widgetDef.type === 'plugin' && widgetDef.pluginAdapter && widgetDef.pluginComponent) {
            const pluginSchema = getPluginConfigSchema(widgetDef.pluginAdapter, widgetDef.pluginComponent);
            if (pluginSchema) {
                const baseItems = CUSTOM_WIDGET_CONFIGS.plugin.items;
                if (pluginSchema.schema.type === 'panel') {
                    return { ...pluginSchema.schema, items: { ...baseItems, ...pluginSchema.schema.items } };
                }
                // Tabs: flatten into a single panel
                const allItems: Record<string, ConfigItemAny> = { ...baseItems };
                for (const tabKey of Object.keys(pluginSchema.schema.items)) {
                    const tab = pluginSchema.schema.items[tabKey];
                    if (tab.items) {
                        Object.assign(allItems, tab.items);
                    }
                }
                return { type: 'panel', label: pluginSchema.name, items: allItems };
            }
        }
        return CUSTOM_WIDGET_CONFIGS[widgetDef.type];
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
            if (widgetDef.pluginAdapter) {
                newDef.pluginAdapter = widgetDef.pluginAdapter;
            }
            if (widgetDef.pluginComponent) {
                newDef.pluginComponent = widgetDef.pluginComponent;
            }
            if (widgetDef.pluginUrl) {
                newDef.pluginUrl = widgetDef.pluginUrl;
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
        onSave(newDef as unknown as CustomWidgetDef);
    };

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
                        socket={socket as unknown as AdminConnection}
                        themeName={props.theme.name}
                        themeType={props.theme.palette.mode as 'dark' | 'light'}
                        adapterName={props.selectedInstance?.replace(/\.\d+$/, '') || 'devices'}
                        instance={parseInt(props.selectedInstance?.match(/\.(\d+)$/)?.[1] || '0', 10)}
                        isFloatComma={props.isFloatComma}
                        dateFormat={props.dateFormat}
                        schema={config}
                        data={values}
                        onError={() => {}}
                        onChange={(data: Record<string, any>) => setValues(data)}
                        theme={props.theme}
                        customComponents={CUSTOM_COMPONENTS}
                        embedded
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
