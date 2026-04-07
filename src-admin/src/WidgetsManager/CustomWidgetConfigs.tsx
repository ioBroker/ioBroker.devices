import React from 'react';

import type { CustomWidgetType } from '../../../src/widget-utils';
import { SizeIcon1x1, SizeIcon2x1, SizeIcon2xHalf } from './SizeIcons';
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

export const SIZE_OPTIONS: { value: string; label: string; icon?: React.ReactNode }[] = [
    { value: '1x1', label: '1\u00D71', icon: <SizeIcon1x1 /> },
    { value: '2x1', label: '2\u00D71', icon: <SizeIcon2x1 /> },
    { value: '2x0.5', label: '2\u00D7\u00BD', icon: <SizeIcon2xHalf /> },
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
            secondaryStateId: {
                type: 'objectId',
                label: 'wm_Secondary value',
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
            },
            opacityTrue: {
                type: 'number',
                label: 'wm_Opacity when true',
                default: 1,
                min: 0,
                max: 1,
                step: 0.1,
            },
            icon1StateId: {
                type: 'objectId',
                label: 'wm_Icon 1 state',
            },
            icon1Name: {
                type: 'text',
                label: 'wm_Icon 1 name',
                help: 'wm_Icon name help',
                default: '',
            },
            icon1Color: {
                type: 'color',
                label: 'wm_Icon 1 color',
            },
            icon2StateId: {
                type: 'objectId',
                label: 'wm_Icon 2 state',
            },
            icon2Name: {
                type: 'text',
                label: 'wm_Icon 2 name',
                default: '',
            },
            icon2Color: {
                type: 'color',
                label: 'wm_Icon 2 color',
            },
            icon3StateId: {
                type: 'objectId',
                label: 'wm_Icon 3 state',
            },
            icon3Name: {
                type: 'text',
                label: 'wm_Icon 3 name',
                default: '',
            },
            icon3Color: {
                type: 'color',
                label: 'wm_Icon 3 color',
            },
            size: {
                type: 'select',
                label: 'wm_Size',
                options: SIZE_OPTIONS,
                default: '1x1',
                format: 'radio',
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
            },
            color: {
                type: 'color',
                label: 'wm_Color',
            },
        },
    },
};
