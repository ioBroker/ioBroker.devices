import React from 'react';

import {
    ARC_CIRCUMFERENCE,
    ARC_LENGTH,
    ARC_RADIUS,
    ARC_STROKE,
    ARC_VIEWBOX,
    COOLING_COLOR,
    HEATING_COLOR,
    thumbCenter,
    valueToFraction,
    type SetpointRange,
} from './climate';

/**
 * The dial shared by the climate widgets: a 270° arc carrying one or two setpoints.
 *
 * A `<circle>` dash starts at 3 o'clock, so the whole `<svg>` is rotated by 135° to put the gap at
 * the bottom — see {@link thumbCenter}, which deliberately works in the unrotated system.
 */
export interface ClimateArcProps {
    range: SetpointRange;
    /** Single-setpoint value; ignored once `heating` and `cooling` are both given */
    value?: number | null;
    heating?: number | null;
    cooling?: number | null;
    /** Stroke of the single-setpoint arc — a colour, or a `url(#…)` reference */
    progressStroke?: string;
    /** Suppresses the transition while a drag is in progress */
    dragging?: boolean;
    /** Content for the `<defs>` a caller's gradient or filter needs */
    defs?: React.ReactNode;
    progressFilter?: string;
    style?: React.CSSProperties;
    /** Fades the thumb of the setpoint the device is not currently working towards */
    dimmedThumb?: 'heating' | 'cooling' | null;
}

const THUMB_RADIUS = ARC_STROKE * 0.75;
const THUMB_BORDER = ARC_STROKE * 0.2;

/**
 * Room the viewBox needs beyond the track so a thumb is not shaved off.
 *
 * The track is flush with the `0 0 100 100` box — its outer edge lands exactly on 50 — so a thumb
 * straddling it would be clipped at the four points where the arc touches the box.
 */
const THUMB_PADDING = Math.ceil(THUMB_RADIUS + THUMB_BORDER / 2);

function Thumb({ fraction, color, dimmed }: { fraction: number; color: string; dimmed?: boolean }): React.JSX.Element {
    const { x, y } = thumbCenter(fraction);
    return (
        <circle
            cx={x}
            cy={y}
            r={THUMB_RADIUS}
            fill={color}
            stroke="#fff"
            strokeWidth={THUMB_BORDER}
            opacity={dimmed ? 0.45 : 1}
        />
    );
}

/**
 * @param props Arc range, values and styling
 * @returns The dial: a track, then either one progress arc or a band between two thumbs
 */
export function ClimateArc(props: ClimateArcProps): React.JSX.Element {
    const { range, value, heating, cooling, progressStroke, dragging, defs, progressFilter, style, dimmedThumb } =
        props;
    // A pair whose second datapoint has never been written arrives half-null; the thumb that does
    // have a value still has to be drawn, or the dial comes up as an empty ring
    const thumbed = heating != null || cooling != null;
    const banded = heating != null && cooling != null;
    const transition = dragging ? undefined : { transition: 'stroke-dasharray 0.3s ease' };
    const c = ARC_VIEWBOX / 2;

    let band: React.JSX.Element | null = null;
    let progress: React.JSX.Element | null = null;

    if (banded) {
        const from = valueToFraction(Math.min(heating, cooling), range);
        const to = valueToFraction(Math.max(heating, cooling), range);
        band = (
            <circle
                cx={c}
                cy={c}
                r={ARC_RADIUS}
                fill="none"
                stroke="currentColor"
                strokeWidth={ARC_STROKE}
                strokeDasharray={`${(to - from) * ARC_LENGTH} ${ARC_CIRCUMFERENCE}`}
                strokeDashoffset={-from * ARC_LENGTH}
                opacity={0.35}
                style={transition}
            />
        );
    }
    if (!thumbed && value != null && progressStroke) {
        progress = (
            <circle
                cx={c}
                cy={c}
                r={ARC_RADIUS}
                fill="none"
                stroke={progressStroke}
                strokeWidth={ARC_STROKE}
                strokeDasharray={`${valueToFraction(value, range) * ARC_LENGTH} ${ARC_CIRCUMFERENCE}`}
                strokeLinecap="round"
                filter={progressFilter}
                style={transition}
            />
        );
    }

    // Only a dial that carries thumbs pays for the padding, so a single-setpoint dial keeps drawing
    // its track at exactly the size it always has
    const pad = thumbed ? THUMB_PADDING : 0;

    return (
        <svg
            viewBox={`${-pad} ${-pad} ${ARC_VIEWBOX + 2 * pad} ${ARC_VIEWBOX + 2 * pad}`}
            style={{ transform: 'rotate(135deg)', ...style }}
        >
            {defs ? <defs>{defs}</defs> : null}
            <circle
                cx={c}
                cy={c}
                r={ARC_RADIUS}
                fill="none"
                stroke="currentColor"
                strokeWidth={ARC_STROKE}
                strokeDasharray={`${ARC_LENGTH} ${ARC_CIRCUMFERENCE}`}
                strokeLinecap="round"
                opacity={0.15}
            />
            {band}
            {progress}
            {heating != null ? (
                <Thumb
                    fraction={valueToFraction(heating, range)}
                    color={HEATING_COLOR}
                    dimmed={dimmedThumb === 'heating'}
                />
            ) : null}
            {cooling != null ? (
                <Thumb
                    fraction={valueToFraction(cooling, range)}
                    color={COOLING_COLOR}
                    dimmed={dimmedThumb === 'cooling'}
                />
            ) : null}
        </svg>
    );
}

export default ClimateArc;
