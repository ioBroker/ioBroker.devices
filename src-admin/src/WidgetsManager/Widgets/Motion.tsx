import React from 'react';
import { Box, Typography } from '@mui/material';
import { DirectionsRun, LightMode } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';
import moment from 'moment/min/moment-with-locales';

import WidgetGeneric, { type WidgetGenericProps, type WidgetGenericState } from './Generic';

interface WidgetMotionState extends WidgetGenericState {
    motion: boolean;
    brightness: number | null;
    brightnessUnit: string;
    brightnessMin: number | null;
    brightnessMax: number | null;
    lastMotion: number | null;
    lastMotionAgo: string;
}

export class WidgetMotion extends WidgetGeneric<WidgetMotionState> {
    private readonly actualId: string | null;
    private readonly brightnessId: string | null;
    private agoTimer: ReturnType<typeof setInterval> | null = null;

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;
        const actual = states.find(s => s.name === 'ACTUAL');
        const second = states.find(s => s.name === 'SECOND');

        this.actualId = actual?.id ?? null;
        this.brightnessId = second?.id ?? null;

        this.state = {
            ...this.state,
            motion: false,
            brightness: null,
            brightnessUnit: '',
            brightnessMin: null,
            brightnessMax: null,
            lastMotion: null,
            lastMotionAgo: '',
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onMotionChange);
        }
        if (this.brightnessId) {
            this.props.stateContext.getState(this.brightnessId, this.onBrightnessChange);
            void this.loadBrightnessObject();
        }
        // Update relative time every 30 seconds
        this.agoTimer = setInterval(() => this.updateAgo(), 30_000);
    }

    private async loadBrightnessObject(): Promise<void> {
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(this.brightnessId!)) as
                | ioBroker.StateObject
                | null
                | undefined;
            if (obj?.common) {
                const unit = (obj.common.unit || '').trim().toLowerCase();
                const max = obj.common.max != null ? Number(obj.common.max) : null;
                const min = obj.common.min != null ? Number(obj.common.min) : null;
                this.setState({
                    brightnessUnit: unit,
                    brightnessMax: max != null && !isNaN(max) ? max : null,
                    brightnessMin: min != null && !isNaN(min) ? min : null,
                });
            }
        } catch {
            // ignore
        }
    }

    private formatBrightness(value: number): string {
        const { brightnessUnit, brightnessMin, brightnessMax } = this.state;
        if (brightnessUnit === 'lux') {
            return `${Math.round(value)} lux`;
        }
        if (brightnessUnit === '%') {
            return `${Math.round(value)}%`;
        }
        if (brightnessMax != null) {
            const min = brightnessMin || 0;
            const range = brightnessMax - min;
            return range > 0 ? `${Math.round(((value - min) / range) * 100)}%` : '0%';
        }
        return `${Math.round(value)}`;
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onMotionChange);
        }
        if (this.brightnessId) {
            this.props.stateContext.removeState(this.brightnessId, this.onBrightnessChange);
        }
        if (this.agoTimer) {
            clearInterval(this.agoTimer);
            this.agoTimer = null;
        }
    }

    private fromNow(ts: number): string {
        console.log(this.props.language);
        return moment(ts).locale(this.props.language).fromNow();
    }

    private updateAgo(): void {
        const { lastMotion } = this.state;
        if (lastMotion) {
            const ago = this.fromNow(lastMotion);
            if (ago !== this.state.lastMotionAgo) {
                this.setState({ lastMotionAgo: ago });
            }
        }
    }

    onMotionChange = (_id: string, state: ioBroker.State): void => {
        const motion = !!state.val;
        const lc = state.lc || state.ts || Date.now();
        if (motion && motion !== this.state.motion) {
            // Motion just started — record when it was detected
            this.setState({ motion, lastMotion: lc, lastMotionAgo: this.fromNow(lc) });
        } else if (!motion && motion !== this.state.motion) {
            // Motion cleared — keep lastMotion, but if we never had one use lc
            const lastMotion = this.state.lastMotion || lc;
            this.setState({ motion, lastMotion, lastMotionAgo: this.fromNow(lastMotion) });
        } else if (!motion && !this.state.lastMotion && lc) {
            // Initial load with motion=false — use lc as approximation
            this.setState({ lastMotion: lc, lastMotionAgo: this.fromNow(lc) });
        }
    };

    onBrightnessChange = (_id: string, state: ioBroker.State): void => {
        const val = state.val != null ? Number(state.val) : null;
        const brightness = val != null && !isNaN(val) ? val : null;
        if (brightness !== this.state.brightness) {
            this.setState({ brightness });
        }
    };

    protected getHistoryIds(): { id: string; color: string }[] {
        const ids: { id: string; color: string }[] = [];
        if (this.brightnessId) {
            ids.push({ id: this.brightnessId, color: '#ffc107' });
        }
        return ids;
    }

    protected isTileActive(): boolean {
        return this.state.motion;
    }

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = super.renderTileIcon();
        if (baseIcon) {
            return baseIcon;
        }

        const { motion } = this.state;
        const accent = this.getAccentColor();

        return (
            <DirectionsRun
                sx={theme => ({
                    fontSize: 32,
                    color: motion ? accent || theme.palette.primary.main : theme.palette.text.disabled,
                    transition: 'color 0.25s ease',
                })}
            />
        );
    }

    protected renderTileStatus(): React.JSX.Element | null {
        const size = this.props.settings?.size || this.props.size || '1x1';
        if (size === '2x1') {
            return null;
        }

        const { motion, brightness, lastMotionAgo } = this.state;
        const accent = this.getAccentColor();

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography
                        variant="caption"
                        sx={theme => ({
                            fontWeight: 600,
                            color: motion ? accent || theme.palette.primary.main : theme.palette.text.secondary,
                            transition: 'color 0.25s ease',
                        })}
                    >
                        {motion ? I18n.t('wm_Motion') : I18n.t('wm_Clear')}
                    </Typography>
                    {brightness != null ? (
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 500,
                                color: 'text.secondary',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                            }}
                        >
                            <LightMode sx={{ fontSize: 12 }} />
                            {this.formatBrightness(brightness)}
                        </Typography>
                    ) : null}
                </Box>
                {!motion && lastMotionAgo ? (
                    <Typography
                        variant="caption"
                        sx={{ fontSize: '0.65rem', color: 'text.disabled', lineHeight: 1.2 }}
                    >
                        {lastMotionAgo}
                    </Typography>
                ) : null}
            </Box>
        );
    }

    protected renderTileAction(): React.JSX.Element {
        const { motion, brightness, lastMotionAgo } = this.state;
        const accent = this.getAccentColor();

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
                    <Typography
                        variant="h6"
                        sx={theme => ({
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            color: motion ? accent || theme.palette.primary.main : theme.palette.text.secondary,
                        })}
                    >
                        {motion ? I18n.t('wm_Motion') : I18n.t('wm_Clear')}
                    </Typography>
                    {brightness != null ? (
                        <Typography
                            variant="body2"
                            sx={{
                                color: 'text.secondary',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <LightMode sx={{ fontSize: 14 }} />
                            {this.formatBrightness(brightness)}
                        </Typography>
                    ) : null}
                </Box>
                {!motion && lastMotionAgo ? (
                    <Typography
                        variant="caption"
                        sx={{ color: 'text.disabled', whiteSpace: 'nowrap' }}
                    >
                        {lastMotionAgo}
                    </Typography>
                ) : null}
            </Box>
        );
    }
}

export default WidgetMotion;
