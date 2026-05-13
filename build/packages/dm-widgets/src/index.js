"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdapterReact = exports.moment = exports.MuiIcons = exports.MuiMaterial = exports.ReactDom = exports.React = exports.StateContext = exports.isNeumorphicTheme = exports.getTileStyles = exports.WidgetGeneric = void 0;
const _stubs = __importStar(require("./WidgetGeneric"));
const StateContext_1 = __importDefault(require("./StateContext"));
// At runtime, the host provides the real implementations via window global.
// Fall back to stubs if running outside the host (e.g. tests, SSR).
const _host = (typeof window !== 'undefined' &&
    window.__iobrokerDmWidgets__) || { ..._stubs, StateContext: StateContext_1.default };
// Shared modules provided by the host via window.__iobrokerShared__
// Plugins should import react/MUI from here instead of directly to avoid dual-instance issues
const _shared = (typeof window !== 'undefined' && window.__iobrokerShared__) || {};
// --- Value exports (resolved from host at runtime) ---
exports.WidgetGeneric = _host.default || _host.WidgetGeneric || _stubs.default;
exports.default = exports.WidgetGeneric;
exports.getTileStyles = _host.getTileStyles || _stubs.getTileStyles;
exports.isNeumorphicTheme = _host.isNeumorphicTheme || _stubs.isNeumorphicTheme;
exports.StateContext = _host.StateContext || StateContext_1.default;
/** Host's React instance — use this instead of importing 'react' directly in plugins */
exports.React = _shared.react;
/** Host's RactDom instance — use this instead of importing 'react-dom' directly in plugins */
exports.ReactDom = _shared['react-dom'];
/** Host's MUI Material — use this instead of importing '@mui/material' directly in plugins */
exports.MuiMaterial = _shared['@mui/material'];
/** Host's MUI Icons — use this instead of importing '@mui/icons-material' directly in plugins */
exports.MuiIcons = _shared['@mui/icons-material'];
/** Host's moment instance — use this instead of importing 'moment' directly in plugins */
exports.moment = _shared.moment;
/** Host's adapter-react-v5 instance — use this instead of importing '@iobroker/adapter-react-v5' directly in plugins */
exports.AdapterReact = _shared['@iobroker/adapter-react-v5'];
//# sourceMappingURL=index.js.map