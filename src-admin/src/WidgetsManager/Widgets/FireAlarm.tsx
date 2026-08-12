import React from 'react';
import { Box, Typography } from '@mui/material';
import { LocalFireDepartment } from '@mui/icons-material';
import { I18n, Icon } from '@iobroker/gui-components';

import WidgetGeneric, { type WidgetGenericSettings, type WidgetGenericProps, type WidgetGenericState } from './Generic';
import type { ConfigItemPanel } from '@iobroker/json-config';

/** Settings for alarm/sensor widgets */
interface AlarmWidgetSettings extends WidgetGenericSettings {
    hideWhenOk?: boolean;
}

const FIRE_COLOR = '#e65100';

interface WidgetFireAlarmState extends WidgetGenericState {
    alarm: boolean;
    coAlarm: boolean;
    severity: number | null;
    severityStates: Record<string, string> | null;
    lastChanged: number | null;
    lastChangedAgo: string;
}

export class WidgetFireAlarm extends WidgetGeneric<WidgetFireAlarmState, AlarmWidgetSettings> {
    private readonly actualId: string | null;
    /** A combined smoke and CO detector stays one device and reports carbon monoxide separately */
    private readonly coId: string | null;
    private readonly severityId: string | null;
    private agoTimer: ReturnType<typeof setInterval> | null = null;

    constructor(props: WidgetGenericProps<AlarmWidgetSettings>) {
        super(props);
        const states = props.widget.control.states;
        const actual = states.find(s => s.name === 'ACTUAL');

        this.actualId = actual?.id ?? null;
        this.coId = states.find(s => s.name === 'CO' && s.id)?.id ?? null;
        this.severityId = states.find(s => s.name === 'SEVERITY' && s.id)?.id ?? null;

        this.state = {
            ...this.state,
            alarm: false,
            coAlarm: false,
            severity: null,
            severityStates: null,
            lastChanged: null,
            lastChangedAgo: '',
        };
    }

    static getConfigSchema(): { name: string; schema: ConfigItemPanel } {
        return {
            name: 'Image settings', // ignored
            schema: {
                type: 'panel',
                items: {
                    hideWhenOk: {
                        type: 'checkbox',
                        label: 'wm_Hide when OK',
                        default: false,
                    },
                },
            },
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onStateChange);
        }
        if (this.coId) {
            this.props.stateContext.getState(this.coId, this.onCoChange);
        }
        if (this.severityId) {
            this.props.stateContext.getState(this.severityId, this.onSeverityChange);
            void this.loadSeverityStates();
        }
        this.agoTimer = setInterval(() => this.updateAgo(), 60_000);
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onStateChange);
        }
        if (this.coId) {
            this.props.stateContext.removeState(this.coId, this.onCoChange);
        }
        if (this.severityId) {
            this.props.stateContext.removeState(this.severityId, this.onSeverityChange);
        }
        if (this.agoTimer) {
            clearInterval(this.agoTimer);
            this.agoTimer = null;
        }
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

    private async loadSeverityStates(): Promise<void> {
        if (!this.severityId) {
            return;
        }
        try {
            const obj = await this.props.stateContext.getObject<ioBroker.StateObject>(this.severityId);
            const common = obj?.common?.states;
            if (common && typeof common === 'object') {
                this.setState({ severityStates: common as Record<string, string> });
            }
        } catch {
            // fall back to the plain number
        }
    }

    private onCoChange = (_id: string, state: ioBroker.State): void => {
        const coAlarm = !!state.val;
        const lc = state.lc || state.ts || Date.now();
        if (coAlarm !== this.state.coAlarm) {
            this.setState({ coAlarm, lastChanged: lc, lastChangedAgo: this.fromNow(lc) });
        } else if (!this.state.lastChanged && lc) {
            this.setState({ lastChanged: lc, lastChangedAgo: this.fromNow(lc) });
        }
    };

    private onSeverityChange = (_id: string, state: ioBroker.State): void => {
        const raw = state.val == null ? null : Number(state.val);
        const severity = raw != null && isNaN(raw) ? null : raw;
        if (severity !== this.state.severity) {
            this.setState({ severity });
        }
    };

    /** Which alarm is actually raised, and how bad the device says it is. */
    protected getAlarmText(): string {
        const { alarm, coAlarm, severity, severityStates } = this.state;
        if (!alarm && !coAlarm) {
            return this.props.settings?.text || I18n.t('wm_OK');
        }
        const what =
            coAlarm && !alarm ? I18n.t('wm_Carbon monoxide') : this.props.settings?.textActive || I18n.t('wm_Fire');
        const how = severity == null ? undefined : (severityStates?.[String(severity)] ?? String(severity));
        return how ? `${what} · ${how}` : what;
    }

    protected getAccentColor(): string | undefined {
        if (this.isTileActive()) {
            return super.getAccentColor() || FIRE_COLOR;
        }
        return super.getAccentColor();
    }

    protected isTileActive(): boolean {
        return this.state.alarm || this.state.coAlarm;
    }

    protected renderTileIcon(): React.JSX.Element {
        const alarm = this.isTileActive();
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
                        color: alarm ? accent || FIRE_COLOR : 'grey',
                        transition: 'color 0.25s ease',
                    }}
                />
            );
        }

        return (
            <LocalFireDepartment
                sx={{
                    color: alarm ? accent || FIRE_COLOR : 'text.disabled',
                    transition: 'color 0.25s ease',
                }}
            />
        );
    }

    protected renderTileStatus(): React.JSX.Element | null {
        const size = this.props.settings?.size || '1x1';
        if (size === '2x0.5') {
            return null;
        }

        const { lastChangedAgo } = this.state;
        const alarm = this.isTileActive();
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
                    {this.getAlarmText()}
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
        const { lastChangedAgo } = this.state;
        const alarm = this.isTileActive();
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
                    {this.getAlarmText()}
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
        if (this.props.settings?.hideWhenOk && !this.isTileActive()) {
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

export default WidgetFireAlarm;
