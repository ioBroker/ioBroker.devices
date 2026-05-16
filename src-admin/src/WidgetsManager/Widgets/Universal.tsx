import React from 'react';
import { Box, type Theme, Typography } from '@mui/material';
import { Icon } from '@iobroker/adapter-react-v5';

import type { ConfigItemPanel } from '@iobroker/json-config';

import type { StateChangeListener } from '../StateContext';
import WidgetGeneric, {
    type WidgetGenericState,
    type WidgetGenericProps,
    type ChartSeries,
    formatFloat,
} from './Generic';
import ChartDialog from './ChartDialog';

/** Maximum number of samples kept in the QuickChart rolling buffer */
const QUICK_CHART_MAX_SAMPLES = 2000;
/** Minimum visible time window for QuickChart (seconds) */
const QUICK_CHART_MIN_WINDOW_SEC = 10;
/** Default visible time window for QuickChart (seconds) */
const QUICK_CHART_DEFAULT_WINDOW_SEC = 60;
/** Internal sampling rate (ms). Independent of the visible window. */
const QUICK_CHART_SAMPLE_MS = 1000;

import type { CustomWidgetBase } from '../../../../packages/dm-widgets/src/index';

interface ColorLevel {
    value: number;
    color: string;
}

interface IconDef {
    stateId: string;
    icon: string;
    color: string;
}

export interface WidgetUniversalSettings extends CustomWidgetBase {
    secondaryName?: string;
    digits?: number;
    /** Widget icon (inactive / default) */
    widgetIcon?: string;
    /** Widget icon when active (shown when action state is truthy) */
    widgetIconActive?: string;
    stateId?: string;
    secondaryStateId?: string;
    opacityStateId?: string;
    opacityFalse?: number;
    opacityTrue?: number;
    colorLevels?: ColorLevel[];
    icons?: IconDef[];
    actionStateId?: string;
    actionType?: 'value' | 'toggle';
    actionValue?: string | number | boolean;
    /** Confirmation before executing action: 'none', 'dialog', or 'pin' */
    actionConfirm?: 'none' | 'dialog' | 'pin';
    /** When to require confirmation: 'on' (turn on), 'off' (turn off), 'both' */
    actionConfirmScope?: 'on' | 'off' | 'both';
    /** Custom confirmation dialog text */
    actionConfirmText?: string;
    /** PIN code required when actionConfirm is 'pin' */
    actionPin?: string;
    /** Enable an in-memory chart sampled in real time (works without a history adapter) */
    quickChart?: boolean;
    /** Visible QuickChart time window in seconds (minimum 10) */
    quickChartInterval?: number;
}

interface WidgetUniversalState extends WidgetGenericState {
    value: number | null;
    unit: string;
    commonType: ioBroker.CommonType;
    secondaryValue: number | null;
    secondaryUnit: string;
    opacity: number;
    iconStates: boolean[];
    /** Whether the action state is currently truthy (for active icon) */
    actionActive: boolean;
    chartOpen: boolean;
    historyId: string | null;
    historyInstance: string;
    /** Rolling buffer of samples collected when quickChart is enabled */
    quickSamples: { ts: number; val: number }[];
}

export class WidgetUniversal extends WidgetGeneric<WidgetUniversalState, WidgetUniversalSettings> {
    static getConfigSchema(): ConfigItemPanel {
        return {
            type: 'panel',
            label: 'wm_Universal',
            items: {
                stateId: { type: 'objectId', label: 'wm_State ID' },
                name: { type: 'text', label: 'wm_Name', default: '' },
                digits: { type: 'number', label: 'wm_Digits after comma', default: 1, min: 0, max: 5 },
                widgetIcon: { type: 'component', subType: 'iconSelect', label: 'wm_Icon', sm: 6 },
                widgetIconActive: { type: 'component', subType: 'iconSelect', label: 'wm_Active icon', sm: 6 },
                secondaryStateId: { type: 'objectId', label: 'wm_Secondary value' },
                secondaryName: { type: 'text', label: 'wm_Secondary name', default: '' },
                actionStateId: { type: 'objectId', label: 'wm_Action state' },
                actionType: {
                    type: 'select',
                    label: 'wm_Action type',
                    options: [
                        { value: 'toggle', label: 'wm_Toggle' },
                        { value: 'value', label: 'wm_Send value' },
                    ],
                    default: 'toggle',
                    format: 'radio',
                    hidden: '!data.actionStateId',
                },
                actionValue: {
                    type: 'text',
                    label: 'wm_Action value',
                    help: 'wm_Action value help',
                    default: '',
                    hidden: "!data.actionStateId || data.actionType !== 'value'",
                },
                actionConfirm: {
                    type: 'select',
                    label: 'wm_Confirmation',
                    options: [
                        { value: 'none', label: 'wm_No confirmation' },
                        { value: 'dialog', label: 'wm_Confirm dialog' },
                        { value: 'pin', label: 'wm_PIN code' },
                    ],
                    default: 'none',
                    format: 'dropdown',
                    hidden: '!data.actionStateId',
                },
                actionConfirmScope: {
                    type: 'select',
                    label: 'wm_Confirm scope',
                    options: [
                        { value: 'both', label: 'wm_On and off' },
                        { value: 'on', label: 'wm_On only' },
                        { value: 'off', label: 'wm_Off only' },
                    ],
                    default: 'both',
                    format: 'radio',
                    hidden: "!data.actionStateId || data.actionConfirm === 'none' || !data.actionConfirm",
                },
                actionConfirmText: {
                    type: 'text',
                    label: 'wm_Confirmation text',
                    default: '',
                    hidden: "!data.actionStateId || data.actionConfirm === 'none' || !data.actionConfirm",
                },
                actionPin: {
                    type: 'text',
                    label: 'wm_PIN',
                    default: '',
                    hidden: "!data.actionStateId || data.actionConfirm !== 'pin'",
                },
                colorLevels: { type: 'component', subType: 'colorLevels', label: 'wm_Color levels' },
                quickChart: {
                    type: 'checkbox',
                    label: 'wm_Quick chart',
                    help: 'wm_Quick chart help',
                    default: false,
                },
                quickChartInterval: {
                    type: 'number',
                    label: 'wm_Quick chart window',
                    default: QUICK_CHART_DEFAULT_WINDOW_SEC,
                    min: QUICK_CHART_MIN_WINDOW_SEC,
                    step: 1,
                    hidden: '!data.quickChart',
                },
                opacityStateId: { type: 'objectId', label: 'wm_Opacity state' },
                opacityFalse: {
                    type: 'number',
                    label: 'wm_Opacity when false',
                    default: 0,
                    min: 0,
                    max: 1,
                    step: 0.1,
                    hidden: '!data.opacityStateId',
                },
                opacityTrue: {
                    type: 'number',
                    label: 'wm_Opacity when true',
                    default: 1,
                    min: 0,
                    max: 1,
                    step: 0.1,
                    hidden: '!data.opacityStateId',
                },
                _iconsPanel: {
                    type: 'panel',
                    label: 'wm_Indicator icons',
                    collapsable: true,
                    items: {
                        icon1StateId: { type: 'objectId', label: 'wm_Icon 1 state', sm: 12 },
                        icon1Name: { type: 'component', subType: 'iconSelect', label: 'wm_Icon 1 name', sm: 6 },
                        icon1Color: { type: 'color', label: 'wm_Icon 1 color', sm: 6 },
                        icon2StateId: { type: 'objectId', label: 'wm_Icon 2 state', sm: 12 },
                        icon2Name: { type: 'component', subType: 'iconSelect', label: 'wm_Icon 2 name', sm: 6 },
                        icon2Color: { type: 'color', label: 'wm_Icon 2 color', sm: 6 },
                        icon3StateId: { type: 'objectId', label: 'wm_Icon 3 state', sm: 12 },
                        icon3Name: { type: 'component', subType: 'iconSelect', label: 'wm_Icon 3 name', sm: 6 },
                        icon3Color: { type: 'color', label: 'wm_Icon 3 color', sm: 6 },
                    },
                },
                colorActive: { type: 'color', label: 'wm_Active color' },
            },
        };
    }

    /** Build WidgetUniversalSettings from a flat CustomWidgetBase (resolves icon1StateId/icon1Name/icon1Color → icons[]) */
    static buildSettings(def: CustomWidgetBase): WidgetUniversalSettings {
        const d = def as Record<string, any>;
        return {
            ...def,
            icons: [
                d.icon1StateId ? { stateId: d.icon1StateId, icon: d.icon1Name || '', color: d.icon1Color || '' } : null,
                d.icon2StateId ? { stateId: d.icon2StateId, icon: d.icon2Name || '', color: d.icon2Color || '' } : null,
                d.icon3StateId ? { stateId: d.icon3StateId, icon: d.icon3Name || '', color: d.icon3Color || '' } : null,
            ].filter(Boolean) as IconDef[],
        } as WidgetUniversalSettings;
    }

    private primaryHandler: StateChangeListener | null = null;
    private actionHandler: StateChangeListener | null = null;
    private secondaryHandler: StateChangeListener | null = null;
    private opacityHandler: StateChangeListener | null = null;
    private iconHandlers: (StateChangeListener | null)[] = [];

    /** Cached object metadata keyed by state ID */
    private objectCache = new Map<string, ioBroker.StateObject>();

    /** Resolved settings with icons[] built from flat icon1/2/3 fields */
    private resolved: WidgetUniversalSettings;

    constructor(props: WidgetGenericProps<WidgetUniversalSettings>) {
        super(props);
        this.resolved = WidgetUniversal.buildSettings(props.settings);
        this.state = {
            ...this.state,
            value: null,
            unit: '',
            commonType: 'mixed',
            secondaryValue: null,
            secondaryUnit: '',
            opacity: 1,
            iconStates: [false, false, false],
            actionActive: false,
            chartOpen: false,
            historyId: null,
            historyInstance: '',
            quickSamples: [],
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.subscribe();
        this.startQuickChartSampling();
    }

    componentDidUpdate(prev: WidgetGenericProps<WidgetUniversalSettings>): void {
        if (prev.settings !== this.props.settings) {
            this.resolved = WidgetUniversal.buildSettings(this.props.settings);
        }
        if (
            prev.settings.stateId !== this.props.settings.stateId ||
            prev.settings.secondaryStateId !== this.props.settings.secondaryStateId ||
            prev.settings.opacityStateId !== this.props.settings.opacityStateId ||
            prev.settings.actionStateId !== this.props.settings.actionStateId ||
            prev.settings.icons !== this.props.settings.icons
        ) {
            this.unsubscribe();
            this.objectCache.clear();
            this.subscribe();
        }
        if (
            prev.settings.quickChart !== this.props.settings.quickChart ||
            prev.settings.quickChartInterval !== this.props.settings.quickChartInterval ||
            prev.settings.stateId !== this.props.settings.stateId
        ) {
            this.startQuickChartSampling();
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        this.unsubscribe();
        this.stopQuickChartSampling();
    }

    private quickChartTimer: ReturnType<typeof setInterval> | null = null;
    /** Forces a re-render every 1s so the locked window keeps scrolling even when the value doesn't change. */
    private quickChartTickTimer: ReturnType<typeof setInterval> | null = null;

    private stopQuickChartSampling(): void {
        if (this.quickChartTimer) {
            clearInterval(this.quickChartTimer);
            this.quickChartTimer = null;
        }
        if (this.quickChartTickTimer) {
            clearInterval(this.quickChartTickTimer);
            this.quickChartTickTimer = null;
        }
    }

    /** Start (or restart) periodic sampling of the primary value into the quick-chart buffer */
    private startQuickChartSampling(): void {
        this.stopQuickChartSampling();
        if (!this.props.settings.quickChart || !this.props.settings.stateId) {
            this.setState({ quickSamples: [] });
            return;
        }
        // Sample at a fixed internal rate so the chart scrolls smoothly. The
        // user-configured `quickChartInterval` is the visible WINDOW size, not
        // the sampling rate.
        this.captureQuickSample();
        this.quickChartTimer = setInterval(() => this.captureQuickSample(), QUICK_CHART_SAMPLE_MS);
        // Independent ticker — guarantees the chart re-renders (and the
        // window slides) even if no new sample arrives (e.g. value is null).
        this.quickChartTickTimer = setInterval(() => this.forceUpdate(), 1000);
    }

    /** Maximum buffer time-span we ever keep — derived from the configured window. */
    private getQuickBufferKeepMs(): number {
        const windowSec = Math.max(
            QUICK_CHART_MIN_WINDOW_SEC,
            Number(this.props.settings.quickChartInterval) || QUICK_CHART_DEFAULT_WINDOW_SEC,
        );
        return Math.ceil(windowSec * 1000 * 1.2);
    }

    private captureQuickSample(value?: number): void {
        const val = value ?? this.state.value;
        if (val == null || !Number.isFinite(val)) {
            return;
        }
        const now = Date.now();
        const sample = { ts: now, val };
        const cutoff = now - this.getQuickBufferKeepMs();
        this.setState(prev => {
            // Drop anything older than 1.2× the window; also enforce the hard
            // sample-count cap as a safety net.
            let next = prev.quickSamples.filter(p => p.ts >= cutoff);
            if (next.length >= QUICK_CHART_MAX_SAMPLES) {
                next = next.slice(next.length - QUICK_CHART_MAX_SAMPLES + 1);
            }
            next.push(sample);
            return { quickSamples: next };
        });
    }

    /**
     * Mini sparkline drawn at the bottom of the tile when QuickChart is on.
     * The x-axis is locked to a fixed window of `quickChartInterval` seconds
     * ending at "now" — when there is less data than the window, the line
     * stays on the right edge and the left side is empty.
     */
    private renderQuickChart(): React.JSX.Element | null {
        if (!this.props.settings.quickChart || this.state.historyId) {
            return null;
        }
        const windowSec = Math.max(
            QUICK_CHART_MIN_WINDOW_SEC,
            Number(this.props.settings.quickChartInterval) || QUICK_CHART_DEFAULT_WINDOW_SEC,
        );
        const now = Date.now();
        const tsMin = now - windowSec * 1000;
        const visible = this.state.quickSamples.filter(p => p.ts >= tsMin && p.ts <= now);
        if (visible.length < 2) {
            return null;
        }
        const W = 200;
        const H = 60;
        const tsRange = windowSec * 1000;
        let valMin = Infinity;
        let valMax = -Infinity;
        for (const p of visible) {
            if (p.val < valMin) {
                valMin = p.val;
            }
            if (p.val > valMax) {
                valMax = p.val;
            }
        }
        const valRange = valMax - valMin || 1;
        const padMin = valMin - valRange * 0.1;
        const padRange = valMax + valRange * 0.1 - padMin;
        const pts = visible.map(p => ({
            x: ((p.ts - tsMin) / tsRange) * W,
            y: H - ((p.val - padMin) / padRange) * H,
        }));
        const line = pts.map((p, j) => `${j === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('');
        const lastX = pts[pts.length - 1].x.toFixed(1);
        const firstX = pts[0].x.toFixed(1);
        const color = this.getValueColor() || this.props.settings.color || '#2196f3';
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
                    <path
                        d={`${line} L${lastX},${H} L${firstX},${H} Z`}
                        fill={color}
                        opacity={0.15}
                    />
                    <path
                        d={line}
                        fill="none"
                        stroke={color}
                        strokeWidth="1.5"
                        opacity={0.5}
                    />
                </svg>
            </Box>
        );
    }

    /** Get a StateObject from cache or fetch it once */
    private async getCachedObject(id: string): Promise<ioBroker.StateObject | undefined> {
        const cached = this.objectCache.get(id);
        if (cached) {
            return cached;
        }
        const obj = await this.props.stateContext?.getObject<ioBroker.StateObject>(id);
        if (obj) {
            this.objectCache.set(id, obj);
        }
        return obj;
    }

    private subscribe(): void {
        const ctx = this.props.stateContext;
        if (!ctx) {
            return;
        }

        // Primary value
        if (this.props.settings.stateId) {
            this.primaryHandler = (_id, state) => {
                const val = state?.val;
                const num = val != null ? Number(val) : null;
                this.setState({ value: num });
                // Capture immediately on every state change when QuickChart is on,
                // so the chart populates without waiting for the next interval tick.
                if (this.props.settings.quickChart && num != null && Number.isFinite(num)) {
                    this.captureQuickSample(num);
                }
            };
            ctx.getState(this.props.settings.stateId, this.primaryHandler);
            void this.getCachedObject(this.props.settings.stateId).then(obj => {
                if (obj?.common?.unit) {
                    this.setState({ unit: obj.common.unit, commonType: obj.common.type });
                } else if (obj?.common?.type) {
                    this.setState({ commonType: obj.common.type });
                }
            });
        }

        // Secondary value
        if (this.props.settings.secondaryStateId) {
            this.secondaryHandler = (_id, state) => {
                const val = state?.val;
                this.setState({ secondaryValue: val != null ? Number(val) : null });
            };
            ctx.getState(this.props.settings.secondaryStateId, this.secondaryHandler);
            void this.getCachedObject(this.props.settings.secondaryStateId).then(obj => {
                if (obj?.common?.unit) {
                    this.setState({ secondaryUnit: obj.common.unit });
                }
            });
        }

        // Opacity
        if (this.props.settings.opacityStateId) {
            this.opacityHandler = (_id, state) => {
                const val = state?.val;
                if (typeof val === 'boolean') {
                    this.setState({
                        opacity: val ? (this.props.settings.opacityTrue ?? 1) : (this.props.settings.opacityFalse ?? 0),
                    });
                } else if (val != null) {
                    // Will compute properly once we have min/max from object
                    this.computeNumericOpacity(Number(val));
                }
            };
            ctx.getState(this.props.settings.opacityStateId, this.opacityHandler);
            void this.getCachedObject(this.props.settings.opacityStateId).then(obj => {
                const common = obj?.common;
                this.opacityMeta = {
                    min: common?.min,
                    max: common?.max,
                    type: common?.type,
                };
            });
        }

        // Icons (up to 3)
        const icons = (this.resolved.icons || []).slice(0, 3);
        this.iconHandlers = icons.map((iconDef, idx) => {
            if (!iconDef.stateId) {
                return null;
            }
            const handler: StateChangeListener = (_id, state) => {
                this.setState(prev => {
                    const iconStates = [...prev.iconStates];
                    iconStates[idx] = !!state?.val;
                    return { iconStates };
                });
            };
            ctx.getState(iconDef.stateId, handler);
            return handler;
        });

        // Subscribe to action state for active tile color / active icon + pre-fetch object
        if (this.props.settings.actionStateId) {
            void this.getCachedObject(this.props.settings.actionStateId);
            this.actionHandler = (_id, state) => {
                this.setState({ actionActive: !!state?.val });
            };
            ctx.getState(this.props.settings.actionStateId, this.actionHandler);
        }

        // Resolve history for chart
        this.resolveHistory();
    }

    private opacityMeta: { min?: number; max?: number; type?: string } = {};

    /** Check if the primary state has history enabled and resolve the history adapter */
    private resolveHistory(): void {
        const { stateId } = this.props.settings;
        const { stateContext } = this.props;
        if (!stateId || !stateContext) {
            this.setState({ historyId: null, historyInstance: '' });
            return;
        }
        const socket = stateContext.getSocket();

        void (async () => {
            let instance = stateContext.defaultHistory || '';
            if (!instance) {
                try {
                    const cfg = await socket.getObject('system.config');
                    instance = ((cfg?.common as unknown as Record<string, unknown>)?.defaultHistory as string) || '';
                } catch {
                    // ignore
                }
            }
            if (!instance) {
                this.setState({ historyId: null, historyInstance: '' });
                return;
            }

            try {
                const obj = await this.getCachedObject(stateId);
                if (obj?.common?.custom?.[instance]?.enabled) {
                    this.setState({ historyId: stateId, historyInstance: instance });
                    return;
                }
                // Follow alias
                const aliasId = obj?.common?.alias?.id;
                if (aliasId) {
                    const targetId = typeof aliasId === 'object' ? (aliasId as { read?: string }).read : aliasId;
                    if (targetId && targetId !== stateId) {
                        const targetObj = await socket.getObject(targetId);
                        if ((targetObj as ioBroker.StateObject)?.common?.custom?.[instance]?.enabled) {
                            this.setState({ historyId: targetId, historyInstance: instance });
                            return;
                        }
                    }
                }
            } catch {
                // ignore
            }
            this.setState({ historyId: null, historyInstance: instance });
        })();
    }

    private computeNumericOpacity(val: number): void {
        const { min, max } = this.opacityMeta;
        let opacity: number;
        if (min != null && max != null && max !== min) {
            opacity = Math.max(0, Math.min(1, (val - min) / (max - min)));
        } else {
            // Assume 0-1 range
            opacity = Math.max(0, Math.min(1, val));
        }
        this.setState({ opacity });
    }

    private unsubscribe(): void {
        const ctx = this.props.stateContext;
        if (!ctx) {
            return;
        }
        if (this.primaryHandler && this.props.settings.stateId) {
            ctx.removeState(this.props.settings.stateId, this.primaryHandler);
            this.primaryHandler = null;
        }
        if (this.secondaryHandler && this.props.settings.secondaryStateId) {
            ctx.removeState(this.props.settings.secondaryStateId, this.secondaryHandler);
            this.secondaryHandler = null;
        }
        if (this.opacityHandler && this.props.settings.opacityStateId) {
            ctx.removeState(this.props.settings.opacityStateId, this.opacityHandler);
            this.opacityHandler = null;
        }
        if (this.actionHandler && this.props.settings.actionStateId) {
            ctx.removeState(this.props.settings.actionStateId, this.actionHandler);
            this.actionHandler = null;
        }
        const icons = (this.resolved.icons || []).slice(0, 3);
        for (let i = 0; i < this.iconHandlers.length; i++) {
            const handler = this.iconHandlers[i];
            if (handler && icons[i]?.stateId) {
                ctx.removeState(icons[i].stateId, handler);
            }
        }
        this.iconHandlers = [];
    }

    private getValueColor(): string | undefined {
        const { value } = this.state;
        const levels = this.props.settings.colorLevels;
        if (value == null || !levels?.length) {
            return this.props.settings.color || undefined;
        }
        const sorted = [...levels].sort((a, b) => a.value - b.value);
        for (const lvl of sorted) {
            if (value <= lvl.value) {
                return lvl.color;
            }
        }
        return sorted[sorted.length - 1].color;
    }

    private formatValue(val: number): string {
        const digits = this.props.settings.digits ?? 1;
        return formatFloat(val, digits, this.props.stateContext.isFloatComma);
    }

    /** Execute the action (send value / toggle) — called after confirmation if needed */
    private async executeAction(): Promise<void> {
        const { actionStateId, actionType, actionValue } = this.props.settings;
        const { stateContext } = this.props;
        if (!actionStateId || !stateContext) {
            return;
        }
        const socket = stateContext.getSocket();
        const obj = await this.getCachedObject(actionStateId);
        const commonType = obj?.common?.type;
        if (actionType === 'value') {
            let val: ioBroker.StateValue;
            if (commonType === 'boolean') {
                val = actionValue === 'true' || actionValue === true || actionValue === 1;
            } else if (commonType === 'number') {
                val = Number(actionValue);
            } else {
                val = actionValue != null ? String(actionValue) : '';
            }
            await socket.setState(actionStateId, val);
        } else {
            const state = await socket.getState(actionStateId);
            if (state) {
                if (commonType === 'boolean') {
                    void socket.setState(actionStateId, !state.val);
                } else if (commonType === 'number') {
                    const min = obj?.common.min ?? 0;
                    const max = obj?.common.max ?? 100;
                    void socket.setState(actionStateId, state.val === min ? max : min);
                } else {
                    void socket.setState(actionStateId, !state.val);
                }
            }
        }
    }

    /** Check if confirmation is needed for the current action direction */
    private needsConfirmation(): boolean {
        const confirm = this.props.settings.actionConfirm || 'none';
        if (confirm === 'none') {
            return false;
        }
        const scope = this.props.settings.actionConfirmScope || 'both';
        if (scope === 'both') {
            return true;
        }
        // 'on' = confirm when turning on (currently off → will turn on)
        // 'off' = confirm when turning off (currently on → will turn off)
        const isCurrentlyActive = this.state.actionActive;
        return scope === 'on' ? !isCurrentlyActive : isCurrentlyActive;
    }

    private handleTileClick = (): void => {
        if (this.props.settings.actionStateId && this.props.stateContext) {
            if (this.needsConfirmation()) {
                const mode = this.props.settings.actionConfirm!;
                if (mode === 'pin') {
                    this.showPinPad(this.props.settings.actionPin || '');
                } else {
                    this.showConfirmDialog('dialog', undefined, this.props.settings.actionConfirmText);
                }
            } else {
                void this.executeAction();
            }
        } else if (this.state.historyId || this.props.settings.quickChart) {
            this.setState({ chartOpen: true });
        }
    };

    protected onPinPadSuccess(): void {
        void this.executeAction();
    }

    protected onConfirmDialogSuccess(): void {
        void this.executeAction();
    }

    static renderIcon(iconDef: IconDef, active: boolean, iconSize = 18): React.JSX.Element | null {
        if (!active || !iconDef.icon) {
            return null;
        }
        return (
            <Icon
                src={iconDef.icon}
                style={{ width: iconSize, height: iconSize, color: iconDef.color || undefined }}
            />
        );
    }

    /** Shared tile rendering used by renderCompact, renderWide, and renderWideTall */
    private renderTile(isWide: boolean, isWideTall: boolean): React.JSX.Element {
        const { opacity, value, unit, secondaryValue, secondaryUnit, iconStates } = this.state;
        const isEditing = !!this.props.onOpenSettings;

        // In edit mode, ensure minimum visibility
        const displayOpacity = isEditing ? Math.max(opacity, 0.35) : opacity;

        const valueColor = this.getValueColor();
        const icons = (this.resolved.icons || []).slice(0, 3);
        const activeIcons = icons.filter((_, i) => iconStates[i]);
        const chartAvailable = !!this.state.historyId || !!this.props.settings.quickChart;
        const clickable = !!this.props.settings.actionStateId || chartAvailable;

        const size = this.props.settings.size || '1x1';
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);

        return (
            <Box
                sx={theme => ({
                    ...(isWideTall
                        ? WidgetGeneric.getStyleWideTall(theme)
                        : isWide
                          ? WidgetGeneric.getStyleWide(theme)
                          : WidgetGeneric.getStyleCompact(theme)),
                    ...(!isWideTall && {
                        aspectRatio: size === '2x0.5' ? undefined : '1',
                    }),
                    ...(size === '2x0.5' && { height: 80 }),
                    opacity: displayOpacity < 1 ? displayOpacity : undefined,
                    transition: 'opacity 0.3s ease',
                })}
            >
                {/* Sizer: matches 1x1 tile height for 2x1 layout */}
                {isWideTall && <Box sx={{ width: 'calc(50% - 6px)', aspectRatio: '1' }} />}
                <Box
                    onClick={clickable ? this.handleTileClick : undefined}
                    sx={(theme: Theme) => ({
                        ...this.applyTileStyles(theme, this.state.actionActive, {
                            interactive: clickable,
                            accent: this.state.actionActive
                                ? this.props.settings.colorActive || this.props.settings.color
                                : this.props.settings.color,
                            inactiveColor: this.props.settings.color,
                        }),
                        ...(isWideTall
                            ? { position: 'absolute' as const, inset: 0 }
                            : { width: '100%', height: '100%' }),
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 1.5,
                        cursor: clickable ? 'pointer' : 'default',
                    })}
                >
                    {this.renderQuickChart()}
                    {indicators}

                    {/* Secondary value — upper right */}
                    {secondaryValue != null || this.props.settings.secondaryName ? (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 6,
                                right: 8,
                                textAlign: 'right',
                            }}
                        >
                            {secondaryValue != null ? (
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontSize: isWide ? 18 : 14,
                                        lineHeight: 1.2,
                                        color: 'text.secondary',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {this.formatValue(secondaryValue)}
                                    {secondaryUnit ? (
                                        <Typography
                                            component="span"
                                            sx={{ fontSize: '0.8em', ml: 0.25, opacity: 0.7 }}
                                        >
                                            {secondaryUnit}
                                        </Typography>
                                    ) : null}
                                </Typography>
                            ) : null}
                            {this.props.settings.secondaryName ? (
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontSize: 10,
                                        lineHeight: 1,
                                        color: 'text.disabled',
                                        display: 'block',
                                    }}
                                >
                                    {this.props.settings.secondaryName}
                                </Typography>
                            ) : null}
                        </Box>
                    ) : null}

                    {/* Icon indicators — upper left */}
                    {activeIcons.length > 0 ? (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                display: 'flex',
                                gap: 0.5,
                            }}
                        >
                            {icons.map((iconDef, i) => (
                                <React.Fragment key={i}>
                                    {WidgetUniversal.renderIcon(iconDef, iconStates[i], isWide ? 28 : 18)}
                                </React.Fragment>
                            ))}
                        </Box>
                    ) : null}

                    {/* Widget icon + Primary value — center */}
                    {(() => {
                        let iconSrc =
                            this.state.actionActive && this.props.settings.widgetIconActive
                                ? this.props.settings.widgetIconActive
                                : this.props.settings.widgetIcon;
                        iconSrc = this.props.stateContext.getImagePath(iconSrc) || undefined;
                        const iconSize = isWide ? 48 : 32;
                        return (
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: isWide ? 1.5 : 1,
                                }}
                            >
                                {iconSrc ? (
                                    <Icon
                                        src={iconSrc}
                                        style={{
                                            width: iconSize,
                                            height: iconSize,
                                            color: valueColor || undefined,
                                            flexShrink: 0,
                                        }}
                                    />
                                ) : null}
                                {this.state.commonType !== 'boolean' && value != null ? (
                                    <Typography
                                        sx={{
                                            fontSize: isWide ? 56 : 36,
                                            fontWeight: 700,
                                            lineHeight: 1,
                                            color: valueColor,
                                            textAlign: 'center',
                                        }}
                                    >
                                        {this.formatValue(value)}
                                        <Typography
                                            component="span"
                                            sx={{ fontSize: '0.45em', fontWeight: 400, ml: 0.5, opacity: 0.7 }}
                                        >
                                            {unit}
                                        </Typography>
                                    </Typography>
                                ) : (
                                    this.state.commonType !== 'boolean' && (
                                        <Typography sx={{ fontSize: isWide ? 48 : 32, color: 'text.disabled' }}>
                                            —
                                        </Typography>
                                    )
                                )}
                            </Box>
                        );
                    })()}

                    {/* Name — below value */}
                    {this.props.settings.name ? (
                        <Typography
                            sx={{
                                fontSize: isWide ? 16 : 12,
                                fontWeight: 500,
                                color: 'text.secondary',
                                textAlign: 'center',
                                mt: 0.5,
                                lineHeight: 1.2,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '90%',
                            }}
                        >
                            {this.props.settings.name}
                        </Typography>
                    ) : null}
                </Box>
            </Box>
        );
    }

    renderCompact(): React.JSX.Element {
        return this.renderTile(false, false);
    }

    renderWide(): React.JSX.Element {
        return this.renderTile(true, false);
    }

    renderWideTall(): React.JSX.Element {
        return this.renderTile(true, true);
    }

    private renderUniversalChartDialog(): React.JSX.Element | null {
        if (!this.state.chartOpen || !this.props.stateContext) {
            return null;
        }
        const hasHistory = !!this.state.historyId && !!this.state.historyInstance;
        const useQuick = !hasHistory && !!this.props.settings.quickChart;
        if (!hasHistory && !useQuick) {
            return null;
        }
        const title = this.props.settings.name || String(this.props.widget.id);
        const color = this.props.settings.color || '#2196f3';
        const quickData: ChartSeries[] | undefined = useQuick
            ? [{ data: this.state.quickSamples, color, name: title, unit: this.state.unit }]
            : undefined;
        const windowSec = Math.max(
            QUICK_CHART_MIN_WINDOW_SEC,
            Number(this.props.settings.quickChartInterval) || QUICK_CHART_DEFAULT_WINDOW_SEC,
        );
        return (
            <ChartDialog
                open
                onClose={() => this.setState({ chartOpen: false })}
                title={title}
                historyIds={hasHistory ? [{ id: this.state.historyId!, color, name: title }] : []}
                historyInstance={this.state.historyInstance}
                socket={this.props.stateContext.getSocket()}
                unit={this.state.unit}
                isFloatComma={this.props.stateContext.isFloatComma}
                widgetId={String(this.props.widget.id)}
                instanceId={this.props.stateContext.instanceId}
                quickData={quickData}
                lockedWindowMs={useQuick ? windowSec * 1000 : undefined}
            />
        );
    }

    render(): React.JSX.Element {
        const isEditing = !!this.props.onOpenSettings;

        // If opacity is 0, hide completely — but always show in edit mode
        if (this.state.opacity <= 0 && !isEditing) {
            return <></>;
        }

        return (
            <>
                {super.render()}
                {this.renderUniversalChartDialog()}
            </>
        );
    }
}
