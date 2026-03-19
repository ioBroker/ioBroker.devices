import React, { Component } from 'react';
import { Box, ButtonBase, Dialog, DialogContent, DialogTitle, IconButton, Tooltip, Typography } from '@mui/material';
import {
    ArrowDownward,
    ArrowUpward,
    BatteryAlert,
    Battery20,
    Battery50,
    Battery80,
    BatteryFull,
    Build,
    Close,
    Error as ErrorIcon,
    InfoOutlined,
    LinkOff,
    Settings,
    Sync,
    TrendingDown,
    TrendingFlat,
    TrendingUp,
    WifiOff,
} from '@mui/icons-material';
import { alpha, type Theme } from '@mui/material/styles';
import { I18n, Icon } from '@iobroker/adapter-react-v5';

import type { WidgetInfo } from '../../../../src/widget-utils';
import type StateContext from '../StateContext';
import ChartDialog from './ChartDialog';

export interface WidgetSettings {
    size: '1x1' | '2x0.5' | '2x1';
    chartHours: number;
    name: string;
    color: string;
    blindType: 'shutter' | 'curtain';
    pin: string;
    hideWhenOk: boolean;
    onBrightness: number;
    showCoordinates: boolean;
    /** Base64 data URI or predefined type name for map marker icon */
    markerIcon: string;
    /** Map tile theme: standard, dark, satellite */
    mapTheme: string;
    /** Slider visual type: normal, valve, fan, gauge */
    sliderType: string;
    /** Wide view slider style: horizontal (MUI slider) or round (arc knob) */
    wideSliderStyle: string;
    /** Show wave animation on tank widget */
    showAnimation: boolean;
    /** Image refresh interval in seconds (0 = no refresh) */
    refreshInterval: number;
    /** Append ?ts=timestamp to image URL for cache busting */
    appendTimestamp: boolean;
    /** Custom text shown when widget is in active/alarm state */
    textActive: string;
    /** Custom text shown when widget is in inactive/OK state */
    textInactive: string;
    /** Custom color for inactive state */
    colorInactive: string;
    /** Custom icon URL/base64 for active/alarm state */
    iconActive: string;
    /** Custom icon URL/base64 for inactive/OK state */
    iconInactive: string;
    /** Custom widget icon URL/base64 (for non-alarm widgets, stored in common.icon) */
    icon: string;
    /** Show trend arrow indicator based on recent history data */
    showTrendArrow: boolean;
    /** Trend calculation period in minutes (default 30) */
    trendMinutes: number;
}

export const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
    size: '1x1',
    chartHours: 12,
    name: '',
    color: '',
    blindType: 'shutter',
    pin: '',
    hideWhenOk: false,
    onBrightness: 100,
    showCoordinates: false,
    markerIcon: '',
    mapTheme: 'standard',
    sliderType: 'normal',
    wideSliderStyle: 'horizontal',
    showAnimation: true,
    refreshInterval: 0,
    appendTimestamp: false,
    textActive: '',
    textInactive: '',
    colorInactive: '',
    iconActive: '',
    iconInactive: '',
    icon: '',
    showTrendArrow: false,
    trendMinutes: 30,
};

export interface WidgetGenericProps {
    widget: WidgetInfo;
    language: ioBroker.Languages;
    stateContext: StateContext;
    size?: '1x1' | '2x0.5' | '2x1';
    settings?: WidgetSettings;
    onOpenSettings?: (widgetId: string | number) => void;
    /** Default history adapter instance (e.g. "history.0"), passed down to avoid repeated system.config reads */
    defaultHistory?: string;
    /** Adapter instance ID (e.g. "devices.0"), used to persist chart settings in custom */
    instanceId?: string;
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

export interface ChartSeries {
    data: { ts: number; val: number }[];
    color: string;
    name?: string;
    unit?: string;
}

export interface ExtraInfoEntry {
    id: string;
    stateName: string;
    label: string;
    unit: string;
    value: number | string | null;
}

export interface WidgetGenericState {
    name: string | null;
    icon: string | null;
    color: string | null;
    indicators: IndicatorValues;
    chartSeries: ChartSeries[];
    extraInfo: ExtraInfoEntry[];
    infoDialogOpen: boolean;
    chartDialogOpen: boolean;
    /** Trend direction based on recent history: 'up', 'down', 'stable', or null if unknown */
    trend: 'up' | 'down' | 'stable' | null;
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

/** Extra info state names — shown in "i" dialog when present on a device */
const EXTRA_INFO_NAMES = ['ELECTRIC_POWER', 'CURRENT', 'VOLTAGE', 'CONSUMPTION', 'FREQUENCY'] as const;

const EXTRA_INFO_LABELS: Record<string, string> = {
    ELECTRIC_POWER: 'wm_Power',
    CURRENT: 'wm_Current',
    VOLTAGE: 'wm_Voltage',
    CONSUMPTION: 'wm_Consumption',
    FREQUENCY: 'wm_Frequency',
};

export function getTileStyles(
    theme: Theme,
    isActive: boolean,
    accentColor?: string,
    interactive = true,
    inactiveColor?: string,
): Record<string, unknown> {
    const accent = accentColor || theme.palette.primary.main;
    const isDark = theme.palette.mode === 'dark';

    let bgInactive: string;
    let borderInactive: string;
    if (inactiveColor) {
        bgInactive = alpha(inactiveColor, 0.12);
        borderInactive = alpha(inactiveColor, 0.3);
    } else {
        bgInactive = isDark ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.035);
        borderInactive = isDark ? alpha(theme.palette.common.white, 0.08) : alpha(theme.palette.common.black, 0.08);
    }

    return {
        borderRadius: '16px',
        boxSizing: 'border-box',
        padding: theme.spacing(2),
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        backgroundColor: isActive ? alpha(accent, 0.12) : bgInactive,
        border: `1.5px solid ${isActive ? alpha(accent, 0.3) : borderInactive}`,
        ...(interactive ? { '&:active': { transform: 'scale(0.97)' } } : {}),
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
    /** Extra info state IDs (ELECTRIC_POWER, CURRENT, etc.) */
    private readonly extraInfoIds: { id: string; stateName: string }[] = [];
    /** common.states mapping for the ERROR indicator (numeric error codes → text) */
    private errorStatesMap: Record<string, string> | null = null;
    private historyInstance: string | null = null;
    private chartTimer: ReturnType<typeof setInterval> | null = null;
    private trendTimer: ReturnType<typeof setInterval> | null = null;
    protected nameRef = React.createRef<HTMLSpanElement>();

    constructor(props: WidgetGenericProps) {
        super(props);
        this.state = {
            name: null,
            icon: null,
            color: null,
            indicators: { ...DEFAULT_INDICATORS },
            chartSeries: [] as ChartSeries[],
            extraInfo: [] as ExtraInfoEntry[],
            infoDialogOpen: false,
            chartDialogOpen: false,
            trend: null,
        } as unknown as TState;

        // Collect indicator state IDs from control.states
        if (props.widget.control?.states) {
            for (const s of props.widget.control.states) {
                if ((INDICATOR_NAMES as readonly string[]).includes(s.name) && s.id) {
                    this.indicatorIds[s.name as (typeof INDICATOR_NAMES)[number]] = s.id;
                }
                if ((EXTRA_INFO_NAMES as readonly string[]).includes(s.name) && s.id) {
                    this.extraInfoIds.push({ id: s.id, stateName: s.name });
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

        // Load common.states mapping for ERROR indicator (numeric error codes)
        const errorId = this.indicatorIds.ERROR;
        if (errorId) {
            void this.props.stateContext
                .getSocket()
                .getObject(errorId)
                .then(obj => {
                    const statesMap = (obj as ioBroker.StateObject | null)?.common?.states;
                    if (statesMap && typeof statesMap === 'object') {
                        this.errorStatesMap = statesMap as Record<string, string>;
                    }
                });
        }

        // Load extra info states (ELECTRIC_POWER, CURRENT, etc.)
        if (this.extraInfoIds.length > 0) {
            void this.loadExtraInfoMetadata();
        }

        // Start chart data loading if configured
        this.startChartRefresh();
        this.startTrendRefresh();
        this.adjustNameFontSize();
    }

    componentWillUnmount(): void {
        if (this.chartTimer) {
            clearInterval(this.chartTimer);
            this.chartTimer = null;
        }
        if (this.trendTimer) {
            clearInterval(this.trendTimer);
            this.trendTimer = null;
        }
        for (const name of INDICATOR_NAMES) {
            const id = this.indicatorIds[name];
            if (id) {
                this.props.stateContext.removeState(id, this.onIndicatorChange);
            }
        }
        for (const entry of this.extraInfoIds) {
            this.props.stateContext.removeState(entry.id, this.onExtraInfoChange);
        }
    }

    componentDidUpdate(prevProps: Readonly<WidgetGenericProps>): void {
        const prevHours = prevProps.settings?.chartHours ?? 12;
        const newHours = this.props.settings?.chartHours ?? 12;
        if (prevHours !== newHours) {
            this.startChartRefresh();
        }
        if (
            !!prevProps.settings?.showTrendArrow !== !!this.props.settings?.showTrendArrow ||
            (prevProps.settings?.trendMinutes ?? 30) !== (this.props.settings?.trendMinutes ?? 30)
        ) {
            this.startTrendRefresh();
        }

        // Sync name/icon/color from widget props when they change
        const state: Partial<WidgetGenericState> = {};
        if (prevProps.widget.name !== this.props.widget.name) {
            if (this.props.widget.name && typeof this.props.widget.name === 'object') {
                if ((this.props.widget.name as ioBroker.Translated).en) {
                    state.name = this.getText(this.props.widget.name as ioBroker.Translated);
                }
            } else {
                state.name = this.props.widget.name || '';
            }
        }
        if (prevProps.widget.icon !== this.props.widget.icon) {
            if (typeof this.props.widget.icon === 'string') {
                state.icon = this.props.widget.icon || null;
            }
        }
        if (prevProps.widget.color !== this.props.widget.color) {
            if (typeof this.props.widget.color === 'string') {
                state.color = this.props.widget.color || null;
            }
        }
        if (Object.keys(state).length) {
            this.setState(state as TState);
        }

        this.adjustNameFontSize();
    }

    /** Shrink the name font so it fits on one line without truncation */
    protected adjustNameFontSize(): void {
        const el = this.nameRef.current;
        if (!el) {
            return;
        }
        // Reset to CSS-defined size before measuring
        el.style.fontSize = '';
        // With overflow:hidden, scrollWidth is the full content width, clientWidth is the visible area
        if (el.scrollWidth > el.clientWidth && el.clientWidth > 0) {
            const current = parseFloat(getComputedStyle(el).fontSize);
            el.style.fontSize = `${Math.floor(current * (el.clientWidth / el.scrollWidth))}px`;
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
                    const raw = state.val;
                    let val: string | null = null;
                    if (typeof raw === 'boolean') {
                        // boolean: true = error, false = ok
                        val = raw ? I18n.t('wm_Error') : null;
                    } else if (typeof raw === 'number') {
                        // number: 0 = no error, any other = error code
                        if (raw !== 0) {
                            val =
                                (this.errorStatesMap && this.errorStatesMap[String(raw)]) ||
                                `${I18n.t('wm_Error')} ${raw}`;
                        }
                    } else if (typeof raw === 'string') {
                        // string: non-empty = error text
                        val = raw || null;
                    }
                    if (indicators.error !== val) {
                        indicators.error = val;
                        changed = true;
                    }
                    break;
                }
                case 'DIRECTION': {
                    const val = typeof state.val === 'number' ? state.val : !!state.val;
                    if (indicators.direction !== val) {
                        indicators.direction = val;
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

    getText(text: ioBroker.StringOrTranslated): string {
        if (typeof text === 'object') {
            return text[this.props.language] || text.en;
        }

        return text;
    }

    // --- Extra info (ELECTRIC_POWER, CURRENT, VOLTAGE, etc.) ---

    private async loadExtraInfoMetadata(): Promise<void> {
        const entries: ExtraInfoEntry[] = [];
        for (const { id, stateName } of this.extraInfoIds) {
            const label = I18n.t(EXTRA_INFO_LABELS[stateName] || stateName);
            let unit = '';
            try {
                const obj = (await this.props.stateContext.getSocket().getObject(id)) as
                    | ioBroker.StateObject
                    | null
                    | undefined;
                if (obj?.common) {
                    unit = obj.common.unit || '';
                }
            } catch {
                // ignore
            }
            entries.push({ id, stateName, label, unit, value: null });
            this.props.stateContext.getState(id, this.onExtraInfoChange);
        }
        if (entries.length > 0) {
            this.setState({ extraInfo: entries } as Partial<TState> as TState);
        }
    }

    private onExtraInfoChange = (id: string, state: ioBroker.State): void => {
        this.setState(
            prev =>
                ({
                    extraInfo: prev.extraInfo.map(e =>
                        e.id === id ? { ...e, value: state.val as number | string | null } : e,
                    ),
                }) as Partial<TState> as TState,
        );
    };

    // eslint-disable-next-line class-methods-use-this
    private formatExtraInfoValue(entry: ExtraInfoEntry): string {
        if (entry.value == null) {
            return '—';
        }
        if (typeof entry.value === 'number') {
            const abs = Math.abs(entry.value);
            const str =
                abs >= 100
                    ? Math.round(entry.value).toString()
                    : abs >= 10
                      ? entry.value.toFixed(1)
                      : entry.value.toFixed(2);
            return entry.unit ? `${str} ${entry.unit}` : str;
        }
        return entry.unit ? `${entry.value} ${entry.unit}` : String(entry.value);
    }

    protected renderInfoDialog(): React.JSX.Element | null {
        if (!this.state.infoDialogOpen || !this.state.extraInfo.length) {
            return null;
        }
        return (
            <Dialog
                open
                onClose={() => this.setState({ infoDialogOpen: false } as Partial<TState> as TState)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
                    {this.props.settings?.name || this.state.name || '...'}
                    <IconButton
                        size="small"
                        onClick={() => this.setState({ infoDialogOpen: false } as Partial<TState> as TState)}
                    >
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    {this.state.extraInfo.map(entry => (
                        <Box
                            key={entry.id}
                            data-state-id={entry.id}
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                py: 0.75,
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                '&:last-child': { borderBottom: 'none' },
                            }}
                        >
                            <Box>
                                <Typography
                                    variant="body2"
                                    sx={{ color: 'text.secondary' }}
                                >
                                    {entry.label}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{ color: 'text.disabled', fontSize: '0.6rem', lineHeight: 1, display: 'block' }}
                                >
                                    {entry.id}
                                </Typography>
                            </Box>
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 600 }}
                            >
                                {this.formatExtraInfoValue(entry)}
                            </Typography>
                        </Box>
                    ))}
                </DialogContent>
            </Dialog>
        );
    }

    /** CSS class for the widget outer container, e.g. "widget-slider" */
    protected getWidgetClass(): string {
        const type = this.props.widget.control?.type || 'unknown';
        return `widget-${type}`;
    }

    // --- Overridable tile methods ---

    // eslint-disable-next-line class-methods-use-this
    protected isTileActive(): boolean {
        return false;
    }

    protected getAccentColor(): string | undefined {
        return this.props.settings?.color || this.state.color || undefined;
    }

    protected getInactiveColor(): string | undefined {
        return this.props.settings?.colorInactive || undefined;
    }

    // eslint-disable-next-line class-methods-use-this
    protected hasTileAction(): boolean {
        return false;
    }

    /** Whether this widget can open chart dialog on click (non-controllable with chart data) */
    protected hasChartAction(): boolean {
        return !this.hasTileAction() && this.state.chartSeries.length > 0;
    }

    // eslint-disable-next-line class-methods-use-this
    protected onTileClick(): void {
        // noop by default
    }

    /**
     * Returns the custom device icon if one is set, otherwise null.
     *  Subclasses that override renderTileIcon can call this to get the custom icon.
     */
    protected renderBaseIcon(): React.JSX.Element | null {
        const { icon } = this.state;
        const isActive = this.isTileActive();

        if (icon) {
            const accent = this.getAccentColor();
            const inactiveColor = this.getInactiveColor();
            return (
                <Icon
                    src={icon}
                    style={{
                        width: '1em',
                        height: '1em',
                        color: isActive ? accent || '#1976d2' : inactiveColor || 'grey',
                        transition: 'color 0.25s ease',
                    }}
                />
            );
        }
        return null;
    }

    protected renderTileIcon(): React.JSX.Element | null {
        return this.renderBaseIcon();
    }

    // eslint-disable-next-line class-methods-use-this
    protected renderTileStatus(): React.JSX.Element | null {
        return null;
    }

    // eslint-disable-next-line class-methods-use-this
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

        // Direction — boolean: true = up/open, false = down/close (only when working)
        //             enum: 0 = none, 1 = up/open, 2 = down/close, 3 = unknown
        const showBoolDir = typeof indicators.direction === 'boolean' && indicators.working;
        if ((indicators.direction === true && showBoolDir) || indicators.direction === 1) {
            items.push(
                <Tooltip
                    key="direction"
                    title="Up / Open"
                >
                    <ArrowUpward sx={{ fontSize: sz, color: 'info.main' }} />
                </Tooltip>,
            );
        } else if ((indicators.direction === false && showBoolDir) || indicators.direction === 2) {
            items.push(
                <Tooltip
                    key="direction"
                    title="Down / Close"
                >
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

    /** Renders a standalone trend arrow, bigger than indicators, intended for right-side vertical centering */
    protected renderTrendArrow(): React.JSX.Element | null {
        const { trend } = this.state;
        if (!trend) {
            return null;
        }

        const sz = 28;
        let icon: React.JSX.Element;
        if (trend === 'up') {
            icon = <TrendingUp sx={{ fontSize: sz, color: 'success.main' }} />;
        } else if (trend === 'down') {
            icon = <TrendingDown sx={{ fontSize: sz, color: 'error.main' }} />;
        } else {
            icon = <TrendingFlat sx={{ fontSize: sz, color: 'text.secondary' }} />;
        }

        const minutes = this.props.settings?.trendMinutes || 30;
        const label =
            trend === 'up'
                ? I18n.t('wm_Trend rising')
                : trend === 'down'
                  ? I18n.t('wm_Trend falling')
                  : I18n.t('wm_Trend stable');

        return <Tooltip title={`${label} (${minutes} min)`}>{icon}</Tooltip>;
    }

    // --- Chart ---

    /** Override in subclasses to provide state IDs for chart display */
    // eslint-disable-next-line class-methods-use-this
    protected getHistoryIds(): { id: string; color: string; name?: string }[] {
        return [];
    }

    /** Override in subclasses to provide the unit for chart tooltip */
    // eslint-disable-next-line class-methods-use-this
    protected getChartUnit(): string | undefined {
        return undefined;
    }

    private startChartRefresh(): void {
        if (this.chartTimer) {
            clearInterval(this.chartTimer);
            this.chartTimer = null;
        }
        const chartHours = this.props.settings?.chartHours ?? 12;
        const historyIds = this.getHistoryIds();
        if (chartHours > 0 && historyIds.length) {
            void this.loadChartData(historyIds);
            this.chartTimer = setInterval(() => void this.loadChartData(), 60_000);
        } else if (this.state.chartSeries.length) {
            this.setState({ chartSeries: [] as ChartSeries[] } as unknown as TState);
        }
    }

    /** Cache for resolved history IDs — avoids repeated object lookups on every chart refresh */
    private resolvedHistoryIds: Record<string, string | null> = {};

    /** Returns the ID to use for history queries, resolving aliases if needed */
    private async resolveHistoryId(stateId: string): Promise<string | null> {
        if (stateId in this.resolvedHistoryIds) {
            return this.resolvedHistoryIds[stateId];
        }
        try {
            const obj = await this.props.stateContext.getObject<ioBroker.StateObject>(stateId);
            if (!obj) {
                this.resolvedHistoryIds[stateId] = null;
                return null;
            }
            if (obj.common?.custom?.[this.historyInstance!]?.enabled) {
                this.resolvedHistoryIds[stateId] = stateId;
                return stateId;
            }
            // Follow alias to target
            const aliasId = obj.common?.alias?.id;
            if (aliasId) {
                const targetId = typeof aliasId === 'object' ? aliasId.read : aliasId;
                if (targetId && targetId !== stateId) {
                    const targetObj = await this.props.stateContext.getObject<ioBroker.StateObject>(targetId);
                    if (targetObj?.common?.custom?.[this.historyInstance!]?.enabled) {
                        this.resolvedHistoryIds[stateId] = targetId;
                        return targetId;
                    }
                }
            }
        } catch {
            // ignore
        }
        this.resolvedHistoryIds[stateId] = null;
        return null;
    }

    private async loadChartData(historyIds?: { id: string; color: string; name?: string }[]): Promise<void> {
        historyIds ||= this.getHistoryIds();
        const chartHours = this.props.settings?.chartHours ?? 12;
        if (!historyIds.length || chartHours <= 0) {
            return;
        }

        const socket = this.props.stateContext.getSocket();

        if (this.historyInstance === null) {
            if (this.props.defaultHistory) {
                this.historyInstance = this.props.defaultHistory;
            } else {
                try {
                    const sysConfig =
                        await this.props.stateContext.getObject<ioBroker.SystemConfigObject>('system.config');
                    this.historyInstance = sysConfig?.common?.defaultHistory || '';
                } catch {
                    this.historyInstance = '';
                }
            }
        }
        if (!this.historyInstance) {
            return;
        }

        const end = Date.now();
        const start = end - chartHours * 3_600_000;
        const aggregate = chartHours > 6 ? 'minmax' : 'none';

        const series: ChartSeries[] = [];
        for (const { id, color, name } of historyIds) {
            try {
                // Resolve alias: if state has no history, check alias target
                const historyId = await this.resolveHistoryId(id);
                if (!historyId) {
                    continue;
                }
                const result = await socket.getHistory(historyId, {
                    instance: this.historyInstance,
                    start,
                    end,
                    from: false,
                    ack: false,
                    q: false,
                    addId: false,
                    aggregate,
                    returnNewestEntries: true,
                });
                const data: { ts: number; val: number }[] = [];
                if (Array.isArray(result)) {
                    for (const p of result) {
                        if (p.val != null && !isNaN(Number(p.val))) {
                            data.push({ ts: p.ts, val: Number(p.val) });
                        }
                    }
                }
                series.push({ data, color, name });
            } catch (e) {
                console.warn(`Failed to load history for ${id}:`, e);
            }
        }

        this.setState({ chartSeries: series } as Partial<TState> as TState);
    }

    // --- Trend arrow ---

    private startTrendRefresh(): void {
        if (this.trendTimer) {
            clearInterval(this.trendTimer);
            this.trendTimer = null;
        }
        if (!this.props.settings?.showTrendArrow) {
            if (this.state.trend != null) {
                this.setState({ trend: null } as Partial<TState> as TState);
            }
            return;
        }
        const historyIds = this.getHistoryIds();
        if (!historyIds.length) {
            return;
        }
        void this.loadTrend(historyIds[0].id);
        this.trendTimer = setInterval(() => void this.loadTrend(historyIds[0].id), 120_000);
    }

    /** Load recent history for the primary state and compute trend direction */
    private async loadTrend(stateId: string): Promise<void> {
        // Ensure history instance is resolved
        if (this.historyInstance === null) {
            if (this.props.defaultHistory) {
                this.historyInstance = this.props.defaultHistory;
            } else {
                try {
                    const sysConfig =
                        await this.props.stateContext.getObject<ioBroker.SystemConfigObject>('system.config');
                    this.historyInstance = sysConfig?.common?.defaultHistory || '';
                } catch {
                    this.historyInstance = '';
                }
            }
        }
        if (!this.historyInstance) {
            return;
        }

        const historyId = await this.resolveHistoryId(stateId);
        if (!historyId) {
            return;
        }

        const end = Date.now();
        const minutes = this.props.settings?.trendMinutes || 30;
        const start = end - minutes * 60_000;
        try {
            const result = await this.props.stateContext.getSocket().getHistory(historyId, {
                instance: this.historyInstance,
                start,
                end,
                from: false,
                ack: false,
                q: false,
                addId: false,
                aggregate: 'none',
                returnNewestEntries: true,
            });
            if (!Array.isArray(result) || result.length < 2) {
                return;
            }

            // Use first and last valid points to determine trend
            const points: { ts: number; val: number }[] = [];
            for (const p of result) {
                if (p.val != null && !isNaN(Number(p.val))) {
                    points.push({ ts: p.ts, val: Number(p.val) });
                }
            }
            if (points.length < 2) {
                return;
            }

            const first = points[0];
            const last = points[points.length - 1];
            const range = Math.abs(last.val) > 0.0001 ? Math.abs(last.val) : 1;
            const delta = (last.val - first.val) / range;

            let trend: 'up' | 'down' | 'stable';
            if (delta > 0.01) {
                trend = 'up';
            } else if (delta < -0.01) {
                trend = 'down';
            } else {
                trend = 'stable';
            }

            if (trend !== this.state.trend) {
                this.setState({ trend } as Partial<TState> as TState);
            }
        } catch {
            // ignore
        }
    }

    protected renderChartDialog(): React.JSX.Element | null {
        if (!this.state.chartDialogOpen || !this.historyInstance) {
            return null;
        }
        const historyIds = this.getHistoryIds();
        if (!historyIds.length) {
            return null;
        }
        return (
            <ChartDialog
                open
                onClose={() => this.setState({ chartDialogOpen: false } as Partial<TState> as TState)}
                title={this.props.settings?.name || (this.state.name ?? '') || String(this.props.widget.id)}
                historyIds={historyIds}
                historyInstance={this.historyInstance}
                socket={this.props.stateContext.getSocket()}
                unit={this.getChartUnit()}
                widgetId={String(this.props.widget.id)}
                instanceId={this.props.instanceId}
            />
        );
    }

    protected renderChart(): React.JSX.Element | null {
        const { chartSeries } = this.state;
        if (!chartSeries?.length) {
            return null;
        }
        const chartHours = this.props.settings?.chartHours ?? 12;
        if (chartHours <= 0) {
            return null;
        }

        const end = Date.now();
        const start = end - chartHours * 3_600_000;
        const W = 200;
        const H = 60;

        const paths: React.JSX.Element[] = [];
        for (let i = 0; i < chartSeries.length; i++) {
            const s = chartSeries[i];
            if (s.data.length < 2) {
                continue;
            }
            let min = Infinity;
            let max = -Infinity;
            for (const p of s.data) {
                if (p.val < min) {
                    min = p.val;
                }
                if (p.val > max) {
                    max = p.val;
                }
            }
            const range = max - min || 1;
            const padMin = min - range * 0.1;
            const padRange = max + range * 0.1 - padMin;

            const pts = s.data.map(p => ({
                x: ((p.ts - start) / (end - start)) * W,
                y: H - ((p.val - padMin) / padRange) * H,
            }));

            const line = pts.map((p, j) => `${j === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
            const lastX = pts[pts.length - 1].x.toFixed(1);
            const firstX = pts[0].x.toFixed(1);

            paths.push(
                <React.Fragment key={i}>
                    <path
                        d={`${line} L${lastX},${H} L${firstX},${H} Z`}
                        fill={s.color}
                        opacity={0.15}
                    />
                    <path
                        d={line}
                        fill="none"
                        stroke={s.color}
                        strokeWidth="1.5"
                        opacity={0.4}
                    />
                </React.Fragment>,
            );
        }

        if (!paths.length) {
            return null;
        }

        return (
            <Box
                sx={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: '40%',
                    overflow: 'hidden',
                    borderRadius: '0 0 14px 14px',
                    pointerEvents: 'none',
                }}
            >
                <svg
                    viewBox={`0 0 ${W} ${H}`}
                    preserveAspectRatio="none"
                    style={{ width: '100%', height: '100%', display: 'block' }}
                >
                    {paths}
                </svg>
            </Box>
        );
    }

    // --- Settings button ---

    protected renderSettingsButton(): React.JSX.Element | null {
        const hasSettings = !!this.props.onOpenSettings;
        const hasInfo = this.state.extraInfo.length > 0;

        if (!hasSettings && !hasInfo) {
            return null;
        }

        return (
            <>
                {hasSettings ? (
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
                ) : null}
                {hasInfo ? (
                    <Box
                        component="span"
                        role="button"
                        tabIndex={0}
                        onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            this.setState({ infoDialogOpen: true } as Partial<TState> as TState);
                        }}
                        onKeyDown={(e: React.KeyboardEvent) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                this.setState({ infoDialogOpen: true } as Partial<TState> as TState);
                            }
                        }}
                        sx={theme => ({
                            position: 'absolute',
                            top: 6,
                            right: hasSettings ? 30 : 6,
                            p: '3px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 1,
                            color: theme.palette.info.main,
                            opacity: 0.5,
                            transition: 'opacity 0.2s, background-color 0.2s',
                            '&:hover': {
                                opacity: 1,
                                backgroundColor: theme.palette.action.hover,
                            },
                        })}
                    >
                        <InfoOutlined sx={{ fontSize: 16 }} />
                    </Box>
                ) : null}
                {this.renderInfoDialog()}
            </>
        );
    }

    // --- Frame rendering ---

    renderCompact(): React.JSX.Element {
        const { name } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const inactiveColor = this.getInactiveColor();
        const indicators = this.renderIndicators();
        const trendArrow = this.renderTrendArrow();
        const chartAction = this.hasChartAction();
        const clickable = this.hasTileAction() || chartAction;

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={{ position: 'relative', containerType: 'inline-size', overflow: 'hidden' }}
            >
                <ButtonBase
                    component="div"
                    disabled={!clickable}
                    disableRipple={!clickable}
                    onClick={
                        clickable
                            ? () =>
                                  chartAction
                                      ? this.setState({ chartDialogOpen: true } as Partial<TState> as TState)
                                      : this.onTileClick()
                            : undefined
                    }
                    sx={theme => ({
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'stretch',
                        width: '100%',
                        aspectRatio: '1',
                        textAlign: 'left',
                        overflow: 'hidden',
                        cursor: clickable ? 'pointer' : 'default',
                        ...getTileStyles(theme, isActive, accent, true, inactiveColor),
                        ...(!clickable && { '&:active': { transform: 'none' } }),
                        padding: 'max(16px, 10cqi)',
                    })}
                >
                    {indicators ? (
                        <Box
                            sx={{ position: 'absolute', top: 'max(16px, 10cqi)', right: 'max(16px, 10cqi)', zIndex: 1 }}
                        >
                            {indicators}
                        </Box>
                    ) : null}
                    {trendArrow ? (
                        <Box
                            sx={{
                                position: 'absolute',
                                right: 'max(8px, 5cqi)',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                zIndex: 1,
                                opacity: 0.85,
                                '& .MuiSvgIcon-root': { fontSize: 'max(24px, 16cqi) !important' },
                            }}
                        >
                            {trendArrow}
                        </Box>
                    ) : null}

                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flex: 1,
                            fontSize: 'max(48px, 32cqi)',
                            '& .MuiSvgIcon-root': { fontSize: 'inherit !important' },
                            '& img': { width: '1em !important', height: '1em !important' },
                        }}
                    >
                        {this.renderTileIcon()}
                    </Box>

                    <Box>
                        <Typography
                            ref={this.nameRef}
                            variant="body2"
                            sx={{
                                fontWeight: 600,
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                fontSize: 'max(0.875rem, 9cqi)',
                            }}
                        >
                            {this.props.settings?.name || name || '...'}
                        </Typography>
                        {this.renderTileStatus()}
                    </Box>
                    {this.renderChart()}
                </ButtonBase>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    renderWide(): React.JSX.Element {
        const { name } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const inactiveColor = this.getInactiveColor();
        const indicators = this.renderIndicators();
        const trendArrow = this.renderTrendArrow();
        const chartAction = this.hasChartAction();
        const clickable = this.hasTileAction() || chartAction;

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={{ position: 'relative', gridColumn: 'span 2', containerType: 'inline-size', overflow: 'hidden' }}
            >
                <Box
                    onClick={
                        clickable
                            ? () =>
                                  chartAction
                                      ? this.setState({ chartDialogOpen: true } as Partial<TState> as TState)
                                      : this.onTileClick()
                            : undefined
                    }
                    sx={theme => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        width: '100%',
                        height: 80,
                        position: 'relative',
                        cursor: clickable ? 'pointer' : 'default',
                        overflow: 'hidden',
                        ...getTileStyles(theme, isActive, accent, true, inactiveColor),
                        ...(!clickable && { '&:active': { transform: 'none' } }),
                    })}
                >
                    <Box
                        sx={{
                            flexShrink: 0,
                            fontSize: 'max(32px, 10cqi)',
                            '& .MuiSvgIcon-root': { fontSize: 'inherit !important' },
                            '& img': { width: '1em !important', height: '1em !important' },
                        }}
                    >
                        {this.renderTileIcon()}
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography
                                ref={this.nameRef}
                                variant="body2"
                                sx={{
                                    fontWeight: 600,
                                    overflow: 'hidden',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {this.props.settings?.name || name || '...'}
                            </Typography>
                            {indicators}
                        </Box>
                        {this.renderTileStatus()}
                    </Box>

                    {trendArrow ? (
                        <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', opacity: 0.85 }}>
                            {trendArrow}
                        </Box>
                    ) : null}
                    {this.renderTileAction()}
                    {this.renderChart()}
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    renderWideTall(): React.JSX.Element {
        const { name } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const inactiveColor = this.getInactiveColor();
        const indicators = this.renderIndicators();
        const trendArrow = this.renderTrendArrow();
        const chartAction = this.hasChartAction();
        const clickable = this.hasTileAction() || chartAction;

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={{ position: 'relative', gridColumn: 'span 2', containerType: 'inline-size', overflow: 'hidden' }}
            >
                {/* Sizer: exactly 1 column wide with aspect-ratio 1 to match 1x1 tile height */}
                <Box sx={{ width: 'calc(50% - 6px)', aspectRatio: '1' }} />
                <ButtonBase
                    component="div"
                    disabled={!clickable}
                    disableRipple={!clickable}
                    onClick={
                        clickable
                            ? () =>
                                  chartAction
                                      ? this.setState({ chartDialogOpen: true } as Partial<TState> as TState)
                                      : this.onTileClick()
                            : undefined
                    }
                    sx={theme => ({
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 2,
                        width: '100%',
                        height: '100%',
                        textAlign: 'left',
                        overflow: 'hidden',
                        cursor: clickable ? 'pointer' : 'default',
                        ...getTileStyles(theme, isActive, accent, true, inactiveColor),
                        ...(!clickable && { '&:active': { transform: 'none' } }),
                        padding: 'max(16px, 5cqi)',
                    })}
                >
                    {indicators ? (
                        <Box sx={{ position: 'absolute', top: 'max(16px, 5cqi)', right: 'max(16px, 5cqi)', zIndex: 1 }}>
                            {indicators}
                        </Box>
                    ) : null}

                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontSize: 'max(48px, 16cqi)',
                            '& .MuiSvgIcon-root': { fontSize: 'inherit !important' },
                            '& img': { width: '1em !important', height: '1em !important' },
                        }}
                    >
                        {this.renderTileIcon()}
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                            ref={this.nameRef}
                            variant="body2"
                            sx={{
                                fontWeight: 600,
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                fontSize: 'max(0.875rem, 4.5cqi)',
                            }}
                        >
                            {this.props.settings?.name || name || '...'}
                        </Typography>
                        {this.renderTileStatus()}
                    </Box>

                    {trendArrow ? (
                        <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', opacity: 0.85 }}>
                            {trendArrow}
                        </Box>
                    ) : null}
                    {this.renderTileAction()}
                    {this.renderChart()}
                </ButtonBase>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    render(): React.JSX.Element {
        const size = this.props.settings?.size || this.props.size || '1x1';
        let widget: React.JSX.Element;
        if (size === '2x0.5') {
            widget = this.renderWide();
        } else if (size === '2x1') {
            widget = this.renderWideTall();
        } else {
            widget = this.renderCompact();
        }
        const chartDialog = this.renderChartDialog();
        if (chartDialog) {
            return (
                <>
                    {widget}
                    {chartDialog}
                </>
            );
        }
        return widget;
    }
}

export default WidgetGeneric;
