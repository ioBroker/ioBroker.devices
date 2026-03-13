import { I18n } from '@iobroker/adapter-react-v5';

let language: ioBroker.Languages;

/**
 * Get Translation
 */
export function getTranslation(
    /** Text to translate */
    text: ioBroker.StringOrTranslated,
    noTranslation?: boolean,
): string {
    language = language || I18n.getLanguage();

    if (typeof text === 'object') {
        return text[language] || text.en;
    }

    return noTranslation ? text : I18n.t(text);
}
