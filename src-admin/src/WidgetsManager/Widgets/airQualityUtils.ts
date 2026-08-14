/**
 * Pure logic for the air-quality widget: worst-first ranking of the eleven pollutants, and the
 * label-or-number resolution shared by the AQI band and every `*_LEVEL` enum. Kept free of React so
 * it can be tested directly (see test/airQuality.test.js), the same way commonStates.ts is.
 */

/** Pattern declaration order, from the installed type-detector's typePatterns.js `airQuality` entry */
export const POLLUTANT_NAMES = ['CO2', 'TVOC', 'PM1', 'PM25', 'PM10', 'CO', 'NO2', 'O3', 'CH2O', 'RN', 'SO2'] as const;
export type PollutantName = (typeof POLLUTANT_NAMES)[number];

export interface PollutantRow {
    name: PollutantName;
    hasValue: boolean;
    value: number | null;
    hasLevel: boolean;
    /** Normally a number, but see `resolveEnumDisplay` for why a reported string must not be dropped */
    level: number | string | null;
}

/** The severities the pattern declares, `0` UNKNOWN through `4` CRITICAL */
const MAX_LEVEL = 4;

/**
 * Severity a row sorts by: its LEVEL value when one has arrived, so 0 (UNKNOWN) already sorts below
 * 1 (LOW) with no special case needed.
 *
 * A row with no live severity signal — no LEVEL state, one that hasn't reported, or one reporting
 * outside the declared 0-4 enum — sinks below every reported level. A value outside that range has no
 * severity anyone can read: it is shown as the bare number it is, so ranking it above a CRITICAL
 * reading would put an uninterpretable row at the top of a list that means "worst first".
 */
function severityRank(row: PollutantRow): number {
    if (!row.hasLevel || row.level == null) {
        return -1;
    }
    const numeric = typeof row.level === 'number' ? row.level : Number(row.level);
    return isNaN(numeric) || numeric < 0 || numeric > MAX_LEVEL ? -1 : numeric;
}

/**
 * Worst-first ranking for the dialog's pollutant list. Ties (including the "no severity signal"
 * bucket) keep the caller's original order, so the list does not reshuffle between renders.
 */
export function rankPollutants(rows: readonly PollutantRow[]): PollutantRow[] {
    return rows
        .map((row, index) => ({ row, index }))
        .sort((a, b) => {
            const bySeverity = severityRank(b.row) - severityRank(a.row);
            return bySeverity !== 0 ? bySeverity : a.index - b.index;
        })
        .map(entry => entry.row);
}

export interface EnumDisplay {
    /** A resolved label, or the raw value (with unit, if any) when no label exists */
    text: string;
    /** The value's numeric index, only when a label for it was found — used for severity colouring */
    band: number | null;
}

/**
 * The label-or-number rule shared by the AQI band and every LEVEL enum: a datapoint's own
 * `common.states` wins, the pattern's `defaultStates` is the fallback, and a value with neither is
 * shown as a plain number — never blank, never "unknown".
 *
 * The two sources are chosen as whole maps, never merged key-by-key: a device that labels only some
 * of its values still means its own scale for the ones it did label, and mixing in the pattern's
 * labels for the rest would silently splice two unrelated scales into one readout (mirrors
 * `WidgetFanBase.loadSpeedMeta`, where a datapoint's own list fully replaces the pattern's).
 *
 * A datapoint typed `number` may still legitimately report an enum index as a string (the same
 * reason `WidgetAirCondition`'s MODE reads `string | number`), so a label lookup and the final
 * fallback both accept either.
 *
 * @param value Current reading, `null` while unknown
 * @param deviceStates Parsed `common.states` of the datapoint itself
 * @param patternStates Parsed `defaultStates` of the detected pattern
 * @param unit `common.unit` of the datapoint, `''` when it declares none
 * @param formatNumber Formats the raw value when it is a number with no label
 */
export function resolveEnumDisplay(
    value: number | string | null,
    deviceStates: Record<string, string>,
    patternStates: Record<string, string>,
    unit: string,
    formatNumber: (value: number) => string,
): EnumDisplay {
    if (value == null) {
        return { text: '—', band: null };
    }
    const states = Object.keys(deviceStates).length ? deviceStates : patternStates;
    const label = states[String(value)];
    if (label) {
        const numeric = typeof value === 'number' ? value : Number(value);
        return { text: label, band: isNaN(numeric) ? null : numeric };
    }
    if (typeof value !== 'number') {
        return { text: unit ? `${value} ${unit}` : value, band: null };
    }
    const num = formatNumber(value);
    return { text: unit ? `${num} ${unit}` : num, band: null };
}

/**
 * Maps a resolved label to one of this widget's own translation keys.
 *
 * The pattern's `defaultStates` use fixed English names (`GOOD`, `CRITICAL`, ...); a datapoint's own
 * `common.states` may say the same thing, in any casing or spacing, or something else entirely —
 * either way, only a recognised name gets translated, everything else is shown as the device wrote
 * it (mirrors `WidgetFanBase.getSpeedLabel`).
 */
export function knownLabelKey(label: string, map: Record<string, string>): string | null {
    return (
        map[
            label
                .trim()
                .toUpperCase()
                .replace(/[\s-]+/g, '_')
        ] ?? null
    );
}
