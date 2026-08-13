/**
 * Reading a datapoint's value list.
 *
 * `common.states` reaches a widget as an object, as an array (value = index) or as a `"0:Auto;1:Cool"`
 * string, and a widget that understands only one of them loses the control it was meant to render
 * (issue #654). Kept free of React so it can be tested directly, and shared so a second widget cannot
 * reintroduce the object-only reading.
 */

/**
 * @param states Raw `common.states` from the object definition
 * @returns Value → label, with the values kept as strings
 */
export function parseCommonStates(states: unknown): Record<string, string> {
    if (!states) {
        return {};
    }
    if (typeof states === 'string') {
        const parsed: Record<string, string> = {};
        for (const pair of states.split(';')) {
            const at = pair.indexOf(':');
            if (at > 0) {
                parsed[pair.slice(0, at).trim()] = pair.slice(at + 1).trim();
            }
        }
        return parsed;
    }
    if (typeof states === 'object') {
        // An array needs no branch of its own: its entries are already keyed by index, which is what
        // the array form means
        const parsed: Record<string, string> = {};
        for (const [key, label] of Object.entries(states as Record<string, unknown>)) {
            parsed[key] = String(label);
        }
        return parsed;
    }
    return {};
}

/**
 * Value to write for a state list entry.
 *
 * The key carries the datapoint's own type: a numeric datapoint must receive `7`, a string one
 * `'SWING'`. Coercing everything through `Number()` turned string keys into `NaN`.
 *
 * @param key Key from `common.states`
 * @returns The key as the datapoint expects it
 */
export function stateKeyToValue(key: string): string | number {
    const num = Number(key);
    return key.trim() !== '' && !isNaN(num) ? num : key;
}
