import React from 'react';
import { Box, Button, ButtonBase, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Tooltip, Typography, } from '@mui/material';
import { ArrowDownward, ArrowUpward, Backspace, BatteryAlert, Battery20, Battery50, Battery80, BatteryFull, Build, Close, Error as ErrorIcon, InfoOutlined, LinkOff, Settings, Sync, TrendingDown, TrendingFlat, TrendingUp, WifiOff, } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { I18n, Icon } from '@iobroker/adapter-react-v5';
import moment from 'moment/min/moment-with-locales';
import { WidgetGeneric as WidgetGenericBase, } from '../../../../packages/dm-widgets/src/index';
import { normalizeColor } from '../Utils';
import ChartDialog, { smoothData } from './ChartDialog';
/** Resolve an ioBroker StringOrTranslated value to a plain string */
export function resolveTranslated(text, language) {
    if (!text) {
        return '';
    }
    if (typeof text === 'string') {
        return text;
    }
    return (language && text[language]) || text.en || Object.values(text)[0] || '';
}
/**
 * Format a number for display, replacing '.' with ',' when isFloatComma is true.
 * Use ONLY for user-visible text — never for SVG paths, API calls, or CSS values.
 */
export function formatFloat(value, decimals, isFloatComma) {
    const str = value.toFixed(decimals);
    return isFloatComma ? str.replace('.', ',') : str;
}
const INDICATOR_NAMES = [
    'WORKING',
    'UNREACH',
    'LOWBAT',
    'MAINTAIN',
    'ERROR',
    'DIRECTION',
    'CONNECTED',
    'BATTERY',
];
const INDICATOR_ICON_SIZE = 14;
/** Extra info state names — shown in "i" dialog when present on a device */
const EXTRA_INFO_NAMES = ['ELECTRIC_POWER', 'CURRENT', 'VOLTAGE', 'CONSUMPTION', 'FREQUENCY'];
const EXTRA_INFO_LABELS = {
    ELECTRIC_POWER: 'wm_Power',
    CURRENT: 'wm_Current',
    VOLTAGE: 'wm_Voltage',
    CONSUMPTION: 'wm_Consumption',
    FREQUENCY: 'wm_Frequency',
};
/** Check if the current theme is the neumorphic "styling-grey" preset */
export function isNeumorphicTheme(theme) {
    return theme.wmPreset === 'styling-grey';
}
export function getTileStyles(theme, isActive, accentColor, interactive = true, inactiveColor) {
    const accent = accentColor || theme.palette.primary.main;
    const isDark = theme.palette.mode === 'dark';
    // Neumorphic styling for styling-grey theme
    if (isNeumorphicTheme(theme)) {
        return {
            borderRadius: '24px',
            boxSizing: 'border-box',
            padding: theme.spacing(2),
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            backgroundColor: isActive ? alpha(accent, 0.08) : 'linear-gradient(145deg, #1e1e20, #1a1a1c)',
            background: isActive
                ? `linear-gradient(145deg, ${alpha(accent, 0.1)}, ${alpha(accent, 0.04)})`
                : 'linear-gradient(145deg, #1e1e20, #1a1a1c)',
            border: `1px solid ${alpha(theme.palette.common.white, 0.04)}`,
            boxShadow: isActive
                ? `6px 6px 16px rgba(0,0,0,0.5), -3px -3px 10px rgba(255,255,255,0.025), inset 0 0 0 1px ${alpha(accent, 0.1)}`
                : '6px 6px 16px rgba(0,0,0,0.5), -3px -3px 10px rgba(255,255,255,0.025)',
            ...(interactive ? { '&:active': { transform: 'scale(0.97)' } } : {}),
        };
    }
    let bgInactive;
    let borderInactive;
    if (inactiveColor) {
        bgInactive = alpha(inactiveColor, 0.12);
        borderInactive = alpha(inactiveColor, 0.3);
    }
    else {
        bgInactive = isDark ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.035);
        borderInactive = isDark ? alpha(theme.palette.common.white, 0.08) : alpha(theme.palette.common.black, 0.08);
    }
    return {
        borderRadius: '16px',
        boxSizing: 'border-box',
        padding: theme.spacing(2),
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        backgroundColor: isActive ? alpha(accent, 0.12) : bgInactive,
        border: `1.5px solid ${isActive ? alpha(accent, 0.3) : borderInactive}`,
        ...(interactive ? { '&:active': { transform: 'scale(0.97)' } } : {}),
    };
}
/**
 * PinPad dialog with a numeric keypad for PIN entry.
 * Can be used standalone in any widget.
 */
export function PinPadDialog(props) {
    const { open, pin, onSuccess, onClose } = props;
    const [pinInput, setPinInput] = React.useState('');
    const [pinError, setPinError] = React.useState(false);
    // Reset state when dialog opens
    React.useEffect(() => {
        if (open) {
            setPinInput('');
            setPinError(false);
        }
    }, [open]);
    if (!open) {
        return null;
    }
    const pinLength = pin.length || 4;
    const dots = Array.from({ length: pinLength }, (_, i) => i < pinInput.length);
    const onDigit = (digit) => {
        const next = pinInput + digit;
        if (next.length >= pin.length) {
            if (next === pin) {
                setPinInput('');
                setPinError(false);
                onSuccess();
            }
            else {
                setPinInput('');
                setPinError(true);
                setTimeout(() => setPinError(false), 600);
            }
        }
        else {
            setPinInput(next);
            setPinError(false);
        }
    };
    const onBackspace = () => {
        setPinInput(prev => prev.slice(0, -1));
        setPinError(false);
    };
    const keys = [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['', '0', 'back'],
    ];
    return (React.createElement(Dialog, { open: true, onClose: onClose, onClick: (e) => e.stopPropagation(), PaperProps: {
            sx: {
                borderRadius: '24px',
                p: 3,
                minWidth: 280,
                maxWidth: 320,
            },
        } },
        React.createElement(Typography, { variant: "h6", sx: { textAlign: 'center', mb: 3, fontWeight: 600 } }, I18n.t('wm_Enter PIN')),
        React.createElement(Box, { sx: {
                display: 'flex',
                justifyContent: 'center',
                gap: 1.5,
                mb: 3,
                animation: pinError ? 'wmShake 0.4s ease' : undefined,
                '@keyframes wmShake': {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '20%, 60%': { transform: 'translateX(-8px)' },
                    '40%, 80%': { transform: 'translateX(8px)' },
                },
            } }, dots.map((filled, i) => (React.createElement(Box, { key: i, sx: theme => ({
                width: 16,
                height: 16,
                borderRadius: '50%',
                border: `2px solid ${pinError ? theme.palette.error.main : theme.palette.primary.main}`,
                backgroundColor: filled
                    ? pinError
                        ? theme.palette.error.main
                        : theme.palette.primary.main
                    : 'transparent',
                transition: 'all 0.15s ease',
            }) })))),
        React.createElement(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' } }, keys.map((row, ri) => (React.createElement(Box, { key: ri, sx: { display: 'flex', gap: 1 } }, row.map((key, ki) => {
            if (key === '') {
                return (React.createElement(Box, { key: ki, sx: { width: 64, height: 64 } }));
            }
            if (key === 'back') {
                return (React.createElement(IconButton, { key: ki, onClick: onBackspace, disabled: pinInput.length === 0, sx: theme => ({
                        width: 64,
                        height: 64,
                        color: theme.palette.text.secondary,
                    }) },
                    React.createElement(Backspace, null)));
            }
            return (React.createElement(Button, { key: ki, variant: "text", onClick: () => onDigit(key), sx: theme => ({
                    width: 64,
                    height: 64,
                    minWidth: 0,
                    borderRadius: '50%',
                    fontSize: '1.5rem',
                    fontWeight: 500,
                    color: theme.palette.text.primary,
                    backgroundColor: theme.palette.action.hover,
                    '&:hover': {
                        backgroundColor: theme.palette.action.selected,
                    },
                }) }, key));
        }))))),
        React.createElement(Button, { variant: "text", onClick: onClose, sx: { mt: 2, alignSelf: 'center', textTransform: 'none' } }, I18n.t('wm_Cancel'))));
}
/**
 * Confirmation dialog — either a simple OK/Cancel or with PIN input.
 * Can be used standalone in any widget.
 */
export function ConfirmDialog(props) {
    const { open, mode, pin = '', text, onSuccess, onClose } = props;
    const [pinInput, setPinInput] = React.useState('');
    const [pinError, setPinError] = React.useState(false);
    React.useEffect(() => {
        if (open) {
            setPinInput('');
            setPinError(false);
        }
    }, [open]);
    if (!open) {
        return null;
    }
    const title = text || I18n.t(mode === 'pin' ? 'wm_Enter PIN' : 'wm_Are you sure');
    const handleConfirm = () => {
        if (mode === 'pin') {
            if (pinInput === pin) {
                setPinInput('');
                setPinError(false);
                onSuccess();
            }
            else {
                setPinError(true);
            }
        }
        else {
            onSuccess();
        }
    };
    return (React.createElement(Dialog, { open: true, onClose: onClose, maxWidth: "xs", onClick: (e) => e.stopPropagation() },
        React.createElement(DialogTitle, null, title),
        mode === 'pin' ? (React.createElement(DialogContent, null,
            React.createElement(TextField, { autoFocus: true, type: "password", inputMode: "numeric", value: pinInput, onChange: (e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                }, onKeyDown: (e) => {
                    if (e.key === 'Enter') {
                        handleConfirm();
                    }
                }, error: pinError, helperText: pinError ? I18n.t('wm_Wrong PIN') : undefined, fullWidth: true, size: "small", sx: { mt: 1 } }))) : null,
        React.createElement(DialogActions, null,
            React.createElement(Button, { variant: "contained", onClick: handleConfirm, disabled: mode === 'pin' && !pinInput }, I18n.t('wm_OK')),
            React.createElement(Button, { onClick: onClose }, I18n.t('wm_Cancel')))));
}
const DEFAULT_INDICATORS = {
    working: null,
    unreach: null,
    lowbat: null,
    maintain: null,
    error: null,
    direction: null,
    connected: null,
    battery: null,
};
export class WidgetGeneric extends WidgetGenericBase {
    /** Indicator state IDs mapped by name */
    indicatorIds = {};
    /** Extra info state IDs (ELECTRIC_POWER, CURRENT, etc.) */
    extraInfoIds = [];
    /** common.states mapping for the ERROR indicator (numeric error codes → text) */
    errorStatesMap = null;
    historyInstance = null;
    chartTimer = null;
    trendTimer = null;
    nameRef = React.createRef();
    constructor(props) {
        super(props);
        this.state = {
            name: null,
            icon: null,
            color: null,
            indicators: { ...DEFAULT_INDICATORS },
            chartSeries: [],
            extraInfo: [],
            infoDialogOpen: props.openDialogId === `${props.widget.id}_info`,
            chartDialogOpen: props.openDialogId === `${props.widget.id}_chart`,
            trend: null,
            chartType: 'line',
            chartSmoothing: 0,
            chartSmoothingMethod: 'average',
            infoChartEntry: null,
            pinPadOpen: false,
            pinPadPin: '',
            confirmDialogOpen: false,
            confirmDialogMode: 'dialog',
            confirmDialogPin: '',
            confirmDialogText: '',
        };
        // Collect indicator state IDs from control.states
        if (props.widget.control?.states) {
            for (const s of props.widget.control.states) {
                if (INDICATOR_NAMES.includes(s.name) && s.id) {
                    this.indicatorIds[s.name] = s.id;
                }
                if (EXTRA_INFO_NAMES.includes(s.name) && s.id) {
                    this.extraInfoIds.push({ id: s.id, stateName: s.name });
                }
            }
        }
    }
    componentDidMount() {
        let state;
        if (this.props.widget.name && typeof this.props.widget.name === 'object') {
            if (this.props.widget.name.en) {
                state = {};
                state.name = this.getText(this.props.widget.name);
            }
            else if (this.props.widget.name.objectId) {
                this.props.stateContext.getObjectProperty(this.props.widget.name.objectId, this.props.widget.name.property, this.onNameChange);
            }
        }
        else {
            state = {};
            state.name = this.props.widget.name || '';
        }
        if (this.props.widget.icon && typeof this.props.widget.icon === 'object') {
            if (this.props.widget.icon.stateId) {
                this.props.stateContext.getState(this.props.widget.icon.stateId, this.onIconChange);
            }
        }
        else if (typeof this.props.widget.icon === 'string') {
            state ||= {};
            state.icon = this.props.widget.icon;
        }
        if (this.props.widget.color && typeof this.props.widget.color === 'object') {
            if (this.props.widget.color.stateId) {
                this.props.stateContext.getState(this.props.widget.color.stateId, this.onColorChange);
            }
        }
        else if (typeof this.props.widget.color === 'string') {
            state ||= {};
            state.color = this.props.widget.color;
        }
        if (state) {
            this.setState(state);
        }
        // Subscribe to all indicator states
        for (const name of INDICATOR_NAMES) {
            const id = this.indicatorIds[name];
            if (id) {
                this.props.stateContext.getState(id, this.onIndicatorChange);
            }
        }
        // Load common.states mapping for ERROR indicator (numeric error codes)
        const errorId = this.indicatorIds.ERROR;
        if (errorId) {
            void this.props.stateContext
                .getSocket()
                .getObject(errorId)
                .then(obj => {
                const statesMap = obj?.common?.states;
                if (statesMap && typeof statesMap === 'object') {
                    this.errorStatesMap = statesMap;
                }
            });
        }
        // Load extra info states (ELECTRIC_POWER, CURRENT, etc.)
        if (this.extraInfoIds.length > 0) {
            void this.loadExtraInfoMetadata();
        }
        // Start chart data loading if configured
        this.startChartRefresh();
        this.startTrendRefresh();
        this.adjustNameFontSize();
        this.loadChartType();
    }
    componentWillUnmount() {
        if (this.chartTimer) {
            clearInterval(this.chartTimer);
            this.chartTimer = null;
        }
        if (this.trendTimer) {
            clearInterval(this.trendTimer);
            this.trendTimer = null;
        }
        for (const name of INDICATOR_NAMES) {
            const id = this.indicatorIds[name];
            if (id) {
                this.props.stateContext.removeState(id, this.onIndicatorChange);
            }
        }
        for (const entry of this.extraInfoIds) {
            this.props.stateContext.removeState(entry.id, this.onExtraInfoChange);
        }
    }
    componentDidUpdate(prevProps) {
        const prevHours = prevProps.settings?.chartHours ?? 12;
        const newHours = this.props.settings?.chartHours ?? 12;
        if (prevHours !== newHours) {
            this.startChartRefresh();
        }
        if (!!prevProps.settings?.showTrendArrow !== !!this.props.settings?.showTrendArrow ||
            (prevProps.settings?.trendMinutes ?? 30) !== (this.props.settings?.trendMinutes ?? 30)) {
            this.startTrendRefresh();
        }
        // Sync name/icon/color from widget props when they change
        const state = {};
        if (prevProps.widget.name !== this.props.widget.name) {
            if (this.props.widget.name && typeof this.props.widget.name === 'object') {
                if (this.props.widget.name.en) {
                    state.name = this.getText(this.props.widget.name);
                }
            }
            else {
                state.name = this.props.widget.name || '';
            }
        }
        if (prevProps.widget.icon !== this.props.widget.icon) {
            if (typeof this.props.widget.icon === 'string') {
                state.icon = this.props.widget.icon || null;
            }
        }
        if (prevProps.widget.color !== this.props.widget.color) {
            if (typeof this.props.widget.color === 'string') {
                state.color = this.props.widget.color || null;
            }
        }
        // Sync from settings when they change (for plugin widgets where widget is synthetic)
        if (prevProps.settings !== this.props.settings) {
            if (this.props.settings?.name && this.props.settings.name !== prevProps.settings?.name) {
                state.name = this.props.settings.name;
            }
            if (this.props.settings?.color && this.props.settings.color !== prevProps.settings?.color) {
                state.color = this.props.settings.color;
            }
        }
        if (Object.keys(state).length) {
            this.setState(state);
        }
        this.adjustNameFontSize();
    }
    static getDefaultSettings() {
        return {
            size: '1x1',
            chartHours: 12,
            name: '',
            color: '',
            colorActive: '',
            showTrendArrow: false,
            trendMinutes: 30,
            favorite: false,
            icon: '',
            iconActive: '',
            text: '',
            textActive: '',
        };
    }
    /** Override in subclasses to provide widget-specific settings schema items */
    // Return type uses `any` because ConfigItemPanel from @iobroker/json-config and @iobroker/dm-utils are structurally equivalent but TypeScript treats them as different types
    static getConfigSchema() {
        return {
            name: 'Generic',
            schema: {
                type: 'panel',
                items: {},
            },
        };
    }
    /** Shrink the name font so it fits on one line without truncation */
    adjustNameFontSize() {
        const el = this.nameRef.current;
        if (!el) {
            return;
        }
        // Reset to CSS-defined size before measuring
        el.style.fontSize = '';
        // With overflow:hidden, scrollWidth is the full content width, clientWidth is the visible area
        if (el.scrollWidth > el.clientWidth && el.clientWidth > 0) {
            const current = parseFloat(getComputedStyle(el).fontSize);
            el.style.fontSize = `${Math.floor(current * (el.clientWidth / el.scrollWidth))}px`;
        }
    }
    onIndicatorChange = (id, state) => {
        const indicators = { ...this.state.indicators };
        let changed = false;
        for (const name of INDICATOR_NAMES) {
            if (this.indicatorIds[name] !== id) {
                continue;
            }
            switch (name) {
                case 'WORKING': {
                    const val = !!state.val;
                    if (indicators.working !== val) {
                        indicators.working = val;
                        changed = true;
                    }
                    break;
                }
                case 'UNREACH': {
                    const val = !!state.val;
                    if (indicators.unreach !== val) {
                        indicators.unreach = val;
                        changed = true;
                    }
                    break;
                }
                case 'LOWBAT': {
                    const val = !!state.val;
                    if (indicators.lowbat !== val) {
                        indicators.lowbat = val;
                        changed = true;
                    }
                    break;
                }
                case 'MAINTAIN': {
                    const val = !!state.val;
                    if (indicators.maintain !== val) {
                        indicators.maintain = val;
                        changed = true;
                    }
                    break;
                }
                case 'ERROR': {
                    const raw = state.val;
                    let val = null;
                    if (typeof raw === 'boolean') {
                        // boolean: true = error, false = ok
                        val = raw ? I18n.t('wm_Error') : null;
                    }
                    else if (typeof raw === 'number') {
                        // number: 0 = no error, any other = error code
                        if (raw !== 0) {
                            val =
                                (this.errorStatesMap && this.errorStatesMap[String(raw)]) ||
                                    `${I18n.t('wm_Error')} ${raw}`;
                        }
                    }
                    else if (typeof raw === 'string') {
                        // string: non-empty = error text
                        val = raw || null;
                    }
                    if (indicators.error !== val) {
                        indicators.error = val;
                        changed = true;
                    }
                    break;
                }
                case 'DIRECTION': {
                    const val = typeof state.val === 'number' ? state.val : !!state.val;
                    if (indicators.direction !== val) {
                        indicators.direction = val;
                        changed = true;
                    }
                    break;
                }
                case 'CONNECTED': {
                    // inverted: true value = reachable (good)
                    const val = !!state.val;
                    if (indicators.connected !== val) {
                        indicators.connected = val;
                        changed = true;
                    }
                    break;
                }
                case 'BATTERY': {
                    const val = Number(state.val);
                    if (indicators.battery !== val) {
                        indicators.battery = isNaN(val) ? null : val;
                        changed = true;
                    }
                    break;
                }
            }
        }
        if (changed) {
            this.setState({ indicators });
        }
    };
    onNameChange = (id, property, value) => {
        const text = this.getText(value);
        const struct = this.props.widget.name;
        if (this.props.widget.name && typeof this.props.widget.name === 'object' && struct.objectId) {
            if (struct.objectId === id && struct.property === property && text !== this.state.name) {
                this.setState({ name: text });
            }
        }
    };
    onColorChange = (id, state) => {
        if (this.props.widget.color && typeof this.props.widget.color === 'object') {
            const struct = this.props.widget.color;
            if (struct.stateId === id) {
                let color = '';
                if (struct.mapping && struct.mapping[state.val]) {
                    color = struct.mapping[state.val];
                }
                else if (state.val !== undefined && state.val !== null) {
                    color = state.val || '';
                }
                if (color !== this.state.color) {
                    this.setState({ color });
                }
            }
        }
    };
    onIconChange = (id, state) => {
        if (this.props.widget.icon && typeof this.props.widget.icon === 'object') {
            const struct = this.props.widget.icon;
            if (struct.stateId === id) {
                let iconValue = '';
                if (struct.mapping && struct.mapping[state.val]) {
                    iconValue = struct.mapping[state.val];
                }
                else if (state.val !== undefined && state.val !== null) {
                    iconValue = state.val || '';
                }
                if (iconValue !== this.state.icon) {
                    this.setState({ icon: iconValue });
                }
            }
        }
    };
    getText(text) {
        return resolveTranslated(text, this.props.stateContext.language);
    }
    // --- Extra info (ELECTRIC_POWER, CURRENT, VOLTAGE, etc.) ---
    async loadExtraInfoMetadata() {
        // Ensure history instance is resolved before checking history availability
        if (this.historyInstance === null) {
            if (this.props.stateContext.defaultHistory) {
                this.historyInstance = this.props.stateContext.defaultHistory;
            }
            else {
                try {
                    const cfg = await this.props.stateContext.getSocket().getObject('system.config');
                    this.historyInstance =
                        cfg?.common?.defaultHistory || '';
                }
                catch {
                    this.historyInstance = '';
                }
            }
        }
        const entries = [];
        for (const { id, stateName } of this.extraInfoIds) {
            const label = I18n.t(EXTRA_INFO_LABELS[stateName] || stateName);
            let unit = '';
            try {
                const obj = (await this.props.stateContext.getSocket().getObject(id));
                if (obj?.common) {
                    unit = obj.common.unit || '';
                }
            }
            catch {
                // ignore
            }
            let historyId = null;
            if (this.historyInstance) {
                historyId = await this.resolveHistoryId(id);
            }
            entries.push({ id, stateName, label, unit, value: null, historyId });
            this.props.stateContext.getState(id, this.onExtraInfoChange);
        }
        if (entries.length > 0) {
            this.setState({ extraInfo: entries });
        }
    }
    onExtraInfoChange = (id, state) => {
        this.setState(prev => ({
            extraInfo: prev.extraInfo.map(e => e.id === id ? { ...e, value: state.val } : e),
        }));
    };
    formatExtraInfoValue(entry) {
        if (entry.value == null) {
            return '—';
        }
        if (typeof entry.value === 'number') {
            const abs = Math.abs(entry.value);
            const str = abs >= 100
                ? Math.round(entry.value).toString()
                : abs >= 10
                    ? formatFloat(entry.value, 1, this.props.stateContext.isFloatComma)
                    : formatFloat(entry.value, 2, this.props.stateContext.isFloatComma);
            return entry.unit ? `${str} ${entry.unit}` : str;
        }
        return entry.unit ? `${entry.value} ${entry.unit}` : String(entry.value);
    }
    hasIndicatorStates() {
        return Object.keys(this.indicatorIds).length > 0;
    }
    renderIndicatorRows() {
        const { indicators } = this.state;
        const ids = this.indicatorIds;
        const rows = [];
        const row = (key, label, value, color) => {
            rows.push(React.createElement(Box, { key: key, sx: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 0.75,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                } },
                React.createElement(Typography, { variant: "body2", sx: { color: 'text.secondary' } }, label),
                React.createElement(Typography, { variant: "body2", sx: { fontWeight: 600, color: color || undefined } }, value)));
        };
        if (ids.CONNECTED != null) {
            const ok = indicators.connected !== false;
            row('connected', I18n.t('wm_Connected'), ok ? I18n.t('wm_Yes') : I18n.t('wm_No'), ok ? 'success.main' : 'error.main');
        }
        if (ids.UNREACH != null) {
            row('unreach', I18n.t('wm_Unreachable'), indicators.unreach ? I18n.t('wm_Yes') : I18n.t('wm_No'), indicators.unreach ? 'error.main' : 'success.main');
        }
        if (ids.ERROR != null) {
            row('error', I18n.t('wm_Error'), indicators.error || I18n.t('wm_No'), indicators.error ? 'error.main' : 'success.main');
        }
        if (ids.BATTERY != null && indicators.battery != null) {
            const pct = Math.round(indicators.battery);
            const color = pct <= 10 ? 'error.main' : pct <= 30 ? 'warning.main' : 'success.main';
            row('battery', I18n.t('wm_Battery'), `${pct}%`, color);
        }
        if (ids.LOWBAT != null) {
            row('lowbat', I18n.t('wm_Low battery'), indicators.lowbat ? I18n.t('wm_Yes') : I18n.t('wm_No'), indicators.lowbat ? 'warning.main' : 'success.main');
        }
        if (ids.MAINTAIN != null) {
            row('maintain', I18n.t('wm_Maintenance'), indicators.maintain ? I18n.t('wm_Yes') : I18n.t('wm_No'), indicators.maintain ? 'warning.main' : 'success.main');
        }
        if (ids.WORKING != null) {
            row('working', I18n.t('wm_Working'), indicators.working ? I18n.t('wm_Yes') : I18n.t('wm_No'), indicators.working ? 'info.main' : undefined);
        }
        return rows;
    }
    renderInfoChartDialog() {
        const entry = this.state.infoChartEntry;
        if (!entry?.historyId || !this.historyInstance) {
            return null;
        }
        return (React.createElement(ChartDialog, { open: true, onClose: () => {
                this.setState({ infoChartEntry: null });
                this.loadChartType();
            }, title: entry.label, historyIds: [{ id: entry.historyId, color: this.getAccentColor() || '#2196f3', name: entry.label }], historyInstance: this.historyInstance, socket: this.props.stateContext.getSocket(), unit: entry.unit, isFloatComma: this.props.stateContext.isFloatComma, widgetId: String(this.props.widget.id), instanceId: this.props.stateContext.instanceId }));
    }
    renderInfoDialog() {
        const hasExtra = this.state.extraInfo.length > 0;
        const hasIndicators = this.hasIndicatorStates();
        if (!this.state.infoDialogOpen || (!hasExtra && !hasIndicators)) {
            return this.renderInfoChartDialog();
        }
        const indicatorRows = this.renderIndicatorRows();
        return (React.createElement(React.Fragment, null,
            React.createElement(Dialog, { open: true, onClose: () => this.closeWidgetDialog('info'), maxWidth: "xs", fullWidth: true },
                React.createElement(DialogTitle, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 } },
                    this.props.settings?.name || this.state.name || '...',
                    React.createElement(IconButton, { size: "small", onClick: () => this.closeWidgetDialog('info') },
                        React.createElement(Close, null))),
                React.createElement(DialogContent, null,
                    this.state.extraInfo.map(entry => {
                        const hasHistory = !!entry.historyId;
                        return (React.createElement(Box, { key: entry.id, "data-state-id": entry.id, onClick: hasHistory
                                ? () => this.setState({ infoChartEntry: entry })
                                : undefined, sx: theme => ({
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                py: 0.75,
                                px: 1,
                                mx: -1,
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                ...(hasHistory
                                    ? {
                                        cursor: 'pointer',
                                        borderRadius: '8px',
                                        transition: 'background-color 0.15s',
                                        '&:hover': {
                                            backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                        },
                                    }
                                    : {}),
                            }) },
                            React.createElement(Box, null,
                                React.createElement(Typography, { variant: "body2", sx: theme => ({
                                        color: hasHistory ? theme.palette.primary.main : 'text.secondary',
                                        fontWeight: hasHistory ? 600 : 400,
                                    }) },
                                    entry.label,
                                    hasHistory ? ' ›' : ''),
                                React.createElement(Typography, { variant: "caption", sx: {
                                        color: 'text.disabled',
                                        fontSize: '0.6rem',
                                        lineHeight: 1,
                                        display: 'block',
                                    } }, entry.id)),
                            React.createElement(Typography, { variant: "body2", sx: { fontWeight: 600 } }, this.formatExtraInfoValue(entry))));
                    }),
                    indicatorRows)),
            this.renderInfoChartDialog()));
    }
    /** CSS class for the widget outer container, e.g. "widget-slider" */
    getWidgetClass() {
        const type = this.props.widget.control?.type || 'unknown';
        return `widget-${type}`;
    }
    // --- Overridable tile methods ---
    // eslint-disable-next-line class-methods-use-this
    isTileActive() {
        return false;
    }
    /** Open a dialog and persist it in the URL hash */
    openWidgetDialog(type) {
        const dialogId = `${this.props.widget.id}_${type}`;
        this.props.onOpenWidgetDialog?.(dialogId);
        if (type === 'chart') {
            this.setState({ chartDialogOpen: true });
        }
        else {
            this.setState({ infoDialogOpen: true });
        }
    }
    /** Close a dialog and remove it from the URL hash */
    closeWidgetDialog(type) {
        this.props.onCloseWidgetDialog?.();
        if (type === 'chart') {
            this.setState({ chartDialogOpen: false });
        }
        else {
            this.setState({ infoDialogOpen: false });
        }
    }
    getAccentColor() {
        return normalizeColor(this.props.settings?.colorActive || this.state.color || undefined);
    }
    getInactiveColor() {
        return normalizeColor(this.props.settings?.color || undefined);
    }
    /**
     * Canonical wrapper around `getTileStyles`. Widgets should call this instead of the raw
     * `getTileStyles` function — changes to the call signature (extra theming params, different
     * defaults, etc.) propagate everywhere automatically. Overrides only what the widget needs.
     */
    applyTileStyles(theme, isActive, opts = {}) {
        const { interactive = true, accent, inactiveColor } = opts;
        return getTileStyles(theme, isActive, accent !== undefined ? accent : this.getAccentColor(), interactive, inactiveColor !== undefined ? inactiveColor : this.getInactiveColor());
    }
    /** Format a timestamp as a localized "time ago" string using moment */
    fromNow(ts) {
        return moment(ts).locale(this.props.stateContext.language).fromNow();
    }
    // eslint-disable-next-line class-methods-use-this
    hasTileAction() {
        return false;
    }
    /** Whether this widget can open chart dialog on click (non-controllable with chart data) */
    hasChartAction() {
        return !this.hasTileAction() && this.state.chartSeries.length > 0;
    }
    // eslint-disable-next-line class-methods-use-this
    onTileClick() {
        // noop by default
    }
    /**
     * Returns the custom device icon if one is set, otherwise null.
     *  Subclasses that override renderTileIcon can call this to get the custom icon.
     */
    renderBaseIcon() {
        const { icon } = this.state;
        const isActive = this.isTileActive();
        if (icon) {
            const accent = this.getAccentColor();
            const inactiveColor = this.getInactiveColor();
            return (React.createElement(Icon, { src: icon, style: {
                    width: '1em',
                    height: '1em',
                    color: isActive ? accent || '#1976d2' : inactiveColor || 'grey',
                    transition: 'color 0.25s ease',
                } }));
        }
        return null;
    }
    renderTileIcon() {
        return this.renderBaseIcon();
    }
    // eslint-disable-next-line class-methods-use-this
    renderTileStatus() {
        return null;
    }
    // eslint-disable-next-line class-methods-use-this
    renderTileAction() {
        return null;
    }
    // --- Indicators ---
    renderIndicators(settingsButton, extraStates) {
        const { indicators } = this.state;
        const items = [];
        const sz = INDICATOR_ICON_SIZE;
        // Unreachable — red wifi-off
        if (indicators.unreach) {
            items.push(React.createElement(Tooltip, { key: "unreach", title: I18n.t('wm_Unreachable') },
                React.createElement(WifiOff, { sx: { fontSize: sz, color: 'error.main' } })));
        }
        // Disconnected — show only when false (connected=false means disconnected)
        if (indicators.connected === false) {
            items.push(React.createElement(Tooltip, { key: "connected", title: I18n.t('wm_Disconnected') },
                React.createElement(LinkOff, { sx: { fontSize: sz, color: 'error.main' } })));
        }
        // Error
        if (indicators.error) {
            items.push(React.createElement(Tooltip, { key: "error", title: indicators.error },
                React.createElement(ErrorIcon, { sx: { fontSize: sz, color: 'error.main' } })));
        }
        // Low-battery indicator (boolean)
        if (indicators.lowbat) {
            items.push(React.createElement(Tooltip, { key: "lowbat", title: I18n.t('wm_Low battery') },
                React.createElement(BatteryAlert, { sx: { fontSize: sz, color: 'warning.main' } })));
        }
        // Battery level (numeric) — always show if available (skip if lowbat already shown)
        if (indicators.battery != null && !indicators.lowbat) {
            const pct = Math.round(indicators.battery);
            const batteryIcon = pct <= 10 ? (React.createElement(BatteryAlert, { sx: { fontSize: sz, color: 'error.main' } })) : pct <= 30 ? (React.createElement(Battery20, { sx: { fontSize: sz, color: 'warning.main' } })) : pct <= 60 ? (React.createElement(Battery50, { sx: { fontSize: sz, color: 'success.main' } })) : pct <= 90 ? (React.createElement(Battery80, { sx: { fontSize: sz, color: 'success.main' } })) : (React.createElement(BatteryFull, { sx: { fontSize: sz, color: 'success.main' } }));
            items.push(React.createElement(Tooltip, { key: "battery", title: `${I18n.t('wm_Battery')}: ${pct}%` }, batteryIcon));
        }
        // Maintenance
        if (indicators.maintain) {
            items.push(React.createElement(Tooltip, { key: "maintain", title: I18n.t('wm_Maintenance') },
                React.createElement(Build, { sx: { fontSize: sz, color: 'warning.main' } })));
        }
        // Direction — boolean: true = up/open, false = down/close (only when working)
        //             enum: 0 = none, 1 = up/open, 2 = down/close, 3 = unknown
        const showBoolDir = typeof indicators.direction === 'boolean' && indicators.working;
        if ((indicators.direction === true && showBoolDir) || indicators.direction === 1) {
            items.push(React.createElement(Tooltip, { key: "direction", title: I18n.t('wm_Up / Open') },
                React.createElement(ArrowUpward, { sx: { fontSize: sz, color: 'info.main' } })));
        }
        else if ((indicators.direction === false && showBoolDir) || indicators.direction === 2) {
            items.push(React.createElement(Tooltip, { key: "direction", title: I18n.t('wm_Down / Close') },
                React.createElement(ArrowDownward, { sx: { fontSize: sz, color: 'info.main' } })));
        }
        // Working (busy) — spinning sync icon
        if (indicators.working) {
            items.push(React.createElement(Tooltip, { key: "working", title: I18n.t('wm_Working') },
                React.createElement(Sync, { sx: {
                        fontSize: sz,
                        color: 'info.main',
                        animation: 'spin 1.5s linear infinite',
                        '@keyframes spin': {
                            '0%': { transform: 'rotate(0deg)' },
                            '100%': { transform: 'rotate(360deg)' },
                        },
                    } })));
        }
        if (!items.length && !extraStates && !settingsButton) {
            return null;
        }
        return (React.createElement(Box, { sx: theme => ({
                position: 'absolute',
                top: isNeumorphicTheme(theme) ? 'max(4px, 2cqi)' : 'max(4px, 2cqi)',
                right: isNeumorphicTheme(theme) ? 'max(4px, 2cqi)' : 'max(4px, 2cqi)',
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                flexWrap: 'wrap',
            }) },
            items,
            extraStates,
            settingsButton));
    }
    /** Renders a standalone trend arrow, bigger than indicators, intended for right-side vertical centering */
    renderTrendArrow() {
        const { trend } = this.state;
        if (!trend) {
            return null;
        }
        const sz = 28;
        let icon;
        if (trend === 'up') {
            icon = React.createElement(TrendingUp, { sx: { fontSize: sz, color: 'success.main' } });
        }
        else if (trend === 'down') {
            icon = React.createElement(TrendingDown, { sx: { fontSize: sz, color: 'error.main' } });
        }
        else {
            icon = React.createElement(TrendingFlat, { sx: { fontSize: sz, color: 'text.secondary' } });
        }
        const minutes = this.props.settings?.trendMinutes || 30;
        const label = trend === 'up'
            ? I18n.t('wm_Trend rising')
            : trend === 'down'
                ? I18n.t('wm_Trend falling')
                : I18n.t('wm_Trend stable');
        return React.createElement(Tooltip, { title: `${label} (${minutes} min)` }, icon);
    }
    // --- Chart ---
    /** Override in subclasses to provide state IDs for chart display */
    // eslint-disable-next-line class-methods-use-this
    getHistoryIds() {
        return [];
    }
    /** Override in subclasses to provide the unit for chart tooltip */
    // eslint-disable-next-line class-methods-use-this
    getChartUnit() {
        return undefined;
    }
    loadChartType() {
        const widgetId = String(this.props.widget.id);
        const instanceId = this.props.stateContext.instanceId;
        if (!widgetId || !instanceId) {
            return;
        }
        void this.props.stateContext
            .getSocket()
            .getObject(widgetId)
            .then(obj => {
            const custom = obj?.common?.custom;
            const settings = custom?.[instanceId];
            const update = {};
            const ct = settings?.chartType;
            if (ct && ['line', 'step-start', 'step-end'].includes(ct)) {
                update.chartType = ct;
            }
            const cs = settings?.chartSmoothing;
            if (typeof cs === 'number' && [0, 30, 60, 300, 600].includes(cs)) {
                update.chartSmoothing = cs;
            }
            const cm = settings?.chartSmoothingMethod;
            if (cm && ['average', 'min', 'max', 'median'].includes(cm)) {
                update.chartSmoothingMethod = cm;
            }
            if (Object.keys(update).length) {
                this.setState(update);
            }
        })
            .catch(() => {
            // ignore
        });
    }
    startChartRefresh() {
        if (this.chartTimer) {
            clearInterval(this.chartTimer);
            this.chartTimer = null;
        }
        const chartHours = this.props.settings?.chartHours ?? 12;
        const historyIds = this.getHistoryIds();
        if (chartHours > 0 && historyIds.length) {
            void this.loadChartData(historyIds);
            this.chartTimer = setInterval(() => void this.loadChartData(), 60_000);
        }
        else if (this.state.chartSeries.length) {
            this.setState({ chartSeries: [] });
        }
    }
    /** Cache for resolved history IDs — avoids repeated object lookups on every chart refresh */
    resolvedHistoryIds = {};
    /** Returns the ID to use for history queries, resolving aliases if needed */
    async resolveHistoryId(stateId) {
        if (stateId in this.resolvedHistoryIds) {
            return this.resolvedHistoryIds[stateId];
        }
        try {
            const obj = await this.props.stateContext.getObject(stateId);
            if (!obj) {
                this.resolvedHistoryIds[stateId] = null;
                return null;
            }
            if (obj.common?.custom?.[this.historyInstance]?.enabled) {
                this.resolvedHistoryIds[stateId] = stateId;
                return stateId;
            }
            // Follow alias to target
            const aliasId = obj.common?.alias?.id;
            if (aliasId) {
                const targetId = typeof aliasId === 'object' ? aliasId.read : aliasId;
                if (targetId && targetId !== stateId) {
                    const targetObj = await this.props.stateContext.getObject(targetId);
                    if (targetObj?.common?.custom?.[this.historyInstance]?.enabled) {
                        this.resolvedHistoryIds[stateId] = targetId;
                        return targetId;
                    }
                }
            }
        }
        catch {
            // ignore
        }
        this.resolvedHistoryIds[stateId] = null;
        return null;
    }
    async loadChartData(historyIds) {
        historyIds ||= this.getHistoryIds();
        const chartHours = this.props.settings?.chartHours ?? 12;
        if (!historyIds.length || chartHours <= 0) {
            return;
        }
        const socket = this.props.stateContext.getSocket();
        if (this.historyInstance === null) {
            if (this.props.stateContext.defaultHistory) {
                this.historyInstance = this.props.stateContext.defaultHistory;
            }
            else {
                try {
                    const sysConfig = await this.props.stateContext.getObject('system.config');
                    this.historyInstance = sysConfig?.common?.defaultHistory || '';
                }
                catch {
                    this.historyInstance = '';
                }
            }
        }
        if (!this.historyInstance) {
            return;
        }
        const end = Date.now();
        const start = end - chartHours * 3_600_000;
        const aggregate = chartHours > 6 ? 'minmax' : 'none';
        const series = [];
        for (const { id, color, name } of historyIds) {
            try {
                // Resolve alias: if state has no history, check alias target
                const historyId = await this.resolveHistoryId(id);
                if (!historyId) {
                    continue;
                }
                const result = await socket.getHistory(historyId, {
                    instance: this.historyInstance,
                    start,
                    end,
                    from: false,
                    ack: false,
                    q: false,
                    addId: false,
                    aggregate,
                    returnNewestEntries: true,
                });
                const data = [];
                if (Array.isArray(result)) {
                    for (const p of result) {
                        if (p.val != null && !isNaN(Number(p.val))) {
                            data.push({ ts: p.ts, val: Number(p.val) });
                        }
                    }
                }
                series.push({ data, color, name });
            }
            catch (e) {
                console.warn(`Failed to load history for ${id}:`, e);
            }
        }
        this.setState({ chartSeries: series });
    }
    // --- Trend arrow ---
    startTrendRefresh() {
        if (this.trendTimer) {
            clearInterval(this.trendTimer);
            this.trendTimer = null;
        }
        if (!this.props.settings?.showTrendArrow) {
            if (this.state.trend != null) {
                this.setState({ trend: null });
            }
            return;
        }
        const historyIds = this.getHistoryIds();
        if (!historyIds.length) {
            return;
        }
        void this.loadTrend(historyIds[0].id);
        this.trendTimer = setInterval(() => void this.loadTrend(historyIds[0].id), 120_000);
    }
    /** Load recent history for the primary state and compute trend direction */
    async loadTrend(stateId) {
        // Ensure history instance is resolved
        if (this.historyInstance === null) {
            if (this.props.stateContext.defaultHistory) {
                this.historyInstance = this.props.stateContext.defaultHistory;
            }
            else {
                try {
                    const sysConfig = await this.props.stateContext.getObject('system.config');
                    this.historyInstance = sysConfig?.common?.defaultHistory || '';
                }
                catch {
                    this.historyInstance = '';
                }
            }
        }
        if (!this.historyInstance) {
            return;
        }
        const historyId = await this.resolveHistoryId(stateId);
        if (!historyId) {
            return;
        }
        const end = Date.now();
        const minutes = this.props.settings?.trendMinutes || 30;
        const start = end - minutes * 60_000;
        try {
            const result = await this.props.stateContext.getSocket().getHistory(historyId, {
                instance: this.historyInstance,
                start,
                end,
                from: false,
                ack: false,
                q: false,
                addId: false,
                aggregate: 'none',
                returnNewestEntries: true,
            });
            if (!Array.isArray(result) || result.length < 2) {
                return;
            }
            // Collect valid numeric points
            const points = [];
            for (const p of result) {
                if (p.val != null && !isNaN(Number(p.val))) {
                    points.push({ ts: p.ts, val: Number(p.val) });
                }
            }
            if (points.length < 2) {
                return;
            }
            // Least-squares linear regression for robust trend detection
            const n = points.length;
            const t0 = points[0].ts;
            let sumX = 0;
            let sumY = 0;
            let sumXY = 0;
            let sumX2 = 0;
            for (const p of points) {
                const x = (p.ts - t0) / 60_000; // minutes
                sumX += x;
                sumY += p.val;
                sumXY += x * p.val;
                sumX2 += x * x;
            }
            const det = n * sumX2 - sumX * sumX;
            if (Math.abs(det) < 1e-12) {
                return;
            }
            const slope = (n * sumXY - sumY * sumX) / det; // value per minute
            const intercept = (sumY - slope * sumX) / n;
            const timeSpan = (points[n - 1].ts - t0) / 60_000;
            const totalChange = slope * timeSpan;
            // Standard deviation of residuals (noise level)
            let ssRes = 0;
            for (const p of points) {
                const x = (p.ts - t0) / 60_000;
                const res = p.val - (slope * x + intercept);
                ssRes += res * res;
            }
            const noiseStd = Math.sqrt(ssRes / Math.max(n - 2, 1));
            // Trend is significant if |totalChange| exceeds 2× noise and a minimum absolute threshold
            let trend;
            if (Math.abs(totalChange) > Math.max(noiseStd * 2, 0.01)) {
                trend = totalChange > 0 ? 'up' : 'down';
            }
            else {
                trend = 'stable';
            }
            if (trend !== this.state.trend) {
                this.setState({ trend });
            }
        }
        catch {
            // ignore
        }
    }
    renderChartDialog() {
        if (!this.state.chartDialogOpen || !this.historyInstance) {
            return null;
        }
        const historyIds = this.getHistoryIds();
        if (!historyIds.length) {
            return null;
        }
        return (React.createElement(ChartDialog, { open: true, onClose: () => {
                this.closeWidgetDialog('chart');
                this.loadChartType();
            }, title: this.props.settings?.name || (this.state.name ?? '') || String(this.props.widget.id), historyIds: historyIds, historyInstance: this.historyInstance, socket: this.props.stateContext.getSocket(), unit: this.getChartUnit(), isFloatComma: this.props.stateContext.isFloatComma, widgetId: String(this.props.widget.id), instanceId: this.props.stateContext.instanceId }));
    }
    renderChart() {
        const { chartSeries } = this.state;
        if (!chartSeries?.length) {
            return null;
        }
        const chartHours = this.props.settings?.chartHours ?? 12;
        if (chartHours <= 0) {
            return null;
        }
        const end = Date.now();
        const start = end - chartHours * 3_600_000;
        const W = 200;
        const H = 60;
        const { chartSmoothing, chartSmoothingMethod } = this.state;
        const paths = [];
        for (let i = 0; i < chartSeries.length; i++) {
            const s = chartSeries[i];
            if (s.data.length < 2) {
                continue;
            }
            const smoothed = chartSmoothing > 0 ? smoothData(s.data, chartSmoothing, chartSmoothingMethod) : s.data;
            let min = Infinity;
            let max = -Infinity;
            for (const p of smoothed) {
                if (p.val < min) {
                    min = p.val;
                }
                if (p.val > max) {
                    max = p.val;
                }
            }
            const range = max - min || 1;
            const padMin = min - range * 0.1;
            const padRange = max + range * 0.1 - padMin;
            const pts = smoothed.map(p => ({
                x: ((p.ts - start) / (end - start)) * W,
                y: H - ((p.val - padMin) / padRange) * H,
            }));
            const ct = this.state.chartType;
            let line;
            if (ct === 'step-start') {
                line = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
                for (let j = 1; j < pts.length; j++) {
                    line += `V${pts[j].y.toFixed(1)}H${pts[j].x.toFixed(1)}`;
                }
            }
            else if (ct === 'step-end') {
                line = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
                for (let j = 1; j < pts.length; j++) {
                    line += `H${pts[j].x.toFixed(1)}V${pts[j].y.toFixed(1)}`;
                }
            }
            else {
                line = pts.map((p, j) => `${j === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('');
            }
            const lastX = pts[pts.length - 1].x.toFixed(1);
            const firstX = pts[0].x.toFixed(1);
            paths.push(React.createElement(React.Fragment, { key: i },
                React.createElement("path", { d: `${line} L${lastX},${H} L${firstX},${H} Z`, fill: s.color, opacity: 0.15 }),
                React.createElement("path", { d: line, fill: "none", stroke: s.color, strokeWidth: "1.5", opacity: 0.4 })));
        }
        if (!paths.length) {
            return null;
        }
        return (React.createElement(Box, { sx: {
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: '40%',
                overflow: 'hidden',
                pointerEvents: 'none',
            } },
            React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none", style: { width: '100%', height: '100%', display: 'block' } }, paths)));
    }
    // --- PinPad ---
    /**
     * Open the PinPad dialog.
     * On correct PIN entry, `onPinPadSuccess()` is called.
     */
    showPinPad(pin) {
        this.setState({ pinPadOpen: true, pinPadPin: pin });
    }
    /** Override in subclass to handle successful PIN entry */
    // eslint-disable-next-line class-methods-use-this
    onPinPadSuccess() {
        // override in subclass
    }
    renderPinPad() {
        return (React.createElement(PinPadDialog, { open: this.state.pinPadOpen, pin: this.state.pinPadPin, onSuccess: () => {
                this.setState({ pinPadOpen: false });
                this.onPinPadSuccess();
            }, onClose: () => this.setState({ pinPadOpen: false }) }));
    }
    // --- Confirmation Dialog ---
    /**
     * Open a confirmation dialog.
     * On success, `onConfirmDialogSuccess()` is called.
     */
    showConfirmDialog(mode, pin, text) {
        this.setState({
            confirmDialogOpen: true,
            confirmDialogMode: mode,
            confirmDialogPin: pin || '',
            confirmDialogText: text || '',
        });
    }
    /** Override in subclass to handle successful confirmation */
    // eslint-disable-next-line class-methods-use-this
    onConfirmDialogSuccess() {
        // override in subclass
    }
    renderConfirmDialog() {
        return (React.createElement(ConfirmDialog, { open: this.state.confirmDialogOpen, mode: this.state.confirmDialogMode, pin: this.state.confirmDialogPin, text: this.state.confirmDialogText, onSuccess: () => {
                this.setState({ confirmDialogOpen: false });
                this.onConfirmDialogSuccess();
            }, onClose: () => this.setState({ confirmDialogOpen: false }) }));
    }
    // --- Settings button ---
    renderSettingsButton() {
        const hasSettings = !!this.props.onOpenSettings;
        const hasInfo = this.state.extraInfo.length || this.hasIndicatorStates();
        if (!hasSettings && !hasInfo) {
            return null;
        }
        return (React.createElement(React.Fragment, null,
            hasInfo ? (React.createElement(Box, { component: "span", role: "button", tabIndex: 0, onClick: (e) => {
                    e.stopPropagation();
                    this.openWidgetDialog('info');
                }, onKeyDown: (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        this.openWidgetDialog('info');
                    }
                }, sx: theme => ({
                    p: '3px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 1,
                    color: theme.palette.info.main,
                    opacity: 0.5,
                    transition: 'opacity 0.2s, background-color 0.2s',
                    '&:hover': {
                        opacity: 1,
                        backgroundColor: theme.palette.action.hover,
                    },
                }) },
                React.createElement(InfoOutlined, { sx: { fontSize: 16 } }))) : null,
            hasSettings ? (React.createElement(Box, { component: "span", role: "button", tabIndex: 0, onClick: (e) => {
                    e.stopPropagation();
                    this.props.onOpenSettings(this.props.widget.id);
                }, onKeyDown: (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        this.props.onOpenSettings(this.props.widget.id);
                    }
                }, sx: WidgetGeneric.getSettingButtonStyle() },
                React.createElement(Settings, { sx: { fontSize: 16 } }))) : null,
            this.renderInfoDialog()));
    }
    static getStyleCompact(theme) {
        return {
            position: 'relative',
            containerType: 'inline-size',
            overflow: 'hidden',
            borderRadius: isNeumorphicTheme(theme) ? '24px' : '16px',
        };
    }
    static getStyleWide(theme) {
        const style = WidgetGeneric.getStyleCompact(theme);
        style.gridColumn = 'span 2';
        return style;
    }
    static getStyleWideTall(theme) {
        return WidgetGeneric.getStyleWide(theme);
    }
    /** 2×2: spans 2 columns AND 2 rows, so the tile occupies a square double-cell area. */
    static getStyleHuge(theme) {
        const style = WidgetGeneric.getStyleCompact(theme);
        style.gridColumn = 'span 2';
        style.gridRow = 'span 2';
        return style;
    }
    static getSettingButtonStyle() {
        return (theme) => ({
            p: '3px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 2,
            color: theme.palette.primary.main,
            opacity: 0.6,
            transition: 'opacity 0.2s, background-color 0.2s',
            '&:hover': {
                opacity: 1,
                backgroundColor: theme.palette.action.hover,
            },
        });
    }
    // --- Frame rendering ---
    renderCompact() {
        const { name } = this.state;
        const isActive = this.isTileActive();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        const trendArrow = this.renderTrendArrow();
        const chartAction = this.hasChartAction();
        const clickable = this.hasTileAction() || chartAction;
        return (React.createElement(Box, { id: String(this.props.widget.id), className: `${this.getWidgetClass()}`, sx: theme => WidgetGeneric.getStyleCompact(theme) },
            React.createElement(ButtonBase, { component: "div", disableRipple: !clickable, onClick: clickable
                    ? () => (chartAction ? this.openWidgetDialog('chart') : this.onTileClick())
                    : undefined, sx: theme => {
                    const neu = isNeumorphicTheme(theme);
                    const pad = neu ? 'max(12px, 8cqi)' : 'max(16px, 10cqi)';
                    return {
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'stretch',
                        width: '100%',
                        aspectRatio: '1',
                        textAlign: 'left',
                        overflow: 'hidden',
                        cursor: clickable ? 'pointer' : 'default',
                        ...this.applyTileStyles(theme, isActive),
                        ...(!clickable && { '&:active': { transform: 'none' } }),
                        padding: pad,
                    };
                } },
                trendArrow ? (React.createElement(Box, { sx: {
                        position: 'absolute',
                        right: 'max(8px, 5cqi)',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 1,
                        opacity: 0.85,
                        '& .MuiSvgIcon-root': { fontSize: 'max(24px, 16cqi) !important' },
                    } }, trendArrow)) : null,
                React.createElement(Box, { sx: {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 1,
                        fontSize: 'max(48px, 32cqi)',
                        '& .MuiSvgIcon-root': { fontSize: 'inherit !important' },
                        '& img': { width: '1em !important', height: '1em !important' },
                    } }, this.renderTileIcon()),
                React.createElement(Box, null,
                    React.createElement(Typography, { ref: this.nameRef, variant: "body2", sx: theme => ({
                            fontWeight: 600,
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            fontSize: 'max(0.875rem, 9cqi)',
                            ...(isNeumorphicTheme(theme)
                                ? {
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    fontSize: 'max(0.7rem, 7cqi)',
                                }
                                : {}),
                        }) }, this.props.settings?.name || name || '...'),
                    this.renderTileStatus()),
                this.renderChart()),
            indicators));
    }
    renderWide() {
        const { name } = this.state;
        const isActive = this.isTileActive();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        const trendArrow = this.renderTrendArrow();
        const chartAction = this.hasChartAction();
        const clickable = this.hasTileAction() || chartAction;
        return (React.createElement(Box, { id: String(this.props.widget.id), className: `${this.getWidgetClass()}`, sx: theme => WidgetGeneric.getStyleWide(theme) },
            React.createElement(Box, { onClick: clickable
                    ? () => (chartAction ? this.openWidgetDialog('chart') : this.onTileClick())
                    : undefined, sx: theme => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    width: '100%',
                    height: 80,
                    position: 'relative',
                    cursor: clickable ? 'pointer' : 'default',
                    overflow: 'hidden',
                    ...this.applyTileStyles(theme, isActive),
                    ...(!clickable && { '&:active': { transform: 'none' } }),
                }) },
                React.createElement(Box, { sx: {
                        flexShrink: 0,
                        fontSize: 'max(32px, 10cqi)',
                        '& .MuiSvgIcon-root': { fontSize: 'inherit !important' },
                        '& img': { width: '1em !important', height: '1em !important' },
                    } }, this.renderTileIcon()),
                React.createElement(Box, { sx: { flex: 1, minWidth: 0 } },
                    React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
                        React.createElement(Typography, { ref: this.nameRef, variant: "body2", sx: theme => ({
                                fontWeight: 600,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                ...(isNeumorphicTheme(theme)
                                    ? {
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.08em',
                                        fontSize: '0.75rem',
                                    }
                                    : {}),
                            }) }, this.props.settings?.name || name || '...'),
                        indicators),
                    this.renderTileStatus()),
                trendArrow ? (React.createElement(Box, { sx: { flexShrink: 0, display: 'flex', alignItems: 'center', opacity: 0.85 } }, trendArrow)) : null,
                this.renderTileAction(),
                this.renderChart())));
    }
    renderWideTall() {
        const { name } = this.state;
        const isActive = this.isTileActive();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);
        const trendArrow = this.renderTrendArrow();
        const chartAction = this.hasChartAction();
        const clickable = this.hasTileAction() || chartAction;
        return (React.createElement(Box, { id: String(this.props.widget.id), className: `${this.getWidgetClass()}`, sx: theme => WidgetGeneric.getStyleWideTall(theme) },
            React.createElement(Box, { sx: { width: 'calc(50% - 6px)', aspectRatio: '1' } }),
            React.createElement(ButtonBase, { component: "div", disableRipple: !clickable, onClick: clickable
                    ? () => (chartAction ? this.openWidgetDialog('chart') : this.onTileClick())
                    : undefined, sx: theme => ({
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 2,
                    width: '100%',
                    height: '100%',
                    textAlign: 'left',
                    overflow: 'hidden',
                    cursor: clickable ? 'pointer' : 'default',
                    ...this.applyTileStyles(theme, isActive),
                    ...(!clickable && { '&:active': { transform: 'none' } }),
                    padding: isNeumorphicTheme(theme) ? 'max(12px, 4cqi)' : 'max(16px, 5cqi)',
                }) },
                React.createElement(Box, { sx: {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: 'max(48px, 16cqi)',
                        '& .MuiSvgIcon-root': { fontSize: 'inherit !important' },
                        '& img': { width: '1em !important', height: '1em !important' },
                    } }, this.renderTileIcon()),
                React.createElement(Box, { sx: { flex: 1, minWidth: 0 } },
                    React.createElement(Typography, { ref: this.nameRef, variant: "body2", sx: theme => ({
                            fontWeight: 600,
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            fontSize: 'max(0.875rem, 4.5cqi)',
                            ...(isNeumorphicTheme(theme)
                                ? {
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    fontSize: 'max(0.7rem, 3.5cqi)',
                                }
                                : {}),
                        }) }, this.props.settings?.name || name || '...'),
                    this.renderTileStatus()),
                trendArrow ? (React.createElement(Box, { sx: { flexShrink: 0, display: 'flex', alignItems: 'center', opacity: 0.85 } }, trendArrow)) : null,
                this.renderTileAction(),
                this.renderChart()),
            indicators));
    }
    /**
     * Override in subclasses that opt into the 2×2 size. Defaults to renderWideTall (2×1) so widgets
     *  that don't customize 2×2 don't blow up if they ever receive that size — but normally only
     *  iFrame and EnergyFlow expose this option in their schema.
     */
    renderHuge() {
        return this.renderWideTall();
    }
    render() {
        const size = this.props.settings?.size || '1x1';
        let widget;
        if (size === '2x0.5') {
            widget = this.renderWide();
        }
        else if (size === '2x1') {
            widget = this.renderWideTall();
        }
        else if (size === '2x2') {
            widget = this.renderHuge();
        }
        else {
            widget = this.renderCompact();
        }
        const chartDialog = this.renderChartDialog();
        const pinPad = this.renderPinPad();
        const confirmDialog = this.renderConfirmDialog();
        if (chartDialog || pinPad || confirmDialog) {
            return (React.createElement(React.Fragment, null,
                widget,
                chartDialog,
                pinPad,
                confirmDialog));
        }
        return widget;
    }
}
export default WidgetGeneric;
//# sourceMappingURL=Generic.js.map