import React from 'react';
import { Box, Typography } from '@mui/material';
import { DirectionsRun, LightMode } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';
import moment from 'moment';
import 'moment/locale/de';
import 'moment/locale/ru';
import 'moment/locale/pt';
import 'moment/locale/nl';
import 'moment/locale/fr';
import 'moment/locale/it';
import 'moment/locale/es';
import 'moment/locale/pl';
import 'moment/locale/uk';
import 'moment/locale/zh-cn';

import WidgetGeneric, { type WidgetGenericProps, type WidgetGenericState } from './Generic';

interface WidgetMotionState extends WidgetGenericState {
    motion: boolean;
    brightness: number | null;
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

        moment.locale(props.language);

        this.state = {
            ...this.state,
            motion: false,
            brightness: null,
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
        }
        // Update relative time every 30 seconds
        this.agoTimer = setInterval(() => this.updateAgo(), 30_000);
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

    private updateAgo(): void {
        const { lastMotion } = this.state;
        if (lastMotion) {
            const ago = moment(lastMotion).fromNow();
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
            this.setState({ motion, lastMotion: lc, lastMotionAgo: moment(lc).fromNow() });
        } else if (!motion && motion !== this.state.motion) {
            // Motion cleared — keep lastMotion, but if we never had one use lc
            const lastMotion = this.state.lastMotion || lc;
            this.setState({ motion, lastMotion, lastMotionAgo: moment(lastMotion).fromNow() });
        } else if (!motion && !this.state.lastMotion && lc) {
            // Initial load with motion=false — use lc as approximation
            this.setState({ lastMotion: lc, lastMotionAgo: moment(lc).fromNow() });
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
                            {Math.round(brightness)} lux
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
                            {Math.round(brightness)} lux
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
