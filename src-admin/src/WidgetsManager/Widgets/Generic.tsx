import React, { Component } from 'react';
import { Box, ButtonBase, Tooltip, Typography } from '@mui/material';
import {
    ArrowDownward,
    ArrowUpward,
    BatteryAlert,
    Battery20,
    Battery50,
    Battery80,
    BatteryFull,
    Build,
    Error as ErrorIcon,
    LinkOff,
    Settings,
    Sync,
    WifiOff,
} from '@mui/icons-material';
import { alpha, type Theme } from '@mui/material/styles';
import { Icon } from '@iobroker/adapter-react-v5';

import type { WidgetInfo } from '../../../../src/widget-utils';
import type StateContext from '../StateContext';

export interface WidgetSettings {
    enabled: boolean;
    size: '1x1' | '2x1';
}

export const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
    enabled: true,
    size: '1x1',
};

export interface WidgetGenericProps {
    widget: WidgetInfo;
    language: ioBroker.Languages;
    stateContext: StateContext;
    size?: '1x1' | '2x1';
    settings?: WidgetSettings;
    onOpenSettings?: (widgetId: string | number) => void;
}

export interface IndicatorValues {
    working: boolean | null;
    unreach: boolean | null;
    lowbat: boolean | null;
    maintain: boolean | null;
    error: string | null;
    direction: boolean | number | null;
    connected: boolean | null;
    battery: number | null;
}

export interface WidgetGenericState {
    name: string | null;
    icon: string | null;
    color: string | null;
    indicators: IndicatorValues;
}

const INDICATOR_NAMES = [
    'WORKING',
    'UNREACH',
    'LOWBAT',
    'MAINTAIN',
    'ERROR',
    'DIRECTION',
    'CONNECTED',
    'BATTERY',
] as const;

const INDICATOR_ICON_SIZE = 14;

export function getTileStyles(theme: Theme, isActive: boolean, accentColor?: string): Record<string, unknown> {
    const accent = accentColor || theme.palette.primary.main;
    const isDark = theme.palette.mode === 'dark';

    return {
        borderRadius: '16px',
        boxSizing: 'border-box',
        padding: theme.spacing(2),
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        backgroundColor: isActive
            ? alpha(accent, 0.12)
            : isDark
              ? alpha(theme.palette.common.white, 0.06)
              : alpha(theme.palette.common.black, 0.035),
        border: `1.5px solid ${
            isActive
                ? alpha(accent, 0.3)
                : isDark
                  ? alpha(theme.palette.common.white, 0.08)
                  : alpha(theme.palette.common.black, 0.08)
        }`,
        '&:active': {
            transform: 'scale(0.97)',
        },
    };
}

const DEFAULT_INDICATORS: IndicatorValues = {
    working: null,
    unreach: null,
    lowbat: null,
    maintain: null,
    error: null,
    direction: null,
    connected: null,
    battery: null,
};

export class WidgetGeneric<TState extends WidgetGenericState = WidgetGenericState> extends Component<
    WidgetGenericProps,
    TState
> {
    /** Indicator state IDs mapped by name */
    private readonly indicatorIds: Partial<Record<(typeof INDICATOR_NAMES)[number], string>> = {};

    constructor(props: WidgetGenericProps) {
        super(props);
        this.state = {
            name: null,
            icon: null,
            color: null,
            indicators: { ...DEFAULT_INDICATORS },
        } as TState;

        // Collect indicator state IDs from control.states
        if (props.widget.control?.states) {
            for (const s of props.widget.control.states) {
                if ((INDICATOR_NAMES as readonly string[]).includes(s.name) && s.id) {
                    this.indicatorIds[s.name as (typeof INDICATOR_NAMES)[number]] = s.id;
                }
            }
        }
    }

    componentDidMount(): void {
        let state: Partial<WidgetGenericState> | undefined;
        if (this.props.widget.name && typeof this.props.widget.name === 'object') {
            if ((this.props.widget.name as ioBroker.Translated).en) {
                state = {};
                state.name = this.getText(this.props.widget.name as ioBroker.Translated);
            } else if ((this.props.widget.name as { objectId: string; property: string }).objectId) {
                this.props.stateContext.getObjectProperty(
                    (this.props.widget.name as { objectId: string; property: string }).objectId,
                    (this.props.widget.name as { objectId: string; property: string }).property,
                    this.onNameChange,
                );
            }
        } else {
            state = {};
            state.name = this.props.widget.name || '';
        }

        if (this.props.widget.icon && typeof this.props.widget.icon === 'object') {
            if ((this.props.widget.icon as { stateId: string; mapping?: Record<string | number, string> }).stateId) {
                this.props.stateContext.getState(
                    (this.props.widget.icon as { stateId: string; mapping?: Record<string | number, string> }).stateId,
                    this.onIconChange,
                );
            }
        } else if (typeof this.props.widget.icon === 'string') {
            state ||= {};
            state.icon = this.props.widget.icon;
        }

        if (this.props.widget.color && typeof this.props.widget.color === 'object') {
            if ((this.props.widget.color as { stateId: string; mapping?: Record<string | number, string> }).stateId) {
                this.props.stateContext.getState(
                    (this.props.widget.color as { stateId: string; mapping?: Record<string | number, string> }).stateId,
                    this.onColorChange,
                );
            }
        } else if (typeof this.props.widget.color === 'string') {
            state ||= {};
            state.color = this.props.widget.color;
        }

        if (state) {
            this.setState(state as WidgetGenericState & TState);
        }

        // Subscribe to all indicator states
        for (const name of INDICATOR_NAMES) {
            const id = this.indicatorIds[name];
            if (id) {
                this.props.stateContext.getState(id, this.onIndicatorChange);
            }
        }
    }

    componentWillUnmount(): void {
        for (const name of INDICATOR_NAMES) {
            const id = this.indicatorIds[name];
            if (id) {
                this.props.stateContext.removeState(id, this.onIndicatorChange);
            }
        }
    }

    private onIndicatorChange = (id: string, state: ioBroker.State): void => {
        const indicators = { ...this.state.indicators };
        let changed = false;

        for (const name of INDICATOR_NAMES) {
            if (this.indicatorIds[name] !== id) {
                continue;
            }
            switch (name) {
                case 'WORKING': {
                    const val = !!state.val;
                    if (indicators.working !== val) {
                        indicators.working = val;
                        changed = true;
                    }
                    break;
                }
                case 'UNREACH': {
                    const val = !!state.val;
                    if (indicators.unreach !== val) {
                        indicators.unreach = val;
                        changed = true;
                    }
                    break;
                }
                case 'LOWBAT': {
                    const val = !!state.val;
                    if (indicators.lowbat !== val) {
                        indicators.lowbat = val;
                        changed = true;
                    }
                    break;
                }
                case 'MAINTAIN': {
                    const val = !!state.val;
                    if (indicators.maintain !== val) {
                        indicators.maintain = val;
                        changed = true;
                    }
                    break;
                }
                case 'ERROR': {
                    const val = state.val != null && state.val !== '' && state.val !== false ? String(state.val) : null;
                    if (indicators.error !== val) {
                        indicators.error = val;
                        changed = true;
                    }
                    break;
                }
                case 'DIRECTION': {
                    const val = typeof state.val === 'number' ? state.val : state.val ? true : false;
                    if (indicators.direction !== val) {
                        indicators.direction = val as boolean | number;
                        changed = true;
                    }
                    break;
                }
                case 'CONNECTED': {
                    // inverted: true value = reachable (good)
                    const val = !!state.val;
                    if (indicators.connected !== val) {
                        indicators.connected = val;
                        changed = true;
                    }
                    break;
                }
                case 'BATTERY': {
                    const val = Number(state.val);
                    if (indicators.battery !== val) {
                        indicators.battery = isNaN(val) ? null : val;
                        changed = true;
                    }
                    break;
                }
            }
        }

        if (changed) {
            this.setState({ indicators } as Partial<TState> as TState);
        }
    };

    onNameChange = (id: string, property: string, value: ioBroker.StringOrTranslated): void => {
        const text = this.getText(value);
        const struct = this.props.widget.name as { objectId: string; property: string };
        if (this.props.widget.name && typeof this.props.widget.name === 'object' && struct.objectId) {
            if (struct.objectId === id && struct.property === property && text !== this.state.name) {
                this.setState({ name: text });
            }
        }
    };

    onColorChange = (id: string, state: ioBroker.State): void => {
        if (this.props.widget.color && typeof this.props.widget.color === 'object') {
            const struct = this.props.widget.color as { stateId?: string; mapping?: Record<string | number, string> };
            if (struct.stateId === id) {
                let color = '';
                if (struct.mapping && struct.mapping[state.val as string]) {
                    color = struct.mapping[state.val as string];
                } else if (state.val !== undefined && state.val !== null) {
                    color = (state.val as string) || '';
                }
                if (color !== this.state.color) {
                    this.setState({ color });
                }
            }
        }
    };

    onIconChange = (id: string, state: ioBroker.State): void => {
        if (this.props.widget.icon && typeof this.props.widget.icon === 'object') {
            const struct = this.props.widget.icon as { stateId?: string; mapping?: Record<string | number, string> };
            if (struct.stateId === id) {
                let iconValue = '';
                if (struct.mapping && struct.mapping[state.val as string]) {
                    iconValue = struct.mapping[state.val as string];
                } else if (state.val !== undefined && state.val !== null) {
                    iconValue = (state.val as string) || '';
                }
                if (iconValue !== this.state.icon) {
                    this.setState({ icon: iconValue });
                }
            }
        }
    };

    // eslint-disable-next-line react/no-unused-class-component-methods
    getText(text: ioBroker.StringOrTranslated): string {
        if (typeof text === 'object') {
            return text[this.props.language] || text.en;
        }

        return text;
    }

    // --- Overridable tile methods ---

    protected isTileActive(): boolean {
        return false;
    }

    protected getAccentColor(): string | undefined {
        return this.state.color || undefined;
    }

    protected onTileClick(): void {
        // noop by default
    }

    protected renderTileIcon(): React.JSX.Element | null {
        const { icon, color } = this.state;
        const isActive = this.isTileActive();

        if (icon) {
            return (
                <Icon
                    src={icon}
                    style={{
                        width: 32,
                        height: 32,
                        color: isActive ? color || undefined : undefined,
                        opacity: isActive ? 1 : 0.5,
                        transition: 'opacity 0.25s ease, color 0.25s ease',
                    }}
                />
            );
        }
        return null;
    }

    protected renderTileStatus(): React.JSX.Element | null {
        return null;
    }

    protected renderTileAction(): React.JSX.Element | null {
        return null;
    }

    // --- Indicators ---

    protected renderIndicators(): React.JSX.Element | null {
        const { indicators } = this.state;
        const items: React.JSX.Element[] = [];
        const sz = INDICATOR_ICON_SIZE;

        // Unreachable — red wifi-off
        if (indicators.unreach) {
            items.push(
                <Tooltip
                    key="unreach"
                    title="Unreachable"
                >
                    <WifiOff sx={{ fontSize: sz, color: 'error.main' }} />
                </Tooltip>,
            );
        }

        // Disconnected — show only when false (connected=false means disconnected)
        if (indicators.connected === false) {
            items.push(
                <Tooltip
                    key="connected"
                    title="Disconnected"
                >
                    <LinkOff sx={{ fontSize: sz, color: 'error.main' }} />
                </Tooltip>,
            );
        }

        // Error
        if (indicators.error) {
            items.push(
                <Tooltip
                    key="error"
                    title={indicators.error}
                >
                    <ErrorIcon sx={{ fontSize: sz, color: 'error.main' }} />
                </Tooltip>,
            );
        }

        // Low battery indicator (boolean)
        if (indicators.lowbat) {
            items.push(
                <Tooltip
                    key="lowbat"
                    title="Low battery"
                >
                    <BatteryAlert sx={{ fontSize: sz, color: 'warning.main' }} />
                </Tooltip>,
            );
        }

        // Battery level (numeric) — always show if available (skip if lowbat already shown)
        if (indicators.battery != null && !indicators.lowbat) {
            const pct = Math.round(indicators.battery);
            const batteryIcon =
                pct <= 10 ? (
                    <BatteryAlert sx={{ fontSize: sz, color: 'error.main' }} />
                ) : pct <= 30 ? (
                    <Battery20 sx={{ fontSize: sz, color: 'warning.main' }} />
                ) : pct <= 60 ? (
                    <Battery50 sx={{ fontSize: sz, color: 'success.main' }} />
                ) : pct <= 90 ? (
                    <Battery80 sx={{ fontSize: sz, color: 'success.main' }} />
                ) : (
                    <BatteryFull sx={{ fontSize: sz, color: 'success.main' }} />
                );
            items.push(
                <Tooltip
                    key="battery"
                    title={`${pct}%`}
                >
                    {batteryIcon}
                </Tooltip>,
            );
        }

        // Maintenance
        if (indicators.maintain) {
            items.push(
                <Tooltip
                    key="maintain"
                    title="Maintenance required"
                >
                    <Build sx={{ fontSize: sz, color: 'warning.main' }} />
                </Tooltip>,
            );
        }

        // Direction — 0: none, 1: up/open, 2: down/close, 3: unknown; boolean true=up
        if (indicators.direction === true || indicators.direction === 1) {
            items.push(
                <Tooltip key="direction" title="Up / Open">
                    <ArrowUpward sx={{ fontSize: sz, color: 'info.main' }} />
                </Tooltip>,
            );
        } else if (indicators.direction === 2) {
            items.push(
                <Tooltip key="direction" title="Down / Close">
                    <ArrowDownward sx={{ fontSize: sz, color: 'info.main' }} />
                </Tooltip>,
            );
        }

        // Working (busy) — spinning sync icon
        if (indicators.working) {
            items.push(
                <Tooltip
                    key="working"
                    title="Working"
                >
                    <Sync
                        sx={{
                            fontSize: sz,
                            color: 'info.main',
                            animation: 'spin 1.5s linear infinite',
                            '@keyframes spin': {
                                '0%': { transform: 'rotate(0deg)' },
                                '100%': { transform: 'rotate(360deg)' },
                            },
                        }}
                    />
                </Tooltip>,
            );
        }

        if (items.length === 0) {
            return null;
        }

        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    flexWrap: 'wrap',
                }}
            >
                {items}
            </Box>
        );
    }

    // --- Settings button ---

    protected renderSettingsButton(): React.JSX.Element | null {
        if (!this.props.onOpenSettings) {
            return null;
        }
        const isEnabled = this.props.settings?.enabled !== false;

        return (
            <Box
                component="span"
                role="button"
                tabIndex={0}
                onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    this.props.onOpenSettings!(this.props.widget.id);
                }}
                onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        this.props.onOpenSettings!(this.props.widget.id);
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
                    color: isEnabled ? theme.palette.primary.main : theme.palette.text.disabled,
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

    // --- Frame rendering ---

    renderCompact(): React.JSX.Element {
        const { name } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const isDisabled = this.props.settings?.enabled === false;
        const indicators = this.renderIndicators();

        return (
            <Box sx={{ position: 'relative' }}>
                <ButtonBase
                    component="div"
                    disabled={isDisabled}
                    onClick={() => this.onTileClick()}
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
                    })}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        {this.renderTileIcon()}
                        {indicators}
                    </Box>

                    <Box>
                        <Typography
                            variant="body2"
                            sx={{
                                fontWeight: 600,
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {name ?? '...'}
                        </Typography>
                        {this.renderTileStatus()}
                    </Box>
                </ButtonBase>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    renderWide(): React.JSX.Element {
        const { name } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const isDisabled = this.props.settings?.enabled === false;
        const indicators = this.renderIndicators();

        return (
            <Box sx={{ position: 'relative', gridColumn: 'span 2' }}>
                <Box
                    onClick={isDisabled ? undefined : () => this.onTileClick()}
                    sx={theme => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        width: '100%',
                        cursor: isDisabled ? 'default' : 'pointer',
                        overflow: 'hidden',
                        opacity: isDisabled ? 0.4 : 1,
                        ...getTileStyles(theme, isActive, accent),
                    })}
                >
                    <Box sx={{ flexShrink: 0 }}>{this.renderTileIcon()}</Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography
                                variant="body2"
                                sx={{
                                    fontWeight: 600,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {name ?? '...'}
                            </Typography>
                            {indicators}
                        </Box>
                        {this.renderTileStatus()}
                    </Box>

                    {this.renderTileAction()}
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    render(): React.JSX.Element {
        const size = this.props.settings?.size || this.props.size || '1x1';
        if (size === '2x1') {
            return this.renderWide();
        }
        return this.renderCompact();
    }
}

export default WidgetGeneric;
