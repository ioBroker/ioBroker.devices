import React from 'react';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography, type Theme } from '@mui/material';
import {
    Air,
    BatteryChargingFull,
    BatteryFull,
    Bolt,
    Close,
    ElectricalServices,
    LocalFireDepartment,
    Lightbulb,
    Power,
    PowerInput,
    WbSunny,
} from '@mui/icons-material';
import { I18n, Icon } from '@iobroker/adapter-react-v5';
import type { ConfigItemAny, ConfigItemPanel, ConfigItemTable } from '@iobroker/json-config';

import type { CustomWidgetBase } from '@iobroker/dm-widgets';

import type { StateChangeListener } from '../StateContext';
import WidgetGeneric, { type WidgetGenericProps, type WidgetGenericState, formatFloat } from './Generic';
import ChartDialog from './ChartDialog';

/** A single configurable producer/consumer row */
interface EnergyEntry {
    /** Stable id for React keys (auto-generated if missing) */
    id?: string;
    stateId?: string;
    name?: string;
    color?: string;
    icon?: string;
    deviceType?: string;
    unit?: string;
}

export interface WidgetEnergyFlowSettings extends CustomWidgetBase {
    producers?: EnergyEntry[];
    consumers?: EnergyEntry[];
    batterySocStateId?: string;
    batteryVoltageStateId?: string;
    batteryCurrentStateId?: string;
    batteryPowerStateId?: string;
    batteryName?: string;
    batteryColor?: string;
    batteryIcon?: string;
}

/** Per-state runtime data (current value, history info, sampled history points) */
interface EntryRuntime {
    val: number | null;
    unit: string;
    historyId: string | null;
    historyInstance: string;
    bars: { ts: number; val: number }[];
}

/** Identifies the tile clicked → which state to show in the chart dialog */
interface ChartTarget {
    stateId: string;
    historyId: string | null;
    historyInstance: string;
    name: string;
    color: string;
    unit: string;
}

interface WidgetEnergyFlowState extends WidgetGenericState {
    producerRt: EntryRuntime[];
    consumerRt: EntryRuntime[];
    batterySoc: number | null;
    batteryVoltage: number | null;
    batteryCurrent: number | null;
    batteryPower: number | null;
    batterySocHistoryId: string | null;
    batterySocHistoryInstance: string;
    chartTarget: ChartTarget | null;
    /** Energy-flow detail dialog (the full producers/consumers/battery layout) */
    flowDialogOpen: boolean;
}

const PRODUCER_TYPES = [
    { value: 'solar', label: 'wm_dt_solar' },
    { value: 'wind', label: 'wm_dt_wind' },
    { value: 'grid', label: 'wm_dt_grid' },
    { value: 'generator', label: 'wm_dt_generator' },
    { value: 'other', label: 'wm_dt_other' },
];

const CONSUMER_TYPES = [
    { value: 'ac', label: 'wm_dt_ac' },
    { value: 'dc', label: 'wm_dt_dc' },
    { value: 'heater', label: 'wm_dt_heater' },
    { value: 'light', label: 'wm_dt_light' },
    { value: 'other', label: 'wm_dt_other' },
];

const PRODUCER_DEFAULT_COLOR: Record<string, string> = {
    solar: '#ffb300',
    wind: '#42a5f5',
    grid: '#90a4ae',
    generator: '#ef5350',
    other: '#2196f3',
};

const CONSUMER_DEFAULT_COLOR: Record<string, string> = {
    ac: '#7986cb',
    dc: '#26a69a',
    heater: '#ef6c00',
    light: '#ffd600',
    other: '#90a4ae',
};

const ACCENT = '#3aa3ff';

function defaultProducerIcon(kind: string | undefined): React.JSX.Element {
    const sx = { fontSize: 'inherit', color: 'inherit' };
    switch (kind) {
        case 'solar':
            return <WbSunny sx={sx} />;
        case 'wind':
            return <Air sx={sx} />;
        case 'grid':
            return <ElectricalServices sx={sx} />;
        case 'generator':
            return <Bolt sx={sx} />;
        default:
            return <Bolt sx={sx} />;
    }
}

function defaultConsumerIcon(kind: string | undefined): React.JSX.Element {
    const sx = { fontSize: 'inherit', color: 'inherit' };
    switch (kind) {
        case 'ac':
            return <Power sx={sx} />;
        case 'dc':
            return <PowerInput sx={sx} />;
        case 'heater':
            return <LocalFireDepartment sx={sx} />;
        case 'light':
            return <Lightbulb sx={sx} />;
        default:
            return <Power sx={sx} />;
    }
}

function entryColor(entry: EnergyEntry, fallbackMap: Record<string, string>): string {
    return entry.color || fallbackMap[entry.deviceType || 'other'] || ACCENT;
}

export class WidgetEnergyFlow extends WidgetGeneric<WidgetEnergyFlowState, WidgetEnergyFlowSettings> {
    static getConfigSchema(): ConfigItemPanel {
        const tableColumns = (typeOptions: { value: string; label: string }[]): ConfigItemTable['items'] => [
            { attr: 'stateId', type: 'objectId', title: 'wm_State ID', filter: false, sort: false },
            { attr: 'name', type: 'text', title: 'wm_Name', filter: false, sort: false },
            {
                attr: 'deviceType',
                type: 'select',
                title: 'wm_Device type',
                options: typeOptions,
                default: typeOptions[0].value,
            },
            { attr: 'color', type: 'color', title: 'wm_Color' },
            { attr: 'icon', type: 'component', subType: 'iconSelect', title: 'wm_Icon' },
        ];
        // type:'table' keeps Export/Import OFF by default (opt-in via `export`/`import` flags),
        // unlike accordion where those buttons are unconditionally present.
        const producerTable: ConfigItemTable & { attr: string } = {
            type: 'table',
            label: 'wm_Producers',
            help: 'wm_Producers help',
            attr: 'producers',
            titleAttribute: 'name',
            useCardFor: ['xs', 'sm'],
            items: tableColumns(PRODUCER_TYPES),
        };
        const consumerTable: ConfigItemTable & { attr: string } = {
            type: 'table',
            attr: 'consumers',
            label: 'wm_Consumers',
            help: 'wm_Consumers help',
            titleAttribute: 'name',
            useCardFor: ['xs', 'sm'],
            items: tableColumns(CONSUMER_TYPES),
        };
        const batteryPanel: ConfigItemAny = {
            type: 'panel',
            label: 'wm_Battery',
            collapsable: true,
            items: {
                batterySocStateId: { type: 'objectId', label: 'wm_Battery SoC (%)' },
                batteryPowerStateId: { type: 'objectId', label: 'wm_Battery power (W)' },
                batteryVoltageStateId: { type: 'objectId', label: 'wm_Battery voltage (V)', sm: 6 },
                batteryCurrentStateId: { type: 'objectId', label: 'wm_Battery current (A)', sm: 6 },
                batteryName: { type: 'text', label: 'wm_Battery name', default: '' },
                batteryColor: { type: 'color', label: 'wm_Battery color', sm: 6 },
                batteryIcon: { type: 'component', subType: 'iconSelect', label: 'wm_Battery icon', sm: 6 },
            },
        };
        return {
            type: 'panel',
            label: 'wm_EnergyFlow',
            items: {
                _producers: {
                    type: 'panel',
                    collapsable: true,
                    label: 'wm_Producers',
                    xs: 12,
                    items: {
                        producers: producerTable,
                    },
                },
                _consumers: {
                    type: 'panel',
                    xs: 12,
                    collapsable: true,
                    label: 'wm_Consumers',
                    items: {
                        consumers: consumerTable,
                    },
                },
                _batteryPanel: batteryPanel,
                chartHours: {
                    type: 'number',
                    label: 'wm_Chart hours',
                    default: 12,
                    min: 1,
                    max: 168,
                },
            },
        };
    }

    /** Per-entry change listeners — key is `${kind}:${index}:${field}` */
    private listeners = new Map<string, { stateId: string; handler: StateChangeListener }>();

    /** Pending history-load promises to allow cancellation on unmount */
    private mounted = false;

    constructor(props: WidgetGenericProps<WidgetEnergyFlowSettings>) {
        super(props);
        this.state = {
            ...this.state,
            producerRt: [],
            consumerRt: [],
            batterySoc: null,
            batteryVoltage: null,
            batteryCurrent: null,
            batteryPower: null,
            batterySocHistoryId: null,
            batterySocHistoryInstance: '',
            chartTarget: null,
            flowDialogOpen: false,
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.mounted = true;
        this.subscribeAll();
    }

    componentDidUpdate(prev: WidgetGenericProps<WidgetEnergyFlowSettings>): void {
        const prevP = JSON.stringify(prev.settings.producers || []);
        const newP = JSON.stringify(this.props.settings.producers || []);
        const prevC = JSON.stringify(prev.settings.consumers || []);
        const newC = JSON.stringify(this.props.settings.consumers || []);
        const battChanged =
            prev.settings.batterySocStateId !== this.props.settings.batterySocStateId ||
            prev.settings.batteryVoltageStateId !== this.props.settings.batteryVoltageStateId ||
            prev.settings.batteryCurrentStateId !== this.props.settings.batteryCurrentStateId ||
            prev.settings.batteryPowerStateId !== this.props.settings.batteryPowerStateId;
        if (prevP !== newP || prevC !== newC || battChanged) {
            this.unsubscribeAll();
            this.subscribeAll();
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        this.mounted = false;
        this.unsubscribeAll();
    }

    private unsubscribeAll(): void {
        const ctx = this.props.stateContext;
        if (!ctx) {
            return;
        }
        for (const { stateId, handler } of this.listeners.values()) {
            ctx.removeState(stateId, handler);
        }
        this.listeners.clear();
    }

    private subscribeOne(key: string, stateId: string, onValue: (val: number | null) => void): void {
        const ctx = this.props.stateContext;
        if (!ctx || !stateId) {
            return;
        }
        const handler: StateChangeListener = (_id, state) => {
            const raw = state?.val;
            const num = raw == null ? null : Number(raw);
            onValue(num != null && Number.isFinite(num) ? num : null);
        };
        ctx.getState(stateId, handler);
        this.listeners.set(key, { stateId, handler });
    }

    private subscribeAll(): void {
        const producers = this.props.settings.producers || [];
        const consumers = this.props.settings.consumers || [];
        const ctx = this.props.stateContext;
        if (!ctx) {
            return;
        }

        // Init runtime arrays sized to the entry lists, then patch values via setState.
        this.setState({
            producerRt: producers.map(() => ({
                val: null,
                unit: '',
                historyId: null,
                historyInstance: '',
                bars: [],
            })),
            consumerRt: consumers.map(() => ({
                val: null,
                unit: '',
                historyId: null,
                historyInstance: '',
                bars: [],
            })),
            batterySoc: null,
            batteryVoltage: null,
            batteryCurrent: null,
            batteryPower: null,
            batterySocHistoryId: null,
            batterySocHistoryInstance: '',
        });

        const subscribeEntry = (kind: 'p' | 'c', idx: number, entry: EnergyEntry): void => {
            if (!entry.stateId) {
                return;
            }
            this.subscribeOne(`${kind}:${idx}`, entry.stateId, val =>
                this.setState(prev => {
                    const arr = (kind === 'p' ? prev.producerRt : prev.consumerRt).slice();
                    if (arr[idx]) {
                        arr[idx] = { ...arr[idx], val };
                    }
                    return (kind === 'p' ? { producerRt: arr } : { consumerRt: arr }) as unknown as Pick<
                        WidgetEnergyFlowState,
                        'producerRt' | 'consumerRt'
                    >;
                }),
            );
            // Lazily fetch the unit + resolve history.
            void this.resolveEntryMeta(kind, idx, entry.stateId);
        };

        producers.forEach((p, i) => subscribeEntry('p', i, p));
        consumers.forEach((c, i) => subscribeEntry('c', i, c));

        // Battery
        if (this.props.settings.batterySocStateId) {
            this.subscribeOne('b:soc', this.props.settings.batterySocStateId, val =>
                this.setState({ batterySoc: val }),
            );
            void this.resolveBatterySocHistory(this.props.settings.batterySocStateId);
        }
        if (this.props.settings.batteryVoltageStateId) {
            this.subscribeOne('b:v', this.props.settings.batteryVoltageStateId, val =>
                this.setState({ batteryVoltage: val }),
            );
        }
        if (this.props.settings.batteryCurrentStateId) {
            this.subscribeOne('b:i', this.props.settings.batteryCurrentStateId, val =>
                this.setState({ batteryCurrent: val }),
            );
        }
        if (this.props.settings.batteryPowerStateId) {
            this.subscribeOne('b:p', this.props.settings.batteryPowerStateId, val =>
                this.setState({ batteryPower: val }),
            );
        }
    }

    private async resolveDefaultHistory(): Promise<string> {
        const ctx = this.props.stateContext;
        if (!ctx) {
            return '';
        }
        const fromCtx = ctx.defaultHistory || '';
        if (fromCtx) {
            return fromCtx;
        }
        try {
            const cfg = await ctx.getSocket().getObject('system.config');
            return ((cfg?.common as unknown as Record<string, unknown>)?.defaultHistory as string) || '';
        } catch {
            return '';
        }
    }

    /** Resolve unit + history adapter for an entry, then load recent bars. */
    private async resolveEntryMeta(kind: 'p' | 'c', idx: number, stateId: string): Promise<void> {
        const ctx = this.props.stateContext;
        if (!ctx) {
            return;
        }
        const socket = ctx.getSocket();
        const obj = await socket.getObject(stateId).catch(() => null);
        if (!this.mounted) {
            return;
        }
        const unit = (obj as ioBroker.StateObject | null)?.common?.unit || '';
        const instance = await this.resolveDefaultHistory();
        let historyId: string | null = null;
        const historyInstance = instance;
        if (instance) {
            if ((obj as ioBroker.StateObject | null)?.common?.custom?.[instance]?.enabled) {
                historyId = stateId;
            } else {
                const aliasId = (obj as ioBroker.StateObject | null)?.common?.alias?.id;
                const targetId = typeof aliasId === 'object' ? (aliasId as { read?: string }).read : aliasId;
                if (targetId && targetId !== stateId) {
                    const targetObj = await socket.getObject(targetId).catch(() => null);
                    if ((targetObj as ioBroker.StateObject | null)?.common?.custom?.[instance]?.enabled) {
                        historyId = targetId;
                    }
                }
            }
        }

        if (!this.mounted) {
            return;
        }
        this.setState(prev => {
            const arr = (kind === 'p' ? prev.producerRt : prev.consumerRt).slice();
            if (arr[idx]) {
                arr[idx] = { ...arr[idx], unit, historyId, historyInstance };
            }
            return (kind === 'p' ? { producerRt: arr } : { consumerRt: arr }) as unknown as Pick<
                WidgetEnergyFlowState,
                'producerRt' | 'consumerRt'
            >;
        });

        if (historyId && historyInstance) {
            await this.loadBars(kind, idx, historyId, historyInstance);
        }
    }

    private async resolveBatterySocHistory(stateId: string): Promise<void> {
        const ctx = this.props.stateContext;
        if (!ctx) {
            return;
        }
        const instance = await this.resolveDefaultHistory();
        if (!instance || !this.mounted) {
            return;
        }
        const socket = ctx.getSocket();
        const obj = await socket.getObject(stateId).catch(() => null);
        let historyId: string | null = null;
        if ((obj as ioBroker.StateObject | null)?.common?.custom?.[instance]?.enabled) {
            historyId = stateId;
        } else {
            const aliasId = (obj as ioBroker.StateObject | null)?.common?.alias?.id;
            const targetId = typeof aliasId === 'object' ? (aliasId as { read?: string }).read : aliasId;
            if (targetId && targetId !== stateId) {
                const targetObj = await socket.getObject(targetId).catch(() => null);
                if ((targetObj as ioBroker.StateObject | null)?.common?.custom?.[instance]?.enabled) {
                    historyId = targetId;
                }
            }
        }
        if (!this.mounted) {
            return;
        }
        this.setState({ batterySocHistoryId: historyId, batterySocHistoryInstance: instance });
    }

    /** Load N recent history points for the inline bar chart, bucketed into ~24 columns. */
    private async loadBars(kind: 'p' | 'c', idx: number, historyId: string, historyInstance: string): Promise<void> {
        const ctx = this.props.stateContext;
        if (!ctx) {
            return;
        }
        const hours = Math.max(1, Number(this.props.settings.chartHours) || 12);
        const end = Date.now();
        const start = end - hours * 3_600_000;
        const socket = ctx.getSocket();
        try {
            const points = await socket.getHistory(historyId, {
                instance: historyInstance,
                start,
                end,
                from: false,
                ack: false,
                q: false,
                addId: false,
                aggregate: 'minmax',
                returnNewestEntries: true,
            });
            if (!this.mounted || !Array.isArray(points)) {
                return;
            }
            const bars: { ts: number; val: number }[] = [];
            for (const p of points) {
                const v = Number(p.val);
                if (Number.isFinite(v)) {
                    bars.push({ ts: p.ts, val: v });
                }
            }
            this.setState(prev => {
                const arr = (kind === 'p' ? prev.producerRt : prev.consumerRt).slice();
                if (arr[idx]) {
                    arr[idx] = { ...arr[idx], bars };
                }
                return (kind === 'p' ? { producerRt: arr } : { consumerRt: arr }) as unknown as Pick<
                    WidgetEnergyFlowState,
                    'producerRt' | 'consumerRt'
                >;
            });
        } catch {
            // ignore: history not available right now
        }
    }

    private formatPower(val: number | null, unit: string): string {
        if (val == null) {
            return '–';
        }
        return `${formatFloat(val, 0, this.props.stateContext.isFloatComma)}${unit ? '' : ''}`;
    }

    private renderEntryIcon(entry: EnergyEntry, kind: 'p' | 'c'): React.JSX.Element {
        if (entry.icon) {
            let src = entry.icon;
            if (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:image')) {
                src = this.props.stateContext.imagePrefix + (src.startsWith('/') ? src.substring(1) : src);
            }
            return (
                <Icon
                    src={src}
                    style={{ width: '1em', height: '1em' }}
                />
            );
        }
        return kind === 'p' ? defaultProducerIcon(entry.deviceType) : defaultConsumerIcon(entry.deviceType);
    }

    private openChart(target: ChartTarget): void {
        // Only open if history is enabled — otherwise the dialog has no data to draw.
        if (!target.historyId || !target.historyInstance) {
            return;
        }
        this.setState({ chartTarget: target });
    }

    /** Mini bar chart drawn inside a producer/consumer tile (Solarertrag-style). */
    private static renderBars(bars: { ts: number; val: number }[], color: string): React.JSX.Element | null {
        if (bars.length < 2) {
            return null;
        }
        // Bucket the points into ~20 columns by time.
        const W = 200;
        const H = 60;
        const NBUCKETS = 20;
        const tsMin = bars[0].ts;
        const tsMax = bars[bars.length - 1].ts;
        const tsRange = tsMax - tsMin || 1;
        const buckets: number[] = new Array(NBUCKETS).fill(NaN);
        for (const p of bars) {
            const i = Math.min(NBUCKETS - 1, Math.floor(((p.ts - tsMin) / tsRange) * NBUCKETS));
            const cur = buckets[i];
            buckets[i] = isNaN(cur) ? p.val : Math.max(cur, p.val);
        }
        let max = 0;
        for (const v of buckets) {
            if (!isNaN(v) && v > max) {
                max = v;
            }
        }
        if (max <= 0) {
            return null;
        }
        const barWidth = W / NBUCKETS;
        const gap = barWidth * 0.25;
        return (
            <Box
                sx={{
                    position: 'absolute',
                    left: 12,
                    right: 12,
                    bottom: 12,
                    height: '50%',
                    pointerEvents: 'none',
                }}
            >
                <svg
                    viewBox={`0 0 ${W} ${H}`}
                    preserveAspectRatio="none"
                    style={{ width: '100%', height: '100%', display: 'block' }}
                >
                    {buckets.map((v, i) => {
                        if (isNaN(v) || v <= 0) {
                            return null;
                        }
                        const h = (v / max) * H;
                        return (
                            <rect
                                key={i}
                                x={i * barWidth + gap / 2}
                                y={H - h}
                                width={barWidth - gap}
                                height={h}
                                fill={color}
                                rx={1.5}
                            />
                        );
                    })}
                </svg>
            </Box>
        );
    }

    private renderEntryTile(entry: EnergyEntry, rt: EntryRuntime, kind: 'p' | 'c'): React.JSX.Element {
        const color = entryColor(entry, kind === 'p' ? PRODUCER_DEFAULT_COLOR : CONSUMER_DEFAULT_COLOR);
        const name = entry.name || '';
        const clickable = !!rt.historyId && !!rt.historyInstance;
        return (
            <Box
                onClick={
                    clickable
                        ? () =>
                              this.openChart({
                                  stateId: entry.stateId || '',
                                  historyId: rt.historyId,
                                  historyInstance: rt.historyInstance,
                                  name,
                                  color,
                                  unit: rt.unit,
                              })
                        : undefined
                }
                sx={(theme: Theme) => ({
                    position: 'relative',
                    flex: 1,
                    minHeight: 80,
                    p: 1.25,
                    borderRadius: '12px',
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(20, 38, 60, 0.85)' : 'rgba(0, 36, 70, 0.92)',
                    color: '#fff',
                    border: `1px solid ${color}55`,
                    cursor: clickable ? 'pointer' : 'default',
                    overflow: 'hidden',
                    transition: 'transform 0.15s, border-color 0.15s',
                    '&:hover': clickable ? { borderColor: color, transform: 'translateY(-1px)' } : {},
                })}
            >
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 14, opacity: 0.9 }}>
                    <Box sx={{ color, fontSize: 18, display: 'flex', alignItems: 'center' }}>
                        {this.renderEntryIcon(entry, kind)}
                    </Box>
                    <Typography
                        variant="caption"
                        sx={{
                            fontSize: 13,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {name}
                    </Typography>
                </Box>

                {/* Value */}
                <Typography
                    sx={{
                        mt: 0.5,
                        fontSize: 28,
                        fontWeight: 700,
                        lineHeight: 1.05,
                    }}
                >
                    {rt.val == null ? '–' : formatFloat(rt.val, 0, this.props.stateContext.isFloatComma)}
                    <Typography
                        component="span"
                        sx={{ fontSize: '0.55em', fontWeight: 400, ml: 0.5, opacity: 0.6 }}
                    >
                        {rt.unit || 'W'}
                    </Typography>
                </Typography>

                {/* Inline bar chart */}
                {kind === 'p' ? WidgetEnergyFlow.renderBars(rt.bars, color) : null}
            </Box>
        );
    }

    private renderBatteryTile(): React.JSX.Element | null {
        const settings = this.props.settings;
        const hasAny =
            settings.batterySocStateId ||
            settings.batteryVoltageStateId ||
            settings.batteryCurrentStateId ||
            settings.batteryPowerStateId;
        if (!hasAny) {
            return null;
        }
        const color = settings.batteryColor || ACCENT;
        const name = settings.batteryName || I18n.t('wm_Battery');
        const power = this.state.batteryPower;
        const status =
            power == null
                ? ''
                : power > 0
                  ? I18n.t('wm_Charging')
                  : power < 0
                    ? I18n.t('wm_Discharging')
                    : I18n.t('wm_Idle');
        const clickable =
            !!settings.batterySocStateId && !!this.state.batterySocHistoryId && !!this.state.batterySocHistoryInstance;
        const iconNode = settings.batteryIcon ? (
            <Icon
                src={
                    settings.batteryIcon.startsWith('http://') ||
                    settings.batteryIcon.startsWith('https://') ||
                    settings.batteryIcon.startsWith('data:image')
                        ? settings.batteryIcon
                        : this.props.stateContext.imagePrefix +
                          (settings.batteryIcon.startsWith('/')
                              ? settings.batteryIcon.substring(1)
                              : settings.batteryIcon)
                }
                style={{ width: '1em', height: '1em' }}
            />
        ) : (this.state.batterySoc ?? 0) >= 95 ? (
            <BatteryFull sx={{ fontSize: 'inherit', color: 'inherit' }} />
        ) : (
            <BatteryChargingFull sx={{ fontSize: 'inherit', color: 'inherit' }} />
        );

        return (
            <Box
                onClick={
                    clickable
                        ? () =>
                              this.openChart({
                                  stateId: settings.batterySocStateId!,
                                  historyId: this.state.batterySocHistoryId,
                                  historyInstance: this.state.batterySocHistoryInstance,
                                  name,
                                  color,
                                  unit: '%',
                              })
                        : undefined
                }
                sx={() => ({
                    gridArea: 'battery',
                    p: 1.5,
                    borderRadius: '14px',
                    background: `linear-gradient(180deg, ${color} 0%, ${color}cc 100%)`,
                    color: '#fff',
                    cursor: clickable ? 'pointer' : 'default',
                    overflow: 'hidden',
                    position: 'relative',
                    transition: 'transform 0.15s',
                    '&:hover': clickable ? { transform: 'translateY(-1px)' } : {},
                })}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 18 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>{iconNode}</Box>
                    <Typography variant="body2">{name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography sx={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
                        {this.state.batterySoc == null
                            ? '–'
                            : formatFloat(this.state.batterySoc, 0, this.props.stateContext.isFloatComma)}
                        <Typography
                            component="span"
                            sx={{ fontSize: '0.5em', fontWeight: 400, ml: 0.25, opacity: 0.85 }}
                        >
                            %
                        </Typography>
                    </Typography>
                    {status ? <Typography sx={{ fontSize: 14, opacity: 0.85 }}>{status}</Typography> : null}
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, fontSize: 14 }}>
                    {settings.batteryVoltageStateId ? (
                        <Box>
                            {this.state.batteryVoltage == null
                                ? '–'
                                : formatFloat(this.state.batteryVoltage, 2, this.props.stateContext.isFloatComma)}
                            <Typography
                                component="span"
                                sx={{ fontSize: '0.85em', ml: 0.25, opacity: 0.7 }}
                            >
                                V
                            </Typography>
                        </Box>
                    ) : null}
                    {settings.batteryCurrentStateId ? (
                        <Box>
                            {this.state.batteryCurrent == null
                                ? '–'
                                : formatFloat(this.state.batteryCurrent, 1, this.props.stateContext.isFloatComma)}
                            <Typography
                                component="span"
                                sx={{ fontSize: '0.85em', ml: 0.25, opacity: 0.7 }}
                            >
                                A
                            </Typography>
                        </Box>
                    ) : null}
                    {settings.batteryPowerStateId ? (
                        <Box>
                            {this.state.batteryPower == null
                                ? '–'
                                : formatFloat(this.state.batteryPower, 0, this.props.stateContext.isFloatComma)}
                            <Typography
                                component="span"
                                sx={{ fontSize: '0.85em', ml: 0.25, opacity: 0.7 }}
                            >
                                W
                            </Typography>
                        </Box>
                    ) : null}
                </Box>
            </Box>
        );
    }

    /** SVG connector lines: producers → battery (from left), consumers ← battery (from right). */
    private static renderConnectors(
        producers: number,
        consumers: number,
        hasBattery: boolean,
    ): React.JSX.Element | null {
        if (!hasBattery || (producers === 0 && consumers === 0)) {
            return null;
        }
        return (
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                }}
            >
                <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    style={{ position: 'absolute', inset: 0 }}
                >
                    {/* Producer connector — single curve from left edge down to battery centre */}
                    {producers > 0 ? (
                        <path
                            d="M 0 50 C 25 50, 25 92, 50 92"
                            stroke={ACCENT}
                            strokeWidth="0.4"
                            fill="none"
                            opacity={0.6}
                        />
                    ) : null}
                    {/* Consumer connector — single curve from right edge down to battery centre */}
                    {consumers > 0 ? (
                        <path
                            d="M 100 50 C 75 50, 75 92, 50 92"
                            stroke={ACCENT}
                            strokeWidth="0.4"
                            fill="none"
                            opacity={0.6}
                        />
                    ) : null}
                </svg>
            </Box>
        );
    }

    private renderEnergyChartDialog(): React.JSX.Element | null {
        const target = this.state.chartTarget;
        if (!target || !target.historyId || !target.historyInstance) {
            return null;
        }
        return (
            <ChartDialog
                open
                onClose={() => this.setState({ chartTarget: null })}
                title={target.name}
                historyIds={[{ id: target.historyId, color: target.color, name: target.name }]}
                historyInstance={target.historyInstance}
                socket={this.props.stateContext.getSocket()}
                unit={target.unit}
                isFloatComma={this.props.stateContext.isFloatComma}
                widgetId={String(this.props.widget.id)}
                instanceId={this.props.stateContext.instanceId}
            />
        );
    }

    private renderFlowContent(): React.JSX.Element {
        const producers = this.props.settings.producers || [];
        const consumers = this.props.settings.consumers || [];
        const hasBattery = !!(
            this.props.settings.batterySocStateId ||
            this.props.settings.batteryVoltageStateId ||
            this.props.settings.batteryCurrentStateId ||
            this.props.settings.batteryPowerStateId
        );

        return (
            <Box
                sx={(theme: Theme) => ({
                    width: '100%',
                    height: '100%',
                    minHeight: 240,
                    p: 1.5,
                    borderRadius: '14px',
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(8, 18, 32, 0.92)' : 'rgba(8, 22, 40, 0.96)',
                    color: '#fff',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gridTemplateRows: 'auto 1fr',
                    gridTemplateAreas: hasBattery
                        ? `
                            'producers consumers'
                            'battery battery'
                          `
                        : `
                            'producers consumers'
                            'producers consumers'
                          `,
                    gap: 1.25,
                    boxSizing: 'border-box',
                })}
            >
                {WidgetEnergyFlow.renderConnectors(producers.length, consumers.length, hasBattery)}

                <Box
                    sx={{
                        gridArea: 'producers',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    {producers.length === 0 ? (
                        <Box sx={{ opacity: 0.4, fontSize: 13, textAlign: 'center', mt: 2 }}>
                            {I18n.t('wm_No producers')}
                        </Box>
                    ) : (
                        producers.map((p, i) =>
                            this.state.producerRt[i] ? (
                                <React.Fragment key={p.id || `p${i}`}>
                                    {this.renderEntryTile(p, this.state.producerRt[i], 'p')}
                                </React.Fragment>
                            ) : null,
                        )
                    )}
                </Box>

                <Box
                    sx={{
                        gridArea: 'consumers',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    {consumers.length === 0 ? (
                        <Box sx={{ opacity: 0.4, fontSize: 13, textAlign: 'center', mt: 2 }}>
                            {I18n.t('wm_No consumers')}
                        </Box>
                    ) : (
                        consumers.map((c, i) =>
                            this.state.consumerRt[i] ? (
                                <React.Fragment key={c.id || `c${i}`}>
                                    {this.renderEntryTile(c, this.state.consumerRt[i], 'c')}
                                </React.Fragment>
                            ) : null,
                        )
                    )}
                </Box>

                {this.renderBatteryTile()}
            </Box>
        );
    }

    /** Sum the live values of an entries-list, returning 0 when nothing is known yet. */
    private static sumValues(rt: EntryRuntime[]): number {
        let sum = 0;
        for (const r of rt) {
            if (r.val != null && Number.isFinite(r.val)) {
                sum += r.val;
            }
        }
        return sum;
    }

    /** Compact tile that opens the full flow Dialog when clicked. */
    /** Single framed metric box at the bottom of the launcher tile. */
    private static renderMetricBox(opts: {
        label: string;
        value: string;
        unit: string;
        color: string;
        isWide: boolean;
    }): React.JSX.Element {
        return (
            <Box
                sx={{
                    minWidth: 0,
                    p: 0.5,
                    borderRadius: '6px',
                    border: `1px solid ${opts.color}66`,
                    backgroundColor: `${opts.color}14`,
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                }}
            >
                <Typography
                    sx={{
                        fontSize: 10,
                        opacity: 0.7,
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {opts.label}
                </Typography>
                <Typography sx={{ fontSize: opts.isWide ? 20 : 16, fontWeight: 700, lineHeight: 1.15, mt: 0.25 }}>
                    {opts.value}
                    <Typography
                        component="span"
                        sx={{ fontSize: '0.55em', opacity: 0.6, ml: 0.25 }}
                    >
                        {opts.unit}
                    </Typography>
                </Typography>
            </Box>
        );
    }

    /**
     * Map a power value (W) to an animation duration (seconds) for the flow line.
     * Higher power → shorter duration → faster scrolling dashes.
     * Returns 0 when there is no significant flow (no animation).
     */
    private static flowDuration(watts: number): number {
        if (!watts || watts <= 1) {
            return 0;
        }
        // 100 W → ~3 s ; 500 W → ~1.3 s ; 2000 W → ~0.7 s ; 5000 W → ~0.4 s.
        return Math.max(0.35, Math.min(6, 30 / Math.sqrt(watts)));
    }

    private renderLauncherTile(isWide: boolean): React.JSX.Element {
        const producerTotal = WidgetEnergyFlow.sumValues(this.state.producerRt);
        const consumerTotal = WidgetEnergyFlow.sumValues(this.state.consumerRt);
        const hasProducers = (this.props.settings.producers || []).length > 0;
        const hasConsumers = (this.props.settings.consumers || []).length > 0;
        const hasBattery = !!this.props.settings.batterySocStateId;
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        const accent = this.props.settings.color || ACCENT;
        const batteryColor = this.props.settings.batteryColor || accent;
        const title = this.props.settings.name || I18n.t('wm_EnergyFlow');
        const isFloatComma = this.props.stateContext.isFloatComma;
        const size = this.props.settings.size || '1x1';

        // Animation speeds derived from current power (live-updates as state changes).
        const producerDuration = WidgetEnergyFlow.flowDuration(producerTotal);
        const consumerDuration = WidgetEnergyFlow.flowDuration(consumerTotal);

        // The bottom row holds ONLY Producers and Consumers — the Battery sits as
        // the central node above them, so arrows go P → battery → C.
        const bottomCols: Array<'p' | 'c'> = [];
        if (hasProducers) {
            bottomCols.push('p');
        }
        if (hasConsumers) {
            bottomCols.push('c');
        }
        const centerX: Record<'p' | 'c', number> = { p: 50, c: 50 };
        if (bottomCols.length > 0) {
            const step = 100 / bottomCols.length;
            bottomCols.forEach((c, i) => {
                centerX[c] = step * (i + 0.5);
            });
        }

        // Layout in viewBox 0..100. The bottom-row container is positioned at a
        // matching `top` percentage so the arrow tip always lands just above it,
        // not inside it.
        const NODE_X = 50;
        const NODE_Y_BOTTOM = 42; // bottom of the central battery node
        const BOTTOM_ROW_TOP_PCT = 64; // top of the bottom-row metric boxes (% of tile)
        const ARROW_TIP_Y = BOTTOM_ROW_TOP_PCT - 4; // a touch above the row

        return (
            <Box
                onClick={() => this.setState({ flowDialogOpen: true })}
                sx={(theme: Theme) => ({
                    width: '100%',
                    // Let aspectRatio drive the height — height:100% would force the tile
                    // to fill the grid row instead, defeating aspectRatio.
                    height: size === '2x0.5' ? 80 : 'auto',
                    aspectRatio: size === '2x0.5' ? undefined : size === '2x1' ? '2 / 1' : '1',
                    p: 1.25,
                    borderRadius: '14px',
                    cursor: 'pointer',
                    color: '#fff',
                    background: `linear-gradient(145deg, ${accent}33 0%, ${
                        theme.palette.mode === 'dark' ? 'rgba(8,18,32,0.92)' : 'rgba(8,22,40,0.96)'
                    } 75%)`,
                    border: `1px solid ${accent}55`,
                    transition: 'transform 0.15s, border-color 0.15s',
                    position: 'relative',
                    overflow: 'hidden',
                    // Required so the indicators' `cqi` units (e.g. settings gear at
                    // top:max(4px,2cqi)) resolve against the tile width — without this
                    // the gear floats far down/away from the corner.
                    containerType: 'inline-size',
                    boxSizing: 'border-box',
                    '&:hover': { borderColor: accent, transform: 'translateY(-1px)' },
                })}
            >
                {indicators}

                {/* Title row */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, position: 'relative', zIndex: 2 }}>
                    <Bolt sx={{ color: accent, fontSize: 20 }} />
                    <Typography
                        variant="caption"
                        sx={{
                            fontSize: 13,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {title}
                    </Typography>
                </Box>

                {/* SVG flow lines — animated dash-offset gives a "running arrows" effect.
                    Speed scales inversely with current power; zero/idle power = static line. */}
                {bottomCols.length > 0 ? (
                    <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}
                    >
                        <defs>
                            <marker
                                id="ef-arrow"
                                markerWidth="6"
                                markerHeight="6"
                                refX="5"
                                refY="3"
                                orient="auto"
                                markerUnits="userSpaceOnUse"
                            >
                                <path
                                    d="M0,0 L6,3 L0,6 Z"
                                    fill={accent}
                                />
                            </marker>
                            <style>{`
                                @keyframes ef-flow-fwd { to { stroke-dashoffset: -7; } }
                                .ef-flow-line { stroke-dasharray: 4 3; }
                            `}</style>
                        </defs>
                        {hasProducers ? (
                            <line
                                className="ef-flow-line"
                                x1={centerX.p}
                                y1={ARROW_TIP_Y}
                                x2={NODE_X}
                                y2={NODE_Y_BOTTOM}
                                stroke={accent}
                                strokeWidth="0.7"
                                opacity={producerDuration > 0 ? 0.95 : 0.5}
                                markerEnd="url(#ef-arrow)"
                                style={
                                    producerDuration > 0
                                        ? {
                                              animation: `ef-flow-fwd ${producerDuration}s linear infinite`,
                                          }
                                        : undefined
                                }
                            />
                        ) : null}
                        {hasConsumers ? (
                            <line
                                className="ef-flow-line"
                                x1={NODE_X}
                                y1={NODE_Y_BOTTOM}
                                x2={centerX.c}
                                y2={ARROW_TIP_Y}
                                stroke={accent}
                                strokeWidth="0.7"
                                opacity={consumerDuration > 0 ? 0.95 : 0.5}
                                markerEnd="url(#ef-arrow)"
                                style={
                                    consumerDuration > 0
                                        ? {
                                              animation: `ef-flow-fwd ${consumerDuration}s linear infinite`,
                                          }
                                        : undefined
                                }
                            />
                        ) : null}
                    </svg>
                ) : null}

                {/* Central node — battery (when configured) or just the widget icon.
                    Sized in % so it scales with the tile and never overlaps the
                    bottom row at BOTTOM_ROW_TOP_PCT. */}
                <Box
                    sx={{
                        position: 'absolute',
                        left: '50%',
                        top: '30%',
                        transform: 'translate(-50%, -50%)',
                        width: hasBattery ? '34%' : '20%',
                        minWidth: hasBattery ? 56 : 28,
                        minHeight: 30,
                        px: hasBattery ? 0.5 : 0,
                        py: hasBattery ? 0.25 : 0,
                        aspectRatio: hasBattery ? undefined : '1',
                        borderRadius: '8px',
                        border: `1px solid ${batteryColor}99`,
                        backgroundColor: `${batteryColor}1f`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2,
                    }}
                >
                    {hasBattery ? (
                        <>
                            <Typography sx={{ fontSize: 9, opacity: 0.7, lineHeight: 1 }}>
                                {I18n.t('wm_Battery')}
                            </Typography>
                            <Typography
                                sx={{ fontSize: isWide ? 18 : 15, fontWeight: 700, lineHeight: 1.05, mt: 0.25 }}
                            >
                                {this.state.batterySoc == null
                                    ? '–'
                                    : formatFloat(this.state.batterySoc, 0, isFloatComma)}
                                <Typography
                                    component="span"
                                    sx={{ fontSize: '0.55em', opacity: 0.6, ml: 0.25 }}
                                >
                                    %
                                </Typography>
                            </Typography>
                        </>
                    ) : (
                        <Bolt sx={{ color: accent, fontSize: '1.1em' }} />
                    )}
                </Box>

                {/* Bottom-row metric boxes — Producers / Consumers only.
                    Positioned with `top:` (% of tile) so the SVG arrow tip at
                    ARROW_TIP_Y always lands just above the row, not inside it. */}
                <Box
                    sx={{
                        position: 'absolute',
                        left: 8,
                        right: 8,
                        top: `${BOTTOM_ROW_TOP_PCT}%`,
                        bottom: 8,
                        display: 'grid',
                        gridTemplateColumns: `repeat(${Math.max(1, bottomCols.length)}, 1fr)`,
                        gap: 0.75,
                        zIndex: 2,
                    }}
                >
                    {hasProducers
                        ? WidgetEnergyFlow.renderMetricBox({
                              label: `↑ ${I18n.t('wm_Producers')}`,
                              value: formatFloat(producerTotal, 0, isFloatComma),
                              unit: 'W',
                              color: accent,
                              isWide,
                          })
                        : null}
                    {hasConsumers
                        ? WidgetEnergyFlow.renderMetricBox({
                              label: `↓ ${I18n.t('wm_Consumers')}`,
                              value: formatFloat(consumerTotal, 0, isFloatComma),
                              unit: 'W',
                              color: accent,
                              isWide,
                          })
                        : null}
                </Box>
            </Box>
        );
    }

    private renderFlowDialog(): React.JSX.Element | null {
        if (!this.state.flowDialogOpen) {
            return null;
        }
        const title = this.props.settings.name || I18n.t('wm_EnergyFlow');
        return (
            <Dialog
                open
                onClose={() => this.setState({ flowDialogOpen: false })}
                maxWidth="md"
                fullWidth
                slotProps={{ paper: { sx: { height: '85vh', maxHeight: 700 } } }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', pr: 6, pb: 0.5 }}>
                    {title}
                    <IconButton
                        onClick={() => this.setState({ flowDialogOpen: false })}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 1.5, overflow: 'auto' }}>{this.renderFlowContent()}</DialogContent>
            </Dialog>
        );
    }

    renderCompact(): React.JSX.Element {
        return this.renderLauncherTile(false);
    }

    renderWide(): React.JSX.Element {
        return this.renderLauncherTile(true);
    }

    renderWideTall(): React.JSX.Element {
        return this.renderLauncherTile(true);
    }

    render(): React.JSX.Element {
        return (
            <>
                {super.render()}
                {this.renderFlowDialog()}
                {this.renderEnergyChartDialog()}
            </>
        );
    }
}
