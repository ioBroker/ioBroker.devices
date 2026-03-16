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

export type CwConfigItem = CwConfigSelect | CwConfigCheckbox | CwConfigColor;

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
};
