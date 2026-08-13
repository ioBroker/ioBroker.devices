import React from 'react';
import { Box, Typography } from '@mui/material';
import { CalendarMonth } from '@mui/icons-material';
import { alpha, type Theme } from '@mui/material/styles';
// @ts-expect-error no types
import { getTimes } from 'suncalc2';

import type { ConfigItemPanel } from '@iobroker/json-config';

import WidgetGeneric, { type WidgetGenericState, type WidgetGenericProps } from './Generic';
import { hideBaseFields } from '../configUtils';
import type { CustomWidgetBase } from '../../../../packages/dm-widgets/src/index';

interface SunTimes {
    sunrise: Date;
    sunset: Date;
    sunriseEnd: Date;
    sunsetStart: Date;
    dawn: Date;
    dusk: Date;
    nauticalDawn: Date;
    nauticalDusk: Date;
    nightEnd: Date;
    night: Date;
    goldenHourEnd: Date;
    goldenHour: Date;
    solarNoon: Date;
    nadir: Date;
}
const getTimesTypes: (date: Date, latitude: number, longitude: number) => SunTimes = getTimes;

const SUN_LABELS: Record<string, { rise: string; set: string }> = {
    en: { rise: 'Sunrise', set: 'Sunset' },
    de: { rise: 'Sonnenaufgang', set: 'Sonnenuntergang' },
    ru: { rise: 'Восход', set: 'Закат' },
    pt: { rise: 'Nascer do sol', set: 'Pôr do sol' },
    nl: { rise: 'Zonsopgang', set: 'Zonsondergang' },
    fr: { rise: 'Lever du soleil', set: 'Coucher du soleil' },
    it: { rise: 'Alba', set: 'Tramonto' },
    es: { rise: 'Amanecer', set: 'Atardecer' },
    pl: { rise: 'Wschód słońca', set: 'Zachód słońca' },
    uk: { rise: 'Схід сонця', set: 'Захід сонця' },
    'zh-cn': { rise: '日出', set: '日落' },
};

/**
 * Four-pointed sparkle around (`x`, `y`).
 *
 * @param x Centre x in the 24×24 glyph viewBox
 * @param y Centre y in the 24×24 glyph viewBox
 * @param r Outer radius of the star
 * @returns SVG path data
 */
function starPath(x: number, y: number, r: number): string {
    const i = r * 0.32;
    return `M${x} ${y - r}L${x + i} ${y - i}L${x + r} ${y}L${x + i} ${y + i}L${x} ${y + r}L${x - i} ${y + i}L${x - r} ${y}L${x - i} ${y - i}Z`;
}

/**
 * Sunrise glyph — a warm core with a ring of rays.
 *
 * Drawn inline rather than taken from the icon font because the gradient core and the glow are
 * what make it read as a sun at tile size; a flat single-colour icon looks washed out next to the
 * clock face. Gradient ids are shared across instances on purpose: every instance defines the
 * same stops, so a collision resolves to an identical gradient.
 *
 * @param props Component props
 * @param props.size Glyph size as a CSS length
 * @returns The sun glyph
 */
function SunGlyph(props: { size: string }): React.JSX.Element {
    const rays: React.JSX.Element[] = [];
    for (let i = 0; i < 8; i++) {
        const rad = (i * 45 * Math.PI) / 180;
        rays.push(
            <line
                key={i}
                x1={12 + Math.cos(rad) * 8.6}
                y1={12 + Math.sin(rad) * 8.6}
                x2={12 + Math.cos(rad) * 11.2}
                y2={12 + Math.sin(rad) * 11.2}
                stroke="#ffb020"
                strokeWidth={2}
                strokeLinecap="round"
            />,
        );
    }
    return (
        <svg
            viewBox="0 0 24 24"
            style={{
                width: props.size,
                height: props.size,
                display: 'block',
                overflow: 'visible',
                filter: 'drop-shadow(0 0 4px rgba(255,170,32,0.45))',
            }}
        >
            <defs>
                <radialGradient
                    id="wmSunCore"
                    cx="40%"
                    cy="36%"
                    r="68%"
                >
                    <stop
                        offset="0%"
                        stopColor="#ffe497"
                    />
                    <stop
                        offset="55%"
                        stopColor="#ffc23d"
                    />
                    <stop
                        offset="100%"
                        stopColor="#ff9d00"
                    />
                </radialGradient>
            </defs>
            {rays}
            <circle
                cx={12}
                cy={12}
                r={5.4}
                fill="url(#wmSunCore)"
            />
        </svg>
    );
}

/**
 * Sunset glyph — a cool crescent with two sparkles.
 *
 * @param props Component props
 * @param props.size Glyph size as a CSS length
 * @returns The moon glyph
 */
function MoonGlyph(props: { size: string }): React.JSX.Element {
    return (
        <svg
            viewBox="0 0 24 24"
            style={{
                width: props.size,
                height: props.size,
                display: 'block',
                overflow: 'visible',
                filter: 'drop-shadow(0 0 4px rgba(124,108,240,0.45))',
            }}
        >
            <defs>
                <linearGradient
                    id="wmMoonBody"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="1"
                >
                    <stop
                        offset="0%"
                        stopColor="#a493ff"
                    />
                    <stop
                        offset="100%"
                        stopColor="#5566f0"
                    />
                </linearGradient>
            </defs>
            <path
                d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"
                fill="url(#wmMoonBody)"
            />
            <path
                d={starPath(18.7, 4.1, 1.9)}
                fill="#c9c2ff"
            />
            <path
                d={starPath(21.3, 8.1, 1.15)}
                fill="#a493ff"
            />
        </svg>
    );
}

export interface WidgetClockSettings extends CustomWidgetBase {
    style?: 'digital' | 'analog';
    /** Show date (day + month). Default: true */
    showDate?: boolean;
    /** Show day of the week. Default: true */
    showDow?: boolean;
    /** Show seconds. Default: true */
    showSeconds?: boolean;
    /** Show sunrise/sunset. Default: true */
    showSun?: boolean;
}

interface WidgetClockState extends WidgetGenericState {
    time: string;
    dow: string;
    dateStr: string;
    seconds: string;
    hours: number;
    minutes: number;
    secs: number;
    sunrise: string;
    sunset: string;
}

export class WidgetClock extends WidgetGeneric<WidgetClockState, WidgetClockSettings> {
    static getConfigSchema(): ConfigItemPanel {
        return {
            type: 'panel',
            label: 'wm_Clock',
            items: {
                // Clock has no active/inactive state — hide the base color fields.
                ...hideBaseFields('colorActive', 'color'),
                style: {
                    type: 'select',
                    label: 'wm_Style',
                    options: [
                        { value: 'digital', label: 'wm_Digital' },
                        { value: 'analog', label: 'wm_Analog' },
                    ],
                    default: 'digital',
                    format: 'radio',
                },
                showDate: { type: 'checkbox', label: 'wm_Show date', default: true },
                showDow: { type: 'checkbox', label: 'wm_Show DOW', default: true },
                showSeconds: { type: 'checkbox', label: 'wm_Show seconds', default: true },
                showSun: {
                    type: 'checkbox',
                    label: 'wm_Show sunrise/sunset',
                    default: true,
                    hidden: 'data.size === "1x1"',
                },
            },
        };
    }

    private timer: ReturnType<typeof setInterval> | null = null;

    constructor(props: WidgetGenericProps<WidgetClockSettings>) {
        super(props);
        this.state = {
            ...this.state,
            ...this.getCurrentTime(),
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.timer = setInterval(() => {
            this.setState(this.getCurrentTime() as Partial<WidgetClockState> as WidgetClockState);
        }, 1000);
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    private getCurrentTime(): Omit<WidgetClockState, keyof WidgetGenericState> {
        const now = new Date();
        const lang = this.props.stateContext.language;

        let sunrise = '';
        let sunset = '';
        if (
            this.props.settings.showSun !== false &&
            this.props.stateContext.latitude != null &&
            this.props.stateContext.longitude != null
        ) {
            try {
                const times = getTimesTypes(now, this.props.stateContext.latitude, this.props.stateContext.longitude);
                sunrise = times.sunrise.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
                sunset = times.sunset.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
            } catch {
                // ignore calculation errors
            }
        }

        return {
            time: now.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }),
            dow: now.toLocaleDateString(lang, { weekday: 'short' }),
            dateStr: now.toLocaleDateString(lang, { day: 'numeric', month: 'short' }),
            seconds: now.getSeconds().toString().padStart(2, '0'),
            hours: now.getHours(),
            minutes: now.getMinutes(),
            secs: now.getSeconds(),
            sunrise,
            sunset,
        };
    }

    /** Build the display date string from dow + dateStr based on show* props */
    private get displayDate(): string {
        const showDate = this.props.settings.showDate !== false;
        const showDow = this.props.settings.showDow !== false;
        if (showDow && showDate) {
            return `${this.state.dow}, ${this.state.dateStr}`;
        }
        if (showDow) {
            return new Date().toLocaleDateString(this.props.stateContext.language, { weekday: 'long' });
        }
        if (showDate) {
            return this.state.dateStr;
        }
        return '';
    }

    private get showSeconds(): boolean {
        return this.props.settings.showSeconds !== false;
    }

    private get isAnalog(): boolean {
        return this.props.settings.style === 'analog';
    }

    // --- Analog clock face SVG ---

    /**
     * Prefix for the gradient/filter ids of this instance.
     *
     * Must be unique per widget: the arc gradient resolves `var(--wm-accent)` against the element
     * that *defines* it, so two clocks sharing an id would both paint the accent of whichever one
     * rendered first.
     */
    private get svgId(): string {
        return `wmclk${String(this.props.widget.id).replace(/[^a-zA-Z0-9]/g, '_')}`;
    }

    /**
     * The dial.
     *
     * Colours are taken from the surroundings instead of being passed in: strokes use
     * `currentColor` and the accent comes from the `--wm-accent` custom property that
     * {@link renderFaceBox} puts on the wrapper. That way the dial follows the theme preset
     * without every call site having to thread colours through.
     *
     * @param size CSS length for width/height, or null to fill the wrapper
     * @returns The clock face
     */
    private renderAnalogFace(size: number | string | null): React.JSX.Element {
        const { hours, minutes, secs } = this.state;
        const cx = 50;
        const cy = 50;
        const id = this.svgId;

        // Angles in degrees (0° = 12 o'clock, clockwise)
        const secAngle = secs * 6;
        const minAngle = minutes * 6 + secs * 0.1;
        const hourAngle = (hours % 12) * 30 + minutes * 0.5;

        // Hand endpoints from center
        const hand = (angle: number, length: number): { x: number; y: number } => {
            const rad = ((angle - 90) * Math.PI) / 180;
            return { x: cx + Math.cos(rad) * length, y: cy + Math.sin(rad) * length };
        };

        const hourEnd = hand(hourAngle, 24);
        const minEnd = hand(minAngle, 34);
        const secEnd = hand(secAngle, 38);

        // Two tiers only: all twelve hour marks are equal, fine ticks in between
        const ticks: React.JSX.Element[] = [];
        for (let i = 0; i < 60; i++) {
            const angle = i * 6;
            const isHour = i % 5 === 0;
            const inner = hand(angle, isHour ? 36.5 : 40.5);
            const outer = hand(angle, 43);
            ticks.push(
                <line
                    key={i}
                    x1={inner.x}
                    y1={inner.y}
                    x2={outer.x}
                    y2={outer.y}
                    stroke="currentColor"
                    strokeOpacity={isHour ? 0.88 : 0.22}
                    strokeWidth={isHour ? 2 : 0.9}
                    strokeLinecap="round"
                />,
            );
        }

        // Accent arc over the upper-left of the rim: one dash of 120°, starting at 9 o'clock.
        // `rotate(-180)` moves the dash origin from 3 o'clock (where a circle path starts) to 9.
        const ringR = 46;
        const circumference = 2 * Math.PI * ringR;
        const arcLength = circumference / 3;
        const arc = {
            cx,
            cy,
            r: ringR,
            fill: 'none',
            strokeDasharray: `${arcLength} ${circumference - arcLength}`,
            transform: `rotate(-180 ${cx} ${cy})`,
            strokeLinecap: 'round' as const,
        };

        return (
            <svg
                viewBox="0 0 100 100"
                // The arc's halo reaches past the rim and would be cut off at the viewBox edge
                style={{ ...(size ? { width: size, height: size } : {}), display: 'block', overflow: 'visible' }}
            >
                <defs>
                    <radialGradient
                        id={`${id}face`}
                        cx="32%"
                        cy="26%"
                        r="82%"
                    >
                        <stop
                            offset="0%"
                            stopColor="currentColor"
                            stopOpacity={0.055}
                        />
                        <stop
                            offset="100%"
                            stopColor="currentColor"
                            stopOpacity={0.01}
                        />
                    </radialGradient>
                    {/* Runs bottom-left → top-right so the arc peaks around 10 o'clock and fades
                        out towards both ends, the way a light source grazing the rim would. */}
                    <linearGradient
                        id={`${id}arc`}
                        x1="0"
                        y1="1"
                        x2="1"
                        y2="0"
                    >
                        <stop
                            offset="15%"
                            stopColor="var(--wm-accent)"
                            stopOpacity={0}
                        />
                        <stop
                            offset="50%"
                            stopColor="var(--wm-accent)"
                            stopOpacity={1}
                        />
                        <stop
                            offset="90%"
                            stopColor="var(--wm-accent)"
                            stopOpacity={0}
                        />
                    </linearGradient>
                    <filter
                        id={`${id}glow`}
                        x="-40%"
                        y="-40%"
                        width="180%"
                        height="180%"
                    >
                        <feGaussianBlur stdDeviation={4.5} />
                    </filter>
                    <filter
                        id={`${id}glowTight`}
                        x="-40%"
                        y="-40%"
                        width="180%"
                        height="180%"
                    >
                        <feGaussianBlur stdDeviation={1.8} />
                    </filter>
                </defs>

                {/* Face */}
                <circle
                    cx={cx}
                    cy={cy}
                    r={45.5}
                    fill={`url(#${id}face)`}
                />
                {/* Rim */}
                <circle
                    cx={cx}
                    cy={cy}
                    r={ringR}
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity={0.14}
                    strokeWidth={1}
                />
                {/* Accent arc — two blurred copies underneath build the halo */}
                <circle
                    {...arc}
                    stroke={`url(#${id}arc)`}
                    strokeWidth={9}
                    opacity={0.4}
                    filter={`url(#${id}glow)`}
                />
                <circle
                    {...arc}
                    stroke={`url(#${id}arc)`}
                    strokeWidth={4}
                    opacity={0.6}
                    filter={`url(#${id}glowTight)`}
                />
                <circle
                    {...arc}
                    stroke={`url(#${id}arc)`}
                    strokeWidth={1.8}
                />

                {ticks}

                {/* Hour hand */}
                <line
                    x1={cx}
                    y1={cy}
                    x2={hourEnd.x}
                    y2={hourEnd.y}
                    stroke="currentColor"
                    strokeWidth={3.6}
                    strokeLinecap="round"
                />
                {/* Minute hand */}
                <line
                    x1={cx}
                    y1={cy}
                    x2={minEnd.x}
                    y2={minEnd.y}
                    stroke="currentColor"
                    strokeWidth={2.6}
                    strokeLinecap="round"
                />
                {/* Second hand */}
                {this.showSeconds ? (
                    <line
                        x1={cx}
                        y1={cy}
                        x2={secEnd.x}
                        y2={secEnd.y}
                        stroke="var(--wm-accent)"
                        strokeWidth={0.9}
                        strokeLinecap="round"
                    />
                ) : null}
                {/* Center dot */}
                <circle
                    cx={cx}
                    cy={cy}
                    r={2.8}
                    fill="var(--wm-accent)"
                    style={{ filter: 'drop-shadow(0 0 3px var(--wm-accent))' }}
                />
            </svg>
        );
    }

    /**
     * Wrapper that supplies the dial with its colours.
     *
     * @param size CSS length passed on to the face, or null to fill the box
     * @param sx Layout styles for the wrapper
     * @returns The wrapped clock face
     */
    private renderFaceBox(size: number | string | null, sx: Record<string, unknown>): React.JSX.Element {
        return (
            <Box
                sx={theme => ({
                    ...sx,
                    color: theme.palette.text.primary,
                    '--wm-accent': this.props.settings.color || theme.palette.primary.main,
                })}
            >
                {this.renderAnalogFace(size)}
            </Box>
        );
    }

    // --- Info panel pieces (day pill, date, sun times) ---

    /** Weekday as a tinted pill, the way the mobile app shows it. */
    private renderDayPill(fontSize: string): React.JSX.Element | null {
        if (this.props.settings.showDow === false) {
            return null;
        }
        return (
            <Box
                sx={theme => {
                    const accent = this.props.settings.color || theme.palette.primary.main;
                    return {
                        alignSelf: 'flex-start',
                        px: '0.95em',
                        py: '0.35em',
                        borderRadius: '999px',
                        fontSize,
                        fontWeight: 700,
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                        color: accent,
                        backgroundColor: alpha(accent, 0.12),
                        border: `1px solid ${alpha(accent, 0.3)}`,
                    };
                }}
            >
                {this.state.dow}
            </Box>
        );
    }

    /**
     * Date in display size. On dark presets the glyphs carry a top-down gradient, which is what
     * keeps a large block of text from looking flat; on light ones a white gradient would vanish,
     * so it falls back to the plain text colour.
     *
     * @param fontSize CSS font size for the date
     * @returns The date, or null when dates are switched off
     */
    private renderBigDate(fontSize: string): React.JSX.Element | null {
        if (this.props.settings.showDate === false) {
            return null;
        }
        return (
            <Typography
                sx={(theme: Theme) => ({
                    fontWeight: 800,
                    lineHeight: 1.05,
                    letterSpacing: '-0.02em',
                    fontSize,
                    whiteSpace: 'nowrap',
                    ...(theme.palette.mode === 'dark'
                        ? {
                              background: `linear-gradient(180deg, ${theme.palette.text.primary} 35%, ${alpha(theme.palette.text.primary, 0.6)})`,
                              backgroundClip: 'text',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                          }
                        : { color: theme.palette.text.primary }),
                })}
            >
                {this.state.dateStr}
            </Typography>
        );
    }

    /**
     * The clock reading with the separator drawn as two accent dots.
     *
     * The separator is located by pattern rather than assumed to be `:` — locales use `.` or a
     * narrow space, and 12-hour locales append an AM/PM suffix that has to stay with the minutes.
     *
     * @param fontSize Font size of the digits
     * @returns The time, or the plain string when no separator can be identified
     */
    private renderDigitalTime(fontSize: string): React.JSX.Element {
        const { time } = this.state;
        const parts = /^(.*?\d)([^\d\s])(\d.*)$/.exec(time);
        const digitSx = {
            fontWeight: 700,
            lineHeight: 1,
            fontSize,
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap' as const,
            fontVariantNumeric: 'tabular-nums' as const,
        };
        if (!parts) {
            return <Typography sx={digitSx}>{time}</Typography>;
        }
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.12em', fontSize }}>
                <Typography sx={digitSx}>{parts[1]}</Typography>
                <Box
                    sx={theme => {
                        const accent = this.props.settings.color || theme.palette.primary.main;
                        return {
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            gap: '0.22em',
                            px: '0.06em',
                            '& > span': {
                                width: '0.16em',
                                height: '0.16em',
                                borderRadius: '50%',
                                backgroundColor: accent,
                                boxShadow: `0 0 0.35em ${alpha(accent, 0.9)}`,
                            },
                        };
                    }}
                >
                    <span />
                    <span />
                </Box>
                <Typography sx={digitSx}>{parts[3]}</Typography>
            </Box>
        );
    }

    /** Seconds centred between two accent rules. */
    private renderSecondsRule(fontSize: string): React.JSX.Element | null {
        if (!this.showSeconds) {
            return null;
        }
        return (
            <Box
                sx={theme => {
                    const accent = this.props.settings.color || theme.palette.primary.main;
                    return {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6em',
                        width: '100%',
                        fontSize,
                        color: accent,
                        '& > hr': {
                            flex: 1,
                            minWidth: 0,
                            height: '1px',
                            border: 0,
                            margin: 0,
                            background: `linear-gradient(90deg, transparent, ${alpha(accent, 0.55)})`,
                        },
                        '& > hr:last-of-type': {
                            background: `linear-gradient(90deg, ${alpha(accent, 0.55)}, transparent)`,
                        },
                    };
                }}
            >
                <hr />
                <Typography
                    component="span"
                    sx={{
                        fontSize: 'inherit',
                        fontWeight: 700,
                        lineHeight: 1,
                        color: 'inherit',
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    :{this.state.seconds}
                </Typography>
                <hr />
            </Box>
        );
    }

    /**
     * Date line: calendar badge, weekday in the accent colour, the rest in the text colour.
     *
     * @param fontSize Font size of the date
     * @returns The date line, or null when both weekday and date are switched off
     */
    private renderDateBadge(fontSize: string): React.JSX.Element | null {
        const showDate = this.props.settings.showDate !== false;
        const showDow = this.props.settings.showDow !== false;
        if (!showDate && !showDow) {
            return null;
        }
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5em', fontSize, minWidth: 0 }}>
                <Box
                    sx={theme => {
                        const accent = this.props.settings.color || theme.palette.primary.main;
                        return {
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '1.9em',
                            height: '1.9em',
                            borderRadius: '0.5em',
                            color: accent,
                            backgroundColor: alpha(accent, 0.12),
                            border: `1px solid ${alpha(accent, 0.3)}`,
                            '& .MuiSvgIcon-root': { fontSize: '1.1em' },
                        };
                    }}
                >
                    <CalendarMonth />
                </Box>
                <Typography
                    sx={theme => ({
                        fontSize: 'inherit',
                        fontWeight: 700,
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: theme.palette.text.primary,
                    })}
                >
                    {showDow ? (
                        <Box
                            component="span"
                            sx={theme => ({ color: this.props.settings.color || theme.palette.primary.main })}
                        >
                            {this.state.dow}
                        </Box>
                    ) : null}
                    {showDow && showDate ? ', ' : ''}
                    {showDate ? this.state.dateStr : ''}
                </Typography>
            </Box>
        );
    }

    /** Hairline rule with an accent dot riding on it. */
    private renderAccentDivider(): React.JSX.Element {
        return (
            <Box
                sx={theme => {
                    const accent = this.props.settings.color || theme.palette.primary.main;
                    return {
                        position: 'relative',
                        width: '100%',
                        height: '1px',
                        flexShrink: 0,
                        backgroundColor: alpha(theme.palette.text.primary, 0.12),
                        '&::after': {
                            content: '""',
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            width: '5px',
                            height: '5px',
                            marginLeft: '-2.5px',
                            marginTop: '-2.5px',
                            borderRadius: '50%',
                            backgroundColor: accent,
                            boxShadow: `0 0 6px ${alpha(accent, 0.9)}`,
                        },
                    };
                }}
            />
        );
    }

    /**
     * Sunrise and sunset side by side, split by a vertical rule.
     *
     * @param sizes Font/glyph sizes so the block can scale with the tile
     * @param sizes.glyph Size of the sun/moon glyph
     * @param sizes.time Font size of the times
     * @param sizes.label Font size of the labels below the times
     * @returns The sun block, or null when there is nothing to show
     */
    private renderSunColumns(sizes: { glyph: string; time: string; label: string }): React.JSX.Element | null {
        if (this.props.settings.showSun === false) {
            return null;
        }
        const { sunrise, sunset } = this.state;
        if (!sunrise || !sunset) {
            return null;
        }
        const labels = SUN_LABELS[this.props.stateContext.language] || SUN_LABELS.en;

        const column = (glyph: React.JSX.Element, time: string, label: string): React.JSX.Element => (
            <Box
                sx={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25em',
                }}
            >
                {glyph}
                <Typography
                    sx={theme => ({
                        fontWeight: 700,
                        fontSize: sizes.time,
                        lineHeight: 1.1,
                        fontVariantNumeric: 'tabular-nums',
                        color: theme.palette.text.primary,
                    })}
                >
                    {time}
                </Typography>
                <Typography
                    sx={theme => ({
                        fontSize: sizes.label,
                        lineHeight: 1.2,
                        color: theme.palette.text.secondary,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                    })}
                >
                    {label}
                </Typography>
            </Box>
        );

        return (
            <Box sx={{ display: 'flex', alignItems: 'stretch', width: '100%', gap: '0.5em' }}>
                {column(<SunGlyph size={sizes.glyph} />, sunrise, labels.rise)}
                <Box
                    sx={theme => ({
                        width: '1px',
                        alignSelf: 'stretch',
                        backgroundColor: alpha(theme.palette.text.primary, 0.1),
                    })}
                />
                {column(<MoonGlyph size={sizes.glyph} />, sunset, labels.set)}
            </Box>
        );
    }

    /** Compact one-line sun readout for tiles too small for {@link renderSunColumns}. */
    private renderSunInfo(fontSize?: string): React.JSX.Element | null {
        if (this.props.settings.showSun === false) {
            return null;
        }
        const { sunrise, sunset } = this.state;
        if (!sunrise || !sunset) {
            return null;
        }
        const size = fontSize || 'max(0.7rem, 3.5cqi)';
        return (
            <Box
                sx={theme => ({
                    display: 'flex',
                    gap: 1.5,
                    mt: 0.5,
                    alignItems: 'center',
                    color: theme.palette.text.secondary,
                    fontSize: size,
                    fontVariantNumeric: 'tabular-nums',
                })}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.35em' }}>
                    <SunGlyph size="1.25em" />
                    <span>{sunrise}</span>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.35em' }}>
                    <MoonGlyph size="1.25em" />
                    <span>{sunset}</span>
                </Box>
            </Box>
        );
    }

    // --- Compact 1x1 ---

    renderCompact(): React.JSX.Element {
        if (this.isAnalog) {
            return this.renderAnalogCompact();
        }
        return this.renderDigitalCompact();
    }

    // --- Wide 2x0.5 ---

    renderWide(): React.JSX.Element {
        if (this.isAnalog) {
            return this.renderAnalogWide();
        }
        return this.renderDigitalWide();
    }

    // --- Wide tall 2x1 ---

    renderWideTall(): React.JSX.Element {
        if (this.isAnalog) {
            return this.renderAnalogWideTall();
        }
        return this.renderDigitalWideTall();
    }

    // --- Digital renders ---

    private renderDigitalCompact(): React.JSX.Element {
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);

        return (
            <Box
                id={String(this.props.widget.id)}
                className="widget-clock"
                sx={theme => WidgetGeneric.getStyleCompact(theme)}
            >
                <Box
                    sx={theme => ({
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%',
                        aspectRatio: '1',
                        overflow: 'hidden',
                        ...this.applyTileStyles(theme, false, { interactive: false }),
                    })}
                >
                    {indicators}
                    {this.renderDigitalTime('max(1.6rem, 23cqi)')}
                    <Box sx={{ width: '100%', mt: 'max(4px, 3cqi)' }}>
                        {this.renderSecondsRule('max(0.7rem, 8cqi)')}
                    </Box>
                    <Box sx={{ mt: 'max(6px, 4cqi)', maxWidth: '100%' }}>
                        {this.renderDateBadge('max(0.6rem, 6.5cqi)')}
                    </Box>
                </Box>
            </Box>
        );
    }

    private renderDigitalWide(): React.JSX.Element {
        const { time, seconds } = this.state;
        const date = this.displayDate;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);

        return (
            <Box
                id={String(this.props.widget.id)}
                className="widget-clock"
                sx={theme => WidgetGeneric.getStyleWide(theme)}
            >
                <Box
                    sx={theme => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        width: '100%',
                        height: 80,
                        overflow: 'hidden',
                        ...this.applyTileStyles(theme, false, { interactive: false }),
                    })}
                >
                    {indicators}
                    <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'baseline' }}>
                        <Typography
                            sx={{
                                fontWeight: 700,
                                lineHeight: 1,
                                fontSize: '2.5rem',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {time}
                        </Typography>
                        {this.showSeconds ? (
                            <Typography
                                component="span"
                                variant="caption"
                                sx={theme => ({
                                    color: theme.palette.text.disabled,
                                    fontSize: '1rem',
                                    fontVariantNumeric: 'tabular-nums',
                                    ml: 0.5,
                                })}
                            >
                                :{seconds}
                            </Typography>
                        ) : null}
                    </Box>
                    <Box
                        sx={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', pr: 1 }}
                    >
                        {date ? (
                            <Typography
                                variant="body2"
                                sx={theme => ({
                                    color: theme.palette.text.secondary,
                                    whiteSpace: 'nowrap',
                                })}
                            >
                                {date}
                            </Typography>
                        ) : null}
                        {this.renderSunInfo('0.7rem')}
                    </Box>
                </Box>
            </Box>
        );
    }

    private renderDigitalWideTall(): React.JSX.Element {
        const { time, seconds } = this.state;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        const pill = this.renderDayPill('max(0.7rem, 3.4cqi)');
        const date = this.renderBigDate('max(1rem, 6.5cqi)');
        const sun = this.renderSunColumns({
            glyph: 'max(1.15rem, 5.4cqi)',
            time: 'max(0.85rem, 4.4cqi)',
            label: 'max(0.6rem, 2.4cqi)',
        });
        // With nothing on the right the clock keeps the whole tile and can be set much larger
        const hasInfo = !!(pill || date || sun);

        return (
            <Box
                id={String(this.props.widget.id)}
                className="widget-clock"
                sx={theme => WidgetGeneric.getStyleWideTall(theme)}
            >
                <Box sx={{ width: 'calc(50% - 6px)', aspectRatio: '1' }} />
                <Box
                    sx={theme => ({
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'max(10px, 3.5cqi)',
                        overflow: 'hidden',
                        ...this.applyTileStyles(theme, false, { interactive: false }),
                        padding: 'max(10px, 3.5cqi)',
                    })}
                >
                    {indicators}
                    {/* Left: time */}
                    <Box
                        sx={{
                            flex: hasInfo ? '0 1 auto' : 1,
                            minWidth: 0,
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'center',
                        }}
                    >
                        <Typography
                            sx={{
                                fontWeight: 700,
                                lineHeight: 1,
                                letterSpacing: '-0.02em',
                                fontSize: hasInfo ? 'max(1.6rem, 9.5cqi)' : 'max(2.5rem, 14cqi)',
                                whiteSpace: 'nowrap',
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            {time}
                        </Typography>
                        {this.showSeconds ? (
                            <Typography
                                component="span"
                                variant="caption"
                                sx={theme => ({
                                    color: theme.palette.text.disabled,
                                    fontSize: hasInfo ? 'max(0.7rem, 3.6cqi)' : 'max(1rem, 5cqi)',
                                    fontVariantNumeric: 'tabular-nums',
                                    ml: 0.5,
                                })}
                            >
                                :{seconds}
                            </Typography>
                        ) : null}
                    </Box>
                    {/* Right: weekday pill, date, sun times */}
                    {hasInfo ? (
                        <Box
                            sx={{
                                flex: 1,
                                minWidth: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                gap: 'max(4px, 1.4cqi)',
                            }}
                        >
                            {pill}
                            {date}
                            {sun ? (
                                <>
                                    <Box sx={{ py: 'max(2px, 0.8cqi)' }}>{this.renderAccentDivider()}</Box>
                                    {sun}
                                </>
                            ) : null}
                        </Box>
                    ) : null}
                </Box>
            </Box>
        );
    }

    // --- Analog renders ---

    private renderAnalogCompact(): React.JSX.Element {
        const date = this.displayDate;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);

        return (
            <Box
                id={String(this.props.widget.id)}
                className="widget-clock"
                sx={theme => WidgetGeneric.getStyleCompact(theme)}
            >
                <Box
                    sx={theme => ({
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%',
                        aspectRatio: '1',
                        overflow: 'hidden',
                        ...this.applyTileStyles(theme, false, { interactive: false }),
                        padding: 'max(8px, 5cqi)',
                    })}
                >
                    {indicators}
                    {this.renderFaceBox('80cqi', { flex: 1, display: 'flex', alignItems: 'center' })}
                    {date ? (
                        <Typography
                            variant="caption"
                            sx={theme => ({
                                color: theme.palette.text.secondary,
                                fontSize: 'max(0.6rem, 6cqi)',
                                whiteSpace: 'nowrap',
                                lineHeight: 1,
                            })}
                        >
                            {date}
                        </Typography>
                    ) : null}
                </Box>
            </Box>
        );
    }

    private renderAnalogWide(): React.JSX.Element {
        const { time, seconds } = this.state;
        const date = this.displayDate;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);

        return (
            <Box
                id={String(this.props.widget.id)}
                className="widget-clock"
                sx={theme => WidgetGeneric.getStyleWide(theme)}
            >
                <Box
                    sx={theme => ({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                        width: '100%',
                        height: 80,
                        overflow: 'hidden',
                        ...this.applyTileStyles(theme, false, { interactive: false }),
                    })}
                >
                    {indicators}
                    {this.renderFaceBox(56, { flexShrink: 0, display: 'flex', alignItems: 'center' })}
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            sx={{
                                fontWeight: 700,
                                lineHeight: 1,
                                fontSize: '1.25rem',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {time}
                            {this.showSeconds ? (
                                <Typography
                                    component="span"
                                    variant="caption"
                                    sx={theme => ({
                                        color: theme.palette.text.disabled,
                                        fontSize: '0.75rem',
                                        fontVariantNumeric: 'tabular-nums',
                                        ml: 0.5,
                                    })}
                                >
                                    :{seconds}
                                </Typography>
                            ) : null}
                        </Typography>
                        {date ? (
                            <Typography
                                variant="caption"
                                sx={theme => ({
                                    color: theme.palette.text.secondary,
                                    whiteSpace: 'nowrap',
                                })}
                            >
                                {date}
                            </Typography>
                        ) : null}
                    </Box>
                    <Box
                        sx={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', pr: 1 }}
                    >
                        {this.renderSunInfo('0.7rem')}
                    </Box>
                </Box>
            </Box>
        );
    }

    private renderAnalogWideTall(): React.JSX.Element {
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        const sun = this.renderSunColumns({
            glyph: 'max(1.15rem, 5.4cqi)',
            time: 'max(0.85rem, 4.4cqi)',
            label: 'max(0.6rem, 2.4cqi)',
        });

        return (
            <Box
                id={String(this.props.widget.id)}
                className="widget-clock"
                sx={theme => WidgetGeneric.getStyleWideTall(theme)}
            >
                <Box sx={{ width: 'calc(50% - 6px)', aspectRatio: '1' }} />
                <Box
                    sx={theme => ({
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'max(10px, 3.5cqi)',
                        overflow: 'hidden',
                        ...this.applyTileStyles(theme, false, { interactive: false }),
                        padding: 'max(10px, 3.5cqi)',
                    })}
                >
                    {indicators}
                    {/* Left: analog face */}
                    {this.renderFaceBox(null, {
                        flexShrink: 0,
                        height: '94%',
                        aspectRatio: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        '& > svg': { width: '100%', height: '100%' },
                    })}
                    {/* Right: weekday pill, date, sun times */}
                    <Box
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            gap: 'max(4px, 1.4cqi)',
                        }}
                    >
                        {this.renderDayPill('max(0.7rem, 3.4cqi)')}
                        {this.renderBigDate('max(1.1rem, 7.5cqi)')}
                        {sun ? (
                            <>
                                <Box sx={{ py: 'max(2px, 0.8cqi)' }}>{this.renderAccentDivider()}</Box>
                                {sun}
                            </>
                        ) : null}
                    </Box>
                </Box>
            </Box>
        );
    }
}

export default WidgetClock;
