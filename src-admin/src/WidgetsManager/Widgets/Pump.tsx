import React from 'react';
import { Box, Button, Dialog, DialogContent, IconButton, Slider, Typography } from '@mui/material';
import {
    Close,
    Compress,
    Plumbing,
    PowerSettingsNew,
    Speed as SpeedIcon,
    Thermostat,
    Waves,
} from '@mui/icons-material';
import { I18n } from '@iobroker/gui-components';
import type { ConfigItemPanel } from '@iobroker/json-config';

import WidgetGeneric, {
    formatFloat,
    toNumberOrNull,
    type WidgetGenericProps,
    type WidgetGenericState,
} from './Generic';
import { clampToRange, explicitRangeFromCommon, type SetpointRange as NumericRange } from './climate';

const ACCENT_COLOR = '#0288d1';

interface WidgetPumpState extends WidgetGenericState {
    power: boolean | number | null;
    level: number | null;
    levelRange: NumericRange;
    levelUnit: string;
    temperature: number | null;
    temperatureUnit: string;
    pressure: number | null;
    pressureUnit: string;
    flow: number | null;
    flowUnit: string;
    dialogOpen: boolean;
}

export class WidgetPump extends WidgetGeneric<WidgetPumpState> {
    private readonly powerId: string | null;
    private readonly levelId: string | null;
    private readonly temperatureId: string | null;
    private readonly pressureId: string | null;
    private readonly flowId: string | null;

    /** `common.type` of the power datapoint — POWER is `boolean|number`, and the write must match it */
    private powerIsNumber = false;
    /**
     * Whether that type is known yet.
     *
     * Until it is, the widget cannot tell a `boolean` datapoint from a `number` one, and writing the
     * wrong one is a write the device may reject. The control stays disabled rather than guessing.
     */
    private powerTypeKnown = false;
    /** Held while a slider drag is in progress, so the device's own echo cannot fight the pointer */
    private levelDragging = false;

    static override getConfigSchema(): { name: string; schema: ConfigItemPanel } {
        return {
            name: 'wm_Pump',
            schema: {
                type: 'panel',
                items: {},
            },
        };
    }

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;
        this.powerId = states.find(s => s.name === 'POWER' && s.id)?.id ?? null;
        const levelState = states.find(s => s.name === 'LEVEL' && s.id);
        this.levelId = levelState?.id ?? null;
        const temperatureState = states.find(s => s.name === 'TEMPERATURE' && s.id);
        this.temperatureId = temperatureState?.id ?? null;
        const pressureState = states.find(s => s.name === 'PRESSURE' && s.id);
        this.pressureId = pressureState?.id ?? null;
        const flowState = states.find(s => s.name === 'FLOW' && s.id);
        this.flowId = flowState?.id ?? null;

        this.state = {
            ...this.state,
            power: null,
            level: null,
            levelRange: { min: 0, max: 100, step: 1 },
            // The backend fills `unit` on the detected state itself, so it is shown before the
            // datapoint's object has even been fetched; blank until the device actually reports one.
            levelUnit: levelState?.unit || '',
            temperature: null,
            temperatureUnit: temperatureState?.unit || '',
            pressure: null,
            pressureUnit: pressureState?.unit || '',
            flow: null,
            flowUnit: flowState?.unit || '',
            dialogOpen: false,
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.powerId) {
            this.props.stateContext.getState(this.powerId, this.onPowerChange);
            void this.loadPowerType();
        }
        if (this.levelId) {
            this.props.stateContext.getState(this.levelId, this.onLevelChange);
            void this.loadLevelRange();
        }
        if (this.temperatureId) {
            this.props.stateContext.getState(this.temperatureId, this.onTemperatureChange);
        }
        if (this.pressureId) {
            this.props.stateContext.getState(this.pressureId, this.onPressureChange);
        }
        if (this.flowId) {
            this.props.stateContext.getState(this.flowId, this.onFlowChange);
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.powerId) {
            this.props.stateContext.removeState(this.powerId, this.onPowerChange);
        }
        if (this.levelId) {
            this.props.stateContext.removeState(this.levelId, this.onLevelChange);
        }
        if (this.temperatureId) {
            this.props.stateContext.removeState(this.temperatureId, this.onTemperatureChange);
        }
        if (this.pressureId) {
            this.props.stateContext.removeState(this.pressureId, this.onPressureChange);
        }
        if (this.flowId) {
            this.props.stateContext.removeState(this.flowId, this.onFlowChange);
        }
    }

    private async loadPowerType(): Promise<void> {
        if (!this.powerId) {
            return;
        }
        try {
            const obj = await this.props.stateContext.getObject<ioBroker.StateObject>(this.powerId);
            if (obj?.common?.type === 'number' || obj?.common?.type === 'boolean') {
                this.powerIsNumber = obj.common.type === 'number';
                this.powerTypeKnown = true;
                this.forceUpdate();
            }
        } catch {
            // Unreadable object: `onPowerChange` still infers the type from the first live value
        }
    }

    private async loadLevelRange(): Promise<void> {
        if (!this.levelId) {
            return;
        }
        try {
            const obj = await this.props.stateContext.getObject<ioBroker.StateObject>(this.levelId);
            const range = explicitRangeFromCommon(obj?.common);
            if (range) {
                this.setState({ levelRange: range });
            }
        } catch {
            // ignore — keeps the 0-100 fallback
        }
    }

    // --- State change handlers ---

    private onPowerChange = (_id: string, state: ioBroker.State): void => {
        const val = state.val;
        // The live value is the surest signal of the datapoint's actual type — a `getObject()` that
        // fails or hasn't resolved yet must not leave a numeric POWER datapoint written as a boolean.
        if (typeof val === 'number' || typeof val === 'boolean') {
            this.powerIsNumber = typeof val === 'number';
            this.powerTypeKnown = true;
        }
        const power = typeof val === 'number' || typeof val === 'boolean' ? val : null;
        if (power !== this.state.power) {
            this.setState({ power });
        }
    };

    private onLevelChange = (_id: string, state: ioBroker.State): void => {
        if (this.levelDragging) {
            return;
        }
        const level = toNumberOrNull(state.val);
        if (level !== this.state.level) {
            this.setState({ level });
        }
    };

    private onTemperatureChange = (_id: string, state: ioBroker.State): void => {
        const temperature = toNumberOrNull(state.val);
        if (temperature !== this.state.temperature) {
            this.setState({ temperature });
        }
    };

    private onPressureChange = (_id: string, state: ioBroker.State): void => {
        const pressure = toNumberOrNull(state.val);
        if (pressure !== this.state.pressure) {
            this.setState({ pressure });
        }
    };

    private onFlowChange = (_id: string, state: ioBroker.State): void => {
        const flow = toNumberOrNull(state.val);
        if (flow !== this.state.flow) {
            this.setState({ flow });
        }
    };

    // --- Actions ---
    //
    // Neither write updates state optimistically: the subscription above reports what the device
    // actually accepted, and a rejected write must not leave a control showing a value the device
    // never took. The level slider is the exception during an active drag — it must track the
    // pointer — which is why it carries its own dragging guard.

    /**
     * POWER is `boolean|number` in the pattern, so the write has to match the datapoint. Refuses while
     * the type is unknown rather than writing a value the device would reject.
     */
    private togglePower = (): void => {
        if (!this.powerId || !this.powerTypeKnown) {
            return;
        }
        const isOn = !!this.state.power;
        const next: boolean | number = this.powerIsNumber ? (isOn ? 0 : 1) : !isOn;
        void this.setValue(this.powerId, next);
    };

    private setLevel = (value: number): void => {
        if (this.levelId) {
            void this.setValue(this.levelId, clampToRange(value, this.state.levelRange));
        }
    };

    /** True once the device is known to be off — not merely "hasn't reported power yet" */
    private isPoweredOff(): boolean {
        return !!this.powerId && this.state.power != null && !this.state.power;
    }

    /** Close the control dialog, ending any in-progress drag so a stalled gesture cannot mute the tile forever */
    private closeDialog = (): void => {
        this.levelDragging = false;
        this.setState({ dialogOpen: false });
    };

    // --- Tile overrides ---

    protected isTileActive(): boolean {
        return !!this.state.power;
    }

    // eslint-disable-next-line class-methods-use-this
    protected hasTileAction(): boolean {
        return true;
    }

    /**
     * Openable even for a read-only widget, unlike the base rule.
     *
     * The dialog is the only place a pump's temperature, pressure and flow are shown, and those are
     * readings rather than controls — withholding them from someone who may not operate the pump
     * hides information they are allowed to see. Every control inside is disabled independently.
     */
    protected tileClickable(): boolean {
        return this.hasTileAction();
    }

    protected onTileClick(): void {
        this.setState({ dialogOpen: true });
    }

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = super.renderTileIcon();
        if (baseIcon) {
            return baseIcon;
        }
        const isActive = this.isTileActive();
        return (
            <Plumbing
                sx={{
                    color: isActive
                        ? this.getAccentColor() || ACCENT_COLOR
                        : this.getInactiveColor() || 'text.disabled',
                    transition: 'color 0.25s ease',
                }}
            />
        );
    }

    /**
     * Compact tile shows this only at 1x1; every other size shows {@link renderTileAction} instead,
     * which renders the same information — showing both at once would print it twice on one tile.
     */
    protected renderTileStatus(): React.JSX.Element | null {
        const size = this.props.settings?.size || '1x1';
        if (size !== '1x1') {
            return null;
        }
        return this.renderStatusContent('caption');
    }

    protected renderTileAction(): React.JSX.Element | null {
        return this.renderStatusContent('body2');
    }

    private renderStatusContent(variant: 'caption' | 'body2'): React.JSX.Element | null {
        const { power, level, levelUnit } = this.state;
        const poweredOff = this.isPoweredOff();
        const hasAnyReading = power != null || level != null;

        if (!hasAnyReading) {
            return (
                <Typography
                    variant={variant}
                    sx={{ color: 'text.disabled' }}
                >
                    {I18n.t('wm_No data')}
                </Typography>
            );
        }

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography
                    variant={variant}
                    sx={{ fontWeight: 500, color: poweredOff ? 'text.disabled' : 'text.secondary' }}
                >
                    {power == null ? '—' : power ? I18n.t('wm_On') : I18n.t('wm_Off')}
                </Typography>
                {level != null ? (
                    <Typography
                        variant={variant}
                        sx={{ color: 'text.secondary' }}
                    >
                        {this.formatLevel(level)}
                        {levelUnit ? ` ${levelUnit}` : ''}
                    </Typography>
                ) : null}
            </Box>
        );
    }

    /** A step below 1 (a fractional stage scale) needs a decimal, or its steps all round to the same integer */
    private levelDecimals(): number {
        return this.state.levelRange.step > 0 && this.state.levelRange.step < 1 ? 1 : 0;
    }

    private formatLevel(value: number): string {
        return formatFloat(value, this.levelDecimals(), this.props.stateContext.isFloatComma);
    }

    protected getHistoryIds(): { id: string; color: string }[] {
        return this.levelId ? [{ id: this.levelId, color: ACCENT_COLOR }] : [];
    }

    protected getChartUnit(): string | undefined {
        return this.levelId ? this.state.levelUnit || undefined : undefined;
    }

    // --- Control dialog ---

    private renderReadingRow(
        icon: React.JSX.Element,
        label: string,
        value: number | null,
        unit: string,
    ): React.JSX.Element {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary' }}>
                    {icon}
                    <Typography variant="body2">{label}</Typography>
                </Box>
                <Typography
                    variant="body2"
                    sx={{ fontWeight: 600 }}
                >
                    {value == null
                        ? '—'
                        : `${formatFloat(value, 1, this.props.stateContext.isFloatComma)}${unit ? ` ${unit}` : ''}`}
                </Typography>
            </Box>
        );
    }

    private renderControlDialog(): React.JSX.Element | null {
        if (!this.state.dialogOpen) {
            return null;
        }

        const {
            name,
            power,
            level,
            levelRange,
            levelUnit,
            temperature,
            temperatureUnit,
            pressure,
            pressureUnit,
            flow,
            flowUnit,
        } = this.state;
        const hasReadings = !!(this.temperatureId || this.pressureId || this.flowId);
        const dimmedSx = this.isPoweredOff() ? { opacity: 0.5, transition: 'opacity 0.25s ease' } : {};

        return (
            <Dialog
                open
                onClose={this.closeDialog}
                maxWidth="xs"
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: '24px' } } }}
            >
                <DialogContent sx={{ p: 3, pt: 2, position: 'relative' }}>
                    <IconButton
                        size="small"
                        onClick={this.closeDialog}
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

                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2, ...dimmedSx }}>
                        <Box sx={{ fontSize: 64, '& .MuiSvgIcon-root': { fontSize: 'inherit !important' } }}>
                            {this.renderTileIcon()}
                        </Box>
                    </Box>

                    {this.powerId ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                            <Button
                                variant={power ? 'contained' : 'outlined'}
                                color={power ? 'success' : 'inherit'}
                                startIcon={<PowerSettingsNew />}
                                disabled={this.isReadOnly || !this.powerTypeKnown}
                                onClick={this.togglePower}
                                size="small"
                                sx={{ textTransform: 'none', borderRadius: '20px' }}
                            >
                                {I18n.t('wm_On/Off')}
                            </Button>
                        </Box>
                    ) : null}

                    {this.levelId ? (
                        <Box sx={{ mb: hasReadings ? 2 : 0 }}>
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, mb: 0.75, color: 'text.secondary' }}
                            >
                                <SpeedIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                                {I18n.t('wm_Level')}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, ...dimmedSx }}>
                                <Slider
                                    disabled={this.isReadOnly}
                                    value={level ?? levelRange.min}
                                    min={levelRange.min}
                                    max={levelRange.max}
                                    step={levelRange.step}
                                    valueLabelDisplay="auto"
                                    onChange={(_e, value) => {
                                        if (!Array.isArray(value)) {
                                            this.levelDragging = true;
                                            this.setState({ level: value });
                                        }
                                    }}
                                    onChangeCommitted={(_e, value) => {
                                        this.levelDragging = false;
                                        if (!Array.isArray(value)) {
                                            this.setLevel(value);
                                        }
                                    }}
                                    sx={{ flex: 1 }}
                                />
                                <Typography
                                    variant="body2"
                                    sx={{ color: 'text.secondary', minWidth: 42, textAlign: 'right' }}
                                >
                                    {level == null
                                        ? '—'
                                        : `${this.formatLevel(level)}${levelUnit ? ` ${levelUnit}` : ''}`}
                                </Typography>
                            </Box>
                        </Box>
                    ) : null}

                    {hasReadings ? (
                        <Box
                            sx={{
                                pt: this.levelId ? 1 : 0,
                                borderTop: this.levelId ? '1px solid' : 'none',
                                borderColor: 'divider',
                            }}
                        >
                            {this.temperatureId
                                ? this.renderReadingRow(
                                      <Thermostat sx={{ fontSize: 16 }} />,
                                      I18n.t('wm_Temperature'),
                                      temperature,
                                      temperatureUnit,
                                  )
                                : null}
                            {this.pressureId
                                ? this.renderReadingRow(
                                      <Compress sx={{ fontSize: 16 }} />,
                                      I18n.t('wm_Pressure'),
                                      pressure,
                                      pressureUnit,
                                  )
                                : null}
                            {this.flowId
                                ? this.renderReadingRow(
                                      <Waves sx={{ fontSize: 16 }} />,
                                      I18n.t('wm_Flow'),
                                      flow,
                                      flowUnit,
                                  )
                                : null}
                        </Box>
                    ) : null}
                </DialogContent>
            </Dialog>
        );
    }

    render(): React.JSX.Element {
        return (
            <>
                {super.render()}
                {this.renderControlDialog()}
            </>
        );
    }
}

export default WidgetPump;
