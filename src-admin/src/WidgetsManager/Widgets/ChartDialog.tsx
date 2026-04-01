import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Box,
    Button,
    ButtonGroup,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Popover,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { Close, Settings } from '@mui/icons-material';
import { I18n, type Connection } from '@iobroker/adapter-react-v5';

import { formatFloat, type ChartSeries } from './Generic';

// ---- Constants ----

const MARGIN = { top: 10, right: 12, bottom: 32, left: 52 };
const RANGE_OPTIONS = [
    { value: 1, unit: 'h', hours: 1 },
    { value: 6, unit: 'h', hours: 6 },
    { value: 12, unit: 'h', hours: 12 },
    { value: 24, unit: 'h', hours: 24 },
    { value: 3, unit: 'd', hours: 72 },
    { value: 7, unit: 'd', hours: 168 },
    { value: 30, unit: 'd', hours: 720 },
];

function rangeLabel(opt: (typeof RANGE_OPTIONS)[number]): string {
    const unitKey = opt.unit === 'h' ? 'wm_chart_h' : 'wm_chart_d';
    return `${opt.value}${I18n.t(unitKey)}`;
}

export type ChartLineType = 'line' | 'step-start' | 'step-end';

/** Smoothing window in seconds (0 = off) */
export type SmoothingWindow = 0 | 30 | 60 | 300 | 600;

const SMOOTHING_OPTIONS: { value: SmoothingWindow; label: string }[] = [
    { value: 0, label: 'wm_Off' },
    { value: 30, label: 'wm_smooth_30s' },
    { value: 60, label: 'wm_smooth_1m' },
    { value: 300, label: 'wm_smooth_5m' },
    { value: 600, label: 'wm_smooth_10m' },
];

const VALID_SMOOTHING_VALUES = new Set<number>([0, 30, 60, 300, 600]);

export interface ChartSettings {
    chartType: ChartLineType;
    smoothing: SmoothingWindow;
    rangeHours: number;
}

const DEFAULT_CHART_SETTINGS: ChartSettings = {
    chartType: 'line',
    smoothing: 0,
    rangeHours: 24,
};

// ---- Helpers ----

function formatTime(ts: number, rangeMs: number): string {
    const d = new Date(ts);
    if (rangeMs > 3 * 86_400_000) {
        return `${d.getDate()}.${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatValue(val: number, isFloatComma?: boolean): string {
    if (Math.abs(val) >= 1000) {
        return formatFloat(val, 0, isFloatComma);
    }
    if (Math.abs(val) >= 10) {
        return formatFloat(val, 1, isFloatComma);
    }
    return formatFloat(val, 2, isFloatComma);
}

function niceStep(range: number, ticks: number): number {
    const raw = range / ticks;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / pow;
    let step: number;
    if (norm < 1.5) {
        step = 1;
    } else if (norm < 3) {
        step = 2;
    } else if (norm < 7) {
        step = 5;
    } else {
        step = 10;
    }
    return step * pow;
}

/** Apply sliding window average to time-series data */
function smoothData(data: { ts: number; val: number }[], windowSec: number): { ts: number; val: number }[] {
    if (windowSec <= 0 || data.length < 2) {
        return data;
    }
    const windowMs = windowSec * 1000;
    const halfWindow = windowMs / 2;
    const result: { ts: number; val: number }[] = [];

    let left = 0;
    let right = 0; // exclusive upper bound
    let sum = 0;

    for (let i = 0; i < data.length; i++) {
        const center = data[i].ts;
        // Expand the right boundary
        while (right < data.length && data[right].ts <= center + halfWindow) {
            sum += data[right].val;
            right++;
        }
        // Shrink left boundary
        while (left < right && data[left].ts < center - halfWindow) {
            sum -= data[left].val;
            left++;
        }
        const count = right - left;
        result.push({ ts: center, val: count > 0 ? sum / count : data[i].val });
    }
    return result;
}

/**
 * Interpolate value at a given timestamp from sorted time-series data.
 *  Returns null if ts is outside the data range.
 */
function interpolateAt(data: { ts: number; val: number }[], ts: number): number | null {
    if (!data.length) {
        return null;
    }
    if (ts <= data[0].ts) {
        return data[0].val;
    }
    if (ts >= data[data.length - 1].ts) {
        return data[data.length - 1].val;
    }
    // Binary search for the right bracket
    let lo = 0;
    let hi = data.length - 1;
    while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (data[mid].ts <= ts) {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    const a = data[lo];
    const b = data[hi];
    const t = (ts - a.ts) / (b.ts - a.ts);
    return a.val + t * (b.val - a.val);
}

/** Build SVG path `d` attribute for the given points and line type */
function buildLinePath(points: { x: number; y: number }[], chartType: ChartLineType): string {
    if (points.length < 2) {
        return '';
    }

    if (chartType === 'step-start') {
        let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
        for (let i = 1; i < points.length; i++) {
            d += `V${points[i].y.toFixed(1)}H${points[i].x.toFixed(1)}`;
        }
        return d;
    }

    if (chartType === 'step-end') {
        let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
        for (let i = 1; i < points.length; i++) {
            d += `H${points[i].x.toFixed(1)}V${points[i].y.toFixed(1)}`;
        }
        return d;
    }

    // Straight lines
    return `M${points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L')}`;
}

// ---- Interactive SVG Chart ----

interface InteractiveChartProps {
    series: ChartSeries[];
    width: number;
    height: number;
    unit?: string;
    title?: string;
    chartType: ChartLineType;
    smoothing: SmoothingWindow;
    isFloatComma?: boolean;
    /** Called 400ms after the last pan/zoom interaction with the new visible time range */
    onViewSettle?: (startTs: number, endTs: number) => void;
}

function InteractiveChart(props: InteractiveChartProps): React.JSX.Element {
    const { series, width, height, unit, title: chartTitle, chartType, smoothing, isFloatComma, onViewSettle } = props;
    const svgRef = useRef<SVGSVGElement>(null);
    const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Compute global time & value range from data
    let globalTsMin = Infinity;
    let globalTsMax = -Infinity;
    let globalValMin = Infinity;
    let globalValMax = -Infinity;
    for (const s of series) {
        for (const p of s.data) {
            if (p.ts < globalTsMin) {
                globalTsMin = p.ts;
            }
            if (p.ts > globalTsMax) {
                globalTsMax = p.ts;
            }
            if (p.val < globalValMin) {
                globalValMin = p.val;
            }
            if (p.val > globalValMax) {
                globalValMax = p.val;
            }
        }
    }
    if (globalTsMin === Infinity) {
        globalTsMin = Date.now() - 3_600_000;
        globalTsMax = Date.now();
    }
    const valRange = globalValMax - globalValMin || 1;
    globalValMin -= valRange * 0.05;
    globalValMax += valRange * 0.05;

    // Pan/zoom state: visible time range
    const [viewStart, setViewStart] = useState(globalTsMin);
    const [viewEnd, setViewEnd] = useState(globalTsMax);
    const [tooltip, setTooltip] = useState<{
        x: number;
        ts: number;
        entries: { val: number; y: number; color: string; name?: string; unit?: string }[];
    } | null>(null);

    // Reset view when data changes
    useEffect(() => {
        setViewStart(globalTsMin);
        setViewEnd(globalTsMax);
    }, [globalTsMin, globalTsMax]);

    // Cleanup settle timer on unmount
    useEffect(
        () => () => {
            if (settleTimerRef.current) {
                clearTimeout(settleTimerRef.current);
            }
        },
        [],
    );

    /** Schedule a debounced onViewSettle call */
    const scheduleSettle = useCallback(
        (start: number, end: number) => {
            if (settleTimerRef.current) {
                clearTimeout(settleTimerRef.current);
            }
            if (onViewSettle) {
                settleTimerRef.current = setTimeout(() => {
                    settleTimerRef.current = null;
                    onViewSettle(start, end);
                }, 400);
            }
        },
        [onViewSettle],
    );

    const plotW = width - MARGIN.left - MARGIN.right;
    const plotH = height - MARGIN.top - MARGIN.bottom;

    // Scales
    const tsToX = useCallback(
        (ts: number) => MARGIN.left + ((ts - viewStart) / (viewEnd - viewStart)) * plotW,
        [viewStart, viewEnd, plotW],
    );
    const valToY = useCallback(
        (val: number) => MARGIN.top + plotH - ((val - globalValMin) / (globalValMax - globalValMin)) * plotH,
        [globalValMin, globalValMax, plotH],
    );
    const xToTs = useCallback(
        (x: number) => viewStart + ((x - MARGIN.left) / plotW) * (viewEnd - viewStart),
        [viewStart, viewEnd, plotW],
    );

    // Pan state
    const panRef = useRef<{ startX: number; startViewStart: number; startViewEnd: number } | null>(null);

    const handlePointerDown = useCallback(
        (e: React.PointerEvent) => {
            if (e.button !== 0) {
                return;
            }
            (e.target as SVGSVGElement).setPointerCapture(e.pointerId);
            panRef.current = { startX: e.clientX, startViewStart: viewStart, startViewEnd: viewEnd };
            setTooltip(null);
        },
        [viewStart, viewEnd],
    );

    const handlePointerMove = useCallback(
        (e: React.PointerEvent) => {
            const pan = panRef.current;
            if (pan) {
                const dx = e.clientX - pan.startX;
                const dtPerPx = (pan.startViewEnd - pan.startViewStart) / plotW;
                const dt = -dx * dtPerPx;
                setViewStart(pan.startViewStart + dt);
                setViewEnd(pan.startViewEnd + dt);
            } else {
                // Show tooltip
                const rect = svgRef.current?.getBoundingClientRect();
                if (!rect) {
                    return;
                }
                const mx = e.clientX - rect.left;
                const my = e.clientY - rect.top;
                if (mx < MARGIN.left || mx > width - MARGIN.right || my < MARGIN.top || my > height - MARGIN.bottom) {
                    setTooltip(null);
                    return;
                }
                const ts = xToTs(mx);
                // Find the nearest actual data point timestamp across all series
                let bestTs = ts;
                let bestDist = Infinity;
                for (const s of series) {
                    for (const p of s.data) {
                        const dist = Math.abs(p.ts - ts);
                        if (dist < bestDist) {
                            bestDist = dist;
                            bestTs = p.ts;
                        }
                    }
                }
                // Build entries for all series at bestTs (interpolate if needed)
                const entries: { val: number; y: number; color: string; name?: string; unit?: string }[] = [];
                for (const s of series) {
                    const val = interpolateAt(s.data, bestTs);
                    if (val != null) {
                        entries.push({ val, y: valToY(val), color: s.color, name: s.name, unit: s.unit });
                    }
                }
                if (entries.length) {
                    setTooltip({ x: tsToX(bestTs), ts: bestTs, entries });
                }
            }
        },
        [series, plotW, width, height, xToTs, tsToX, valToY],
    );

    const handlePointerUp = useCallback(
        (e: React.PointerEvent) => {
            if (panRef.current) {
                (e.target as SVGSVGElement).releasePointerCapture(e.pointerId);
                panRef.current = null;
                // Schedule data reload after pan ends
                scheduleSettle(viewStart, viewEnd);
            }
        },
        [viewStart, viewEnd, scheduleSettle],
    );

    const handleWheel = useCallback(
        (e: React.WheelEvent) => {
            e.preventDefault();
            const rect = svgRef.current?.getBoundingClientRect();
            if (!rect) {
                return;
            }
            const mx = e.clientX - rect.left;
            const pivot = xToTs(mx);
            const factor = e.deltaY > 0 ? 1.2 : 1 / 1.2;
            const newStart = pivot - (pivot - viewStart) * factor;
            const newEnd = pivot + (viewEnd - pivot) * factor;
            // Clamp minimum zoom to 5 minutes
            if (newEnd - newStart > 300_000) {
                setViewStart(newStart);
                setViewEnd(newEnd);
                scheduleSettle(newStart, newEnd);
            }
            setTooltip(null);
        },
        [viewStart, viewEnd, xToTs, scheduleSettle],
    );

    const handlePointerLeave = useCallback(() => {
        setTooltip(null);
    }, []);

    // Build paths
    const paths: React.JSX.Element[] = [];
    for (let i = 0; i < series.length; i++) {
        const s = series[i];
        if (s.data.length < 2) {
            continue;
        }
        const now = Date.now();
        const visible = s.data.filter(p => p.ts >= viewStart && p.ts <= viewEnd && p.ts <= now);
        if (visible.length < 2) {
            continue;
        }
        const smoothed = smoothing > 0 ? smoothData(visible, smoothing) : visible;
        const points = smoothed.map(p => ({ x: tsToX(p.ts), y: valToY(p.val) }));
        const d = buildLinePath(points, chartType);
        if (!d) {
            continue;
        }
        // Area fill — need first/last X for closing the area path
        const firstX = points[0].x.toFixed(1);
        const lastX = points[points.length - 1].x.toFixed(1);
        const baseY = valToY(globalValMin).toFixed(1);
        paths.push(
            <React.Fragment key={i}>
                <path
                    d={`${d}L${lastX},${baseY}L${firstX},${baseY}Z`}
                    fill={s.color}
                    opacity={0.12}
                />
                <path
                    d={d}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2"
                    strokeLinejoin="round"
                />
            </React.Fragment>,
        );
    }

    // Time axis ticks
    const viewRange = viewEnd - viewStart;
    const timeStep = niceStep(viewRange, Math.max(3, Math.floor(plotW / 80)));
    const timeTicks: number[] = [];
    const firstTick = Math.ceil(viewStart / timeStep) * timeStep;
    for (let t = firstTick; t <= viewEnd; t += timeStep) {
        timeTicks.push(t);
    }

    // Value axis ticks
    const valStep = niceStep(globalValMax - globalValMin, Math.max(3, Math.floor(plotH / 40)));
    const valTicks: number[] = [];
    const firstVal = Math.ceil(globalValMin / valStep) * valStep;
    for (let v = firstVal; v <= globalValMax; v += valStep) {
        valTicks.push(v);
    }

    return (
        <svg
            ref={svgRef}
            width={width}
            height={height}
            style={{ touchAction: 'none', userSelect: 'none', cursor: panRef.current ? 'grabbing' : 'crosshair' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onWheel={handleWheel}
        >
            {/* Plot background */}
            <rect
                x={MARGIN.left}
                y={MARGIN.top}
                width={plotW}
                height={plotH}
                fill="transparent"
            />

            {/* Grid lines */}
            {valTicks.map(v => {
                const y = valToY(v);
                return (
                    <line
                        key={`vg${v}`}
                        x1={MARGIN.left}
                        x2={width - MARGIN.right}
                        y1={y}
                        y2={y}
                        stroke="currentColor"
                        opacity={0.08}
                    />
                );
            })}
            {timeTicks.map(t => {
                const x = tsToX(t);
                return (
                    <line
                        key={`tg${t}`}
                        x1={x}
                        x2={x}
                        y1={MARGIN.top}
                        y2={height - MARGIN.bottom}
                        stroke="currentColor"
                        opacity={0.08}
                    />
                );
            })}

            {/* Clip area for data */}
            <defs>
                <clipPath id="plot-clip">
                    <rect
                        x={MARGIN.left}
                        y={MARGIN.top}
                        width={plotW}
                        height={plotH}
                    />
                </clipPath>
            </defs>
            <g clipPath="url(#plot-clip)">{paths}</g>

            {/* Time axis labels */}
            {timeTicks.map(t => {
                const x = tsToX(t);
                return (
                    <text
                        key={`tl${t}`}
                        x={x}
                        y={height - MARGIN.bottom + 16}
                        textAnchor="middle"
                        fontSize={11}
                        fill="currentColor"
                        opacity={0.5}
                    >
                        {formatTime(t, viewRange)}
                    </text>
                );
            })}

            {/* Value axis labels */}
            {valTicks.map(v => {
                const y = valToY(v);
                return (
                    <text
                        key={`vl${v}`}
                        x={MARGIN.left - 6}
                        y={y + 4}
                        textAnchor="end"
                        fontSize={11}
                        fill="currentColor"
                        opacity={0.5}
                    >
                        {formatValue(v, isFloatComma)}
                    </text>
                );
            })}

            {/* Tooltip crosshair + dots + label */}
            {tooltip
                ? (() => {
                      const { entries } = tooltip;
                      const timeLabel = formatTime(tooltip.ts, viewEnd - viewStart);
                      const fontSize = 11;
                      const lineHeight = fontSize + 3;
                      const padX = 6;
                      const padY = 3;

                      // Build label lines for each series
                      const labels = entries.map(e => {
                          const displayName = e.name || (series.length === 1 ? chartTitle : undefined);
                          const entryUnit = e.unit || unit;
                          return `${displayName ? `${displayName}: ` : ''}${formatValue(e.val, isFloatComma)}${entryUnit ? ` ${entryUnit}` : ''}`;
                      });

                      const allLines = [...labels, timeLabel];
                      const maxLen = Math.max(...allLines.map(l => l.length));
                      const boxW = maxLen * 6.5 + padX * 2;
                      const boxH = lineHeight * labels.length + (fontSize - 1) + padY * 2 + 4;

                      // Position: prefer above the topmost dot, flip if too close to the top
                      const topY = Math.min(...entries.map(e => e.y));
                      const above = topY - boxH - 12 > MARGIN.top;
                      const boxY = above ? topY - boxH - 8 : Math.max(...entries.map(e => e.y)) + 12;
                      // Clamp horizontally
                      let boxX = tooltip.x - boxW / 2;
                      if (boxX < MARGIN.left) {
                          boxX = MARGIN.left;
                      }
                      if (boxX + boxW > width - MARGIN.right) {
                          boxX = width - MARGIN.right - boxW;
                      }

                      return (
                          <>
                              <line
                                  x1={tooltip.x}
                                  x2={tooltip.x}
                                  y1={MARGIN.top}
                                  y2={height - MARGIN.bottom}
                                  stroke="currentColor"
                                  opacity={0.2}
                                  strokeDasharray="3,3"
                              />
                              {entries.map((e, i) => (
                                  <circle
                                      key={i}
                                      cx={tooltip.x}
                                      cy={e.y}
                                      r={4}
                                      fill={e.color}
                                      stroke="white"
                                      strokeWidth={1.5}
                                  />
                              ))}
                              {/* Tooltip box */}
                              <rect
                                  x={boxX}
                                  y={boxY}
                                  width={boxW}
                                  height={boxH}
                                  rx={4}
                                  fill="var(--mui-palette-background-paper, #fff)"
                                  stroke="currentColor"
                                  strokeOpacity={0.15}
                                  filter="drop-shadow(0 1px 3px rgba(0,0,0,0.2))"
                              />
                              {labels.map((label, i) => (
                                  <text
                                      key={i}
                                      x={boxX + padX}
                                      y={boxY + padY + lineHeight * i + fontSize}
                                      fontSize={fontSize}
                                      fontWeight={600}
                                      fill={entries[i].color}
                                      fontFamily="system-ui, sans-serif"
                                  >
                                      {label}
                                  </text>
                              ))}
                              <text
                                  x={boxX + padX}
                                  y={boxY + padY + lineHeight * labels.length + (fontSize - 1)}
                                  fontSize={fontSize - 1}
                                  fill="var(--mui-palette-text-primary, #000)"
                                  opacity={0.5}
                                  fontFamily="system-ui, sans-serif"
                              >
                                  {timeLabel}
                              </text>
                          </>
                      );
                  })()
                : null}
        </svg>
    );
}

// ---- Dialog ----

export interface ChartDialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    historyIds: { id: string; color: string; name?: string }[];
    historyInstance: string;
    socket: Connection;
    unit?: string;
    isFloatComma?: boolean;
    /** Widget object ID — used to persist chart settings in custom['devices.0'] */
    widgetId?: string;
    /** Adapter instance ID, e.g. "devices.0" */
    instanceId?: string;
}

function ChartDialog(props: ChartDialogProps): React.JSX.Element | null {
    const {
        open,
        onClose,
        title,
        historyIds: historyIdsProp,
        historyInstance,
        socket,
        unit: unitProp,
        isFloatComma,
        widgetId,
        instanceId,
    } = props;
    // Stabilize historyIds so that a new array reference with the same content doesn't trigger re-fetches
    const historyIdsKey = JSON.stringify(historyIdsProp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const historyIds = useMemo(() => historyIdsProp, [historyIdsKey]);
    const [series, setSeries] = useState<ChartSeries[]>([]);
    const [loading, setLoading] = useState(false);
    const [rangeHours, setRangeHours] = useState(DEFAULT_CHART_SETTINGS.rangeHours);
    const [chartType, setChartType] = useState<ChartLineType>(DEFAULT_CHART_SETTINGS.chartType);
    const [smoothing, setSmoothing] = useState(DEFAULT_CHART_SETTINGS.smoothing);
    const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dims, setDims] = useState({ w: 600, h: 350 });
    const [autoUnits, setAutoUnits] = useState<Record<string, string>>({});
    const unit = unitProp || '';
    const settingsLoadedRef = useRef(false);

    // Load chart settings from custom['devices.0'] on the widget object
    useEffect(() => {
        if (!open || !widgetId || !instanceId || settingsLoadedRef.current) {
            return;
        }
        void (async () => {
            try {
                const obj = await socket.getObject(widgetId);
                const custom = (obj?.common as Record<string, any>)?.custom?.[instanceId];
                if (custom) {
                    if (custom.chartType && ['line', 'step-start', 'step-end'].includes(custom.chartType)) {
                        setChartType(custom.chartType);
                    }
                    if (
                        typeof custom.chartSmoothing === 'number' &&
                        VALID_SMOOTHING_VALUES.has(custom.chartSmoothing)
                    ) {
                        setSmoothing(custom.chartSmoothing as SmoothingWindow);
                    }
                    if (
                        typeof custom.chartRangeHours === 'number' &&
                        RANGE_OPTIONS.some(o => o.hours === custom.chartRangeHours)
                    ) {
                        setRangeHours(custom.chartRangeHours);
                    }
                }
                settingsLoadedRef.current = true;
            } catch {
                // ignore
            }
        })();
    }, [open, widgetId, instanceId, socket]);

    // Reset loaded flag when dialog closes
    useEffect(() => {
        if (!open) {
            settingsLoadedRef.current = false;
        }
    }, [open]);

    /** Save a chart setting to custom[instanceId] on the widget object */
    const saveSetting = useCallback(
        (key: string, value: unknown) => {
            if (!widgetId || !instanceId) {
                return;
            }
            void (async () => {
                try {
                    const obj = await socket.getObject(widgetId);
                    if (!obj) {
                        return;
                    }
                    const common = obj.common as Record<string, any>;
                    common.custom ||= {};
                    common.custom[instanceId] = { ...common.custom[instanceId], [key]: value };
                    await socket.setObject(obj._id, obj);
                } catch {
                    // ignore
                }
            })();
        },
        [widgetId, instanceId, socket],
    );

    // Resolve alias history IDs (cache)
    const resolvedRef = useRef<Record<string, string | null>>({});

    const resolveHistoryId = useCallback(
        async (stateId: string): Promise<string | null> => {
            if (stateId in resolvedRef.current) {
                return resolvedRef.current[stateId];
            }
            try {
                const obj = (await socket.getObject(stateId)) as ioBroker.StateObject | null;
                if (!obj) {
                    resolvedRef.current[stateId] = null;
                    return null;
                }
                if (obj.common?.custom?.[historyInstance]?.enabled) {
                    resolvedRef.current[stateId] = stateId;
                    return stateId;
                }
                const aliasId = obj.common?.alias?.id;
                if (aliasId) {
                    const targetId = typeof aliasId === 'object' ? aliasId.read : aliasId;
                    if (targetId && targetId !== stateId) {
                        const targetObj = (await socket.getObject(targetId)) as ioBroker.StateObject | null;
                        if (targetObj?.common?.custom?.[historyInstance]?.enabled) {
                            resolvedRef.current[stateId] = targetId;
                            return targetId;
                        }
                    }
                }
            } catch {
                // ignore
            }
            resolvedRef.current[stateId] = null;
            return null;
        },
        [socket, historyInstance],
    );

    /** Load history data for a given time range */
    const loadDataRange = useCallback(
        async (start: number, end: number, showLoading: boolean) => {
            if (!historyIds.length || !historyInstance) {
                return;
            }
            if (showLoading) {
                setLoading(true);
            }
            const rangeMs = end - start;
            const aggregate = rangeMs > 6 * 3_600_000 ? 'minmax' : 'none';

            const result: ChartSeries[] = [];
            for (const { id, color, name } of historyIds) {
                try {
                    const resolvedId = await resolveHistoryId(id);
                    if (!resolvedId) {
                        continue;
                    }
                    const history = await socket.getHistory(resolvedId, {
                        instance: historyInstance,
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
                    if (Array.isArray(history)) {
                        for (const p of history) {
                            if (p.val != null && !isNaN(Number(p.val))) {
                                data.push({ ts: p.ts, val: Number(p.val) });
                            }
                        }
                    }
                    result.push({ data, color, name, unit: autoUnits[id] });
                } catch (e) {
                    console.warn(`ChartDialog: failed to load history for ${id}:`, e);
                }
            }
            setSeries(result);
            if (showLoading) {
                setLoading(false);
            }
        },
        [historyIds, historyInstance, socket, resolveHistoryId, autoUnits],
    );

    const loadData = useCallback(
        (hours: number, firstTime: boolean) => {
            const end = Date.now();
            const start = end - hours * 3_600_000;
            return loadDataRange(start, end, firstTime);
        },
        [loadDataRange],
    );

    /** Called by InteractiveChart after pan/zoom settles (400ms debounce) */
    const handleViewSettle = useCallback(
        (startTs: number, endTs: number) => {
            void loadDataRange(startTs, endTs, false);
        },
        [loadDataRange],
    );

    // Load data when the dialog opens or range changes
    useEffect(() => {
        if (open) {
            void loadData(rangeHours, true);
        }
    }, [open, rangeHours, loadData]);

    // Auto-detect units for each history state
    useEffect(() => {
        if (!open || unitProp || !historyIds.length) {
            return;
        }
        void (async () => {
            const units: Record<string, string> = {};
            for (const { id } of historyIds) {
                try {
                    const obj = (await socket.getObject(id)) as ioBroker.StateObject | null;
                    if (obj?.common?.unit) {
                        units[id] = obj.common.unit;
                    }
                } catch {
                    // ignore
                }
            }
            setAutoUnits(units);
        })();
    }, [open, unitProp, historyIds, socket]);

    // Measure container size
    useEffect(() => {
        if (!open) {
            return;
        }
        const measure = (): void => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    setDims({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
                }
            }
        };
        // Measure after dialog animation
        const timer = setTimeout(measure, 100);
        const observer = new ResizeObserver(measure);
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        return () => {
            clearTimeout(timer);
            observer.disconnect();
        };
    }, [open]);

    if (!open) {
        return null;
    }

    return (
        <Dialog
            open
            onClose={onClose}
            maxWidth="md"
            fullWidth
            slotProps={{ paper: { sx: { height: '80vh', maxHeight: 600 } } }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 6, pb: 0.5 }}>
                {title}
                <IconButton
                    onClick={onClose}
                    sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                    <Close />
                </IconButton>
            </DialogTitle>
            <DialogContent
                sx={{ display: 'flex', flexDirection: 'column', gap: 1, overflow: 'hidden', p: 1.5, pt: 0.5 }}
            >
                {/* Time range buttons + settings */}
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                    <ButtonGroup
                        size="small"
                        variant="outlined"
                    >
                        {RANGE_OPTIONS.map(opt => (
                            <Button
                                key={opt.hours}
                                variant={rangeHours === opt.hours ? 'contained' : 'outlined'}
                                onClick={() => {
                                    setRangeHours(opt.hours);
                                    saveSetting('chartRangeHours', opt.hours);
                                }}
                            >
                                {rangeLabel(opt)}
                            </Button>
                        ))}
                    </ButtonGroup>
                    <Tooltip title={I18n.t('wm_Settings')}>
                        <IconButton
                            size="small"
                            onClick={e => setSettingsAnchor(e.currentTarget)}
                        >
                            <Settings fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Popover
                        open={Boolean(settingsAnchor)}
                        anchorEl={settingsAnchor}
                        onClose={() => setSettingsAnchor(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    >
                        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 200 }}>
                            <TextField
                                select
                                variant="filled"
                                size="small"
                                label={I18n.t('wm_Chart type')}
                                value={chartType}
                                onChange={e => {
                                    const val = e.target.value as ChartLineType;
                                    setChartType(val);
                                    saveSetting('chartType', val);
                                }}
                            >
                                <MenuItem value="line">{I18n.t('wm_chart_line')}</MenuItem>
                                <MenuItem value="step-start">{I18n.t('wm_chart_step_start')}</MenuItem>
                                <MenuItem value="step-end">{I18n.t('wm_chart_step_end')}</MenuItem>
                            </TextField>
                            <TextField
                                select
                                variant="filled"
                                size="small"
                                label={I18n.t('wm_Smoothing')}
                                value={smoothing}
                                onChange={e => {
                                    const val = Number(e.target.value) as SmoothingWindow;
                                    setSmoothing(val);
                                    saveSetting('chartSmoothing', val);
                                }}
                            >
                                {SMOOTHING_OPTIONS.map(opt => (
                                    <MenuItem
                                        key={opt.value}
                                        value={opt.value}
                                    >
                                        {I18n.t(opt.label)}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Box>
                    </Popover>
                </Box>

                {/* Chart area */}
                <Box
                    ref={containerRef}
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {loading ? (
                        <Typography
                            variant="body2"
                            sx={{ color: 'text.secondary' }}
                        >
                            {I18n.t('wm_Loading')}...
                        </Typography>
                    ) : series.length && series.some(s => s.data.length >= 2) ? (
                        <InteractiveChart
                            series={series}
                            width={dims.w}
                            height={dims.h}
                            unit={unit}
                            title={title}
                            chartType={chartType}
                            smoothing={smoothing}
                            isFloatComma={isFloatComma}
                            onViewSettle={handleViewSettle}
                        />
                    ) : (
                        <Typography
                            variant="body2"
                            sx={{ color: 'text.secondary' }}
                        >
                            {I18n.t('wm_No data')}
                        </Typography>
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    );
}

export default ChartDialog;
