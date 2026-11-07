/**
 * What the device editor changed on the mapping of an alias state. Kept free of imports, so the unit
 * tests can load it without React.
 */

/** Source of an alias state: one datapoint, or separate datapoints to read and to write */
export type AliasSource = string | { read: string; write: string } | null | undefined;

/** A missing text and an empty one are the same: the editor shows both as an empty field */
function isSameText(a: string | null | undefined, b: string | null | undefined): boolean {
    return (a || '') === (b || '');
}

/** Whether two alias sources point to the same datapoints */
export function isSameAliasSource(a: AliasSource, b: AliasSource): boolean {
    if (a && typeof a === 'object') {
        return !!b && typeof b === 'object' && isSameText(a.read, b.read) && isSameText(a.write, b.write);
    }
    if (b && typeof b === 'object') {
        return false;
    }
    return isSameText(a, b);
}

/** Whether the conversion formulas differ from the saved ones */
export function isFormulaChanged(
    saved: { read?: string; write?: string } | undefined,
    edited: { read?: string; write?: string } | undefined,
): boolean {
    return !isSameText(saved?.read, edited?.read) || !isSameText(saved?.write, edited?.write);
}

/** Whether the value texts (`common.states`) differ from the saved ones; none from the editor are not applied */
export function isStatesChanged(
    saved: Record<string, string> | undefined,
    edited: Record<string, string> | undefined,
): boolean {
    if (!edited) {
        return false;
    }
    const savedKeys = Object.keys(saved || {});
    const editedKeys = Object.keys(edited);
    return savedKeys.length !== editedKeys.length || editedKeys.some(key => saved?.[key] !== edited[key]);
}

/**
 * Whether the editor gives an alias state the automatic name. Up to 4.2 the states created with a new
 * device were named only after their slot ("ACTUAL", issue #696); such a state gets the full name when
 * its source is changed - but not when anything else is saved, because the user may have given it the
 * name of its slot on purpose (issue #725).
 */
export function needsAutoStateName(
    name: ioBroker.StringOrTranslated | undefined,
    slot: string,
    sourceChanged: boolean,
): boolean {
    return !name || (sourceChanged && name === slot);
}
