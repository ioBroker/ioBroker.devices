import React, { useState, useEffect, useMemo } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Switch, } from '@mui/material';
import { Close, Delete, Save } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';
import {} from '../../../packages/dm-widgets/src/index';
import { SIZE_OPTIONS } from './CustomWidgetConfigs';
import GroupSelector from './GroupSelector';
import ConfigIconSelect from './Components/ConfigIconSelect';
import { JsonConfigComponent, } from '@iobroker/json-config';
/** Custom component registry */
const CUSTOM_COMPONENTS = {
    iconSelect: ConfigIconSelect,
};
/** Build the full json-config schema from base + widget-specific items */
function buildSchema(props) {
    const items = {
        name: {
            type: 'text',
            label: 'wm_Name',
            default: '',
        },
        size: {
            type: 'select',
            label: 'wm_Size',
            options: SIZE_OPTIONS,
            default: '1x1',
            format: 'radio',
            horizontal: true,
            noTranslation: true,
        },
        colorActive: {
            type: 'color',
            label: 'wm_Active color',
            sm: 6,
        },
        color: {
            type: 'color',
            label: 'wm_Color inactive',
            sm: 6,
        },
    };
    // Icon fields
    if (props.showAlarmFields) {
        items.iconActive = {
            type: 'component',
            subType: 'iconSelect',
            label: 'wm_Icon active',
            sm: 6,
        };
        items.icon = {
            type: 'component',
            subType: 'iconSelect',
            label: 'wm_Icon inactive',
            sm: 6,
        };
        items.textActive = {
            type: 'text',
            label: 'wm_Text active',
            default: '',
            sm: 6,
        };
        items.text = {
            type: 'text',
            label: 'wm_Text inactive',
            default: '',
            sm: 6,
        };
    }
    else if (props.showIcon) {
        items.icon = {
            type: 'component',
            subType: 'iconSelect',
            label: 'wm_Icons',
        };
    }
    // Widget-specific fields
    if (props.configSchema) {
        if (props.configSchema.schema.type !== 'panel') {
            throw new Error('Only panel is supported as root component');
        }
        Object.assign(items, props.configSchema.schema.items);
    }
    // Chart fields (always at the bottom if enabled)
    if (props.showChart) {
        items.chartHours = {
            type: 'select',
            label: 'wm_Chart',
            options: [
                { value: 0, label: 'wm_Off' },
                { value: 1, label: '1h' },
                { value: 3, label: '3h' },
                { value: 6, label: '6h' },
                { value: 12, label: '12h' },
                { value: 24, label: '24h' },
            ],
            default: 12,
            format: 'radio',
        };
        items.showTrendArrow = {
            type: 'checkbox',
            label: 'wm_Trend arrow',
            default: false,
        };
        items.trendMinutes = {
            type: 'number',
            label: 'wm_Trend period (min)',
            default: 30,
            min: 5,
            max: 1440,
            hidden: '!data.showTrendArrow',
        };
    }
    return {
        type: 'panel',
        label: '',
        items,
    };
}
export default function WidgetSettingsDialog(props) {
    const { open, widgetName, settings, onClose, onSave, onDelete, objectName, objectColor } = props;
    const [values, setValues] = useState({});
    const [historyEnabled, setHistoryEnabled] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const schema = useMemo(() => buildSchema(props), 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props, props.configSchema, props.showChart, props.showAlarmFields, props.showIcon]);
    useEffect(() => {
        if (open) {
            setValues({
                ...settings,
                name: settings.name || objectName || widgetName,
                colorActive: settings.colorActive || objectColor || '',
            });
            // Load history enabled state
            if (props.primaryStateId && props.defaultHistory) {
                void props.stateContext
                    .getObject(props.primaryStateId)
                    .then(obj => {
                    const enabled = !!obj?.common?.custom?.[props.defaultHistory]?.enabled;
                    setHistoryEnabled(enabled);
                })
                    .catch(() => setHistoryEnabled(false));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, settings]);
    const hasChanges = Object.keys(schema.items).some(key => {
        return values[key] !== settings[key];
    });
    const adapterName = props.stateContext.instanceId?.replace(/\.\d+$/, '') || 'devices';
    const instanceNum = parseInt(props.stateContext.instanceId?.match(/\.(\d+)$/)?.[1] || '0', 10);
    return (React.createElement(Dialog, { open: open, onClose: onClose, maxWidth: "xs", fullWidth: true, slotProps: { paper: { sx: { maxHeight: '90vh' } } } },
        React.createElement(DialogTitle, null, props.configSchema?.name ? I18n.t(props.configSchema.name) : widgetName),
        React.createElement(DialogContent, { dividers: true },
            props.theme ? (React.createElement(JsonConfigComponent, { socket: props.stateContext.getSocket(), themeName: props.theme.name, themeType: props.theme.palette.mode, adapterName: adapterName, instance: instanceNum, isFloatComma: props.stateContext.isFloatComma ?? false, dateFormat: props.stateContext.dateFormat || 'DD.MM.YYYY', schema: schema, data: values, onError: () => { }, onChange: (data) => setValues(data), theme: props.theme, customComponents: CUSTOM_COMPONENTS, embedded: true, imagePrefix: props.stateContext.admin ? '../..' : '../..' })) : null,
            props.primaryStateId && props.defaultHistory ? (React.createElement(FormControlLabel, { control: React.createElement(Switch, { checked: historyEnabled, disabled: historyLoading, onChange: async (_e, checked) => {
                        setHistoryLoading(true);
                        try {
                            const obj = await props.stateContext.getObject(props.primaryStateId);
                            if (obj?.common) {
                                const common = obj.common;
                                common.custom ||= {};
                                if (checked) {
                                    common.custom[props.defaultHistory] = {
                                        ...common.custom[props.defaultHistory],
                                        enabled: true,
                                    };
                                }
                                else if (common.custom[props.defaultHistory]) {
                                    common.custom[props.defaultHistory].enabled = false;
                                }
                                await props.stateContext.getSocket().setObject(obj._id, obj);
                                setHistoryEnabled(checked);
                            }
                        }
                        catch (err) {
                            console.error('Failed to toggle history:', err);
                        }
                        setHistoryLoading(false);
                    }, size: "small" }), label: I18n.t('wm_Record history'), sx: { mt: 1 } })) : null,
            props.availableGroups?.length ? (React.createElement(Box, { sx: { mt: 2 } },
                React.createElement(GroupSelector, { availableGroups: props.availableGroups, currentGroupId: props.currentGroupId, onGroupChange: groupId => props.onGroupChange?.(groupId) }))) : null,
            onDelete ? (React.createElement(Button, { variant: "outlined", color: "error", startIcon: React.createElement(Delete, null), onClick: () => {
                    onDelete();
                    onClose();
                }, fullWidth: true, sx: { mt: 3 } }, I18n.t('wm_Delete'))) : null),
        React.createElement(DialogActions, null,
            React.createElement(Button, { variant: "contained", disabled: !hasChanges, startIcon: React.createElement(Save, null), onClick: () => onSave(values) }, I18n.t('wm_Save')),
            React.createElement(Button, { color: "grey", startIcon: React.createElement(Close, null), onClick: onClose }, I18n.t('wm_Cancel')))));
}
//# sourceMappingURL=WidgetSettingsDialog.js.map