import { I18n } from '@iobroker/gui-components';

let language: ioBroker.Languages;

const HEX_RE = /^[0-9a-fA-F]+$/;

/** Hex notations MUI's `decomposeColor()` accepts. */
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** Functional notations MUI's `decomposeColor()` accepts. */
const FUNCTIONAL_COLOR_RE = /^(?:rgb|rgba|hsl|hsla|color)\(.+\)$/;

/**
 * Colour the probe inherits while resolving. A value that does not take effect — a typo, or a
 * `var()` pointing at an undefined property — computes to this, which is how such input is told
 * apart from a real colour. A user whose colour happens to be exactly this loses it to the theme
 * default; that is a better trade than the alternative of letting a bad value through.
 */
const PROBE_SENTINEL = 'rgb(1, 2, 3)';

/** Browser-resolved colours, keyed by the raw input — resolving touches the DOM. */
const resolvedColors = new Map<string, string | undefined>();

/**
 * Turn any CSS colour the browser understands into `rgb()`/`rgba()`.
 *
 * Named colours (`red`), `var(--x)` and modern syntaxes are all valid CSS but none of them can be
 * decomposed by MUI, so they are handed to the browser and read back in a supported notation.
 *
 * @param value Trimmed colour as the user entered it
 * @returns The resolved colour, or undefined when the browser does not accept it
 */
function resolveCssColor(value: string): string | undefined {
    const cached = resolvedColors.get(value);
    if (cached !== undefined || resolvedColors.has(value)) {
        return cached;
    }
    let result: string | undefined;
    // No DOM (tests, SSR): only the literal notations above can be trusted
    if (typeof document !== 'undefined' && document.body) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;color:${PROBE_SENTINEL}`;
        const probe = document.createElement('div');
        probe.style.color = value;
        wrapper.appendChild(probe);
        document.body.appendChild(wrapper);
        try {
            const computed = window.getComputedStyle(probe).color;
            if (computed && computed !== PROBE_SENTINEL && FUNCTIONAL_COLOR_RE.test(computed)) {
                result = computed;
            }
        } finally {
            wrapper.remove();
        }
    }
    resolvedColors.set(value, result);
    return result;
}

const DETECT_APPLICATIONS = ['/vis/', '/vis-2/', '/echarts/', '/flot/', '/jarvis/'];
export { DETECT_APPLICATIONS };

/**
 * Normalize a user-supplied colour into a notation MUI's `alpha()` can decompose.
 *
 * Every return value must survive `decomposeColor()`, because the result ends up in `alpha()` all
 * over the tile styling — and a value it cannot parse does not degrade, it throws and takes the
 * whole view down. `decomposeColor()` handles `#nnn`, `#nnnnnn`, `rgb()`, `rgba()`, `hsl()`,
 * `hsla()` and `color()`; notably *not* named colours such as `red` and not `var(--x)`, both of
 * which are perfectly valid CSS and were previously passed through unchanged.
 *
 * - Bare hex gains its `#` ("112233" → "#112233")
 * - Already-supported notations are returned unchanged
 * - Anything else the browser understands is resolved to `rgb()`/`rgba()`
 * - Everything left over becomes undefined, so callers fall back to a theme default
 *
 * @param color Colour as configured by the user
 * @returns A colour safe to hand to `alpha()`, or undefined
 */
export function normalizeColor(color: string | undefined | null): string | undefined {
    if (!color) {
        return undefined;
    }
    const c = color.trim();
    if (!c) {
        return undefined;
    }
    if (HEX_COLOR_RE.test(c) || FUNCTIONAL_COLOR_RE.test(c)) {
        return c;
    }
    // Bare hex without `#`: 3, 4, 6, or 8 hex chars
    if ((c.length === 3 || c.length === 4 || c.length === 6 || c.length === 8) && HEX_RE.test(c)) {
        return `#${c}`;
    }
    return resolveCssColor(c);
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
