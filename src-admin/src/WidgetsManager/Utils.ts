import { I18n } from '@iobroker/gui-components';

let language: ioBroker.Languages;

const HEX_RE = /^[0-9a-fA-F]+$/;

const DETECT_APPLICATIONS = ['/vis/', '/vis-2/', '/echarts/', '/flot/', '/jarvis/'];
export { DETECT_APPLICATIONS };

/**
 * Normalize a user-supplied color so MUI's `alpha()`/theme helpers don't throw.
 * - Adds a missing leading `#` for bare 3/4/6/8-char hex strings (e.g. "112233" → "#112233").
 * - Passes through anything that already starts with `#`, `rgb`, `hsl`, or a CSS keyword.
 * - Returns `undefined` for empty/invalid input so callers can fall back to a theme default.
 */
export function normalizeColor(color: string | undefined | null): string | undefined {
    if (!color) {
        return undefined;
    }
    const c = color.trim();
    if (!c) {
        return undefined;
    }
    if (c.startsWith('#') || c.startsWith('rgb') || c.startsWith('hsl') || c.startsWith('var(')) {
        return c;
    }
    // Bare hex without `#`: 3, 4, 6, or 8 hex chars
    if ((c.length === 3 || c.length === 4 || c.length === 6 || c.length === 8) && HEX_RE.test(c)) {
        return `#${c}`;
    }
    // Could be a CSS named color ("red", "transparent") — let it through; MUI accepts named colors.
    if (/^[a-zA-Z]+$/.test(c)) {
        return c;
    }
    return undefined;
}

/**
 * Get Translation
 */
export function getTranslation(
    /** Text to translate */
    text: ioBroker.StringOrTranslated,
    noTranslation?: boolean,
): string {
    language ||= I18n.getLanguage();

    if (typeof text === 'object') {
        return text[language] || text.en;
    }

    return noTranslation ? text : I18n.t(text);
}

/** Minimal object-reading capability needed by {@link resolveHistoryTarget} (the widget StateContext) */
export interface ObjectReader {
    getObject: <T>(id: string) => Promise<T | undefined>;
}

/**
 * Resolve which object actually carries the history configuration for a state.
 *
 * Alias states (`alias.0.*`) normally do not record themselves — the history adapter is enabled on
 * the physical source state the alias points at. Looking only at the alias would therefore report
 * "not recording" although a chart is happily drawn from the source, and switching recording on
 * would log the same value a second time instead of toggling the existing one.
 *
 * Mirrors the lookup `WidgetGeneric.resolveHistoryId()` uses to read chart data.
 *
 * @param stateContext Object reader (the widget StateContext)
 * @param stateId State the widget shows, may be an alias
 * @param historyInstance Instance ID of the history adapter, e.g. `history.0`
 * @returns The ID that carries (or should carry) the history settings and whether recording is on
 */
export async function resolveHistoryTarget(
    stateContext: ObjectReader,
    stateId: string,
    historyInstance: string,
): Promise<{ id: string; enabled: boolean }> {
    let obj: ioBroker.StateObject | undefined;
    try {
        obj = await stateContext.getObject<ioBroker.StateObject>(stateId);
    } catch {
        return { id: stateId, enabled: false };
    }
    if (obj?.common?.custom?.[historyInstance]?.enabled) {
        return { id: stateId, enabled: true };
    }

    const aliasId = obj?.common?.alias?.id;
    const targetId = typeof aliasId === 'object' ? aliasId?.read : aliasId;
    if (targetId && targetId !== stateId) {
        try {
            const target = await stateContext.getObject<ioBroker.StateObject>(targetId);
            if (target?.common?.custom?.[historyInstance]?.enabled) {
                return { id: targetId, enabled: true };
            }
        } catch {
            // ignore — fall through to "not recorded anywhere"
        }
    }

    // Recorded nowhere: offer to switch it on for the state the widget itself uses
    return { id: stateId, enabled: false };
}
