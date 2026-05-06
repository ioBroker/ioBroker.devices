import React from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogContent,
    IconButton,
    Slider,
    Switch as MuiSwitch,
    Tooltip,
    Typography,
} from '@mui/material';
import { AutoFixHigh, Close, LightbulbOutlined, Timer } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';

import WidgetGeneric, {
    getTileStyles,
    isNeumorphicTheme,
    formatFloat,
    type WidgetGenericSettings,
    type WidgetGenericProps,
    type WidgetGenericState,
} from './Generic';
import type { ConfigItemPanel } from '@iobroker/json-config';

/** Settings for Slider/Dimmer/Volume widgets */
interface SliderWidgetSettings extends WidgetGenericSettings {
    sliderType?: string;
    wideSliderStyle?: string;
}

interface WidgetDimmerState extends WidgetGenericState {
    brightness: number;
    isOn: boolean;
    dragging: boolean;
    dimMin: number;
    dimMax: number;
    effect: number | string | null;
    effectStates: Record<string, string>;
    transitionTime: number | null;
    transitionMax: number;
    dialogOpen: boolean;
}

export class WidgetDimmer extends WidgetGeneric<WidgetDimmerState, SliderWidgetSettings> {
    private readonly setId: string | null;
    private readonly actualId: string | null;
    private readonly onSetId: string | null;
    private readonly onActualId: string | null;
    private readonly effectId: string | null;
    private readonly transitionTimeId: string | null;

    private arcRef = React.createRef<HTMLDivElement>();
    private dragStartPos: { x: number; y: number } | null = null;
    private isDragging = false;

    constructor(props: WidgetGenericProps<SliderWidgetSettings>) {
        super(props);
        const states = props.widget.control.states;
        const set = states.find(s => s.name === 'SET');
        const actual = states.find(s => s.name === 'ACTUAL');
        const onSet = states.find(s => s.name === 'ON_SET');
        const onActual = states.find(s => s.name === 'ON_ACTUAL');

        this.setId = set?.id ?? null;
        this.actualId = actual?.id ?? set?.id ?? null;
        this.onSetId = onSet?.id ?? null;
        this.onActualId = onActual?.id ?? onSet?.id ?? null;
        this.effectId = states.find(s => s.name === 'EFFECT')?.id ?? null;
        this.transitionTimeId = states.find(s => s.name === 'TRANSITION_TIME')?.id ?? null;

        this.state = {
            ...this.state,
            brightness: 0,
            isOn: false,
            dragging: false,
            dimMin: 0,
            dimMax: 100,
            effect: null,
            effectStates: {},
            transitionTime: null,
            transitionMax: 10000,
            dialogOpen: false,
        };
    }

    static getConfigSchema(): { name: string; schema: ConfigItemPanel } {
        return {
            name: 'Image settings', // ignored
            schema: {
                type: 'panel',
                items: {
                    wideSliderStyle: {
                        type: 'select',
                        label: 'wm_Wide slider style',
                        options: [
                            { value: 'horizontal', label: 'wm_slider_horizontal' },
                            { value: 'round', label: 'wm_slider_round' },
                        ],
                        default: 'horizontal',
                        format: 'radio',
                        hidden: "data.size === '1x1'",
                    },
                },
            },
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onBrightnessChange);
        }
        if (this.onActualId) {
            this.props.stateContext.getState(this.onActualId, this.onOnOffChange);
        }
        if (this.effectId) {
            this.props.stateContext.getState(this.effectId, this.onEffectChange);
            void this.loadEffectObject();
        }
        if (this.transitionTimeId) {
            this.props.stateContext.getState(this.transitionTimeId, this.onTransitionChange);
            void this.loadTransitionObject();
        }
        void this.loadDimmerObject();
    }

    private async loadDimmerObject(): Promise<void> {
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
                    this.setState({ dimMin: min, dimMax: max });
                }
            }
        } catch {
            // ignore
        }
    }

    private async loadEffectObject(): Promise<void> {
        if (!this.effectId) {
            return;
        }
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(this.effectId)) as
                | ioBroker.StateObject
                | null
                | undefined;
            if (obj?.common?.states && typeof obj.common.states === 'object') {
                this.setState({ effectStates: obj.common.states as Record<string, string> });
            }
        } catch {
            // ignore
        }
    }

    private async loadTransitionObject(): Promise<void> {
        if (!this.transitionTimeId) {
            return;
        }
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(this.transitionTimeId)) as
                | ioBroker.StateObject
                | null
                | undefined;
            if (obj?.common) {
                const max = obj.common.max != null ? Number(obj.common.max) : 10000;
                if (!isNaN(max) && max > 0) {
                    this.setState({ transitionMax: max });
                }
            }
        } catch {
            // ignore
        }
    }

    private onEffectChange = (_id: string, state: ioBroker.State): void => {
        const effect = state.val;
        if (effect !== this.state.effect) {
            this.setState({ effect: effect as number | string | null });
        }
    };

    private onTransitionChange = (_id: string, state: ioBroker.State): void => {
        const val = state.val != null ? Number(state.val) : null;
        const transitionTime = val != null && !isNaN(val) ? val : null;
        if (transitionTime !== this.state.transitionTime) {
            this.setState({ transitionTime });
        }
    };

    private setEffect = (value: number | string): void => {
        if (this.effectId) {
            void this.props.stateContext.getSocket().setState(this.effectId, value);
            this.setState({ effect: value });
        }
    };

    private setTransitionTime = (value: number): void => {
        if (this.transitionTimeId) {
            void this.props.stateContext.getSocket().setState(this.transitionTimeId, value);
            this.setState({ transitionTime: value });
        }
    };

    private hasExtendedControls(): boolean {
        return !!(this.effectId || this.transitionTimeId);
    }

    /** Convert a raw device value to 0-100 percent */
    private rawToPercent(raw: number): number {
        const { dimMin, dimMax } = this.state;
        const range = dimMax - dimMin;
        if (range <= 0) {
            return 0;
        }
        return Math.round(((raw - dimMin) / range) * 100);
    }

    /** Convert a 0-100 percent to a raw device value */
    private percentToRaw(percent: number): number {
        const { dimMin, dimMax } = this.state;
        return dimMin + (percent / 100) * (dimMax - dimMin);
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onBrightnessChange);
        }
        if (this.onActualId) {
            this.props.stateContext.removeState(this.onActualId, this.onOnOffChange);
        }
        if (this.effectId) {
            this.props.stateContext.removeState(this.effectId, this.onEffectChange);
        }
        if (this.transitionTimeId) {
            this.props.stateContext.removeState(this.transitionTimeId, this.onTransitionChange);
        }
    }

    onBrightnessChange = (_id: string, state: ioBroker.State): void => {
        // Ignore backend updates while user is dragging
        if (this.isDragging) {
            return;
        }
        const raw = Number(state.val) || 0;
        const brightness = this.rawToPercent(raw);
        if (brightness !== this.state.brightness) {
            if (!this.onActualId) {
                this.setState({ brightness, isOn: brightness > 0 });
            } else {
                this.setState({ brightness });
            }
        }
    };

    onOnOffChange = (_id: string, state: ioBroker.State): void => {
        const isOn = !!state.val;
        if (isOn !== this.state.isOn) {
            this.setState({ isOn });
        }
    };

    setBrightness = (_e: Event, value: number | number[]): void => {
        const percent = value as number;
        if (this.setId) {
            void this.props.stateContext.getSocket().setState(this.setId, this.percentToRaw(percent));
        }
        if (this.onSetId && !this.state.isOn && percent > 0) {
            void this.props.stateContext.getSocket().setState(this.onSetId, true);
        }
    };

    toggleOnOff = (): void => {
        if (this.onSetId) {
            void this.props.stateContext.getSocket().setState(this.onSetId, !this.state.isOn);
        } else if (this.setId) {
            void this.props.stateContext
                .getSocket()
                .setState(this.setId, this.state.isOn ? this.state.dimMin : this.state.dimMax);
        }
    };

    // --- Arc pointer interaction ---

    /** Map a screen pointer position to 0..100 brightness along the 270° arc */
    private pointerToPercent(clientX: number, clientY: number): number {
        const el = this.arcRef.current;
        if (!el) {
            return this.state.brightness;
        }
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = clientX - cx;
        const dy = clientY - cy;

        // atan2 in screen coords: 0° = right, clockwise positive (y is down)
        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        if (angle < 0) {
            angle += 360;
        }

        // Shift so arc start (135° visual = bottom-left) maps to 0
        let normalized = angle - 135;
        if (normalized < 0) {
            normalized += 360;
        }

        // Arc spans 270°; anything beyond is the 90° dead zone at the bottom
        if (normalized > 270) {
            return normalized > 315 ? 0 : 100;
        }

        return Math.round((normalized / 270) * 100);
    }

    private onArcPointerDown = (e: React.PointerEvent): void => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this.isDragging = false;
    };

    private onArcPointerMove = (e: React.PointerEvent): void => {
        if (!this.dragStartPos) {
            return;
        }

        const dx = e.clientX - this.dragStartPos.x;
        const dy = e.clientY - this.dragStartPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (!this.isDragging && dist > 8) {
            this.isDragging = true;
            this.setState({ dragging: true });
        }

        if (this.isDragging) {
            const percent = this.pointerToPercent(e.clientX, e.clientY);
            if (this.onActualId) {
                // Show as active during drag if moving above 0
                this.setState({ brightness: percent, isOn: this.state.isOn || percent > 0 });
            } else {
                this.setState({ brightness: percent, isOn: percent > 0 });
            }
        }
    };

    private onArcPointerUp = (e: React.PointerEvent): void => {
        if (!this.dragStartPos) {
            return;
        }

        if (this.isDragging) {
            // Drag end — send final brightness and activate if off
            const percent = this.pointerToPercent(e.clientX, e.clientY);
            if (this.setId) {
                void this.props.stateContext.getSocket().setState(this.setId, this.percentToRaw(percent));
            }
            if (this.onSetId && !this.state.isOn && percent > 0) {
                void this.props.stateContext.getSocket().setState(this.onSetId, true);
            }
        } else {
            // Tap — toggle on/off
            this.toggleOnOff();
        }

        this.dragStartPos = null;
        this.isDragging = false;
        this.setState({ dragging: false });
    };

    // --- Overrides ---

    protected isTileActive(): boolean {
        if (this.onActualId) {
            return this.state.isOn;
        }
        return this.state.brightness > 0;
    }

    // eslint-disable-next-line class-methods-use-this
    protected hasTileAction(): boolean {
        return true;
    }

    protected onTileClick(): void {
        this.toggleOnOff();
    }

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = super.renderTileIcon();
        if (baseIcon) {
            return baseIcon;
        }

        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const { brightness } = this.state;

        return (
            <LightbulbOutlined
                sx={theme => ({
                    color: isActive ? accent || theme.palette.primary.main : theme.palette.text.disabled,
                    transition: 'color 0.25s ease',
                    filter: isActive
                        ? `drop-shadow(0 0 ${4 + brightness / 10}px ${accent || theme.palette.primary.main})`
                        : 'none',
                })}
            />
        );
    }

    private getCurrentEffectLabel(): string | null {
        const { effect, effectStates } = this.state;
        if (effect == null) {
            return null;
        }
        return effectStates[String(effect)] || null;
    }

    protected renderTileStatus(): React.JSX.Element {
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const { brightness } = this.state;
        const effectLabel = this.getCurrentEffectLabel();
        const hasEffect = effectLabel && effectLabel.toLowerCase() !== 'none';

        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography
                    variant="caption"
                    sx={theme => ({
                        fontWeight: 500,
                        color: isActive ? accent || theme.palette.primary.main : theme.palette.text.secondary,
                        transition: 'color 0.25s ease',
                    })}
                >
                    {isActive ? `${Math.round(brightness)}%` : I18n.t('wm_Off')}
                </Typography>
                {hasEffect ? (
                    <Tooltip title={effectLabel}>
                        <AutoFixHigh sx={{ fontSize: 12, color: accent || 'primary.main' }} />
                    </Tooltip>
                ) : null}
            </Box>
        );
    }

    private renderArcKnob(): React.JSX.Element {
        const { brightness, dragging } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const vb = 100;
        const sw = 10;
        const r = (vb - sw) / 2;
        const circumference = 2 * Math.PI * r;
        const arcLength = circumference * 0.75;
        const progress = (brightness / 100) * arcLength;

        return (
            <Box
                ref={this.arcRef}
                onPointerDown={this.onArcPointerDown}
                onPointerMove={this.onArcPointerMove}
                onPointerUp={this.onArcPointerUp}
                onPointerCancel={this.onArcPointerUp}
                onClick={e => e.stopPropagation()}
                sx={{
                    width: 48,
                    height: 48,
                    flexShrink: 0,
                    touchAction: 'none',
                    userSelect: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                }}
            >
                <svg
                    viewBox={`0 0 ${vb} ${vb}`}
                    style={{ width: '100%', height: '100%', transform: 'rotate(135deg)' }}
                >
                    <circle
                        cx={vb / 2}
                        cy={vb / 2}
                        r={r}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={sw}
                        strokeDasharray={`${arcLength} ${circumference}`}
                        strokeLinecap="round"
                        opacity={0.15}
                    />
                    <circle
                        cx={vb / 2}
                        cy={vb / 2}
                        r={r}
                        fill="none"
                        stroke={isActive ? accent || 'var(--mui-palette-primary-main, #1976d2)' : 'transparent'}
                        strokeWidth={sw}
                        strokeDasharray={`${progress} ${circumference}`}
                        strokeLinecap="round"
                        style={dragging ? undefined : { transition: 'stroke-dasharray 0.3s ease' }}
                    />
                </svg>
                <Typography
                    sx={{
                        position: 'absolute',
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        lineHeight: 1,
                        color: isActive ? accent || 'primary.main' : 'text.secondary',
                    }}
                >
                    {Math.round(brightness)}%
                </Typography>
            </Box>
        );
    }

    protected renderTileAction(): React.JSX.Element {
        const { brightness } = this.state;
        const accent = this.getAccentColor();
        const isRound = (this.props.settings?.wideSliderStyle || 'horizontal') === 'round';

        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {this.hasExtendedControls() ? (
                    <Tooltip title={I18n.t('wm_Effect')}>
                        <IconButton
                            size="small"
                            onClick={e => {
                                e.stopPropagation();
                                this.setState({ dialogOpen: true });
                            }}
                            sx={{ color: 'text.secondary' }}
                        >
                            <AutoFixHigh sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>
                ) : null}
                {isRound ? (
                    this.renderArcKnob()
                ) : (
                    <Slider
                        value={brightness}
                        min={0}
                        max={100}
                        size="small"
                        onClick={e => e.stopPropagation()}
                        onChange={this.setBrightness}
                        sx={theme => ({
                            width: 80,
                            color: accent || theme.palette.primary.main,
                            '& .MuiSlider-thumb': {
                                width: 14,
                                height: 14,
                            },
                        })}
                    />
                )}
                <MuiSwitch
                    checked={this.isTileActive()}
                    onClick={e => e.stopPropagation()}
                    onChange={this.toggleOnOff}
                    size="small"
                    sx={
                        accent
                            ? {
                                  '& .MuiSwitch-switchBase.Mui-checked': { color: accent },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                      backgroundColor: accent,
                                  },
                              }
                            : undefined
                    }
                />
            </Box>
        );
    }

    private renderExtendedDialog(): React.JSX.Element | null {
        if (!this.state.dialogOpen || !this.hasExtendedControls()) {
            return null;
        }

        const { name, effect, effectStates, transitionTime, transitionMax } = this.state;
        const effectEntries = Object.entries(effectStates);

        return (
            <Dialog
                open
                onClose={() => this.setState({ dialogOpen: false })}
                maxWidth="xs"
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: '24px' } } }}
            >
                <DialogContent sx={{ p: 3, pt: 2, position: 'relative' }}>
                    <IconButton
                        size="small"
                        onClick={() => this.setState({ dialogOpen: false })}
                        sx={{ position: 'absolute', top: 8, right: 8 }}
                    >
                        <Close fontSize="small" />
                    </IconButton>

                    <Typography
                        variant="h6"
                        sx={{ fontWeight: 600, mb: 2, pr: 4 }}
                    >
                        {this.props.settings?.name || name || '...'}
                    </Typography>

                    {/* Effect selector */}
                    {this.effectId && effectEntries.length > 0 ? (
                        <Box sx={{ mb: 2 }}>
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, mb: 0.75, color: 'text.secondary' }}
                            >
                                <AutoFixHigh sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                                {I18n.t('wm_Effect')}
                            </Typography>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.75,
                                    justifyContent: 'center',
                                    flexWrap: 'wrap',
                                }}
                            >
                                {effectEntries.map(([key, label]) => {
                                    const isNum = !isNaN(Number(key));
                                    const val = isNum ? Number(key) : key;
                                    const isActive = effect != null && String(effect) === key;
                                    return (
                                        <Button
                                            key={key}
                                            variant={isActive ? 'contained' : 'outlined'}
                                            color={isActive ? 'primary' : 'inherit'}
                                            onClick={() => this.setEffect(val)}
                                            size="small"
                                            sx={{ textTransform: 'none', borderRadius: '20px', minWidth: 0, px: 1.5 }}
                                        >
                                            {label}
                                        </Button>
                                    );
                                })}
                            </Box>
                        </Box>
                    ) : null}

                    {/* Transition time slider */}
                    {this.transitionTimeId ? (
                        <Box>
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, mb: 0.75, color: 'text.secondary' }}
                            >
                                <Timer sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                                {I18n.t('wm_Transition time')}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 1 }}>
                                <Slider
                                    value={transitionTime ?? 0}
                                    min={0}
                                    max={transitionMax}
                                    step={100}
                                    onChange={(_e, value) => this.setState({ transitionTime: value as number })}
                                    onChangeCommitted={(_e, value) => this.setTransitionTime(value as number)}
                                    sx={{ flex: 1 }}
                                />
                                <Typography
                                    variant="body2"
                                    sx={{ minWidth: 50, textAlign: 'right', whiteSpace: 'nowrap' }}
                                >
                                    {transitionTime != null
                                        ? `${formatFloat(transitionTime / 1000, 1, this.props.stateContext.isFloatComma)}s`
                                        : '—'}
                                </Typography>
                            </Box>
                        </Box>
                    ) : null}
                </DialogContent>
            </Dialog>
        );
    }

    // In compact (1x1) mode, show an interactive brightness arc
    renderCompact(): React.JSX.Element {
        const { name, brightness, dragging } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);

        // Circular progress parameters — fixed viewBox, sized by CSS percentage
        const vb = 100;
        const sw = 8;
        const r = (vb - sw) / 2;
        const circumference = 2 * Math.PI * r;
        const arcLength = circumference * 0.75;
        const progress = (brightness / 100) * arcLength;

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={theme => WidgetGeneric.getStyleCompact(theme)}
            >
                <Box
                    ref={this.arcRef}
                    onPointerDown={this.onArcPointerDown}
                    onPointerMove={this.onArcPointerMove}
                    onPointerUp={this.onArcPointerUp}
                    onPointerCancel={this.onArcPointerUp}
                    sx={theme => ({
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'stretch',
                        width: '100%',
                        aspectRatio: '1',
                        textAlign: 'left',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        touchAction: 'none',
                        userSelect: 'none',
                        ...getTileStyles(theme, isActive, accent),
                        ...(isNeumorphicTheme(theme) ? { padding: 'max(12px, 8cqi)' } : {}),
                    })}
                >
                    {indicators}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            flex: 1,
                        }}
                    >
                        <svg
                            viewBox={`0 0 ${vb} ${vb}`}
                            style={{ width: '60%', height: '60%', transform: 'rotate(135deg)' }}
                        >
                            <defs>
                                <linearGradient
                                    id={`dimGrad_${this.props.widget.id}`}
                                    x1="0%"
                                    y1="0%"
                                    x2="100%"
                                    y2="100%"
                                >
                                    <stop
                                        offset="0%"
                                        stopColor={accent || '#ffc107'}
                                        stopOpacity="1"
                                    />
                                    <stop
                                        offset="100%"
                                        stopColor={accent || '#ffc107'}
                                        stopOpacity="0.5"
                                    />
                                </linearGradient>
                                <filter id={`dimGlow_${this.props.widget.id}`}>
                                    <feGaussianBlur
                                        stdDeviation="2.5"
                                        result="blur"
                                    />
                                    <feMerge>
                                        <feMergeNode in="blur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>
                            <circle
                                cx={vb / 2}
                                cy={vb / 2}
                                r={r}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={sw}
                                strokeDasharray={`${arcLength} ${circumference}`}
                                strokeLinecap="round"
                                opacity={0.15}
                            />
                            <circle
                                cx={vb / 2}
                                cy={vb / 2}
                                r={r}
                                fill="none"
                                stroke={isActive ? `url(#dimGrad_${this.props.widget.id})` : 'transparent'}
                                strokeWidth={sw}
                                strokeDasharray={`${progress} ${circumference}`}
                                strokeLinecap="round"
                                filter={isActive ? `url(#dimGlow_${this.props.widget.id})` : undefined}
                                style={dragging ? undefined : { transition: 'stroke-dasharray 0.3s ease' }}
                            />
                        </svg>
                        <Box
                            sx={{
                                position: 'absolute',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 1,
                            }}
                        >
                            {this.renderTileIcon()}
                        </Box>
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
                                ...(isNeumorphicTheme(theme)
                                    ? {
                                          textTransform: 'uppercase' as const,
                                          letterSpacing: '0.08em',
                                          fontSize: 'max(0.6rem, 6cqi)',
                                      }
                                    : {}),
                            })}
                        >
                            {name ?? '...'}
                        </Typography>
                        {this.renderTileStatus()}
                    </Box>
                </Box>
            </Box>
        );
    }

    render(): React.JSX.Element {
        return (
            <>
                {super.render()}
                {this.renderExtendedDialog()}
            </>
        );
    }
}

export default WidgetDimmer;
