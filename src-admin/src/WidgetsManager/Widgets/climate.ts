/**
 * The dial model shared by the climate widgets: setpoints, and the geometry of the arc they sit on.
 *
 * A `thermostat` or `airCondition` declares `SET`, `SET_HEATING` and `SET_COOLING` as a
 * `requiredOneOf` group, so a device carries any combination of the three. Everything that has to
 * agree between the two widgets — which id is which, what range they span together, which thumb a
 * gesture belongs to, and where on the arc a value is painted — lives here, free of React so it can
 * be tested directly.
 */

export const ARC_VIEWBOX = 100;
export const ARC_STROKE = 8;
export const ARC_RADIUS = (ARC_VIEWBOX - ARC_STROKE) / 2;
export const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_RADIUS;
export const ARC_LENGTH = ARC_CIRCUMFERENCE * 0.75;

/** Degrees the arc spans, clockwise from its start */
const ARC_SWEEP = 270;
/** Where the arc starts, clockwise from 12 o'clock */
const ARC_START = 225;

export const HEATING_COLOR = '#f44336';
export const COOLING_COLOR = '#2196f3';

/**
 * Where on the arc a pointer landed, as a fraction of the scale.
 *
 * The 90° gap at the bottom is not part of the scale, so a pointer inside it snaps to whichever end
 * is nearer instead of jumping across the whole range.
 *
 * @param el Element the arc is drawn in, used for its centre
 * @param clientX Pointer x in client coordinates
 * @param clientY Pointer y in client coordinates
 * @returns Fraction along the arc, or null when the element is not mounted
 */
export function pointerToFraction(el: HTMLElement | null, clientX: number, clientY: number): number | null {
    if (!el) {
        return null;
    }
    const rect = el.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);

    let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
    if (angle < 0) {
        angle += 360;
    }

    let normalized = (angle - ARC_START + 360) % 360;
    if (normalized > ARC_SWEEP) {
        normalized = normalized > (360 + ARC_SWEEP) / 2 ? 0 : ARC_SWEEP;
    }
    return normalized / ARC_SWEEP;
}

/**
 * Centre of a thumb in the arc's own — still unrotated — coordinate system.
 *
 * The thumb is rendered inside the same `<svg>`, so the 135° that moves the gap to the bottom
 * applies to it as well and must not be added here.
 *
 * @param fraction Position along the arc
 * @returns Coordinates inside the `ARC_VIEWBOX` square
 */
export function thumbCenter(fraction: number): { x: number; y: number } {
    const angle = ((90 + fraction * ARC_SWEEP) * Math.PI) / 180;
    const c = ARC_VIEWBOX / 2;
    return { x: c + ARC_RADIUS * Math.sin(angle), y: c - ARC_RADIUS * Math.cos(angle) };
}

export type SetpointKind = 'plain' | 'heating' | 'cooling';

export interface SetpointRange {
    min: number;
    max: number;
    step: number;
}

export interface SetpointIds {
    plain: string | null;
    heating: string | null;
    cooling: string | null;
}

/** All three variants, in the order they are offered to the user */
export const SETPOINT_KINDS: readonly SetpointKind[] = ['plain', 'heating', 'cooling'];

/** Range used until the setpoint objects have been read */
export function defaultRange(min: number, max: number): SetpointRange {
    return { min, max, step: 0.5 };
}

/**
 * Resolve the three setpoint ids of a device.
 *
 * An unmatched state keeps its name and arrives without a usable id — `undefined` from the detector,
 * or empty once an alias has been wiped — so a falsy id has to count as absent.
 *
 * @param states The device's detected states
 * @returns One id per setpoint variant, null where the device has none
 */
export function findSetpointIds(states: readonly { name: string; id: string }[]): SetpointIds {
    const byName = (name: string): string | null => states.find(s => s.name === name && s.id)?.id || null;
    return { plain: byName('SET'), heating: byName('SET_HEATING'), cooling: byName('SET_COOLING') };
}

export function setpointId(ids: SetpointIds, kind: SetpointKind): string | null {
    return kind === 'plain' ? ids.plain : kind === 'heating' ? ids.heating : ids.cooling;
}

/** True once the device offers a heating *and* a cooling setpoint, which is what puts two thumbs on the dial */
export function isDualSetpoint(ids: SetpointIds): boolean {
    return !!ids.heating && !!ids.cooling;
}

/**
 * The setpoint a single-thumb dial follows.
 *
 * Heating- and cooling-only devices are the reason this is not simply `SET`: with the plain
 * setpoint absent, the one alternative the device does declare is its setpoint.
 *
 * @param ids The device's setpoint ids
 * @returns Which variant drives the dial, or null when the device has no setpoint at all
 */
export function singleSetpointKind(ids: SetpointIds): SetpointKind | null {
    if (ids.plain) {
        return 'plain';
    }
    if (ids.heating) {
        return 'heating';
    }
    if (ids.cooling) {
        return 'cooling';
    }
    return null;
}

/**
 * The setpoints the dial cannot carry, which therefore need a field of their own.
 *
 * The dial shows one thumb, or the heating/cooling pair. Any further setpoint the device declares —
 * `SET` beside that pair, or the directional one beside a plain `SET` — would otherwise be
 * unreachable: detected, subscribed, and impossible to set.
 *
 * @param ids The device's setpoint ids
 * @param dual Whether the dial carries the heating/cooling pair
 * @param single The setpoint a single-thumb dial follows
 * @returns The declared setpoints that are not on the dial
 */
export function offDialSetpointKinds(ids: SetpointIds, dual: boolean, single: SetpointKind | null): SetpointKind[] {
    const onDial: SetpointKind[] = dual ? ['heating', 'cooling'] : single ? [single] : [];
    return SETPOINT_KINDS.filter(kind => setpointId(ids, kind) && !onDial.includes(kind));
}

export function clampToRange(value: number, range: SetpointRange): number {
    return Math.max(range.min, Math.min(range.max, value));
}

/** Position of a value on the dial, 0 at the start of the arc and 1 at its end */
export function valueToFraction(value: number, range: SetpointRange): number {
    const span = range.max - range.min;
    if (span <= 0) {
        return 0;
    }
    return Math.max(0, Math.min(1, (value - range.min) / span));
}

export function fractionToValue(fraction: number, range: SetpointRange): number {
    const step = range.step > 0 ? range.step : 0.5;
    const raw = range.min + fraction * (range.max - range.min);
    return clampToRange(Math.round(raw / step) * step, range);
}

/**
 * Range of a setpoint datapoint, or null when its object declares nothing usable.
 *
 * @param common The datapoint's common section
 * @param fallback Range to take min/max/step from where common defines none
 * @returns The declared range, or null when min/max are missing or inverted
 */
export function rangeFromCommon(
    common: ioBroker.StateCommon | undefined,
    fallback: SetpointRange,
): SetpointRange | null {
    if (!common) {
        return null;
    }
    const min = common.min != null ? Number(common.min) : fallback.min;
    const max = common.max != null ? Number(common.max) : fallback.max;
    const step = common.step != null ? Number(common.step) : fallback.step;
    if (isNaN(min) || isNaN(max) || max <= min) {
        return null;
    }
    return { min, max, step: step > 0 ? step : fallback.step };
}

/** What one setpoint datapoint declares about itself */
export interface SetpointMeta {
    range: SetpointRange | null;
    /**
     * `common.write === false`.
     *
     * The detector accepts a setpoint whose role matches even when the datapoint cannot be written,
     * so a device can present a read-only setpoint and every control for it has to stay disabled.
     */
    readOnly: boolean;
}

export type SetpointMetas = Partial<Record<SetpointKind, SetpointMeta>>;

/**
 * @param common The datapoint's common section
 * @param fallback Range to take min/max/step from where common defines none
 * @returns What the datapoint declares, with an unreadable object treated as writable and unbounded
 */
export function metaFromCommon(common: ioBroker.StateCommon | undefined, fallback: SetpointRange): SetpointMeta {
    return { range: rangeFromCommon(common, fallback), readOnly: common?.write === false };
}

/**
 * Clamp a value to the limits of the datapoint it is about to be written to.
 *
 * The dial spans every setpoint's range at once, so the scale under the thumb is wider than one
 * datapoint allows whenever the two declare different limits. The write has to respect its own
 * datapoint, not the union.
 *
 * @param metas What each setpoint declared
 * @param kind The setpoint being written
 * @param value The value the gesture produced
 * @param dialRange Fallback for a setpoint whose object declared no usable range
 * @returns The value to write
 */
export function clampForWrite(
    metas: SetpointMetas,
    kind: SetpointKind,
    value: number,
    dialRange: SetpointRange,
): number {
    return clampToRange(value, metas[kind]?.range ?? dialRange);
}

/**
 * The range both thumbs move in.
 *
 * Heating and cooling datapoints routinely declare different limits, and a dial with two scales is
 * not a dial — so the widest of the two wins and the finer step is kept.
 *
 * @param ranges Ranges of the setpoints the device declares
 * @returns One range covering all of them, or null when none was usable
 */
export function mergeRanges(ranges: (SetpointRange | null)[]): SetpointRange | null {
    const usable = ranges.filter((r): r is SetpointRange => !!r);
    if (!usable.length) {
        return null;
    }
    return {
        min: Math.min(...usable.map(r => r.min)),
        max: Math.max(...usable.map(r => r.max)),
        step: Math.min(...usable.map(r => r.step)),
    };
}

/**
 * Which thumb a gesture starting at `value` belongs to.
 *
 * Ties go to heating, so that two setpoints sitting on the same value still leave both reachable:
 * heating cannot be dragged above cooling, so the first move separates them.
 *
 * @param value Value the pointer went down on
 * @param heating Current heating setpoint
 * @param cooling Current cooling setpoint
 * @returns The thumb to move for the rest of the gesture
 */
export function pickDragTarget(value: number, heating: number | null, cooling: number | null): 'heating' | 'cooling' {
    if (heating == null) {
        return cooling == null ? 'heating' : 'cooling';
    }
    if (cooling == null) {
        return 'heating';
    }
    return Math.abs(value - heating) <= Math.abs(value - cooling) ? 'heating' : 'cooling';
}

/**
 * Keep the heating setpoint at or below the cooling one.
 *
 * The pair describes a band, and a band whose ends have crossed is not a band. Dragging past the
 * other thumb stops at it rather than swapping the two, so the thumb under the finger stays the
 * thumb under the finger.
 *
 * @param kind Which setpoint is being moved
 * @param value Value the gesture asks for
 * @param other The other setpoint's current value
 * @returns The value to apply
 */
export function clampAgainstOther(kind: 'heating' | 'cooling', value: number, other: number | null): number {
    if (other == null) {
        return value;
    }
    return kind === 'heating' ? Math.min(value, other) : Math.max(value, other);
}
