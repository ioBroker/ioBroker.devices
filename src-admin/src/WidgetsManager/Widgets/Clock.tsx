import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { WbSunny, NightsStay } from '@mui/icons-material';
// @ts-expect-error no types
import { getTimes } from 'suncalc2';

import type { ConfigItemPanel } from '@iobroker/json-config';

import WidgetGeneric, { type WidgetGenericState, type WidgetGenericProps, getTileStyles } from './Generic';
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

    private renderAnalogFace(
        size: number | null,
        accentColor: string,
        textColor: string,
        dimColor: string,
    ): React.JSX.Element {
        const { hours, minutes, secs } = this.state;
        const cx = 50;
        const cy = 50;

        // Angles in degrees (0° = 12 o'clock, clockwise)
        const secAngle = secs * 6;
        const minAngle = minutes * 6 + secs * 0.1;
        const hourAngle = (hours % 12) * 30 + minutes * 0.5;

        // Hand endpoints from center
        const hand = (angle: number, length: number): { x: number; y: number } => {
            const rad = ((angle - 90) * Math.PI) / 180;
            return { x: cx + Math.cos(rad) * length, y: cy + Math.sin(rad) * length };
        };

        const hourEnd = hand(hourAngle, 22);
        const minEnd = hand(minAngle, 32);
        const secEnd = hand(secAngle, 36);

        // Hour markers
        const markers: React.JSX.Element[] = [];
        for (let i = 0; i < 12; i++) {
            const angle = i * 30;
            const outer = hand(angle, 46);
            const inner = hand(angle, i % 3 === 0 ? 40 : 42);
            markers.push(
                <line
                    key={i}
                    x1={inner.x}
                    y1={inner.y}
                    x2={outer.x}
                    y2={outer.y}
                    stroke={dimColor}
                    strokeWidth={i % 3 === 0 ? 2 : 1}
                    strokeLinecap="round"
                />,
            );
        }

        return (
            <svg
                viewBox="0 0 100 100"
                style={{ ...(size ? { width: size, height: size } : {}), display: 'block' }}
            >
                {/* Face circle */}
                <circle
                    cx={cx}
                    cy={cy}
                    r={48}
                    fill="none"
                    stroke={dimColor}
                    strokeWidth={1.5}
                    opacity={0.3}
                />
                {/* Hour markers */}
                {markers}
                {/* Hour hand */}
                <line
                    x1={cx}
                    y1={cy}
                    x2={hourEnd.x}
                    y2={hourEnd.y}
                    stroke={textColor}
                    strokeWidth={3.5}
                    strokeLinecap="round"
                />
                {/* Minute hand */}
                <line
                    x1={cx}
                    y1={cy}
                    x2={minEnd.x}
                    y2={minEnd.y}
                    stroke={textColor}
                    strokeWidth={2}
                    strokeLinecap="round"
                />
                {/* Second hand */}
                {this.showSeconds ? (
                    <line
                        x1={cx}
                        y1={cy}
                        x2={secEnd.x}
                        y2={secEnd.y}
                        stroke={accentColor}
                        strokeWidth={1}
                        strokeLinecap="round"
                    />
                ) : null}
                {/* Center dot */}
                <circle
                    cx={cx}
                    cy={cy}
                    r={2.5}
                    fill={accentColor}
                />
            </svg>
        );
    }

    private renderSunInfo(fontSize?: string): React.JSX.Element | null {
        if (this.props.settings.showSun === false) {
            return null;
        }
        const { sunrise, sunset } = this.state;
        if (!sunrise || !sunset) {
            return null;
        }
        return (
            <Box
                sx={theme => ({
                    display: 'flex',
                    gap: 2,
                    mt: 0.5,
                    alignItems: 'center',
                    color: theme.palette.text.disabled,
                    fontSize: fontSize || 'max(0.7rem, 3.5cqi)',
                })}
            >
                <Tooltip
                    title={SUN_LABELS[this.props.stateContext.language]?.rise || 'Sunrise'}
                    arrow
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <WbSunny sx={{ fontSize: '1.1em', color: '#ffa726' }} />
                        <span>{sunrise}</span>
                    </Box>
                </Tooltip>
                <Tooltip
                    title={SUN_LABELS[this.props.stateContext.language]?.set || 'Sunset'}
                    arrow
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <NightsStay sx={{ fontSize: '1.1em', color: '#5c6bc0' }} />
                        <span>{sunset}</span>
                    </Box>
                </Tooltip>
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
        const { time, seconds } = this.state;
        const accent = this.props.settings.color;
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
                    })}
                >
                    {indicators}
                    <Typography
                        sx={{
                            fontWeight: 700,
                            lineHeight: 1,
                            fontSize: 'max(1.5rem, 16cqi)',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {time}
                    </Typography>
                    {this.showSeconds ? (
                        <Typography
                            variant="caption"
                            sx={theme => ({
                                color: theme.palette.text.disabled,
                                fontSize: 'max(0.65rem, 7cqi)',
                                fontVariantNumeric: 'tabular-nums',
                            })}
                        >
                            :{seconds}
                        </Typography>
                    ) : null}
                    {date ? (
                        <Typography
                            variant="caption"
                            sx={theme => ({
                                color: theme.palette.text.secondary,
                                mt: 0.5,
                                fontSize: 'max(0.7rem, 7cqi)',
                                whiteSpace: 'nowrap',
                            })}
                        >
                            {date}
                        </Typography>
                    ) : null}
                </Box>
            </Box>
        );
    }

    private renderDigitalWide(): React.JSX.Element {
        const { time, seconds } = this.state;
        const accent = this.props.settings.color;
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
        const accent = this.props.settings.color;
        const date = this.displayDate;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);

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
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        ...this.applyTileStyles(theme, false, { interactive: false }),
                    })}
                >
                    {indicators}
                    {/* Time row */}
                    <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                        <Typography
                            sx={{
                                fontWeight: 700,
                                lineHeight: 1,
                                fontSize: 'max(2.5rem, 14cqi)',
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
                                    fontSize: 'max(1rem, 5cqi)',
                                    fontVariantNumeric: 'tabular-nums',
                                    ml: 0.5,
                                })}
                            >
                                :{seconds}
                            </Typography>
                        ) : null}
                    </Box>
                    {/* Date + sun info below */}
                    {date ? (
                        <Typography
                            variant="body2"
                            sx={theme => ({
                                color: theme.palette.text.secondary,
                                fontSize: 'max(0.9rem, 5cqi)',
                                whiteSpace: 'nowrap',
                                mt: 0.5,
                            })}
                        >
                            {date}
                        </Typography>
                    ) : null}
                    {this.renderSunInfo('max(0.75rem, 4cqi)')}
                </Box>
            </Box>
        );
    }

    // --- Analog renders ---

    private renderAnalogCompact(): React.JSX.Element {
        const accent = this.props.settings.color;
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
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                        {this.renderAnalogFace(
                            '80cqi' as unknown as number,
                            accent || 'var(--mui-palette-primary-main, #1976d2)',
                            'currentColor',
                            'currentColor',
                        )}
                    </Box>
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
        const accent = this.props.settings.color;
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
                    <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                        {this.renderAnalogFace(
                            56,
                            accent || 'var(--mui-palette-primary-main, #1976d2)',
                            'currentColor',
                            'currentColor',
                        )}
                    </Box>
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
        const accent = this.props.settings.color;
        const date = this.displayDate;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);

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
                        gap: 'max(8px, 3cqi)',
                        overflow: 'hidden',
                        ...this.applyTileStyles(theme, false, { interactive: false }),
                        padding: 'max(8px, 3cqi)',
                    })}
                >
                    {indicators}
                    {/* Left: analog face */}
                    <Box
                        sx={{
                            flexShrink: 0,
                            height: '80%',
                            aspectRatio: '1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            '& > svg': { width: '100%', height: '100%' },
                        }}
                    >
                        {this.renderAnalogFace(
                            null,
                            accent || 'var(--mui-palette-primary-main, #1976d2)',
                            'currentColor',
                            'currentColor',
                        )}
                    </Box>
                    {/* Right: date + sun */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        {date ? (
                            <Typography
                                variant="body1"
                                sx={theme => ({
                                    color: theme.palette.text.secondary,
                                    fontSize: 'max(1rem, 6cqi)',
                                    whiteSpace: 'nowrap',
                                    lineHeight: 1.4,
                                })}
                            >
                                {date}
                            </Typography>
                        ) : null}
                        {this.renderSunInfo('max(0.85rem, 4.5cqi)')}
                    </Box>
                </Box>
            </Box>
        );
    }
}

export default WidgetClock;
