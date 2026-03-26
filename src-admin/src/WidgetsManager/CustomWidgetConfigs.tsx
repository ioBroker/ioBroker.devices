import React from 'react';

import type { CustomWidgetType } from '../../../src/widget-utils';
import { SizeIcon1x1, SizeIcon2x1, SizeIcon2xHalf } from './SizeIcons';

// --- Config item types ---

export interface CwConfigSelect {
    type: 'select';
    /** i18n key for the field label */
    label: string;
    options: { value: string; label: string; icon?: React.ReactNode }[];
    default?: string;
    /** Render as toggle-button row instead of dropdown */
    format?: 'radio';
}

export interface CwConfigCheckbox {
    type: 'checkbox';
    /** i18n key for the checkbox label */
    label: string;
    default?: boolean;
}

export interface CwConfigColor {
    type: 'color';
    /** i18n key for the field label */
    label: string;
}

export interface CwConfigInstanceSelect {
    type: 'instanceSelect';
    /** i18n key for the field label */
    label: string;
    /** Adapter names to list instances for */
    adapterNames: string[];
}

export interface CwConfigText {
    type: 'text';
    /** i18n key for the field label */
    label: string;
    default?: string;
    /** Placeholder text (i18n key) */
    placeholder?: string;
    /** Helper text below the input (i18n key) */
    helperText?: string;
    /** Input type: 'text' (default) or 'number' */
    inputType?: 'text' | 'number';
}

export interface CwConfigCitySearch {
    type: 'citySearch';
    /** i18n key for the field label */
    label: string;
}

export interface CwConfigStateId {
    type: 'stateId';
    /** i18n key for the field label */
    label: string;
    /** Auto-populate other fields from the selected object's common properties.
     *  Maps config key → common property name, e.g. { minValue: 'min', maxValue: 'max', gaugeUnit: 'unit' } */
    autoFill?: Record<string, string>;
}

export interface CwConfigColorLevels {
    type: 'colorLevels';
    /** i18n key for the field label */
    label: string;
    default?: { value: number; color: string }[];
}

export type CwConfigItem = (
    | CwConfigSelect
    | CwConfigCheckbox
    | CwConfigColor
    | CwConfigInstanceSelect
    | CwConfigCitySearch
    | CwConfigText
    | CwConfigStateId
    | CwConfigColorLevels
) & {
    /** Only show this item when the specified key has the specified value */
    visibleWhen?: Record<string, unknown>;
};

export interface CwWidgetConfig {
    /** i18n key for the widget type name (dialog title) */
    name: string;
    items: Record<string, CwConfigItem>;
}

// --- Helpers ---

export function getConfigDefault(item: CwConfigItem): unknown {
    switch (item.type) {
        case 'select':
            return item.default ?? item.options[0]?.value ?? '';
        case 'checkbox':
            return item.default ?? true;
        case 'color':
            return '';
        case 'instanceSelect':
            return '';
        case 'citySearch':
            return '';
        case 'text':
            return item.default ?? '';
        case 'stateId':
            return '';
        case 'colorLevels':
            return item.default ?? [
                { value: 30, color: '#4caf50' },
                { value: 70, color: '#ff9800' },
                { value: 100, color: '#f44336' },
            ];
    }
}

// --- Shared size options ---

export const SIZE_OPTIONS: CwConfigSelect['options'] = [
    { value: '1x1', label: '1\u00D71', icon: <SizeIcon1x1 /> },
    { value: '2x1', label: '2\u00D71', icon: <SizeIcon2x1 /> },
    { value: '2x0.5', label: '2\u00D7\u00BD', icon: <SizeIcon2xHalf /> },
];

// --- Per-widget configs ---

export const CUSTOM_WIDGET_CONFIGS: Record<CustomWidgetType, CwWidgetConfig> = {
    clock: {
        name: 'wm_Clock',
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
        name: 'wm_Weather',
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
                type: 'instanceSelect',
                label: 'wm_Adapter instance',
                adapterNames: ['openweathermap', 'yr', 'daswetter', 'weatherunderground'],
                visibleWhen: { weatherSource: 'adapter' },
            },
            cityName: {
                type: 'citySearch',
                label: 'wm_City',
                visibleWhen: { weatherSource: ['openmeteo', 'yrno'] },
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
        name: 'wm_Iframe',
        items: {
            url: {
                type: 'text',
                label: 'URL',
                placeholder: 'wm_URL placeholder',
            },
            refreshInterval: {
                type: 'text',
                label: 'wm_Refresh interval',
                default: '0',
                helperText: 'wm_Refresh interval help',
                inputType: 'number',
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
        name: 'wm_Gauge',
        items: {
            gaugeStateId: {
                type: 'stateId',
                label: 'wm_State ID',
                autoFill: { minValue: 'min', maxValue: 'max', gaugeUnit: 'unit', gaugeName: 'name' },
            },
            gaugeName: {
                type: 'text',
                label: 'wm_Name',
                default: '',
            },
            minValue: {
                type: 'text',
                label: 'wm_Min value',
                default: '0',
                inputType: 'number',
            },
            maxValue: {
                type: 'text',
                label: 'wm_Max value',
                default: '100',
                inputType: 'number',
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
                type: 'colorLevels',
                label: 'wm_Color levels',
                default: [
                    { value: 30, color: '#4caf50' },
                    { value: 70, color: '#ff9800' },
                    { value: 100, color: '#f44336' },
                ],
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
        name: 'wm_Wind',
        items: {
            directionStateId: {
                type: 'stateId',
                label: 'wm_Wind direction',
            },
            speedStateId: {
                type: 'stateId',
                label: 'wm_Wind speed',
            },
            gustsStateId: {
                type: 'stateId',
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
};
