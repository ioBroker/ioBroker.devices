import React from 'react';
import { Box, Button, Dialog, DialogContent, IconButton, Tooltip, Typography } from '@mui/material';
import { Air, Close, PowerSettingsNew } from '@mui/icons-material';
import { I18n } from '@iobroker/gui-components';
import type { ConfigItemPanel } from '@iobroker/json-config';

import WidgetGeneric, {
    formatFloat,
    toNumberOrNull,
    type WidgetGenericProps,
    type WidgetGenericState,
} from './Generic';
import { parseCommonStates } from './commonStates';
import {
    knownLabelKey,
    POLLUTANT_NAMES,
    rankPollutants,
    resolveEnumDisplay,
    type PollutantName,
    type PollutantRow,
} from './airQualityUtils';
import { hideBaseFields } from '../configUtils';

/** Chemical symbols, not translated (matches the pattern's own role ids one-to-one) */
const POLLUTANT_SYMBOLS: Record<PollutantName, string> = {
    CO2: 'CO₂',
    TVOC: 'TVOC',
    PM1: 'PM1',
    PM25: 'PM2.5',
    PM10: 'PM10',
    CO: 'CO',
    NO2: 'NO₂',
    O3: 'O₃',
    CH2O: 'CH₂O',
    RN: 'Rn',
    SO2: 'SO₂',
};

/** 7-value AQI band scale — used on the tile face and in the dialog headline, nowhere else */
const AQI_BAND_COLORS: Record<number, string> = {
    0: '#9e9e9e', // UNKNOWN
    1: '#4caf50', // GOOD
    2: '#8bc34a', // FAIR
    3: '#ffc107', // MODERATE
    4: '#ff9800', // POOR
    5: '#f4511e', // VERY_POOR
    6: '#c62828', // EXTREMELY_POOR
};

const AQI_LABEL_KEYS: Record<string, string> = {
    UNKNOWN: 'wm_aqi_unknown',
    GOOD: 'wm_aqi_good',
    FAIR: 'wm_aqi_fair',
    MODERATE: 'wm_aqi_moderate',
    POOR: 'wm_aqi_poor',
    VERY_POOR: 'wm_aqi_very_poor',
    EXTREMELY_POOR: 'wm_aqi_extremely_poor',
};

/** 5-value LEVEL scale shared by all eleven pollutants — a separate scale from the AQI bands above */
const LEVEL_COLORS: Record<number, string> = {
    0: '#9e9e9e', // UNKNOWN
    1: '#4caf50', // LOW
    2: '#ffc107', // MEDIUM
    3: '#ff9800', // HIGH
    4: '#c62828', // CRITICAL
};

const LEVEL_LABEL_KEYS: Record<string, string> = {
    UNKNOWN: 'wm_level_unknown',
    LOW: 'wm_level_low',
    MEDIUM: 'wm_level_medium',
    HIGH: 'wm_level_high',
    CRITICAL: 'wm_level_critical',
};

/**
 * Fallback for a `*_LEVEL` datapoint that declares no `common.states` of its own (see
 * `loadLevelStates`): every `*_LEVEL` pattern declares this exact enum, so — unlike AQI, which a
 * device may report on a completely different scale — the numeric index itself is always trustworthy
 * for ranking and colouring, whatever label ends up being shown for it.
 */
/** Only what is left when the pattern itself declares no list for a LEVEL state */
const LEVEL_STATES_FALLBACK: Record<string, string> = {
    0: 'UNKNOWN',
    1: 'LOW',
    2: 'MEDIUM',
    3: 'HIGH',
    4: 'CRITICAL',
};

const HISTORY_COLOR = '#4db6ac';

interface PollutantMeta {
    valueId: string | null;
    levelId: string | null;
    unit: string;
}

interface DisplayRow {
    key: PollutantName;
    symbol: string;
    valueText: string;
    levelText: string;
    levelColor: string | undefined;
}

interface WidgetAirQualityState extends WidgetGenericState {
    /** Normally a number, but see `resolveEnumDisplay` for why a reported string must not be dropped */
    aqi: number | string | null;
    /** Parsed `common.states` of the AQI datapoint itself, empty when it declares none */
    aqiDeviceStates: Record<string, string>;
    power: boolean | null;
    pollutantValues: Partial<Record<PollutantName, number | null>>;
    pollutantLevels: Partial<Record<PollutantName, number | string | null>>;
    /** Parsed `common.states` of each `*_LEVEL` datapoint itself, only present when it declares one */
    levelDeviceStates: Partial<Record<PollutantName, Record<string, string>>>;
    actual: number | null;
    humidity: number | null;
    pressure: number | null;
    dialogOpen: boolean;
}

export class WidgetAirQuality extends WidgetGeneric<WidgetAirQualityState> {
    static override getConfigSchema(): { name: string; schema: ConfigItemPanel } {
        return {
            name: 'wm_Air quality',
            schema: { type: 'panel', items: { ...hideBaseFields('colorActive', 'color') } },
        };
    }

    private readonly aqiId: string | null;
    private readonly aqiUnit: string;
    /** `defaultStates` of the detected AQI state — fallback for a datapoint with no `common.states` */
    private readonly aqiPatternStates: Record<string, string>;
    /** The LEVEL enum as the pattern declares it, read from the states rather than assumed */
    private levelPatternStates: Record<string, string> = LEVEL_STATES_FALLBACK;
    private readonly powerId: string | null;
    private readonly pollutantMeta: Partial<Record<PollutantName, PollutantMeta>> = {};
    private readonly valueIdToName: Record<string, PollutantName> = {};
    private readonly levelIdToName: Record<string, PollutantName> = {};
    private readonly actualId: string | null;
    private readonly actualUnit: string;
    private readonly humidityId: string | null;
    private readonly humidityUnit: string;
    private readonly pressureId: string | null;
    private readonly pressureUnit: string;

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;

        const aqiState = states.find(s => s.name === 'AQI' && s.id);
        this.aqiId = aqiState?.id ?? null;
        this.aqiUnit = aqiState?.unit || '';
        this.aqiPatternStates = aqiState?.defaultStates ? parseCommonStates(aqiState.defaultStates) : {};

        this.powerId = states.find(s => s.name === 'POWER' && s.id)?.id ?? null;

        for (const name of POLLUTANT_NAMES) {
            const valueState = states.find(s => s.name === name && s.id);
            const levelState = states.find(s => s.name === `${name}_LEVEL` && s.id);
            if (levelState?.defaultStates && this.levelPatternStates === LEVEL_STATES_FALLBACK) {
                // Every LEVEL entry declares the same enum, so the first one carrying it speaks for all
                this.levelPatternStates = parseCommonStates(levelState.defaultStates);
            }
            this.pollutantMeta[name] = {
                valueId: valueState?.id ?? null,
                levelId: levelState?.id ?? null,
                unit: valueState?.unit || '',
            };
            if (valueState?.id) {
                this.valueIdToName[valueState.id] = name;
            }
            if (levelState?.id) {
                this.levelIdToName[levelState.id] = name;
            }
        }

        const actualState = states.find(s => s.name === 'ACTUAL' && s.id);
        this.actualId = actualState?.id ?? null;
        this.actualUnit = actualState?.unit || '';

        const humidityState = states.find(s => s.name === 'HUMIDITY' && s.id);
        this.humidityId = humidityState?.id ?? null;
        this.humidityUnit = humidityState?.unit || '';

        const pressureState = states.find(s => s.name === 'PRESSURE' && s.id);
        this.pressureId = pressureState?.id ?? null;
        this.pressureUnit = pressureState?.unit || '';

        this.state = {
            ...this.state,
            aqi: null,
            aqiDeviceStates: {},
            power: null,
            pollutantValues: {},
            pollutantLevels: {},
            levelDeviceStates: {},
            actual: null,
            humidity: null,
            pressure: null,
            dialogOpen: false,
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.aqiId) {
            this.props.stateContext.getState(this.aqiId, this.onAqiChange);
            void this.loadAqiStates();
        }
        if (this.powerId) {
            this.props.stateContext.getState(this.powerId, this.onPowerChange);
        }
        for (const id of Object.keys(this.valueIdToName)) {
            this.props.stateContext.getState(id, this.onPollutantValueChange);
        }
        for (const id of Object.keys(this.levelIdToName)) {
            this.props.stateContext.getState(id, this.onPollutantLevelChange);
        }
        void this.loadLevelStates();
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onActualChange);
        }
        if (this.humidityId) {
            this.props.stateContext.getState(this.humidityId, this.onHumidityChange);
        }
        if (this.pressureId) {
            this.props.stateContext.getState(this.pressureId, this.onPressureChange);
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.aqiId) {
            this.props.stateContext.removeState(this.aqiId, this.onAqiChange);
        }
        if (this.powerId) {
            this.props.stateContext.removeState(this.powerId, this.onPowerChange);
        }
        for (const id of Object.keys(this.valueIdToName)) {
            this.props.stateContext.removeState(id, this.onPollutantValueChange);
        }
        for (const id of Object.keys(this.levelIdToName)) {
            this.props.stateContext.removeState(id, this.onPollutantLevelChange);
        }
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onActualChange);
        }
        if (this.humidityId) {
            this.props.stateContext.removeState(this.humidityId, this.onHumidityChange);
        }
        if (this.pressureId) {
            this.props.stateContext.removeState(this.pressureId, this.onPressureChange);
        }
    }

    private async loadAqiStates(): Promise<void> {
        if (!this.aqiId) {
            return;
        }
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(this.aqiId)) as
                ioBroker.StateObject | null | undefined;
            const parsed = parseCommonStates(obj?.common?.states);
            if (Object.keys(parsed).length) {
                this.setState({ aqiDeviceStates: parsed });
            }
        } catch {
            // Unreadable object: the pattern's own labels, already in state, are what's left
        }
    }

    /**
     * A `*_LEVEL` datapoint's own `common.states` is a device-declared override just like AQI's —
     * the fixed 0-4 enum in `LEVEL_PATTERN_STATES` is only what's left when a device declares none.
     */
    private async loadLevelStates(): Promise<void> {
        const entries = Object.entries(this.levelIdToName);
        if (!entries.length) {
            return;
        }
        const results = await Promise.allSettled(
            entries.map(async ([id, name]) => {
                const obj = (await this.props.stateContext.getSocket().getObject(id)) as
                    ioBroker.StateObject | null | undefined;
                return { name, parsed: parseCommonStates(obj?.common?.states) };
            }),
        );
        const levelDeviceStates: Partial<Record<PollutantName, Record<string, string>>> = {};
        for (const result of results) {
            if (result.status === 'fulfilled' && Object.keys(result.value.parsed).length) {
                levelDeviceStates[result.value.name] = result.value.parsed;
            }
        }
        if (Object.keys(levelDeviceStates).length) {
            this.setState({ levelDeviceStates });
        }
    }

    // --- State change handlers ---

    private onAqiChange = (_id: string, state: ioBroker.State): void => {
        // AQI indexes a value list, like AirCondition's MODE — a device may report the index as a
        // string, and `toNumberOrNull` would silently turn that into "no reading".
        const val = state.val;
        const aqi = typeof val === 'number' || typeof val === 'string' ? val : null;
        if (aqi !== this.state.aqi) {
            this.setState({ aqi });
        }
    };

    private onPowerChange = (_id: string, state: ioBroker.State): void => {
        const power = typeof state.val === 'boolean' ? state.val : null;
        if (power !== this.state.power) {
            this.setState({ power });
        }
    };

    private onPollutantValueChange = (id: string, state: ioBroker.State): void => {
        const name = this.valueIdToName[id];
        if (!name) {
            return;
        }
        const value = toNumberOrNull(state.val);
        if (this.state.pollutantValues[name] !== value) {
            this.setState(prev => ({ pollutantValues: { ...prev.pollutantValues, [name]: value } }));
        }
    };

    private onPollutantLevelChange = (id: string, state: ioBroker.State): void => {
        const name = this.levelIdToName[id];
        if (!name) {
            return;
        }
        const val = state.val;
        const level = typeof val === 'number' || typeof val === 'string' ? val : null;
        if (this.state.pollutantLevels[name] !== level) {
            this.setState(prev => ({ pollutantLevels: { ...prev.pollutantLevels, [name]: level } }));
        }
    };

    private onActualChange = (_id: string, state: ioBroker.State): void => {
        const actual = toNumberOrNull(state.val);
        if (actual !== this.state.actual) {
            this.setState({ actual });
        }
    };

    private onHumidityChange = (_id: string, state: ioBroker.State): void => {
        const humidity = toNumberOrNull(state.val);
        if (humidity !== this.state.humidity) {
            this.setState({ humidity });
        }
    };

    private onPressureChange = (_id: string, state: ioBroker.State): void => {
        const pressure = toNumberOrNull(state.val);
        if (pressure !== this.state.pressure) {
            this.setState({ pressure });
        }
    };

    // --- Actions ---

    private togglePower = (): void => {
        if (!this.powerId) {
            return;
        }
        void this.setValue(this.powerId, !this.state.power);
    };

    /** True once the device is known to be off — not merely "hasn't reported power yet" */
    private isPoweredOff(): boolean {
        return !!this.powerId && this.state.power != null && !this.state.power;
    }

    // --- Formatting ---

    /** A concentration or ambient reading at the scale the device declared, never inventing a unit */
    private formatByUnit(value: number | null, unit: string): string {
        if (value == null) {
            return '—';
        }
        const abs = Math.abs(value);
        const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
        const str = formatFloat(value, decimals, this.props.stateContext.isFloatComma);
        return unit ? `${str} ${unit}` : str;
    }

    private resolveAqiDisplay(): { text: string; color: string } {
        const resolved = resolveEnumDisplay(
            this.state.aqi,
            this.state.aqiDeviceStates,
            this.aqiPatternStates,
            this.aqiUnit,
            value => formatFloat(value, 0, this.props.stateContext.isFloatComma),
        );
        if (resolved.band == null) {
            return { text: resolved.text, color: this.state.aqi == null ? 'text.disabled' : 'text.primary' };
        }
        const key = knownLabelKey(resolved.text, AQI_LABEL_KEYS);
        if (!key) {
            // A label was found, but not one of the seven bands this scale means — a device using its
            // own wording, or a value list on a different scale entirely (e.g. a 0-500 index that
            // happens to declare states) carries no severity this scale can colour.
            return { text: resolved.text, color: 'text.primary' };
        }
        return { text: I18n.t(key), color: AQI_BAND_COLORS[resolved.band] ?? 'text.primary' };
    }

    private getPollutantRows(): DisplayRow[] {
        const rows: PollutantRow[] = POLLUTANT_NAMES.map(name => {
            const meta = this.pollutantMeta[name];
            return {
                name,
                hasValue: !!meta?.valueId,
                value: this.state.pollutantValues[name] ?? null,
                hasLevel: !!meta?.levelId,
                level: this.state.pollutantLevels[name] ?? null,
            };
        }).filter(row => row.hasValue || row.hasLevel);

        return rankPollutants(rows).map(row => {
            const meta = this.pollutantMeta[row.name];
            const valueText = row.hasValue ? this.formatByUnit(row.value, meta?.unit || '') : '—';

            let levelText = '—';
            let levelColor: string | undefined;
            if (row.hasLevel) {
                const deviceStates = this.state.levelDeviceStates[row.name] ?? {};
                const resolved = resolveEnumDisplay(row.level, deviceStates, this.levelPatternStates, '', String);
                if (resolved.band != null) {
                    const key = knownLabelKey(resolved.text, LEVEL_LABEL_KEYS);
                    levelText = key ? I18n.t(key) : resolved.text;
                    levelColor = LEVEL_COLORS[resolved.band];
                } else {
                    levelText = resolved.text;
                }
            }

            return { key: row.name, symbol: POLLUTANT_SYMBOLS[row.name], valueText, levelText, levelColor };
        });
    }

    // --- Tile ---

    protected getHistoryIds(): { id: string; color: string }[] {
        return this.aqiId ? [{ id: this.aqiId, color: HISTORY_COLOR }] : [];
    }

    protected getChartUnit(): string | undefined {
        return this.aqiUnit || undefined;
    }

    protected isTileActive(): boolean {
        return !this.isPoweredOff() && this.state.aqi != null;
    }

    // eslint-disable-next-line class-methods-use-this
    protected hasTileAction(): boolean {
        return true;
    }

    /**
     * Every reading here is read-only, but they are still this device's readings — a user who may
     * not operate it may still read them, so the dialog opens regardless of ACL. POWER, the one
     * control inside, stays gated by `disabled={this.isReadOnly}` and by `setValue()` itself.
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
        const { color } = this.resolveAqiDisplay();
        return <Air sx={{ color, transition: 'color 0.25s ease' }} />;
    }

    private renderAqiFace(variant: 'caption' | 'h5'): React.JSX.Element {
        const { text, color } = this.resolveAqiDisplay();
        // A reading from a device that is off is the last one it took, not the air now. The dialog
        // dims the same value for the same reason; a band left at full strength reads as current.
        const dimmed = this.isPoweredOff() ? { opacity: 0.6 } : undefined;
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ...dimmed }}>
                {this.isPoweredOff() ? (
                    <Tooltip title={I18n.t('wm_On/Off')}>
                        <PowerSettingsNew sx={{ fontSize: variant === 'caption' ? 14 : 16, color: 'text.disabled' }} />
                    </Tooltip>
                ) : null}
                <Typography
                    variant={variant}
                    sx={{
                        fontWeight: variant === 'caption' ? 600 : 700,
                        ...(variant === 'caption' ? { fontSize: '1.1rem', lineHeight: 1.2 } : {}),
                        color,
                        whiteSpace: 'nowrap',
                    }}
                >
                    {text}
                </Typography>
            </Box>
        );
    }

    protected renderTileStatus(): React.JSX.Element | null {
        // Every layout but the 1x1 shows the reading through renderTileAction — rendering it here as
        // well would print it twice on one tile.
        const size = this.props.settings?.size || '1x1';
        if (size !== '1x1') {
            return null;
        }
        return this.renderAqiFace('caption');
    }

    protected renderTileAction(): React.JSX.Element {
        return this.renderAqiFace('h5');
    }

    // --- Dialog ---

    // eslint-disable-next-line class-methods-use-this
    private renderPollutantRow(row: DisplayRow): React.JSX.Element {
        return (
            <Box
                key={row.key}
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 0.6,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary' }}
                >
                    {row.symbol}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, minWidth: 64, textAlign: 'right' }}
                    >
                        {row.valueText}
                    </Typography>
                    <Box
                        sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: '10px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            minWidth: 64,
                            textAlign: 'center',
                            color: row.levelColor ? '#fff' : 'text.disabled',
                            backgroundColor: row.levelColor || 'transparent',
                            border: row.levelColor ? 'none' : '1px solid',
                            borderColor: row.levelColor ? 'transparent' : 'divider',
                        }}
                    >
                        {row.levelText}
                    </Box>
                </Box>
            </Box>
        );
    }

    private renderAmbientRows(): React.JSX.Element | null {
        const rows: { key: string; label: string; text: string }[] = [];
        if (this.actualId) {
            rows.push({
                key: 'actual',
                label: I18n.t('wm_Actual temperature'),
                text: this.formatByUnit(this.state.actual, this.actualUnit),
            });
        }
        if (this.humidityId) {
            rows.push({
                key: 'humidity',
                label: I18n.t('wm_Humidity'),
                text: this.formatByUnit(this.state.humidity, this.humidityUnit),
            });
        }
        if (this.pressureId) {
            rows.push({
                key: 'pressure',
                label: I18n.t('wm_Pressure'),
                text: this.formatByUnit(this.state.pressure, this.pressureUnit),
            });
        }
        if (!rows.length) {
            return null;
        }
        return (
            <Box>
                {rows.map(row => (
                    <Box
                        key={row.key}
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            py: 0.6,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <Typography
                            variant="body2"
                            sx={{ color: 'text.secondary' }}
                        >
                            {row.label}
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{ fontWeight: 600 }}
                        >
                            {row.text}
                        </Typography>
                    </Box>
                ))}
            </Box>
        );
    }

    private renderControlDialog(): React.JSX.Element | null {
        if (!this.state.dialogOpen) {
            return null;
        }

        const { name, power } = this.state;
        const { text: aqiText, color: aqiColor } = this.resolveAqiDisplay();
        const dimmedSx = this.isPoweredOff() ? { opacity: 0.6, transition: 'opacity 0.25s ease' } : {};
        const pollutantRows = this.getPollutantRows();
        const ambientRows = this.renderAmbientRows();

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

                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2, ...dimmedSx }}>
                        <Air sx={{ fontSize: 56, color: aqiColor }} />
                        <Typography
                            variant="h5"
                            sx={{ fontWeight: 700, color: aqiColor, mt: 0.5, textAlign: 'center' }}
                        >
                            {aqiText}
                        </Typography>
                    </Box>

                    {this.powerId ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                            <Button
                                variant={power ? 'contained' : 'outlined'}
                                color={power ? 'success' : 'inherit'}
                                startIcon={<PowerSettingsNew />}
                                disabled={this.isReadOnly}
                                onClick={this.togglePower}
                                size="small"
                                sx={{ textTransform: 'none', borderRadius: '20px' }}
                            >
                                {I18n.t('wm_On/Off')}
                            </Button>
                        </Box>
                    ) : null}

                    {pollutantRows.length ? (
                        <Box sx={{ mb: ambientRows ? 2 : 0, ...dimmedSx }}>
                            {pollutantRows.map(row => this.renderPollutantRow(row))}
                        </Box>
                    ) : null}

                    {ambientRows ? <Box sx={dimmedSx}>{ambientRows}</Box> : null}
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

export default WidgetAirQuality;
