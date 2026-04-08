import React from 'react';
import { Box, Typography } from '@mui/material';
import { Water } from '@mui/icons-material';
import { I18n, Icon } from '@iobroker/adapter-react-v5';
import moment from 'moment/min/moment-with-locales';

import WidgetGeneric, { type GenericWidgetSettings, type WidgetGenericProps, type WidgetGenericState } from './Generic';

/** Settings for alarm/sensor widgets */
interface AlarmWidgetSettings extends GenericWidgetSettings {
    hideWhenOk?: boolean;
}

const FLOOD_COLOR = '#00838f';

interface WidgetFloodAlarmState extends WidgetGenericState {
    alarm: boolean;
    lastChanged: number | null;
    lastChangedAgo: string;
}

export class WidgetFloodAlarm extends WidgetGeneric<WidgetFloodAlarmState, AlarmWidgetSettings> {
    private readonly actualId: string | null;
    private agoTimer: ReturnType<typeof setInterval> | null = null;

    constructor(props: WidgetGenericProps<AlarmWidgetSettings>) {
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
            return super.getAccentColor() || FLOOD_COLOR;
        }
        return super.getAccentColor();
    }

    protected isTileActive(): boolean {
        return this.state.alarm;
    }

    protected renderTileIcon(): React.JSX.Element {
        const { alarm } = this.state;
        const accent = this.getAccentColor();

        // Active: iconActive, fallback to icon (with active color); Inactive: icon only
        const customIcon = alarm
            ? this.props.settings?.iconActive || this.props.settings?.icon
            : this.props.settings?.icon;
        if (customIcon) {
            return (
                <Icon
                    src={customIcon}
                    style={{
                        width: '1em',
                        height: '1em',
                        color: alarm ? accent || FLOOD_COLOR : 'grey',
                        transition: 'color 0.25s ease',
                    }}
                />
            );
        }

        return (
            <Water
                sx={{
                    color: alarm ? accent || FLOOD_COLOR : 'text.disabled',
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
                        color: alarm ? accent || FLOOD_COLOR : 'success.main',
                        transition: 'color 0.25s ease',
                    }}
                >
                    {alarm
                        ? this.props.settings?.textActive || I18n.t('wm_Flood')
                        : this.props.settings?.text || I18n.t('wm_Dry')}
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
                        color: alarm ? accent || FLOOD_COLOR : 'success.main',
                    }}
                >
                    {alarm
                        ? this.props.settings?.textActive || I18n.t('wm_Flood')
                        : this.props.settings?.text || I18n.t('wm_Dry')}
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
                return (
                    <div
                        data-wm-hidden
                        style={{ display: 'none' }}
                    />
                );
            }
            return <Box sx={{ opacity: 0.5 }}>{super.render()}</Box>;
        }
        return super.render();
    }
}

export default WidgetFloodAlarm;
