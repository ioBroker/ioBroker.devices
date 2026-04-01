/**
 * @iobroker/dm-widgets — Types and base class for ioBroker Device Manager widget plugins.
 *
 * ## How it works
 *
 * **At compile time:** Plugin authors `npm install @iobroker/dm-widgets` and import
 * types, interfaces, and the `WidgetGeneric` base class for TypeScript support.
 *
 * **At runtime:** The host app (ioBroker.devices) exposes the real implementation on
 * `window.__iobrokerDmWidgets__`. This module checks for that global and re-exports
 * the host's real classes — so plugins get the full WidgetGeneric with all rendering
 * logic, not the compile-time stubs.
 *
 * ## Usage
 *
 * ```typescript
 * import WidgetGeneric, {
 *     type WidgetGenericProps,
 *     type WidgetGenericState,
 *     getTileStyles,
 *     isNeumorphicTheme,
 * } from '@iobroker/dm-widgets';
 *
 * interface MyWidgetState extends WidgetGenericState {
 *     myValue: number;
 * }
 *
 * export class MyWidget extends WidgetGeneric<MyWidgetState> {
 *     // Override renderCompact(), renderTileIcon(), etc.
 * }
 * ```
 */

import * as _stubs from './WidgetGeneric';
import _StateContextStub from './StateContext';

// At runtime, the host provides the real implementations via window global.
// Fall back to stubs if running outside the host (e.g. tests, SSR).
const _host: typeof _stubs & { StateContext: typeof _StateContextStub } =
    (typeof window !== 'undefined' && (window as any).__iobrokerDmWidgets__) || { ..._stubs, StateContext: _StateContextStub };

// --- Value exports (resolved from host at runtime) ---

export const WidgetGeneric = _host.default || _host.WidgetGeneric || _stubs.default;
export default WidgetGeneric;
export const getTileStyles = _host.getTileStyles || _stubs.getTileStyles;
export const isNeumorphicTheme = _host.isNeumorphicTheme || _stubs.isNeumorphicTheme;
export const DEFAULT_WIDGET_SETTINGS = _host.DEFAULT_WIDGET_SETTINGS || _stubs.DEFAULT_WIDGET_SETTINGS;
export const StateContext = _host.StateContext || _StateContextStub;

// --- Type-only exports (no runtime presence needed) ---

export type { WidgetSettings, WidgetGenericProps, WidgetGenericState, IndicatorValues, ChartSeries, ExtraInfoEntry } from './WidgetGeneric';
export type { StateChangeListener, ObjectChangeListener } from './StateContext';
export type { ItemInfo, WidgetInfo, DevicesDetectorState, DevicesPatternControl, CategoryInfo, CustomWidgetType, CustomWidgetBase, CustomWidgetDef, ClockWidgetDef, WeatherWidgetDef, IframeWidgetDef, WindWidgetDef, GaugeWidgetDef, PluginWidgetDef, WidgetConfigItem } from './types';
