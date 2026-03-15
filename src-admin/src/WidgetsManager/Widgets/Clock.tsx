import React, { Component } from 'react';
import { Box, Typography } from '@mui/material';
import { Settings } from '@mui/icons-material';

import { getTileStyles } from './Generic';

interface WidgetClockProps {
    id: string;
    language: ioBroker.Languages;
    size?: '1x1' | '2x0.5' | '2x1';
    color?: string;
    style?: 'digital' | 'analog';
    /** Show date (day + month). Default: true */
    showDate?: boolean;
    /** Show day of week. Default: true */
    showDow?: boolean;
    /** Show seconds. Default: true */
    showSeconds?: boolean;
    onOpenSettings?: (id: string) => void;
    onRemove?: (id: string) => void;
}

interface WidgetClockState {
    time: string;
    dow: string;
    dateStr: string;
    seconds: string;
    hours: number;
    minutes: number;
    secs: number;
}

export class WidgetClock extends Component<WidgetClockProps, WidgetClockState> {
    private timer: ReturnType<typeof setInterval> | null = null;

    constructor(props: WidgetClockProps) {
        super(props);
        this.state = this.getCurrentTime();
    }

    componentDidMount(): void {
        this.timer = setInterval(() => {
            this.setState(this.getCurrentTime());
        }, 1000);
    }

    componentWillUnmount(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    private getCurrentTime(): WidgetClockState {
        const now = new Date();
        const lang = this.props.language;
        return {
            time: now.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }),
            dow: now.toLocaleDateString(lang, { weekday: 'short' }),
            dateStr: now.toLocaleDateString(lang, { day: 'numeric', month: 'short' }),
            seconds: now.getSeconds().toString().padStart(2, '0'),
            hours: now.getHours(),
            minutes: now.getMinutes(),
            secs: now.getSeconds(),
        };
    }

    /** Build the display date string from dow + dateStr based on show* props */
    private get displayDate(): string {
        const showDate = this.props.showDate !== false;
        const showDow = this.props.showDow !== false;
        if (showDow && showDate) {
            return `${this.state.dow}, ${this.state.dateStr}`;
        }
        if (showDow) {
            return this.state.dow;
        }
        if (showDate) {
            return this.state.dateStr;
        }
        return '';
    }

    private get showSeconds(): boolean {
        return this.props.showSeconds !== false;
    }

    private get isAnalog(): boolean {
        return this.props.style === 'analog';
    }

    private renderSettingsButton(): React.JSX.Element | null {
        if (!this.props.onOpenSettings) {
            return null;
        }
        return (
            <Box
                component="span"
                role="button"
                tabIndex={0}
                onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    this.props.onOpenSettings!(this.props.id);
                }}
                onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        this.props.onOpenSettings!(this.props.id);
                    }
                }}
                sx={theme => ({
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    p: '3px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 1,
                    color: theme.palette.primary.main,
                    opacity: 0.6,
                    transition: 'opacity 0.2s, background-color 0.2s',
                    '&:hover': {
                        opacity: 1,
                        backgroundColor: theme.palette.action.hover,
                    },
                })}
            >
                <Settings sx={{ fontSize: 16 }} />
            </Box>
        );
    }

    // --- Analog clock face SVG ---

    private renderAnalogFace(
        size: number,
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
                style={{ width: size, height: size, display: 'block' }}
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
                <line
                    x1={cx}
                    y1={cy}
                    x2={secEnd.x}
                    y2={secEnd.y}
                    stroke={accentColor}
                    strokeWidth={1}
                    strokeLinecap="round"
                />
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

    // --- Digital renders (existing) ---

    private renderDigitalCompact(): React.JSX.Element {
        const { time, seconds } = this.state;
        const accent = this.props.color;
        const date = this.displayDate;

        return (
            <Box
                id={this.props.id}
                sx={{ position: 'relative', containerType: 'inline-size', overflow: 'hidden' }}
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
                        ...getTileStyles(theme, false, accent),
                    })}
                >
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
                {this.renderSettingsButton()}
            </Box>
        );
    }

    private renderDigitalWide(): React.JSX.Element {
        const { time, seconds } = this.state;
        const accent = this.props.color;
        const date = this.displayDate;

        return (
            <Box
                id={this.props.id}
                sx={{ position: 'relative', gridColumn: 'span 2' }}
            >
                <Box
                    sx={theme => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        width: '100%',
                        height: 80,
                        overflow: 'hidden',
                        ...getTileStyles(theme, false, accent),
                    })}
                >
                    <Typography
                        sx={{
                            fontWeight: 700,
                            lineHeight: 1,
                            fontSize: '1.5rem',
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
                                fontSize: '0.85rem',
                                fontVariantNumeric: 'tabular-nums',
                            })}
                        >
                            :{seconds}
                        </Typography>
                    ) : null}
                    <Box sx={{ flex: 1 }} />
                    {date ? (
                        <Typography
                            variant="body2"
                            sx={theme => ({
                                color: theme.palette.text.secondary,
                                whiteSpace: 'nowrap',
                                pr: 1,
                            })}
                        >
                            {date}
                        </Typography>
                    ) : null}
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    private renderDigitalWideTall(): React.JSX.Element {
        const { time, seconds } = this.state;
        const accent = this.props.color;
        const date = this.displayDate;

        return (
            <Box
                id={this.props.id}
                sx={{ position: 'relative', gridColumn: 'span 2', containerType: 'inline-size', overflow: 'hidden' }}
            >
                <Box sx={{ width: 'calc(50% - 6px)', aspectRatio: '1' }} />
                <Box
                    sx={theme => ({
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        overflow: 'hidden',
                        ...getTileStyles(theme, false, accent),
                    })}
                >
                    <Typography
                        sx={{
                            fontWeight: 700,
                            lineHeight: 1,
                            fontSize: 'max(2rem, 12cqi)',
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
                                fontSize: 'max(0.85rem, 5cqi)',
                                fontVariantNumeric: 'tabular-nums',
                            })}
                        >
                            :{seconds}
                        </Typography>
                    ) : null}
                    {date ? (
                        <Typography
                            variant="body2"
                            sx={theme => ({
                                color: theme.palette.text.secondary,
                                mt: 0.5,
                                fontSize: 'max(0.85rem, 5cqi)',
                                whiteSpace: 'nowrap',
                            })}
                        >
                            {date}
                        </Typography>
                    ) : null}
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    // --- Analog renders ---

    private renderAnalogCompact(): React.JSX.Element {
        const accent = this.props.color;
        const date = this.displayDate;

        return (
            <Box
                id={this.props.id}
                sx={{ position: 'relative', containerType: 'inline-size', overflow: 'hidden' }}
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
                        ...getTileStyles(theme, false, accent),
                        padding: 'max(8px, 5cqi)',
                    })}
                >
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
                {this.renderSettingsButton()}
            </Box>
        );
    }

    private renderAnalogWide(): React.JSX.Element {
        const { time, seconds } = this.state;
        const accent = this.props.color;
        const date = this.displayDate;

        return (
            <Box
                id={this.props.id}
                sx={{ position: 'relative', gridColumn: 'span 2' }}
            >
                <Box
                    sx={theme => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        width: '100%',
                        height: 80,
                        overflow: 'hidden',
                        ...getTileStyles(theme, false, accent),
                    })}
                >
                    <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                        {this.renderAnalogFace(
                            56,
                            accent || 'var(--mui-palette-primary-main, #1976d2)',
                            'currentColor',
                            'currentColor',
                        )}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
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
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    private renderAnalogWideTall(): React.JSX.Element {
        const accent = this.props.color;
        const date = this.displayDate;

        return (
            <Box
                id={this.props.id}
                sx={{ position: 'relative', gridColumn: 'span 2', containerType: 'inline-size', overflow: 'hidden' }}
            >
                <Box sx={{ width: 'calc(50% - 6px)', aspectRatio: '1' }} />
                <Box
                    sx={theme => ({
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        overflow: 'hidden',
                        ...getTileStyles(theme, false, accent),
                        padding: 'max(8px, 3cqi)',
                    })}
                >
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                        {this.renderAnalogFace(
                            '60cqi' as unknown as number,
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
                                fontSize: 'max(0.75rem, 4cqi)',
                                whiteSpace: 'nowrap',
                                lineHeight: 1,
                            })}
                        >
                            {date}
                        </Typography>
                    ) : null}
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    // --- Main render ---

    render(): React.JSX.Element {
        const size = this.props.size || '1x1';
        if (this.isAnalog) {
            if (size === '2x0.5') {
                return this.renderAnalogWide();
            }
            if (size === '2x1') {
                return this.renderAnalogWideTall();
            }
            return this.renderAnalogCompact();
        }
        if (size === '2x0.5') {
            return this.renderDigitalWide();
        }
        if (size === '2x1') {
            return this.renderDigitalWideTall();
        }
        return this.renderDigitalCompact();
    }
}

export default WidgetClock;
