import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, ButtonGroup, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';
import { I18n, type Connection } from '@iobroker/adapter-react-v5';

import type { ChartSeries } from './Generic';

// ---- Constants ----

const MARGIN = { top: 10, right: 12, bottom: 32, left: 52 };
const RANGE_OPTIONS = [
    { label: '1h', hours: 1 },
    { label: '6h', hours: 6 },
    { label: '12h', hours: 12 },
    { label: '24h', hours: 24 },
    { label: '3d', hours: 72 },
    { label: '7d', hours: 168 },
    { label: '30d', hours: 720 },
];

// ---- Helpers ----

function formatTime(ts: number, rangeMs: number): string {
    const d = new Date(ts);
    if (rangeMs > 3 * 86_400_000) {
        return `${d.getDate()}.${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatValue(val: number): string {
    if (Math.abs(val) >= 1000) {
        return val.toFixed(0);
    }
    if (Math.abs(val) >= 10) {
        return val.toFixed(1);
    }
    return val.toFixed(2);
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

// ---- Interactive SVG Chart ----

interface InteractiveChartProps {
    series: ChartSeries[];
    width: number;
    height: number;
    unit?: string;
    title?: string;
}

function InteractiveChart(props: InteractiveChartProps): React.JSX.Element {
    const { series, width, height, unit, title: chartTitle } = props;
    const svgRef = useRef<SVGSVGElement>(null);

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
        y: number;
        ts: number;
        val: number;
        color: string;
        name?: string;
    } | null>(null);

    // Reset view when data changes
    useEffect(() => {
        setViewStart(globalTsMin);
        setViewEnd(globalTsMax);
    }, [globalTsMin, globalTsMax]);

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
                // Find nearest point across all series
                let best: { dist: number; ts: number; val: number; color: string; name?: string } | null = null;
                for (const s of series) {
                    for (const p of s.data) {
                        const dist = Math.abs(p.ts - ts);
                        if (!best || dist < best.dist) {
                            best = { dist, ts: p.ts, val: p.val, color: s.color, name: s.name };
                        }
                    }
                }
                if (best) {
                    setTooltip({
                        x: tsToX(best.ts),
                        y: valToY(best.val),
                        ts: best.ts,
                        val: best.val,
                        color: best.color,
                        name: best.name,
                    });
                }
            }
        },
        [series, plotW, width, height, xToTs, tsToX, valToY],
    );

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        if (panRef.current) {
            (e.target as SVGSVGElement).releasePointerCapture(e.pointerId);
            panRef.current = null;
        }
    }, []);

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
            }
            setTooltip(null);
        },
        [viewStart, viewEnd, xToTs],
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
        const pts = s.data
            .filter(p => p.ts >= viewStart && p.ts <= viewEnd)
            .map(p => `${tsToX(p.ts).toFixed(1)},${valToY(p.val).toFixed(1)}`);
        if (pts.length < 2) {
            continue;
        }
        const d = `M${pts.join('L')}`;
        // Area fill
        const firstX = tsToX(s.data.find(p => p.ts >= viewStart)!.ts).toFixed(1);
        const lastVisible = [...s.data].reverse().find(p => p.ts <= viewEnd);
        const lastX = lastVisible ? tsToX(lastVisible.ts).toFixed(1) : pts[pts.length - 1].split(',')[0];
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
                        {formatValue(v)}
                    </text>
                );
            })}

            {/* Tooltip crosshair + dot + label */}
            {tooltip
                ? (() => {
                      const displayName = tooltip.name || (series.length === 1 ? chartTitle : undefined);
                      const label = `${displayName ? `${displayName} – ` : ''}${formatValue(tooltip.val)}${unit ? ` ${unit}` : ''}`;
                      const timeLabel = formatTime(tooltip.ts, viewEnd - viewStart);
                      const fontSize = 11;
                      const padX = 6;
                      const padY = 3;
                      const boxW = Math.max(label.length, timeLabel.length) * 6.5 + padX * 2;
                      const boxH = fontSize * 2 + padY * 2 + 4;
                      // Position: prefer above the dot, flip if too close to top
                      const above = tooltip.y - boxH - 12 > MARGIN.top;
                      const boxY = above ? tooltip.y - boxH - 8 : tooltip.y + 12;
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
                              <circle
                                  cx={tooltip.x}
                                  cy={tooltip.y}
                                  r={4}
                                  fill={tooltip.color}
                                  stroke="white"
                                  strokeWidth={1.5}
                              />
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
                              <text
                                  x={boxX + padX}
                                  y={boxY + padY + fontSize}
                                  fontSize={fontSize}
                                  fontWeight={600}
                                  fill="var(--mui-palette-text-primary, #000)"
                                  fontFamily="system-ui, sans-serif"
                              >
                                  {label}
                              </text>
                              <text
                                  x={boxX + padX}
                                  y={boxY + padY + fontSize * 2 + 2}
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
}

function ChartDialog(props: ChartDialogProps): React.JSX.Element | null {
    const { open, onClose, title, historyIds, historyInstance, socket, unit: unitProp } = props;
    const [series, setSeries] = useState<ChartSeries[]>([]);
    const [loading, setLoading] = useState(false);
    const [rangeHours, setRangeHours] = useState(24);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dims, setDims] = useState({ w: 600, h: 350 });
    const [autoUnit, setAutoUnit] = useState('');
    const unit = unitProp || autoUnit;

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

    const loadData = useCallback(
        async (hours: number) => {
            if (!historyIds.length || !historyInstance) {
                return;
            }
            setLoading(true);
            const end = Date.now();
            const start = end - hours * 3_600_000;
            const aggregate = hours > 6 ? 'minmax' : 'none';

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
                    result.push({ data, color, name });
                } catch (e) {
                    console.warn(`ChartDialog: failed to load history for ${id}:`, e);
                }
            }
            setSeries(result);
            setLoading(false);
        },
        [historyIds, historyInstance, socket, resolveHistoryId],
    );

    // Load data when the dialog opens or range changes
    useEffect(() => {
        if (open) {
            void loadData(rangeHours);
        }
    }, [open, rangeHours, loadData]);

    // Auto-detect unit from first history state object
    useEffect(() => {
        if (!open || unitProp || !historyIds.length) {
            return;
        }
        void (async () => {
            try {
                const obj = (await socket.getObject(historyIds[0].id)) as ioBroker.StateObject | null;
                if (obj?.common?.unit) {
                    setAutoUnit(obj.common.unit);
                }
            } catch {
                // ignore
            }
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
                {/* Time range buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, flexShrink: 0 }}>
                    <ButtonGroup
                        size="small"
                        variant="outlined"
                    >
                        {RANGE_OPTIONS.map(opt => (
                            <Button
                                key={opt.hours}
                                variant={rangeHours === opt.hours ? 'contained' : 'outlined'}
                                onClick={() => setRangeHours(opt.hours)}
                            >
                                {opt.label}
                            </Button>
                        ))}
                    </ButtonGroup>
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
