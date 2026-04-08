/**
 * WidgetGeneric — base class for all Device Manager widgets.
 *
 * This is a compilable mirror of the host's WidgetGeneric.
 * At runtime, Module Federation provides the host's real implementation
 * with all rendering logic, chart support, indicators, etc.
 *
 * Plugin authors extend this class and override:
 *   - renderCompact() / renderWide() / renderWideTall()
 *   - renderTileIcon() / renderTileStatus() / renderTileAction()
 *   - isTileActive() / hasTileAction() / onTileClick()
 *   - getHistoryIds() / getChartUnit()
 */
import type React from 'react';
import { Component } from 'react';
import type { SxProps, Theme } from '@mui/material';

import type { WidgetInfo } from './types';
import type { IStateContext } from './StateContext';
import type { ConfigItemPanel, ConfigItemTabs } from '@iobroker/dm-utils';

// ---------------------------------------------------------------------------
// Exported interfaces
// ---------------------------------------------------------------------------

export type WidgetSettingsBase = {
    size: '1x1' | '2x0.5' | '2x1';
    name: string;
    favorite: boolean;

    color: string;
    /** Custom color for inactive state */
    colorActive?: string;

    trendMinutes?: number;
    showTrendArrow?: boolean;
    chartHours: number;

    /** Custom widget icon URL/base64 (for non-alarm widgets, stored in `common.icon`) */
    icon: string;
    iconActive: string;

    text: string;
    textActive: string;
};

export interface WidgetGenericProps<TPluginWidgetSettings extends WidgetSettingsBase = WidgetSettingsBase> {
    widget: WidgetInfo;
    language: ioBroker.Languages;
    stateContext: IStateContext;
    size?: '1x1' | '2x0.5' | '2x1';
    settings?: TPluginWidgetSettings;
    onOpenSettings?: (widgetId: string | number) => void;
    /** Default history adapter instance (e.g. "history.0"), passed down to avoid repeated system.config reads */
    defaultHistory?: string;
    /** Adapter instance ID (e.g. "devices.0"), used to persist chart settings in custom */
    instanceId?: string;
    /** Use comma as a decimal separator (from system.config) */
    isFloatComma?: boolean;
    /** Widget dialog ID to auto-open (from hash). Matches `${widget.id}_chart` or `${widget.id}_info` or just `${widget.id}` */
    openDialogId?: string | null;
    /** Persist an opened dialog to the URL hash */
    onOpenWidgetDialog?: (dialogId: string) => void;
    /** Clear the dialog from the URL hash */
    onCloseWidgetDialog?: () => void;
}

export interface IndicatorValues {
    working: boolean | null;
    unreach: boolean | null;
    lowbat: boolean | null;
    maintain: boolean | null;
    error: string | null;
    direction: boolean | number | null;
    connected: boolean | null;
    battery: number | null;
}

export interface ChartSeries {
    data: { ts: number; val: number }[];
    color: string;
    name?: string;
    unit?: string;
}

export interface ExtraInfoEntry {
    id: string;
    stateName: string;
    label: string;
    unit: string;
    value: number | string | null;
    historyId: string | null;
}

export type ChartLineType = 'line' | 'step-start' | 'step-end';

export interface WidgetGenericState {
    name: string | null;
    color: string | null;
    indicators: IndicatorValues;
    chartSeries: ChartSeries[];
    chartDialogOpen: boolean;
    chartType: ChartLineType;
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/** Check if the current theme is the neumorphic "styling-grey" preset */
export function isNeumorphicTheme(theme: Theme): boolean {
    return (theme as Theme & { wmPreset?: string }).wmPreset === 'styling-grey';
}

/** Returns tile background, border, border-radius, and transition styles */
export function getTileStyles(
    _theme: Theme,
    _isActive: boolean,
    _accentColor?: string,
    _interactive?: boolean,
    _inactiveColor?: string,
): SxProps {
    // Stub — replaced at runtime by the host's real implementation
    return {};
}

// ---------------------------------------------------------------------------
// Base class
// ---------------------------------------------------------------------------

export class WidgetGeneric<
    TState extends WidgetGenericState = WidgetGenericState,
    TSettings extends WidgetSettingsBase = WidgetSettingsBase,
> extends Component<WidgetGenericProps<TSettings>, TState> {
    protected nameRef = { current: null as HTMLSpanElement | null };

    // --- Static style helpers (use in outer Box sx) ---

    static getDefaultSettings(): WidgetSettingsBase {
        return {
            size: '1x1',
            chartHours: 12,
            name: '',
            color: '',
            colorActive: '',
            showTrendArrow: false,
            trendMinutes: 30,
            favorite: false,
            icon: '',
            iconActive: '',
            text: '',
            textActive: '',
        };
    }

    static getStyleCompact(_theme: Theme): React.CSSProperties {
        return { position: 'relative', containerType: 'inline-size', overflow: 'hidden' };
    }

    static getStyleWide(theme: Theme): React.CSSProperties {
        return { ...WidgetGeneric.getStyleCompact(theme), gridColumn: 'span 2' };
    }

    static getStyleWideTall(theme: Theme): React.CSSProperties {
        return WidgetGeneric.getStyleWide(theme);
    }

    static getSettingButtonStyle(): SxProps<Theme> {
        return {};
    }

    /**
     * Override in plugin widgets to provide a settings dialog schema.
     *
     * Returns an `@iobroker/json-config` schema that the host renders in the
     * widget settings dialog. The `name` field is used as the dialog title,
     * and `schema` defines the form layout.
     *
     * Base fields (size, color) are automatically prepended by the host —
     * only add plugin-specific fields here.
     *
     * Supported item types (see `@iobroker/json-config` docs for full list):
     * - `text`, `number`, `checkbox`, `color`, `select` — standard inputs
     * - `objectId` — ioBroker state picker with browse dialog
     * - `instance` — adapter instance selector (`adapters: ['adapterName']`)
     * - `custom` — custom component registered via `customComponents`
     *
     * Use `hidden: "data.fieldName === 'value'"` (JS expression) to
     * conditionally show/hide fields based on other field values.
     *
     * @returns `{ name, schema }` or `null` if no settings are needed
     *
     * @example
     * ```typescript
     * static getConfigSchema(): { name: string; schema: ConfigItemPanel } | null {
     *     return {
     *         name: 'My Widget Settings',
     *         schema: {
     *             type: 'panel',
     *             items: {
     *                 refreshRate: {
     *                     type: 'number',
     *                     label: 'Refresh rate (ms)',
     *                     default: 1000,
     *                     min: 100,
     *                 },
     *                 sensorId: {
     *                     type: 'objectId',
     *                     label: 'Sensor state',
     *                 },
     *                 mode: {
     *                     type: 'select',
     *                     label: 'Display mode',
     *                     options: [
     *                         { value: 'simple', label: 'Simple' },
     *                         { value: 'detailed', label: 'Detailed' },
     *                     ],
     *                     default: 'simple',
     *                     format: 'radio',
     *                 },
     *                 showUnit: {
     *                     type: 'checkbox',
     *                     label: 'Show unit',
     *                     default: true,
     *                     hidden: "data.mode === 'simple'",
     *                 },
     *             },
     *         },
     *     };
     * }
     * ```
     */
    static getConfigSchema(): { name: string; schema: ConfigItemPanel | ConfigItemTabs } | null {
        return null;
    }

    // --- Helpers available to subclasses ---

    protected getText(_translated: ioBroker.StringOrTranslated): string {
        return '';
    }

    protected getWidgetClass(): string {
        return '';
    }

    protected getAccentColor(): string | undefined {
        return undefined;
    }

    protected getInactiveColor(): string | undefined {
        return undefined;
    }

    // --- Override points ---

    protected isTileActive(): boolean {
        return false;
    }

    protected hasTileAction(): boolean {
        return false;
    }

    protected hasChartAction(): boolean {
        return false;
    }

    protected onTileClick(): void {
        // override in subclass
    }

    protected getHistoryIds(): { id: string; color: string; name?: string }[] {
        return [];
    }

    protected getChartUnit(): string | undefined {
        return undefined;
    }

    // --- Rendering override points ---

    protected renderBaseIcon(): React.JSX.Element | null {
        return null;
    }

    protected renderTileIcon(): React.JSX.Element | null {
        return null;
    }

    protected renderTileStatus(): React.JSX.Element | null {
        return null;
    }

    protected renderTileAction(): React.JSX.Element | null {
        return null;
    }

    protected renderIndicators(): React.JSX.Element | null {
        return null;
    }

    protected renderTrendArrow(): React.JSX.Element | null {
        return null;
    }

    protected renderChart(): React.JSX.Element | null {
        return null;
    }

    protected renderChartDialog(): React.JSX.Element | null {
        return null;
    }

    protected renderSettingsButton(): React.JSX.Element | null {
        return null;
    }

    protected renderInfoDialog(): React.JSX.Element | null {
        return null;
    }

    // --- Size-specific rendering ---

    renderCompact(): React.JSX.Element {
        return null as unknown as React.JSX.Element;
    }

    renderWide(): React.JSX.Element {
        return null as unknown as React.JSX.Element;
    }

    renderWideTall(): React.JSX.Element {
        return null as unknown as React.JSX.Element;
    }

    render(): React.JSX.Element {
        return null as unknown as React.JSX.Element;
    }
}

export default WidgetGeneric;
