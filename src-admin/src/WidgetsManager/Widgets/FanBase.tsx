import React from 'react';
import { Box, Button, Dialog, DialogContent, IconButton, Slider, TextField, Tooltip, Typography } from '@mui/material';
import { Air, Close, PowerSettingsNew, SwapHoriz, SwapVert } from '@mui/icons-material';
import { I18n } from '@iobroker/gui-components';

import WidgetGeneric, { toNumberOrNull, type WidgetGenericProps, type WidgetGenericState } from './Generic';
import { parseCommonStates, stateKeyToValue } from './commonStates';
import { clampToRange, explicitRangeFromCommon, type SetpointRange as NumericRange } from './climate';

/**
 * Control surface shared by `fan` and `airPurifier`: both declare the identical SPEED / POWER /
 * SPEED_LEVEL / SWING / AIRFLOW_DIRECTION states (verified against the installed type-detector).
 * `airPurifier` adds only a filter reading, which `WidgetGeneric`'s "i" dialog already renders via
 * `EXTRA_INFO_NAMES` — nothing filter-specific belongs here.
 */
export interface WidgetFanBaseState extends WidgetGenericState {
    power: boolean | number | null;
    speed: string | number | null;
    speedStates: Record<string, string>;
    /** Fallback scale for a SPEED datapoint that declares no `common.states` of its own */
    speedRange: NumericRange | null;
    /** What the user has typed into the last-resort speed field but not committed yet */
    speedDraft: string | null;
    speedLevel: number | null;
    speedLevelRange: NumericRange;
    speedLevelUnit: string;
    swing: string | number | boolean | null;
    swingStates: Record<string, string>;
    swingIsBoolean: boolean;
    airflow: string | number | null;
    airflowStates: Record<string, string>;
    dialogOpen: boolean;
}

export abstract class WidgetFanBase extends WidgetGeneric<WidgetFanBaseState> {
    private readonly powerId: string | null;
    private readonly speedId: string | null;
    private readonly speedLevelId: string | null;
    private readonly swingId: string | null;
    private readonly airflowId: string | null;
    /** `common.type` of the power datapoint — POWER is `boolean|number`, and the write must match it */
    private powerIsNumber = false;
    /**
     * Whether that type is known yet.
     *
     * Until it is, the widget cannot tell a `boolean` datapoint from a `number` one, and writing the
     * wrong one is a write the device may reject. The control stays disabled rather than guessing.
     */
    private powerTypeKnown = false;
    private readonly patternSpeedStates: Record<string, string>;
    private readonly patternSwingStates: Record<string, string>;
    private readonly patternAirflowStates: Record<string, string>;
    /**
     * `common.type` behind a SWING value list — a boolean datapoint that ships its own two labels
     * still needs a boolean write, not the string `stateKeyToValue` produces for a non-numeric key.
     */
    private swingListIsBoolean = false;
    /** Held while a slider drag is in progress, so the device's own echo cannot fight the pointer */
    private speedDragging = false;
    private speedLevelDragging = false;

    /**
     * The value list the *pattern* declares for a state, as a label map.
     *
     * `statesDefined` — the flag saying whether a device must use these values — is stripped before
     * the widget sees the state, so this is a fallback for a datapoint that declares nothing, never an
     * override of one that does.
     *
     * @param state The detected state, if the device has it
     * @returns Value → label, empty when the pattern declares no list
     */
    private static patternStates(
        state: { defaultStates?: Record<string, string> } | undefined,
    ): Record<string, string> {
        return state?.defaultStates ? parseCommonStates(state.defaultStates) : {};
    }

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;
        this.powerId = states.find(s => s.name === 'POWER' && s.id)?.id ?? null;
        this.speedId = states.find(s => s.name === 'SPEED' && s.id)?.id ?? null;
        const speedLevelState = states.find(s => s.name === 'SPEED_LEVEL' && s.id);
        this.speedLevelId = speedLevelState?.id ?? null;
        // SWING is declared twice — a numeric `level.mode.swing` list, then a boolean
        // `switch.mode.swing` toggle. The backend drops any entry whose pattern went unmatched before
        // `control.states` reaches the widget, so normally only one of the two survives; a device that
        // genuinely offers both keeps two real ids, and — entries keeping pattern-declaration order —
        // the numeric one is found first, so the richer list wins over the plain toggle.
        const swingState = states.find(s => s.name === 'SWING' && s.id);
        this.swingId = swingState?.id ?? null;
        const airflowState = states.find(s => s.name === 'AIRFLOW_DIRECTION' && s.id);
        this.airflowId = airflowState?.id ?? null;
        // A datapoint is not obliged to declare `common.states`, and a value list with no entries is
        // no control at all. The pattern's own labels are what these values mean, so they stand in for
        // a datapoint that declares none — applied once the object has been read, never before, since
        // a boolean SWING can take none of them.
        this.patternSpeedStates = WidgetFanBase.patternStates(states.find(s => s.name === 'SPEED' && s.id));
        this.patternSwingStates = WidgetFanBase.patternStates(swingState);
        this.patternAirflowStates = WidgetFanBase.patternStates(airflowState);

        this.state = {
            ...this.state,
            power: null,
            speed: null,
            speedStates: {},
            speedRange: null,
            speedDraft: null,
            speedLevel: null,
            speedLevelRange: { min: 0, max: 100, step: 1 },
            // The backend fills `unit` on the detected state itself, so the widget can show it before
            // the datapoint's object has even been fetched. Left blank rather than defaulted to '%':
            // the pattern's defaultUnit is only a suggestion, and printing one the device never
            // reported would state something it never said.
            speedLevelUnit: speedLevelState?.unit || '',
            swing: null,
            swingStates: {},
            swingIsBoolean: false,
            airflow: null,
            airflowStates: {},
            dialogOpen: false,
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.powerId) {
            this.props.stateContext.getState(this.powerId, this.onPowerChange);
            void this.loadPowerType();
        }
        if (this.speedId) {
            this.props.stateContext.getState(this.speedId, this.onSpeedChange);
            void this.loadSpeedMeta();
        }
        if (this.speedLevelId) {
            this.props.stateContext.getState(this.speedLevelId, this.onSpeedLevelChange);
            void this.loadSpeedLevelRange();
        }
        if (this.swingId) {
            this.props.stateContext.getState(this.swingId, this.onSwingChange);
            void this.loadSwingObject();
        }
        if (this.airflowId) {
            this.props.stateContext.getState(this.airflowId, this.onAirflowChange);
            void this.loadAirflowStates();
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.powerId) {
            this.props.stateContext.removeState(this.powerId, this.onPowerChange);
        }
        if (this.speedId) {
            this.props.stateContext.removeState(this.speedId, this.onSpeedChange);
        }
        if (this.speedLevelId) {
            this.props.stateContext.removeState(this.speedLevelId, this.onSpeedLevelChange);
        }
        if (this.swingId) {
            this.props.stateContext.removeState(this.swingId, this.onSwingChange);
        }
        if (this.airflowId) {
            this.props.stateContext.removeState(this.airflowId, this.onAirflowChange);
        }
    }

    private async loadPowerType(): Promise<void> {
        if (!this.powerId) {
            return;
        }
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(this.powerId)) as
                | ioBroker.StateObject
                | null
                | undefined;
            if (obj?.common?.type === 'number' || obj?.common?.type === 'boolean') {
                this.powerIsNumber = obj.common.type === 'number';
                this.powerTypeKnown = true;
                this.forceUpdate();
            }
        } catch {
            // Unreadable object: `onPowerChange` still infers the type from the first live value
        }
    }

    private async loadAirflowStates(): Promise<void> {
        if (!this.airflowId) {
            return;
        }
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(this.airflowId)) as
                | ioBroker.StateObject
                | null
                | undefined;
            const parsed = parseCommonStates(obj?.common?.states);
            this.setState({ airflowStates: Object.keys(parsed).length ? parsed : this.patternAirflowStates });
        } catch {
            this.setState({ airflowStates: this.patternAirflowStates });
        }
    }

    /**
     * SPEED is the one state both patterns require, so it must stay controllable even when the
     * datapoint declares neither a value list nor a range: falling back to a plain number field keeps
     * it writable instead of leaving the device's only mandatory control unreachable.
     */
    private async loadSpeedMeta(): Promise<void> {
        if (!this.speedId) {
            return;
        }
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(this.speedId)) as
                | ioBroker.StateObject
                | null
                | undefined;
            const parsed = parseCommonStates(obj?.common?.states);
            if (Object.keys(parsed).length) {
                this.setState({ speedStates: parsed });
                return;
            }
            // A declared range beats the pattern's labels: it is this device's own statement about
            // what the datapoint accepts, where the labels are only what the pattern expects.
            const range = explicitRangeFromCommon(obj?.common);
            if (range) {
                this.setState({ speedRange: range });
                return;
            }
            this.setState({ speedStates: this.patternSpeedStates });
        } catch {
            this.setState({ speedStates: this.patternSpeedStates });
        }
    }

    private async loadSpeedLevelRange(): Promise<void> {
        if (!this.speedLevelId) {
            return;
        }
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(this.speedLevelId)) as
                | ioBroker.StateObject
                | null
                | undefined;
            const range = explicitRangeFromCommon(obj?.common);
            if (range) {
                this.setState({ speedLevelRange: range });
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
                const parsed = parseCommonStates(obj.common.states);
                // A boolean datapoint that ships its own two labels is still a list, not a switch
                const isBoolean = obj.common.type === 'boolean' && !Object.keys(parsed).length;
                this.swingListIsBoolean = obj.common.type === 'boolean';
                this.setState({ swingIsBoolean: isBoolean });
                if (isBoolean) {
                    // A toggle, so the pattern's four-way list would offer values it cannot take
                    this.setState({ swingStates: {} });
                } else {
                    this.setState({ swingStates: Object.keys(parsed).length ? parsed : this.patternSwingStates });
                }
            }
        } catch {
            // Unreadable object: the pattern's labels are all the widget knows, and they beat no control
            this.setState({ swingStates: this.patternSwingStates });
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

    private onSpeedChange = (_id: string, state: ioBroker.State): void => {
        if (this.speedDragging) {
            return;
        }
        const val = state.val;
        const speed = typeof val === 'number' || typeof val === 'string' ? val : null;
        if (speed !== this.state.speed) {
            this.setState({ speed });
        }
    };

    private onSpeedLevelChange = (_id: string, state: ioBroker.State): void => {
        if (this.speedLevelDragging) {
            return;
        }
        const speedLevel = toNumberOrNull(state.val);
        if (speedLevel !== this.state.speedLevel) {
            this.setState({ speedLevel });
        }
    };

    private onSwingChange = (_id: string, state: ioBroker.State): void => {
        const val = state.val;
        const swing = typeof val === 'number' || typeof val === 'boolean' || typeof val === 'string' ? val : null;
        if (swing !== this.state.swing) {
            this.setState({ swing });
        }
    };

    private onAirflowChange = (_id: string, state: ioBroker.State): void => {
        const val = state.val;
        const airflow = typeof val === 'number' || typeof val === 'string' ? val : null;
        if (airflow !== this.state.airflow) {
            this.setState({ airflow });
        }
    };

    // --- Actions ---
    //
    // None of these update state optimistically: the subscription above reports what the device
    // actually accepted, and a rejected write must not leave a control showing a value the device
    // never took. The SPEED range-fallback slider and the SPEED_LEVEL slider are the exception during
    // an active drag — they must track the pointer — which is why each carries its own dragging guard.

    /**
     * Closing the dialog also ends any drag it held.
     *
     * A slider drag that ends by pointer-cancel rather than by a commit event never clears its guard,
     * and a set guard makes the widget ignore the device's own updates from then on.
     */
    private closeDialog = (): void => {
        this.speedDragging = false;
        this.speedLevelDragging = false;
        this.setState({ dialogOpen: false });
    };

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

    private setSpeed = (value: string | number): void => {
        if (this.speedId) {
            void this.setValue(this.speedId, value);
        }
    };

    private commitSpeedDraft(): void {
        const draft = this.state.speedDraft;
        if (draft === null) {
            return;
        }
        this.setState({ speedDraft: null });
        if (draft.trim() === '') {
            return;
        }
        const value = Number(draft.replace(',', '.'));
        if (!isNaN(value)) {
            this.setSpeed(value);
        }
    }

    private setSpeedLevel = (value: number): void => {
        if (this.speedLevelId) {
            void this.setValue(this.speedLevelId, clampToRange(value, this.state.speedLevelRange));
        }
    };

    private setSwing = (value: string | number | boolean): void => {
        if (this.swingId) {
            void this.setValue(this.swingId, value);
        }
    };

    private setAirflow = (value: string | number): void => {
        if (this.airflowId) {
            void this.setValue(this.airflowId, value);
        }
    };

    /**
     * A list entry's key, as `stateKeyToValue` reads it — coerced for a boolean datapoint that ships
     * its own labels.
     *
     * Only `0`/`1` and `false`/`true` carry a meaning a boolean datapoint can take. Any other key
     * (`{"Off":"Off","On":"On"}`) says nothing about which of the two it is, and mapping the
     * unrecognised ones all to `false` would leave the second option unreachable — so the list keeps
     * its own keys and the datapoint decides.
     *
     * @param key Key from the value list
     * @param keys Every key in that list, in order
     * @returns The value to write
     */
    private swingListValue(key: string, keys: string[]): string | number | boolean {
        const value = stateKeyToValue(key);
        if (!this.swingListIsBoolean) {
            return value;
        }
        if (typeof value === 'number') {
            return value !== 0;
        }
        const lower = value.toLowerCase();
        if (lower === 'true' || lower === 'false') {
            return lower === 'true';
        }
        // Exactly two unrecognised keys on a boolean datapoint can only be off then on, in order
        return keys.length === 2 ? keys.indexOf(key) === 1 : value;
    }

    // --- Label helpers (mirror WidgetAirCondition's fan-related label maps; kept separate since
    // AirCondition.tsx is out of scope for this change — shared only between Fan and AirPurifier) ---

    private static readonly SPEED_MAP: Record<string, string> = {
        auto: 'wm_speed_auto',
        high: 'wm_speed_high',
        low: 'wm_speed_low',
        medium: 'wm_speed_medium',
        quiet: 'wm_speed_quiet',
        turbo: 'wm_speed_turbo',
    };

    private static getSpeedLabel(label: string): string {
        const key = WidgetFanBase.SPEED_MAP[label.toLowerCase().trim()];
        return key ? I18n.t(key) : label;
    }

    private static readonly SWING_MAP: Record<string, string> = {
        auto: 'wm_swing_auto',
        horizontal: 'wm_swing_horizontal',
        stationary: 'wm_swing_stationary',
        vertical: 'wm_swing_vertical',
    };

    private static getSwingLabel(label: string): string {
        const key = WidgetFanBase.SWING_MAP[label.toLowerCase().trim()];
        return key ? I18n.t(key) : label;
    }

    private static readonly AIRFLOW_MAP: Record<string, string> = {
        forward: 'wm_airflow_forward',
        reverse: 'wm_airflow_reverse',
    };

    private static getAirflowLabel(label: string): string {
        const key = WidgetFanBase.AIRFLOW_MAP[label.toLowerCase().trim()];
        return key ? I18n.t(key) : label;
    }

    private getCurrentSpeedLabel(): string | null {
        const { speed, speedStates } = this.state;
        if (speed == null) {
            return null;
        }
        return speedStates[String(speed)] || null;
    }

    /** True once the device is known to be off — not merely "hasn't reported power yet" */
    protected isPoweredOff(): boolean {
        return !!this.powerId && this.state.power != null && !this.state.power;
    }

    // --- Tile overrides ---

    protected isTileActive(): boolean {
        return !this.isPoweredOff() && (this.state.speed != null || this.state.speedLevel != null);
    }

    // eslint-disable-next-line class-methods-use-this
    protected hasTileAction(): boolean {
        return true;
    }

    /**
     * Openable even for a read-only widget, unlike the base rule.
     *
     * The dialog is where a device's own readings are shown, and those stay readable for someone who
     * may not operate it. Every control inside is disabled independently.
     */
    protected tileClickable(): boolean {
        return this.hasTileAction();
    }

    protected onTileClick(): void {
        this.setState({ dialogOpen: true });
    }

    /** Default icon for the device type; overridden per subclass, used when no custom icon is set */
    protected abstract renderTypeIcon(): React.JSX.Element;

    protected renderTileIcon(): React.JSX.Element {
        return this.renderBaseIcon() ?? this.renderTypeIcon();
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
        const { speedLevel, speedLevelUnit } = this.state;
        const speedLabel = this.getCurrentSpeedLabel();
        const speedNumeric = typeof this.state.speed === 'number' ? this.state.speed : null;
        const speedText = speedLabel
            ? WidgetFanBase.getSpeedLabel(speedLabel)
            : speedNumeric != null
              ? String(Math.round(speedNumeric))
              : null;
        const poweredOff = this.isPoweredOff();
        const hasAnyReading = poweredOff || speedText != null || speedLevel != null;
        const iconSize = variant === 'caption' ? 12 : 14;

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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {poweredOff ? (
                        <Tooltip title={I18n.t('wm_On/Off')}>
                            <PowerSettingsNew sx={{ fontSize: iconSize + 2, color: 'text.disabled' }} />
                        </Tooltip>
                    ) : null}
                    {speedText ? (
                        <Typography
                            variant={variant}
                            sx={{
                                fontWeight: 500,
                                color: 'text.secondary',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                            }}
                        >
                            <Air sx={{ fontSize: iconSize, verticalAlign: 'middle' }} />
                            {speedText}
                        </Typography>
                    ) : null}
                </Box>
                {speedLevel != null ? (
                    <Typography
                        variant={variant}
                        sx={{ color: 'text.secondary' }}
                    >
                        {Math.round(speedLevel)}
                        {speedLevelUnit ? ` ${speedLevelUnit}` : ''}
                    </Typography>
                ) : null}
            </Box>
        );
    }

    protected getHistoryIds(): { id: string; color: string }[] {
        return this.speedLevelId ? [{ id: this.speedLevelId, color: '#4fc3f7' }] : [];
    }

    protected getChartUnit(): string | undefined {
        return this.speedLevelId ? this.state.speedLevelUnit : undefined;
    }

    // --- Control dialog ---

    /**
     * SPEED, in whichever shape the datapoint actually offers: a labelled list, a declared numeric
     * range, or — lacking both — a plain number field, so the one required control is never dropped.
     */
    private renderSpeedControl(dimmedSx: Record<string, unknown>): React.JSX.Element | null {
        if (!this.speedId) {
            return null;
        }
        const { speed, speedStates, speedRange, speedDraft } = this.state;
        const speedEntries = Object.entries(speedStates);

        return (
            <Box sx={{ mb: 2 }}>
                <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, mb: 0.75, color: 'text.secondary' }}
                >
                    <Air sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                    {I18n.t('wm_Speed')}
                </Typography>
                {speedEntries.length > 0 ? (
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
                                    disabled={this.isReadOnly}
                                    onClick={() => this.setSpeed(value)}
                                    size="small"
                                    sx={{ textTransform: 'none', borderRadius: '20px', minWidth: 0, px: 1.5 }}
                                >
                                    {WidgetFanBase.getSpeedLabel(label)}
                                </Button>
                            );
                        })}
                    </Box>
                ) : speedRange ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, ...dimmedSx }}>
                        <Slider
                            disabled={this.isReadOnly}
                            value={typeof speed === 'number' ? speed : speedRange.min}
                            min={speedRange.min}
                            max={speedRange.max}
                            step={speedRange.step}
                            valueLabelDisplay="auto"
                            onChange={(_e, value) => {
                                if (!Array.isArray(value)) {
                                    this.speedDragging = true;
                                    this.setState({ speed: value });
                                }
                            }}
                            onChangeCommitted={(_e, value) => {
                                this.speedDragging = false;
                                if (!Array.isArray(value)) {
                                    this.setSpeed(value);
                                }
                            }}
                            sx={{ flex: 1 }}
                        />
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', ...dimmedSx }}>
                        <TextField
                            variant="standard"
                            type="number"
                            size="small"
                            disabled={this.isReadOnly}
                            value={speedDraft ?? (typeof speed === 'number' ? speed : '')}
                            onChange={e => this.setState({ speedDraft: e.target.value })}
                            onBlur={() => this.commitSpeedDraft()}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    this.commitSpeedDraft();
                                }
                            }}
                            slotProps={{ htmlInput: { style: { textAlign: 'right', width: 80 } } }}
                        />
                    </Box>
                )}
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
            speedLevel,
            speedLevelRange,
            speedLevelUnit,
            swing,
            swingStates,
            swingIsBoolean,
            airflow,
            airflowStates,
        } = this.state;
        const airflowEntries = Object.entries(airflowStates);
        const swingEntries = Object.entries(swingStates);
        const swingKeys = swingEntries.map(([key]) => key);
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

                    {this.renderSpeedControl(dimmedSx)}

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
                                            this.speedLevelDragging = true;
                                            this.setState({ speedLevel: value });
                                        }
                                    }}
                                    onChangeCommitted={(_e, value) => {
                                        this.speedLevelDragging = false;
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
                                            {WidgetFanBase.getAirflowLabel(label)}
                                        </Button>
                                    );
                                })}
                            </Box>
                        </Box>
                    ) : null}

                    {this.swingId && (swingIsBoolean || swingEntries.length > 0) ? (
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
                                        disabled={this.isReadOnly}
                                        onClick={() => this.setSwing(!swing)}
                                        size="small"
                                        sx={{ textTransform: 'none', borderRadius: '20px' }}
                                    >
                                        {swing ? I18n.t('wm_On') : I18n.t('wm_Off')}
                                    </Button>
                                </Box>
                            ) : (
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
                                        const value = this.swingListValue(key, swingKeys);
                                        const isActive = swing != null && String(swing) === key;
                                        return (
                                            <Button
                                                key={key}
                                                variant={isActive ? 'contained' : 'outlined'}
                                                color={isActive ? 'primary' : 'inherit'}
                                                disabled={this.isReadOnly}
                                                onClick={() => this.setSwing(value)}
                                                size="small"
                                                sx={{
                                                    textTransform: 'none',
                                                    borderRadius: '20px',
                                                    minWidth: 0,
                                                    px: 1.5,
                                                }}
                                            >
                                                {WidgetFanBase.getSwingLabel(label)}
                                            </Button>
                                        );
                                    })}
                                </Box>
                            )}
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

export default WidgetFanBase;
