import React from 'react';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
import { Air, BatteryChargingFull, BatteryFull, Bolt, Close, ElectricalServices, LocalFireDepartment, Lightbulb, Power, PowerInput, WbSunny, } from '@mui/icons-material';
import { I18n, Icon } from '@iobroker/adapter-react-v5';
// xyflow's bezier-path helper — gives us nicely shaped, position-aware Bézier curves with proper
// handle tangents. We don't pull in the full <ReactFlow> component (too heavy + unwanted pan/zoom),
// just the path-string utility so we keep our own SVG / dot-animation rendering.
import { getBezierPath, Position } from '@xyflow/react';
import { SIZE_OPTIONS_WITH_2X2, hideBaseFields } from '../configUtils';
import WidgetGeneric, { formatFloat } from './Generic';
import ChartDialog from './ChartDialog';
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
const PRODUCER_DEFAULT_COLOR = {
    solar: '#ffb300',
    wind: '#42a5f5',
    grid: '#90a4ae',
    generator: '#ef5350',
    other: '#2196f3',
};
const CONSUMER_DEFAULT_COLOR = {
    ac: '#7986cb',
    dc: '#26a69a',
    heater: '#ef6c00',
    light: '#ffd600',
    other: '#90a4ae',
};
const ACCENT = '#3aa3ff';
function defaultProducerIcon(kind) {
    const sx = { fontSize: 'inherit', color: 'inherit' };
    switch (kind) {
        case 'solar':
            return React.createElement(WbSunny, { sx: sx });
        case 'wind':
            return React.createElement(Air, { sx: sx });
        case 'grid':
            return React.createElement(ElectricalServices, { sx: sx });
        case 'generator':
            return React.createElement(Bolt, { sx: sx });
        default:
            return React.createElement(Bolt, { sx: sx });
    }
}
function defaultConsumerIcon(kind) {
    const sx = { fontSize: 'inherit', color: 'inherit' };
    switch (kind) {
        case 'ac':
            return React.createElement(Power, { sx: sx });
        case 'dc':
            return React.createElement(PowerInput, { sx: sx });
        case 'heater':
            return React.createElement(LocalFireDepartment, { sx: sx });
        case 'light':
            return React.createElement(Lightbulb, { sx: sx });
        default:
            return React.createElement(Power, { sx: sx });
    }
}
function entryColor(entry, fallbackMap) {
    return entry.color || fallbackMap[entry.deviceType || 'other'] || ACCENT;
}
export class WidgetEnergyFlow extends WidgetGeneric {
    static getConfigSchema() {
        const tableColumns = (typeOptions, todayLabel) => [
            { attr: 'stateId', type: 'objectId', title: 'wm_State ID', filter: false, sort: false },
            { attr: 'name', type: 'text', title: 'wm_Name', filter: false, sort: false },
            {
                attr: 'deviceType',
                type: 'select',
                title: 'wm_Device type',
                options: typeOptions,
                default: typeOptions[0].value,
            },
            { attr: 'todayStateId', type: 'objectId', title: todayLabel, filter: false, sort: false },
            { attr: 'color', type: 'color', title: 'wm_Color' },
            { attr: 'icon', type: 'component', subType: 'iconSelect', title: 'wm_Icon' },
        ];
        // type:'table' keeps Export/Import OFF by default (opt-in via `export`/`import` flags),
        // unlike accordion where those buttons are unconditionally present.
        const producerTable = {
            type: 'table',
            label: 'wm_Producers',
            help: 'wm_Producers help',
            attr: 'producers',
            titleAttribute: 'name',
            useCardFor: ['xs', 'sm'],
            items: tableColumns(PRODUCER_TYPES, 'wm_Today produced'),
        };
        const consumerTable = {
            type: 'table',
            attr: 'consumers',
            label: 'wm_Consumers',
            help: 'wm_Consumers help',
            titleAttribute: 'name',
            useCardFor: ['xs', 'sm'],
            items: tableColumns(CONSUMER_TYPES, 'wm_Today consumed'),
        };
        const batteryPanel = {
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
                // Energy flow has its own per-source colours — base accent/inactive unused.
                ...hideBaseFields('colorActive', 'color'),
                // Override base size dropdown so EnergyFlow exposes the 2×2 tile (square, double).
                size: {
                    type: 'select',
                    label: 'wm_Size',
                    options: SIZE_OPTIONS_WITH_2X2,
                    default: '1x1',
                    format: 'radio',
                    horizontal: true,
                    noTranslation: true,
                },
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
    listeners = new Map();
    /** Pending history-load promises to allow cancellation on unmount */
    mounted = false;
    /**
     * Refs for measuring connector endpoints in the dialog's flow layout. Re-attached every render
     *  via callback refs, so they automatically follow the live producer/consumer arrays.
     */
    flowContainerEl = null;
    producerEls = [];
    consumerEls = [];
    batteryEl = null;
    flowResizeObserver = null;
    flowMeasureRaf = null;
    /**
     * Per-connector animation state, kept OUTSIDE React state so re-renders (caused by power
     *  value updates) don't restart the dot animation. The single rAF loop walks this map and
     *  writes `stroke-dashoffset` directly to the SVG element. Speed is updated in render based
     *  on current power, but offset is preserved → dots continue smoothly across value updates.
     */
    connectorAnims = new Map();
    connectorAnimRaf = null;
    connectorAnimLast = 0;
    constructor(props) {
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
            flowGeom: null,
        };
    }
    componentDidMount() {
        super.componentDidMount();
        this.mounted = true;
        this.subscribeAll();
    }
    componentDidUpdate(prev) {
        const prevP = JSON.stringify(prev.settings.producers || []);
        const newP = JSON.stringify(this.props.settings.producers || []);
        const prevC = JSON.stringify(prev.settings.consumers || []);
        const newC = JSON.stringify(this.props.settings.consumers || []);
        const battChanged = prev.settings.batterySocStateId !== this.props.settings.batterySocStateId ||
            prev.settings.batteryVoltageStateId !== this.props.settings.batteryVoltageStateId ||
            prev.settings.batteryCurrentStateId !== this.props.settings.batteryCurrentStateId ||
            prev.settings.batteryPowerStateId !== this.props.settings.batteryPowerStateId;
        if (prevP !== newP || prevC !== newC || battChanged) {
            this.unsubscribeAll();
            this.subscribeAll();
        }
        // Layout may have shifted (tile counts, dialog open/close, resize) — re-measure connectors.
        if (this.state.flowDialogOpen) {
            this.scheduleFlowMeasure();
        }
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        this.mounted = false;
        this.unsubscribeAll();
        this.flowResizeObserver?.disconnect();
        this.flowResizeObserver = null;
        if (this.flowMeasureRaf !== null) {
            cancelAnimationFrame(this.flowMeasureRaf);
            this.flowMeasureRaf = null;
        }
        if (this.connectorAnimRaf !== null) {
            cancelAnimationFrame(this.connectorAnimRaf);
            this.connectorAnimRaf = null;
        }
        this.connectorAnims.clear();
    }
    /**
     * Get-or-create the persistent animation entry for a connector path. Called during render so
     *  the entry exists by the time the callback ref fires. The `period` lets us wrap `offset` to
     *  avoid floating-point drift over long sessions.
     */
    getConnectorAnim(key, period) {
        let a = this.connectorAnims.get(key);
        if (!a) {
            a = { el: null, speed: 0, period, offset: 0 };
            this.connectorAnims.set(key, a);
        }
        a.period = period;
        return a;
    }
    /**
     * Single rAF loop that advances `stroke-dashoffset` for every registered connector.
     *  Continues running while at least one connector exists; auto-stops when the map is empty
     *  (e.g. dialog closed AND launcher tile detached). Writes via setAttribute, not React state,
     *  so power-value updates don't disturb the running animation.
     */
    connectorAnimTick = (now) => {
        const dt = Math.min(0.1, (now - this.connectorAnimLast) / 1000);
        this.connectorAnimLast = now;
        let needsNextFrame = false;
        for (const a of this.connectorAnims.values()) {
            if (!a.el) {
                continue;
            }
            needsNextFrame = true;
            if (a.speed === 0) {
                continue;
            }
            a.offset += a.speed * dt;
            // Wrap into [-period, 0] so the value stays small over time.
            if (a.offset <= -a.period) {
                a.offset += a.period;
            }
            else if (a.offset >= a.period) {
                a.offset -= a.period;
            }
            a.el.setAttribute('stroke-dashoffset', a.offset.toFixed(3));
        }
        if (this.mounted && needsNextFrame) {
            this.connectorAnimRaf = requestAnimationFrame(this.connectorAnimTick);
        }
        else {
            this.connectorAnimRaf = null;
        }
    };
    ensureConnectorAnimLoop() {
        if (this.connectorAnimRaf !== null || !this.mounted) {
            return;
        }
        this.connectorAnimLast = performance.now();
        this.connectorAnimRaf = requestAnimationFrame(this.connectorAnimTick);
    }
    /** Coalesce multiple measure requests within a single frame */
    scheduleFlowMeasure = () => {
        if (this.flowMeasureRaf !== null) {
            return;
        }
        this.flowMeasureRaf = requestAnimationFrame(() => {
            this.flowMeasureRaf = null;
            this.measureFlow();
        });
    };
    /**
     * Container ref callback: also attaches a ResizeObserver so the SVG redraws on layout changes
     *  (window resize, dialog resize, group expansion, etc.).
     */
    setFlowContainerRef = (el) => {
        this.flowContainerEl = el;
        if (el) {
            if (!this.flowResizeObserver) {
                this.flowResizeObserver = new ResizeObserver(() => this.scheduleFlowMeasure());
            }
            this.flowResizeObserver.observe(el);
            this.scheduleFlowMeasure();
        }
        else if (this.flowResizeObserver) {
            this.flowResizeObserver.disconnect();
            this.flowResizeObserver = null;
        }
    };
    measureFlow() {
        if (!this.mounted || !this.flowContainerEl) {
            return;
        }
        const cRect = this.flowContainerEl.getBoundingClientRect();
        const cx = cRect.left;
        const cy = cRect.top;
        // Connection point = bottom-center of each tile so the connector exits vertically and the
        // S-curve has well-behaved tangents regardless of horizontal offset to the battery attach.
        const producers = [];
        for (const el of this.producerEls) {
            if (!el) {
                continue;
            }
            const r = el.getBoundingClientRect();
            producers.push({ x: r.left - cx + r.width / 2, y: r.bottom - cy });
        }
        const consumers = [];
        for (const el of this.consumerEls) {
            if (!el) {
                continue;
            }
            const r = el.getBoundingClientRect();
            consumers.push({ x: r.left - cx + r.width / 2, y: r.bottom - cy });
        }
        let battery = null;
        if (this.batteryEl) {
            const r = this.batteryEl.getBoundingClientRect();
            battery = {
                topY: r.top - cy,
                leftX: r.left - cx,
                rightX: r.right - cx,
            };
        }
        const next = { cw: cRect.width, ch: cRect.height, producers, consumers, battery };
        if (WidgetEnergyFlow.flowGeomEqual(this.state.flowGeom, next)) {
            return;
        }
        this.setState({ flowGeom: next });
    }
    static flowGeomEqual(a, b) {
        if (!a || !b) {
            return a === b;
        }
        if (a.cw !== b.cw || a.ch !== b.ch) {
            return false;
        }
        if (a.producers.length !== b.producers.length || a.consumers.length !== b.consumers.length) {
            return false;
        }
        for (let i = 0; i < a.producers.length; i++) {
            if (a.producers[i].x !== b.producers[i].x || a.producers[i].y !== b.producers[i].y) {
                return false;
            }
        }
        for (let i = 0; i < a.consumers.length; i++) {
            if (a.consumers[i].x !== b.consumers[i].x || a.consumers[i].y !== b.consumers[i].y) {
                return false;
            }
        }
        if (!!a.battery !== !!b.battery) {
            return false;
        }
        if (a.battery && b.battery) {
            if (a.battery.topY !== b.battery.topY ||
                a.battery.leftX !== b.battery.leftX ||
                a.battery.rightX !== b.battery.rightX) {
                return false;
            }
        }
        return true;
    }
    unsubscribeAll() {
        const ctx = this.props.stateContext;
        if (!ctx) {
            return;
        }
        for (const { stateId, handler } of this.listeners.values()) {
            ctx.removeState(stateId, handler);
        }
        this.listeners.clear();
    }
    subscribeOne(key, stateId, onValue) {
        const ctx = this.props.stateContext;
        if (!ctx || !stateId) {
            return;
        }
        const handler = (_id, state) => {
            const raw = state?.val;
            const num = raw == null ? null : Number(raw);
            onValue(num != null && Number.isFinite(num) ? num : null);
        };
        ctx.getState(stateId, handler);
        this.listeners.set(key, { stateId, handler });
    }
    subscribeAll() {
        const producers = this.props.settings.producers || [];
        const consumers = this.props.settings.consumers || [];
        const ctx = this.props.stateContext;
        if (!ctx) {
            return;
        }
        // Init runtime arrays sized to the entry lists, then patch values via setState.
        const emptyRt = () => ({
            val: null,
            unit: '',
            historyId: null,
            historyInstance: '',
            bars: [],
            todayVal: null,
            todayUnit: '',
        });
        this.setState({
            producerRt: producers.map(emptyRt),
            consumerRt: consumers.map(emptyRt),
            batterySoc: null,
            batteryVoltage: null,
            batteryCurrent: null,
            batteryPower: null,
            batterySocHistoryId: null,
            batterySocHistoryInstance: '',
        });
        const subscribeEntry = (kind, idx, entry) => {
            if (entry.stateId) {
                this.subscribeOne(`${kind}:${idx}`, entry.stateId, val => this.setState(prev => {
                    const arr = (kind === 'p' ? prev.producerRt : prev.consumerRt).slice();
                    if (arr[idx]) {
                        arr[idx] = { ...arr[idx], val };
                    }
                    return (kind === 'p' ? { producerRt: arr } : { consumerRt: arr });
                }));
                // Lazily fetch the unit + resolve history.
                void this.resolveEntryMeta(kind, idx, entry.stateId);
            }
            if (entry.todayStateId) {
                this.subscribeOne(`${kind}:${idx}:today`, entry.todayStateId, val => this.setState(prev => {
                    const arr = (kind === 'p' ? prev.producerRt : prev.consumerRt).slice();
                    if (arr[idx]) {
                        arr[idx] = { ...arr[idx], todayVal: val };
                    }
                    return (kind === 'p' ? { producerRt: arr } : { consumerRt: arr });
                }));
                void this.resolveTodayUnit(kind, idx, entry.todayStateId);
            }
        };
        producers.forEach((p, i) => subscribeEntry('p', i, p));
        consumers.forEach((c, i) => subscribeEntry('c', i, c));
        // Battery
        if (this.props.settings.batterySocStateId) {
            this.subscribeOne('b:soc', this.props.settings.batterySocStateId, val => this.setState({ batterySoc: val }));
            void this.resolveBatterySocHistory(this.props.settings.batterySocStateId);
        }
        if (this.props.settings.batteryVoltageStateId) {
            this.subscribeOne('b:v', this.props.settings.batteryVoltageStateId, val => this.setState({ batteryVoltage: val }));
        }
        if (this.props.settings.batteryCurrentStateId) {
            this.subscribeOne('b:i', this.props.settings.batteryCurrentStateId, val => this.setState({ batteryCurrent: val }));
        }
        if (this.props.settings.batteryPowerStateId) {
            this.subscribeOne('b:p', this.props.settings.batteryPowerStateId, val => this.setState({ batteryPower: val }));
        }
    }
    async resolveDefaultHistory() {
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
            return cfg?.common?.defaultHistory || '';
        }
        catch {
            return '';
        }
    }
    /** Resolve unit + history adapter for an entry, then load recent bars. */
    async resolveEntryMeta(kind, idx, stateId) {
        const ctx = this.props.stateContext;
        if (!ctx) {
            return;
        }
        const socket = ctx.getSocket();
        const obj = await socket.getObject(stateId).catch(() => null);
        if (!this.mounted) {
            return;
        }
        const unit = obj?.common?.unit || '';
        const instance = await this.resolveDefaultHistory();
        let historyId = null;
        const historyInstance = instance;
        if (instance) {
            if (obj?.common?.custom?.[instance]?.enabled) {
                historyId = stateId;
            }
            else {
                const aliasId = obj?.common?.alias?.id;
                const targetId = typeof aliasId === 'object' ? aliasId.read : aliasId;
                if (targetId && targetId !== stateId) {
                    const targetObj = await socket.getObject(targetId).catch(() => null);
                    if (targetObj?.common?.custom?.[instance]?.enabled) {
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
            return (kind === 'p' ? { producerRt: arr } : { consumerRt: arr });
        });
        if (historyId && historyInstance) {
            await this.loadBars(kind, idx, historyId, historyInstance);
        }
    }
    /**
     * Resolve and cache only the unit for the today-counter state. We don't load history bars
     *  here — the today value is shown as a small text badge and doesn't need a chart.
     */
    async resolveTodayUnit(kind, idx, stateId) {
        const ctx = this.props.stateContext;
        if (!ctx) {
            return;
        }
        const obj = await ctx
            .getSocket()
            .getObject(stateId)
            .catch(() => null);
        if (!this.mounted) {
            return;
        }
        const unit = obj?.common?.unit || '';
        this.setState(prev => {
            const arr = (kind === 'p' ? prev.producerRt : prev.consumerRt).slice();
            if (arr[idx]) {
                arr[idx] = { ...arr[idx], todayUnit: unit };
            }
            return (kind === 'p' ? { producerRt: arr } : { consumerRt: arr });
        });
    }
    async resolveBatterySocHistory(stateId) {
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
        let historyId = null;
        if (obj?.common?.custom?.[instance]?.enabled) {
            historyId = stateId;
        }
        else {
            const aliasId = obj?.common?.alias?.id;
            const targetId = typeof aliasId === 'object' ? aliasId.read : aliasId;
            if (targetId && targetId !== stateId) {
                const targetObj = await socket.getObject(targetId).catch(() => null);
                if (targetObj?.common?.custom?.[instance]?.enabled) {
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
    async loadBars(kind, idx, historyId, historyInstance) {
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
            const bars = [];
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
                return (kind === 'p' ? { producerRt: arr } : { consumerRt: arr });
            });
        }
        catch {
            // ignore: history not available right now
        }
    }
    renderEntryIcon(entry, kind) {
        if (entry.icon) {
            return (React.createElement(Icon, { src: this.props.stateContext.getImagePath(entry.icon), style: { width: '1em', height: '1em' } }));
        }
        return kind === 'p' ? defaultProducerIcon(entry.deviceType) : defaultConsumerIcon(entry.deviceType);
    }
    openChart(target) {
        // Only open if history is enabled — otherwise the dialog has no data to draw.
        if (!target.historyId || !target.historyInstance) {
            return;
        }
        this.setState({ chartTarget: target });
    }
    /** Mini bar chart drawn inside a producer/consumer tile (Solarertrag-style). */
    static renderBars(bars, color) {
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
        const buckets = new Array(NBUCKETS).fill(NaN);
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
        return (React.createElement(Box, { sx: {
                position: 'absolute',
                left: 12,
                right: 12,
                bottom: 12,
                height: '50%',
                pointerEvents: 'none',
            } },
            React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none", style: { width: '100%', height: '100%', display: 'block' } }, buckets.map((v, i) => {
                if (isNaN(v) || v <= 0) {
                    return null;
                }
                const h = (v / max) * H;
                return (React.createElement("rect", { key: i, x: i * barWidth + gap / 2, y: H - h, width: barWidth - gap, height: h, fill: color, rx: 1.5 }));
            }))));
    }
    renderEntryTile(entry, rt, kind, refCb) {
        const color = entryColor(entry, kind === 'p' ? PRODUCER_DEFAULT_COLOR : CONSUMER_DEFAULT_COLOR);
        const name = entry.name || '';
        const clickable = !!rt.historyId && !!rt.historyInstance;
        // Show today badge only when the user actually configured a state. Renders "–" while the
        // first value is loading so the layout doesn't shift when the value arrives.
        const showTodayBadge = !!entry.todayStateId;
        const todayLabel = kind === 'p' ? I18n.t('wm_Today produced') : I18n.t('wm_Today consumed');
        return (React.createElement(Box, { ref: refCb, onClick: clickable
                ? () => this.openChart({
                    stateId: entry.stateId || '',
                    historyId: rt.historyId,
                    historyInstance: rt.historyInstance,
                    name,
                    color,
                    unit: rt.unit,
                })
                : undefined, sx: (theme) => ({
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
            }) },
            showTodayBadge ? (React.createElement(Box, { title: todayLabel, sx: {
                    position: 'absolute',
                    top: 10,
                    right: 12,
                    textAlign: 'right',
                    zIndex: 1,
                    // Cap width so long labels truncate instead of pushing into the header.
                    maxWidth: '55%',
                    pointerEvents: 'none',
                } },
                React.createElement(Typography, { sx: {
                        fontSize: 12,
                        lineHeight: 1,
                        opacity: 0.7,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    } }, todayLabel),
                React.createElement(Typography, { sx: {
                        fontSize: 22,
                        fontWeight: 700,
                        lineHeight: 1.1,
                        mt: 0.25,
                        color,
                        whiteSpace: 'nowrap',
                    } },
                    rt.todayVal == null
                        ? '–'
                        : formatFloat(rt.todayVal, Math.abs(rt.todayVal) >= 100 ? 0 : 1, this.props.stateContext.isFloatComma),
                    React.createElement(Typography, { component: "span", sx: { fontSize: '0.55em', fontWeight: 400, ml: 0.4, opacity: 0.6 } }, rt.todayUnit || 'kWh')))) : null,
            React.createElement(Box, { sx: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    fontSize: 14,
                    opacity: 0.9,
                    pr: showTodayBadge ? '60%' : 0,
                } },
                React.createElement(Box, { sx: { color, fontSize: 18, display: 'flex', alignItems: 'center' } }, this.renderEntryIcon(entry, kind)),
                React.createElement(Typography, { variant: "caption", sx: {
                        fontSize: 13,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    } }, name)),
            React.createElement(Typography, { sx: {
                    mt: 0.5,
                    fontSize: 28,
                    fontWeight: 700,
                    lineHeight: 1.05,
                } },
                rt.val == null ? '–' : formatFloat(rt.val, 0, this.props.stateContext.isFloatComma),
                React.createElement(Typography, { component: "span", sx: { fontSize: '0.55em', fontWeight: 400, ml: 0.5, opacity: 0.6 } }, rt.unit || 'W')),
            kind === 'p' ? WidgetEnergyFlow.renderBars(rt.bars, color) : null));
    }
    renderBatteryTile() {
        const settings = this.props.settings;
        const hasAny = settings.batterySocStateId ||
            settings.batteryVoltageStateId ||
            settings.batteryCurrentStateId ||
            settings.batteryPowerStateId;
        if (!hasAny) {
            return null;
        }
        const color = settings.batteryColor || ACCENT;
        const name = settings.batteryName || I18n.t('wm_Battery');
        const power = this.state.batteryPower;
        const status = power == null
            ? ''
            : power > 0
                ? I18n.t('wm_Charging')
                : power < 0
                    ? I18n.t('wm_Discharging')
                    : I18n.t('wm_Idle');
        const clickable = !!settings.batterySocStateId && !!this.state.batterySocHistoryId && !!this.state.batterySocHistoryInstance;
        const iconNode = settings.batteryIcon ? (React.createElement(Icon, { src: this.props.stateContext.getImagePath(settings.batteryIcon), style: { width: '1em', height: '1em' } })) : (this.state.batterySoc ?? 0) >= 95 ? (React.createElement(BatteryFull, { sx: { fontSize: 'inherit', color: 'inherit' } })) : (React.createElement(BatteryChargingFull, { sx: { fontSize: 'inherit', color: 'inherit' } }));
        return (React.createElement(Box, { ref: (el) => {
                this.batteryEl = el;
            }, onClick: clickable
                ? () => this.openChart({
                    stateId: settings.batterySocStateId,
                    historyId: this.state.batterySocHistoryId,
                    historyInstance: this.state.batterySocHistoryInstance,
                    name,
                    color,
                    unit: '%',
                })
                : undefined, sx: () => ({
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
            }) },
            React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 18 } },
                React.createElement(Box, { sx: { display: 'flex', alignItems: 'center' } }, iconNode),
                React.createElement(Typography, { variant: "body2" }, name)),
            React.createElement(Box, { sx: { display: 'flex', alignItems: 'baseline', gap: 1 } },
                React.createElement(Typography, { sx: { fontSize: 36, fontWeight: 700, lineHeight: 1 } },
                    this.state.batterySoc == null
                        ? '–'
                        : formatFloat(this.state.batterySoc, 0, this.props.stateContext.isFloatComma),
                    React.createElement(Typography, { component: "span", sx: { fontSize: '0.5em', fontWeight: 400, ml: 0.25, opacity: 0.85 } }, "%")),
                status ? React.createElement(Typography, { sx: { fontSize: 14, opacity: 0.85 } }, status) : null),
            React.createElement(Box, { sx: { display: 'flex', justifyContent: 'space-between', mt: 1, fontSize: 14 } },
                settings.batteryVoltageStateId ? (React.createElement(Box, null,
                    this.state.batteryVoltage == null
                        ? '–'
                        : formatFloat(this.state.batteryVoltage, 2, this.props.stateContext.isFloatComma),
                    React.createElement(Typography, { component: "span", sx: { fontSize: '0.85em', ml: 0.25, opacity: 0.7 } }, "V"))) : null,
                settings.batteryCurrentStateId ? (React.createElement(Box, null,
                    this.state.batteryCurrent == null
                        ? '–'
                        : formatFloat(this.state.batteryCurrent, 1, this.props.stateContext.isFloatComma),
                    React.createElement(Typography, { component: "span", sx: { fontSize: '0.85em', ml: 0.25, opacity: 0.7 } }, "A"))) : null,
                settings.batteryPowerStateId ? (React.createElement(Box, null,
                    this.state.batteryPower == null
                        ? '–'
                        : formatFloat(this.state.batteryPower, 0, this.props.stateContext.isFloatComma),
                    React.createElement(Typography, { component: "span", sx: { fontSize: '0.85em', ml: 0.25, opacity: 0.7 } }, "W"))) : null)));
    }
    /**
     * Per-tile dotted connector overlay (Victron-style). Each line carries circular dots that flow
     *  producer→battery and battery→consumer at a speed proportional to that entry's power; idle
     *  entries get a faded static line. Geometry comes from `flowGeom` (measured via refs).
     *
     *  Path geometry is delegated to xyflow's `getBezierPath` — it produces nicely tuned, position-
     *  aware Bézier curves with smooth handle tangents (Bottom→Top for producer→battery, Top→Bottom
     *  for battery→consumer). Animation uses inline SMIL per element so we avoid cross-SVG
     *  `@keyframes` conflicts with the launcher tile.
     */
    renderConnectors() {
        const geom = this.state.flowGeom;
        if (!geom || !geom.battery || (geom.producers.length === 0 && geom.consumers.length === 0)) {
            return null;
        }
        const battery = geom.battery;
        const accent = ACCENT;
        const batteryW = battery.rightX - battery.leftX;
        const halfW = batteryW / 2;
        // Keep attach points away from the battery's outer edges so the endpoint dots sit inside.
        const SIDE_MARGIN = 16;
        const STROKE_WIDTH = 4;
        const DASH_GAP = 9; // px between consecutive dot centres
        const dasharray = `0 ${DASH_GAP}`;
        const elements = [];
        // Spread n attach points evenly across [base, base + dir*span]; handles n===1 naturally.
        const fanX = (i, n, base, span, dir) => {
            const t = n === 1 ? 0.5 : (i + 0.5) / n;
            return base + dir * Math.max(0, span) * t;
        };
        // Track which animation keys we're using this render so stale entries get pruned at the end.
        const seenAnimKeys = new Set();
        const drawConnector = (key, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, duration) => {
            const [d] = getBezierPath({
                sourceX,
                sourceY,
                sourcePosition,
                targetX,
                targetY,
                targetPosition,
                // Slightly stiffer than the default 0.25 so multi-row stacks still curve clearly
                // without producing hairpin overshoots when source/target are close in Y.
                curvature: 0.35,
            });
            const flowing = duration > 0;
            // Persistent animation entry — `speed` updates on every render but `offset` survives,
            // so dots keep moving smoothly when power values update mid-animation.
            const animKey = `dialog:${key}`;
            seenAnimKeys.add(animKey);
            const anim = this.getConnectorAnim(animKey, DASH_GAP);
            anim.speed = flowing ? -DASH_GAP / duration : 0;
            elements.push(React.createElement("path", { key: `${key}-l`, ref: (el) => {
                    anim.el = el;
                    // Restore the preserved offset immediately so the very first paint
                    // doesn't snap to 0 before the rAF tick runs.
                    el?.setAttribute('stroke-dashoffset', anim.offset.toFixed(3));
                }, d: d, stroke: accent, strokeWidth: STROKE_WIDTH, strokeLinecap: "round", fill: "none", strokeDasharray: dasharray, opacity: flowing ? 0.95 : 0.35 }), React.createElement("circle", { key: `${key}-s`, cx: sourceX, cy: sourceY, r: 2.5, fill: accent, opacity: 0.9 }), React.createElement("circle", { key: `${key}-e`, cx: targetX, cy: targetY, r: 2.5, fill: accent, opacity: 0.9 }));
        };
        // Producer connectors: drawn FROM producer TO battery (dots flow producer → battery).
        // Source = tile bottom (Position.Bottom), target = battery top (Position.Top). Battery
        // attach points fan across the LEFT half of the battery's top edge so multiple producers
        // each get their own clean lane.
        const N = geom.producers.length;
        geom.producers.forEach((p, i) => {
            const power = this.state.producerRt[i]?.val ?? 0;
            const duration = WidgetEnergyFlow.flowDuration(Math.abs(power));
            const ax = fanX(i, N, battery.leftX + SIDE_MARGIN, halfW - SIDE_MARGIN, 1);
            drawConnector(`p${i}`, p.x, p.y, Position.Bottom, ax, battery.topY, Position.Top, duration);
        });
        // Consumer connectors: drawn FROM battery TO consumer (dots flow battery → consumer).
        // Source = battery top (Position.Top exits upward), target = consumer bottom (enters from
        // below). Path direction is what drives the SMIL flow direction.
        const M = geom.consumers.length;
        geom.consumers.forEach((c, j) => {
            const power = this.state.consumerRt[j]?.val ?? 0;
            const duration = WidgetEnergyFlow.flowDuration(Math.abs(power));
            const ax = fanX(j, M, battery.rightX - SIDE_MARGIN, halfW - SIDE_MARGIN, -1);
            drawConnector(`c${j}`, ax, battery.topY, Position.Top, c.x, c.y, Position.Bottom, duration);
        });
        // Prune stale dialog animation entries (e.g. producer count was reduced); keep launcher
        // entries (`launcher:*` prefix) untouched so they don't pause if the dialog is open.
        for (const k of Array.from(this.connectorAnims.keys())) {
            if (k.startsWith('dialog:') && !seenAnimKeys.has(k)) {
                this.connectorAnims.delete(k);
            }
        }
        this.ensureConnectorAnimLoop();
        return (React.createElement(Box, { sx: {
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 0,
            } },
            React.createElement("svg", { width: "100%", height: "100%", viewBox: `0 0 ${geom.cw} ${geom.ch}`, preserveAspectRatio: "none", style: { position: 'absolute', inset: 0 } }, elements)));
    }
    renderEnergyChartDialog() {
        const target = this.state.chartTarget;
        if (!target || !target.historyId || !target.historyInstance) {
            return null;
        }
        return (React.createElement(ChartDialog, { open: true, onClose: () => this.setState({ chartTarget: null }), title: target.name, historyIds: [{ id: target.historyId, color: target.color, name: target.name }], historyInstance: target.historyInstance, socket: this.props.stateContext.getSocket(), unit: target.unit, isFloatComma: this.props.stateContext.isFloatComma, widgetId: String(this.props.widget.id), instanceId: this.props.stateContext.instanceId }));
    }
    renderFlowContent() {
        const producers = this.props.settings.producers || [];
        const consumers = this.props.settings.consumers || [];
        const hasBattery = !!(this.props.settings.batterySocStateId ||
            this.props.settings.batteryVoltageStateId ||
            this.props.settings.batteryCurrentStateId ||
            this.props.settings.batteryPowerStateId);
        // Reset ref arrays each render so removed tiles don't leave dangling refs that confuse measurement.
        this.producerEls = [];
        this.consumerEls = [];
        return (React.createElement(Box, { ref: this.setFlowContainerRef, sx: (theme) => ({
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
                gap: 6,
                boxSizing: 'border-box',
            }) },
            this.renderConnectors(),
            React.createElement(Box, { sx: {
                    gridArea: 'producers',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    position: 'relative',
                    zIndex: 1,
                } }, producers.length === 0 ? (React.createElement(Box, { sx: { opacity: 0.4, fontSize: 13, textAlign: 'center', mt: 2 } }, I18n.t('wm_No producers'))) : (producers.map((p, i) => this.state.producerRt[i] ? (React.createElement(React.Fragment, { key: p.id || `p${i}` }, this.renderEntryTile(p, this.state.producerRt[i], 'p', el => {
                this.producerEls[i] = el;
            }))) : null))),
            React.createElement(Box, { sx: {
                    gridArea: 'consumers',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    position: 'relative',
                    zIndex: 1,
                } }, consumers.length === 0 ? (React.createElement(Box, { sx: { opacity: 0.4, fontSize: 13, textAlign: 'center', mt: 2 } }, I18n.t('wm_No consumers'))) : (consumers.map((c, i) => this.state.consumerRt[i] ? (React.createElement(React.Fragment, { key: c.id || `c${i}` }, this.renderEntryTile(c, this.state.consumerRt[i], 'c', el => {
                this.consumerEls[i] = el;
            }))) : null))),
            this.renderBatteryTile()));
    }
    /** Sum the live values of an entries-list, returning 0 when nothing is known yet. */
    static sumValues(rt) {
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
    static renderMetricBox(opts) {
        return (React.createElement(Box, { sx: {
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
            } },
            React.createElement(Typography, { sx: {
                    fontSize: 10,
                    opacity: 0.7,
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                } }, opts.label),
            React.createElement(Typography, { sx: { fontSize: opts.isWide ? 20 : 16, fontWeight: 700, lineHeight: 1.15, mt: 0.25 } },
                opts.value,
                React.createElement(Typography, { component: "span", sx: { fontSize: '0.55em', opacity: 0.6, ml: 0.25 } }, opts.unit))));
    }
    /**
     * Map a power value (W) to an animation duration (seconds) for the flow line.
     * Higher power → shorter duration → faster scrolling dashes.
     * Returns 0 when there is no significant flow (no animation).
     */
    static flowDuration(watts) {
        if (!watts || watts <= 1) {
            return 0;
        }
        // 100 W → ~3 s ; 500 W → ~1.3 s ; 2000 W → ~0.7 s ; 5000 W → ~0.4 s.
        return Math.max(0.35, Math.min(6, 30 / Math.sqrt(watts)));
    }
    renderLauncherTile(isWide) {
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
        const bottomCols = [];
        if (hasProducers) {
            bottomCols.push('p');
        }
        if (hasConsumers) {
            bottomCols.push('c');
        }
        const centerX = { p: 50, c: 50 };
        if (bottomCols.length > 0) {
            const step = 100 / bottomCols.length;
            bottomCols.forEach((c, i) => (centerX[c] = step * (i + 0.5)));
        }
        // Layout in viewBox 0..100. The bottom-row container is positioned at a
        // matching `top` percentage so the arrow tip always lands just above it,
        // not inside it.
        const BOTTOM_ROW_TOP_PCT = 64; // top of the bottom-row metric boxes (% of tile)
        const ARROW_TIP_Y = BOTTOM_ROW_TOP_PCT - 4; // a touch above the row
        return (React.createElement(Box, { onClick: () => this.setState({ flowDialogOpen: true }), sx: (theme) => ({
                width: '100%',
                // Let aspectRatio drive the height — height:100% would force the tile
                // to fill the grid row instead, defeating aspectRatio.
                height: size === '2x0.5' ? 80 : 'auto',
                aspectRatio: size === '2x0.5' ? undefined : size === '2x1' ? '2 / 1' : '1',
                p: 1.25,
                borderRadius: '14px',
                cursor: 'pointer',
                color: '#fff',
                background: `linear-gradient(145deg, ${accent}33 0%, ${theme.palette.mode === 'dark' ? 'rgba(8,18,32,0.92)' : 'rgba(8,22,40,0.96)'} 75%)`,
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
            }) },
            React.createElement(Box, { sx: {
                    position: 'absolute',
                    inset: 0,
                    zIndex: 3,
                    pointerEvents: 'none',
                    '& > *': { pointerEvents: 'auto' },
                } }, indicators),
            React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.75, position: 'relative', zIndex: 2 } },
                React.createElement(Bolt, { sx: { color: accent, fontSize: 20 } }),
                React.createElement(Typography, { variant: "caption", sx: {
                        fontSize: 13,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    } }, title)),
            size !== '2x0.5' && bottomCols.length > 0
                ? (() => {
                    // Battery node geometry. The central-node Box is at left:50%, top:30%,
                    // translate(-50%,-50%), width:34% → its bordered rectangle sits roughly at
                    // x=33..67, y=22..38 in viewBox units. Anchor the connectors just BELOW
                    // the battery (under its bottom-left and bottom-right corners) and use
                    // sourcePosition=Bottom so the curves drop straight DOWN to the
                    // producer/consumer tops — no horizontal overshoot, regardless of tile
                    // aspect (1x1, 2x1, 2x0.5, 2x2).
                    const BATTERY_BOTTOM_Y = size === '2x1' ? 15 : 30;
                    const BATTERY_LEFT_ATTACH_X = 30;
                    const BATTERY_RIGHT_ATTACH_X = 70;
                    const LAUNCHER_PERIOD = 5;
                    // xyflow's getBezierPath with Bottom→Top gives a clean S-curve down: cp1
                    // pushes the curve straight down from the source, cp2 pulls it straight
                    // down into the target. No lateral bow, so the line stays in the vertical
                    // corridor between battery and the box top.
                    const [pPath] = hasProducers
                        ? getBezierPath({
                            sourceX: BATTERY_LEFT_ATTACH_X,
                            sourceY: BATTERY_BOTTOM_Y,
                            sourcePosition: Position.Bottom,
                            targetX: centerX.p,
                            targetY: ARROW_TIP_Y,
                            targetPosition: Position.Top,
                        })
                        : ['', 0, 0, 0, 0];
                    const [cPath] = hasConsumers
                        ? getBezierPath({
                            sourceX: BATTERY_RIGHT_ATTACH_X,
                            sourceY: BATTERY_BOTTOM_Y,
                            sourcePosition: Position.Bottom,
                            targetX: centerX.c,
                            targetY: ARROW_TIP_Y,
                            targetPosition: Position.Top,
                        })
                        : ['', 0, 0, 0, 0];
                    // Persistent animation entries — speed is updated each render, offset
                    // survives so dots don't restart when power values update.
                    const pAnim = hasProducers ? this.getConnectorAnim('launcher:p', LAUNCHER_PERIOD) : null;
                    if (pAnim) {
                        pAnim.speed = producerDuration > 0 ? LAUNCHER_PERIOD / producerDuration : 0;
                    }
                    const cAnim = hasConsumers ? this.getConnectorAnim('launcher:c', LAUNCHER_PERIOD) : null;
                    if (cAnim) {
                        cAnim.speed = consumerDuration > 0 ? -LAUNCHER_PERIOD / consumerDuration : 0;
                    }
                    // Drop launcher entries that were just removed (e.g. producers config emptied).
                    if (!hasProducers) {
                        this.connectorAnims.delete('launcher:p');
                    }
                    if (!hasConsumers) {
                        this.connectorAnims.delete('launcher:c');
                    }
                    this.ensureConnectorAnimLoop();
                    return (React.createElement("svg", { viewBox: "0 0 100 100", preserveAspectRatio: "none", style: { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 } },
                        hasProducers && pAnim ? (React.createElement(React.Fragment, null,
                            React.createElement("path", { ref: (el) => {
                                    pAnim.el = el;
                                    el?.setAttribute('stroke-dashoffset', pAnim.offset.toFixed(3));
                                }, d: pPath, stroke: accent, strokeWidth: "2", strokeLinecap: "round", strokeDasharray: "0 5", fill: "none", opacity: producerDuration > 0 ? 0.95 : 0.4 }),
                            React.createElement("circle", { cx: centerX.p, cy: ARROW_TIP_Y, r: 1.5, fill: 'blue', opacity: 0.9 }),
                            React.createElement("circle", { cx: BATTERY_LEFT_ATTACH_X, cy: BATTERY_BOTTOM_Y, r: 1.5, fill: 'red', opacity: 0.9 }))) : null,
                        hasConsumers && cAnim ? (React.createElement(React.Fragment, null,
                            React.createElement("path", { ref: (el) => {
                                    cAnim.el = el;
                                    el?.setAttribute('stroke-dashoffset', cAnim.offset.toFixed(3));
                                }, d: cPath, stroke: accent, strokeWidth: "2", strokeLinecap: "round", strokeDasharray: "0 5", fill: "none", opacity: consumerDuration > 0 ? 0.95 : 0.4 }),
                            React.createElement("circle", { cx: BATTERY_RIGHT_ATTACH_X, cy: BATTERY_BOTTOM_Y, r: 1.5, fill: accent, opacity: 0.9 }),
                            React.createElement("circle", { cx: centerX.c, cy: ARROW_TIP_Y, r: 1.5, fill: accent, opacity: 0.9 }))) : null));
                })()
                : null,
            React.createElement(Box, { sx: {
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
                } }, hasBattery ? (React.createElement(React.Fragment, null,
                React.createElement(Typography, { sx: { fontSize: 9, opacity: 0.7, lineHeight: 1 } }, I18n.t('wm_Battery')),
                React.createElement(Typography, { sx: { fontSize: isWide ? 18 : 15, fontWeight: 700, lineHeight: 1.05, mt: 0.25 } },
                    this.state.batterySoc == null
                        ? '–'
                        : formatFloat(this.state.batterySoc, 0, isFloatComma),
                    React.createElement(Typography, { component: "span", sx: { fontSize: '0.55em', opacity: 0.6, ml: 0.25 } }, "%")))) : (React.createElement(Bolt, { sx: { color: accent, fontSize: '1.1em' } }))),
            React.createElement(Box, { sx: {
                    position: 'absolute',
                    left: 8,
                    right: 8,
                    top: `${BOTTOM_ROW_TOP_PCT}%`,
                    bottom: 8,
                    display: 'grid',
                    gridTemplateColumns: `repeat(${Math.max(1, bottomCols.length)}, 1fr)`,
                    gap: 3,
                    zIndex: 2,
                } },
                hasProducers
                    ? WidgetEnergyFlow.renderMetricBox({
                        label: `↑ ${I18n.t('wm_Producers')}`,
                        value: formatFloat(producerTotal, 0, isFloatComma),
                        unit: 'W',
                        color: accent,
                        isWide,
                    })
                    : null,
                hasConsumers
                    ? WidgetEnergyFlow.renderMetricBox({
                        label: `↓ ${I18n.t('wm_Consumers')}`,
                        value: formatFloat(consumerTotal, 0, isFloatComma),
                        unit: 'W',
                        color: accent,
                        isWide,
                    })
                    : null)));
    }
    renderFlowDialog() {
        if (!this.state.flowDialogOpen) {
            return null;
        }
        const title = this.props.settings.name || I18n.t('wm_EnergyFlow');
        return (React.createElement(Dialog, { open: true, onClose: () => this.setState({ flowDialogOpen: false }), maxWidth: "md", fullWidth: true, slotProps: { paper: { sx: { height: '85vh', maxHeight: 700 } } } },
            React.createElement(DialogTitle, { sx: { display: 'flex', alignItems: 'center', pr: 6, pb: 0.5 } },
                title,
                React.createElement(IconButton, { onClick: () => this.setState({ flowDialogOpen: false }), sx: { position: 'absolute', right: 8, top: 8 } },
                    React.createElement(Close, null))),
            React.createElement(DialogContent, { sx: { p: 1.5, overflow: 'auto' } }, this.renderFlowContent())));
    }
    renderCompact() {
        return this.renderLauncherTile(false);
    }
    renderWide() {
        return this.renderLauncherTile(true);
    }
    renderWideTall() {
        return this.renderLauncherTile(true);
    }
    renderHuge() {
        return this.renderLauncherTile(true);
    }
    render() {
        return (React.createElement(React.Fragment, null,
            super.render(),
            this.renderFlowDialog(),
            this.renderEnergyChartDialog()));
    }
}
//# sourceMappingURL=EnergyFlow.js.map