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
import type { Theme } from '@mui/material/styles';
import type { SxProps } from '@mui/material';

import type StateContext from './StateContext';
import type { WidgetInfo } from './types';

// ---------------------------------------------------------------------------
// Exported interfaces
// ---------------------------------------------------------------------------

export interface WidgetSettings {
    size: '1x1' | '2x0.5' | '2x1';
    chartHours: number;
    name: string;
    color: string;
    blindType: 'shutter' | 'curtain';
    pin: string;
    hideWhenOk: boolean;
    onBrightness: number;
    showCoordinates: boolean;
    markerIcon: string;
    mapTheme: string;
    sliderType: string;
    wideSliderStyle: string;
    showAnimation: boolean;
    refreshInterval: number;
    appendTimestamp: boolean;
    textActive: string;
    textInactive: string;
    colorInactive: string;
    iconActive: string;
    iconInactive: string;
    icon: string;
    showTrendArrow: boolean;
    trendMinutes: number;
    favorite: boolean;
}

export const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
    size: '1x1',
    chartHours: 12,
    name: '',
    color: '',
    blindType: 'shutter',
    pin: '',
    hideWhenOk: false,
    onBrightness: 100,
    showCoordinates: false,
    markerIcon: '',
    mapTheme: 'standard',
    sliderType: 'normal',
    wideSliderStyle: 'horizontal',
    showAnimation: true,
    refreshInterval: 0,
    appendTimestamp: false,
    textActive: '',
    textInactive: '',
    colorInactive: '',
    iconActive: '',
    iconInactive: '',
    icon: '',
    showTrendArrow: false,
    trendMinutes: 30,
    favorite: false,
};

export interface WidgetGenericProps {
    widget: WidgetInfo;
    language: ioBroker.Languages;
    stateContext: StateContext;
    size?: '1x1' | '2x0.5' | '2x1';
    settings?: WidgetSettings;
    onOpenSettings?: (widgetId: string | number) => void;
    defaultHistory?: string;
    instanceId?: string;
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
    icon: string | null;
    color: string | null;
    indicators: IndicatorValues;
    chartSeries: ChartSeries[];
    extraInfo: ExtraInfoEntry[];
    infoDialogOpen: boolean;
    chartDialogOpen: boolean;
    trend: 'up' | 'down' | 'stable' | null;
    chartType: ChartLineType;
    infoChartEntry: ExtraInfoEntry | null;
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
): Record<string, unknown> {
    // Stub — replaced at runtime by the host's real implementation
    return {};
}

// ---------------------------------------------------------------------------
// Base class
// ---------------------------------------------------------------------------

export class WidgetGeneric<TState extends WidgetGenericState = WidgetGenericState> extends Component<
    WidgetGenericProps,
    TState
> {
    protected nameRef = { current: null as HTMLSpanElement | null };

    // --- Static style helpers (use in outer Box sx) ---

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
