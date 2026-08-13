import React from 'react';
import {
    Box,
    Dialog,
    IconButton,
    LinearProgress,
    MenuItem,
    Select,
    Switch as MuiSwitch,
    Typography,
} from '@mui/material';
import { BatteryFull, CleaningServices, Close, Home, Pause, PlayArrow } from '@mui/icons-material';
import { I18n } from '@iobroker/gui-components';

import WidgetGeneric, { toNumberOrNull, type WidgetGenericProps, type WidgetGenericState } from './Generic';

interface WidgetVacuumCleanerState extends WidgetGenericState {
    power: boolean;
    /** `switch.power` may be a number on some adapters — keep the raw value to write it back */
    powerIsBoolean: boolean;
    paused: boolean;
    mode: number | null;
    modeStates: Record<string, string> | null;
    workMode: number | null;
    workModeStates: Record<string, string> | null;
    battery: number | null;
    water: number | null;
    waste: number | null;
    /** Raw `STATE` value; mapped to text at render time so a late `common.states` cannot lose it */
    deviceState: string;
    deviceStateMap: Record<string, string> | null;
    runMode: number | null;
    runModeStates: Record<string, string> | null;
    progress: number | null;
    phase: string;
    map: string | null;
    dialogOpen: boolean;
}

type StateChangeHandler = (id: string, state: ioBroker.State) => void;

export class WidgetVacuumCleaner extends WidgetGeneric<WidgetVacuumCleanerState> {
    private readonly powerId: string | null;
    private readonly pauseId: string | null;
    private readonly modeId: string | null;
    private readonly workModeId: string | null;
    private readonly batteryId: string | null;
    private readonly waterId: string | null;
    private readonly wasteId: string | null;
    private readonly stateId: string | null;
    private readonly mapBase64Id: string | null;
    private readonly mapUrlId: string | null;
    private readonly homeId: string | null;
    private readonly runModeId: string | null;
    private readonly progressId: string | null;
    private readonly phaseId: string | null;

    private readonly handlers: { id: string; handler: StateChangeHandler }[] = [];

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;
        const find = (name: string): string | null => states.find(s => s.name === name)?.id ?? null;

        this.powerId = find('POWER');
        this.pauseId = find('PAUSE');
        this.modeId = find('MODE');
        this.workModeId = find('WORK_MODE');
        this.batteryId = find('BATTERY');
        this.waterId = find('WATER');
        this.wasteId = find('WASTE');
        this.stateId = find('STATE');
        this.mapBase64Id = find('MAP_BASE64');
        this.mapUrlId = find('MAP_URL');
        this.homeId = find('HOME');
        this.runModeId = find('RUN_MODE');
        this.progressId = find('PROGRESS');
        this.phaseId = find('PHASE');

        this.state = {
            ...this.state,
            power: false,
            powerIsBoolean: true,
            paused: false,
            mode: null,
            modeStates: null,
            workMode: null,
            workModeStates: null,
            battery: null,
            water: null,
            waste: null,
            deviceState: '',
            deviceStateMap: null,
            runMode: null,
            runModeStates: null,
            progress: null,
            phase: '',
            map: null,
            dialogOpen: false,
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.sub(this.powerId, this.onPower);
        this.sub(this.pauseId, this.onPause);
        this.sub(this.modeId, this.onMode);
        this.sub(this.workModeId, this.onWorkMode);
        this.sub(this.batteryId, this.onBattery);
        this.sub(this.waterId, this.onWater);
        this.sub(this.wasteId, this.onWaste);
        this.sub(this.stateId, this.onDeviceState);
        this.sub(this.mapBase64Id ?? this.mapUrlId, this.onMap);
        this.sub(this.runModeId, this.onRunMode);
        this.sub(this.progressId, this.onProgress);
        this.sub(this.phaseId, this.onPhase);

        void this.loadCommonStates(this.modeId, 'modeStates');
        void this.loadCommonStates(this.workModeId, 'workModeStates');
        void this.loadCommonStates(this.runModeId, 'runModeStates');
        void this.loadPowerType();
        void this.loadDeviceStateMap();
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        for (const { id, handler } of this.handlers) {
            this.props.stateContext.removeState(id, handler);
        }
    }

    private sub(id: string | null, handler: StateChangeHandler): void {
        if (id) {
            this.handlers.push({ id, handler });
            this.props.stateContext.getState(id, handler);
        }
    }

    private send(id: string | null, value: boolean | number): void {
        if (id) {
            void this.setValue(id, value);
        }
    }

    private async getObject(id: string): Promise<ioBroker.StateObject | null | undefined> {
        try {
            return (await this.props.stateContext.getSocket().getObject(id)) as ioBroker.StateObject | null | undefined;
        } catch {
            return null;
        }
    }

    private async loadCommonStates(
        id: string | null,
        key: 'modeStates' | 'workModeStates' | 'runModeStates',
    ): Promise<void> {
        if (!id) {
            return;
        }
        const obj = await this.getObject(id);
        const common = obj?.common?.states;
        if (!common || typeof common !== 'object') {
            return;
        }
        const map = common as Record<string, string>;
        if (key === 'modeStates') {
            this.setState({ modeStates: map });
        } else if (key === 'workModeStates') {
            this.setState({ workModeStates: map });
        } else {
            this.setState({ runModeStates: map });
        }
    }

    /** `POWER` is declared `boolean | number`; writing the wrong one leaves the device untouched. */
    private async loadPowerType(): Promise<void> {
        if (!this.powerId) {
            return;
        }
        const obj = await this.getObject(this.powerId);
        if (obj?.common?.type && obj.common.type !== 'boolean') {
            this.setState({ powerIsBoolean: false });
        }
    }

    private async loadDeviceStateMap(): Promise<void> {
        if (!this.stateId) {
            return;
        }
        const obj = await this.getObject(this.stateId);
        const common = obj?.common?.states;
        if (common && typeof common === 'object') {
            this.setState({ deviceStateMap: common as Record<string, string> });
        }
    }

    // ── State handlers ──────────────────────────────────────────────

    private onPower = (_id: string, state: ioBroker.State): void => {
        const power = !!state.val;
        if (power !== this.state.power) {
            this.setState({ power });
        }
    };

    private onPause = (_id: string, state: ioBroker.State): void => {
        const paused = !!state.val;
        if (paused !== this.state.paused) {
            this.setState({ paused });
        }
    };

    private onMode = (_id: string, state: ioBroker.State): void => {
        const mode = state.val != null ? Number(state.val) : null;
        if (mode !== this.state.mode) {
            this.setState({ mode });
        }
    };

    private onRunMode = (_id: string, state: ioBroker.State): void => {
        const runMode = toNumberOrNull(state.val);
        if (runMode !== this.state.runMode) {
            this.setState({ runMode });
        }
    };

    private onProgress = (_id: string, state: ioBroker.State): void => {
        const raw = toNumberOrNull(state.val);
        const progress = raw == null ? null : Math.round(raw);
        if (progress !== this.state.progress) {
            this.setState({ progress });
        }
    };

    private onPhase = (_id: string, state: ioBroker.State): void => {
        const phase = state.val != null ? String(state.val) : '';
        if (phase !== this.state.phase) {
            this.setState({ phase });
        }
    };

    private sendHome = (): void => {
        if (this.homeId) {
            void this.setValue(this.homeId, true);
        }
    };

    private onWorkMode = (_id: string, state: ioBroker.State): void => {
        const workMode = state.val != null ? Number(state.val) : null;
        if (workMode !== this.state.workMode) {
            this.setState({ workMode });
        }
    };

    private onBattery = (_id: string, state: ioBroker.State): void => {
        const battery = state.val != null ? Math.round(Number(state.val)) : null;
        if (battery !== this.state.battery) {
            this.setState({ battery });
        }
    };

    private onWater = (_id: string, state: ioBroker.State): void => {
        const water = state.val != null ? Math.round(Number(state.val)) : null;
        if (water !== this.state.water) {
            this.setState({ water });
        }
    };

    private onWaste = (_id: string, state: ioBroker.State): void => {
        const waste = state.val != null ? Math.round(Number(state.val)) : null;
        if (waste !== this.state.waste) {
            this.setState({ waste });
        }
    };

    private onDeviceState = (_id: string, state: ioBroker.State): void => {
        const deviceState = state.val != null ? String(state.val) : '';
        if (deviceState !== this.state.deviceState) {
            this.setState({ deviceState });
        }
    };

    private onMap = (_id: string, state: ioBroker.State): void => {
        const raw = state.val != null ? String(state.val) : '';
        if (!raw) {
            if (this.state.map) {
                this.setState({ map: null });
            }
            return;
        }
        // MAP_BASE64 delivers the payload without a data: prefix on most adapters
        const map = /^(data:|https?:|\/)/.test(raw) ? raw : `data:image/png;base64,${raw}`;
        if (map !== this.state.map) {
            this.setState({ map });
        }
    };

    // ── Actions ─────────────────────────────────────────────────────

    private togglePower = (): void => {
        const next = !this.state.power;
        this.send(this.powerId, this.state.powerIsBoolean ? next : next ? 1 : 0);
        this.setState({ power: next });
    };

    private togglePause = (): void => {
        const next = !this.state.paused;
        this.send(this.pauseId, next);
        this.setState({ paused: next });
    };

    // ── Overrides ───────────────────────────────────────────────────

    protected isTileActive(): boolean {
        return this.state.power && !this.state.paused;
    }

    // eslint-disable-next-line class-methods-use-this
    protected hasTileAction(): boolean {
        return true;
    }

    protected onTileClick(): void {
        this.setState({ dialogOpen: true });
    }

    private getStatusText(withProgress = false): string {
        const { deviceState, deviceStateMap, paused, power, battery, phase, progress } = this.state;
        const base = ((): string => {
            const mapped = deviceStateMap?.[deviceState];
            if (mapped) {
                return mapped;
            }
            // A bare status code says nothing to the user — fall back to what the other states imply
            if (deviceState && isNaN(Number(deviceState))) {
                return deviceState;
            }
            if (paused) {
                return I18n.t('wm_Paused');
            }
            // Free text from the device ("sweeping", "returning") — more specific than "cleaning",
            // but only trusted while nothing more definite contradicts it
            if (phase) {
                return phase;
            }
            if (power) {
                return I18n.t('wm_Cleaning');
            }
            return battery != null ? `${I18n.t('wm_Off')} · ${battery}%` : I18n.t('wm_Off');
        })();

        return withProgress && progress != null && power && !paused ? `${base} · ${progress}%` : base;
    }

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = this.renderBaseIcon();
        if (baseIcon) {
            return baseIcon;
        }
        const accent = this.getAccentColor();
        const active = this.isTileActive();

        return (
            <CleaningServices
                sx={theme => ({
                    color: active ? accent || theme.palette.primary.main : theme.palette.text.disabled,
                    transition: 'color 0.25s ease',
                })}
            />
        );
    }

    protected renderTileStatus(): React.JSX.Element {
        const accent = this.getAccentColor();
        const active = this.isTileActive();

        return (
            <Typography
                variant="caption"
                noWrap
                sx={theme => ({
                    fontWeight: 500,
                    color: active ? accent || theme.palette.primary.main : theme.palette.text.secondary,
                    transition: 'color 0.25s ease',
                })}
            >
                {this.getStatusText(true)}
            </Typography>
        );
    }

    protected renderTileAction(): React.JSX.Element {
        const accent = this.getAccentColor();

        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {this.pauseId ? (
                    <IconButton
                        size="small"
                        disabled={this.isReadOnly}
                        onClick={e => {
                            e.stopPropagation();
                            this.togglePause();
                        }}
                        title={this.state.paused ? I18n.t('wm_Resume') : I18n.t('wm_Pause')}
                        sx={theme => ({
                            color: this.state.paused ? accent || theme.palette.primary.main : 'text.secondary',
                        })}
                    >
                        {this.state.paused ? <PlayArrow /> : <Pause />}
                    </IconButton>
                ) : null}
                {this.powerId ? (
                    <MuiSwitch
                        checked={this.state.power}
                        disabled={this.isReadOnly}
                        onClick={e => e.stopPropagation()}
                        onChange={this.togglePower}
                        color="primary"
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
                ) : null}
            </Box>
        );
    }

    private static renderLevel(label: string, value: number | null): React.JSX.Element | null {
        if (value == null) {
            return null;
        }
        return (
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">{label}</Typography>
                    <Typography variant="body2">{value}%</Typography>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={Math.max(0, Math.min(100, value))}
                    sx={{ borderRadius: 1, height: 6 }}
                />
            </Box>
        );
    }

    private renderModeSelect(
        label: string,
        value: number | null,
        options: Record<string, string> | null,
        id: string | null,
    ): React.JSX.Element | null {
        if (!id || !options) {
            return null;
        }
        // MODE / WORK_MODE are numbers — a non-numeric key would be written back as NaN
        const numericOptions = Object.entries(options).filter(([key]) => key !== '' && !isNaN(Number(key)));
        if (!numericOptions.length) {
            return null;
        }
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Typography variant="body2">{label}</Typography>
                <Select
                    size="small"
                    disabled={this.isReadOnly}
                    value={value != null && numericOptions.some(([key]) => key === String(value)) ? String(value) : ''}
                    onChange={e => this.send(id, Number(e.target.value))}
                    sx={{ minWidth: 140 }}
                >
                    {numericOptions.map(([key, text]) => (
                        <MenuItem
                            key={key}
                            value={key}
                        >
                            {text}
                        </MenuItem>
                    ))}
                </Select>
            </Box>
        );
    }

    private renderVacuumDialog(): React.JSX.Element | null {
        if (!this.state.dialogOpen) {
            return null;
        }
        const { battery, water, waste, map } = this.state;

        return (
            <Dialog
                open
                onClose={() => this.setState({ dialogOpen: false })}
                fullWidth
                maxWidth="sm"
                slotProps={{ paper: { sx: { borderRadius: '16px' } } }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1 }}>
                    <Typography
                        variant="subtitle1"
                        noWrap
                        sx={{ fontWeight: 600, flex: 1 }}
                    >
                        {this.props.settings?.name || this.state.name || I18n.t('wm_Vacuum cleaner')}
                    </Typography>
                    {this.homeId ? (
                        <IconButton
                            size="small"
                            disabled={this.isReadOnly}
                            onClick={this.sendHome}
                            title={I18n.t('wm_Send home')}
                        >
                            <Home />
                        </IconButton>
                    ) : null}
                    <IconButton
                        size="small"
                        onClick={() => this.setState({ dialogOpen: false })}
                    >
                        <Close />
                    </IconButton>
                </Box>

                {map ? (
                    <Box
                        component="img"
                        src={map}
                        alt=""
                        sx={{ width: '100%', maxHeight: '45vh', objectFit: 'contain', display: 'block' }}
                    />
                ) : null}

                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                            variant="body2"
                            sx={{ flex: 1, fontWeight: 600 }}
                        >
                            {this.getStatusText()}
                        </Typography>
                        {battery != null ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <BatteryFull sx={{ fontSize: 18, color: 'text.secondary' }} />
                                <Typography variant="body2">{battery}%</Typography>
                            </Box>
                        ) : null}
                    </Box>

                    {this.powerId ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="body2">{I18n.t('wm_On')}</Typography>
                            <MuiSwitch
                                checked={this.state.power}
                                disabled={this.isReadOnly}
                                onChange={this.togglePower}
                                size="small"
                            />
                        </Box>
                    ) : null}
                    {this.pauseId ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="body2">{I18n.t('wm_Pause')}</Typography>
                            <MuiSwitch
                                checked={this.state.paused}
                                disabled={this.isReadOnly}
                                onChange={this.togglePause}
                                size="small"
                            />
                        </Box>
                    ) : null}

                    {this.state.progress != null
                        ? WidgetVacuumCleaner.renderLevel(I18n.t('wm_Progress'), this.state.progress)
                        : null}

                    {this.renderModeSelect(
                        I18n.t('wm_Run mode'),
                        this.state.runMode,
                        this.state.runModeStates,
                        this.runModeId,
                    )}
                    {this.renderModeSelect(
                        I18n.t('wm_Cleaning mode'),
                        this.state.mode,
                        this.state.modeStates,
                        this.modeId,
                    )}
                    {this.renderModeSelect(
                        I18n.t('wm_Work mode'),
                        this.state.workMode,
                        this.state.workModeStates,
                        this.workModeId,
                    )}

                    {WidgetVacuumCleaner.renderLevel(I18n.t('wm_Water tank'), water)}
                    {WidgetVacuumCleaner.renderLevel(I18n.t('wm_Waste tank'), waste)}
                </Box>
            </Dialog>
        );
    }

    render(): React.JSX.Element {
        return (
            <>
                {super.render()}
                {this.renderVacuumDialog()}
            </>
        );
    }
}

export default WidgetVacuumCleaner;
