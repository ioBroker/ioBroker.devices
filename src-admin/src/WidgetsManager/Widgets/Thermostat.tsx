import React from 'react';
import { Box, Button, ButtonBase, Dialog, DialogContent, IconButton, Slider, Tooltip, Typography } from '@mui/material';
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
} from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';

import WidgetGeneric, { getTileStyles, type WidgetGenericProps, type WidgetGenericState } from './Generic';

interface WidgetThermostatState extends WidgetGenericState {
    setTemp: number | null;
    actualTemp: number | null;
    humidity: number | null;
    boost: boolean;
    power: boolean | null;
    party: boolean | null;
    mode: number | null;
    modeStates: Record<string, string>;
    setMin: number;
    setMax: number;
    setStep: number;
    dragging: boolean;
    dialogOpen: boolean;
}

export class WidgetThermostat extends WidgetGeneric<WidgetThermostatState> {
    private readonly setId: string | null;
    private readonly actualId: string | null;
    private readonly humidityId: string | null;
    private readonly boostId: string | null;
    private readonly powerId: string | null;
    private readonly partyId: string | null;
    private readonly modeId: string | null;
    private readonly arcRef = React.createRef<HTMLDivElement>();

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;
        this.setId = states.find(s => s.name === 'SET')?.id ?? null;
        this.actualId = states.find(s => s.name === 'ACTUAL')?.id ?? null;
        this.humidityId = states.find(s => s.name === 'HUMIDITY')?.id ?? null;
        this.boostId = states.find(s => s.name === 'BOOST')?.id ?? null;
        this.powerId = states.find(s => s.name === 'POWER')?.id ?? null;
        this.partyId = states.find(s => s.name === 'PARTY')?.id ?? null;
        this.modeId = states.find(s => s.name === 'MODE')?.id ?? null;

        this.state = {
            ...this.state,
            setTemp: null,
            actualTemp: null,
            humidity: null,
            boost: false,
            power: null,
            party: null,
            mode: null,
            modeStates: {},
            setMin: 5,
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
        if (this.partyId) {
            this.props.stateContext.getState(this.partyId, this.onPartyChange);
        }
        if (this.modeId) {
            this.props.stateContext.getState(this.modeId, this.onModeChange);
            void this.loadModeObject();
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
            if (obj?.common?.states && typeof obj.common.states === 'object') {
                this.setState({ modeStates: obj.common.states as Record<string, string> });
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
                const min = obj.common.min != null ? Number(obj.common.min) : 5;
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

    onSetChange = (_id: string, state: ioBroker.State): void => {
        if (this.state.dragging) {
            return;
        }
        const val = state.val != null ? Number(state.val) : null;
        const setTemp = val != null && !isNaN(val) ? val : null;
        if (setTemp !== this.state.setTemp) {
            this.setState({ setTemp });
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
            void this.props.stateContext.getSocket().setState(this.powerId, newVal);
            this.setState({ power: newVal });
        }
    };

    private toggleParty = (): void => {
        if (this.partyId) {
            const newVal = !this.state.party;
            void this.props.stateContext.getSocket().setState(this.partyId, newVal);
            this.setState({ party: newVal });
        }
    };

    onModeChange = (_id: string, state: ioBroker.State): void => {
        const val = state.val != null ? Number(state.val) : null;
        const mode = val != null && !isNaN(val) ? val : null;
        if (mode !== this.state.mode) {
            this.setState({ mode });
        }
    };

    private setMode = (value: number): void => {
        if (this.modeId) {
            void this.props.stateContext.getSocket().setState(this.modeId, value);
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

    private sendSetTemp(value: number): void {
        if (this.setId) {
            const clamped = Math.max(this.state.setMin, Math.min(this.state.setMax, value));
            void this.props.stateContext.getSocket().setState(this.setId, clamped);
        }
    }

    private adjustTemp = (delta: number): void => {
        const current = this.state.setTemp ?? this.state.setMin;
        this.sendSetTemp(current + delta);
        this.setState({ setTemp: Math.max(this.state.setMin, Math.min(this.state.setMax, current + delta)) });
    };

    /** Convert a pointer position (clientX/Y) to a temperature value via the arc geometry. */
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

        // Angle clockwise from 12 o'clock (top)
        let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
        if (angle < 0) {
            angle += 360;
        }

        // Arc starts at 225° from top, covers 270° clockwise
        let normalized = (angle - 225 + 360) % 360;

        // Dead zone (the 90° gap at the bottom): clamp to nearest end
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

    static formatTemp(t: number | null): string {
        if (t == null) {
            return '—';
        }
        return `${t.toFixed(1)}°`;
    }

    protected isTileActive(): boolean {
        return this.state.setTemp != null || this.state.actualTemp != null;
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

        const displayTemp = this.state.actualTemp ?? this.state.setTemp;

        return (
            <Thermostat
                sx={{
                    fontSize: 32,
                    color: WidgetThermostat.getTempColor(displayTemp),
                    transition: 'color 0.25s ease',
                }}
            />
        );
    }

    protected renderTileStatus(): React.JSX.Element | null {
        const size = this.props.settings?.size || this.props.size || '1x1';
        if (size === '2x0.5') {
            return null;
        }

        const { setTemp, actualTemp, humidity, boost, power, party } = this.state;
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
                                {WidgetThermostat.formatTemp(actualTemp)}
                            </Typography>
                        </Tooltip>
                    ) : null}
                    {setTemp != null ? (
                        <Tooltip title={I18n.t('wm_Set temperature')}>
                            <Typography
                                variant="caption"
                                sx={{ fontWeight: 500, color: 'text.secondary' }}
                            >
                                → {WidgetThermostat.formatTemp(setTemp)}
                            </Typography>
                        </Tooltip>
                    ) : null}
                    {boost ? <LocalFireDepartment sx={{ fontSize: 14, color: '#f44336' }} /> : null}
                    {power === false ? (
                        <Tooltip title={I18n.t('wm_Power')}>
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
        const { setTemp, actualTemp, humidity, boost, power, party } = this.state;
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
                                {WidgetThermostat.formatTemp(actualTemp)}
                            </Typography>
                        </Tooltip>
                    ) : null}
                    <Tooltip title={I18n.t('wm_Set temperature')}>
                        <Typography
                            variant="h6"
                            sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                        >
                            → {WidgetThermostat.formatTemp(setTemp)}
                        </Typography>
                    </Tooltip>
                    {boost ? <LocalFireDepartment sx={{ fontSize: 18, color: '#f44336' }} /> : null}
                    {power === false ? (
                        <Tooltip title={I18n.t('wm_Power')}>
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
            party,
            mode,
            modeStates,
            setMin,
            setMax,
            setStep,
            dragging,
        } = this.state;
        const displayTemp = actualTemp ?? setTemp;
        const modeEntries = Object.entries(modeStates);
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
                                    stroke={WidgetThermostat.getTempColor(displayTemp)}
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
                                    {WidgetThermostat.formatTemp(setTemp)}
                                </Typography>
                                {actualTemp != null && setTemp != null ? (
                                    <Typography
                                        variant="body2"
                                        sx={{ color: 'text.secondary' }}
                                    >
                                        {I18n.t('wm_Actual')}: {WidgetThermostat.formatTemp(actualTemp)}
                                    </Typography>
                                ) : null}
                            </Box>
                        </Box>
                    </Box>

                    {/* +/- buttons with slider */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, mb: 2, ...dimmedSx }}>
                        <IconButton
                            onClick={() => this.adjustTemp(-setStep)}
                            sx={theme => ({
                                border: `1px solid ${theme.palette.divider}`,
                            })}
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
                            sx={{
                                flex: 1,
                                color: WidgetThermostat.getTempColor(setTemp),
                            }}
                        />
                        <IconButton
                            onClick={() => this.adjustTemp(setStep)}
                            sx={theme => ({
                                border: `1px solid ${theme.palette.divider}`,
                            })}
                        >
                            <Add />
                        </IconButton>
                    </Box>

                    {/* Info row: humidity + boost + current mode label */}
                    {humidity != null || boost || currentModeLabel ? (
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
                                    {I18n.t('wm_Power')}
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
                                const numKey = Number(key);
                                const isActive = mode === numKey;
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
                    ) : null}
                </DialogContent>
            </Dialog>
        );
    }

    renderCompact(): React.JSX.Element {
        const { name, setTemp, actualTemp, boost, power, party, setMin, setMax, dragging } = this.state;
        const modeLabel = this.getCurrentModeLabel();
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const isDisabled = this.props.settings?.enabled === false;
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
                sx={{ position: 'relative', containerType: 'inline-size', overflow: 'hidden' }}
            >
                <ButtonBase
                    component="div"
                    disabled={isDisabled}
                    disableRipple={isDisabled}
                    onClick={isDisabled ? undefined : () => this.onTileClick()}
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
                        cursor: isDisabled ? 'default' : 'pointer',
                        ...getTileStyles(theme, isActive && !poweredOff, accent),
                        ...(isDisabled && { '&:active': { transform: 'none' } }),
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
                                stroke={isActive ? WidgetThermostat.getTempColor(displayTemp) : 'transparent'}
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
                                <Tooltip title={I18n.t('wm_Set temperature')}>
                                    <Typography
                                        variant="caption"
                                        sx={{ fontWeight: 700, fontSize: 'max(0.75rem, 7cqi)', lineHeight: 1 }}
                                    >
                                        {WidgetThermostat.formatTemp(setTemp)}
                                    </Typography>
                                </Tooltip>
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
                                <Tooltip title={I18n.t('wm_Actual temperature')}>
                                    <Typography
                                        variant="caption"
                                        sx={{ color: 'text.secondary', fontSize: 'max(0.6rem, 6cqi)' }}
                                    >
                                        {WidgetThermostat.formatTemp(actualTemp)}
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
                    </Box>
                    {this.renderChart()}
                </ButtonBase>
                {this.renderSettingsButton()}
                {this.renderDialog()}
            </Box>
        );
    }

    renderWideTall(): React.JSX.Element {
        const { name, setTemp, actualTemp, humidity, boost, power, party } = this.state;
        const modeLabel = this.getCurrentModeLabel();
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const isDisabled = this.props.settings?.enabled === false;
        const indicators = this.renderIndicators();
        const poweredOff = this.isPoweredOff();

        return (
            <Box
                id={String(this.props.widget.id)}
                sx={{ position: 'relative', gridColumn: 'span 2', containerType: 'inline-size', overflow: 'hidden' }}
            >
                {/* Sizer: exactly 1 column wide with aspect-ratio 1 to match 1x1 tile height */}
                <Box sx={{ width: 'calc(50% - 6px)', aspectRatio: '1' }} />
                <ButtonBase
                    component="div"
                    disabled={isDisabled}
                    disableRipple={isDisabled}
                    onClick={isDisabled ? undefined : () => this.onTileClick()}
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
                        opacity: isDisabled ? 0.4 : 1,
                        cursor: isDisabled ? 'default' : 'pointer',
                        ...getTileStyles(theme, isActive && !poweredOff, accent),
                        ...(isDisabled && { '&:active': { transform: 'none' } }),
                        padding: 'max(16px, 5cqi)',
                    })}
                >
                    {indicators ? (
                        <Box sx={{ position: 'absolute', top: 'max(16px, 5cqi)', right: 'max(16px, 5cqi)', zIndex: 1 }}>
                            {indicators}
                        </Box>
                    ) : null}

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
                                            {WidgetThermostat.formatTemp(actualTemp)}
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
                        </Box>

                        <Tooltip title={I18n.t('wm_Set temperature')}>
                            <Typography
                                variant="h5"
                                sx={{ fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}
                            >
                                → {WidgetThermostat.formatTemp(setTemp)}
                            </Typography>
                        </Tooltip>
                    </Box>

                    {this.renderChart()}
                </ButtonBase>
                {this.renderSettingsButton()}
                {this.renderDialog()}
            </Box>
        );
    }
}

export default WidgetThermostat;
