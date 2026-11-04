import React from 'react';
import { Box, Button, ButtonBase, Dialog, DialogContent, IconButton, Tooltip, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { AutoFixHigh, Close, LightbulbOutlined, LightModeOutlined, PowerSettingsNew, Timer } from '@mui/icons-material';
import { I18n } from '@iobroker/gui-components';

import WidgetGeneric, {
    isNeumorphicTheme,
    formatFloat,
    type WidgetGenericSettings,
    type WidgetGenericProps,
    type WidgetGenericState,
} from './Generic';
import TouchSafeSlider from './TouchSafeSlider';
import { TOUCH_ACTION, TouchGestureGuard } from './touchGesture';
import { SIZE_OPTIONS_WITH_2X2 } from '../configUtils';
import type { ConfigItemPanel } from '@iobroker/json-config';

/** Settings for Slider/Dimmer/Volume widgets */
interface SliderWidgetSettings extends WidgetGenericSettings {
    sliderType?: string;
    /** Wide and large tiles: a slider with quick selection, or a bar with ± buttons (value `round`) */
    wideSliderStyle?: string;
    useValueByOn?: boolean;
    valueByOn?: number;
    /** Quick selection of the slider layout: values in %, separated by commas */
    presets?: string;
    /** Step of the ± buttons of the bar layout, in % */
    brightnessStep?: number;
}

/** Quick selection, when the user never set one */
const DEFAULT_PRESETS = [20, 50, 100];
/** More buttons do not fit into one row of the 2×2 tile */
const MAX_PRESETS = 4;
/** Fill of the bar and the slider when the widget has no active color of its own */
const DEFAULT_LIGHT_COLOR = '#ffc107';
/** Moves and fills slow down at the end, like a real slider coming to rest */
const EASE_OUT = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
/** Users who asked the system for less motion get the end state at once */
const REDUCED_MOTION = { '@media (prefers-reduced-motion: reduce)': { transition: 'none !important' } };

/** No-break space: the value and its unit stay on one line */
const NBSP = String.fromCharCode(0xa0);
/** Typographic minus sign, as wide as the plus sign */
const MINUS = String.fromCharCode(0x2212);
/** Movement in px that still counts as a tap, as in touchGesture.ts */
const TAP_TOLERANCE = 8;

/** Value with its unit, kept on one line */
function percentText(value: number): string {
    return `${Math.round(value)}${NBSP}%`;
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

    /** The 1×1 tile itself is the control: a tap switches, dragging up or down dims */
    private tileRef = React.createRef<HTMLDivElement>();
    /** Tells a drag on the 1×1 tile from a finger that scrolls the page across it */
    private readonly gesture = new TouchGestureGuard(this.tileRef);
    /** Where a drag on the 1×1 tile began: it dims relative to that point */
    private dragOrigin: { y: number; brightness: number; started: boolean; percent: number } | null = null;
    /** Inner part of the vertical bar of the 2×2 tile: its height is 0..100 % */
    private barRailRef = React.createRef<HTMLDivElement>();
    /** Tells a drag on the vertical bar from a finger that scrolls the page across it */
    private readonly barGesture = new TouchGestureGuard();

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
                    // Override base size to also expose 2x2
                    size: {
                        type: 'select',
                        label: 'wm_Size',
                        options: SIZE_OPTIONS_WITH_2X2,
                        default: '1x1',
                        format: 'radio',
                        horizontal: true,
                        noTranslation: true,
                    },
                    wideSliderStyle: {
                        type: 'select',
                        label: 'wm_Dimmer control',
                        // 'round' is the value of the former round knob, so the tiles that used it get the bar
                        options: [
                            { value: 'horizontal', label: 'wm_dimmer_slider' },
                            { value: 'round', label: 'wm_dimmer_bar' },
                        ],
                        default: 'horizontal',
                        format: 'radio',
                        hidden: "!data.size || data.size === '1x1'",
                    },
                    presets: {
                        newLine: true,
                        type: 'text',
                        label: 'wm_Presets',
                        help: 'wm_Presets help',
                        default: DEFAULT_PRESETS.join(', '),
                        xs: 12,
                        hidden: "!data.size || data.size === '1x1' || data.size === '2x0.5' || data.wideSliderStyle === 'round'",
                    },
                    brightnessStep: {
                        newLine: true,
                        type: 'number',
                        label: 'wm_Step',
                        min: 1,
                        max: 50,
                        default: 10,
                        xs: 12,
                        hidden: "!data.size || data.size === '1x1' || data.wideSliderStyle !== 'round'",
                    },
                    useValueByOn: {
                        newLine: true,
                        type: 'checkbox',
                        label: 'wm_Set specific value, when activating',
                        xs: 12,
                    },
                    valueByOn: {
                        newLine: true,
                        type: 'slider',
                        label: 'wm_Value by activating',
                        default: 100,
                        xs: 12,
                        hidden: '!data.useValueByOn',
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
            void this.setValue(this.effectId, value);
            this.setState({ effect: value });
        }
    };

    private setTransitionTime = (value: number): void => {
        if (this.transitionTimeId) {
            void this.setValue(this.transitionTimeId, value);
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
        // Rounded, so that 56 % of 0..100 is written as 56 and not as 56.00000000000001
        return Math.round((dimMin + (percent / 100) * (dimMax - dimMin)) * 1000) / 1000;
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
        if (this.gesture.dragging || this.barGesture.dragging || this.state.dragging) {
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

    private sendBrightness(percent: number): void {
        if (this.setId) {
            void this.setValue(this.setId, this.percentToRaw(percent));
        }
        if (this.onSetId && !this.state.isOn && percent > 0) {
            void this.setValue(this.onSetId, true);
        }
    }

    toggleOnOff = (): void => {
        if (this.onSetId) {
            void this.setValue(this.onSetId, !this.state.isOn);
        } else if (this.setId) {
            if (
                !this.state.isOn &&
                this.props.settings.useValueByOn &&
                this.props.settings.valueByOn !== undefined &&
                this.props.settings.valueByOn !== null
            ) {
                void this.setValue(this.setId, this.props.settings.valueByOn);
            } else {
                void this.props.stateContext
                    .getSocket()
                    .setState(this.setId, this.state.isOn ? this.state.dimMin : this.state.dimMax);
            }
        }
    };

    // --- 1×1 tile: a tap switches, dragging up or down dims ---

    /** Brightness for the pointer at `clientY`; the tile height is the full range, counted from where the drag began */
    private tileDragPercent(clientY: number): number {
        const origin = this.dragOrigin;
        const height = this.tileRef.current?.getBoundingClientRect().height || 0;
        if (!origin || height <= 0) {
            return this.state.brightness;
        }
        return Math.min(100, Math.max(0, Math.round(origin.brightness + ((origin.y - clientY) / height) * 100)));
    }

    private onTilePointerDown = (e: React.PointerEvent<HTMLElement>): void => {
        if (this.isReadOnly || !this.gesture.start(e, 'y')) {
            return;
        }
        const brightness = this.isTileActive() ? this.state.brightness : 0;
        this.dragOrigin = { y: e.clientY, brightness, started: false, percent: brightness };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    private onTilePointerMove = (e: React.PointerEvent): void => {
        if (!this.gesture.move(e) || !this.dragOrigin) {
            return;
        }
        if (!this.dragOrigin.started) {
            // The way up to the tap tolerance does not count, so the value does not jump when the drag starts
            const dy = e.clientY - this.dragOrigin.y;
            this.dragOrigin.y += Math.sign(dy) * Math.min(Math.abs(dy), TAP_TOLERANCE);
            this.dragOrigin.started = true;
        }
        const brightness = this.tileDragPercent(e.clientY);
        this.dragOrigin.percent = brightness;
        this.setState({ dragging: true, brightness, isOn: this.isOnWith(brightness) });
    };

    /** A drag sends the value it is released at, a tap switches the light */
    private onTilePointerUp = (e: React.PointerEvent): void => {
        const gesture = this.gesture.end(e);
        // From the pointer: the state may not have the last move yet when the pointer goes up right after it
        const percent = this.tileDragPercent(e.clientY);
        this.dragOrigin = null;
        if (gesture === 'drag') {
            this.applyBrightness(percent);
            return;
        }
        if (gesture === 'tap') {
            this.toggleOnOff();
        }
        if (this.state.dragging) {
            this.setState({ dragging: false });
        }
    };

    /** The browser took the touch over, mostly to scroll; a drag already under way keeps the value it reached */
    private onTilePointerCancel = (e: React.PointerEvent): void => {
        const percent = this.dragOrigin?.percent;
        this.dragOrigin = null;
        if (this.gesture.cancel(e) === 'drag' && percent !== undefined) {
            this.applyBrightness(percent);
        } else if (this.state.dragging) {
            this.setState({ dragging: false });
        }
    };

    /** Enter and space switch, the other keys dim like on the bar */
    private onTileKeyDown = (e: React.KeyboardEvent): void => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!this.isReadOnly) {
                this.toggleOnOff();
            }
        } else {
            this.onBarKeyDown(e);
        }
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
                    <Tooltip
                        title={effectLabel}
                        slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                    >
                        <AutoFixHigh sx={{ fontSize: 12, color: accent || 'primary.main' }} />
                    </Tooltip>
                ) : null}
            </Box>
        );
    }

    /** Opens the dialog with effect and transition time, if the device has them */
    private renderEffectButton(): React.JSX.Element | null {
        if (!this.hasExtendedControls()) {
            return null;
        }
        return (
            <Tooltip
                title={I18n.t('wm_Effect')}
                slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
            >
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
                                <TouchSafeSlider
                                    disabled={this.isReadOnly}
                                    value={transitionTime ?? 0}
                                    min={0}
                                    max={transitionMax}
                                    step={100}
                                    onChange={(_e, value) => this.setState({ transitionTime: value })}
                                    onChangeCommitted={(_e, value) => this.setTransitionTime(value)}
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

    /** 1×1: the tile fills from the bottom like a glass; a tap switches, dragging up or down dims */
    renderCompact(): React.JSX.Element {
        const { brightness, dragging } = this.state;
        const isActive = this.isTileActive();
        const lightColor = this.getLightColor();
        const readOnly = this.isReadOnly;
        const name = this.props.settings?.name || this.state.name || '...';

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={theme => WidgetGeneric.getStyleCompact(theme)}
            >
                <Box
                    ref={this.gesture.ref}
                    role="slider"
                    tabIndex={readOnly ? -1 : 0}
                    aria-label={name}
                    aria-orientation="vertical"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={brightness}
                    aria-valuetext={isActive ? percentText(brightness) : I18n.t('wm_Off')}
                    aria-disabled={readOnly || undefined}
                    onPointerDown={this.onTilePointerDown}
                    onPointerMove={this.onTilePointerMove}
                    onPointerUp={this.onTilePointerUp}
                    onPointerCancel={this.onTilePointerCancel}
                    onKeyDown={this.onTileKeyDown}
                    sx={theme => ({
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'stretch',
                        width: '100%',
                        aspectRatio: '1',
                        boxSizing: 'border-box',
                        textAlign: 'left',
                        overflow: 'hidden',
                        cursor: readOnly ? 'default' : 'pointer',
                        touchAction: TOUCH_ACTION,
                        userSelect: 'none',
                        outline: 'none',
                        ...this.applyTileStyles(theme, isActive),
                        padding: isNeumorphicTheme(theme) ? 'max(12px, 8cqi)' : 'max(16px, 10cqi)',
                        '&:focus-visible': { boxShadow: `inset 0 0 0 2px ${theme.palette.primary.main}` },
                    })}
                >
                    {/* The fill: the light color, stronger at the bottom; a mask works with any CSS color */}
                    <Box
                        aria-hidden
                        sx={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            height: isActive ? `${brightness}%` : '0%',
                            pointerEvents: 'none',
                            backgroundColor: lightColor,
                            maskImage: 'linear-gradient(to top, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.18))',
                            WebkitMaskImage: 'linear-gradient(to top, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.18))',
                            transition: dragging ? 'none' : `height 0.4s ${EASE_OUT}`,
                            ...REDUCED_MOTION,
                        }}
                    />
                    {/* Centered like on the other tiles; the top left corner belongs to the drag handle when editing */}
                    <Box
                        sx={{
                            position: 'relative',
                            flex: 1,
                            minHeight: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 'max(40px, 28cqi)',
                            '& .MuiSvgIcon-root': { fontSize: 'inherit !important' },
                            '& img': { width: '1em !important', height: '1em !important' },
                        }}
                    >
                        {this.renderTileIcon()}
                    </Box>
                    <Box sx={{ position: 'relative', minWidth: 0 }}>
                        <Typography
                            sx={{
                                fontSize: 'max(1.4rem, 16cqi)',
                                fontWeight: 700,
                                lineHeight: 1.1,
                                letterSpacing: '-0.02em',
                                whiteSpace: 'nowrap',
                                fontVariantNumeric: 'tabular-nums',
                                color: isActive ? 'text.primary' : 'text.secondary',
                                transition: 'color 0.3s ease',
                            }}
                        >
                            {isActive ? percentText(brightness) : I18n.t('wm_Off')}
                        </Typography>
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
                            {name}
                        </Typography>
                    </Box>
                </Box>
                {/* Outside the control, so a click on them does not switch the light */}
                {this.renderIndicators(this.renderSettingsButton())}
            </Box>
        );
    }

    // --- 2×2 tile ---

    /** Values of the quick selection buttons; an empty setting means no buttons */
    private getPresets(): number[] {
        const raw = this.props.settings?.presets;
        if (raw === undefined || raw === null) {
            return DEFAULT_PRESETS;
        }
        const values: number[] = [];
        for (const part of String(raw).split(/[,;\s]+/)) {
            const value = Math.round(Number(part.replace('%', '')));
            if (part && !isNaN(value) && value >= 0 && value <= 100 && !values.includes(value)) {
                values.push(value);
            }
        }
        return values.slice(0, MAX_PRESETS);
    }

    private getStep(): number {
        const step = Math.round(Number(this.props.settings?.brightnessStep));
        return step >= 1 && step <= 50 ? step : 10;
    }

    /** Whether the light is on when it is shown with `percent` while the user moves the control */
    private isOnWith(percent: number): boolean {
        // With an own on/off state, dimming down to 0 does not switch the light off
        return this.onActualId ? this.state.isOn || percent > 0 : percent > 0;
    }

    /** Show the new brightness at once and send it to the device */
    private applyBrightness(percent: number): void {
        const brightness = Math.min(100, Math.max(0, Math.round(percent)));
        this.setState({ brightness, isOn: this.isOnWith(brightness), dragging: false });
        this.sendBrightness(brightness);
    }

    /** ± buttons and keys: they start from 0 when the light is off */
    private stepBrightness(delta: number): void {
        this.applyBrightness((this.isTileActive() ? this.state.brightness : 0) + delta);
    }

    private onHugeSliderChange = (_e: Event, value: number | number[]): void => {
        const brightness = value as number;
        this.setState({ dragging: true, brightness, isOn: this.isOnWith(brightness) });
    };

    /** The horizontal slider sends only the value it is released at, not every step on the way */
    private onHugeSliderCommit = (_e: Event | React.SyntheticEvent, value: number | number[]): void => {
        this.applyBrightness(value as number);
    };

    /** Map a pointer height on the vertical bar to 0..100 % */
    private barPointerToPercent(clientY: number): number {
        const el = this.barRailRef.current;
        if (!el) {
            return this.state.brightness;
        }
        const rect = el.getBoundingClientRect();
        if (rect.height <= 0) {
            return this.state.brightness;
        }
        return Math.min(100, Math.max(0, Math.round(((rect.bottom - clientY) / rect.height) * 100)));
    }

    private onBarPointerDown = (e: React.PointerEvent<HTMLElement>): void => {
        if (this.isReadOnly || !this.barGesture.start(e, 'y')) {
            return;
        }
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    private onBarPointerMove = (e: React.PointerEvent): void => {
        if (!this.barGesture.move(e)) {
            return;
        }
        const brightness = this.barPointerToPercent(e.clientY);
        this.setState({ dragging: true, brightness, isOn: this.isOnWith(brightness) });
    };

    /** A tap puts the brightness to the tapped height, a drag to the height it is released at */
    private onBarPointerUp = (e: React.PointerEvent): void => {
        if (this.barGesture.end(e)) {
            this.applyBrightness(this.barPointerToPercent(e.clientY));
        } else if (this.state.dragging) {
            this.setState({ dragging: false });
        }
    };

    /** The browser took the touch over, mostly to scroll; a drag already under way keeps the value it reached */
    private onBarPointerCancel = (e: React.PointerEvent): void => {
        if (this.barGesture.cancel(e) === 'drag') {
            this.applyBrightness(this.state.brightness);
        } else if (this.state.dragging) {
            this.setState({ dragging: false });
        }
    };

    private onBarKeyDown = (e: React.KeyboardEvent): void => {
        if (this.isReadOnly) {
            return;
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
            this.stepBrightness(1);
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
            this.stepBrightness(-1);
        } else if (e.key === 'PageUp') {
            this.stepBrightness(this.getStep());
        } else if (e.key === 'PageDown') {
            this.stepBrightness(-this.getStep());
        } else if (e.key === 'Home') {
            this.applyBrightness(0);
        } else if (e.key === 'End') {
            this.applyBrightness(100);
        } else {
            return;
        }
        e.preventDefault();
    };

    private getLightColor(): string {
        return this.getAccentColor() || DEFAULT_LIGHT_COLOR;
    }

    /** @param small for the low 2×0.5 tile: smaller and at the bottom, below the indicators */
    private renderPowerButton(small = false): React.JSX.Element {
        const isActive = this.isTileActive();
        const size = small ? 'max(36px, 10cqi)' : 'max(40px, 12cqi)';
        return (
            <ButtonBase
                onClick={this.toggleOnOff}
                disabled={this.isReadOnly}
                aria-label={I18n.t('wm_Toggle')}
                aria-pressed={isActive}
                sx={theme => ({
                    flexShrink: 0,
                    alignSelf: small ? 'flex-end' : undefined,
                    width: size,
                    height: size,
                    borderRadius: 'max(10px, 3.5cqi)',
                    fontSize: 'max(22px, 6.5cqi)',
                    color: isActive ? theme.palette.primary.main : theme.palette.text.disabled,
                    border: `1px solid ${alpha(theme.palette.text.primary, 0.12)}`,
                    backgroundColor: isActive
                        ? alpha(theme.palette.primary.main, 0.12)
                        : alpha(theme.palette.text.primary, 0.05),
                    boxShadow: isActive ? `0 0 max(10px, 4cqi) ${alpha(theme.palette.primary.main, 0.3)}` : 'none',
                    transition:
                        'color 0.3s ease, background-color 0.3s ease, box-shadow 0.4s ease, transform 0.15s ease',
                    '&:hover': { borderColor: alpha(theme.palette.primary.main, 0.5) },
                    '&:active': { transform: 'scale(0.92)' },
                    '& .MuiSvgIcon-root': {
                        fontSize: 'inherit',
                        // The symbol turns a quarter when the light goes on, like a real rotary switch
                        transform: isActive ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: `transform 0.45s ${EASE_OUT}`,
                        ...REDUCED_MOTION,
                    },
                    ...REDUCED_MOTION,
                })}
            >
                <PowerSettingsNew />
            </ButtonBase>
        );
    }

    /** Text button of the larger tiles: quick selection or ± step */
    private renderHugeButton(options: {
        key: string;
        label: string;
        onClick: () => void;
        /** Only for buttons that show a state, like the quick selection */
        selected?: boolean;
        disabled?: boolean;
        /** Spoken label, when the visible one is only a sign */
        ariaLabel?: string;
        /** Fill the height of the grid cell instead of the usual button height */
        fill?: boolean;
    }): React.JSX.Element {
        const { key, label, onClick, selected, disabled, ariaLabel, fill } = options;
        return (
            <ButtonBase
                key={key}
                onClick={onClick}
                disabled={this.isReadOnly || disabled}
                aria-pressed={selected}
                aria-label={ariaLabel}
                sx={theme => ({
                    width: '100%',
                    height: fill ? '100%' : 'max(36px, 10.5cqi)',
                    minHeight: 32,
                    borderRadius: 'max(10px, 3cqi)',
                    fontSize: 'max(0.9rem, 4.4cqi)',
                    fontWeight: 500,
                    fontVariantNumeric: 'tabular-nums',
                    color: theme.palette.text.primary,
                    border: `1px solid ${
                        selected ? alpha(theme.palette.primary.main, 0.7) : alpha(theme.palette.text.primary, 0.1)
                    }`,
                    backgroundColor: selected
                        ? alpha(theme.palette.primary.main, 0.16)
                        : alpha(theme.palette.text.primary, 0.05),
                    transition: 'background-color 0.2s ease, border-color 0.2s ease, transform 0.12s ease',
                    '&:hover': {
                        backgroundColor: selected
                            ? alpha(theme.palette.primary.main, 0.22)
                            : alpha(theme.palette.text.primary, 0.09),
                    },
                    '&:active': { transform: 'scale(0.95)' },
                    '&.Mui-disabled': { opacity: 0.4 },
                    ...REDUCED_MOTION,
                })}
            >
                {label}
            </ButtonBase>
        );
    }

    /** The indicators float at the top right of their container: here left of the power button */
    private renderHugeIndicators(): React.JSX.Element {
        return (
            <Box sx={{ position: 'relative', flex: 1, alignSelf: 'stretch', minWidth: 0 }}>
                {this.renderIndicators(this.renderSettingsButton())}
            </Box>
        );
    }

    private renderHugeName(): React.JSX.Element {
        return (
            <Typography
                ref={this.nameRef}
                sx={theme => ({
                    display: 'block',
                    fontWeight: 600,
                    lineHeight: 1.25,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    fontSize: 'max(1rem, 5.5cqi)',
                    ...(isNeumorphicTheme(theme)
                        ? {
                              textTransform: 'uppercase' as const,
                              letterSpacing: '0.08em',
                              fontSize: 'max(0.8rem, 4.2cqi)',
                          }
                        : {}),
                })}
            >
                {this.props.settings?.name || this.state.name || '...'}
            </Typography>
        );
    }

    /** Big value and, if wanted, the "Brightness" label under it */
    private renderHugeValue(size: 'large' | 'medium' = 'large', withLabel = true): React.JSX.Element {
        const isActive = this.isTileActive();
        return (
            <Box sx={{ minWidth: 0 }}>
                <Typography
                    sx={{
                        fontSize: size === 'large' ? 'max(2rem, 12cqi)' : 'max(1.4rem, 7.5cqi)',
                        fontWeight: 700,
                        lineHeight: 1.1,
                        letterSpacing: '-0.02em',
                        whiteSpace: 'nowrap',
                        fontVariantNumeric: 'tabular-nums',
                        color: isActive ? 'text.primary' : 'text.secondary',
                        transition: 'color 0.3s ease',
                    }}
                >
                    {isActive ? percentText(this.state.brightness) : I18n.t('wm_Off')}
                </Typography>
                {withLabel ? (
                    <Typography
                        sx={{
                            mt: '0.5cqi',
                            fontSize: size === 'large' ? 'max(0.8rem, 3.8cqi)' : 'max(0.75rem, 3.2cqi)',
                            color: 'text.secondary',
                        }}
                    >
                        {I18n.t('wm_Brightness')}
                    </Typography>
                ) : null}
            </Box>
        );
    }

    /** The bulb, or the icon the user chose, at the given size */
    private renderSizedIcon(fontSize: string): React.JSX.Element {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexShrink: 0,
                    fontSize,
                    '& .MuiSvgIcon-root': { fontSize: 'inherit !important' },
                    '& img': { width: '1em !important', height: '1em !important' },
                }}
            >
                {this.renderTileIcon()}
            </Box>
        );
    }

    /** Wide slider with a big thumb: it follows the finger, but sends only the value it is released at */
    private renderBrightnessSlider(dense = false): React.JSX.Element {
        const { brightness } = this.state;
        const isActive = this.isTileActive();
        const lightColor = this.getLightColor();
        const thumb = dense ? 'max(22px, 6.5cqi)' : 'max(26px, 8cqi)';

        return (
            <TouchSafeSlider
                disabled={this.isReadOnly}
                value={brightness}
                min={0}
                max={100}
                aria-label={I18n.t('wm_Brightness')}
                getAriaValueText={value => percentText(value)}
                onChange={this.onHugeSliderChange}
                onChangeCommitted={this.onHugeSliderCommit}
                sx={theme => ({
                    display: 'block',
                    boxSizing: 'border-box',
                    height: dense ? 'max(10px, 3cqi)' : 'max(12px, 4.5cqi)',
                    // MUI makes the padding much larger on touch screens; the big thumb is enough to hit
                    padding: `${dense ? '6px' : 'max(8px, 2.5cqi)'} 0 !important`,
                    color: lightColor,
                    '& .MuiSlider-rail': {
                        opacity: 1,
                        backgroundColor: alpha(theme.palette.text.primary, 0.12),
                    },
                    '& .MuiSlider-track': {
                        border: 'none',
                        backgroundColor: isActive ? lightColor : alpha(theme.palette.text.primary, 0.25),
                    },
                    '& .MuiSlider-thumb': {
                        width: thumb,
                        height: thumb,
                        backgroundColor: isActive ? theme.palette.primary.main : theme.palette.grey[500],
                        border: '3px solid #fff',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)',
                        '&::before': { boxShadow: 'none' },
                        '&:hover, &.Mui-focusVisible': {
                            boxShadow: `0 0 0 max(6px, 2cqi) ${alpha(theme.palette.primary.main, 0.2)}`,
                        },
                        '&.Mui-active': {
                            boxShadow: `0 0 0 max(9px, 3cqi) ${alpha(theme.palette.primary.main, 0.25)}`,
                        },
                    },
                })}
            />
        );
    }

    /** Quick selection buttons in one row; null when the user emptied the list */
    private renderPresets(): React.JSX.Element | null {
        const presets = this.getPresets();
        if (!presets.length) {
            return null;
        }
        const isActive = this.isTileActive();
        const brightness = Math.round(this.state.brightness);
        return (
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${presets.length}, 1fr)`,
                    gap: 'max(8px, 2.5cqi)',
                }}
            >
                {presets.map(value =>
                    this.renderHugeButton({
                        key: String(value),
                        label: percentText(value),
                        onClick: () => this.applyBrightness(value),
                        selected: isActive && brightness === value,
                    }),
                )}
            </Box>
        );
    }

    /** Tall bar that fills from the bottom: tap a height or drag; the sun rides on the fill */
    private renderBar(width: string): React.JSX.Element {
        const { brightness, dragging } = this.state;
        const isActive = this.isTileActive();
        const lightColor = this.getLightColor();
        const readOnly = this.isReadOnly;
        // Near the top the sun sits on the fill and needs a dark color to be seen
        const sunOnFill = brightness > 80;
        const motion = (property: string): string => (dragging ? 'none' : `${property} 0.4s ${EASE_OUT}`);

        return (
            <Box
                ref={this.barGesture.ref}
                role="slider"
                tabIndex={readOnly ? -1 : 0}
                aria-label={I18n.t('wm_Brightness')}
                aria-orientation="vertical"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={brightness}
                aria-valuetext={isActive ? percentText(brightness) : I18n.t('wm_Off')}
                aria-disabled={readOnly || undefined}
                onPointerDown={this.onBarPointerDown}
                onPointerMove={this.onBarPointerMove}
                onPointerUp={this.onBarPointerUp}
                onPointerCancel={this.onBarPointerCancel}
                onKeyDown={this.onBarKeyDown}
                sx={(theme: Theme) => ({
                    width,
                    flexShrink: 0,
                    boxSizing: 'border-box',
                    padding: 'max(3px, 1cqi)',
                    borderRadius: 'max(22px, 8cqi)',
                    border: `max(2px, 0.7cqi) solid ${
                        dragging ? theme.palette.primary.main : alpha(theme.palette.text.primary, 0.12)
                    }`,
                    outline: 'none',
                    cursor: readOnly ? 'default' : 'pointer',
                    touchAction: TOUCH_ACTION,
                    userSelect: 'none',
                    transition: 'border-color 0.2s ease, transform 0.15s ease',
                    ...(readOnly
                        ? {}
                        : {
                              '&:hover, &:focus-visible': { borderColor: theme.palette.primary.main },
                              '&:active': { transform: 'scale(0.985)' },
                          }),
                    ...REDUCED_MOTION,
                })}
            >
                <Box
                    ref={this.barRailRef}
                    sx={theme => ({
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        overflow: 'hidden',
                        borderRadius: 'max(18px, 7cqi)',
                        backgroundColor: alpha(theme.palette.text.primary, 0.09),
                    })}
                >
                    <Box
                        sx={theme => ({
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            height: `${brightness}%`,
                            backgroundColor: isActive ? lightColor : alpha(theme.palette.text.primary, 0.2),
                            // Darker at the bottom, like light falling off; works with any active color
                            backgroundImage: 'linear-gradient(to top, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0) 85%)',
                            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.35)',
                            transition: `${motion('height')}, background-color 0.3s ease`,
                            ...REDUCED_MOTION,
                        })}
                    />
                    <LightModeOutlined
                        sx={{
                            position: 'absolute',
                            left: '50%',
                            bottom: `min(calc(${brightness}% + max(6px, 2cqi)), calc(100% - 1em - max(8px, 3cqi)))`,
                            fontSize: 'max(20px, 7cqi)',
                            pointerEvents: 'none',
                            color: sunOnFill && isActive ? 'rgba(0, 0, 0, 0.55)' : 'text.secondary',
                            // The sun turns with the brightness
                            transform: `translateX(-50%) rotate(${brightness * 1.8}deg)`,
                            transition: `${motion('bottom')}, ${motion('transform')}, color 0.2s ease`,
                            ...REDUCED_MOTION,
                        }}
                    />
                </Box>
            </Box>
        );
    }

    /**
     * ± buttons
     *
     * @param variant stack: under each other; fill: under each other over the full height; row: side by side, signs only
     */
    private renderStepButtons(variant: 'stack' | 'fill' | 'row'): React.JSX.Element {
        const brightness = this.state.brightness;
        const isActive = this.isTileActive();
        const step = this.getStep();
        const fill = variant === 'fill';
        const row = variant === 'row';
        const up = this.renderHugeButton({
            key: 'up',
            label: row ? '+' : `+${percentText(step)}`,
            ariaLabel: `+${percentText(step)}`,
            onClick: () => this.stepBrightness(step),
            disabled: isActive && brightness >= 100,
            fill,
        });
        const down = this.renderHugeButton({
            key: 'down',
            label: row ? MINUS : `${MINUS}${percentText(step)}`,
            ariaLabel: `${MINUS}${percentText(step)}`,
            onClick: () => this.stepBrightness(-step),
            disabled: !isActive || brightness <= 0,
            fill,
        });

        if (row) {
            return (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, max(44px, 12cqi))',
                        gap: 'max(6px, 1.5cqi)',
                        flexShrink: 0,
                    }}
                >
                    {down}
                    {up}
                </Box>
            );
        }
        return (
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateRows: fill ? '1fr 1fr' : undefined,
                    gap: fill ? 'max(6px, 2cqi)' : 'max(8px, 3cqi)',
                    width: fill ? 'max(60px, 17cqi)' : 'min(100%, max(96px, 30cqi))',
                    // Room for the indicators in the corner of the 2×1 tile
                    mt: fill ? 'max(10px, 3cqi)' : undefined,
                    flexShrink: 0,
                }}
            >
                {up}
                {down}
            </Box>
        );
    }

    /** Bar with ± buttons instead of the slider; 'round' is the value of the former round knob */
    private isBarStyle(): boolean {
        return this.props.settings?.wideSliderStyle === 'round';
    }

    /** 2×2 layout 1: icon and power button, name, big value, a wide slider and the quick selection */
    private renderHugeHorizontal(): React.JSX.Element {
        return (
            <>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    {this.renderSizedIcon('max(26px, 8cqi)')}
                    {this.renderHugeIndicators()}
                    {this.renderEffectButton()}
                    {this.renderPowerButton()}
                </Box>

                <Box sx={{ minWidth: 0 }}>
                    {this.renderHugeName()}
                    {this.renderHugeValue()}
                </Box>

                <Box>
                    {this.renderBrightnessSlider()}
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            mt: '1cqi',
                            fontSize: 'max(0.75rem, 3.4cqi)',
                            color: 'text.secondary',
                        }}
                    >
                        <span>{percentText(0)}</span>
                        <span>{percentText(100)}</span>
                    </Box>
                </Box>

                {this.renderPresets()}
            </>
        );
    }

    /** 2×2 layout 2: name and power button, a tall bar to tap or drag, the big value and ± buttons */
    private renderHugeVertical(): React.JSX.Element {
        return (
            <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    <Box sx={{ minWidth: 0, flexShrink: 1 }}>{this.renderHugeName()}</Box>
                    {this.renderHugeIndicators()}
                    {this.renderEffectButton()}
                    {this.renderPowerButton()}
                </Box>

                <Box
                    sx={{
                        display: 'flex',
                        flex: 1,
                        minHeight: 0,
                        gap: 'max(12px, 5cqi)',
                        mt: 'max(10px, 4cqi)',
                    }}
                >
                    {this.renderBar('40%')}
                    <Box
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            pt: '3cqi',
                        }}
                    >
                        {this.renderHugeValue()}
                        {this.renderStepButtons('stack')}
                    </Box>
                </Box>
            </>
        );
    }

    /** 2×2: a large tile that is easy to operate with a finger; the tile itself does not toggle on click */
    renderHuge(): React.JSX.Element {
        const isActive = this.isTileActive();

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={theme => WidgetGeneric.getStyleHuge(theme)}
            >
                <Box
                    sx={theme => ({
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        width: '100%',
                        aspectRatio: '1',
                        boxSizing: 'border-box',
                        textAlign: 'left',
                        overflow: 'hidden',
                        ...this.applyTileStyles(theme, isActive, { interactive: false }),
                        cursor: 'default',
                        padding: 'max(14px, 6cqi)',
                    })}
                >
                    {this.isBarStyle() ? this.renderHugeVertical() : this.renderHugeHorizontal()}
                </Box>
            </Box>
        );
    }

    /** 2×1 with the slider: icon, name and value, power button; the slider; the quick selection if it fits */
    private renderWideTallSlider(): React.JSX.Element {
        return (
            <>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 'max(10px, 3cqi)', minWidth: 0 }}>
                    {this.renderSizedIcon('max(30px, 10cqi)')}
                    <Box sx={{ minWidth: 0, flexShrink: 1 }}>
                        {this.renderHugeName()}
                        {this.renderHugeValue('medium', false)}
                    </Box>
                    {this.renderHugeIndicators()}
                    {this.renderEffectButton()}
                    {this.renderPowerButton()}
                </Box>
                {this.renderBrightnessSlider()}
                {/* Below this width the tile is too low for a third row */}
                <Box sx={{ '@container (max-width: 319.98px)': { display: 'none' } }}>{this.renderPresets()}</Box>
            </>
        );
    }

    /** 2×1 with the bar: the bar, name with power button over the value, the ± buttons over the full height */
    private renderWideTallBar(): React.JSX.Element {
        return (
            <>
                {this.renderBar('max(52px, 16cqi)')}
                <Box
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, minWidth: 0 }}>
                        <Box sx={{ minWidth: 0, flex: 1 }}>{this.renderHugeName()}</Box>
                        {this.renderEffectButton()}
                        {this.renderPowerButton()}
                    </Box>
                    {this.renderHugeValue('medium')}
                </Box>
                {this.renderStepButtons('fill')}
            </>
        );
    }

    /** 2×1: the layouts of the 2×2 tile at half the height; only the power button switches */
    renderWideTall(): React.JSX.Element {
        const isActive = this.isTileActive();
        const bar = this.isBarStyle();

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={theme => WidgetGeneric.getStyleWideTall(theme)}
            >
                {/* Sizer: exactly 1 column wide with aspect-ratio 1 to match 1x1 tile height */}
                <Box sx={{ width: 'calc(50% - 6px)', aspectRatio: '1' }} />
                <Box
                    sx={theme => ({
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: bar ? 'row' : 'column',
                        justifyContent: 'space-between',
                        gap: bar ? 'max(12px, 3.5cqi)' : 'max(6px, 1.5cqi)',
                        boxSizing: 'border-box',
                        textAlign: 'left',
                        overflow: 'hidden',
                        ...this.applyTileStyles(theme, isActive, { interactive: false }),
                        cursor: 'default',
                        padding: 'max(14px, 4.5cqi)',
                    })}
                >
                    {bar ? this.renderWideTallBar() : this.renderWideTallSlider()}
                    {/* With the bar, the indicators sit in the corner above the ± buttons; the header is too narrow */}
                    {bar ? this.renderIndicators(this.renderSettingsButton()) : null}
                </Box>
            </Box>
        );
    }

    /** 2×0.5: icon, name and value over a wide slider, or ± buttons; only the power button switches */
    renderWide(): React.JSX.Element {
        const isActive = this.isTileActive();
        const bar = this.isBarStyle();
        const accent = this.getAccentColor();

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={theme => WidgetGeneric.getStyleWide(theme)}
            >
                <Box
                    sx={theme => ({
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'max(10px, 2.5cqi)',
                        width: '100%',
                        height: 80,
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        ...this.applyTileStyles(theme, isActive, { interactive: false }),
                        cursor: 'default',
                    })}
                >
                    {/* With the ± buttons the icon gives way on narrow tiles, the name needs the room */}
                    <Box sx={bar ? { '@container (max-width: 299.98px)': { display: 'none' } } : undefined}>
                        {this.renderSizedIcon('max(30px, 9cqi)')}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, minWidth: 0 }}>
                            <Typography
                                ref={this.nameRef}
                                variant="body2"
                                sx={theme => ({
                                    minWidth: 0,
                                    flexShrink: 1,
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
                                {this.props.settings?.name || this.state.name || '...'}
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={theme => ({
                                    flexShrink: 0,
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    fontVariantNumeric: 'tabular-nums',
                                    color: isActive
                                        ? accent || theme.palette.primary.main
                                        : theme.palette.text.secondary,
                                    transition: 'color 0.25s ease',
                                })}
                            >
                                {isActive ? percentText(this.state.brightness) : I18n.t('wm_Off')}
                            </Typography>
                        </Box>
                        {bar ? null : this.renderBrightnessSlider(true)}
                    </Box>
                    {bar ? this.renderStepButtons('row') : null}
                    {this.renderEffectButton()}
                    {this.renderPowerButton(true)}
                    {/* In the top right corner of the tile, as the row is too narrow for them */}
                    {this.renderIndicators(this.renderSettingsButton())}
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
