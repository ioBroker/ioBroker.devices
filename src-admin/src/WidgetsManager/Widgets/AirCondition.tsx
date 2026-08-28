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
    AcUnit,
    Add,
    Air,
    AutoMode,
    Close,
    EnergySavingsLeaf,
    LocalFireDepartment,
    PauseCircleOutlined,
    PowerSettingsNew,
    Remove,
    SwapVert,
    SwapHoriz,
    Tune,
    Whatshot,
} from '@mui/icons-material';
import { I18n } from '@iobroker/gui-components';

import WidgetGeneric, {
    formatFloat,
    isNeumorphicTheme,
    toNumberOrNull,
    type WidgetGenericProps,
    type WidgetGenericState,
} from './Generic';
import ClimateArc from './ClimateArc';
import { parseCommonStates, stateKeyToValue } from './commonStates';
import {
    COOLING_COLOR,
    HEATING_COLOR,
    SETPOINT_KINDS,
    clampAgainstOther,
    clampForWrite,
    clampToRange,
    defaultRange,
    findSetpointIds,
    fractionToValue,
    isDualSetpoint,
    mergeRanges,
    metaFromCommon,
    offDialSetpointKinds,
    pickDragTarget,
    pointerToFraction,
    rangeFromCommon,
    setpointId,
    singleSetpointKind,
    type SetpointIds,
    type SetpointKind,
    type SetpointMetas,
    type SetpointRange,
} from './climate';

interface WidgetAirConditionState extends WidgetGenericState {
    setTemp: number | null;
    setHeating: number | null;
    setCooling: number | null;
    /** What the user has typed into one of the off-dial setpoint fields but not committed yet */
    setDraft: { kind: SetpointKind; text: string } | null;
    actualTemp: number | null;
    humidity: number | null;
    boost: boolean;
    power: boolean | null;
    mode: string | number | null;
    modeStates: Record<string, string>;
    workingMode: string | number | null;
    workingModeStates: Record<string, string>;
    speed: string | number | null;
    speedStates: Record<string, string>;
    /** Continuous fan level, beside the stepped `SPEED` list */
    speedLevel: number | null;
    speedLevelRange: SetpointRange;
    /** Unit the fan-level datapoint declares — the pattern only suggests percent */
    speedLevelUnit: string;
    swing: string | number | boolean | null;
    swingStates: Record<string, string>;
    swingIsBoolean: boolean;
    airflow: string | number | null;
    airflowStates: Record<string, string>;
    /** What each setpoint datapoint declares — its own limits, and whether it can be written */
    metas: SetpointMetas;
    /** The scale under the thumbs: every setpoint's range at once */
    range: SetpointRange;
    dragging: boolean;
    /** Setpoint the running gesture moves; picked on pointer-down and kept for the gesture */
    dragTarget: SetpointKind | null;
    dialogOpen: boolean;
}

export class WidgetAirCondition extends WidgetGeneric<WidgetAirConditionState> {
    private readonly setIds: SetpointIds;
    private readonly dual: boolean;
    /** The setpoint a single-thumb dial follows; null once the dial carries two */
    private readonly singleKind: SetpointKind | null;
    private readonly actualId: string | null;
    private readonly humidityId: string | null;
    private readonly boostId: string | null;
    private readonly powerId: string | null;
    private readonly modeId: string | null;
    private readonly workingModeId: string | null;
    private readonly speedId: string | null;
    private readonly speedLevelId: string | null;
    private readonly swingId: string | null;
    private readonly airflowId: string | null;
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
        this.modeId = states.find(s => s.name === 'MODE')?.id ?? null;
        this.workingModeId = states.find(s => s.name === 'WORKING_MODE' && s.id)?.id ?? null;
        this.speedId = states.find(s => s.name === 'SPEED')?.id ?? null;
        this.speedLevelId = states.find(s => s.name === 'SPEED_LEVEL' && s.id)?.id ?? null;
        this.swingId = states.find(s => s.name === 'SWING')?.id ?? null;
        this.airflowId = states.find(s => s.name === 'AIRFLOW_DIRECTION' && s.id)?.id ?? null;

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
            mode: null,
            modeStates: {},
            workingMode: null,
            workingModeStates: {},
            speed: null,
            speedStates: {},
            speedLevel: null,
            speedLevelRange: { min: 0, max: 100, step: 1 },
            speedLevelUnit: '%',
            swing: null,
            swingStates: {},
            swingIsBoolean: false,
            airflow: null,
            airflowStates: {},
            metas: {},
            range: defaultRange(16, 30),
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

    private get hasSetpoint(): boolean {
        return this.dual
            ? this.state.setHeating != null || this.state.setCooling != null
            : this.displaySetpoint != null;
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
            void this.loadStatesObject(this.workingModeId, 'workingModeStates');
        }
        if (this.speedLevelId) {
            this.props.stateContext.getState(this.speedLevelId, this.onSpeedLevelChange);
            void this.loadSpeedLevelRange();
        }
        if (this.airflowId) {
            this.props.stateContext.getState(this.airflowId, this.onAirflowChange);
            void this.loadStatesObject(this.airflowId, 'airflowStates');
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
        if (this.modeId) {
            this.props.stateContext.getState(this.modeId, this.onModeChange);
            void this.loadStatesObject(this.modeId, 'modeStates');
        }
        if (this.speedId) {
            this.props.stateContext.getState(this.speedId, this.onSpeedChange);
            void this.loadStatesObject(this.speedId, 'speedStates');
        }
        if (this.swingId) {
            this.props.stateContext.getState(this.swingId, this.onSwingChange);
            void this.loadSwingObject();
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
        if (this.speedLevelId) {
            this.props.stateContext.removeState(this.speedLevelId, this.onSpeedLevelChange);
        }
        if (this.airflowId) {
            this.props.stateContext.removeState(this.airflowId, this.onAirflowChange);
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
        if (this.modeId) {
            this.props.stateContext.removeState(this.modeId, this.onModeChange);
        }
        if (this.speedId) {
            this.props.stateContext.removeState(this.speedId, this.onSpeedChange);
        }
        if (this.swingId) {
            this.props.stateContext.removeState(this.swingId, this.onSwingChange);
        }
    }

    private async loadStatesObject(
        id: string,
        stateKey: 'modeStates' | 'speedStates' | 'workingModeStates' | 'airflowStates',
    ): Promise<void> {
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(id)) as
                ioBroker.StateObject | null | undefined;
            const parsed = parseCommonStates(obj?.common?.states);
            if (Object.keys(parsed).length) {
                if (stateKey === 'modeStates') {
                    this.setState({ modeStates: parsed });
                } else if (stateKey === 'speedStates') {
                    this.setState({ speedStates: parsed });
                } else if (stateKey === 'workingModeStates') {
                    this.setState({ workingModeStates: parsed });
                } else {
                    this.setState({ airflowStates: parsed });
                }
            }
        } catch {
            // ignore
        }
    }

    private async loadSpeedLevelRange(): Promise<void> {
        if (!this.speedLevelId) {
            return;
        }
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(this.speedLevelId)) as
                ioBroker.StateObject | null | undefined;
            const range = rangeFromCommon(obj?.common, this.state.speedLevelRange);
            if (range) {
                this.setState({ speedLevelRange: range });
            }
            // The pattern only suggests percent; a device is free to report rpm, and printing "%"
            // beside an rpm value would state something the device never said
            if (obj?.common?.unit) {
                this.setState({ speedLevelUnit: obj.common.unit });
            }
        } catch {
            // ignore
        }
    }

    private async loadSwingObject(): Promise<void> {
        if (!this.swingId) {
            return;
        }
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(this.swingId)) as
                ioBroker.StateObject | null | undefined;
            if (obj?.common) {
                const parsed = parseCommonStates(obj.common.states);
                // A boolean datapoint that ships its own two labels is still a list, not a switch
                const isBoolean = obj.common.type === 'boolean' && !Object.keys(parsed).length;
                this.setState({ swingIsBoolean: isBoolean });
                if (!isBoolean && Object.keys(parsed).length) {
                    this.setState({ swingStates: parsed });
                }
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
                    ioBroker.StateObject | null | undefined;
                metas[kind] = metaFromCommon(obj?.common, fallback);
            } catch {
                // A datapoint that cannot be read contributes nothing rather than failing the rest
            }
        }
        const merged = mergeRanges(SETPOINT_KINDS.map(kind => metas[kind]?.range ?? null));
        this.setState({ metas, range: merged ?? fallback });
    }

    // --- State change handlers ---

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

    private onPlainSetChange = (_id: string, state: ioBroker.State): void => this.applySetpoint('plain', state);

    private onHeatingSetChange = (_id: string, state: ioBroker.State): void => this.applySetpoint('heating', state);

    private onCoolingSetChange = (_id: string, state: ioBroker.State): void => this.applySetpoint('cooling', state);

    private onWorkingModeChange = (_id: string, state: ioBroker.State): void => {
        const workingMode = (state.val ?? null) as string | number | null;
        if (workingMode !== this.state.workingMode) {
            this.setState({ workingMode });
        }
    };

    private onSpeedLevelChange = (_id: string, state: ioBroker.State): void => {
        const speedLevel = toNumberOrNull(state.val);
        if (speedLevel !== this.state.speedLevel) {
            this.setState({ speedLevel });
        }
    };

    private onAirflowChange = (_id: string, state: ioBroker.State): void => {
        const airflow = (state.val ?? null) as string | number | null;
        if (airflow !== this.state.airflow) {
            this.setState({ airflow });
        }
    };

    private onActualChange = (_id: string, state: ioBroker.State): void => {
        const val = state.val != null ? Number(state.val) : null;
        const actualTemp = val != null && !isNaN(val) ? val : null;
        if (actualTemp !== this.state.actualTemp) {
            this.setState({ actualTemp });
        }
    };

    private onHumidityChange = (_id: string, state: ioBroker.State): void => {
        const val = state.val != null ? Number(state.val) : null;
        const humidity = val != null && !isNaN(val) ? val : null;
        if (humidity !== this.state.humidity) {
            this.setState({ humidity });
        }
    };

    private onBoostChange = (_id: string, state: ioBroker.State): void => {
        const boost = !!state.val;
        if (boost !== this.state.boost) {
            this.setState({ boost });
        }
    };

    private onPowerChange = (_id: string, state: ioBroker.State): void => {
        const power = !!state.val;
        if (power !== this.state.power) {
            this.setState({ power });
        }
    };

    /**
     * Keep the value as delivered instead of forcing it through `Number()`.
     *
     * A datapoint whose states are keyed by string (`'AUTO'`, `'COOL'`) became `NaN` and was
     * dropped, which is why the mode section could vanish completely (issue #654).
     */
    private onModeChange = (_id: string, state: ioBroker.State): void => {
        const mode = (state.val ?? null) as string | number | null;
        if (mode !== this.state.mode) {
            this.setState({ mode });
        }
    };

    private onSpeedChange = (_id: string, state: ioBroker.State): void => {
        const speed = (state.val ?? null) as string | number | null;
        if (speed !== this.state.speed) {
            this.setState({ speed });
        }
    };

    private onSwingChange = (_id: string, state: ioBroker.State): void => {
        const swing = state.val;
        if (swing !== this.state.swing) {
            this.setState({ swing: swing as number | boolean | null });
        }
    };

    // --- Actions ---

    private togglePower = (): void => {
        if (this.powerId) {
            const newVal = !this.state.power;
            void this.setValue(this.powerId, newVal);
            this.setState({ power: newVal });
        }
    };

    private toggleBoost = (): void => {
        if (this.boostId) {
            const newVal = !this.state.boost;
            void this.setValue(this.boostId, newVal);
            this.setState({ boost: newVal });
        }
    };

    private setMode = (value: string | number): void => {
        if (this.modeId) {
            void this.setValue(this.modeId, value);
            this.setState({ mode: value });
        }
    };

    private setSpeed = (value: string | number): void => {
        if (this.speedId) {
            void this.setValue(this.speedId, value);
            this.setState({ speed: value });
        }
    };

    private setSwing = (value: string | number | boolean): void => {
        if (this.swingId) {
            void this.setValue(this.swingId, value);
            this.setState({ swing: value });
        }
    };

    private setSpeedLevel = (value: number): void => {
        if (this.speedLevelId) {
            void this.setValue(this.speedLevelId, clampToRange(value, this.state.speedLevelRange));
        }
    };

    private setAirflow = (value: string | number): void => {
        if (this.airflowId) {
            void this.setValue(this.airflowId, value);
            this.setState({ airflow: value });
        }
    };

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

    // --- Arc drag ---

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

    // --- Mode helpers ---

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
    };

    private static getModeInfo(label: string): { color: string; displayName: string } {
        const key = label.toLowerCase().trim();
        const meta = WidgetAirCondition.MODE_MAP[key];
        if (meta) {
            return { color: meta.color, displayName: I18n.t(meta.i18nKey) };
        }
        return { color: '#9e9e9e', displayName: label };
    }

    private static renderModeIcon(label: string, fontSize: number, color?: string): React.JSX.Element {
        const key = label.toLowerCase().trim();
        const sx = { fontSize, color: color || WidgetAirCondition.getModeInfo(label).color };
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
            default:
                return <Tune sx={sx} />;
        }
    }

    // --- Speed helpers ---

    private static readonly SPEED_MAP: Record<string, { i18nKey: string }> = {
        auto: { i18nKey: 'wm_speed_auto' },
        high: { i18nKey: 'wm_speed_high' },
        low: { i18nKey: 'wm_speed_low' },
        medium: { i18nKey: 'wm_speed_medium' },
        quiet: { i18nKey: 'wm_speed_quiet' },
        turbo: { i18nKey: 'wm_speed_turbo' },
    };

    private static getSpeedLabel(label: string): string {
        const key = label.toLowerCase().trim();
        const meta = WidgetAirCondition.SPEED_MAP[key];
        return meta ? I18n.t(meta.i18nKey) : label;
    }

    // --- Swing helpers ---

    private static readonly SWING_MAP: Record<string, { i18nKey: string }> = {
        auto: { i18nKey: 'wm_swing_auto' },
        horizontal: { i18nKey: 'wm_swing_horizontal' },
        stationary: { i18nKey: 'wm_swing_stationary' },
        vertical: { i18nKey: 'wm_swing_vertical' },
    };

    private static getSwingLabel(label: string): string {
        const key = label.toLowerCase().trim();
        const meta = WidgetAirCondition.SWING_MAP[key];
        return meta ? I18n.t(meta.i18nKey) : label;
    }

    // --- Airflow helpers ---

    private static readonly AIRFLOW_MAP: Record<string, { i18nKey: string }> = {
        forward: { i18nKey: 'wm_airflow_forward' },
        reverse: { i18nKey: 'wm_airflow_reverse' },
    };

    private static getAirflowLabel(label: string): string {
        const key = label.toLowerCase().trim();
        const meta = WidgetAirCondition.AIRFLOW_MAP[key];
        return meta ? I18n.t(meta.i18nKey) : label;
    }

    // --- Derived state helpers ---

    private getCurrentModeLabel(): string | null {
        const { mode, modeStates } = this.state;
        if (mode == null) {
            return null;
        }
        return modeStates[String(mode)] || null;
    }

    private getCurrentSpeedLabel(): string | null {
        const { speed, speedStates } = this.state;
        if (speed == null) {
            return null;
        }
        return speedStates[String(speed)] || null;
    }

    /** What the device reports it is doing, as a label from its own state list */
    private getWorkingModeLabel(): string | null {
        const { workingMode, workingModeStates } = this.state;
        if (workingMode == null) {
            return null;
        }
        return workingModeStates[String(workingMode)] || null;
    }

    private isPoweredOff(): boolean {
        if (this.powerId && this.state.power === false) {
            return true;
        }
        const modeLabel = this.getCurrentModeLabel();
        return !!(this.modeId && modeLabel && modeLabel.toLowerCase().trim() === 'off');
    }

    // --- Color helpers ---

    private getModeColor(): string {
        const modeLabel = this.getCurrentModeLabel();
        if (!modeLabel) {
            return '#2196f3';
        }
        return WidgetAirCondition.getModeInfo(modeLabel).color;
    }

    private static getTempColor(t: number | null): string {
        if (t == null) {
            return 'text.disabled';
        }
        if (t < 18) {
            return '#2196f3';
        }
        if (t < 22) {
            return '#4caf50';
        }
        if (t < 26) {
            return '#ff9800';
        }
        return '#f44336';
    }

    private static formatTemp(t: number | null, isFloatComma?: boolean): string {
        if (t == null) {
            return '—';
        }
        return `${formatFloat(t, 1, isFloatComma)}°`;
    }

    // --- Setpoint rendering ---

    /** Which thumb the device is not working towards, so the other one can be emphasised */
    private get dimmedThumb(): 'heating' | 'cooling' | null {
        if (!this.dual) {
            return null;
        }
        const label = this.getWorkingModeLabel()?.toLowerCase().trim();
        if (label === 'heat') {
            return 'cooling';
        }
        if (label === 'cool') {
            return 'heating';
        }
        return null;
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
                        {WidgetAirCondition.formatTemp(this.displaySetpoint, isFloatComma)}
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
                        {WidgetAirCondition.formatTemp(this.state.setHeating, isFloatComma)}
                    </Typography>
                </Tooltip>
                <Tooltip title={I18n.t('wm_Cooling setpoint')}>
                    <Typography
                        variant={variant}
                        sx={{ fontWeight: 700, color: COOLING_COLOR, opacity: dimmed === 'cooling' ? 0.5 : 1 }}
                    >
                        {WidgetAirCondition.formatTemp(this.state.setCooling, isFloatComma)}
                    </Typography>
                </Tooltip>
            </Box>
        );
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
                    <Typography variant="body2">{I18n.t(WidgetAirCondition.SETPOINT_LABELS[kind])}</Typography>
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
                        sx={theme => ({ border: `1px solid ${theme.palette.divider}` })}
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
                        sx={{ flex: 1, color: WidgetAirCondition.getTempColor(current) }}
                    />
                    <IconButton
                        disabled={this.isDialReadOnly}
                        onClick={() => this.adjustTemp(range.step)}
                        sx={theme => ({ border: `1px solid ${theme.palette.divider}` })}
                    >
                        <Add />
                    </IconButton>
                </Box>
                {this.renderOffDialSetpointRows()}
            </>
        );
    }

    // --- History ---

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

    // --- Tile overrides ---

    protected isTileActive(): boolean {
        return !this.isPoweredOff() && (this.hasSetpoint || this.state.actualTemp != null);
    }

    // eslint-disable-next-line class-methods-use-this
    protected hasTileAction(): boolean {
        return true;
    }

    protected onTileClick(): void {
        this.setState({ dialogOpen: true });
    }

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = this.renderBaseIcon();
        if (baseIcon) {
            return baseIcon;
        }
        const modeLabel = this.getCurrentModeLabel();
        const modeColor = this.getModeColor();

        if (modeLabel) {
            return WidgetAirCondition.renderModeIcon(modeLabel, 24, this.isPoweredOff() ? undefined : modeColor);
        }
        return <AcUnit sx={{ color: this.isPoweredOff() ? 'text.disabled' : '#2196f3' }} />;
    }

    protected renderTileStatus(): React.JSX.Element | null {
        // Every layout but the 1x1 shows the same content through renderTileAction — rendering it
        // here as well printed it twice on one tile.
        const size = this.props.settings?.size || '1x1';
        if (size !== '1x1') {
            return null;
        }

        const { actualTemp, humidity, boost, power } = this.state;
        const modeLabel = this.getCurrentModeLabel();
        const speedLabel = this.getCurrentSpeedLabel();

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {actualTemp != null ? (
                        <Tooltip title={I18n.t('wm_Actual temperature')}>
                            <Typography
                                variant="caption"
                                sx={{ fontWeight: 600, fontSize: '1.1rem', lineHeight: 1.2, color: 'text.primary' }}
                            >
                                {WidgetAirCondition.formatTemp(actualTemp, this.props.stateContext.isFloatComma)}
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
                    {modeLabel ? (
                        <Tooltip title={WidgetAirCondition.getModeInfo(modeLabel).displayName}>
                            {WidgetAirCondition.renderModeIcon(modeLabel, 14)}
                        </Tooltip>
                    ) : null}
                </Box>
                {humidity != null || speedLabel ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
                                💧 {Math.round(humidity)}%
                            </Typography>
                        ) : null}
                        {speedLabel ? (
                            <Typography
                                variant="caption"
                                sx={{ fontWeight: 500, color: 'text.secondary' }}
                            >
                                <Air sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.25 }} />
                                {WidgetAirCondition.getSpeedLabel(speedLabel)}
                            </Typography>
                        ) : null}
                    </Box>
                ) : null}
            </Box>
        );
    }

    protected renderTileAction(): React.JSX.Element | null {
        const { actualTemp, humidity, boost, power } = this.state;
        const modeLabel = this.getCurrentModeLabel();
        const speedLabel = this.getCurrentSpeedLabel();

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {actualTemp != null ? (
                        <Typography
                            variant="body2"
                            sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}
                        >
                            {WidgetAirCondition.formatTemp(actualTemp, this.props.stateContext.isFloatComma)}
                        </Typography>
                    ) : null}
                    {this.renderSetpointText('h6', { fontWeight: 700, whiteSpace: 'nowrap' })}
                    {boost ? <LocalFireDepartment sx={{ fontSize: 18, color: '#f44336' }} /> : null}
                    {power === false ? <PowerSettingsNew sx={{ fontSize: 18, color: 'text.disabled' }} /> : null}
                    {modeLabel ? (
                        <Tooltip title={WidgetAirCondition.getModeInfo(modeLabel).displayName}>
                            {WidgetAirCondition.renderModeIcon(modeLabel, 18)}
                        </Tooltip>
                    ) : null}
                </Box>
                {humidity != null || speedLabel ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
                                💧 {Math.round(humidity)}%
                            </Typography>
                        ) : null}
                        {speedLabel ? (
                            <Typography
                                variant="body2"
                                sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: '3px' }}
                            >
                                <Air sx={{ fontSize: 14 }} />
                                {WidgetAirCondition.getSpeedLabel(speedLabel)}
                            </Typography>
                        ) : null}
                    </Box>
                ) : null}
            </Box>
        );
    }

    // --- Dialog ---

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
            mode,
            modeStates,
            speed,
            speedStates,
            speedLevel,
            speedLevelRange,
            speedLevelUnit,
            swing,
            swingStates,
            swingIsBoolean,
            airflow,
            airflowStates,
            range,
            dragging,
        } = this.state;
        const displayTemp = this.displayTemp;
        const modeEntries = Object.entries(modeStates);
        const speedEntries = Object.entries(speedStates);
        const swingEntries = Object.entries(swingStates);
        const airflowEntries = Object.entries(airflowStates);
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
                                progressStroke={WidgetAirCondition.getTempColor(displayTemp)}
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
                                        {WidgetAirCondition.formatTemp(
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
                                        {WidgetAirCondition.formatTemp(
                                            actualTemp,
                                            this.props.stateContext.isFloatComma,
                                        )}
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
                                mb: 2,
                                ...dimmedSx,
                            }}
                        >
                            {humidity != null ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Typography
                                        variant="body1"
                                        sx={{ color: 'text.secondary' }}
                                    >
                                        💧 {Math.round(humidity)}%
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
                                    {WidgetAirCondition.renderModeIcon(currentModeLabel, 20)}
                                    <Typography
                                        variant="body1"
                                        sx={{ color: WidgetAirCondition.getModeInfo(currentModeLabel).color }}
                                    >
                                        {WidgetAirCondition.getModeInfo(currentModeLabel).displayName}
                                    </Typography>
                                </Box>
                            ) : null}
                            {workingModeLabel ? (
                                <Tooltip title={I18n.t('wm_Working mode')}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        {WidgetAirCondition.renderModeIcon(workingModeLabel, 18)}
                                        <Typography
                                            variant="body2"
                                            sx={{ color: 'text.secondary' }}
                                        >
                                            {WidgetAirCondition.getModeInfo(workingModeLabel).displayName}
                                        </Typography>
                                    </Box>
                                </Tooltip>
                            ) : null}
                        </Box>
                    ) : null}

                    {/* Power + Boost toggles */}
                    {this.powerId || this.boostId ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center', mb: 2 }}>
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
                            {this.boostId ? (
                                <Button
                                    variant={boost ? 'contained' : 'outlined'}
                                    color={boost ? 'error' : 'inherit'}
                                    startIcon={<LocalFireDepartment />}
                                    onClick={this.toggleBoost}
                                    size="small"
                                    sx={{ textTransform: 'none', borderRadius: '20px' }}
                                >
                                    Boost
                                </Button>
                            ) : null}
                        </Box>
                    ) : null}

                    {/* Mode selector */}
                    {modeEntries.length > 0 ? (
                        <Box sx={{ mb: 2 }}>
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, mb: 0.75, color: 'text.secondary' }}
                            >
                                {I18n.t('wm_Mode')}
                            </Typography>
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
                                    const info = WidgetAirCondition.getModeInfo(label);
                                    return (
                                        <Button
                                            key={key}
                                            variant={isActive ? 'contained' : 'outlined'}
                                            color="inherit"
                                            startIcon={WidgetAirCondition.renderModeIcon(
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
                        </Box>
                    ) : null}

                    {/* Speed selector */}
                    {speedEntries.length > 0 ? (
                        <Box sx={{ mb: 2 }}>
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, mb: 0.75, color: 'text.secondary' }}
                            >
                                <Air sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                                {I18n.t('wm_Speed')}
                            </Typography>
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
                                {speedEntries.map(([key, label]) => {
                                    const value = stateKeyToValue(key);
                                    const isActive = speed != null && String(speed) === key;
                                    return (
                                        <Button
                                            key={key}
                                            variant={isActive ? 'contained' : 'outlined'}
                                            color={isActive ? 'primary' : 'inherit'}
                                            onClick={() => this.setSpeed(value)}
                                            size="small"
                                            sx={{ textTransform: 'none', borderRadius: '20px', minWidth: 0, px: 1.5 }}
                                        >
                                            {WidgetAirCondition.getSpeedLabel(label)}
                                        </Button>
                                    );
                                })}
                            </Box>
                        </Box>
                    ) : null}

                    {/* Continuous fan level, for a device that offers one beside the stepped list */}
                    {this.speedLevelId ? (
                        <Box sx={{ mb: 2 }}>
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, mb: 0.75, color: 'text.secondary' }}
                            >
                                <Air sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                                {I18n.t('wm_Fan level')}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, ...dimmedSx }}>
                                <Slider
                                    disabled={this.isReadOnly}
                                    value={speedLevel ?? speedLevelRange.min}
                                    min={speedLevelRange.min}
                                    max={speedLevelRange.max}
                                    step={speedLevelRange.step}
                                    valueLabelDisplay="auto"
                                    onChange={(_e, value) => {
                                        if (!Array.isArray(value)) {
                                            this.setState({ speedLevel: value });
                                        }
                                    }}
                                    onChangeCommitted={(_e, value) => {
                                        if (!Array.isArray(value)) {
                                            this.setSpeedLevel(value);
                                        }
                                    }}
                                    sx={{ flex: 1 }}
                                />
                                <Typography
                                    variant="body2"
                                    sx={{ color: 'text.secondary', minWidth: 42, textAlign: 'right' }}
                                >
                                    {speedLevel == null
                                        ? '—'
                                        : `${Math.round(speedLevel)}${speedLevelUnit ? ` ${speedLevelUnit}` : ''}`}
                                </Typography>
                            </Box>
                        </Box>
                    ) : null}

                    {/* Airflow direction */}
                    {airflowEntries.length > 0 ? (
                        <Box sx={{ mb: 2 }}>
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, mb: 0.75, color: 'text.secondary' }}
                            >
                                <SwapHoriz sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                                {I18n.t('wm_Airflow direction')}
                            </Typography>
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
                                {airflowEntries.map(([key, label]) => {
                                    const value = stateKeyToValue(key);
                                    const isActive = airflow != null && String(airflow) === key;
                                    return (
                                        <Button
                                            key={key}
                                            variant={isActive ? 'contained' : 'outlined'}
                                            color={isActive ? 'primary' : 'inherit'}
                                            disabled={this.isReadOnly}
                                            onClick={() => this.setAirflow(value)}
                                            size="small"
                                            sx={{ textTransform: 'none', borderRadius: '20px', minWidth: 0, px: 1.5 }}
                                        >
                                            {WidgetAirCondition.getAirflowLabel(label)}
                                        </Button>
                                    );
                                })}
                            </Box>
                        </Box>
                    ) : null}

                    {/* Swing control */}
                    {this.swingId ? (
                        <Box>
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, mb: 0.75, color: 'text.secondary' }}
                            >
                                <SwapVert sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                                {I18n.t('wm_Swing')}
                            </Typography>
                            {swingIsBoolean ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', ...dimmedSx }}>
                                    <Button
                                        variant={swing ? 'contained' : 'outlined'}
                                        color={swing ? 'primary' : 'inherit'}
                                        onClick={() => this.setSwing(!swing)}
                                        size="small"
                                        sx={{ textTransform: 'none', borderRadius: '20px' }}
                                    >
                                        {swing ? I18n.t('wm_On') : I18n.t('wm_Off')}
                                    </Button>
                                </Box>
                            ) : swingEntries.length > 0 ? (
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
                                    {swingEntries.map(([key, label]) => {
                                        const value = stateKeyToValue(key);
                                        const isActive = swing != null && String(swing) === key;
                                        return (
                                            <Button
                                                key={key}
                                                variant={isActive ? 'contained' : 'outlined'}
                                                color={isActive ? 'primary' : 'inherit'}
                                                onClick={() => this.setSwing(value)}
                                                size="small"
                                                sx={{
                                                    textTransform: 'none',
                                                    borderRadius: '20px',
                                                    minWidth: 0,
                                                    px: 1.5,
                                                }}
                                            >
                                                {WidgetAirCondition.getSwingLabel(label)}
                                            </Button>
                                        );
                                    })}
                                </Box>
                            ) : null}
                        </Box>
                    ) : null}
                </DialogContent>
            </Dialog>
        );
    }

    // --- Compact 1x1 ---

    renderCompact(): React.JSX.Element {
        const { name, setHeating, setCooling, actualTemp, boost, power, range, dragging } = this.state;
        const modeLabel = this.getCurrentModeLabel();
        const isActive = this.isTileActive();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        const displayTemp = this.displayTemp;
        const poweredOff = this.isPoweredOff();

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={theme => WidgetGeneric.getStyleCompact(theme)}
            >
                <ButtonBase
                    component="div"
                    onClick={() => this.onTileClick()}
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
                        ...this.applyTileStyles(theme, isActive && !poweredOff),
                        padding: isNeumorphicTheme(theme) ? 'max(12px, 8cqi)' : 'max(16px, 10cqi)',
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
                        <ClimateArc
                            range={range}
                            value={this.displaySetpoint}
                            heating={this.dual ? setHeating : null}
                            cooling={this.dual ? setCooling : null}
                            progressStroke={isActive ? WidgetAirCondition.getTempColor(displayTemp) : undefined}
                            dragging={dragging}
                            dimmedThumb={this.dimmedThumb}
                            style={{ width: '60%', height: '60%' }}
                        />
                        <Box
                            sx={{
                                position: 'absolute',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                            }}
                        >
                            {this.renderTileIcon()}
                            {this.hasSetpoint
                                ? this.renderSetpointText(
                                      'caption',
                                      { fontWeight: 700, fontSize: 'max(0.75rem, 7cqi)', lineHeight: 1 },
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
                                <Typography
                                    variant="caption"
                                    sx={{ color: 'text.secondary', fontSize: 'max(0.6rem, 6cqi)' }}
                                >
                                    {WidgetAirCondition.formatTemp(actualTemp, this.props.stateContext.isFloatComma)}
                                </Typography>
                            ) : null}
                            {boost ? (
                                <LocalFireDepartment sx={{ fontSize: 'max(12px, 7cqi)', color: '#f44336' }} />
                            ) : null}
                            {power === false ? (
                                <PowerSettingsNew sx={{ fontSize: 'max(12px, 7cqi)', color: 'text.disabled' }} />
                            ) : null}
                            {modeLabel ? WidgetAirCondition.renderModeIcon(modeLabel, 14) : null}
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>{this.renderMinMax()}</Box>
                    </Box>
                    {this.renderChart()}
                </ButtonBase>
            </Box>
        );
    }

    // --- WideTall 2x1 ---

    renderWideTall(): React.JSX.Element {
        const { name, actualTemp, humidity, boost, power } = this.state;
        const modeLabel = this.getCurrentModeLabel();
        const speedLabel = this.getCurrentSpeedLabel();
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
                {/* Sizer */}
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

                    {/* Name */}
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

                    {/* Icon + info row */}
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
                                    <Typography
                                        variant="body2"
                                        sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}
                                    >
                                        {WidgetAirCondition.formatTemp(
                                            actualTemp,
                                            this.props.stateContext.isFloatComma,
                                        )}
                                    </Typography>
                                ) : null}
                                {this.renderSetpointText('h6', { fontWeight: 700, whiteSpace: 'nowrap' })}
                                {boost ? <LocalFireDepartment sx={{ fontSize: 20, color: '#f44336' }} /> : null}
                                {power === false ? (
                                    <PowerSettingsNew sx={{ fontSize: 20, color: 'text.disabled' }} />
                                ) : null}
                                {modeLabel ? (
                                    <Tooltip title={WidgetAirCondition.getModeInfo(modeLabel).displayName}>
                                        {WidgetAirCondition.renderModeIcon(modeLabel, 20)}
                                    </Tooltip>
                                ) : null}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {humidity != null ? (
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: 'text.secondary',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                        }}
                                    >
                                        💧 {Math.round(humidity)}%
                                    </Typography>
                                ) : null}
                                {speedLabel ? (
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: 'text.secondary',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                        }}
                                    >
                                        <Air sx={{ fontSize: 14 }} />
                                        {WidgetAirCondition.getSpeedLabel(speedLabel)}
                                    </Typography>
                                ) : null}
                            </Box>
                            {this.renderMinMax()}
                        </Box>
                    </Box>
                    {this.renderChart()}
                </ButtonBase>
            </Box>
        );
    }

    /**
     * Rendered beside the tile rather than inside a layout: the 2x0.5 layout comes from the base
     * class, so a dialog rendered only by the layouts this widget overrides could not open at that
     * size at all.
     */
    render(): React.JSX.Element {
        return (
            <>
                {super.render()}
                {this.renderDialog()}
            </>
        );
    }
}

export default WidgetAirCondition;
