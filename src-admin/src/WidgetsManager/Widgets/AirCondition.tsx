import React from 'react';
import { Box, Button, ButtonBase, Dialog, DialogContent, IconButton, Slider, Tooltip, Typography } from '@mui/material';
import {
    AcUnit,
    Add,
    Air,
    AutoMode,
    Close,
    EnergySavingsLeaf,
    LocalFireDepartment,
    PowerSettingsNew,
    Remove,
    SwapVert,
    Tune,
    Whatshot,
} from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';

import WidgetGeneric, { getTileStyles, type WidgetGenericProps, type WidgetGenericState } from './Generic';

interface WidgetAirConditionState extends WidgetGenericState {
    setTemp: number | null;
    actualTemp: number | null;
    humidity: number | null;
    boost: boolean;
    power: boolean | null;
    mode: number | null;
    modeStates: Record<string, string>;
    speed: number | null;
    speedStates: Record<string, string>;
    swing: number | boolean | null;
    swingStates: Record<string, string>;
    swingIsBoolean: boolean;
    setMin: number;
    setMax: number;
    setStep: number;
    dragging: boolean;
    dialogOpen: boolean;
}

export class WidgetAirCondition extends WidgetGeneric<WidgetAirConditionState> {
    private readonly setId: string | null;
    private readonly actualId: string | null;
    private readonly humidityId: string | null;
    private readonly boostId: string | null;
    private readonly powerId: string | null;
    private readonly modeId: string | null;
    private readonly speedId: string | null;
    private readonly swingId: string | null;
    private readonly arcRef = React.createRef<HTMLDivElement>();

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;
        this.setId = states.find(s => s.name === 'SET')?.id ?? null;
        this.actualId = states.find(s => s.name === 'ACTUAL')?.id ?? null;
        this.humidityId = states.find(s => s.name === 'HUMIDITY')?.id ?? null;
        this.boostId = states.find(s => s.name === 'BOOST')?.id ?? null;
        this.powerId = states.find(s => s.name === 'POWER')?.id ?? null;
        this.modeId = states.find(s => s.name === 'MODE')?.id ?? null;
        this.speedId = states.find(s => s.name === 'SPEED')?.id ?? null;
        this.swingId = states.find(s => s.name === 'SWING')?.id ?? null;

        this.state = {
            ...this.state,
            setTemp: null,
            actualTemp: null,
            humidity: null,
            boost: false,
            power: null,
            mode: null,
            modeStates: {},
            speed: null,
            speedStates: {},
            swing: null,
            swingStates: {},
            swingIsBoolean: false,
            setMin: 16,
            setMax: 30,
            setStep: 0.5,
            dragging: false,
            dialogOpen: false,
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.setId) {
            this.props.stateContext.getState(this.setId, this.onSetChange);
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
        void this.loadSetObject();
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.setId) {
            this.props.stateContext.removeState(this.setId, this.onSetChange);
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

    private async loadStatesObject(id: string, stateKey: 'modeStates' | 'speedStates'): Promise<void> {
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(id)) as
                | ioBroker.StateObject
                | null
                | undefined;
            if (obj?.common?.states && typeof obj.common.states === 'object') {
                if (stateKey === 'modeStates') {
                    this.setState({ modeStates: obj.common.states as Record<string, string> });
                } else {
                    this.setState({ speedStates: obj.common.states as Record<string, string> });
                }
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
                | ioBroker.StateObject
                | null
                | undefined;
            if (obj?.common) {
                const isBoolean = obj.common.type === 'boolean';
                this.setState({ swingIsBoolean: isBoolean });
                if (!isBoolean && obj.common.states && typeof obj.common.states === 'object') {
                    this.setState({ swingStates: obj.common.states as Record<string, string> });
                }
            }
        } catch {
            // ignore
        }
    }

    private async loadSetObject(): Promise<void> {
        if (!this.setId) {
            return;
        }
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(this.setId)) as
                | ioBroker.StateObject
                | null
                | undefined;
            if (obj?.common) {
                const min = obj.common.min != null ? Number(obj.common.min) : 16;
                const max = obj.common.max != null ? Number(obj.common.max) : 30;
                const step = obj.common.step != null ? Number(obj.common.step) : 0.5;
                if (!isNaN(min) && !isNaN(max) && max > min) {
                    this.setState({ setMin: min, setMax: max, setStep: step > 0 ? step : 0.5 });
                }
            }
        } catch {
            // ignore
        }
    }

    // --- State change handlers ---

    private onSetChange = (_id: string, state: ioBroker.State): void => {
        if (this.state.dragging) {
            return;
        }
        const val = state.val != null ? Number(state.val) : null;
        const setTemp = val != null && !isNaN(val) ? val : null;
        if (setTemp !== this.state.setTemp) {
            this.setState({ setTemp });
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

    private onModeChange = (_id: string, state: ioBroker.State): void => {
        const val = state.val != null ? Number(state.val) : null;
        const mode = val != null && !isNaN(val) ? val : null;
        if (mode !== this.state.mode) {
            this.setState({ mode });
        }
    };

    private onSpeedChange = (_id: string, state: ioBroker.State): void => {
        const val = state.val != null ? Number(state.val) : null;
        const speed = val != null && !isNaN(val) ? val : null;
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
            void this.props.stateContext.getSocket().setState(this.powerId, newVal);
            this.setState({ power: newVal });
        }
    };

    private toggleBoost = (): void => {
        if (this.boostId) {
            const newVal = !this.state.boost;
            void this.props.stateContext.getSocket().setState(this.boostId, newVal);
            this.setState({ boost: newVal });
        }
    };

    private setMode = (value: number): void => {
        if (this.modeId) {
            void this.props.stateContext.getSocket().setState(this.modeId, value);
            this.setState({ mode: value });
        }
    };

    private setSpeed = (value: number): void => {
        if (this.speedId) {
            void this.props.stateContext.getSocket().setState(this.speedId, value);
            this.setState({ speed: value });
        }
    };

    private setSwing = (value: number | boolean): void => {
        if (this.swingId) {
            void this.props.stateContext.getSocket().setState(this.swingId, value);
            this.setState({ swing: value });
        }
    };

    private sendSetTemp(value: number): void {
        if (this.setId) {
            const clamped = Math.max(this.state.setMin, Math.min(this.state.setMax, value));
            void this.props.stateContext.getSocket().setState(this.setId, clamped);
        }
    }

    private adjustTemp = (delta: number): void => {
        const current = this.state.setTemp ?? this.state.setMin;
        const newVal = Math.max(this.state.setMin, Math.min(this.state.setMax, current + delta));
        this.sendSetTemp(newVal);
        this.setState({ setTemp: newVal });
    };

    // --- Arc drag ---

    private angleToTemp(clientX: number, clientY: number): number {
        const el = this.arcRef.current;
        if (!el) {
            return this.state.setTemp ?? this.state.setMin;
        }
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = clientX - cx;
        const dy = clientY - cy;

        let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
        if (angle < 0) {
            angle += 360;
        }

        let normalized = (angle - 225 + 360) % 360;
        if (normalized > 270) {
            normalized = normalized > 315 ? 0 : 270;
        }

        const { setMin, setMax, setStep } = this.state;
        const fraction = normalized / 270;
        const raw = setMin + fraction * (setMax - setMin);
        return Math.max(setMin, Math.min(setMax, Math.round(raw / setStep) * setStep));
    }

    private onArcPointerDown = (e: React.PointerEvent): void => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        const temp = this.angleToTemp(e.clientX, e.clientY);
        this.setState({ dragging: true, setTemp: temp });
    };

    private onArcPointerMove = (e: React.PointerEvent): void => {
        if (!this.state.dragging) {
            return;
        }
        const temp = this.angleToTemp(e.clientX, e.clientY);
        this.setState({ setTemp: temp });
    };

    private onArcPointerUp = (e: React.PointerEvent): void => {
        if (!this.state.dragging) {
            return;
        }
        const temp = this.angleToTemp(e.clientX, e.clientY);
        this.sendSetTemp(temp);
        this.setState({ setTemp: temp, dragging: false });
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

    private static formatTemp(t: number | null): string {
        if (t == null) {
            return '—';
        }
        return `${t.toFixed(1)}°`;
    }

    // --- History ---

    protected getHistoryIds(): { id: string; color: string }[] {
        const ids: { id: string; color: string }[] = [];
        if (this.actualId) {
            ids.push({ id: this.actualId, color: '#ff9800' });
        }
        if (this.setId) {
            ids.push({ id: this.setId, color: '#f44336' });
        }
        if (this.humidityId) {
            ids.push({ id: this.humidityId, color: '#2196f3' });
        }
        return ids;
    }

    // --- Tile overrides ---

    protected isTileActive(): boolean {
        return !this.isPoweredOff() && (this.state.setTemp != null || this.state.actualTemp != null);
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
        const size = this.props.settings?.size || this.props.size || '1x1';
        if (size === '2x0.5') {
            return null;
        }

        const { setTemp, actualTemp, humidity, boost, power } = this.state;
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
                                {WidgetAirCondition.formatTemp(actualTemp)}
                            </Typography>
                        </Tooltip>
                    ) : null}
                    {setTemp != null ? (
                        <Tooltip title={I18n.t('wm_Set temperature')}>
                            <Typography
                                variant="caption"
                                sx={{ fontWeight: 500, color: 'text.secondary' }}
                            >
                                → {WidgetAirCondition.formatTemp(setTemp)}
                            </Typography>
                        </Tooltip>
                    ) : null}
                    {boost ? <LocalFireDepartment sx={{ fontSize: 14, color: '#f44336' }} /> : null}
                    {power === false ? (
                        <Tooltip title={I18n.t('wm_Power')}>
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
        const { setTemp, actualTemp, humidity, boost, power } = this.state;
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
                            {WidgetAirCondition.formatTemp(actualTemp)}
                        </Typography>
                    ) : null}
                    <Typography
                        variant="h6"
                        sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                    >
                        → {WidgetAirCondition.formatTemp(setTemp)}
                    </Typography>
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
            setTemp,
            actualTemp,
            humidity,
            boost,
            power,
            mode,
            modeStates,
            speed,
            speedStates,
            swing,
            swingStates,
            swingIsBoolean,
            setMin,
            setMax,
            setStep,
            dragging,
        } = this.state;
        const displayTemp = actualTemp ?? setTemp;
        const modeEntries = Object.entries(modeStates);
        const speedEntries = Object.entries(speedStates);
        const swingEntries = Object.entries(swingStates);
        const currentModeLabel = mode != null ? modeStates[String(mode)] || null : null;
        const poweredOff = this.isPoweredOff();
        const dimmedSx = poweredOff ? { opacity: 0.5, transition: 'opacity 0.25s ease' } : {};

        // Arc parameters
        const vb = 100;
        const sw = 8;
        const r = (vb - sw) / 2;
        const circumference = 2 * Math.PI * r;
        const arcLength = circumference * 0.75;
        const range = setMax - setMin;
        const progress = setTemp != null && range > 0 ? ((setTemp - setMin) / range) * arcLength : 0;

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
                                    stroke={WidgetAirCondition.getTempColor(displayTemp)}
                                    strokeWidth={sw}
                                    strokeDasharray={`${progress} ${circumference}`}
                                    strokeLinecap="round"
                                    style={dragging ? undefined : { transition: 'stroke-dasharray 0.3s ease' }}
                                />
                            </svg>
                            <Box
                                sx={{
                                    position: 'absolute',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 0.5,
                                }}
                            >
                                <Typography
                                    variant="h3"
                                    sx={{ fontWeight: 700, lineHeight: 1 }}
                                >
                                    {WidgetAirCondition.formatTemp(setTemp)}
                                </Typography>
                                {actualTemp != null && setTemp != null ? (
                                    <Typography
                                        variant="body2"
                                        sx={{ color: 'text.secondary' }}
                                    >
                                        {I18n.t('wm_Actual')}: {WidgetAirCondition.formatTemp(actualTemp)}
                                    </Typography>
                                ) : null}
                            </Box>
                        </Box>
                    </Box>

                    {/* +/- buttons with slider */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, mb: 2, ...dimmedSx }}>
                        <IconButton
                            onClick={() => this.adjustTemp(-setStep)}
                            sx={theme => ({ border: `1px solid ${theme.palette.divider}` })}
                        >
                            <Remove />
                        </IconButton>
                        <Slider
                            value={setTemp ?? setMin}
                            min={setMin}
                            max={setMax}
                            step={setStep}
                            onMouseDown={() => this.setState({ dragging: true })}
                            onTouchStart={() => this.setState({ dragging: true })}
                            onChange={(_e, value) => this.setState({ setTemp: value as number })}
                            onChangeCommitted={(_e, value) => {
                                this.sendSetTemp(value as number);
                                this.setState({ dragging: false });
                            }}
                            sx={{ flex: 1, color: WidgetAirCondition.getTempColor(setTemp) }}
                        />
                        <IconButton
                            onClick={() => this.adjustTemp(setStep)}
                            sx={theme => ({ border: `1px solid ${theme.palette.divider}` })}
                        >
                            <Add />
                        </IconButton>
                    </Box>

                    {/* Info row: humidity + boost + current mode */}
                    {humidity != null || boost || currentModeLabel ? (
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
                                    {I18n.t('wm_Power')}
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
                                    const numKey = Number(key);
                                    const isActive = mode === numKey;
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
                                            onClick={() => this.setMode(numKey)}
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
                                    const numKey = Number(key);
                                    const isActive = speed === numKey;
                                    return (
                                        <Button
                                            key={key}
                                            variant={isActive ? 'contained' : 'outlined'}
                                            color={isActive ? 'primary' : 'inherit'}
                                            onClick={() => this.setSpeed(numKey)}
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
                                        const numKey = Number(key);
                                        const isActive = swing === numKey;
                                        return (
                                            <Button
                                                key={key}
                                                variant={isActive ? 'contained' : 'outlined'}
                                                color={isActive ? 'primary' : 'inherit'}
                                                onClick={() => this.setSwing(numKey)}
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
        const { name, setTemp, actualTemp, boost, power, setMin, setMax, dragging } = this.state;
        const modeLabel = this.getCurrentModeLabel();
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const indicators = this.renderIndicators();
        const displayTemp = actualTemp ?? setTemp;
        const poweredOff = this.isPoweredOff();

        // Arc parameters
        const vb = 100;
        const sw = 8;
        const r = (vb - sw) / 2;
        const circumference = 2 * Math.PI * r;
        const arcLength = circumference * 0.75;
        const range = setMax - setMin;
        const progress = setTemp != null && range > 0 ? ((setTemp - setMin) / range) * arcLength : 0;

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={{ position: 'relative', containerType: 'inline-size', overflow: 'hidden' }}
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
                        ...getTileStyles(theme, isActive && !poweredOff, accent),
                        padding: 'max(16px, 10cqi)',
                    })}
                >
                    {indicators ? (
                        <Box
                            sx={{ position: 'absolute', top: 'max(16px, 10cqi)', right: 'max(16px, 10cqi)', zIndex: 1 }}
                        >
                            {indicators}
                        </Box>
                    ) : null}

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
                                stroke={isActive ? WidgetAirCondition.getTempColor(displayTemp) : 'transparent'}
                                strokeWidth={sw}
                                strokeDasharray={`${progress} ${circumference}`}
                                strokeLinecap="round"
                                style={dragging ? undefined : { transition: 'stroke-dasharray 0.3s ease' }}
                            />
                        </svg>
                        <Box
                            sx={{
                                position: 'absolute',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                            }}
                        >
                            {this.renderTileIcon()}
                            {setTemp != null ? (
                                <Typography
                                    variant="caption"
                                    sx={{ fontWeight: 700, fontSize: 'max(0.75rem, 7cqi)', lineHeight: 1 }}
                                >
                                    {WidgetAirCondition.formatTemp(setTemp)}
                                </Typography>
                            ) : null}
                        </Box>
                    </Box>

                    {/* Name + info */}
                    <Box sx={{ textAlign: 'center', minWidth: 0 }}>
                        <Typography
                            ref={this.nameRef}
                            variant="body2"
                            sx={{
                                fontWeight: 600,
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                fontSize: 'max(0.75rem, 8cqi)',
                            }}
                        >
                            {this.props.settings?.name || name || '...'}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            {actualTemp != null && setTemp != null ? (
                                <Typography
                                    variant="caption"
                                    sx={{ color: 'text.secondary', fontSize: 'max(0.6rem, 6cqi)' }}
                                >
                                    {WidgetAirCondition.formatTemp(actualTemp)}
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
                    </Box>
                    {this.renderChart()}
                </ButtonBase>
                {this.renderSettingsButton()}
                {this.renderDialog()}
            </Box>
        );
    }

    // --- WideTall 2x1 ---

    renderWideTall(): React.JSX.Element {
        const { name, setTemp, actualTemp, humidity, boost, power } = this.state;
        const modeLabel = this.getCurrentModeLabel();
        const speedLabel = this.getCurrentSpeedLabel();
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const indicators = this.renderIndicators();
        const poweredOff = this.isPoweredOff();

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={{ position: 'relative', gridColumn: 'span 2', containerType: 'inline-size', overflow: 'hidden' }}
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
                        ...getTileStyles(theme, isActive && !poweredOff, accent),
                        padding: 'max(16px, 5cqi)',
                    })}
                >
                    {indicators ? (
                        <Box sx={{ position: 'absolute', top: 'max(16px, 5cqi)', right: 'max(16px, 5cqi)', zIndex: 1 }}>
                            {indicators}
                        </Box>
                    ) : null}

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
                                        {WidgetAirCondition.formatTemp(actualTemp)}
                                    </Typography>
                                ) : null}
                                <Typography
                                    variant="h6"
                                    sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                                >
                                    → {WidgetAirCondition.formatTemp(setTemp)}
                                </Typography>
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
                        </Box>
                    </Box>
                    {this.renderChart()}
                </ButtonBase>
                {this.renderSettingsButton()}
                {this.renderDialog()}
            </Box>
        );
    }
}

export default WidgetAirCondition;
