import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    MenuItem,
    Switch,
    Tab,
    Tabs,
    TextField,
    Typography,
    alpha,
} from '@mui/material';
import { Close, Delete, Save } from '@mui/icons-material';
import { I18n, type IobTheme } from '@iobroker/gui-components';
import type { AdminConnection } from '@iobroker/socket-client';

import { type WidgetSettingsBase } from '../../../packages/dm-widgets/src/index';
import { SIZE_OPTIONS } from './CustomWidgetConfigs';
import { getConfigDefault } from './configUtils';
import type { WidgetGroup } from './groupUtils';
import GroupSelector from './GroupSelector';
import ConfigIconSelect from './Components/ConfigIconSelect';
import { resolveHistoryTarget } from './Utils';
import AclEditor from './AclEditor';
import { loadSettingsTab, storeSettingsTab } from './settingsTab';
import type { CategoryOption } from './CategorySettingsDialog';
import {
    type ConfigGenericProps,
    type ConfigItemPanel,
    type ConfigItemAny,
    type ConfigGeneric,
    JsonConfigComponent,
    type ConfigItemTabs,
} from '@iobroker/json-config';
import type StateContext from './StateContext';

interface WidgetSettingsDialogProps {
    open: boolean;
    widgetName: string;
    settings: WidgetSettingsBase;
    onClose: () => void;
    onSave: (settings: WidgetSettingsBase) => void;
    onDelete?: () => void;
    /** Widget-specific schema items from Widget.getConfigSchema() */
    configSchema?: { name: string; schema: ConfigItemPanel | ConfigItemTabs } | null;
    stateContext: StateContext;
    theme: IobTheme;
    objectName?: string;
    objectColor?: string;
    availableGroups?: WidgetGroup[];
    currentGroupId?: string;
    onGroupChange?: (groupId: string) => void;
    /** All states this widget charts — the history switch covers every one of them */
    historyStateIds?: string[];
    /** Default history adapter instance (e.g. "history.0") */
    defaultHistory?: string;
    /** Show chart duration selector */
    showChart?: boolean;
    /** Show alarm text/icon fields */
    showAlarmFields?: boolean;
    /** Show icon picker for non-alarm widgets */
    showIcon?: boolean;
    /** All categories, for the "also show in" picker */
    categoryOptions?: CategoryOption[];
    /** Whether the multi-user permissions are switched on (root category setting) */
    multiUser?: boolean;
}

/** Custom component registry */
const CUSTOM_COMPONENTS: Record<string, typeof ConfigGeneric<ConfigGenericProps, any>> = {
    iconSelect: ConfigIconSelect,
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

    return {
        type: 'panel',
        label: '',
        items,
    };
}

/**
 * The history-based options as a panel of their own.
 *
 * Separate from the main schema so the "record history" switch can sit between the two forms —
 * first switch recording on, then pick the period. Rendering it as a second JsonConfigComponent
 * also sidesteps the component's build-on-mount behaviour: the panel simply mounts once recording
 * is on, instead of trying to grow fields into an already built form.
 */
function buildChartSchema(): ConfigItemPanel {
    return {
        type: 'panel',
        label: '',
        items: {
            chartHours: {
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
            },
            showTrendArrow: {
                type: 'checkbox',
                label: 'wm_Trend arrow',
                default: false,
            },
            trendMinutes: {
                type: 'number',
                label: 'wm_Trend period (min)',
                default: 30,
                min: 5,
                max: 1440,
                hidden: '!data.showTrendArrow',
            },
            minMaxPeriod: {
                type: 'select',
                label: 'wm_Min/Max',
                options: [
                    { value: 'off', label: 'wm_Off' },
                    { value: '24h', label: 'wm_Last 24h' },
                    { value: 'today', label: 'wm_Today' },
                ],
                default: 'off',
                format: 'radio',
            },
        },
    };
}

export default function WidgetSettingsDialog(props: WidgetSettingsDialogProps): React.JSX.Element {
    const { open, widgetName, settings, onClose, onSave, onDelete, objectName, objectColor } = props;
    const [values, setValues] = useState<WidgetSettingsBase>({} as WidgetSettingsBase);
    const [historyEnabled, setHistoryEnabled] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    /** Objects that carry the history settings — alias targets when the widget shows aliases */
    const [historyTargets, setHistoryTargets] = useState<string[]>([]);
    /** How many of the charted states are recorded — for the "some but not all" state */
    const [historyCount, setHistoryCount] = useState({ recorded: 0, total: 0 });
    /** Some of the charted states are recorded, others are not — a switch cannot show that on its own */
    const historyPartial = historyCount.recorded > 0 && historyCount.recorded < historyCount.total;
    const [tab, setTab] = useState(0);

    const schema = useMemo(
        () => buildSchema(props),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [props, props.configSchema, props.showChart, props.showAlarmFields, props.showIcon],
    );

    const chartSchema = useMemo(() => buildChartSchema(), []);

    const wasOpenRef = useRef(false);
    /** The form as it looked when the dialog opened — the baseline for {@link hasChanges} */
    const initialValuesRef = useRef<WidgetSettingsBase>({} as WidgetSettingsBase);

    useEffect(() => {
        // Only (re)initialize the form when the dialog actually opens. The dialog is modal, so the
        // user always closes it before editing another widget — i.e. `open` cycles false→true between
        // widgets. We must NOT re-initialize while it stays open: the parent may hand us a fresh
        // `settings` object reference on unrelated re-renders (e.g. a live status tick re-publishes the
        // widget object), which would otherwise wipe the user's in-progress edits ~1s after a change.
        if (open && !wasOpenRef.current) {
            // See CategorySettingsDialog: the tab is remembered across all widgets and categories
            setTab(loadSettingsTab(!!props.multiUser));
            const initial: WidgetSettingsBase = {
                ...settings,
                name: settings.name || objectName || widgetName,
                colorActive: settings.colorActive || objectColor || '',
            };
            initialValuesRef.current = initial;
            setValues(initial);
            // Load the history state — following the aliases, because that is where recording runs.
            // The switch reflects "all charted states are recorded", so a temperature widget whose
            // humidity is missing from the log shows as off and can be completed with one click.
            const ids = props.historyStateIds;
            if (ids?.length && props.defaultHistory) {
                void Promise.all(
                    ids.map(id => resolveHistoryTarget(props.stateContext, id, props.defaultHistory!)),
                ).then(targets => {
                    const recorded = targets.filter(t => t.enabled).length;
                    const enabled = recorded === targets.length;
                    setHistoryTargets(targets.map(t => t.id));
                    setHistoryCount({ recorded, total: targets.length });
                    setHistoryEnabled(enabled);
                    // The chart options already make sense once anything is recorded
                });
            }
        }
        wasOpenRef.current = open;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, settings]);

    /**
     * Whether the form differs from what it was opened with.
     *
     * Compared against the initial snapshot, not against `settings`: the dialog injects display
     * fallbacks (object name, object colour) when opening, and JsonConfigComponent fills its schema
     * defaults on mount. Neither is a user edit, but both differ from the stored settings — which is
     * why Save used to light up on a dialog nobody had touched.
     */
    const hasChanges =
        [...Object.keys(schema.items), ...Object.keys(chartSchema.items)].some(key => {
            const current = (values as Record<string, any>)[key];
            const initial = (initialValuesRef.current as Record<string, any>)[key];
            if (current === initial) {
                return false;
            }
            // Absent, empty and null all mean "not set"
            if ((current ?? '') === (initial ?? '')) {
                return false;
            }
            // A value json-config filled in from its own schema default is not an edit
            const item = schema.items[key] || chartSchema.items[key];
            return !(initial === undefined && current === getConfigDefault(item));
        }) ||
        // `acl` is edited outside the json-config schema, so it needs its own comparison —
        // otherwise Save would stay disabled after changing only the permissions.
        JSON.stringify(values.acl ?? null) !== JSON.stringify(settings.acl ?? null) ||
        JSON.stringify(values.extraParents ?? null) !== JSON.stringify(settings.extraParents ?? null);

    const adapterName = props.stateContext.instanceId?.replace(/\.\d+$/, '') || 'devices';
    const instanceNum = parseInt(props.stateContext.instanceId?.match(/\.(\d+)$/)?.[1] || '0', 10);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            slotProps={{ paper: { sx: { maxHeight: '90vh' } } }}
        >
            <DialogTitle>{props.configSchema?.name ? I18n.t(props.configSchema.name) : widgetName}</DialogTitle>
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
                    acl={values.acl}
                    onChange={acl => setValues(prev => ({ ...prev, acl }))}
                    stateContext={props.stateContext}
                />
                {/* Placement escape hatch: a hidden category hides everything inside it, so a single
                    device that should stay visible is lifted into another category here. */}
                {props.categoryOptions?.length ? (
                    <Box sx={{ mt: 3 }}>
                        <Typography sx={{ fontWeight: 600 }}>{I18n.t('wm_acl_extra_parents')}</Typography>
                        <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary' }}
                        >
                            {I18n.t('wm_acl_extra_parents_hint')}
                        </Typography>
                        <TextField
                            select
                            fullWidth
                            variant="standard"
                            slotProps={{ select: { multiple: true } }}
                            value={values.extraParents || []}
                            onChange={e =>
                                setValues(prev => ({
                                    ...prev,
                                    extraParents: (e.target.value as unknown as string[]).filter(Boolean),
                                }))
                            }
                        >
                            {props.categoryOptions.map(c => (
                                <MenuItem
                                    key={c.id}
                                    value={c.id}
                                >
                                    {c.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Box>
                ) : null}
            </DialogContent>
            {/* The settings tab stays mounted: JsonConfigComponent builds its form when it mounts,
                so unmounting it on a tab switch would reset the user's in-progress edits. */}
            <DialogContent
                dividers
                sx={{ display: !props.multiUser || tab === 0 ? 'block' : 'none' }}
            >
                {props.theme ? (
                    <JsonConfigComponent
                        socket={props.stateContext.getSocket() as unknown as AdminConnection}
                        themeName={props.theme.name}
                        themeType={props.theme.palette.mode}
                        adapterName={adapterName}
                        instance={instanceNum}
                        isFloatComma={props.stateContext.isFloatComma ?? false}
                        dateFormat={props.stateContext.dateFormat || 'DD.MM.YYYY'}
                        schema={schema}
                        data={values}
                        onError={() => {}}
                        onChange={(data: Record<string, any> | null) =>
                            data && setValues(prev => ({ ...prev, ...data }))
                        }
                        theme={props.theme}
                        customComponents={CUSTOM_COMPONENTS}
                        embedded
                        imagePrefix={props.stateContext.admin ? '../..' : '../..'}
                    />
                ) : null}

                {/* Sits between the two forms: switch recording on first, then the period options
                    below it appear. */}
                {props.historyStateIds?.length && props.defaultHistory ? (
                    <FormControlLabel
                        control={
                            <Switch
                                checked={historyEnabled}
                                disabled={historyLoading}
                                // The neumorphic presets render `primary` in a near-grey, so an
                                // enabled switch is indistinguishable from a disabled one. Accent
                                // the "on" state explicitly.
                                sx={theme => {
                                    // Amber for the in-between state: the switch is off (clicking
                                    // completes the set), but something is already being recorded.
                                    const accent = historyPartial
                                        ? theme.palette.warning.main
                                        : theme.palette.success.main;
                                    return {
                                        ...(historyPartial
                                            ? {
                                                  '& .MuiSwitch-switchBase': { color: accent },
                                                  '& .MuiSwitch-track': {
                                                      backgroundColor: accent,
                                                      opacity: 0.5,
                                                  },
                                              }
                                            : {}),
                                        '& .MuiSwitch-switchBase.Mui-checked': {
                                            color: accent,
                                            '&:hover': { backgroundColor: alpha(accent, 0.1) },
                                        },
                                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                            backgroundColor: accent,
                                            opacity: 0.5,
                                        },
                                    };
                                }}
                                onChange={async (_e, checked) => {
                                    setHistoryLoading(true);
                                    const targets = historyTargets.length ? historyTargets : props.historyStateIds!;
                                    for (const target of targets) {
                                        try {
                                            const obj =
                                                await props.stateContext.getObject<ioBroker.StateObject>(target);
                                            if (!obj?.common) {
                                                continue;
                                            }
                                            const common = obj.common;
                                            common.custom ||= {};
                                            if (checked) {
                                                common.custom[props.defaultHistory!] = {
                                                    ...common.custom[props.defaultHistory!],
                                                    enabled: true,
                                                };
                                            } else if (common.custom[props.defaultHistory!]) {
                                                common.custom[props.defaultHistory!].enabled = false;
                                            }
                                            await props.stateContext.getSocket().setObject(obj._id, obj);
                                        } catch (err) {
                                            console.error(`Failed to toggle history for ${target}:`, err);
                                        }
                                    }
                                    setHistoryEnabled(checked);
                                    setHistoryCount(prev => ({
                                        recorded: checked ? prev.total : 0,
                                        total: prev.total,
                                    }));
                                    setHistoryLoading(false);
                                }}
                                size="small"
                            />
                        }
                        label={
                            <Box>
                                <Typography>{I18n.t('wm_Record history')}</Typography>
                                {historyPartial ? (
                                    <Typography
                                        variant="caption"
                                        sx={{ color: 'warning.main' }}
                                    >
                                        {I18n.t(
                                            'wm_History partial',
                                            String(historyCount.recorded),
                                            String(historyCount.total),
                                        )}
                                    </Typography>
                                ) : null}
                            </Box>
                        }
                        sx={{ mt: 2, mb: 1 }}
                    />
                ) : null}

                {props.theme && props.showChart && historyCount.recorded > 0 ? (
                    <JsonConfigComponent
                        socket={props.stateContext.getSocket() as unknown as AdminConnection}
                        themeName={props.theme.name}
                        themeType={props.theme.palette.mode}
                        adapterName={adapterName}
                        instance={instanceNum}
                        isFloatComma={props.stateContext.isFloatComma ?? false}
                        dateFormat={props.stateContext.dateFormat || 'DD.MM.YYYY'}
                        schema={chartSchema}
                        data={values}
                        onError={() => {}}
                        onChange={(data: Record<string, any> | null) =>
                            data && setValues(prev => ({ ...prev, ...data }))
                        }
                        theme={props.theme}
                        customComponents={CUSTOM_COMPONENTS}
                        embedded
                        imagePrefix={props.stateContext.admin ? '../..' : '../..'}
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
                    {I18n.t(hasChanges ? 'wm_Cancel' : 'wm_Close')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
