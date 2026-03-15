import React from 'react';
import { Box, IconButton, Slider, Typography } from '@mui/material';
import { Stop } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';

import WidgetGeneric, { getTileStyles, type WidgetGenericProps, type WidgetGenericState } from './Generic';

interface WidgetBlindState extends WidgetGenericState {
    position: number;
    dragging: boolean;
    min: number;
    max: number;
}

interface BlindSvgProps {
    position: number;
    accent?: string;
    size: number;
    dragging?: boolean;
}

// Shared window dimensions
const VW = 60;
const VH = 76;
const FRAME = 2.5;
const INNER_X = FRAME;
const INNER_Y = FRAME;
const INNER_W = VW - FRAME * 2;
const INNER_H = VH - FRAME * 2;

function WindowBase(props: { accent?: string; children: React.ReactNode }): React.JSX.Element {
    return (
        <React.Fragment>
            {/* Sky / light through window */}
            <rect
                x={INNER_X}
                y={INNER_Y}
                width={INNER_W}
                height={INNER_H}
                rx={1}
                fill={props.accent || '#90caf9'}
                opacity={0.2}
            />

            {/* Window cross — always full size */}
            <line
                x1={VW / 2}
                y1={INNER_Y}
                x2={VW / 2}
                y2={INNER_Y + INNER_H}
                stroke="currentColor"
                strokeWidth={1.2}
                opacity={0.25}
            />
            <line
                x1={INNER_X}
                y1={INNER_Y + INNER_H / 2}
                x2={INNER_X + INNER_W}
                y2={INNER_Y + INNER_H / 2}
                stroke="currentColor"
                strokeWidth={1.2}
                opacity={0.25}
            />

            {props.children}

            {/* Window frame */}
            <rect
                x={FRAME / 2}
                y={FRAME / 2}
                width={VW - FRAME}
                height={VH - FRAME}
                rx={2.5}
                fill="none"
                stroke="currentColor"
                strokeWidth={FRAME}
                opacity={0.5}
            />
        </React.Fragment>
    );
}

/** SVG window with roller shutter. position: 0 = closed, 100 = fully open */
function ShutterSvg(props: BlindSvgProps): React.JSX.Element {
    const { position, accent, size, dragging } = props;

    // Shutter covers (100 - position)% from the top
    const shutterH = ((100 - position) / 100) * INNER_H;

    // Slat lines every 4 units
    const slats: React.JSX.Element[] = [];
    for (let y = INNER_Y + 4; y < INNER_Y + shutterH - 1; y += 4) {
        slats.push(
            <line
                key={y}
                x1={INNER_X + 0.5}
                y1={y}
                x2={INNER_X + INNER_W - 0.5}
                y2={y}
                stroke="currentColor"
                strokeWidth={0.4}
                opacity={0.3}
            />,
        );
    }

    const transition = dragging ? 'none' : 'all 0.2s ease';

    return (
        <svg
            viewBox={`0 0 ${VW} ${VH}`}
            width={size}
            height={size * (VH / VW)}
            style={{ display: 'block' }}
        >
            <WindowBase accent={accent}>
                {/* Shutter body */}
                {shutterH > 0 ? (
                    <rect
                        x={INNER_X}
                        y={INNER_Y}
                        width={INNER_W}
                        height={shutterH}
                        rx={1}
                        fill="currentColor"
                        opacity={0.35}
                        style={{ transition }}
                    />
                ) : null}

                {/* Slat lines */}
                <g style={{ transition }}>{slats}</g>

                {/* Shutter bottom bar (handle) */}
                {shutterH > 2 ? (
                    <rect
                        x={INNER_X + 1}
                        y={INNER_Y + shutterH - 2.5}
                        width={INNER_W - 2}
                        height={2.5}
                        rx={1}
                        fill="currentColor"
                        opacity={0.55}
                        style={{ transition }}
                    />
                ) : null}

                {/* Roller housing at top */}
                <rect
                    x={INNER_X - 0.5}
                    y={INNER_Y - 1}
                    width={INNER_W + 1}
                    height={3.5}
                    rx={1.5}
                    fill="currentColor"
                    opacity={0.4}
                />
            </WindowBase>
        </svg>
    );
}

/** SVG window with curtains. position: 0 = closed, 100 = fully open */
function CurtainSvg(props: BlindSvgProps): React.JSX.Element {
    const { position, accent, size, dragging } = props;

    const transition = dragging ? 'none' : 'all 0.2s ease';

    // Each curtain panel width: at 0% each covers half, at 100% gathered to ~3 units
    const minW = 3;
    const curtainW = minW + ((100 - position) / 100) * (INNER_W / 2 - minW);

    // Curtain rod
    const rodY = INNER_Y + 1;

    // Fold lines for fabric texture
    const leftFolds: React.JSX.Element[] = [];
    const rightFolds: React.JSX.Element[] = [];
    const foldStep = 3.5;

    for (let x = INNER_X + foldStep; x < INNER_X + curtainW - 1; x += foldStep) {
        leftFolds.push(
            <line
                key={`l${x}`}
                x1={x}
                y1={rodY + 2}
                x2={x}
                y2={INNER_Y + INNER_H}
                stroke="currentColor"
                strokeWidth={0.4}
                opacity={0.2}
            />,
        );
    }
    const rightX = INNER_X + INNER_W - curtainW;
    for (let x = rightX + foldStep; x < INNER_X + INNER_W - 1; x += foldStep) {
        rightFolds.push(
            <line
                key={`r${x}`}
                x1={x}
                y1={rodY + 2}
                x2={x}
                y2={INNER_Y + INNER_H}
                stroke="currentColor"
                strokeWidth={0.4}
                opacity={0.2}
            />,
        );
    }

    return (
        <svg
            viewBox={`0 0 ${VW} ${VH}`}
            width={size}
            height={size * (VH / VW)}
            style={{ display: 'block' }}
        >
            <WindowBase accent={accent}>
                {/* Left curtain */}
                <rect
                    x={INNER_X}
                    y={rodY + 1.5}
                    width={curtainW}
                    height={INNER_H - rodY - 1.5 + INNER_Y}
                    fill="currentColor"
                    opacity={0.3}
                    style={{ transition }}
                />
                <g style={{ transition }}>{leftFolds}</g>

                {/* Right curtain */}
                <rect
                    x={rightX}
                    y={rodY + 1.5}
                    width={curtainW}
                    height={INNER_H - rodY - 1.5 + INNER_Y}
                    fill="currentColor"
                    opacity={0.3}
                    style={{ transition }}
                />
                <g style={{ transition }}>{rightFolds}</g>

                {/* Curtain rod */}
                <line
                    x1={INNER_X - 1}
                    y1={rodY}
                    x2={INNER_X + INNER_W + 1}
                    y2={rodY}
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    opacity={0.5}
                />
                {/* Rod finials */}
                <circle
                    cx={INNER_X - 1}
                    cy={rodY}
                    r={1.5}
                    fill="currentColor"
                    opacity={0.5}
                />
                <circle
                    cx={INNER_X + INNER_W + 1}
                    cy={rodY}
                    r={1.5}
                    fill="currentColor"
                    opacity={0.5}
                />
            </WindowBase>
        </svg>
    );
}

/** Render appropriate blind SVG based on type */
function BlindSvg(props: BlindSvgProps & { blindType: 'shutter' | 'curtain' }): React.JSX.Element {
    const { blindType, ...rest } = props;
    if (blindType === 'curtain') {
        return <CurtainSvg {...rest} />;
    }
    return <ShutterSvg {...rest} />;
}

export class WidgetBlind extends WidgetGeneric<WidgetBlindState> {
    private readonly setId: string | null;
    private readonly actualId: string | null;
    private readonly stopId: string | null;

    private tileRef = React.createRef<HTMLDivElement>();
    private dragStartPos: { x: number; y: number } | null = null;
    private dragStartPosition = 0;
    private isDragging = false;

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;
        const set = states.find(s => s.name === 'SET');
        const actual = states.find(s => s.name === 'ACTUAL');
        const stop = states.find(s => s.name === 'STOP');

        this.setId = set?.id ?? null;
        this.actualId = actual?.id ?? set?.id ?? null;
        this.stopId = stop?.id ?? null;

        this.state = {
            ...this.state,
            position: 0,
            dragging: false,
            min: 0,
            max: 100,
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onPositionChange);
        }
        void this.loadBlindObject();
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onPositionChange);
        }
    }

    private async loadBlindObject(): Promise<void> {
        const id = this.setId || this.actualId;
        if (!id) {
            return;
        }
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(id)) as
                | ioBroker.StateObject
                | null
                | undefined;
            if (obj?.common) {
                const min = obj.common.min != null ? Number(obj.common.min) : 0;
                const max = obj.common.max != null ? Number(obj.common.max) : 100;
                if (!isNaN(min) && !isNaN(max) && max > min) {
                    this.setState({ min: min, max: max });
                }
            }
        } catch {
            // ignore
        }
    }

    private rawToPercent(raw: number): number {
        const { min, max } = this.state;
        const range = max - min;
        if (range <= 0) {
            return 0;
        }
        return Math.round(((raw - min) / range) * 100);
    }

    private percentToRaw(percent: number): number {
        const { min, max } = this.state;
        return min + (percent / 100) * (max - min);
    }

    onPositionChange = (_id: string, state: ioBroker.State): void => {
        if (this.isDragging) {
            return;
        }
        const raw = Number(state.val) || 0;
        const position = this.rawToPercent(raw);
        if (position !== this.state.position) {
            this.setState({ position });
        }
    };

    setPosition = (_e: Event, value: number | number[]): void => {
        const percent = value as number;
        if (this.setId) {
            void this.props.stateContext.getSocket().setState(this.setId, this.percentToRaw(percent));
        }
    };

    stop = (e?: React.MouseEvent): void => {
        if (e) {
            e.stopPropagation();
        }
        if (this.stopId) {
            void this.props.stateContext.getSocket().setState(this.stopId, true);
        }
    };

    // --- Vertical drag interaction ---

    private onPointerDown = (e: React.PointerEvent): void => {
        if (this.props.settings?.enabled === false) {
            return;
        }
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this.dragStartPosition = this.state.position;
        this.isDragging = false;
    };

    private onPointerMove = (e: React.PointerEvent): void => {
        if (!this.dragStartPos) {
            return;
        }

        const isCurtain = this.props.settings?.blindType === 'curtain';
        const d = isCurtain ? e.clientX - this.dragStartPos.x : e.clientY - this.dragStartPos.y;
        const dist = Math.abs(d);

        if (!this.isDragging && dist > 8) {
            this.isDragging = true;
            this.setState({ dragging: true });
        }

        if (this.isDragging) {
            const el = this.tileRef.current;
            const rect = el?.getBoundingClientRect();
            const span = isCurtain ? rect?.width || 150 : rect?.height || 150;
            // Curtain: drag right = open; Shutter: drag up = open
            const delta = ((isCurtain ? d : -d) / span) * 100;
            const percent = Math.max(0, Math.min(100, Math.round(this.dragStartPosition + delta)));
            this.setState({ position: percent });
        }
    };

    private onPointerUp = (e: React.PointerEvent): void => {
        if (!this.dragStartPos) {
            return;
        }

        if (this.isDragging) {
            const isCurtain = this.props.settings?.blindType === 'curtain';
            const el = this.tileRef.current;
            const rect = el?.getBoundingClientRect();
            const span = isCurtain ? rect?.width || 150 : rect?.height || 150;
            const d = isCurtain ? e.clientX - this.dragStartPos.x : e.clientY - this.dragStartPos.y;
            const delta = ((isCurtain ? d : -d) / span) * 100;
            const percent = Math.max(0, Math.min(100, Math.round(this.dragStartPosition + delta)));
            if (this.setId) {
                void this.props.stateContext.getSocket().setState(this.setId, this.percentToRaw(percent));
            }
        } else {
            // Tap — toggle between fully open and closed
            if (this.setId) {
                const target = this.state.position > 50 ? this.state.min : this.state.max;
                void this.props.stateContext.getSocket().setState(this.setId, target);
            }
        }

        this.dragStartPos = null;
        this.isDragging = false;
        this.setState({ dragging: false });
    };

    // --- Overrides ---

    protected getHistoryIds(): { id: string; color: string }[] {
        const ids: { id: string; color: string }[] = [];
        if (this.actualId) {
            ids.push({ id: this.actualId, color: '#78909c' });
        }
        return ids;
    }

    protected isTileActive(): boolean {
        return this.state.position > 0;
    }

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = super.renderTileIcon();
        if (baseIcon) {
            return baseIcon;
        }

        const { position, dragging } = this.state;
        const accent = this.getAccentColor();

        const blindType = this.props.settings?.blindType || 'shutter';
        return (
            <BlindSvg
                position={position}
                accent={accent}
                size={36}
                dragging={dragging}
                blindType={blindType}
            />
        );
    }

    protected renderTileStatus(): React.JSX.Element {
        const { position } = this.state;
        const isActive = position > 0;
        const accent = this.getAccentColor();

        return (
            <Typography
                variant="caption"
                sx={theme => ({
                    fontWeight: 500,
                    color: isActive ? accent || theme.palette.primary.main : theme.palette.text.secondary,
                    transition: 'color 0.25s ease',
                })}
            >
                {position === 100 ? I18n.t('wm_Open') : position === 0 ? I18n.t('wm_Closed') : `${position}%`}
            </Typography>
        );
    }

    protected renderTileAction(): React.JSX.Element {
        const { position } = this.state;
        const accent = this.getAccentColor();

        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Slider
                    value={position}
                    min={0}
                    max={100}
                    size="small"
                    onClick={e => e.stopPropagation()}
                    onChange={this.setPosition}
                    sx={theme => ({
                        width: 80,
                        color: accent || theme.palette.primary.main,
                        '& .MuiSlider-thumb': {
                            width: 14,
                            height: 14,
                        },
                    })}
                />
                {this.stopId ? (
                    <IconButton
                        size="small"
                        onClick={this.stop}
                        sx={{ color: 'text.secondary' }}
                    >
                        <Stop fontSize="small" />
                    </IconButton>
                ) : null}
            </Box>
        );
    }

    renderCompact(): React.JSX.Element {
        const { name, position, dragging } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const isDisabled = this.props.settings?.enabled === false;
        const indicators = this.renderIndicators();

        return (
            <Box sx={{ position: 'relative' }}>
                <Box
                    ref={this.tileRef}
                    onPointerDown={this.onPointerDown}
                    onPointerMove={this.onPointerMove}
                    onPointerUp={this.onPointerUp}
                    onPointerCancel={this.onPointerUp}
                    sx={theme => ({
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'stretch',
                        width: '100%',
                        aspectRatio: '1',
                        textAlign: 'left',
                        overflow: 'hidden',
                        cursor: isDisabled
                            ? 'default'
                            : this.props.settings?.blindType === 'curtain'
                              ? 'ew-resize'
                              : 'ns-resize',
                        opacity: isDisabled ? 0.4 : 1,
                        touchAction: 'none',
                        userSelect: 'none',
                        ...getTileStyles(theme, isActive, accent),
                    })}
                >
                    {indicators ? (
                        <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1 }}>{indicators}</Box>
                    ) : null}

                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flex: 1,
                        }}
                    >
                        <BlindSvg
                            position={position}
                            accent={accent}
                            size={64}
                            dragging={dragging}
                            blindType={this.props.settings?.blindType || 'shutter'}
                        />
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
                            {this.props.settings?.name || name || '...'}
                        </Typography>
                        {this.renderTileStatus()}
                    </Box>
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }
}

export default WidgetBlind;
