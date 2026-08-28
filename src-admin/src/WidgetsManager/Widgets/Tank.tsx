import React from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { I18n } from '@iobroker/gui-components';

import WidgetGeneric, {
    EXTRA_INFO_NAMES,
    formatFloat,
    INDICATOR_NAMES,
    isNeumorphicTheme,
    type WidgetGenericSettings,
    type WidgetGenericProps,
    type WidgetGenericState,
} from './Generic';
import type { ConfigItemPanel } from '@iobroker/json-config';

/** Settings for Tank widget */
export interface TankWidgetSettings extends WidgetGenericSettings {
    showAnimation?: boolean;
}

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

/** Every name the base class renders itself; anything else becomes a Tank extra state. */
const HANDLED_NAMES: Set<string> = new Set<string>([...INDICATOR_NAMES, ...EXTRA_INFO_NAMES, 'ON_TIME']);

interface TankExtraState {
    id: string;
    name: string;
    label: string;
    unit: string;
    value: ioBroker.StateValue;
}

interface WidgetTankState extends WidgetGenericState {
    level: number;
    rawValue: number;
    rawMin: number;
    rawMax: number;
    unit: string;
    tankExtra: TankExtraState[];
}

export class WidgetTank extends WidgetGeneric<WidgetTankState, TankWidgetSettings> {
    private readonly actualId: string | null;
    private readonly extraStateIds: { id: string; name: string }[] = [];

    constructor(props: WidgetGenericProps<TankWidgetSettings>) {
        super(props);
        const states = props.widget.control.states;
        const actual = states.find(s => s.name === 'ACTUAL' && /value\.fill|level\.tank|tank/i.test(s.stateRole || ''));

        this.actualId = actual?.id ?? null;

        // Collect all other states that are not handled by base class or Tank
        for (const s of states) {
            if (s.id && this.actualId !== s.id && !HANDLED_NAMES.has(s.name)) {
                this.extraStateIds.push({ id: s.id, name: s.name });
            }
        }

        this.state = {
            ...this.state,
            level: 0,
            rawValue: 0,
            rawMin: 0,
            rawMax: 100,
            unit: '%',
            tankExtra: [],
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onLevelChange);
        }
        void this.loadObjectConfig();
        void this.loadExtraStates();
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onLevelChange);
        }
        for (const s of this.extraStateIds) {
            this.props.stateContext.removeState(s.id, this.onExtraStateChange);
        }
    }

    static getDefaultSettings(): TankWidgetSettings {
        return {
            ...WidgetGeneric.getDefaultSettings(),
            showAnimation: true,
        };
    }

    static getConfigSchema(): { name: string; schema: ConfigItemPanel } {
        return {
            name: 'Tank',
            schema: {
                type: 'panel',
                items: {
                    showAnimation: {
                        type: 'checkbox',
                        label: 'wm_Show animation',
                        default: true,
                    },
                },
            },
        };
    }

    private async loadExtraStates(): Promise<void> {
        const entries: TankExtraState[] = [];
        for (const { id, name } of this.extraStateIds) {
            let unit = '';
            let label = name;
            try {
                const obj = (await this.props.stateContext.getSocket().getObject(id)) as
                    | ioBroker.StateObject
                    | null
                    | undefined;
                if (obj?.common) {
                    unit = obj.common.unit || '';
                    const n = obj.common.name;
                    if (n) {
                        label = typeof n === 'object' ? n[I18n.getLanguage()] || n.en || name : n;
                    }
                }
            } catch {
                // ignore
            }
            entries.push({ id, name, label, unit, value: null });
        }
        if (!entries.length) {
            return;
        }
        // Subscribe only once the entries are on the state: `onExtraStateChange` writes into
        // `tankExtra`, so a value arriving before the list exists is dropped — and a litre reading
        // that changes twice a month would then stay blank for the rest of the tile's life.
        this.setState({ tankExtra: entries }, () => {
            for (const entry of entries) {
                this.props.stateContext.getState(entry.id, this.onExtraStateChange);
            }
        });
    }

    private onExtraStateChange = (id: string, state: ioBroker.State): void => {
        this.setState(prev => ({
            tankExtra: prev.tankExtra.map(e => (e.id === id ? { ...e, value: state.val } : e)),
        }));
    };

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

    /**
     * A tank reports a percentage, but what the user pours out of it is a volume, so devices
     * commonly carry a second reading — litres remaining next to the fill level. Without a unit the
     * bare number says nothing, so the state's own name stands in for one.
     */
    private formatExtra(e: TankExtraState): string {
        let value: string;
        if (typeof e.value === 'number') {
            const abs = Math.abs(e.value);
            value = Number.isInteger(e.value)
                ? String(e.value)
                : formatFloat(e.value, abs < 10 ? 2 : 1, this.props.stateContext.isFloatComma);
        } else if (typeof e.value === 'boolean') {
            value = I18n.t(e.value ? 'wm_On' : 'wm_Off');
        } else {
            value = String(e.value);
        }
        return e.unit ? `${value} ${e.unit}` : `${e.label}: ${value}`;
    }

    /**
     * The secondary readings of the device, on one line. It sits where the fill level used to be
     * printed a second time — the big value already says "7 %", and saying it twice tells nobody
     * how much is left in the tank.
     */
    private renderExtraStates(align: 'center' | 'flex-start', fontSize: string): React.JSX.Element | null {
        const visible = this.state.tankExtra.filter(e => e.value != null);
        if (!visible.length) {
            return null;
        }
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: align,
                    columnGap: 1,
                    lineHeight: 1.2,
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                {visible.map(e => (
                    <Typography
                        key={e.id}
                        variant="caption"
                        sx={{ fontSize, lineHeight: 1.2, opacity: 0.7, whiteSpace: 'nowrap' }}
                    >
                        {this.formatExtra(e)}
                    </Typography>
                ))}
            </Box>
        );
    }

    private getDisplayValue(): string {
        const { level, rawValue, unit } = this.state;
        if (unit === '%') {
            return `${level}%`;
        }
        return `${Number.isInteger(rawValue) ? rawValue : formatFloat(rawValue, 1, this.props.stateContext.isFloatComma)} ${unit}`;
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
        const extraStates = this.renderExtraStates('center', 'max(0.7rem, 7cqi)');
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        const fillColor = getFillColor(level, accent);
        const chartAction = this.hasChartAction();

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={theme => WidgetGeneric.getStyleCompact(theme)}
            >
                <ButtonBase
                    component="div"
                    disableRipple={!chartAction}
                    onClick={chartAction ? () => this.setState({ chartDialogOpen: true }) : undefined}
                    sx={theme => ({
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'stretch',
                        width: '100%',
                        aspectRatio: '1',
                        textAlign: 'left',
                        overflow: 'hidden',
                        position: 'relative',
                        cursor: chartAction ? 'pointer' : 'default',
                        ...this.applyTileStyles(theme, isActive),
                        ...(!chartAction && { '&:active': { transform: 'none' } }),
                        padding: isNeumorphicTheme(theme) ? 'max(12px, 8cqi)' : 'max(16px, 10cqi)',
                    })}
                >
                    {this.renderFillBackground(fillColor)}

                    {indicators}

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
                        {extraStates}
                    </Box>

                    {/* Name at bottom */}
                    <Box sx={{ position: 'relative', zIndex: 1 }}>
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
                                          fontSize: 'max(0.6rem, 6cqi)',
                                      }
                                    : {}),
                            })}
                        >
                            {this.props.settings?.name || name || '...'}
                        </Typography>
                    </Box>
                    {this.renderChart()}
                </ButtonBase>
            </Box>
        );
    }

    // --- 2x0.5 wide ---

    renderWide(): React.JSX.Element {
        const { name, level } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const extraStates = this.renderExtraStates('flex-start', '0.75rem');
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        const fillColor = getFillColor(level, accent);
        const chartAction = this.hasChartAction();

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={theme => WidgetGeneric.getStyleWide(theme)}
            >
                <ButtonBase
                    component="div"
                    disableRipple={!chartAction}
                    onClick={chartAction ? () => this.setState({ chartDialogOpen: true }) : undefined}
                    sx={theme => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        width: '100%',
                        height: 80,
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: chartAction ? 'pointer' : 'default',
                        ...this.applyTileStyles(theme, isActive),
                        ...(!chartAction && { '&:active': { transform: 'none' } }),
                    })}
                >
                    {this.renderFillBackground(fillColor)}

                    {/* Direct child of the tile: the indicators position themselves absolutely, and
                        from inside the text column they would anchor to that column instead. */}
                    {indicators}

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
                        <Typography
                            ref={this.nameRef}
                            variant="body2"
                            sx={{ fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap' }}
                        >
                            {this.props.settings?.name || name || '...'}
                        </Typography>
                        {extraStates}
                        {this.renderMinMax()}
                    </Box>

                    <Box sx={{ position: 'relative', zIndex: 1 }}>{this.renderTileAction()}</Box>
                    {this.renderChart()}
                </ButtonBase>
            </Box>
        );
    }

    // --- 2x1 wideTall ---

    renderWideTall(): React.JSX.Element {
        const { name, level } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const extraStates = this.renderExtraStates('flex-start', 'max(0.7rem, 3.5cqi)');
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        const fillColor = getFillColor(level, accent);
        const chartAction = this.hasChartAction();

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={theme => WidgetGeneric.getStyleWideTall(theme)}
            >
                {/* Sizer: exactly 1 column wide with aspect-ratio 1 to match 1x1 tile height */}
                <Box sx={{ width: 'calc(50% - 6px)', aspectRatio: '1' }} />
                <ButtonBase
                    component="div"
                    disableRipple={!chartAction}
                    onClick={chartAction ? () => this.setState({ chartDialogOpen: true }) : undefined}
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
                        cursor: chartAction ? 'pointer' : 'default',
                        ...this.applyTileStyles(theme, isActive),
                        ...(!chartAction && { '&:active': { transform: 'none' } }),
                        padding: 'max(16px, 5cqi)',
                    })}
                >
                    {this.renderFillBackground(fillColor)}

                    {indicators}

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
                        {extraStates}
                        {this.renderMinMax()}
                    </Box>

                    <Box sx={{ position: 'relative', zIndex: 1 }}>{this.renderTileAction()}</Box>
                    {this.renderChart()}
                </ButtonBase>
            </Box>
        );
    }
}

export default WidgetTank;
