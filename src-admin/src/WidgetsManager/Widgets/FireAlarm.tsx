import React from 'react';
import { Box, Typography } from '@mui/material';
import { LocalFireDepartment } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';
import moment from 'moment/min/moment-with-locales';

import WidgetGeneric, { type WidgetGenericProps, type WidgetGenericState } from './Generic';

const FIRE_COLOR = '#e65100';

interface WidgetFireAlarmState extends WidgetGenericState {
    alarm: boolean;
    lastChanged: number | null;
    lastChangedAgo: string;
}

export class WidgetFireAlarm extends WidgetGeneric<WidgetFireAlarmState> {
    private readonly actualId: string | null;
    private agoTimer: ReturnType<typeof setInterval> | null = null;

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;
        const actual = states.find(s => s.name === 'ACTUAL');

        this.actualId = actual?.id ?? null;

        this.state = {
            ...this.state,
            alarm: false,
            lastChanged: null,
            lastChangedAgo: '',
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onStateChange);
        }
        this.agoTimer = setInterval(() => this.updateAgo(), 30_000);
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onStateChange);
        }
        if (this.agoTimer) {
            clearInterval(this.agoTimer);
            this.agoTimer = null;
        }
    }

    private fromNow(ts: number): string {
        return moment(ts).locale(this.props.language).fromNow();
    }

    private updateAgo(): void {
        const { lastChanged } = this.state;
        if (lastChanged) {
            const ago = this.fromNow(lastChanged);
            if (ago !== this.state.lastChangedAgo) {
                this.setState({ lastChangedAgo: ago });
            }
        }
    }

    onStateChange = (_id: string, state: ioBroker.State): void => {
        const alarm = !!state.val;
        const lc = state.lc || state.ts || Date.now();
        if (alarm !== this.state.alarm) {
            this.setState({ alarm, lastChanged: lc, lastChangedAgo: this.fromNow(lc) });
        } else if (!this.state.lastChanged && lc) {
            this.setState({ lastChanged: lc, lastChangedAgo: this.fromNow(lc) });
        }
    };

    protected getAccentColor(): string | undefined {
        if (this.state.alarm) {
            return super.getAccentColor() || FIRE_COLOR;
        }
        return super.getAccentColor();
    }

    protected isTileActive(): boolean {
        return this.state.alarm;
    }

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = super.renderTileIcon();
        if (baseIcon) {
            return baseIcon;
        }

        const { alarm } = this.state;

        const accent = this.getAccentColor();

        return (
            <LocalFireDepartment
                sx={{
                    fontSize: 48,
                    color: alarm ? accent || FIRE_COLOR : 'text.disabled',
                    transition: 'color 0.25s ease',
                }}
            />
        );
    }

    protected renderTileStatus(): React.JSX.Element | null {
        const size = this.props.settings?.size || this.props.size || '1x1';
        if (size === '2x0.5') {
            return null;
        }

        const { alarm, lastChangedAgo } = this.state;
        const accent = this.getAccentColor();

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 600,
                        color: alarm ? accent || FIRE_COLOR : 'success.main',
                        transition: 'color 0.25s ease',
                    }}
                >
                    {alarm ? I18n.t('wm_Fire') : I18n.t('wm_OK')}
                </Typography>
                {size !== '2x1' && lastChangedAgo ? (
                    <Typography
                        variant="caption"
                        sx={{ fontSize: '0.65rem', color: 'text.disabled', lineHeight: 1.2 }}
                    >
                        {lastChangedAgo}
                    </Typography>
                ) : null}
            </Box>
        );
    }

    protected renderTileAction(): React.JSX.Element {
        const { alarm, lastChangedAgo } = this.state;
        const accent = this.getAccentColor();

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        color: alarm ? accent || FIRE_COLOR : 'success.main',
                    }}
                >
                    {alarm ? I18n.t('wm_Fire') : I18n.t('wm_OK')}
                </Typography>
                {lastChangedAgo ? (
                    <Typography
                        variant="caption"
                        sx={{ color: 'text.disabled', whiteSpace: 'nowrap' }}
                    >
                        {lastChangedAgo}
                    </Typography>
                ) : null}
            </Box>
        );
    }

    render(): React.JSX.Element {
        if (this.props.settings?.hideWhenOk && !this.state.alarm) {
            if (!this.props.onOpenSettings) {
                return <React.Fragment />;
            }
            return <Box sx={{ opacity: 0.5 }}>{super.render()}</Box>;
        }
        return super.render();
    }
}

export default WidgetFireAlarm;
