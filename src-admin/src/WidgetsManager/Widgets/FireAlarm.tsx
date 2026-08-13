import React from 'react';
import { Box, Typography } from '@mui/material';
import { Help, LocalFireDepartment } from '@mui/icons-material';
import { I18n, Icon } from '@iobroker/gui-components';

import WidgetGeneric, { type WidgetGenericSettings, type WidgetGenericProps, type WidgetGenericState } from './Generic';
import { parseCommonStates } from './commonStates';
import type { ConfigItemPanel } from '@iobroker/json-config';

/** Settings for alarm/sensor widgets */
interface AlarmWidgetSettings extends WidgetGenericSettings {
    hideWhenOk?: boolean;
}

const FIRE_COLOR = '#e65100';

interface WidgetFireAlarmState extends WidgetGenericState {
    alarm: boolean;
    coAlarm: boolean;
    /** True until the first ACTUAL value arrives, or when it reports null/undefined */
    isUnknown: boolean;
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
    /**
     * Per-channel "no value received yet" flags — combined into state.isUnknown so either an
     * unresolved ACTUAL or an unresolved CO counts as unknown.
     */
    private actualUnknown = true;
    private coUnknown: boolean;

    constructor(props: WidgetGenericProps<AlarmWidgetSettings>) {
        super(props);
        const states = props.widget.control.states;
        const actual = states.find(s => s.name === 'ACTUAL');

        this.actualId = actual?.id ?? null;
        this.coId = states.find(s => s.name === 'CO' && s.id)?.id ?? null;
        // A CO channel the device does not have can never resolve, so it must not count as unknown
        this.coUnknown = !!this.coId;
        this.severityId = states.find(s => s.name === 'SEVERITY' && s.id)?.id ?? null;

        this.state = {
            ...this.state,
            alarm: false,
            coAlarm: false,
            isUnknown: true,
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
        // A state that cannot be read yet is delivered as val: null, which must not collapse into "no alarm"
        this.actualUnknown = state.val === null || state.val === undefined;
        const alarm = !!state.val;
        const isUnknown = this.actualUnknown || this.coUnknown;
        const lc = state.lc || state.ts || Date.now();
        if (alarm !== this.state.alarm || isUnknown !== this.state.isUnknown) {
            this.setState({ alarm, isUnknown, lastChanged: lc, lastChangedAgo: this.fromNow(lc) });
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
            const states = parseCommonStates(obj?.common?.states);
            if (Object.keys(states).length) {
                this.setState({ severityStates: states });
            }
        } catch {
            // fall back to the plain number
        }
    }

    private onCoChange = (_id: string, state: ioBroker.State): void => {
        this.coUnknown = state.val === null || state.val === undefined;
        const coAlarm = !!state.val;
        const isUnknown = this.actualUnknown || this.coUnknown;
        const lc = state.lc || state.ts || Date.now();
        if (coAlarm !== this.state.coAlarm || isUnknown !== this.state.isUnknown) {
            this.setState({ coAlarm, isUnknown, lastChanged: lc, lastChangedAgo: this.fromNow(lc) });
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

    /** What to call the raised alarm. */
    protected getAlarmName(): string {
        const { alarm, coAlarm } = this.state;
        const fire = this.props.settings?.textActive || I18n.t('wm_Fire');
        const co = I18n.t('wm_Carbon monoxide');
        // Independent alarms: naming only one of them would hide the other
        return alarm && coAlarm ? `${fire} + ${co}` : alarm ? fire : co;
    }

    /** Which alarm is actually raised, and how bad the device says it is. */
    protected getAlarmText(): string {
        const { severity, severityStates, isUnknown } = this.state;
        if (isUnknown) {
            return I18n.t('wm_No data');
        }
        if (!this.isTileActive()) {
            return this.props.settings?.text || I18n.t('wm_OK');
        }
        const what = this.getAlarmName();
        const how = severity == null ? undefined : (severityStates?.[String(severity)] ?? String(severity));
        return how ? `${what} · ${how}` : what;
    }

    /** Fallback accent color while an alarm is active and no color is configured on the widget. */
    // eslint-disable-next-line class-methods-use-this
    protected getAlarmAccentColor(): string {
        return FIRE_COLOR;
    }

    protected getAccentColor(): string | undefined {
        if (this.isTileActive()) {
            return super.getAccentColor() || this.getAlarmAccentColor();
        }
        return super.getAccentColor();
    }

    /** Status-line color: alarm accent when raised, success when clear, neutral while unknown. */
    protected getStatusColor(): string {
        if (this.state.isUnknown) {
            return 'text.disabled';
        }
        if (this.isTileActive()) {
            return this.getAccentColor() || this.getAlarmAccentColor();
        }
        return 'success.main';
    }

    /**
     * Whether hideWhenOk may hide the tile.
     *
     * A reading the adapter has not delivered is not a reading of "no alarm": hiding the tile then
     * would present an unknown detector exactly like a confirmed-safe one.
     */
    protected isConsideredOk(): boolean {
        return !this.isTileActive() && !this.state.isUnknown;
    }

    protected isTileActive(): boolean {
        return this.state.alarm || this.state.coAlarm;
    }

    /** The icon drawn when the widget has no custom one configured. */
    // eslint-disable-next-line class-methods-use-this
    protected renderAlarmIcon(color: string): React.JSX.Element {
        return (
            <LocalFireDepartment
                sx={{
                    color,
                    transition: 'color 0.25s ease',
                }}
            />
        );
    }

    protected renderTileIcon(): React.JSX.Element {
        if (this.state.isUnknown) {
            // Before the custom icon, which has no unknown variant and would otherwise be
            // indistinguishable from a detector reporting no alarm
            return <Help sx={{ color: 'text.disabled', transition: 'color 0.25s ease' }} />;
        }

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
                        color: alarm ? accent || this.getAlarmAccentColor() : 'grey',
                        transition: 'color 0.25s ease',
                    }}
                />
            );
        }

        return this.renderAlarmIcon(alarm ? accent || this.getAlarmAccentColor() : 'text.disabled');
    }

    protected renderTileStatus(): React.JSX.Element | null {
        // Every layout but the 1x1 shows the same text through renderTileAction — rendering it here
        // as well printed it twice on one tile.
        const size = this.props.settings?.size || '1x1';
        if (size !== '1x1') {
            return null;
        }

        const { lastChangedAgo } = this.state;

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 600,
                        color: this.getStatusColor(),
                        transition: 'color 0.25s ease',
                    }}
                >
                    {this.getAlarmText()}
                </Typography>
                {lastChangedAgo ? (
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

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        color: this.getStatusColor(),
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
        if (this.props.settings?.hideWhenOk && this.isConsideredOk()) {
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
