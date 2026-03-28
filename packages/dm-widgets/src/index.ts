/**
 * @iobroker/dm-widgets — Types and base class for ioBroker Device Manager widget plugins.
 *
 * ## How it works
 *
 * **At compile time:** Plugin authors `npm install @iobroker/dm-widgets` and import
 * types, interfaces, and the `WidgetGeneric` base class for TypeScript support.
 *
 * **At runtime:** The host app (ioBroker.devices) provides the real implementation
 * via Module Federation shared dependencies. The plugin's bundler must mark
 * `@iobroker/dm-widgets` as external/shared so it is NOT bundled — the host supplies it.
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

// Re-export everything from the actual Generic module.
// At compile time, TypeScript resolves these from the local source.
// At runtime, Module Federation provides the host's version.

export {
    default,
    default as WidgetGeneric,
    getTileStyles,
    isNeumorphicTheme,
    DEFAULT_WIDGET_SETTINGS,
    type WidgetSettings,
    type WidgetGenericProps,
    type WidgetGenericState,
    type IndicatorValues,
    type ChartSeries,
    type ExtraInfoEntry,
} from './WidgetGeneric';

export { default as StateContext, type StateChangeListener, type ObjectChangeListener } from './StateContext';

export type {
    ItemInfo,
    WidgetInfo,
    DevicesDetectorState,
    DevicesPatternControl,
    CategoryInfo,
    CustomWidgetType,
    CustomWidgetDef,
} from './types';
