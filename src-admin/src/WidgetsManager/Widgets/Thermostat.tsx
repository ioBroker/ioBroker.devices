import React from 'react';
import {
    Box,
    Button,
    ButtonBase,
    Dialog,
    DialogContent,
    IconButton,
    Slider,
    TextField,
    Tooltip,
    Typography,
    type SxProps,
    type Theme,
} from '@mui/material';
import {
    Thermostat,
    WaterDrop,
    Add,
    Remove,
    LocalFireDepartment,
    Close,
    PowerSettingsNew,
    Celebration,
    AutoMode,
    AcUnit,
    EnergySavingsLeaf,
    Air,
    Whatshot,
    Tune,
    PauseCircleOutlined,
} from '@mui/icons-material';
import { I18n } from '@iobroker/gui-components';

import WidgetGeneric, {
    formatFloat,
    isNeumorphicTheme,
    type WidgetGenericProps,
    type WidgetGenericState,
} from './Generic';
import ClimateArc from './ClimateArc';
import { parseCommonStates, stateKeyToValue } from './commonStates';
import {
    COOLING_COLOR,
    HEATING_COLOR,
    pointerToFraction,
    clampAgainstOther,
    clampForWrite,
    clampToRange,
    defaultRange,
    SETPOINT_KINDS,
    findSetpointIds,
    fractionToValue,
    isDualSetpoint,
    mergeRanges,
    metaFromCommon,
    offDialSetpointKinds,
    pickDragTarget,
    setpointId,
    singleSetpointKind,
    type SetpointIds,
    type SetpointKind,
    type SetpointMetas,
    type SetpointRange,
} from './climate';

interface WidgetThermostatState extends WidgetGenericState {
    setTemp: number | null;
    setHeating: number | null;
    setCooling: number | null;
    /** What the user has typed into one of the off-dial setpoint fields but not committed yet */
    setDraft: { kind: SetpointKind; text: string } | null;
    actualTemp: number | null;
    humidity: number | null;
    boost: boolean;
    power: boolean | null;
    party: boolean | null;
    mode: string | number | null;
    modeStates: Record<string, string>;
    workingMode: string | number | null;
    workingModeStates: Record<string, string>;
    /** What each setpoint datapoint declares — its own limits, and whether it can be written */
    metas: SetpointMetas;
    /** The scale under the thumbs: every setpoint's range at once */
    range: SetpointRange;
    dragging: boolean;
    /** Setpoint the running gesture moves; picked on pointer-down and kept for the gesture */
    dragTarget: SetpointKind | null;
    dialogOpen: boolean;
}

export class WidgetThermostat extends WidgetGeneric<WidgetThermostatState> {
    private readonly setIds: SetpointIds;
    private readonly dual: boolean;
    /** The setpoint a single-thumb dial follows; null once the dial carries two */
    private readonly singleKind: SetpointKind | null;
    private readonly actualId: string | null;
    private readonly humidityId: string | null;
    private readonly boostId: string | null;
    private readonly powerId: string | null;
    private readonly partyId: string | null;
    private readonly modeId: string | null;
    private readonly workingModeId: string | null;
    private readonly arcRef = React.createRef<HTMLDivElement>();

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;
        this.setIds = findSetpointIds(states);
        this.dual = isDualSetpoint(this.setIds);
        this.singleKind = this.dual ? null : singleSetpointKind(this.setIds);
        this.actualId = states.find(s => s.name === 'ACTUAL')?.id ?? null;
        this.humidityId = states.find(s => s.name === 'HUMIDITY')?.id ?? null;
        this.boostId = states.find(s => s.name === 'BOOST')?.id ?? null;
        this.powerId = states.find(s => s.name === 'POWER')?.id ?? null;
        this.partyId = states.find(s => s.name === 'PARTY')?.id ?? null;
        this.modeId = states.find(s => s.name === 'MODE')?.id ?? null;
        this.workingModeId = states.find(s => s.name === 'WORKING_MODE' && s.id)?.id ?? null;

        this.state = {
            ...this.state,
            setTemp: null,
            setHeating: null,
            setCooling: null,
            setDraft: null,
            actualTemp: null,
            humidity: null,
            boost: false,
            power: null,
            party: null,
            mode: null,
            modeStates: {},
            workingMode: null,
            workingModeStates: {},
            metas: {},
            range: defaultRange(5, 30),
            dragging: false,
            dragTarget: null,
            dialogOpen: false,
        };
    }

    private setpointValue(kind: SetpointKind): number | null {
        return kind === 'plain'
            ? this.state.setTemp
            : kind === 'heating'
              ? this.state.setHeating
              : this.state.setCooling;
    }

    /** The value a single-thumb dial and every single-value readout show */
    private get displaySetpoint(): number | null {
        return this.singleKind ? this.setpointValue(this.singleKind) : null;
    }

    /** The temperature the tile takes its colour from */
    private get displayTemp(): number | null {
        return this.state.actualTemp ?? this.displaySetpoint ?? this.state.setHeating ?? this.state.setCooling;
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.setIds.plain) {
            this.props.stateContext.getState(this.setIds.plain, this.onPlainSetChange);
        }
        if (this.setIds.heating) {
            this.props.stateContext.getState(this.setIds.heating, this.onHeatingSetChange);
        }
        if (this.setIds.cooling) {
            this.props.stateContext.getState(this.setIds.cooling, this.onCoolingSetChange);
        }
        if (this.workingModeId) {
            this.props.stateContext.getState(this.workingModeId, this.onWorkingModeChange);
            void this.loadWorkingModeObject();
        }
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onActualChange);
        }
        if (this.humidityId) {
            this.props.stateContext.getState(this.humidityId, this.onHumidityChange);
        }
        if (this.boostId) {
            this.props.stateContext.getState(this.boostId, this.onBoostChange);
        }
        if (this.powerId) {
            this.props.stateContext.getState(this.powerId, this.onPowerChange);
        }
        if (this.partyId) {
            this.props.stateContext.getState(this.partyId, this.onPartyChange);
        }
        if (this.modeId) {
            this.props.stateContext.getState(this.modeId, this.onModeChange);
            void this.loadModeObject();
        }
        void this.loadSetpointMetas();
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.setIds.plain) {
            this.props.stateContext.removeState(this.setIds.plain, this.onPlainSetChange);
        }
        if (this.setIds.heating) {
            this.props.stateContext.removeState(this.setIds.heating, this.onHeatingSetChange);
        }
        if (this.setIds.cooling) {
            this.props.stateContext.removeState(this.setIds.cooling, this.onCoolingSetChange);
        }
        if (this.workingModeId) {
            this.props.stateContext.removeState(this.workingModeId, this.onWorkingModeChange);
        }
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onActualChange);
        }
        if (this.humidityId) {
            this.props.stateContext.removeState(this.humidityId, this.onHumidityChange);
        }
        if (this.boostId) {
            this.props.stateContext.removeState(this.boostId, this.onBoostChange);
        }
        if (this.powerId) {
            this.props.stateContext.removeState(this.powerId, this.onPowerChange);
        }
        if (this.partyId) {
            this.props.stateContext.removeState(this.partyId, this.onPartyChange);
        }
        if (this.modeId) {
            this.props.stateContext.removeState(this.modeId, this.onModeChange);
        }
    }

    private async loadModeObject(): Promise<void> {
        if (!this.modeId) {
            return;
        }
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(this.modeId)) as
                | ioBroker.StateObject
                | null
                | undefined;
            const parsed = parseCommonStates(obj?.common?.states);
            if (Object.keys(parsed).length) {
                this.setState({ modeStates: parsed });
            }
        } catch {
            // ignore
        }
    }

    private async loadWorkingModeObject(): Promise<void> {
        if (!this.workingModeId) {
            return;
        }
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(this.workingModeId)) as
                | ioBroker.StateObject
                | null
                | undefined;
            const parsed = parseCommonStates(obj?.common?.states);
            if (Object.keys(parsed).length) {
                this.setState({ workingModeStates: parsed });
            }
        } catch {
            // ignore
        }
    }

    /**
     * Read what every setpoint datapoint declares: its own limits, kept per setpoint so a write
     * respects them, and their union, which is the scale the dial paints.
     */
    private async loadSetpointMetas(): Promise<void> {
        const fallback = this.state.range;
        const metas: SetpointMetas = {};
        for (const kind of SETPOINT_KINDS) {
            const id = setpointId(this.setIds, kind);
            if (!id) {
                continue;
            }
            try {
                const obj = (await this.props.stateContext.getSocket().getObject(id)) as
                    | ioBroker.StateObject
                    | null
                    | undefined;
                metas[kind] = metaFromCommon(obj?.common, fallback);
            } catch {
                // A datapoint that cannot be read contributes nothing rather than failing the rest
            }
        }
        const merged = mergeRanges(SETPOINT_KINDS.map(kind => metas[kind]?.range ?? null));
        this.setState({ metas, range: merged ?? fallback });
    }

    private applySetpoint(kind: SetpointKind, state: ioBroker.State): void {
        // While a thumb is being dragged only that setpoint is held back, so the other one keeps
        // following the device. A gesture with no single target — the range slider — holds back both.
        if (this.state.dragging && (this.state.dragTarget === null || this.state.dragTarget === kind)) {
            return;
        }
        const val = state.val != null ? Number(state.val) : null;
        const value = val != null && !isNaN(val) ? val : null;
        if (value === this.setpointValue(kind)) {
            return;
        }
        if (kind === 'plain') {
            this.setState({ setTemp: value });
        } else if (kind === 'heating') {
            this.setState({ setHeating: value });
        } else {
            this.setState({ setCooling: value });
        }
    }

    onPlainSetChange = (_id: string, state: ioBroker.State): void => this.applySetpoint('plain', state);

    onHeatingSetChange = (_id: string, state: ioBroker.State): void => this.applySetpoint('heating', state);

    onCoolingSetChange = (_id: string, state: ioBroker.State): void => this.applySetpoint('cooling', state);

    onWorkingModeChange = (_id: string, state: ioBroker.State): void => {
        const workingMode = (state.val ?? null) as string | number | null;
        if (workingMode !== this.state.workingMode) {
            this.setState({ workingMode });
        }
    };

    onActualChange = (_id: string, state: ioBroker.State): void => {
        const val = state.val != null ? Number(state.val) : null;
        const actualTemp = val != null && !isNaN(val) ? val : null;
        if (actualTemp !== this.state.actualTemp) {
            this.setState({ actualTemp });
        }
    };

    onHumidityChange = (_id: string, state: ioBroker.State): void => {
        const val = state.val != null ? Number(state.val) : null;
        const humidity = val != null && !isNaN(val) ? val : null;
        if (humidity !== this.state.humidity) {
            this.setState({ humidity });
        }
    };

    onBoostChange = (_id: string, state: ioBroker.State): void => {
        const boost = !!state.val;
        if (boost !== this.state.boost) {
            this.setState({ boost });
        }
    };

    onPowerChange = (_id: string, state: ioBroker.State): void => {
        const power = !!state.val;
        if (power !== this.state.power) {
            this.setState({ power });
        }
    };

    onPartyChange = (_id: string, state: ioBroker.State): void => {
        const party = !!state.val;
        if (party !== this.state.party) {
            this.setState({ party });
        }
    };

    private togglePower = (): void => {
        if (this.powerId) {
            const newVal = !this.state.power;
            void this.setValue(this.powerId, newVal);
            this.setState({ power: newVal });
        }
    };

    private toggleParty = (): void => {
        if (this.partyId) {
            const newVal = !this.state.party;
            void this.setValue(this.partyId, newVal);
            this.setState({ party: newVal });
        }
    };

    onModeChange = (_id: string, state: ioBroker.State): void => {
        const mode = (state.val ?? null) as string | number | null;
        if (mode !== this.state.mode) {
            this.setState({ mode });
        }
    };

    private setMode = (value: string | number): void => {
        if (this.modeId) {
            void this.setValue(this.modeId, value);
            this.setState({ mode: value });
        }
    };

    /** Metadata for well-known HVAC mode labels (matched case-insensitively). */
    private static readonly MODE_MAP: Record<string, { color: string; i18nKey: string }> = {
        auto: { color: '#9c27b0', i18nKey: 'wm_mode_auto' },
        cool: { color: '#2196f3', i18nKey: 'wm_mode_cool' },
        dry: { color: '#00bcd4', i18nKey: 'wm_mode_dry' },
        eco: { color: '#4caf50', i18nKey: 'wm_mode_eco' },
        fan_only: { color: '#03a9f4', i18nKey: 'wm_mode_fan_only' },
        heat: { color: '#ff5722', i18nKey: 'wm_mode_heat' },
        off: { color: '#9e9e9e', i18nKey: 'wm_mode_off' },
        idle: { color: '#9e9e9e', i18nKey: 'wm_mode_idle' },
        manual: { color: '#607d8b', i18nKey: 'wm_mode_manual' },
        boost: { color: '#f44336', i18nKey: 'wm_mode_boost' },
        party: { color: '#ff9800', i18nKey: 'wm_mode_party' },
    };

    private static getModeInfo(label: string): { color: string; displayName: string } {
        const key = label.toLowerCase().trim();
        const meta = WidgetThermostat.MODE_MAP[key];
        if (meta) {
            return { color: meta.color, displayName: I18n.t(meta.i18nKey) };
        }
        return { color: '#9e9e9e', displayName: label };
    }

    private static renderModeIcon(label: string, fontSize: number, color?: string): React.JSX.Element {
        const key = label.toLowerCase().trim();
        const sx = { fontSize, color: color || WidgetThermostat.getModeInfo(label).color };
        switch (key) {
            case 'auto':
                return <AutoMode sx={sx} />;
            case 'cool':
                return <AcUnit sx={sx} />;
            case 'dry':
                return <Air sx={sx} />;
            case 'eco':
                return <EnergySavingsLeaf sx={sx} />;
            case 'fan_only':
                return <Air sx={sx} />;
            case 'heat':
                return <Whatshot sx={sx} />;
            case 'off':
                return <PowerSettingsNew sx={sx} />;
            case 'idle':
                return <PauseCircleOutlined sx={sx} />;
            case 'manual':
                return <Tune sx={sx} />;
            case 'boost':
                return <LocalFireDepartment sx={sx} />;
            case 'party':
                return <Celebration sx={sx} />;
            default:
                return <Tune sx={sx} />;
        }
    }

    /** Get the label string for the current mode value */
    private getCurrentModeLabel(): string | null {
        const { mode, modeStates } = this.state;
        if (mode == null) {
            return null;
        }
        return modeStates[String(mode)] || null;
    }

    /** True when a power mechanism exists AND the device is powered off */
    private isPoweredOff(): boolean {
        // Explicit POWER state
        if (this.powerId && this.state.power === false) {
            return true;
        }
        // MODE set to "OFF"
        const modeLabel = this.getCurrentModeLabel();

        return !!(this.modeId && modeLabel && modeLabel.toLowerCase().trim() === 'off');
    }

    /** The setpoint a heating/cooling thumb may not cross */
    private otherSetpoint(kind: 'heating' | 'cooling'): number | null {
        return kind === 'heating' ? this.state.setCooling : this.state.setHeating;
    }

    /**
     * True once the heating/cooling pair can be edited as a pair.
     *
     * A range slider needs two values. Until the device has reported both, the second thumb would sit
     * at a limit the device never mentioned, so the pair is edited one setpoint at a time instead.
     */
    private get isPairEditable(): boolean {
        return this.dual && this.state.setHeating != null && this.state.setCooling != null;
    }

    /**
     * The setpoint the single-value controls act on.
     *
     * That is the device's one setpoint, or — while a pair is still missing a value — the half of the
     * pair that can be set. Heating leads when neither has reported yet.
     */
    private get dialKind(): SetpointKind | null {
        if (!this.dual) {
            return this.singleKind;
        }
        if (this.isPairEditable) {
            return null;
        }
        return this.state.setCooling != null && this.state.setHeating == null ? 'cooling' : 'heating';
    }

    /** True when this setpoint cannot be written — by permission, or because the datapoint says so */
    private isSetpointReadOnly(kind: SetpointKind): boolean {
        return this.isReadOnly || !!this.state.metas[kind]?.readOnly;
    }

    /** True when no setpoint the dial carries can be written, so the dial must not respond to a drag */
    private get isDialReadOnly(): boolean {
        if (this.isReadOnly) {
            return true;
        }
        const carried: SetpointKind[] = this.dual ? ['heating', 'cooling'] : this.singleKind ? [this.singleKind] : [];
        return carried.length > 0 && carried.every(kind => !!this.state.metas[kind]?.readOnly);
    }

    private sendSetpoint(kind: SetpointKind, value: number): void {
        const id = setpointId(this.setIds, kind);
        if (id && !this.isSetpointReadOnly(kind)) {
            void this.setValue(id, clampForWrite(this.state.metas, kind, value, this.state.range));
        }
    }

    /** Show a setpoint immediately, keeping a heating/cooling pair from crossing */
    private showSetpoint(kind: SetpointKind, value: number): void {
        if (kind === 'plain') {
            this.setState({ setTemp: value });
        } else if (kind === 'heating') {
            this.setState({ setHeating: clampAgainstOther('heating', value, this.state.setCooling) });
        } else {
            this.setState({ setCooling: clampAgainstOther('cooling', value, this.state.setHeating) });
        }
    }

    private adjustTemp = (delta: number): void => {
        const kind = this.dialKind;
        if (!kind) {
            return;
        }
        const current = this.setpointValue(kind) ?? this.state.range.min;
        const next = clampToRange(current + delta, this.state.range);
        this.sendSetpoint(kind, next);
        this.showSetpoint(kind, next);
    };

    private pointerToSetpoint(e: React.PointerEvent): number | null {
        const fraction = pointerToFraction(this.arcRef.current, e.clientX, e.clientY);
        return fraction == null ? null : fractionToValue(fraction, this.state.range);
    }

    /** Pointer that owns the running drag, so a second finger cannot take over its thumb */
    private dragPointerId: number | null = null;

    private onArcPointerDown = (e: React.PointerEvent): void => {
        // A second finger must not steal the thumb the first one is holding. An id left behind by a
        // gesture that never ended is stale, so it does not lock the dial.
        if (this.isDialReadOnly || (this.dragPointerId !== null && this.state.dragging)) {
            return;
        }
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        const value = this.pointerToSetpoint(e);
        if (value == null) {
            return;
        }
        const target = this.dual
            ? pickDragTarget(value, this.state.setHeating, this.state.setCooling)
            : this.singleKind;
        if (!target) {
            return;
        }
        this.dragPointerId = e.pointerId;
        this.setState({ dragging: true, dragTarget: target });
        this.showSetpoint(target, value);
    };

    private onArcPointerMove = (e: React.PointerEvent): void => {
        const kind = this.state.dragTarget;
        if (!this.state.dragging || !kind || e.pointerId !== this.dragPointerId) {
            return;
        }
        const value = this.pointerToSetpoint(e);
        if (value != null) {
            this.showSetpoint(kind, value);
        }
    };

    private onArcPointerUp = (e: React.PointerEvent): void => {
        const kind = this.state.dragTarget;
        if (!this.state.dragging || !kind || e.pointerId !== this.dragPointerId) {
            return;
        }
        this.dragPointerId = null;
        const pointed = this.pointerToSetpoint(e);
        const value =
            pointed == null
                ? this.setpointValue(kind)
                : kind === 'plain'
                  ? pointed
                  : clampAgainstOther(kind, pointed, this.otherSetpoint(kind));
        if (value != null) {
            this.sendSetpoint(kind, value);
            this.showSetpoint(kind, value);
        }
        this.setState({ dragging: false, dragTarget: null });
    };

    protected getHistoryIds(): { id: string; color: string }[] {
        const ids: { id: string; color: string }[] = [];
        if (this.actualId) {
            ids.push({ id: this.actualId, color: '#ff9800' });
        }
        if (this.setIds.plain) {
            // Red is the heating setpoint's colour wherever the device has one
            ids.push({ id: this.setIds.plain, color: this.setIds.heating ? '#9c27b0' : '#f44336' });
        }
        if (this.setIds.heating) {
            ids.push({ id: this.setIds.heating, color: HEATING_COLOR });
        }
        if (this.setIds.cooling) {
            ids.push({ id: this.setIds.cooling, color: COOLING_COLOR });
        }
        if (this.humidityId) {
            ids.push({ id: this.humidityId, color: '#2196f3' });
        }
        return ids;
    }

    private static getTempColor(t: number | null): string {
        if (t == null) {
            return 'text.disabled';
        }
        if (t < 10) {
            return '#2196f3';
        }
        if (t < 20) {
            return '#4caf50';
        }
        if (t < 26) {
            return '#ff9800';
        }
        return '#f44336';
    }

    static formatTemp(t: number | null, isFloatComma?: boolean): string {
        if (t == null) {
            return '—';
        }
        return `${formatFloat(t, 1, isFloatComma)}°`;
    }

    /** Which thumb the device is not working towards, so the other one can be emphasised */
    private get dimmedThumb(): 'heating' | 'cooling' | null {
        if (!this.dual) {
            return null;
        }
        const label = this.state.workingModeStates[String(this.state.workingMode)]?.toLowerCase().trim();
        if (label === 'heat') {
            return 'cooling';
        }
        if (label === 'cool') {
            return 'heating';
        }
        return null;
    }

    private get hasSetpoint(): boolean {
        return this.dual
            ? this.state.setHeating != null || this.state.setCooling != null
            : this.displaySetpoint != null;
    }

    /**
     * The setpoints as one line: a single value, or the heating/cooling pair in their own colours.
     *
     * @param variant Typography variant of the surrounding row
     * @param sx Styling of the single-setpoint text, which each layout sizes differently
     * @param arrow Whether the single value keeps the arrow that distinguishes it from the actual one
     * @returns The readout
     */
    private renderSetpointText(
        variant: 'caption' | 'body2' | 'h6' | 'h5',
        sx?: SxProps<Theme>,
        arrow = true,
    ): React.JSX.Element {
        const isFloatComma = this.props.stateContext.isFloatComma;
        if (!this.dual) {
            return (
                <Tooltip title={I18n.t('wm_Set temperature')}>
                    <Typography
                        variant={variant}
                        sx={sx}
                    >
                        {arrow ? '→ ' : ''}
                        {WidgetThermostat.formatTemp(this.displaySetpoint, isFloatComma)}
                    </Typography>
                </Tooltip>
            );
        }
        const dimmed = this.dimmedThumb;
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, whiteSpace: 'nowrap' }}>
                <Tooltip title={I18n.t('wm_Heating setpoint')}>
                    <Typography
                        variant={variant}
                        sx={{ fontWeight: 700, color: HEATING_COLOR, opacity: dimmed === 'heating' ? 0.5 : 1 }}
                    >
                        {WidgetThermostat.formatTemp(this.state.setHeating, isFloatComma)}
                    </Typography>
                </Tooltip>
                <Tooltip title={I18n.t('wm_Cooling setpoint')}>
                    <Typography
                        variant={variant}
                        sx={{ fontWeight: 700, color: COOLING_COLOR, opacity: dimmed === 'cooling' ? 0.5 : 1 }}
                    >
                        {WidgetThermostat.formatTemp(this.state.setCooling, isFloatComma)}
                    </Typography>
                </Tooltip>
            </Box>
        );
    }

    protected isTileActive(): boolean {
        return (
            this.state.setTemp != null ||
            this.state.setHeating != null ||
            this.state.setCooling != null ||
            this.state.actualTemp != null
        );
    }

    // eslint-disable-next-line class-methods-use-this
    protected hasTileAction(): boolean {
        return true;
    }

    protected onTileClick(): void {
        this.setState({ dialogOpen: true });
    }

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = super.renderTileIcon();
        if (baseIcon) {
            return baseIcon;
        }

        const displayTemp = this.displayTemp;

        return (
            <Thermostat
                sx={{
                    color: WidgetThermostat.getTempColor(displayTemp),
                    transition: 'color 0.25s ease',
                }}
            />
        );
    }

    protected renderTileStatus(): React.JSX.Element | null {
        // Every layout but the 1x1 shows the same content through renderTileAction — rendering it
        // here as well printed it twice on one tile.
        const size = this.props.settings?.size || '1x1';
        if (size !== '1x1') {
            return null;
        }

        const { actualTemp, humidity, boost, power, party } = this.state;
        const modeLabel = this.getCurrentModeLabel();

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {actualTemp != null ? (
                        <Tooltip title={I18n.t('wm_Actual temperature')}>
                            <Typography
                                variant="caption"
                                sx={{ fontWeight: 600, fontSize: '1.1rem', lineHeight: 1.2, color: 'text.primary' }}
                            >
                                {WidgetThermostat.formatTemp(actualTemp, this.props.stateContext.isFloatComma)}
                            </Typography>
                        </Tooltip>
                    ) : null}
                    {this.hasSetpoint
                        ? this.renderSetpointText('caption', { fontWeight: 500, color: 'text.secondary' })
                        : null}
                    {boost ? <LocalFireDepartment sx={{ fontSize: 14, color: '#f44336' }} /> : null}
                    {power === false ? (
                        <Tooltip title={I18n.t('wm_On/Off')}>
                            <PowerSettingsNew sx={{ fontSize: 14, color: 'text.disabled' }} />
                        </Tooltip>
                    ) : null}
                    {party ? (
                        <Tooltip title={I18n.t('wm_Party')}>
                            <Celebration sx={{ fontSize: 14, color: '#ff9800' }} />
                        </Tooltip>
                    ) : null}
                    {modeLabel ? (
                        <Tooltip title={WidgetThermostat.getModeInfo(modeLabel).displayName}>
                            {WidgetThermostat.renderModeIcon(modeLabel, 14)}
                        </Tooltip>
                    ) : null}
                </Box>
                {humidity != null ? (
                    <Typography
                        variant="caption"
                        sx={{
                            fontWeight: 500,
                            color: 'text.secondary',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                        }}
                    >
                        <WaterDrop sx={{ fontSize: 12 }} />
                        {Math.round(humidity)}%
                    </Typography>
                ) : null}
            </Box>
        );
    }

    protected renderTileAction(): React.JSX.Element | null {
        const { actualTemp, humidity, boost, power, party } = this.state;
        const modeLabel = this.getCurrentModeLabel();

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {actualTemp != null ? (
                        <Tooltip title={I18n.t('wm_Actual temperature')}>
                            <Typography
                                variant="body2"
                                sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}
                            >
                                {WidgetThermostat.formatTemp(actualTemp, this.props.stateContext.isFloatComma)}
                            </Typography>
                        </Tooltip>
                    ) : null}
                    {this.renderSetpointText('h6', { fontWeight: 700, whiteSpace: 'nowrap' })}
                    {boost ? <LocalFireDepartment sx={{ fontSize: 18, color: '#f44336' }} /> : null}
                    {power === false ? (
                        <Tooltip title={I18n.t('wm_On/Off')}>
                            <PowerSettingsNew sx={{ fontSize: 18, color: 'text.disabled' }} />
                        </Tooltip>
                    ) : null}
                    {party ? (
                        <Tooltip title={I18n.t('wm_Party')}>
                            <Celebration sx={{ fontSize: 18, color: '#ff9800' }} />
                        </Tooltip>
                    ) : null}
                    {modeLabel ? (
                        <Tooltip title={WidgetThermostat.getModeInfo(modeLabel).displayName}>
                            {WidgetThermostat.renderModeIcon(modeLabel, 18)}
                        </Tooltip>
                    ) : null}
                </Box>
                {humidity != null ? (
                    <Typography
                        variant="body2"
                        sx={{
                            color: 'text.secondary',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <WaterDrop sx={{ fontSize: 14 }} />
                        {Math.round(humidity)}%
                    </Typography>
                ) : null}
            </Box>
        );
    }

    /** What the device reports it is doing, as a label from its own state list */
    private getWorkingModeLabel(): string | null {
        const { workingMode, workingModeStates } = this.state;
        if (workingMode == null) {
            return null;
        }
        return workingModeStates[String(workingMode)] || null;
    }

    private static readonly SETPOINT_LABELS: Record<SetpointKind, string> = {
        plain: 'wm_Set temperature',
        heating: 'wm_Heating setpoint',
        cooling: 'wm_Cooling setpoint',
    };

    /**
     * Commit the setpoint the user typed.
     *
     * No optimistic update: the subscription reports what the device accepted, and a rejected write
     * would otherwise leave the field showing a value the device never took.
     */
    private commitSetDraft(): void {
        const draft = this.state.setDraft;
        if (!draft) {
            return;
        }
        const value = Number(draft.text.replace(',', '.'));
        this.setState({ setDraft: null });
        if (draft.text.trim() === '' || isNaN(value)) {
            return;
        }
        this.sendSetpoint(draft.kind, value);
    }

    /**
     * A field per setpoint the dial cannot carry.
     *
     * The dial takes one thumb, or the heating/cooling pair; a device that declares more than that —
     * all three, or `SET` beside just one of the pair — would otherwise have a setpoint that is
     * detected and impossible to set.
     *
     * @returns One row per off-dial setpoint, or null when the dial covers everything
     */
    private renderOffDialSetpointRows(): React.JSX.Element[] | null {
        const kinds = offDialSetpointKinds(this.setIds, this.dual, this.singleKind);
        if (!kinds.length) {
            return null;
        }
        const { setDraft, metas, range } = this.state;
        return kinds.map(kind => {
            const own = metas[kind]?.range ?? range;
            const value = this.setpointValue(kind);
            return (
                <Box
                    key={kind}
                    sx={theme => ({
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2,
                        py: 0.75,
                        px: 1,
                        mx: -1,
                        borderBottom: '1px solid',
                        borderColor: theme.palette.divider,
                    })}
                >
                    <Typography variant="body2">{I18n.t(WidgetThermostat.SETPOINT_LABELS[kind])}</Typography>
                    <TextField
                        variant="standard"
                        type="number"
                        size="small"
                        disabled={this.isSetpointReadOnly(kind)}
                        value={setDraft?.kind === kind ? setDraft.text : (value ?? '')}
                        onChange={e => this.setState({ setDraft: { kind, text: e.target.value } })}
                        onBlur={() => this.commitSetDraft()}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                this.commitSetDraft();
                            }
                        }}
                        slotProps={{
                            htmlInput: {
                                min: own.min,
                                max: own.max,
                                step: own.step,
                                style: { textAlign: 'right', width: 80 },
                            },
                        }}
                    />
                </Box>
            );
        });
    }

    /**
     * The setpoint controls under the dial: a slider per thumb.
     *
     * @param dimmedSx Applied while the device is powered off
     * @returns A range slider for a heating/cooling pair, otherwise the stepped single slider
     */
    private renderSetpointControls(dimmedSx: Record<string, unknown>): React.JSX.Element | null {
        const { range } = this.state;
        if (this.isPairEditable) {
            return (
                <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, mb: 2, ...dimmedSx }}>
                        <Whatshot sx={{ color: HEATING_COLOR }} />
                        <Slider
                            disabled={this.isDialReadOnly}
                            value={this.sliderPair.value}
                            min={range.min}
                            max={range.max}
                            step={range.step}
                            disableSwap
                            onChange={(_e, value, activeThumb) => this.onRangeSliderChange(value, activeThumb)}
                            onChangeCommitted={(_e, value) => this.onRangeSliderCommit(value)}
                            sx={{
                                flex: 1,
                                color: COOLING_COLOR,
                                '& .MuiSlider-thumb:first-of-type': { color: HEATING_COLOR },
                            }}
                        />
                        <AcUnit sx={{ color: COOLING_COLOR }} />
                    </Box>
                    {this.renderOffDialSetpointRows()}
                </>
            );
        }
        const kind = this.dialKind;
        if (!kind) {
            return null;
        }
        const current = this.setpointValue(kind);
        return (
            <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, mb: 2, ...dimmedSx }}>
                    <IconButton
                        disabled={this.isDialReadOnly}
                        onClick={() => this.adjustTemp(-range.step)}
                        sx={theme => ({
                            border: `1px solid ${theme.palette.divider}`,
                        })}
                    >
                        <Remove />
                    </IconButton>
                    <Slider
                        disabled={this.isDialReadOnly}
                        value={current ?? range.min}
                        min={range.min}
                        max={range.max}
                        step={range.step}
                        onMouseDown={() => this.setState({ dragging: true })}
                        onTouchStart={() => this.setState({ dragging: true })}
                        onChange={(_e, value) => {
                            if (!Array.isArray(value)) {
                                this.showSetpoint(kind, value);
                            }
                        }}
                        onChangeCommitted={(_e, value) => {
                            if (!Array.isArray(value)) {
                                this.sendSetpoint(kind, value);
                            }
                            this.setState({ dragging: false });
                        }}
                        sx={{
                            flex: 1,
                            color: WidgetThermostat.getTempColor(current),
                        }}
                    />
                    <IconButton
                        disabled={this.isDialReadOnly}
                        onClick={() => this.adjustTemp(range.step)}
                        sx={theme => ({
                            border: `1px solid ${theme.palette.divider}`,
                        })}
                    >
                        <Add />
                    </IconButton>
                </Box>
                {this.renderOffDialSetpointRows()}
            </>
        );
    }

    /**
     * Which thumbs the running range-slider interaction actually moved.
     *
     * Only these are written on commit. Comparing the committed pair against the values held when the
     * gesture began cannot work: the press itself already moves a thumb, and the keyboard path emits
     * no press at all — so a click on the rail would either write nothing or write both setpoints,
     * one of them a value the user never touched.
     */
    private movedThumbs = new Set<'heating' | 'cooling'>();

    /**
     * The pair as the slider must receive it, lowest first, with the mapping back to the setpoint each
     * thumb stands for.
     *
     * A device is free to report a heating setpoint above its cooling one. MUI requires an ascending
     * array — a descending one gives a negative track and `disableSwap` then pins the lower thumb —
     * so the order is normalised for display and the reverse mapping keeps a write on its own
     * datapoint.
     *
     * @returns The ascending pair, and the setpoint each thumb index belongs to
     */
    private get sliderPair(): { value: number[]; kindAt: (index: number) => 'heating' | 'cooling' } {
        const { setHeating, setCooling, range } = this.state;
        const heating = setHeating ?? range.min;
        const cooling = setCooling ?? range.max;
        const crossed = heating > cooling;
        return {
            value: crossed ? [cooling, heating] : [heating, cooling],
            kindAt: index => (crossed ? (index === 0 ? 'cooling' : 'heating') : index === 0 ? 'heating' : 'cooling'),
        };
    }

    private onRangeSliderChange = (value: number | number[], activeThumb: number): void => {
        if (!Array.isArray(value)) {
            return;
        }
        const { kindAt } = this.sliderPair;
        const moved = kindAt(activeThumb);
        this.movedThumbs.add(moved);
        // dragTarget stays null: with the pair on one control both echoes are held back at once
        this.setState({
            dragging: true,
            dragTarget: null,
            setHeating: value[kindAt(0) === 'heating' ? 0 : 1],
            setCooling: value[kindAt(0) === 'cooling' ? 0 : 1],
        });
    };

    private onRangeSliderCommit = (value: number | number[]): void => {
        const moved = this.movedThumbs;
        this.movedThumbs = new Set();
        this.setState({ dragging: false, dragTarget: null });
        if (!Array.isArray(value)) {
            return;
        }
        const { kindAt } = this.sliderPair;
        for (const [index, v] of value.entries()) {
            const kind = kindAt(index);
            if (moved.has(kind)) {
                this.sendSetpoint(kind, v);
            }
        }
    };

    private renderDialog(): React.JSX.Element | null {
        if (!this.state.dialogOpen) {
            return null;
        }

        const {
            name,
            setHeating,
            setCooling,
            actualTemp,
            humidity,
            boost,
            power,
            party,
            mode,
            modeStates,
            range,
            dragging,
        } = this.state;
        const displayTemp = this.displayTemp;
        const modeEntries = Object.entries(modeStates);
        const currentModeLabel = mode != null ? modeStates[String(mode)] || null : null;
        const workingModeLabel = this.getWorkingModeLabel();
        const poweredOff = this.isPoweredOff();
        const dimmedSx = poweredOff ? { opacity: 0.5, transition: 'opacity 0.25s ease' } : {};

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

                    {/* Title */}
                    <Typography
                        variant="h6"
                        sx={{ fontWeight: 600, mb: 2, pr: 4 }}
                    >
                        {this.props.settings?.name || name || '...'}
                    </Typography>

                    {/* Arc + set temp */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2, ...dimmedSx }}>
                        <Box
                            ref={this.arcRef}
                            onPointerDown={this.onArcPointerDown}
                            onPointerMove={this.onArcPointerMove}
                            onPointerUp={this.onArcPointerUp}
                            onPointerCancel={this.onArcPointerUp}
                            sx={{
                                position: 'relative',
                                width: 200,
                                height: 200,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                touchAction: 'none',
                                userSelect: 'none',
                            }}
                        >
                            <ClimateArc
                                range={range}
                                value={this.displaySetpoint}
                                heating={this.dual ? setHeating : null}
                                cooling={this.dual ? setCooling : null}
                                progressStroke={WidgetThermostat.getTempColor(displayTemp)}
                                dragging={dragging}
                                dimmedThumb={this.dimmedThumb}
                                style={{ width: '100%', height: '100%' }}
                            />
                            <Box
                                sx={{
                                    position: 'absolute',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 0.5,
                                }}
                            >
                                {this.dual ? (
                                    this.renderSetpointText('h5')
                                ) : (
                                    <Typography
                                        variant="h3"
                                        sx={{ fontWeight: 700, lineHeight: 1 }}
                                    >
                                        {WidgetThermostat.formatTemp(
                                            this.displaySetpoint,
                                            this.props.stateContext.isFloatComma,
                                        )}
                                    </Typography>
                                )}
                                {actualTemp != null && this.hasSetpoint ? (
                                    <Typography
                                        variant="body2"
                                        sx={{ color: 'text.secondary' }}
                                    >
                                        {I18n.t('wm_Actual')}:{' '}
                                        {WidgetThermostat.formatTemp(actualTemp, this.props.stateContext.isFloatComma)}
                                    </Typography>
                                ) : null}
                            </Box>
                        </Box>
                    </Box>

                    {this.renderSetpointControls(dimmedSx)}

                    {/* Info row: humidity + boost + requested mode + what the device reports doing */}
                    {humidity != null || boost || currentModeLabel || workingModeLabel ? (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                justifyContent: 'center',
                                mb: this.powerId || this.partyId || modeEntries.length > 0 ? 2 : 0,
                                ...dimmedSx,
                            }}
                        >
                            {humidity != null ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <WaterDrop sx={{ fontSize: 20, color: 'text.secondary' }} />
                                    <Typography
                                        variant="body1"
                                        sx={{ color: 'text.secondary' }}
                                    >
                                        {Math.round(humidity)}%
                                    </Typography>
                                </Box>
                            ) : null}
                            {boost ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <LocalFireDepartment sx={{ fontSize: 20, color: '#f44336' }} />
                                    <Typography
                                        variant="body1"
                                        sx={{ color: '#f44336' }}
                                    >
                                        Boost
                                    </Typography>
                                </Box>
                            ) : null}
                            {currentModeLabel ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {WidgetThermostat.renderModeIcon(currentModeLabel, 20)}
                                    <Typography
                                        variant="body1"
                                        sx={{ color: WidgetThermostat.getModeInfo(currentModeLabel).color }}
                                    >
                                        {WidgetThermostat.getModeInfo(currentModeLabel).displayName}
                                    </Typography>
                                </Box>
                            ) : null}
                            {workingModeLabel ? (
                                <Tooltip title={I18n.t('wm_Working mode')}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        {WidgetThermostat.renderModeIcon(workingModeLabel, 18)}
                                        <Typography
                                            variant="body2"
                                            sx={{ color: 'text.secondary' }}
                                        >
                                            {WidgetThermostat.getModeInfo(workingModeLabel).displayName}
                                        </Typography>
                                    </Box>
                                </Tooltip>
                            ) : null}
                        </Box>
                    ) : null}

                    {/* Power + Party toggles */}
                    {this.powerId || this.partyId ? (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                justifyContent: 'center',
                                mb: modeEntries.length > 0 ? 2 : 0,
                            }}
                        >
                            {this.powerId ? (
                                <Button
                                    variant={power ? 'contained' : 'outlined'}
                                    color={power ? 'success' : 'inherit'}
                                    startIcon={<PowerSettingsNew />}
                                    onClick={this.togglePower}
                                    size="small"
                                    sx={{ textTransform: 'none', borderRadius: '20px' }}
                                >
                                    {I18n.t('wm_On/Off')}
                                </Button>
                            ) : null}
                            {this.partyId ? (
                                <Button
                                    variant={party ? 'contained' : 'outlined'}
                                    color={party ? 'warning' : 'inherit'}
                                    startIcon={<Celebration />}
                                    onClick={this.toggleParty}
                                    size="small"
                                    sx={{ textTransform: 'none', borderRadius: '20px' }}
                                >
                                    {I18n.t('wm_Party')}
                                </Button>
                            ) : null}
                        </Box>
                    ) : null}

                    {/* Mode selector */}
                    {modeEntries.length > 0 ? (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.75,
                                justifyContent: 'center',
                                flexWrap: 'wrap',
                                ...dimmedSx,
                            }}
                        >
                            {modeEntries.map(([key, label]) => {
                                const value = stateKeyToValue(key);
                                const isActive = mode != null && String(mode) === key;
                                const info = WidgetThermostat.getModeInfo(label);
                                return (
                                    <Button
                                        key={key}
                                        variant={isActive ? 'contained' : 'outlined'}
                                        color="inherit"
                                        startIcon={WidgetThermostat.renderModeIcon(
                                            label,
                                            18,
                                            isActive ? '#fff' : info.color,
                                        )}
                                        onClick={() => this.setMode(value)}
                                        size="small"
                                        sx={{
                                            textTransform: 'none',
                                            borderRadius: '20px',
                                            minWidth: 0,
                                            px: 1.5,
                                            ...(isActive
                                                ? {
                                                      backgroundColor: info.color,
                                                      color: '#fff',
                                                      '&:hover': { backgroundColor: info.color, opacity: 0.9 },
                                                  }
                                                : {}),
                                        }}
                                    >
                                        {info.displayName}
                                    </Button>
                                );
                            })}
                        </Box>
                    ) : null}
                </DialogContent>
            </Dialog>
        );
    }

    renderCompact(): React.JSX.Element {
        const { name, setHeating, setCooling, actualTemp, boost, power, party, range, dragging } = this.state;
        const modeLabel = this.getCurrentModeLabel();
        const isActive = this.isTileActive();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(null, settingsButton);
        const displayTemp = this.displayTemp;
        const poweredOff = this.isPoweredOff();
        const tempColor = WidgetThermostat.getTempColor(displayTemp);

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={theme => WidgetGeneric.getStyleCompact(theme)}
            >
                <ButtonBase
                    component="div"
                    onClick={() => this.onTileClick()}
                    sx={theme => {
                        const neumorphic = isNeumorphicTheme(theme);
                        return {
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            alignItems: 'stretch',
                            width: '100%',
                            aspectRatio: '1',
                            textAlign: 'left',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            ...this.applyTileStyles(theme, isActive && !poweredOff),
                            padding: neumorphic ? 'max(12px, 8cqi)' : 'max(16px, 10cqi)',
                        };
                    }}
                >
                    {indicators}

                    <Box
                        sx={theme => {
                            const neumorphic = isNeumorphicTheme(theme);
                            return {
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                flex: 1,
                                ...(neumorphic
                                    ? {
                                          // Dark inner circle behind the arc for depth
                                          '&::before': {
                                              content: '""',
                                              position: 'absolute',
                                              width: '55%',
                                              aspectRatio: '1',
                                              borderRadius: '50%',
                                              background: 'radial-gradient(circle, #151517 0%, #1a1a1c 100%)',
                                              boxShadow:
                                                  'inset 3px 3px 8px rgba(0,0,0,0.6), inset -2px -2px 6px rgba(255,255,255,0.03)',
                                          },
                                      }
                                    : {}),
                            };
                        }}
                    >
                        <ClimateArc
                            range={range}
                            value={this.displaySetpoint}
                            heating={this.dual ? setHeating : null}
                            cooling={this.dual ? setCooling : null}
                            progressStroke={isActive ? `url(#arcGrad_${this.props.widget.id})` : undefined}
                            progressFilter={isActive ? `url(#arcGlow_${this.props.widget.id})` : undefined}
                            dragging={dragging}
                            dimmedThumb={this.dimmedThumb}
                            style={{ width: '60%', aspectRatio: '1' }}
                            defs={
                                <>
                                    <linearGradient
                                        id={`arcGrad_${this.props.widget.id}`}
                                        x1="0%"
                                        y1="0%"
                                        x2="100%"
                                        y2="100%"
                                    >
                                        <stop
                                            offset="0%"
                                            stopColor={tempColor}
                                            stopOpacity="1"
                                        />
                                        <stop
                                            offset="100%"
                                            stopColor={tempColor}
                                            stopOpacity="0.6"
                                        />
                                    </linearGradient>
                                    <filter id={`arcGlow_${this.props.widget.id}`}>
                                        <feGaussianBlur
                                            stdDeviation="2.5"
                                            result="blur"
                                        />
                                        <feMerge>
                                            <feMergeNode in="blur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                </>
                            }
                        />
                        <Box
                            sx={{
                                position: 'absolute',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                zIndex: 1,
                            }}
                        >
                            {this.renderTileIcon()}
                            {this.hasSetpoint
                                ? this.renderSetpointText(
                                      'caption',
                                      theme => ({
                                          fontWeight: 700,
                                          fontSize: isNeumorphicTheme(theme)
                                              ? 'max(0.9rem, 9cqi)'
                                              : 'max(0.75rem, 7cqi)',
                                          lineHeight: 1,
                                          ...(isNeumorphicTheme(theme)
                                              ? { color: tempColor, textShadow: `0 0 12px ${tempColor}40` }
                                              : {}),
                                      }),
                                      false,
                                  )
                                : null}
                        </Box>
                    </Box>

                    {/* Name + info */}
                    <Box sx={{ textAlign: 'center', minWidth: 0 }}>
                        <Typography
                            ref={this.nameRef}
                            variant="body2"
                            sx={theme => ({
                                fontWeight: 600,
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                fontSize: 'max(0.75rem, 8cqi)',
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
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            {actualTemp != null && this.hasSetpoint ? (
                                <Tooltip title={I18n.t('wm_Actual temperature')}>
                                    <Typography
                                        variant="caption"
                                        sx={{ color: 'text.secondary', fontSize: 'max(0.6rem, 6cqi)' }}
                                    >
                                        {WidgetThermostat.formatTemp(actualTemp, this.props.stateContext.isFloatComma)}
                                    </Typography>
                                </Tooltip>
                            ) : null}
                            {boost ? (
                                <LocalFireDepartment sx={{ fontSize: 'max(12px, 7cqi)', color: '#f44336' }} />
                            ) : null}
                            {power === false ? (
                                <PowerSettingsNew sx={{ fontSize: 'max(12px, 7cqi)', color: 'text.disabled' }} />
                            ) : null}
                            {party ? <Celebration sx={{ fontSize: 'max(12px, 7cqi)', color: '#ff9800' }} /> : null}
                            {modeLabel ? WidgetThermostat.renderModeIcon(modeLabel, 14) : null}
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>{this.renderMinMax()}</Box>
                    </Box>
                    {this.renderChart()}
                </ButtonBase>

                {this.renderDialog()}
            </Box>
        );
    }

    renderWideTall(): React.JSX.Element {
        const { name, actualTemp, humidity, boost, power, party } = this.state;
        const modeLabel = this.getCurrentModeLabel();
        const isActive = this.isTileActive();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        const poweredOff = this.isPoweredOff();

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
                    onClick={() => this.onTileClick()}
                    sx={theme => ({
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                        textAlign: 'left',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        ...this.applyTileStyles(theme, isActive && !poweredOff),
                        padding: 'max(16px, 5cqi)',
                    })}
                >
                    {indicators}

                    {/* Name — full width on its own line */}
                    <Typography
                        ref={this.nameRef}
                        variant="body2"
                        sx={{
                            fontWeight: 600,
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            fontSize: 'max(0.875rem, 4.5cqi)',
                            whiteSpace: 'nowrap',
                            mb: 0.5,
                        }}
                    >
                        {this.props.settings?.name || name || '...'}
                    </Typography>

                    {/* Icon + info + set temp row */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                '& .MuiSvgIcon-root': { fontSize: 'max(48px, 16cqi) !important' },
                            }}
                        >
                            {this.renderTileIcon()}
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                {actualTemp != null ? (
                                    <Tooltip title={I18n.t('wm_Actual temperature')}>
                                        <Typography
                                            variant="body2"
                                            sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}
                                        >
                                            {WidgetThermostat.formatTemp(
                                                actualTemp,
                                                this.props.stateContext.isFloatComma,
                                            )}
                                        </Typography>
                                    </Tooltip>
                                ) : null}
                                {humidity != null ? (
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: 'text.secondary',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '2px',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        <WaterDrop sx={{ fontSize: 14 }} />
                                        {Math.round(humidity)}%
                                    </Typography>
                                ) : null}
                                {boost ? <LocalFireDepartment sx={{ fontSize: 16, color: '#f44336' }} /> : null}
                                {power === false ? (
                                    <PowerSettingsNew sx={{ fontSize: 16, color: 'text.disabled' }} />
                                ) : null}
                                {party ? <Celebration sx={{ fontSize: 16, color: '#ff9800' }} /> : null}
                                {modeLabel ? (
                                    <Tooltip title={WidgetThermostat.getModeInfo(modeLabel).displayName}>
                                        {WidgetThermostat.renderModeIcon(modeLabel, 16)}
                                    </Tooltip>
                                ) : null}
                            </Box>
                            {this.renderMinMax()}
                        </Box>

                        <Box sx={{ flexShrink: 0 }}>
                            {this.renderSetpointText('h5', { fontWeight: 700, whiteSpace: 'nowrap' })}
                        </Box>
                    </Box>

                    {this.renderChart()}
                </ButtonBase>

                {this.renderDialog()}
            </Box>
        );
    }
}

export default WidgetThermostat;
