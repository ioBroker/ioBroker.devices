import React, { useState, useEffect, useMemo } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { Close, Delete, Save } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';
import { getPluginConfigSchema } from './pluginLoader';
import { CUSTOM_WIDGET_CONFIGS, getConfigDefault } from './CustomWidgetConfigs';
import { BASE_WIDGET_ITEMS } from './configUtils';
import { JsonConfigComponent, } from '@iobroker/json-config';
import GroupSelector from './GroupSelector';
import ConfigCitySearch from './Components/ConfigCitySearch';
import ConfigColorLevels from './Components/ConfigColorLevels';
import ConfigIconSelect from './Components/ConfigIconSelect';
import ConfigURLSelect from './Components/ConfigURLSelect';
import ConfigLocationSelect from './Components/ConfigLocationSelect';
/** Recursively collect all data-bearing items from a panel (flattening nested panels) */
function flattenItems(items) {
    const result = {};
    for (const [key, item] of Object.entries(items)) {
        if (item && typeof item === 'object' && item.type === 'panel' && item.items) {
            // Nested panel — recurse into its items (don't add the panel key itself)
            Object.assign(result, flattenItems(item.items));
        }
        else if (!key.startsWith('_')) {
            // Regular data item (skip internal keys like _iconsHeader)
            result[key] = item;
        }
    }
    return result;
}
/** Extra keys that citySearch can write besides its own key */
const EXTRA_KEYS = ['latitude', 'longitude'];
/** Custom component registry for JsonConfigComponent */
const CUSTOM_COMPONENTS = {
    citySearch: ConfigCitySearch,
    colorLevels: ConfigColorLevels,
    iconSelect: ConfigIconSelect,
    urlSelector: ConfigURLSelect,
    locationSelect: ConfigLocationSelect,
};
// --- Dialog ---
export default function CustomWidgetSettingsDialog(props) {
    const { open, widgetDef, onClose, onSave, onDelete, stateContext } = props;
    const [values, setValues] = useState({});
    // Normalize config to ConfigItemPanel — base items (size, color) are prepended automatically
    const config = useMemo(() => {
        if (!widgetDef) {
            return null;
        }
        // Newline has no settings at all
        if (widgetDef.type === 'newline') {
            return CUSTOM_WIDGET_CONFIGS.newline;
        }
        const wd = widgetDef;
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
                const allItems = { ...BASE_WIDGET_ITEMS };
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
            const initial = {};
            const allItems = flattenItems(config.items);
            for (const [key, item] of Object.entries(allItems)) {
                const stored = widgetDef[key];
                initial[key] = stored !== undefined ? stored : getConfigDefault(item);
            }
            for (const extraKey of EXTRA_KEYS) {
                const stored = widgetDef[extraKey];
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
    const hasChanges = Object.entries(allItems).some(([key, item]) => {
        const stored = widgetDef[key];
        const original = stored !== undefined ? stored : getConfigDefault(item);
        return values[key] !== original;
    }) ||
        EXTRA_KEYS.some(k => {
            const stored = widgetDef[k];
            return values[k] !== undefined && values[k] !== stored;
        });
    const handleSave = () => {
        const newDef = { id: widgetDef.id, type: widgetDef.type };
        if (widgetDef.favorite) {
            newDef.favorite = true;
        }
        if (widgetDef.type === 'plugin') {
            const p = widgetDef;
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
        onSave(newDef);
    };
    const socket = stateContext.getSocket();
    return (React.createElement(Dialog, { open: open, onClose: onClose, maxWidth: "xs", fullWidth: true, slotProps: { paper: { sx: { maxHeight: '90vh' } } } },
        React.createElement(DialogTitle, null, I18n.t(config.label || '')),
        React.createElement(DialogContent, { dividers: true },
            socket && props.theme ? (React.createElement(JsonConfigComponent, { socket: socket, themeName: props.theme.name, themeType: props.theme.palette.mode, adapterName: stateContext.instanceId?.replace(/\.\d+$/, '') || 'devices', instance: parseInt(stateContext.instanceId?.match(/\.(\d+)$/)?.[1] || '0', 10), isFloatComma: stateContext.isFloatComma, dateFormat: stateContext.dateFormat, schema: config, data: values, onError: () => { }, onChange: (data) => setValues(data), theme: props.theme, customComponents: CUSTOM_COMPONENTS, embedded: true, imagePrefix: stateContext.admin ? '../..' : '../..' })) : null,
            props.availableGroups?.length ? (React.createElement(Box, { sx: { mb: 2 } },
                React.createElement(GroupSelector, { availableGroups: props.availableGroups, currentGroupId: props.currentGroupId, onGroupChange: groupId => props.onGroupChange?.(groupId) }))) : null,
            React.createElement(Button, { variant: "outlined", color: "error", startIcon: React.createElement(Delete, null), onClick: () => {
                    onDelete();
                    onClose();
                }, fullWidth: true }, I18n.t('wm_Delete'))),
        React.createElement(DialogActions, null,
            React.createElement(Button, { variant: "contained", disabled: !hasChanges, startIcon: React.createElement(Save, null), onClick: handleSave }, I18n.t('wm_Save')),
            React.createElement(Button, { color: "grey", startIcon: React.createElement(Close, null), onClick: onClose }, I18n.t('wm_Cancel')))));
}
//# sourceMappingURL=CustomWidgetSettingsDialog.js.map