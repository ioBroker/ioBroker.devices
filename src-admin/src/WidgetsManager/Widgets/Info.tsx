import React from 'react';
import { Box, Typography } from '@mui/material';
import {
    Air,
    Bolt,
    ElectricalServices,
    ElectricMeter,
    EnergySavingsLeaf,
    Explore,
    Grass,
    Hearing,
    LightMode,
    Opacity,
    Speed,
    Thermostat,
    Visibility,
    Water,
    WaterDrop,
    WbSunny,
    Waves,
    type SvgIconComponent,
} from '@mui/icons-material';

import WidgetGeneric, { getTileStyles, type WidgetGenericProps, type WidgetGenericState } from './Generic';

/** Map ioBroker roles / units to icons */
const ROLE_ICON_MAP: [RegExp, SvgIconComponent][] = [
    [/pressure|baro/i, Speed],
    [/voltage/i, Bolt],
    [/current(?!.*weather)/i, ElectricalServices],
    [/power|watt/i, ElectricMeter],
    [/energy|consumption|kwh/i, EnergySavingsLeaf],
    [/frequency|hertz|hz/i, Waves],
    [/humidity|moisture/i, WaterDrop],
    [/temperature|temp/i, Thermostat],
    [/wind.*speed/i, Air],
    [/wind.*dir/i, Explore],
    [/precipitation|rain/i, Opacity],
    [/uv/i, WbSunny],
    [/visibility/i, Visibility],
    [/air.*quality|aqi|pm2|pm10|co2/i, Air],
    [/noise|decibel|dba/i, Hearing],
    [/water.*level|tank/i, Water],
    [/soil/i, Grass],
    [/light|lux|illumin/i, LightMode],
];

function getIconForRole(role: string, unit: string): SvgIconComponent | null {
    const combined = `${role} ${unit}`;
    for (const [regex, Icon] of ROLE_ICON_MAP) {
        if (regex.test(combined)) {
            return Icon;
        }
    }
    return null;
}

interface InfoState {
    id: string;
    role: string;
    unit: string;
    name: string;
    value: string | number | boolean | null;
}

interface WidgetInfoState extends WidgetGenericState {
    infoStates: InfoState[];
}

export class WidgetInfo extends WidgetGeneric<WidgetInfoState> {
    private readonly stateIds: { id: string; role: string }[];

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;
        // Collect all ACTUAL states (info type allows multiple)
        this.stateIds = states
            .filter(s => s.name === 'ACTUAL' && s.id)
            .map(s => ({ id: s.id, role: (s as any).role || '' }));

        this.state = {
            ...this.state,
            infoStates: [],
        };
    }

    async componentDidMount(): Promise<void> {
        super.componentDidMount();

        // Load object metadata (name, unit) for each state, then subscribe
        const infoStates: InfoState[] = [];
        for (const entry of this.stateIds) {
            let unit = '';
            let name = '';
            let role = entry.role;
            try {
                const obj = await this.props.stateContext.getObject<ioBroker.StateObject>(entry.id);
                if (obj?.common) {
                    unit = obj.common.unit || '';
                    name =
                        typeof obj.common.name === 'object'
                            ? obj.common.name[this.props.language] || obj.common.name.en || ''
                            : obj.common.name || '';
                    role = obj.common.role || role;
                }
            } catch {
                // ignore
            }
            infoStates.push({ id: entry.id, role, unit, name, value: null });
            this.props.stateContext.getState(entry.id, this.onStateChange);
        }

        this.setState({ infoStates });
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        for (const entry of this.stateIds) {
            this.props.stateContext.removeState(entry.id, this.onStateChange);
        }
    }

    private onStateChange = (id: string, state: ioBroker.State): void => {
        this.setState(prev => ({
            infoStates: prev.infoStates.map(s => (s.id === id ? { ...s, value: state.val } : s)),
        }));
    };

    protected getHistoryIds(): { id: string; color: string }[] {
        const colors = ['#2196f3', '#ff9800', '#4caf50', '#f44336', '#9c27b0', '#00bcd4'];
        return this.stateIds.map((entry, i) => ({
            id: entry.id,
            color: colors[i % colors.length],
        }));
    }

    protected isTileActive(): boolean {
        return this.state.infoStates.some(s => s.value != null);
    }

    private static formatValue(val: string | number | boolean | null, unit: string): string {
        if (val == null) {
            return '—';
        }
        if (typeof val === 'number') {
            // Show reasonable precision
            const str = Number.isInteger(val) ? String(val) : val.toFixed(1);
            return unit ? `${str} ${unit}` : str;
        }
        if (typeof val === 'boolean') {
            return val ? 'ON' : 'OFF';
        }
        return unit ? `${val} ${unit}` : String(val);
    }

    static getStateIcon(s: InfoState, fontSize: number): React.JSX.Element | null {
        const IconComp = getIconForRole(s.role, s.unit);
        if (!IconComp) {
            return null;
        }
        return <IconComp sx={{ fontSize, color: 'text.secondary', flexShrink: 0 }} />;
    }

    // --- Tile icon (1-2 states: role icon like Humidity/Temperature) ---

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = super.renderTileIcon();
        if (baseIcon) {
            return baseIcon;
        }

        const { infoStates } = this.state;
        // For 1-2 states: show role-based icon in center (like Humidity widget)
        if (infoStates.length >= 1 && infoStates.length <= 2 && infoStates[0]) {
            const IconComp = getIconForRole(infoStates[0].role, infoStates[0].unit);
            if (IconComp) {
                return (
                    <IconComp
                        sx={{
                            color: infoStates[0].value != null ? '#2196f3' : 'text.disabled',
                            transition: 'color 0.25s ease',
                        }}
                    />
                );
            }
        }

        return <ElectricMeter sx={{ color: 'text.disabled' }} />;
    }

    // --- Tile status (below name, 1x1 only — value like Humidity shows "65%") ---

    protected renderTileStatus(): React.JSX.Element | null {
        const size = this.props.settings?.size || this.props.size || '1x1';
        if (size !== '1x1') {
            return null;
        }

        const { infoStates } = this.state;
        const count = infoStates.length;

        if (count === 1 && infoStates[0]) {
            // Single state: show value below name
            const s = infoStates[0];
            return (
                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 600,
                        fontSize: '1.1rem',
                        lineHeight: 1.2,
                        color: 'text.primary',
                    }}
                >
                    {WidgetInfo.formatValue(s.value, s.unit)}
                </Typography>
            );
        }

        if (count === 2 && infoStates[0] && infoStates[1]) {
            // Two states: first value big, second smaller with icon
            const s0 = infoStates[0];
            const s1 = infoStates[1];
            const icon = WidgetInfo.getStateIcon(s1, 12);
            return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography
                        variant="caption"
                        sx={{
                            fontWeight: 600,
                            fontSize: '1.1rem',
                            lineHeight: 1.2,
                            color: 'text.primary',
                        }}
                    >
                        {WidgetInfo.formatValue(s0.value, s0.unit)}
                    </Typography>
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
                        {icon}
                        {WidgetInfo.formatValue(s1.value, s1.unit)}
                    </Typography>
                </Box>
            );
        }

        return null;
    }

    // --- Wide / WideTall action area ---

    protected renderTileAction(): React.JSX.Element {
        const { infoStates } = this.state;
        const count = infoStates.length;

        if (count <= 2) {
            return (
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap' }}>
                    {infoStates.map((s, i) => {
                        const icon = WidgetInfo.getStateIcon(s, i === 0 ? 18 : 14);
                        return (
                            <Box
                                key={s.id}
                                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                            >
                                {icon}
                                <Typography
                                    variant={i === 0 ? 'h5' : 'body2'}
                                    sx={{
                                        fontWeight: i === 0 ? 700 : 500,
                                        whiteSpace: 'nowrap',
                                        color: i === 0 ? 'text.primary' : 'text.secondary',
                                    }}
                                >
                                    {WidgetInfo.formatValue(s.value, s.unit)}
                                </Typography>
                            </Box>
                        );
                    })}
                </Box>
            );
        }

        // 3+ states: render as compact table
        return (
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: '2px 8px',
                    alignItems: 'center',
                    overflow: 'auto',
                    maxHeight: '100%',
                }}
            >
                {infoStates.map(s => {
                    const icon = WidgetInfo.getStateIcon(s, 14);
                    return (
                        <React.Fragment key={s.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                                {icon}
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: 'text.secondary',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {s.name}
                                </Typography>
                            </Box>
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}
                            >
                                {WidgetInfo.formatValue(s.value, s.unit)}
                            </Typography>
                        </React.Fragment>
                    );
                })}
            </Box>
        );
    }

    // --- 1x1 override for 3+ states: show table instead of icon ---

    renderCompact(): React.JSX.Element {
        if (this.state.infoStates.length <= 2) {
            return super.renderCompact();
        }
        const { infoStates } = this.state;

        // 3+ states: replace icon area with a table
        const { name } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const isDisabled = this.props.settings?.enabled === false;
        const indicators = this.renderIndicators();

        return (
            <Box
                id={String(this.props.widget.id)}
                sx={{ position: 'relative', containerType: 'inline-size', overflow: 'hidden' }}
            >
                <Box
                    sx={theme => ({
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'stretch',
                        width: '100%',
                        aspectRatio: '1',
                        textAlign: 'left',
                        overflow: 'hidden',
                        opacity: isDisabled ? 0.4 : 1,
                        ...getTileStyles(theme, isActive, accent),
                        padding: 'max(12px, 8cqi)',
                    })}
                >
                    {indicators ? (
                        <Box sx={{ position: 'absolute', top: 'max(12px, 8cqi)', right: 'max(12px, 8cqi)', zIndex: 1 }}>
                            {indicators}
                        </Box>
                    ) : null}

                    {/* Table of all values */}
                    <Box
                        sx={{
                            flex: 1,
                            display: 'grid',
                            gridTemplateColumns: 'auto 1fr',
                            gap: '1px 6px',
                            alignContent: 'center',
                            alignItems: 'center',
                            overflow: 'hidden',
                            minHeight: 0,
                        }}
                    >
                        {infoStates.map(s => {
                            const icon = WidgetInfo.getStateIcon(s, 12);
                            return (
                                <React.Fragment key={s.id}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        {icon}
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: 'text.secondary',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                fontSize: 'max(0.65rem, 6cqi)',
                                                lineHeight: 1.3,
                                            }}
                                        >
                                            {s.name}
                                        </Typography>
                                    </Box>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            fontWeight: 600,
                                            whiteSpace: 'nowrap',
                                            fontSize: 'max(0.7rem, 7cqi)',
                                            lineHeight: 1.3,
                                        }}
                                    >
                                        {WidgetInfo.formatValue(s.value, s.unit)}
                                    </Typography>
                                </React.Fragment>
                            );
                        })}
                    </Box>

                    {/* Name */}
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: 600,
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            fontSize: 'max(0.875rem, 9cqi)',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {this.props.settings?.name || name || '...'}
                    </Typography>
                </Box>
                {this.renderSettingsButton()}
                {this.renderChart()}
            </Box>
        );
    }
}

export default WidgetInfo;
