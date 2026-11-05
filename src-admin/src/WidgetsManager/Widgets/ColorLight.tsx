import React from 'react';
import { Box, ButtonBase, Switch as MuiSwitch, Tooltip, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { Add, LightbulbOutlined } from '@mui/icons-material';
import { I18n } from '@iobroker/gui-components';
import { Types } from '@iobroker/type-detector';

import WidgetGeneric, { type WidgetGenericProps } from './Generic';
import {
    WidgetDimmer,
    DEFAULT_LIGHT_COLOR,
    percentText,
    tileButtonSx,
    type DimmerStateIds,
    type DimmerWidgetSettings,
    type WidgetDimmerState,
} from './Dimmer';
import { hexToRgb, rgbToHex, hsvToRgb, rgbToHsv, ctToRgb, rgbToCie, cieToRgb } from './colorUtils';
import ColorLightDialog, { isSamePreset, type ColorLightPreset } from './ColorLightDialog';
import type { ConfigItemPanel } from '@iobroker/json-config';

/** Settings for ColorLight widget */
export interface ColorLightWidgetSettings extends DimmerWidgetSettings {
    /** Brightness in % a light without an on/off state is switched on with */
    onBrightness?: number;
    /** States saved in the color dialog or on the tile, for quick selection */
    colorPresets?: ColorLightPreset[];
    /** What the quick selection of the larger tiles offers: brightness values, or the saved states */
    quickSelect?: 'brightness' | 'scenes';
}

interface WidgetColorLightState extends WidgetDimmerState {
    /** Current color as #rrggbb hex */
    color: string;
    colorDialogOpen: boolean;
    ctValue: number;
    ctMin: number;
    ctMax: number;
}

type ColorLightWriteKind = 'brightness' | 'color' | 'ct';

interface PendingWrite {
    timer: ReturnType<typeof setTimeout>;
    write: () => void;
}

/** How long a slider of the dialog must rest before its value is written */
const WRITE_DELAY = 300;
/** How long the device's reports are ignored after a write, so its confirmation cannot move the slider */
const ECHO_HOLD = 1000;
/** Saved states on the tile; more do not fit into its row and stay in the dialog */
const MAX_SCENES = 4;

/** Whether a #rrggbb color is so light that it vanishes on a light tile */
function isNearWhite(hex: string): boolean {
    const [r, g, b] = hexToRgb(hex);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.8;
}

/**
 * Color light: operated like the dimmer - the 1×1 tile fills with the light color, a tap switches, dragging dims,
 * a long press opens the color dialog; the larger tiles have a color button next to the power button.
 * Lights without a dimmer keep the plain tile with color swatch and switch.
 */
export class WidgetColorLight extends WidgetDimmer<WidgetColorLightState, ColorLightWidgetSettings> {
    // Color states — filled per subtype
    protected readonly rgbId: string | null; // rgbSingle: RGB string
    protected readonly rgbwId: string | null; // rgbwSingle: RGBW string
    protected readonly redId: string | null; // rgb: separate channels
    protected readonly greenId: string | null;
    protected readonly blueId: string | null;
    protected readonly whiteId: string | null;
    protected readonly hueId: string | null; // hue type
    protected readonly saturationId: string | null;
    protected readonly ctId: string | null; // color temperature
    protected readonly cieId: string | null; // CIE xy string

    /**
     * Writes from the sliders of the dialog wait for the pointer to rest, one timer per value kind. A device
     * confirms every write it gets, and confirmations of the values passed on the way would pull the slider back.
     */
    private readonly pendingWrites: Partial<Record<ColorLightWriteKind, PendingWrite>> = {};
    /** Until when the device's reports of a value kind are ignored, after its last write went out */
    private readonly holdUntil: Partial<Record<ColorLightWriteKind, number>> = {};
    /** On/off as the device reports it, not as shown while a write is pending */
    private deviceIsOn = false;
    /** Whether the device writes its RGB string with a leading '#', the default for level.color.rgb */
    private rgbHash = true;
    /** White channel of an RGBW string, kept when only the color changes */
    private rgbwWhite = '00';
    /** Raw channel values for RGB separate mode */
    private channelValues: { r: number; g: number; b: number } = { r: 0, g: 0, b: 0 };
    /** Hue/saturation raw values */
    private hsvValues: { h: number; s: number } = { h: 0, s: 100 };

    constructor(props: WidgetGenericProps<ColorLightWidgetSettings>) {
        super(props);
        const states = props.widget.control.states;
        const find = (name: string): string | null => states.find(s => s.name === name)?.id ?? null;

        // Color — all optional, availability depends on device type
        this.rgbId = find('RGB');
        this.rgbwId = find('RGBW');
        this.redId = find('RED');
        this.greenId = find('GREEN');
        this.blueId = find('BLUE');
        this.whiteId = find('WHITE');
        this.hueId = find('HUE');
        this.saturationId = find('SATURATION');
        this.ctId = find('TEMPERATURE');
        this.cieId = find('CIE');

        this.state = {
            ...this.state,
            color: '#ffffff',
            colorDialogOpen: false,
            ctValue: 4000,
            ctMin: 2000,
            ctMax: 6500,
        };
    }

    /** The color patterns name the dimmer and the switch differently than the dimmer pattern */
    // eslint-disable-next-line class-methods-use-this
    protected findDimmerStates(states: { name: string; id?: string }[]): DimmerStateIds {
        const find = (name: string): string | null => states.find(s => s.name === name)?.id ?? null;
        // The dimmer may not exist for some pure-color types
        const dimmer = find('DIMMER') ?? find('BRIGHTNESS');
        const onSetId = find('ON_SET') ?? find('ON');
        return {
            setId: find('SET') || dimmer,
            actualId: (find('ACTUAL') ?? find('SET')) || dimmer,
            onSetId,
            onActualId: find('ON_ACTUAL') ?? onSetId,
        };
    }

    static getDefaultSettings(): ColorLightWidgetSettings {
        return {
            ...WidgetGeneric.getDefaultSettings(),
            onBrightness: 100,
        };
    }

    static getConfigSchema(): { name: string; schema: ConfigItemPanel } {
        const { size, wideSliderStyle, presets, brightnessStep } = WidgetDimmer.getConfigSchema().schema.items;
        // Only the larger tiles with the slider have a row for the quick selection
        const noQuickSelection =
            "!data.size || data.size === '1x1' || data.size === '2x0.5' || data.wideSliderStyle === 'round'";
        return {
            name: 'Image settings', // ignored
            schema: {
                type: 'panel',
                items: {
                    size,
                    wideSliderStyle,
                    quickSelect: {
                        newLine: true,
                        type: 'select',
                        label: 'wm_Quick selection shows',
                        help: 'wm_Saved states help',
                        options: [
                            { value: 'brightness', label: 'wm_Brightness' },
                            { value: 'scenes', label: 'wm_Saved states' },
                        ],
                        default: 'brightness',
                        format: 'radio',
                        xs: 12,
                        hidden: noQuickSelection,
                    },
                    presets: { ...presets, hidden: `${noQuickSelection} || data.quickSelect === 'scenes'` },
                    brightnessStep,
                    onBrightness: {
                        newLine: true,
                        type: 'number',
                        label: 'wm_On brightness',
                        default: 100,
                        min: 1,
                        max: 100,
                        unit: '%',
                    },
                    _dialogChartHint: {
                        newLine: true,
                        type: 'staticText',
                        text: 'wm_RGB color',
                        style: {
                            fontStyle: 'italic',
                        },
                        sm: 12,
                        // The larger tiles have a button for the dialog
                        hidden: "!!data.size && data.size !== '1x1'",
                    },
                },
            },
        };
    }

    // --- Lifecycle ---

    componentDidMount(): void {
        super.componentDidMount();

        if (this.rgbId) {
            this.props.stateContext.getState(this.rgbId, this.onRgbChange);
        }
        if (this.rgbwId) {
            this.props.stateContext.getState(this.rgbwId, this.onRgbwChange);
        }
        if (this.redId) {
            this.props.stateContext.getState(this.redId, this.onChannelChange);
        }
        if (this.greenId) {
            this.props.stateContext.getState(this.greenId, this.onChannelChange);
        }
        if (this.blueId) {
            this.props.stateContext.getState(this.blueId, this.onChannelChange);
        }
        if (this.hueId) {
            this.props.stateContext.getState(this.hueId, this.onHsvChange);
        }
        if (this.saturationId) {
            this.props.stateContext.getState(this.saturationId, this.onHsvChange);
        }
        if (this.ctId) {
            this.props.stateContext.getState(this.ctId, this.onCtChange);
        }
        if (this.cieId) {
            this.props.stateContext.getState(this.cieId, this.onCieChange);
        }

        void this.loadCtObject();
    }

    componentWillUnmount(): void {
        // A value the user already set must not get lost because the widget went away
        this.flushWrites();
        super.componentWillUnmount();
        if (this.rgbId) {
            this.props.stateContext.removeState(this.rgbId, this.onRgbChange);
        }
        if (this.rgbwId) {
            this.props.stateContext.removeState(this.rgbwId, this.onRgbwChange);
        }
        if (this.redId) {
            this.props.stateContext.removeState(this.redId, this.onChannelChange);
        }
        if (this.greenId) {
            this.props.stateContext.removeState(this.greenId, this.onChannelChange);
        }
        if (this.blueId) {
            this.props.stateContext.removeState(this.blueId, this.onChannelChange);
        }
        if (this.hueId) {
            this.props.stateContext.removeState(this.hueId, this.onHsvChange);
        }
        if (this.saturationId) {
            this.props.stateContext.removeState(this.saturationId, this.onHsvChange);
        }
        if (this.ctId) {
            this.props.stateContext.removeState(this.ctId, this.onCtChange);
        }
        if (this.cieId) {
            this.props.stateContext.removeState(this.cieId, this.onCieChange);
        }
    }

    private async loadCtObject(): Promise<void> {
        if (!this.ctId) {
            return;
        }
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(this.ctId)) as
                | ioBroker.StateObject
                | null
                | undefined;
            if (obj?.common) {
                const min = obj.common.min != null ? Number(obj.common.min) : 2000;
                const max = obj.common.max != null ? Number(obj.common.max) : 6500;
                if (!isNaN(min) && !isNaN(max) && max > min) {
                    this.setState({ ctMin: min, ctMax: max });
                }
            }
        } catch {
            // ignore
        }
    }

    // --- Delayed writes ---

    /** Write after the value rested for WRITE_DELAY; a newer value of the same kind replaces the pending one */
    private scheduleWrite(kind: ColorLightWriteKind, write: () => void): void {
        const pending = this.pendingWrites[kind];
        if (pending) {
            clearTimeout(pending.timer);
        }
        this.pendingWrites[kind] = {
            timer: setTimeout(() => this.runWrite(kind), WRITE_DELAY),
            write,
        };
    }

    private runWrite(kind: ColorLightWriteKind): void {
        const pending = this.pendingWrites[kind];
        if (!pending) {
            return;
        }
        clearTimeout(pending.timer);
        delete this.pendingWrites[kind];
        this.holdUntil[kind] = Date.now() + ECHO_HOLD;
        pending.write();
    }

    /** Write everything still waiting, e.g. when the dialog closes */
    private flushWrites(): void {
        (Object.keys(this.pendingWrites) as ColorLightWriteKind[]).forEach(kind => this.runWrite(kind));
    }

    /** True while the user's value of this kind is pending or its confirmations are still coming in */
    private isHeld(kind: ColorLightWriteKind): boolean {
        return !!this.pendingWrites[kind] || Date.now() < (this.holdUntil[kind] ?? 0);
    }

    // --- Reports of the device ---

    protected ignoresBrightnessReports(): boolean {
        return super.ignoresBrightnessReports() || this.isHeld('brightness');
    }

    protected applyOnOffReport(isOn: boolean): void {
        this.deviceIsOn = isOn;
        super.applyOnOffReport(isOn);
    }

    private onRgbChange = (_id: string, state: ioBroker.State): void => {
        const raw = String(state.val || '');
        const val = raw.replace(/^#/, '');
        if (val.length >= 6) {
            this.rgbHash = raw.startsWith('#');
            if (!this.isHeld('color')) {
                this.setState({ color: `#${val.slice(0, 6)}` });
            }
        }
    };

    private onRgbwChange = (_id: string, state: ioBroker.State): void => {
        // RGBW: take first 6 hex chars as RGB, the next 2 as white
        const raw = String(state.val || '');
        const val = raw.replace(/^#/, '');
        if (val.length >= 6) {
            this.rgbHash = raw.startsWith('#');
            if (val.length >= 8) {
                this.rgbwWhite = val.slice(6, 8);
            }
            if (!this.isHeld('color')) {
                this.setState({ color: `#${val.slice(0, 6)}` });
            }
        }
    };

    private onChannelChange = (id: string, state: ioBroker.State): void => {
        const val = Math.round(Number(state.val) || 0);
        if (id === this.redId) {
            this.channelValues.r = val;
        } else if (id === this.greenId) {
            this.channelValues.g = val;
        } else if (id === this.blueId) {
            this.channelValues.b = val;
        }
        if (!this.isHeld('color')) {
            const { r, g, b } = this.channelValues;
            this.setState({ color: rgbToHex(r, g, b) });
        }
    };

    private onHsvChange = (id: string, state: ioBroker.State): void => {
        const val = Number(state.val) || 0;
        if (id === this.hueId) {
            this.hsvValues.h = val;
        } else if (id === this.saturationId) {
            this.hsvValues.s = val;
        }
        if (this.isHeld('color')) {
            return;
        }
        const [r, g, b] = hsvToRgb(this.hsvValues.h, this.hsvValues.s / 100, 1);
        this.setState({ color: rgbToHex(r, g, b) });
    };

    private onCtChange = (_id: string, state: ioBroker.State): void => {
        if (this.isHeld('ct')) {
            return;
        }
        const kelvin = Number(state.val) || 4000;
        const [r, g, b] = ctToRgb(kelvin);
        this.setState({ color: rgbToHex(r, g, b), ctValue: kelvin });
    };

    private onCieChange = (_id: string, state: ioBroker.State): void => {
        const val = String(state.val || '');
        const parts = val.split(',').map(Number);
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && !this.isHeld('color')) {
            const [r, g, b] = cieToRgb(parts[0], parts[1]);
            this.setState({ color: rgbToHex(r, g, b) });
        }
    };

    // --- Writes to the device ---

    protected sendColor(hex: string): void {
        const type = this.props.widget.control.type;
        const [r, g, b] = hexToRgb(hex);
        // Written in the format the device reports: e.g. the sonoff adapter cuts the first character off,
        // so a value without its '#' reaches Tasmota one digit short and with the channels shifted
        const rgb = `${this.rgbHash ? '#' : ''}${hex.replace(/^#/, '')}`;

        if (type === Types.rgbSingle && this.rgbId) {
            void this.setValue(this.rgbId, rgb);
        } else if (type === Types.rgbwSingle && this.rgbwId) {
            // Keep existing white channel
            void this.setValue(this.rgbwId, `${rgb}${this.rgbwWhite}`);
        } else if (type === Types.rgb) {
            if (this.redId) {
                void this.setValue(this.redId, r);
            }
            if (this.greenId) {
                void this.setValue(this.greenId, g);
            }
            if (this.blueId) {
                void this.setValue(this.blueId, b);
            }
        } else if (type === Types.hue) {
            const [h, s] = rgbToHsv(r, g, b);
            if (this.hueId) {
                void this.setValue(this.hueId, Math.round(h));
            }
            if (this.saturationId) {
                void this.setValue(this.saturationId, Math.round(s * 100));
            }
        } else if (type === Types.cie && this.cieId) {
            const [cx, cy] = rgbToCie(r, g, b);
            void this.setValue(this.cieId, `${cx.toFixed(4)},${cy.toFixed(4)}`);
        }
        // CT is not set from RGB hex — it has its own control
    }

    /** The tiles write when their control is released; the reports passed on the way back are held off */
    protected sendBrightness(percent: number): void {
        const pending = this.pendingWrites.brightness;
        if (pending) {
            clearTimeout(pending.timer);
            delete this.pendingWrites.brightness;
        }
        this.holdUntil.brightness = Date.now() + ECHO_HOLD;
        this.writeBrightness(percent);
    }

    private writeBrightness(percent: number): void {
        if (this.setId) {
            void this.setValue(this.setId, this.percentToRaw(percent));
        }
        // The shown on/off already follows the control, so ask the device whether it is on
        if (this.onSetId && !this.deviceIsOn && percent > 0) {
            void this.setValue(this.onSetId, true);
        }
    }

    protected toggleOnOff(): void {
        if (this.onSetId) {
            void this.setValue(this.onSetId, !this.state.isOn);
        } else if (this.setId) {
            const onPercent = this.props.settings?.onBrightness ?? 100;
            void this.props.stateContext
                .getSocket()
                .setState(this.setId, this.state.isOn ? this.state.dimMin : this.percentToRaw(onPercent));
        }
    }

    /** Show the brightness of the dialog at once and write it once its slider rests */
    private changeBrightness(percent: number): void {
        this.setState({ brightness: percent, isOn: percent > 0 || (!!this.onSetId && this.state.isOn) });
        this.scheduleWrite('brightness', () => this.writeBrightness(percent));
    }

    // --- Dialog and saved states ---

    private hasColorControl(): boolean {
        const type = this.props.widget.control.type;
        return type !== Types.ct;
    }

    private onDialogColorChange = (hex: string): void => {
        this.setState({ color: hex });
        this.scheduleWrite('color', () => this.sendColor(hex));
    };

    private onDialogBrightnessChange = (percent: number): void => {
        this.changeBrightness(percent);
    };

    private onDialogCtChange = (kelvin: number): void => {
        this.setState({ ctValue: kelvin });
        const ctId = this.ctId;
        if (ctId) {
            this.scheduleWrite('ct', () => void this.setValue(ctId, kelvin));
        }
    };

    /** Apply a stored state at once — a tap, not a drag, so nothing to wait for */
    private applyScene = (preset: ColorLightPreset): void => {
        const { color, ct, brightness } = preset;
        if (color && this.hasColorControl()) {
            this.setState({ color });
            this.scheduleWrite('color', () => this.sendColor(color));
        } else if (ct !== undefined && this.ctId) {
            this.onDialogCtChange(ct);
        }
        if (brightness !== undefined && this.setId) {
            this.changeBrightness(brightness);
        } else if (this.onSetId && !this.deviceIsOn) {
            void this.setValue(this.onSetId, true);
        }
        // Brightness last: some devices (e.g. Tasmota) derive their dimmer from a new color
        this.runWrite('color');
        this.runWrite('ct');
        this.runWrite('brightness');
    };

    private onScenesChange = (colorPresets: ColorLightPreset[]): void => {
        this.props.onSaveSettings?.(String(this.props.widget.id), { colorPresets });
    };

    /** Whether the light shows a color temperature rather than a color */
    private isCtMode(): boolean {
        if (!this.ctId) {
            return false;
        }
        if (!this.hasColorControl()) {
            return true;
        }
        // The color follows the last report; after one of the color temperature it is exactly its color
        return this.state.color.toLowerCase() === rgbToHex(...ctToRgb(this.state.ctValue));
    }

    /** The state of the light as it is saved, the same way as "+" in the color dialog does it */
    private getCurrentScene(): ColorLightPreset {
        const scene: ColorLightPreset = {};
        if (this.isCtMode()) {
            scene.ct = Math.round(this.state.ctValue);
        } else if (this.hasColorControl()) {
            // At full value, like the hue and saturation sliders of the dialog
            const [h, s] = rgbToHsv(...hexToRgb(this.state.color));
            scene.color = rgbToHex(...hsvToRgb(Math.round(h), Math.round(s * 100) / 100, 1));
        }
        if (this.setId || this.actualId) {
            scene.brightness = Math.round(this.state.brightness);
        }
        return scene;
    }

    private saveScene = (): void => {
        const scenes = this.props.settings?.colorPresets || [];
        const scene = this.getCurrentScene();
        if (!scenes.some(other => isSamePreset(other, scene))) {
            this.onScenesChange([...scenes, scene]);
        }
    };

    private openDialog = (): void => {
        this.setState({ colorDialogOpen: true });
    };

    private closeDialog = (): void => {
        this.flushWrites();
        this.setState({ colorDialogOpen: false });
    };

    // --- How the dimmer tiles show a color light ---

    protected isTileActive(): boolean {
        if (this.hasOwnOnOff()) {
            return this.state.isOn;
        }
        return this.state.brightness > 0 || this.state.isOn;
    }

    /** Without any power control a tap opens the dialog */
    protected onTileClick(): void {
        if (this.onSetId || this.setId) {
            this.toggleOnOff();
        } else {
            this.openDialog();
        }
    }

    /** With power control a tap switches, so the dialog opens on a long press */
    protected getTileLongPress(): (() => void) | null {
        return this.onSetId || this.setId ? this.openDialog : null;
    }

    protected getValueText(): string {
        if (!this.canDim()) {
            return I18n.t(this.isTileActive() ? 'wm_On' : 'wm_Off');
        }
        return super.getValueText();
    }

    protected getFillPercent(): number {
        if (!this.canDim()) {
            return this.isTileActive() ? 100 : 0;
        }
        return super.getFillPercent();
    }

    protected getLightColor(): string {
        return this.state.color || super.getLightColor();
    }

    /** A white light would vanish on a light tile: it is shown in the color of a plain dimmer then */
    protected getFillColor(theme: Theme): string {
        const color = this.getLightColor();
        return theme.palette.mode === 'light' && isNearWhite(color) ? DEFAULT_LIGHT_COLOR : color;
    }

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = this.renderBaseIcon();
        if (baseIcon) {
            return baseIcon;
        }

        const isActive = this.isTileActive();
        const { brightness } = this.state;

        return (
            <LightbulbOutlined
                sx={theme => {
                    const color = this.getFillColor(theme);
                    return {
                        color: isActive ? color : theme.palette.text.disabled,
                        transition: 'color 0.25s ease',
                        filter: isActive ? `drop-shadow(0 0 ${4 + brightness / 10}px ${color})` : 'none',
                    };
                }}
            />
        );
    }

    /** Status line of the plain tiles of lights without a dimmer */
    protected renderTileStatus(): React.JSX.Element {
        const isActive = this.isTileActive();
        const { color } = this.state;

        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {isActive ? (
                    <Box
                        sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            backgroundColor: color,
                            border: '1px solid',
                            borderColor: 'divider',
                            flexShrink: 0,
                        }}
                    />
                ) : null}
                <Typography
                    variant="caption"
                    sx={theme => ({
                        fontWeight: 500,
                        color: isActive ? theme.palette.text.primary : theme.palette.text.secondary,
                        transition: 'color 0.25s ease',
                    })}
                >
                    {this.getValueText()}
                </Typography>
            </Box>
        );
    }

    /** Color swatch and switch of the plain wide tiles of lights without a dimmer */
    protected renderTileAction(): React.JSX.Element {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                    onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        this.openDialog();
                    }}
                    sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: this.state.color,
                        border: '2px solid',
                        borderColor: 'divider',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'background-color 0.2s ease',
                    }}
                />
                {this.onSetId || this.setId ? (
                    <MuiSwitch
                        checked={this.isTileActive()}
                        onClick={e => e.stopPropagation()}
                        onChange={() => this.toggleOnOff()}
                        size="small"
                    />
                ) : null}
            </Box>
        );
    }

    /** Opens the color dialog; shows the color the light has */
    private renderColorButton(small: boolean): React.JSX.Element {
        const isActive = this.isTileActive();
        return (
            <ButtonBase
                key="color"
                onClick={this.openDialog}
                aria-label={I18n.t('wm_Color')}
                aria-haspopup="dialog"
                sx={theme => tileButtonSx(theme, small)}
            >
                <Box
                    component="span"
                    sx={theme => ({
                        width: '52%',
                        height: '52%',
                        borderRadius: '50%',
                        backgroundColor: this.state.color,
                        border: `1px solid ${alpha(theme.palette.text.primary, 0.3)}`,
                        opacity: isActive ? 1 : 0.55,
                        transition: 'background-color 0.3s ease, opacity 0.3s ease',
                    })}
                />
            </ButtonBase>
        );
    }

    protected renderExtraButtons(small: boolean): React.ReactNode {
        return (
            <>
                {this.renderColorButton(small)}
                {super.renderExtraButtons(small)}
            </>
        );
    }

    /** Swatch of a saved state and, if the button is wide enough, its brightness */
    private static renderSceneLabel(scene: ColorLightPreset): React.JSX.Element {
        const swatch = scene.color || rgbToHex(...ctToRgb(scene.ct ?? 4000));
        return (
            <Box
                component="span"
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35em',
                    width: '100%',
                    // The button is the container, so the brightness shows wherever it fits, whatever the tile size
                    containerType: 'inline-size',
                }}
            >
                <Box
                    component="span"
                    sx={theme => ({
                        width: '1.15em',
                        height: '1.15em',
                        flexShrink: 0,
                        borderRadius: '50%',
                        backgroundColor: swatch,
                        border: `1px solid ${alpha(theme.palette.text.primary, 0.3)}`,
                    })}
                />
                {scene.brightness !== undefined ? (
                    <Box
                        component="span"
                        sx={{ whiteSpace: 'nowrap', '@container (max-width: 63.98px)': { display: 'none' } }}
                    >
                        {percentText(scene.brightness)}
                    </Box>
                ) : null}
            </Box>
        );
    }

    /** Saved states as quick selection, and "+" to save the current state */
    private renderScenes(): React.JSX.Element | null {
        const all = this.props.settings?.colorPresets || [];
        const scenes = all.slice(0, MAX_SCENES);
        const current = this.getCurrentScene();
        const isActive = this.isTileActive();
        const canSave = !!this.props.onSaveSettings && !this.isReadOnly && all.length < MAX_SCENES;
        const saveLabel = I18n.t('wm_Save current state');

        if (!scenes.length) {
            // Nothing saved yet: the button says what it does
            return canSave
                ? this.renderHugeButton({
                      key: 'save',
                      label: (
                          <Box
                              component="span"
                              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
                          >
                              <Add sx={{ fontSize: '1.3em' }} />
                              {saveLabel}
                          </Box>
                      ),
                      onClick: this.saveScene,
                  })
                : null;
        }

        return (
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${scenes.length}, 1fr)${canSave ? ' max(44px, 12cqi)' : ''}`,
                    gap: 'max(8px, 2.5cqi)',
                }}
            >
                {scenes.map((scene, i) =>
                    this.renderHugeButton({
                        key: String(i),
                        label: WidgetColorLight.renderSceneLabel(scene),
                        ariaLabel: [
                            scene.color || (scene.ct !== undefined ? `${scene.ct} K` : ''),
                            scene.brightness !== undefined ? percentText(scene.brightness) : '',
                        ]
                            .filter(Boolean)
                            .join(', '),
                        onClick: () => this.applyScene(scene),
                        selected: isActive && isSamePreset(scene, current),
                    }),
                )}
                {canSave
                    ? this.renderHugeButton({
                          key: 'save',
                          label: <Add sx={{ fontSize: '1.3em' }} />,
                          ariaLabel: saveLabel,
                          onClick: this.saveScene,
                          // The state is saved already
                          disabled: all.some(scene => isSamePreset(scene, current)),
                      })
                    : null}
            </Box>
        );
    }

    protected renderPresets(): React.JSX.Element | null {
        return this.props.settings?.quickSelect === 'scenes' ? this.renderScenes() : super.renderPresets();
    }

    // --- Sizes ---

    renderCompact(): React.JSX.Element {
        const tile = super.renderCompact();
        if (!this.getTileLongPress()) {
            return tile;
        }
        return (
            <Tooltip
                title={I18n.t('wm_Long press for settings')}
                disableTouchListener
                enterDelay={500}
                slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
            >
                {tile}
            </Tooltip>
        );
    }

    /** Without a dimmer there is nothing to slide: the plain row with color swatch and switch */
    renderWide(): React.JSX.Element {
        return this.canDim() ? super.renderWide() : WidgetGeneric.prototype.renderWide.call(this);
    }

    renderWideTall(): React.JSX.Element {
        return this.canDim() ? super.renderWideTall() : WidgetGeneric.prototype.renderWideTall.call(this);
    }

    renderHuge(): React.JSX.Element {
        return this.canDim() ? super.renderHuge() : WidgetGeneric.prototype.renderWideTall.call(this);
    }

    render(): React.JSX.Element {
        return (
            <>
                {super.render()}
                <ColorLightDialog
                    open={this.state.colorDialogOpen}
                    onClose={this.closeDialog}
                    color={this.state.color}
                    brightness={this.state.brightness}
                    isOn={this.state.isOn}
                    hasColor={this.hasColorControl()}
                    hasPower={!!(this.onSetId || this.setId)}
                    hasBrightness={!!(this.setId || this.actualId)}
                    hasCt={!!this.ctId}
                    ctMin={this.state.ctMin}
                    ctMax={this.state.ctMax}
                    ctValue={this.state.ctValue}
                    onColorChange={this.onDialogColorChange}
                    onBrightnessChange={this.onDialogBrightnessChange}
                    onCtChange={this.onDialogCtChange}
                    onToggle={() => this.toggleOnOff()}
                    presets={this.props.settings?.colorPresets || []}
                    onPresetsChange={this.props.onSaveSettings && !this.isReadOnly ? this.onScenesChange : undefined}
                    onApplyPreset={this.applyScene}
                />
            </>
        );
    }
}

export default WidgetColorLight;
