import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Switch,
} from '@mui/material';
import { Close, Delete, Save } from '@mui/icons-material';
import { I18n, type Connection, type IobTheme } from '@iobroker/adapter-react-v5';
import type { AdminConnection } from '@iobroker/socket-client';

import { type WidgetSettingsBase } from '@iobroker/dm-widgets';
import { SIZE_OPTIONS } from './CustomWidgetConfigs';
import type { WidgetGroup } from './groupUtils';
import GroupSelector from './GroupSelector';
import ConfigIconSelect from './Components/ConfigIconSelect';
import {
    type ConfigGenericProps,
    type ConfigItemPanel,
    type ConfigItemAny,
    type ConfigGeneric,
    JsonConfigComponent,
    type ConfigItemTabs,
} from '@iobroker/json-config';

interface WidgetSettingsDialogProps {
    open: boolean;
    widgetName: string;
    settings: WidgetSettingsBase;
    onClose: () => void;
    onSave: (settings: WidgetSettingsBase) => void;
    onDelete?: () => void;
    /** Widget-specific schema items from Widget.getConfigSchema() */
    configSchema?: { name: string; schema: ConfigItemPanel | ConfigItemTabs } | null;
    socket: Connection;
    theme: IobTheme;
    admin: boolean;
    instance: string;
    objectName?: string;
    objectColor?: string;
    availableGroups?: WidgetGroup[];
    currentGroupId?: string;
    onGroupChange?: (groupId: string) => void;
    /** Primary state ID for history toggle */
    primaryStateId?: string;
    /** Default history adapter instance (e.g. "history.0") */
    defaultHistory?: string;
    /** Show chart duration selector */
    showChart?: boolean;
    /** Show alarm text/icon fields */
    showAlarmFields?: boolean;
    /** Show icon picker for non-alarm widgets */
    showIcon?: boolean;
    isFloatComma?: boolean;
    dateFormat?: string;
}

/** Custom component registry */
const CUSTOM_COMPONENTS: Record<string, typeof ConfigGeneric<ConfigGenericProps, any>> = {
    iconSelect: ConfigIconSelect as unknown as typeof ConfigGeneric<ConfigGenericProps, any>,
};

/** Build the full json-config schema from base + widget-specific items */
function buildSchema(props: WidgetSettingsDialogProps): ConfigItemPanel {
    const items: Record<string, ConfigItemAny> = {
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
        },
        colorActive: {
            type: 'color',
            label: 'wm_Color',
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
    } else if (props.showIcon) {
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

export default function WidgetSettingsDialog(props: WidgetSettingsDialogProps): React.JSX.Element {
    const { open, widgetName, settings, onClose, onSave, onDelete, objectName, objectColor } = props;
    const [values, setValues] = useState<WidgetSettingsBase>({} as WidgetSettingsBase);
    const [historyEnabled, setHistoryEnabled] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);

    const schema = useMemo(
        () => buildSchema(props),
        [props, props.configSchema, props.showChart, props.showAlarmFields, props.showIcon],
    );

    useEffect(() => {
        if (open) {
            setValues({
                ...settings,
                name: settings.name || objectName || widgetName,
                colorActive: settings.colorActive || objectColor || '',
            });
            // Load history enabled state
            if (props.primaryStateId && props.defaultHistory && props.socket) {
                void props.socket
                    .getObject(props.primaryStateId)
                    .then(obj => {
                        const enabled = !!(obj as ioBroker.StateObject)?.common?.custom?.[props.defaultHistory!]
                            ?.enabled;
                        setHistoryEnabled(enabled);
                    })
                    .catch(() => setHistoryEnabled(false));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, settings]);

    const hasChanges = Object.keys(schema.items).some(key => {
        return (values as Record<string, any>)[key] !== (settings as Record<string, any>)[key];
    });

    const adapterName = props.instance?.replace(/\.\d+$/, '') || 'devices';
    const instanceNum = parseInt(props.instance?.match(/\.(\d+)$/)?.[1] || '0', 10);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            slotProps={{ paper: { sx: { maxHeight: '90vh' } } }}
        >
            <DialogTitle>{widgetName}</DialogTitle>
            <DialogContent dividers>
                {props.socket && props.theme ? (
                    <JsonConfigComponent
                        socket={props.socket as unknown as AdminConnection}
                        themeName={props.theme.name}
                        themeType={props.theme.palette.mode as 'dark' | 'light'}
                        adapterName={adapterName}
                        instance={instanceNum}
                        isFloatComma={props.isFloatComma ?? false}
                        dateFormat={props.dateFormat || 'DD.MM.YYYY'}
                        schema={schema}
                        data={values}
                        onError={() => {}}
                        onChange={(data: Record<string, any>) => setValues(data as WidgetSettingsBase)}
                        theme={props.theme}
                        customComponents={CUSTOM_COMPONENTS}
                        embedded
                    />
                ) : null}

                {/* History toggle — not part of json-config schema (async action) */}
                {props.primaryStateId && props.defaultHistory ? (
                    <FormControlLabel
                        control={
                            <Switch
                                checked={historyEnabled}
                                disabled={historyLoading}
                                onChange={async (_e, checked) => {
                                    setHistoryLoading(true);
                                    try {
                                        const obj = await props.socket.getObject(props.primaryStateId!);
                                        if (obj) {
                                            const common = (obj as ioBroker.StateObject).common;
                                            common.custom ||= {};
                                            if (checked) {
                                                common.custom[props.defaultHistory!] = {
                                                    ...common.custom[props.defaultHistory!],
                                                    enabled: true,
                                                };
                                            } else if (common.custom[props.defaultHistory!]) {
                                                common.custom[props.defaultHistory!].enabled = false;
                                            }
                                            await props.socket.setObject(obj._id, obj);
                                            setHistoryEnabled(checked);
                                        }
                                    } catch (err) {
                                        console.error('Failed to toggle history:', err);
                                    }
                                    setHistoryLoading(false);
                                }}
                                size="small"
                            />
                        }
                        label={I18n.t('wm_Record history')}
                        sx={{ mt: 1 }}
                    />
                ) : null}

                {props.availableGroups?.length ? (
                    <Box sx={{ mt: 2 }}>
                        <GroupSelector
                            availableGroups={props.availableGroups}
                            currentGroupId={props.currentGroupId}
                            onGroupChange={groupId => props.onGroupChange?.(groupId)}
                        />
                    </Box>
                ) : null}

                {onDelete ? (
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<Delete />}
                        onClick={() => {
                            onDelete();
                            onClose();
                        }}
                        fullWidth
                        sx={{ mt: 3 }}
                    >
                        {I18n.t('wm_Delete')}
                    </Button>
                ) : null}
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    disabled={!hasChanges}
                    startIcon={<Save />}
                    onClick={() => onSave(values)}
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
