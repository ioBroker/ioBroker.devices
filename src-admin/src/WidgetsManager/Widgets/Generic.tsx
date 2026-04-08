import React from 'react';
import {
    Box,
    ButtonBase,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    type SxProps,
    Tooltip,
    Typography,
} from '@mui/material';
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

import {
    WidgetGeneric as WidgetGenericBase,
    type WidgetGenericProps as WidgetGenericPropsBase,
    type WidgetSettingsBase,
} from '@iobroker/dm-widgets';
import type StateContext from '../StateContext';
import ChartDialog, { type ChartLineType } from './ChartDialog';

/** Generic settings used by WidgetGeneric base class */
export interface GenericWidgetSettings extends WidgetSettingsBase {
    /** Show trend arrow indicator based on recent history data */
    showTrendArrow?: boolean;
    /** Trend calculation period in minutes (default 30) */
    trendMinutes?: number;
}

export interface WidgetGenericProps<
    TSettings extends WidgetSettingsBase = GenericWidgetSettings,
> extends WidgetGenericPropsBase<TSettings> {
    /** Host's StateContext (superset of IStateContext) */
    stateContext: StateContext;
    /** Full widget settings (host's WidgetSettings + plugin-specific TSettings) */
    settings?: TSettings;
}

/**
 * Format a number for display, replacing '.' with ',' when isFloatComma is true.
 * Use ONLY for user-visible text — never for SVG paths, API calls, or CSS values.
 */
export function formatFloat(value: number, decimals: number, isFloatComma?: boolean): string {
    const str = value.toFixed(decimals);
    return isFloatComma ? str.replace('.', ',') : str;
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
    /** Resolved history ID if history is available, null otherwise */
    historyId: string | null;
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
    /** Chart line type synced from chart dialog settings */
    chartType: ChartLineType;
    /** Extra info entry whose chart dialog is currently open */
    infoChartEntry: ExtraInfoEntry | null;
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

/** Check if the current theme is the neumorphic "styling-grey" preset */
export function isNeumorphicTheme(theme: Theme): boolean {
    return (theme as Theme & { wmPreset?: string }).wmPreset === 'styling-grey';
}

export function getTileStyles(
    theme: Theme,
    isActive: boolean,
    accentColor?: string,
    interactive = true,
    inactiveColor?: string,
): Record<string, unknown> {
    const accent = accentColor || theme.palette.primary.main;
    const isDark = theme.palette.mode === 'dark';

    // Neumorphic styling for styling-grey theme
    if (isNeumorphicTheme(theme)) {
        return {
            borderRadius: '24px',
            boxSizing: 'border-box',
            padding: theme.spacing(2),
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            backgroundColor: isActive ? alpha(accent, 0.08) : 'linear-gradient(145deg, #1e1e20, #1a1a1c)',
            background: isActive
                ? `linear-gradient(145deg, ${alpha(accent, 0.1)}, ${alpha(accent, 0.04)})`
                : 'linear-gradient(145deg, #1e1e20, #1a1a1c)',
            border: `1px solid ${alpha(theme.palette.common.white, 0.04)}`,
            boxShadow: isActive
                ? `6px 6px 16px rgba(0,0,0,0.5), -3px -3px 10px rgba(255,255,255,0.025), inset 0 0 0 1px ${alpha(accent, 0.1)}`
                : '6px 6px 16px rgba(0,0,0,0.5), -3px -3px 10px rgba(255,255,255,0.025)',
            ...(interactive ? { '&:active': { transform: 'scale(0.97)' } } : {}),
        };
    }

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

export class WidgetGeneric<
    TState extends WidgetGenericState = WidgetGenericState,
    TSettings extends GenericWidgetSettings = GenericWidgetSettings,
> extends WidgetGenericBase<TState, TSettings> {
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

    constructor(props: WidgetGenericProps<TSettings>) {
        super(props);
        this.state = {
            name: null,
            icon: null,
            color: null,
            indicators: { ...DEFAULT_INDICATORS },
            chartSeries: [] as ChartSeries[],
            extraInfo: [] as ExtraInfoEntry[],
            infoDialogOpen: props.openDialogId === `${props.widget.id}_info`,
            chartDialogOpen: props.openDialogId === `${props.widget.id}_chart`,
            trend: null,
            chartType: 'line',
            infoChartEntry: null,
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
        this.loadChartType();
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

    componentDidUpdate(prevProps: Readonly<WidgetGenericProps<TSettings>>): void {
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

    static getDefaultSettings(): WidgetSettingsBase {
        return {
            size: '1x1',
            chartHours: 12,
            name: '',
            color: '',
            colorActive: '',
            showTrendArrow: false,
            trendMinutes: 30,
            favorite: false,
            icon: '',
            iconActive: '',
            text: '',
            textActive: '',
        };
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
        // Ensure history instance is resolved before checking history availability
        if (this.historyInstance === null) {
            if (this.props.defaultHistory) {
                this.historyInstance = this.props.defaultHistory;
            } else {
                try {
                    const cfg = await this.props.stateContext.getSocket().getObject('system.config');
                    this.historyInstance =
                        ((cfg?.common as unknown as Record<string, unknown>)?.defaultHistory as string) || '';
                } catch {
                    this.historyInstance = '';
                }
            }
        }

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
            let historyId: string | null = null;
            if (this.historyInstance) {
                historyId = await this.resolveHistoryId(id);
            }
            entries.push({ id, stateName, label, unit, value: null, historyId });
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
                      ? formatFloat(entry.value, 1, this.props.isFloatComma)
                      : formatFloat(entry.value, 2, this.props.isFloatComma);
            return entry.unit ? `${str} ${entry.unit}` : str;
        }
        return entry.unit ? `${entry.value} ${entry.unit}` : String(entry.value);
    }

    protected hasIndicatorStates(): boolean {
        return Object.keys(this.indicatorIds).length > 0;
    }

    private renderIndicatorRows(): React.JSX.Element[] {
        const { indicators } = this.state;
        const ids = this.indicatorIds;
        const rows: React.JSX.Element[] = [];

        const row = (key: string, label: string, value: string, color?: string): void => {
            rows.push(
                <Box
                    key={key}
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 0.75,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Typography
                        variant="body2"
                        sx={{ color: 'text.secondary' }}
                    >
                        {label}
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: color || undefined }}
                    >
                        {value}
                    </Typography>
                </Box>,
            );
        };

        if (ids.CONNECTED != null) {
            const ok = indicators.connected !== false;
            row(
                'connected',
                I18n.t('wm_Connected'),
                ok ? I18n.t('wm_Yes') : I18n.t('wm_No'),
                ok ? 'success.main' : 'error.main',
            );
        }

        if (ids.UNREACH != null) {
            row(
                'unreach',
                I18n.t('wm_Unreachable'),
                indicators.unreach ? I18n.t('wm_Yes') : I18n.t('wm_No'),
                indicators.unreach ? 'error.main' : 'success.main',
            );
        }

        if (ids.ERROR != null) {
            row(
                'error',
                I18n.t('wm_Error'),
                indicators.error || I18n.t('wm_No'),
                indicators.error ? 'error.main' : 'success.main',
            );
        }

        if (ids.BATTERY != null && indicators.battery != null) {
            const pct = Math.round(indicators.battery);
            const color = pct <= 10 ? 'error.main' : pct <= 30 ? 'warning.main' : 'success.main';
            row('battery', I18n.t('wm_Battery'), `${pct}%`, color);
        }

        if (ids.LOWBAT != null) {
            row(
                'lowbat',
                I18n.t('wm_Low battery'),
                indicators.lowbat ? I18n.t('wm_Yes') : I18n.t('wm_No'),
                indicators.lowbat ? 'warning.main' : 'success.main',
            );
        }

        if (ids.MAINTAIN != null) {
            row(
                'maintain',
                I18n.t('wm_Maintenance'),
                indicators.maintain ? I18n.t('wm_Yes') : I18n.t('wm_No'),
                indicators.maintain ? 'warning.main' : 'success.main',
            );
        }

        if (ids.WORKING != null) {
            row(
                'working',
                I18n.t('wm_Working'),
                indicators.working ? I18n.t('wm_Yes') : I18n.t('wm_No'),
                indicators.working ? 'info.main' : undefined,
            );
        }

        return rows;
    }

    private renderInfoChartDialog(): React.JSX.Element | null {
        const entry = this.state.infoChartEntry;
        if (!entry?.historyId || !this.historyInstance) {
            return null;
        }
        return (
            <ChartDialog
                open
                onClose={() => {
                    this.setState({ infoChartEntry: null } as Partial<TState> as TState);
                    this.loadChartType();
                }}
                title={entry.label}
                historyIds={[{ id: entry.historyId, color: this.getAccentColor() || '#2196f3', name: entry.label }]}
                historyInstance={this.historyInstance}
                socket={this.props.stateContext.getSocket()}
                unit={entry.unit}
                isFloatComma={this.props.isFloatComma}
                widgetId={String(this.props.widget.id)}
                instanceId={this.props.instanceId}
            />
        );
    }

    protected renderInfoDialog(): React.JSX.Element | null {
        const hasExtra = this.state.extraInfo.length > 0;
        const hasIndicators = this.hasIndicatorStates();
        if (!this.state.infoDialogOpen || (!hasExtra && !hasIndicators)) {
            return this.renderInfoChartDialog();
        }
        const indicatorRows = this.renderIndicatorRows();

        return (
            <>
                <Dialog
                    open
                    onClose={() => this.closeWidgetDialog('info')}
                    maxWidth="xs"
                    fullWidth
                >
                    <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
                        {this.props.settings?.name || this.state.name || '...'}
                        <IconButton
                            size="small"
                            onClick={() => this.closeWidgetDialog('info')}
                        >
                            <Close />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        {this.state.extraInfo.map(entry => {
                            const hasHistory = !!entry.historyId;
                            return (
                                <Box
                                    key={entry.id}
                                    data-state-id={entry.id}
                                    onClick={
                                        hasHistory
                                            ? () =>
                                                  this.setState({ infoChartEntry: entry } as Partial<TState> as TState)
                                            : undefined
                                    }
                                    sx={theme => ({
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        py: 0.75,
                                        px: 1,
                                        mx: -1,
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                        ...(hasHistory
                                            ? {
                                                  cursor: 'pointer',
                                                  borderRadius: '8px',
                                                  transition: 'background-color 0.15s',
                                                  '&:hover': {
                                                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                                  },
                                              }
                                            : {}),
                                    })}
                                >
                                    <Box>
                                        <Typography
                                            variant="body2"
                                            sx={theme => ({
                                                color: hasHistory ? theme.palette.primary.main : 'text.secondary',
                                                fontWeight: hasHistory ? 600 : 400,
                                            })}
                                        >
                                            {entry.label}
                                            {hasHistory ? ' ›' : ''}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: 'text.disabled',
                                                fontSize: '0.6rem',
                                                lineHeight: 1,
                                                display: 'block',
                                            }}
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
                            );
                        })}
                        {indicatorRows}
                    </DialogContent>
                </Dialog>
                {this.renderInfoChartDialog()}
            </>
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

    /** Open a dialog and persist it in the URL hash */
    protected openWidgetDialog(type: 'chart' | 'info'): void {
        const dialogId = `${this.props.widget.id}_${type}`;
        this.props.onOpenWidgetDialog?.(dialogId);
        if (type === 'chart') {
            this.openWidgetDialog('chart');
        } else {
            this.openWidgetDialog('info');
        }
    }

    /** Close a dialog and remove it from the URL hash */
    protected closeWidgetDialog(type: 'chart' | 'info'): void {
        this.props.onCloseWidgetDialog?.();
        if (type === 'chart') {
            this.setState({ chartDialogOpen: false } as Partial<TState> as TState);
        } else {
            this.setState({ infoDialogOpen: false } as Partial<TState> as TState);
        }
    }

    protected getAccentColor(): string | undefined {
        return this.props.settings?.colorActive || this.state.color || undefined;
    }

    protected getInactiveColor(): string | undefined {
        return this.props.settings?.color || undefined;
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
                    title={I18n.t('wm_Unreachable')}
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
                    title={I18n.t('wm_Disconnected')}
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
                    title={I18n.t('wm_Low battery')}
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
                    title={`${I18n.t('wm_Battery')}: ${pct}%`}
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
                    title={I18n.t('wm_Maintenance')}
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
                    title={I18n.t('wm_Up / Open')}
                >
                    <ArrowUpward sx={{ fontSize: sz, color: 'info.main' }} />
                </Tooltip>,
            );
        } else if ((indicators.direction === false && showBoolDir) || indicators.direction === 2) {
            items.push(
                <Tooltip
                    key="direction"
                    title={I18n.t('wm_Down / Close')}
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
                    title={I18n.t('wm_Working')}
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

    private loadChartType(): void {
        const widgetId = String(this.props.widget.id);
        const instanceId = this.props.instanceId;
        if (!widgetId || !instanceId) {
            return;
        }
        void this.props.stateContext
            .getSocket()
            .getObject(widgetId)
            .then(obj => {
                const custom = (obj?.common as Record<string, unknown>)?.custom as
                    | Record<string, Record<string, unknown>>
                    | undefined;
                const ct = custom?.[instanceId]?.chartType;
                if (ct && ['line', 'step-start', 'step-end'].includes(ct as string)) {
                    this.setState({ chartType: ct as ChartLineType } as Partial<TState> as TState);
                }
            })
            .catch(() => {
                // ignore
            });
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

            // Collect valid numeric points
            const points: { ts: number; val: number }[] = [];
            for (const p of result) {
                if (p.val != null && !isNaN(Number(p.val))) {
                    points.push({ ts: p.ts, val: Number(p.val) });
                }
            }
            if (points.length < 2) {
                return;
            }

            // Least-squares linear regression for robust trend detection
            const n = points.length;
            const t0 = points[0].ts;
            let sumX = 0;
            let sumY = 0;
            let sumXY = 0;
            let sumX2 = 0;
            for (const p of points) {
                const x = (p.ts - t0) / 60_000; // minutes
                sumX += x;
                sumY += p.val;
                sumXY += x * p.val;
                sumX2 += x * x;
            }
            const det = n * sumX2 - sumX * sumX;
            if (Math.abs(det) < 1e-12) {
                return;
            }
            const slope = (n * sumXY - sumY * sumX) / det; // value per minute
            const intercept = (sumY - slope * sumX) / n;
            const timeSpan = (points[n - 1].ts - t0) / 60_000;
            const totalChange = slope * timeSpan;

            // Standard deviation of residuals (noise level)
            let ssRes = 0;
            for (const p of points) {
                const x = (p.ts - t0) / 60_000;
                const res = p.val - (slope * x + intercept);
                ssRes += res * res;
            }
            const noiseStd = Math.sqrt(ssRes / Math.max(n - 2, 1));

            // Trend is significant if |totalChange| exceeds 2× noise and a minimum absolute threshold
            let trend: 'up' | 'down' | 'stable';
            if (Math.abs(totalChange) > Math.max(noiseStd * 2, 0.01)) {
                trend = totalChange > 0 ? 'up' : 'down';
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
                onClose={() => {
                    this.closeWidgetDialog('chart');
                    this.loadChartType();
                }}
                title={this.props.settings?.name || (this.state.name ?? '') || String(this.props.widget.id)}
                historyIds={historyIds}
                historyInstance={this.historyInstance}
                socket={this.props.stateContext.getSocket()}
                unit={this.getChartUnit()}
                isFloatComma={this.props.isFloatComma}
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

            const ct = this.state.chartType;
            let line: string;
            if (ct === 'step-start') {
                line = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
                for (let j = 1; j < pts.length; j++) {
                    line += `V${pts[j].y.toFixed(1)}H${pts[j].x.toFixed(1)}`;
                }
            } else if (ct === 'step-end') {
                line = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
                for (let j = 1; j < pts.length; j++) {
                    line += `H${pts[j].x.toFixed(1)}V${pts[j].y.toFixed(1)}`;
                }
            } else {
                line = pts.map((p, j) => `${j === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('');
            }
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
        const hasInfo = this.state.extraInfo.length > 0 || this.hasIndicatorStates();

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
                        sx={WidgetGeneric.getSettingButtonStyle()}
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
                            this.openWidgetDialog('info');
                        }}
                        onKeyDown={(e: React.KeyboardEvent) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                this.openWidgetDialog('info');
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

    static getStyleCompact(theme: Theme): React.CSSProperties {
        return {
            position: 'relative',
            containerType: 'inline-size',
            overflow: 'hidden',
            borderRadius: isNeumorphicTheme(theme) ? '24px' : '16px',
        };
    }

    static getStyleWide(theme: Theme): React.CSSProperties {
        const style = WidgetGeneric.getStyleCompact(theme);
        style.gridColumn = 'span 2';
        return style;
    }

    static getStyleWideTall(theme: Theme): React.CSSProperties {
        return WidgetGeneric.getStyleWide(theme);
    }

    static getSettingButtonStyle(): SxProps<Theme> {
        return (theme: Theme) => ({
            position: 'absolute',
            bottom: 6,
            right: 6,
            p: '3px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 2,
            color: theme.palette.primary.main,
            opacity: 0.6,
            transition: 'opacity 0.2s, background-color 0.2s',
            '&:hover': {
                opacity: 1,
                backgroundColor: theme.palette.action.hover,
            },
        });
    }
    // --- Frame rendering ---

    renderCompact(): React.JSX.Element {
        const { name } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const inactiveColor = this.getInactiveColor();
        // Skip tile indicators when info button is shown — they overlap in the same corner
        const hasInfoButton = this.state.extraInfo.length > 0 || this.hasIndicatorStates();
        const indicators = hasInfoButton ? null : this.renderIndicators();
        const trendArrow = this.renderTrendArrow();
        const chartAction = this.hasChartAction();
        const clickable = this.hasTileAction() || chartAction;

        return (
            <Box
                id={String(this.props.widget.id)}
                className={`${this.getWidgetClass()}`}
                sx={theme => WidgetGeneric.getStyleCompact(theme)}
            >
                <ButtonBase
                    component="div"
                    disabled={!clickable}
                    disableRipple={!clickable}
                    onClick={
                        clickable
                            ? () => (chartAction ? this.openWidgetDialog('chart') : this.onTileClick())
                            : undefined
                    }
                    sx={theme => {
                        const neu = isNeumorphicTheme(theme);
                        const pad = neu ? 'max(12px, 8cqi)' : 'max(16px, 10cqi)';
                        return {
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
                            padding: pad,
                        };
                    }}
                >
                    {indicators ? (
                        <Box
                            sx={theme => {
                                const pad = isNeumorphicTheme(theme) ? 'max(12px, 8cqi)' : 'max(16px, 10cqi)';
                                return { position: 'absolute', top: pad, right: pad, zIndex: 1 };
                            }}
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
                            sx={theme => ({
                                fontWeight: 600,
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                fontSize: 'max(0.875rem, 9cqi)',
                                ...(isNeumorphicTheme(theme)
                                    ? {
                                          textTransform: 'uppercase' as const,
                                          letterSpacing: '0.08em',
                                          fontSize: 'max(0.7rem, 7cqi)',
                                      }
                                    : {}),
                            })}
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
        const hasInfoButton = this.state.extraInfo.length > 0 || this.hasIndicatorStates();
        const indicators = hasInfoButton ? null : this.renderIndicators();
        const trendArrow = this.renderTrendArrow();
        const chartAction = this.hasChartAction();
        const clickable = this.hasTileAction() || chartAction;

        return (
            <Box
                id={String(this.props.widget.id)}
                className={`${this.getWidgetClass()}`}
                sx={theme => WidgetGeneric.getStyleWide(theme)}
            >
                <Box
                    onClick={
                        clickable
                            ? () => (chartAction ? this.openWidgetDialog('chart') : this.onTileClick())
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
                                sx={theme => ({
                                    fontWeight: 600,
                                    overflow: 'hidden',
                                    whiteSpace: 'nowrap',
                                    ...(isNeumorphicTheme(theme)
                                        ? {
                                              textTransform: 'uppercase' as const,
                                              letterSpacing: '0.08em',
                                              fontSize: '0.75rem',
                                          }
                                        : {}),
                                })}
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
        const hasInfoButton = this.state.extraInfo.length > 0 || this.hasIndicatorStates();
        const indicators = hasInfoButton ? null : this.renderIndicators();
        const trendArrow = this.renderTrendArrow();
        const chartAction = this.hasChartAction();
        const clickable = this.hasTileAction() || chartAction;

        return (
            <Box
                id={String(this.props.widget.id)}
                className={`${this.getWidgetClass()}`}
                sx={theme => WidgetGeneric.getStyleWideTall(theme)}
            >
                {/* Sizer: exactly 1 column wide with aspect-ratio 1 to match 1x1 tile height */}
                <Box sx={{ width: 'calc(50% - 6px)', aspectRatio: '1' }} />
                <ButtonBase
                    component="div"
                    disabled={!clickable}
                    disableRipple={!clickable}
                    onClick={
                        clickable
                            ? () => (chartAction ? this.openWidgetDialog('chart') : this.onTileClick())
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
                        padding: isNeumorphicTheme(theme) ? 'max(12px, 4cqi)' : 'max(16px, 5cqi)',
                    })}
                >
                    {indicators ? (
                        <Box
                            sx={theme => {
                                const pad = isNeumorphicTheme(theme) ? 'max(12px, 4cqi)' : 'max(16px, 5cqi)';
                                return { position: 'absolute', top: pad, right: pad, zIndex: 1 };
                            }}
                        >
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
                            sx={theme => ({
                                fontWeight: 600,
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                fontSize: 'max(0.875rem, 4.5cqi)',
                                ...(isNeumorphicTheme(theme)
                                    ? {
                                          textTransform: 'uppercase' as const,
                                          letterSpacing: '0.08em',
                                          fontSize: 'max(0.7rem, 3.5cqi)',
                                      }
                                    : {}),
                            })}
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
