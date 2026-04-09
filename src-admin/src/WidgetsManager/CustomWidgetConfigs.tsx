import type { CustomWidgetType } from '../../../src/widget-utils';
import type { ConfigItemAny, ConfigItemPanel } from '@iobroker/json-config';

// --- Helpers ---

/** Extract a default value from a json-config item definition */
export function getConfigDefault(item: ConfigItemAny): unknown {
    switch (item.type) {
        case 'select':
            return item.default ?? (item.options?.[0] as { value?: unknown })?.value ?? '';
        case 'checkbox':
            return item.default ?? true;
        case 'color':
            return item.default ?? '';
        case 'instance':
            return item.default ?? '';
        case 'text':
            return item.default ?? '';
        case 'number':
            return item.default ?? 0;
        case 'objectId':
            return item.default ?? '';
        case 'custom':
            return item.default ?? '';
        default:
            return item.default ?? '';
    }
}

// --- Shared size options ---

const SIZE_ICON_1x1 = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><rect x="1" y="1" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>')}`;
const SIZE_ICON_2x1 = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="18" viewBox="0 0 32 18"><rect x="1" y="1" width="30" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>')}`;
const SIZE_ICON_2xHalf = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="12" viewBox="0 0 32 12"><rect x="1" y="1" width="30" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>')}`;

export const SIZE_OPTIONS: { value: string; label: string; icon?: string }[] = [
    { value: '1x1', label: '1\u00D71', icon: SIZE_ICON_1x1 },
    { value: '2x1', label: '2\u00D71', icon: SIZE_ICON_2x1 },
    { value: '2x0.5', label: '2\u00D7\u00BD', icon: SIZE_ICON_2xHalf },
];

// --- Per-widget configs (json-config schema) ---

export const CUSTOM_WIDGET_CONFIGS: Record<CustomWidgetType, ConfigItemPanel> = {
    clock: {
        type: 'panel',
        label: 'wm_Clock',
        items: {
            size: {
                type: 'select',
                label: 'wm_Size',
                options: SIZE_OPTIONS,
                default: '1x1',
                format: 'radio',
                horizontal: true,
            },
            color: {
                type: 'color',
                label: 'wm_Color',
            },
            style: {
                type: 'select',
                label: 'wm_Style',
                options: [
                    { value: 'digital', label: 'wm_Digital' },
                    { value: 'analog', label: 'wm_Analog' },
                ],
                default: 'digital',
                format: 'radio',
            },
            showDate: {
                type: 'checkbox',
                label: 'wm_Show date',
                default: true,
            },
            showDow: {
                type: 'checkbox',
                label: 'wm_Show DOW',
                default: true,
            },
            showSeconds: {
                type: 'checkbox',
                label: 'wm_Show seconds',
                default: true,
            },
        },
    },
    weather: {
        type: 'panel',
        label: 'wm_Weather',
        items: {
            weatherSource: {
                type: 'select',
                label: 'wm_Weather source',
                options: [
                    { value: 'adapter', label: 'wm_Adapter' },
                    { value: 'openmeteo', label: 'Open-Meteo' },
                    { value: 'yrno', label: 'yr.no' },
                ],
                default: 'adapter',
                format: 'radio',
            },
            adapterInstance: {
                type: 'instance',
                label: 'wm_Adapter instance',
                adapters: ['openweathermap', 'yr', 'daswetter', 'weatherunderground'],
                hidden: "data.weatherSource !== 'adapter'",
            },
            cityName: {
                type: 'component',
                subType: 'citySearch',
                label: 'wm_City',
                hidden: "data.weatherSource === 'adapter'",
            },
            size: {
                type: 'select',
                label: 'wm_Size',
                options: SIZE_OPTIONS,
                default: '2x1',
                format: 'radio',
                horizontal: true,
            },
            color: {
                type: 'color',
                label: 'wm_Color',
            },
        },
    },
    iframe: {
        type: 'panel',
        label: 'wm_Iframe',
        items: {
            url: {
                type: 'text',
                label: 'URL',
                placeholder: 'wm_URL placeholder',
            },
            refreshInterval: {
                type: 'number',
                label: 'wm_Refresh interval',
                default: 0,
                help: 'wm_Refresh interval help',
            },
            appendTimestamp: {
                type: 'checkbox',
                label: 'wm_Append timestamp',
                default: false,
            },
            clickAction: {
                type: 'select',
                label: 'wm_Click action',
                options: [
                    { value: 'dialog', label: 'wm_Open in dialog' },
                    { value: 'newTab', label: 'wm_Open in new tab' },
                    { value: 'sameTab', label: 'wm_Open in same tab' },
                ],
                default: 'dialog',
                format: 'dropdown',
            },
            size: {
                type: 'select',
                label: 'wm_Size',
                options: SIZE_OPTIONS,
                default: '2x1',
                format: 'radio',
                horizontal: true,
            },
            color: {
                type: 'color',
                label: 'wm_Color',
            },
        },
    },
    gauge: {
        type: 'panel',
        label: 'wm_Gauge',
        items: {
            gaugeStateId: {
                type: 'objectId',
                label: 'wm_State ID',
            },
            gaugeStateId2: {
                type: 'objectId',
                label: 'wm_Secondary value',
            },
            gaugeName: {
                type: 'text',
                label: 'wm_Name',
                default: '',
            },
            minValue: {
                type: 'number',
                label: 'wm_Min value',
                default: 0,
            },
            maxValue: {
                type: 'number',
                label: 'wm_Max value',
                default: 100,
            },
            gaugeUnit: {
                type: 'text',
                label: 'wm_Unit',
                default: '',
            },
            usePercentage: {
                type: 'checkbox',
                label: 'wm_Color levels as percent',
                default: true,
            },
            colorLevels: {
                type: 'component',
                subType: 'colorLevels',
                label: 'wm_Color levels',
            },
            size: {
                type: 'select',
                label: 'wm_Size',
                options: SIZE_OPTIONS,
                default: '1x1',
                format: 'radio',
                horizontal: true,
            },
            color: {
                type: 'color',
                label: 'wm_Color',
            },
        },
    },
    wind: {
        type: 'panel',
        label: 'wm_Wind',
        items: {
            directionStateId: {
                type: 'objectId',
                label: 'wm_Wind direction',
            },
            speedStateId: {
                type: 'objectId',
                label: 'wm_Wind speed',
            },
            gustsStateId: {
                type: 'objectId',
                label: 'wm_Wind gusts',
            },
            size: {
                type: 'select',
                label: 'wm_Size',
                options: SIZE_OPTIONS,
                default: '1x1',
                format: 'radio',
                horizontal: true,
            },
            color: {
                type: 'color',
                label: 'wm_Color',
            },
        },
    },
    universal: {
        type: 'panel',
        label: 'wm_Universal',
        items: {
            stateId: {
                type: 'objectId',
                label: 'wm_State ID',
            },
            name: {
                type: 'text',
                label: 'wm_Name',
                default: '',
            },
            digits: {
                type: 'number',
                label: 'wm_Digits after comma',
                default: 1,
                min: 0,
                max: 5,
            },
            widgetIcon: {
                type: 'component',
                subType: 'iconSelect',
                label: 'wm_Icon',
                sm: 6,
            },
            widgetIconActive: {
                type: 'component',
                subType: 'iconSelect',
                label: 'wm_Active icon',
                sm: 6,
            },
            secondaryStateId: {
                type: 'objectId',
                label: 'wm_Secondary value',
            },
            secondaryName: {
                type: 'text',
                label: 'wm_Secondary name',
                default: '',
            },
            actionStateId: {
                type: 'objectId',
                label: 'wm_Action state',
            },
            actionType: {
                type: 'select',
                label: 'wm_Action type',
                options: [
                    { value: 'toggle', label: 'wm_Toggle' },
                    { value: 'value', label: 'wm_Send value' },
                ],
                default: 'toggle',
                format: 'radio',
                hidden: '!data.actionStateId',
            },
            actionValue: {
                type: 'text',
                label: 'wm_Action value',
                help: 'wm_Action value help',
                default: '',
                hidden: "!data.actionStateId || data.actionType !== 'value'",
            },
            actionConfirm: {
                type: 'select',
                label: 'wm_Confirmation',
                options: [
                    { value: 'none', label: 'wm_No confirmation' },
                    { value: 'dialog', label: 'wm_Confirm dialog' },
                    { value: 'pin', label: 'wm_PIN code' },
                ],
                default: 'none',
                format: 'dropdown',
                hidden: '!data.actionStateId',
            },
            actionConfirmText: {
                type: 'text',
                label: 'wm_Confirmation text',
                default: '',
                hidden: "!data.actionStateId || data.actionConfirm === 'none' || !data.actionConfirm",
            },
            actionPin: {
                type: 'text',
                label: 'wm_PIN',
                default: '',
                hidden: "!data.actionStateId || data.actionConfirm !== 'pin'",
            },
            colorLevels: {
                type: 'component',
                subType: 'colorLevels',
                label: 'wm_Color levels',
            },
            opacityStateId: {
                type: 'objectId',
                label: 'wm_Opacity state',
            },
            opacityFalse: {
                type: 'number',
                label: 'wm_Opacity when false',
                default: 0,
                min: 0,
                max: 1,
                step: 0.1,
                hidden: '!data.opacityStateId',
            },
            opacityTrue: {
                type: 'number',
                label: 'wm_Opacity when true',
                default: 1,
                min: 0,
                max: 1,
                step: 0.1,
                hidden: '!data.opacityStateId',
            },
            _iconsPanel: {
                type: 'panel',
                label: 'wm_Indicator icons',
                collapsable: true,
                items: {
                    icon1StateId: {
                        type: 'objectId',
                        label: 'wm_Icon 1 state',
                        sm: 12,
                    },
                    icon1Name: {
                        type: 'component',
                        subType: 'iconSelect',
                        label: 'wm_Icon 1 name',
                        sm: 6,
                    },
                    icon1Color: {
                        type: 'color',
                        label: 'wm_Icon 1 color',
                        sm: 6,
                    },
                    icon2StateId: {
                        type: 'objectId',
                        label: 'wm_Icon 2 state',
                        sm: 12,
                    },
                    icon2Name: {
                        type: 'component',
                        subType: 'iconSelect',
                        label: 'wm_Icon 2 name',
                        sm: 6,
                    },
                    icon2Color: {
                        type: 'color',
                        label: 'wm_Icon 2 color',
                        sm: 6,
                    },
                    icon3StateId: {
                        type: 'objectId',
                        label: 'wm_Icon 3 state',
                        sm: 12,
                    },
                    icon3Name: {
                        type: 'component',
                        subType: 'iconSelect',
                        label: 'wm_Icon 3 name',
                        sm: 6,
                    },
                    icon3Color: {
                        type: 'color',
                        label: 'wm_Icon 3 color',
                        sm: 6,
                    },
                },
            },
            size: {
                type: 'select',
                label: 'wm_Size',
                options: SIZE_OPTIONS,
                default: '1x1',
                format: 'radio',
                horizontal: true,
            },
            color: {
                type: 'color',
                label: 'wm_Color',
            },
        },
    },
    plugin: {
        type: 'panel',
        label: 'wm_Plugin',
        items: {
            size: {
                type: 'select',
                label: 'wm_Size',
                options: SIZE_OPTIONS,
                default: '1x1',
                format: 'radio',
                horizontal: true,
            },
            color: {
                type: 'color',
                label: 'wm_Color',
            },
        },
    },
};
