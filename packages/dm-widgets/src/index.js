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
const _host = (typeof window !== 'undefined' &&
    window.__iobrokerDmWidgets__) || { ..._stubs, StateContext: _StateContextStub };
// Shared modules provided by the host via window.__iobrokerShared__
// Plugins should import react/MUI from here instead of directly to avoid dual-instance issues
const _shared = (typeof window !== 'undefined' && window.__iobrokerShared__) || {};
// --- Value exports (resolved from host at runtime) ---
export const WidgetGeneric = _host.default || _host.WidgetGeneric || _stubs.default;
export default WidgetGeneric;
export const getTileStyles = _host.getTileStyles || _stubs.getTileStyles;
export const isNeumorphicTheme = _host.isNeumorphicTheme || _stubs.isNeumorphicTheme;
export const StateContext = _host.StateContext || _StateContextStub;
/** Host's React instance — use this instead of importing 'react' directly in plugins */
export const React = _shared.react;
/** Host's RactDom instance — use this instead of importing 'react-dom' directly in plugins */
export const ReactDom = _shared['react-dom'];
/** Host's MUI Material — use this instead of importing '@mui/material' directly in plugins */
export const MuiMaterial = _shared['@mui/material'];
/** Host's MUI Icons — use this instead of importing '@mui/icons-material' directly in plugins */
export const MuiIcons = _shared['@mui/icons-material'];
/** Host's moment instance — use this instead of importing 'moment' directly in plugins */
export const moment = _shared.moment;
/** Host's adapter-react-v5 instance — use this instead of importing '@iobroker/adapter-react-v5' directly in plugins */
export const AdapterReact = _shared['@iobroker/adapter-react-v5'];
//# sourceMappingURL=index.js.map