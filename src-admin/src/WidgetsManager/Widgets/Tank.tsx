import React from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { I18n } from '@iobroker/adapter-react-v5';

import WidgetGeneric, { getTileStyles, type WidgetGenericProps, type WidgetGenericState } from './Generic';

/** Color based on fill level */
function getFillColor(percent: number, accent: string | undefined): string {
    if (accent) {
        return accent;
    }
    if (percent <= 15) {
        return '#f44336'; // low — red
    }
    if (percent <= 30) {
        return '#ff9800'; // warning — orange
    }
    return '#2196f3'; // normal — blue
}

/** SVG tank icon: rounded rect outline with fill level + wave inside */
function TankIcon(props: {
    level: number;
    fillColor: string;
    id: string | number;
    animate?: boolean;
}): React.JSX.Element {
    const { level, fillColor, id, animate = true } = props;
    const vb = 100;
    const wall = 6;
    const r = 14;
    const innerW = vb - wall * 2;
    const innerH = vb - wall * 2;
    const fillH = (level / 100) * innerH;
    const clipId = `tank-icon-clip-${id}`;

    return (
        <svg
            viewBox={`0 0 ${vb} ${vb}`}
            style={{ width: '100%', height: '100%' }}
        >
            {/* Tank outline */}
            <rect
                x={wall / 2}
                y={wall / 2}
                width={vb - wall}
                height={vb - wall}
                rx={r}
                ry={r}
                fill="none"
                stroke="currentColor"
                strokeWidth={wall}
                opacity={0.3}
            />
            <defs>
                <clipPath id={clipId}>
                    <rect
                        x={wall}
                        y={wall}
                        width={innerW}
                        height={innerH}
                        rx={r - 2}
                        ry={r - 2}
                    />
                </clipPath>
            </defs>
            <g clipPath={`url(#${clipId})`}>
                {/* Fill inside tank */}
                <rect
                    x={wall}
                    y={wall + innerH - fillH}
                    width={innerW}
                    height={fillH}
                    fill={fillColor}
                    opacity={0.5}
                    style={{ transition: 'y 0.5s ease, height 0.5s ease' }}
                />
                {/* Wave */}
                {animate && level > 0 && level < 100 ? (
                    <path
                        d={`M${wall},${wall + innerH - fillH} q${innerW / 4},-5 ${innerW / 2},0 t${innerW / 2},0 v5 H${wall} Z`}
                        fill={fillColor}
                        opacity={0.3}
                    >
                        <animateTransform
                            attributeName="transform"
                            type="translate"
                            values="0,0;0,3;0,0;0,-3;0,0"
                            dur="3s"
                            repeatCount="indefinite"
                        />
                    </path>
                ) : null}
            </g>
        </svg>
    );
}

interface WidgetTankState extends WidgetGenericState {
    level: number;
    rawValue: number;
    rawMin: number;
    rawMax: number;
    unit: string;
}

export class WidgetTank extends WidgetGeneric<WidgetTankState> {
    private readonly actualId: string | null;

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;
        const actual = states.find(s => s.name === 'ACTUAL');

        this.actualId = actual?.id ?? null;

        this.state = {
            ...this.state,
            level: 0,
            rawValue: 0,
            rawMin: 0,
            rawMax: 100,
            unit: '%',
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onLevelChange);
        }
        void this.loadObjectConfig();
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onLevelChange);
        }
    }

    private async loadObjectConfig(): Promise<void> {
        if (!this.actualId) {
            return;
        }
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(this.actualId)) as
                | ioBroker.StateObject
                | null
                | undefined;
            if (obj?.common) {
                const min = obj.common.min != null ? Number(obj.common.min) : 0;
                const max = obj.common.max != null ? Number(obj.common.max) : 100;
                const unit = obj.common.unit || '%';
                if (!isNaN(min) && !isNaN(max) && max > min) {
                    this.setState({ rawMin: min, rawMax: max, unit });
                }
            }
        } catch {
            // ignore
        }
    }

    private rawToPercent(raw: number): number {
        const { rawMin, rawMax } = this.state;
        const range = rawMax - rawMin;
        if (range <= 0) {
            return 0;
        }
        return Math.max(0, Math.min(100, Math.round(((raw - rawMin) / range) * 100)));
    }

    private onLevelChange = (_id: string, state: ioBroker.State): void => {
        const rawValue = Number(state.val) || 0;
        const level = this.rawToPercent(rawValue);
        if (level !== this.state.level || rawValue !== this.state.rawValue) {
            this.setState({ level, rawValue });
        }
    };

    protected getHistoryIds(): { id: string; color: string }[] {
        if (!this.actualId) {
            return [];
        }
        return [{ id: this.actualId, color: this.getAccentColor() || '#2196f3' }];
    }

    protected isTileActive(): boolean {
        return this.state.level > 0;
    }

    private getDisplayValue(): string {
        const { level, rawValue, unit } = this.state;
        if (unit === '%') {
            return `${level}%`;
        }
        return `${Number.isInteger(rawValue) ? rawValue : rawValue.toFixed(1)} ${unit}`;
    }

    private shouldAnimate(): boolean {
        return this.props.settings?.showAnimation !== false;
    }

    /** Background fill from bottom — used on all tile sizes */
    private renderFillBackground(fillColor: string): React.JSX.Element {
        const { level } = this.state;
        const animate = this.shouldAnimate();

        return (
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: `${level}%`,
                    backgroundColor: fillColor,
                    opacity: 0.15,
                    borderRadius: '0 0 14px 14px',
                    transition: 'height 0.5s ease',
                    pointerEvents: 'none',
                    overflow: 'hidden',
                }}
            >
                {/* Wave on water surface */}
                {animate && level > 0 && level < 100 ? (
                    <svg
                        viewBox="0 0 200 10"
                        preserveAspectRatio="none"
                        style={{ position: 'absolute', top: -5, left: 0, width: '100%', height: 10 }}
                    >
                        <path
                            d="M0,5 q25,-5 50,0 t50,0 t50,0 t50,0 v10 H0 Z"
                            fill={fillColor}
                            opacity={0.4}
                        >
                            <animateTransform
                                attributeName="transform"
                                type="translate"
                                values="0,0;-50,0"
                                dur="3s"
                                repeatCount="indefinite"
                            />
                        </path>
                    </svg>
                ) : null}
            </Box>
        );
    }

    // --- Tile overrides (used by base class renderWide / renderWideTall) ---

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = this.renderBaseIcon();
        if (baseIcon) {
            return baseIcon;
        }

        const { level } = this.state;
        const fillColor = getFillColor(level, this.getAccentColor());

        return (
            <Box sx={{ width: '1em', height: '1em' }}>
                <TankIcon
                    level={level}
                    fillColor={fillColor}
                    id={this.props.widget.id}
                    animate={this.shouldAnimate()}
                />
            </Box>
        );
    }

    protected renderTileStatus(): React.JSX.Element {
        const { level } = this.state;
        const fillColor = getFillColor(level, this.getAccentColor());

        return (
            <Typography
                variant="caption"
                sx={{
                    fontWeight: 500,
                    color: level > 0 ? fillColor : 'text.secondary',
                    transition: 'color 0.25s ease',
                }}
            >
                {level > 0 ? this.getDisplayValue() : I18n.t('wm_Off')}
            </Typography>
        );
    }

    protected renderTileAction(): React.JSX.Element {
        return (
            <Typography
                variant="h5"
                sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
            >
                {this.getDisplayValue()}
            </Typography>
        );
    }

    // --- 1x1 compact ---

    renderCompact(): React.JSX.Element {
        const { name, level } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const isDisabled = this.props.settings?.enabled === false;
        const indicators = this.renderIndicators();
        const fillColor = getFillColor(level, accent);

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
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
                        position: 'relative',
                        ...getTileStyles(theme, isActive, accent),
                        padding: 'max(16px, 10cqi)',
                    })}
                >
                    {this.renderFillBackground(fillColor)}

                    {indicators ? (
                        <Box
                            sx={{ position: 'absolute', top: 'max(16px, 10cqi)', right: 'max(16px, 10cqi)', zIndex: 1 }}
                        >
                            {indicators}
                        </Box>
                    ) : null}

                    {/* Center: tank icon + value */}
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flex: 1,
                            position: 'relative',
                            zIndex: 1,
                        }}
                    >
                        <Box sx={{ width: 'max(56px, 34cqi)', height: 'max(56px, 34cqi)' }}>
                            <TankIcon
                                level={level}
                                fillColor={fillColor}
                                id={`compact-${this.props.widget.id}`}
                                animate={this.shouldAnimate()}
                            />
                        </Box>
                        <Typography
                            variant="body2"
                            sx={{
                                fontWeight: 700,
                                fontSize: 'max(1.2rem, 14cqi)',
                                mt: 0.5,
                                color: isActive ? fillColor : 'text.secondary',
                                transition: 'color 0.25s ease',
                            }}
                        >
                            {isActive ? this.getDisplayValue() : I18n.t('wm_Off')}
                        </Typography>
                    </Box>

                    {/* Name at bottom */}
                    <Box sx={{ position: 'relative', zIndex: 1 }}>
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
                    </Box>
                    {this.renderChart()}
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    // --- 2x0.5 wide ---

    renderWide(): React.JSX.Element {
        const { name, level } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const isDisabled = this.props.settings?.enabled === false;
        const indicators = this.renderIndicators();
        const fillColor = getFillColor(level, accent);

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={{ position: 'relative', gridColumn: 'span 2', containerType: 'inline-size', overflow: 'hidden' }}
            >
                <Box
                    sx={theme => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        width: '100%',
                        height: 80,
                        position: 'relative',
                        overflow: 'hidden',
                        opacity: isDisabled ? 0.4 : 1,
                        ...getTileStyles(theme, isActive, accent),
                    })}
                >
                    {this.renderFillBackground(fillColor)}

                    <Box
                        sx={{
                            flexShrink: 0,
                            fontSize: 'max(32px, 10cqi)',
                            position: 'relative',
                            zIndex: 1,
                            '& .MuiSvgIcon-root': { fontSize: 'inherit !important' },
                        }}
                    >
                        {this.renderTileIcon()}
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography
                                ref={this.nameRef}
                                variant="body2"
                                sx={{ fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap' }}
                            >
                                {this.props.settings?.name || name || '...'}
                            </Typography>
                            {indicators}
                        </Box>
                        {this.renderTileStatus()}
                    </Box>

                    <Box sx={{ position: 'relative', zIndex: 1 }}>{this.renderTileAction()}</Box>
                    {this.renderChart()}
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    // --- 2x1 wideTall ---

    renderWideTall(): React.JSX.Element {
        const { name, level } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const isDisabled = this.props.settings?.enabled === false;
        const indicators = this.renderIndicators();
        const fillColor = getFillColor(level, accent);

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
                    disabled
                    disableRipple
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
                        opacity: isDisabled ? 0.4 : 1,
                        cursor: 'default',
                        ...getTileStyles(theme, isActive, accent),
                        '&:active': { transform: 'none' },
                        padding: 'max(16px, 5cqi)',
                    })}
                >
                    {this.renderFillBackground(fillColor)}

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
                            position: 'relative',
                            zIndex: 1,
                            '& .MuiSvgIcon-root': { fontSize: 'inherit !important' },
                        }}
                    >
                        {this.renderTileIcon()}
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
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

                    <Box sx={{ position: 'relative', zIndex: 1 }}>{this.renderTileAction()}</Box>
                    {this.renderChart()}
                </ButtonBase>
                {this.renderSettingsButton()}
            </Box>
        );
    }
}

export default WidgetTank;
