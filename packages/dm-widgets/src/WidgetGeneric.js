import { Component } from 'react';
// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------
/** Check if the current theme is the neumorphic "styling-grey" preset */
export function isNeumorphicTheme(theme) {
    return theme.wmPreset === 'styling-grey';
}
/** Returns tile background, border, border-radius, and transition styles */
export function getTileStyles(_theme, _isActive, _accentColor, _interactive, _inactiveColor) {
    // Stub — replaced at runtime by the host's real implementation
    return {};
}
// ---------------------------------------------------------------------------
// Base class
// ---------------------------------------------------------------------------
export class WidgetGeneric extends Component {
    nameRef = { current: null };
    // --- Static style helpers (use in outer Box sx) ---
    static getDefaultSettings() {
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
    static getStyleCompact(_theme) {
        return { position: 'relative', containerType: 'inline-size', overflow: 'hidden' };
    }
    static getStyleWide(theme) {
        return { ...WidgetGeneric.getStyleCompact(theme), gridColumn: 'span 2' };
    }
    static getStyleWideTall(theme) {
        return WidgetGeneric.getStyleWide(theme);
    }
    static getSettingButtonStyle() {
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
     * Supported item types (see `@iobroker/json-config` docs for the full list):
     * - `text`, `number`, `checkbox`, `color`, `select` — standard inputs
     * - `objectId` — ioBroker state picker with browse dialog
     * - `instance` — adapter instance selector (`adapters: ['adapterName']`)
     * - `custom` — custom component registered via `customComponents`
     *
     * Use `hidden: "data.fieldName === 'value'"` (JS expression) to
     * conditionally show/hide fields based on other field values.
     *
     * @returns `{ name, schema }` or `null` if no settings are needed
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
    static getConfigSchema() {
        return null;
    }
    // --- Helpers available to subclasses ---
    getText(_translated) {
        return '';
    }
    getWidgetClass() {
        return '';
    }
    getAccentColor() {
        return undefined;
    }
    getInactiveColor() {
        return undefined;
    }
    /** Format a timestamp as a localized "time ago" string using "moment" */
    fromNow(_ts) {
        return '';
    }
    // --- Override points ---
    isTileActive() {
        return false;
    }
    hasTileAction() {
        return false;
    }
    hasChartAction() {
        return false;
    }
    onTileClick() {
        // override in subclass
    }
    getHistoryIds() {
        return [];
    }
    getChartUnit() {
        return undefined;
    }
    // --- Rendering override points ---
    renderBaseIcon() {
        return null;
    }
    renderTileIcon() {
        return null;
    }
    renderTileStatus() {
        return null;
    }
    renderTileAction() {
        return null;
    }
    renderIndicators(_settingsButton, _extraStates) {
        return null;
    }
    renderTrendArrow() {
        return null;
    }
    renderChart() {
        return null;
    }
    renderChartDialog() {
        return null;
    }
    renderSettingsButton() {
        return null;
    }
    renderInfoDialog() {
        return null;
    }
    // --- PinPad ---
    /** Open the PinPad dialog. On the correct PIN, `onPinPadSuccess()` is called. */
    showPinPad(_pin) {
        // Replaced at runtime by the host's real implementation
    }
    /** Called when the user enters the correct PIN. Override in subclass. */
    onPinPadSuccess() {
        // override in subclass
    }
    renderPinPad() {
        return null;
    }
    // --- Confirmation Dialog ---
    /** Open a confirmation dialog. On success, `onConfirmDialogSuccess()` is called. */
    showConfirmDialog(_mode, _pin, _text) {
        // Replaced at runtime by the host's real implementation
    }
    /** Called after successful confirmation. Override in subclass. */
    onConfirmDialogSuccess() {
        // override in subclass
    }
    renderConfirmDialog() {
        return null;
    }
    // --- Size-specific rendering ---
    renderCompact() {
        return null;
    }
    renderWide() {
        return null;
    }
    renderWideTall() {
        return null;
    }
    render() {
        return null;
    }
}
export default WidgetGeneric;
//# sourceMappingURL=WidgetGeneric.js.map