import { I18n } from '@iobroker/adapter-react-v5';

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
