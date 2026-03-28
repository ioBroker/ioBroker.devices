import React from 'react';
import {
    Box,
    ButtonBase,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    Slider as MuiSlider,
    SvgIcon,
    Typography,
} from '@mui/material';
import { Speed, Tune } from '@mui/icons-material';
import type { Theme } from '@mui/material/styles';
import { I18n } from '@iobroker/adapter-react-v5';

import WidgetGeneric, {
    getTileStyles,
    isNeumorphicTheme,
    type WidgetGenericProps,
    type WidgetGenericState,
} from './Generic';

/** Gate valve icon with handle */
function ValveIcon(props: React.ComponentProps<typeof SvgIcon>): React.JSX.Element {
    return (
        <SvgIcon
            {...props}
            viewBox="0 0 24 24"
        >
            <rect
                x="7"
                y="2"
                width="10"
                height="2.5"
                rx="1.25"
            />
            <rect
                x="11"
                y="4.5"
                width="2"
                height="4"
            />
            <path d="M3,8.5 L21,8.5 L12,14 Z" />
            <path d="M3,15.5 L21,15.5 L12,10 Z" />
            <rect
                x="10"
                y="15.5"
                width="4"
                height="6.5"
            />
        </SvgIcon>
    );
}

/** Ventilator / fan blade icon (MDI fan) */
function FanIcon(props: React.ComponentProps<typeof SvgIcon>): React.JSX.Element {
    return (
        <SvgIcon {...props}>
            <path d="M12,11A1,1 0 0,0 11,12A1,1 0 0,0 12,13A1,1 0 0,0 13,12A1,1 0 0,0 12,11M12.5,2C17,2 17.11,5.57 14.75,6.75C13.76,7.24 13.32,8.29 13.13,9.22C13.61,9.42 14.03,9.73 14.35,10.13C18.05,8.13 22.03,8.92 22.03,12.5C22.03,17 18.46,17.1 17.28,14.73C16.78,13.74 15.72,13.3 14.79,13.11C14.59,13.59 14.28,14 13.88,14.34C15.87,18.03 15.08,22 11.5,22C7,22 6.91,18.42 9.27,17.24C10.25,16.75 10.69,15.71 10.89,14.79C10.4,14.59 9.97,14.27 9.65,13.87C5.96,15.85 2,15.07 2,11.5C2,7 5.56,6.89 6.74,9.26C7.24,10.25 8.29,10.68 9.22,10.87C9.41,10.39 9.73,9.97 10.14,9.65C8.15,5.96 8.94,2 12.5,2Z" />
        </SvgIcon>
    );
}

interface WidgetSliderState extends WidgetGenericState {
    level: number;
    rawValue: number;
    dragging: boolean;
    rawMin: number;
    rawMax: number;
    unit: string;
    /** common.states mapping (value → label) — when set, widget acts as mode selector */
    statesMap: Record<string, string> | null;
    modeDialogOpen: boolean;
}

export class WidgetSlider extends WidgetGeneric<WidgetSliderState> {
    private readonly setId: string | null;
    private readonly actualId: string | null;

    private arcRef = React.createRef<HTMLDivElement>();
    private dragStartPos: { x: number; y: number } | null = null;
    private isDragging = false;
    /** true when the valve vertical fill bar is shown (compact); false when arc knob is used */
    private verticalDragMode = false;

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;
        const set = states.find(s => s.name === 'SET');
        const actual = states.find(s => s.name === 'ACTUAL');

        this.setId = set?.id ?? null;
        this.actualId = actual?.id ?? set?.id ?? null;

        this.state = {
            ...this.state,
            level: 0,
            rawValue: 0,
            dragging: false,
            rawMin: 0,
            rawMax: 100,
            unit: '%',
            statesMap: null,
            modeDialogOpen: false,
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onLevelChange);
        }
        void this.loadObjectConfig();
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onLevelChange);
        }
    }

    private async loadObjectConfig(): Promise<void> {
        const id = this.setId || this.actualId;
        if (!id) {
            return;
        }
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(id)) as
                | ioBroker.StateObject
                | null
                | undefined;
            if (obj?.common) {
                const min = obj.common.min != null ? Number(obj.common.min) : 0;
                const max = obj.common.max != null ? Number(obj.common.max) : 100;
                const unit = obj.common.unit || '%';
                if (!isNaN(min) && !isNaN(max) && max > min) {
                    this.setState({ rawMin: min, rawMax: max, unit });
                }

                // Load common.states for mode selector
                const statesObj = obj.common.states;
                if (statesObj) {
                    if (Array.isArray(statesObj)) {
                        const map: Record<string, string> = {};
                        statesObj.forEach((label, i) => {
                            map[String(i)] = String(label);
                        });
                        if (Object.keys(map).length > 0) {
                            this.setState({ statesMap: map });
                        }
                    } else if (typeof statesObj === 'object') {
                        const map = statesObj;
                        if (Object.keys(map).length > 0) {
                            this.setState({ statesMap: map });
                        }
                    }
                }
            }
        } catch {
            // ignore
        }
    }

    /** Convert a raw device value to 0-100 percent */
    private rawToPercent(raw: number): number {
        const { rawMin, rawMax } = this.state;
        const range = rawMax - rawMin;
        if (range <= 0) {
            return 0;
        }
        return Math.round(((raw - rawMin) / range) * 100);
    }

    /** Convert a 0-100 percent to a raw device value */
    private percentToRaw(percent: number): number {
        const { rawMin, rawMax } = this.state;
        return rawMin + (percent / 100) * (rawMax - rawMin);
    }

    private onLevelChange = (_id: string, state: ioBroker.State): void => {
        if (this.isDragging) {
            return;
        }
        const rawValue = Number(state.val) || 0;
        const level = this.rawToPercent(rawValue);
        if (level !== this.state.level || rawValue !== this.state.rawValue) {
            this.setState({ level, rawValue });
        }
    };

    private getSliderType(): string {
        return this.props.settings?.sliderType || 'normal';
    }

    // --- Mode selector helpers ---

    private isModeSelectorMode(): boolean {
        return this.state.statesMap != null && Object.keys(this.state.statesMap).length > 0;
    }

    private getCurrentModeName(): string {
        const { statesMap, rawValue } = this.state;
        if (!statesMap) {
            return '';
        }
        return statesMap[String(rawValue)] || statesMap[String(Math.round(rawValue))] || String(rawValue);
    }

    private selectMode(value: string): void {
        const numValue = Number(value);
        if (this.setId) {
            void this.props.stateContext.getSocket().setState(this.setId, numValue);
        }
        this.setState({
            rawValue: numValue,
            level: this.rawToPercent(numValue),
            modeDialogOpen: false,
        });
    }

    // --- Arc knob pointer interaction ---

    private pointerToPercent(clientX: number, clientY: number): number {
        const el = this.arcRef.current;
        if (!el) {
            return this.state.level;
        }

        // Valve compact: vertical mapping — top = 100%, bottom = 0%
        if (this.verticalDragMode) {
            const rect = el.getBoundingClientRect();
            const y = clientY - rect.top;
            const pct = Math.round((1 - y / rect.height) * 100);
            return Math.max(0, Math.min(100, pct));
        }

        // Arc calculation for other types
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = clientX - cx;
        const dy = clientY - cy;

        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        if (angle < 0) {
            angle += 360;
        }

        let normalized = angle - 135;
        if (normalized < 0) {
            normalized += 360;
        }

        if (normalized > 270) {
            return normalized > 315 ? 0 : 100;
        }

        return Math.round((normalized / 270) * 100);
    }

    private onArcPointerDown = (e: React.PointerEvent): void => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this.isDragging = false;
    };

    private onArcPointerMove = (e: React.PointerEvent): void => {
        if (!this.dragStartPos) {
            return;
        }
        const dx = e.clientX - this.dragStartPos.x;
        const dy = e.clientY - this.dragStartPos.y;
        if (!this.isDragging && Math.sqrt(dx * dx + dy * dy) > 8) {
            this.isDragging = true;
            this.setState({ dragging: true });
        }
        if (this.isDragging) {
            const percent = this.pointerToPercent(e.clientX, e.clientY);
            this.setState({ level: percent, rawValue: this.percentToRaw(percent) });
        }
    };

    private onArcPointerUp = (e: React.PointerEvent): void => {
        if (!this.dragStartPos) {
            return;
        }
        if (this.isDragging) {
            const percent = this.pointerToPercent(e.clientX, e.clientY);
            if (this.setId) {
                void this.props.stateContext.getSocket().setState(this.setId, this.percentToRaw(percent));
            }
        }
        this.dragStartPos = null;
        this.isDragging = false;
        this.setState({ dragging: false });
    };

    // --- Slider handlers for wide modes ---

    private onSliderDrag = (_e: Event, value: number | number[]): void => {
        const level = value as number;
        this.setState({ level, rawValue: this.percentToRaw(level), dragging: true });
    };

    private onSliderCommit = (_e: Event | React.SyntheticEvent, value: number | number[]): void => {
        const level = value as number;
        if (this.setId) {
            void this.props.stateContext.getSocket().setState(this.setId, this.percentToRaw(level));
        }
        this.setState({ level, rawValue: this.percentToRaw(level), dragging: false });
    };

    // --- Chart support ---

    protected getHistoryIds(): { id: string; color: string }[] {
        const id = this.actualId || this.setId;
        if (!id) {
            return [];
        }
        return [{ id, color: this.getAccentColor() || '#1976d2' }];
    }

    // --- Overrides ---

    protected isTileActive(): boolean {
        if (this.isModeSelectorMode()) {
            return true;
        }
        return this.state.level > 0;
    }

    // eslint-disable-next-line class-methods-use-this
    protected hasTileAction(): boolean {
        return true;
    }

    protected onTileClick(): void {
        if (this.isModeSelectorMode()) {
            this.setState({ modeDialogOpen: true });
            return;
        }
        // Toggle between 0 and last value or 100
        const newLevel = this.state.level > 0 ? 0 : 100;
        if (this.setId) {
            void this.props.stateContext.getSocket().setState(this.setId, this.percentToRaw(newLevel));
        }
        this.setState({ level: newLevel, rawValue: this.percentToRaw(newLevel) });
    }

    private renderTypeIcon(sx?: (theme: Theme) => React.CSSProperties): React.JSX.Element {
        const baseIcon = this.renderBaseIcon();
        if (baseIcon) {
            return baseIcon;
        }

        const sliderType = this.getSliderType();
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();

        const iconSx =
            sx ||
            ((theme: Theme): React.CSSProperties => ({
                color: isActive ? accent || theme.palette.primary.main : theme.palette.text.disabled,
                transition: 'color 0.25s ease',
            }));

        switch (sliderType) {
            case 'valve':
                return <ValveIcon sx={iconSx} />;
            case 'fan':
                return (
                    <FanIcon
                        sx={theme => ({
                            ...((typeof iconSx === 'function' ? iconSx(theme) : iconSx) as Record<string, unknown>),
                            animation: isActive ? 'wm-spin 2s linear infinite' : 'none',
                            '@keyframes wm-spin': {
                                '0%': { transform: 'rotate(0deg)' },
                                '100%': { transform: 'rotate(360deg)' },
                            },
                        })}
                    />
                );
            case 'gauge':
                return <Speed sx={iconSx} />;
            default:
                return <Tune sx={iconSx} />;
        }
    }

    protected renderTileIcon(): React.JSX.Element {
        return this.renderTypeIcon();
    }

    protected renderTileStatus(): React.JSX.Element {
        if (this.isModeSelectorMode()) {
            const modeName = this.getCurrentModeName();
            const accent = this.getAccentColor();
            return (
                <Typography
                    variant="caption"
                    sx={theme => ({
                        fontWeight: 500,
                        color: accent || theme.palette.primary.main,
                        transition: 'color 0.25s ease',
                    })}
                >
                    {modeName}
                </Typography>
            );
        }

        const { level, rawValue, unit } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();

        const displayValue = unit === '%' ? `${level}%` : `${Math.round(rawValue)} ${unit}`;

        return (
            <Typography
                variant="caption"
                sx={theme => ({
                    fontWeight: 500,
                    color: isActive ? accent || theme.palette.primary.main : theme.palette.text.secondary,
                    transition: 'color 0.25s ease',
                })}
            >
                {isActive ? displayValue : I18n.t('wm_Off')}
            </Typography>
        );
    }

    // --- Mode selector rendering ---

    private renderModeDialog(): React.JSX.Element | null {
        const { statesMap, modeDialogOpen, rawValue } = this.state;
        if (!statesMap || !modeDialogOpen) {
            return null;
        }

        const entries = Object.entries(statesMap);
        const currentKey = String(Math.round(rawValue));
        const accent = this.getAccentColor();

        return (
            <Dialog
                open
                onClose={() => this.setState({ modeDialogOpen: false })}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>{this.props.settings?.name || this.state.name || '...'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pb: 1 }}>
                        {entries.map(([value, label]) => {
                            const selected = currentKey === value;
                            return (
                                <Chip
                                    key={value}
                                    label={label}
                                    variant={selected ? 'filled' : 'outlined'}
                                    color={selected ? 'primary' : 'default'}
                                    onClick={() => this.selectMode(value)}
                                    sx={
                                        selected && accent
                                            ? {
                                                  backgroundColor: accent,
                                                  '&:hover': { backgroundColor: accent },
                                              }
                                            : undefined
                                    }
                                />
                            );
                        })}
                    </Box>
                </DialogContent>
            </Dialog>
        );
    }

    private renderModeAction(): React.JSX.Element {
        const { statesMap, rawValue } = this.state;
        if (!statesMap) {
            return <Box />;
        }

        const entries = Object.entries(statesMap);
        const currentKey = String(Math.round(rawValue));
        const accent = this.getAccentColor();
        const totalLength = entries.reduce((sum, [, label]) => sum + label.length, 0);

        // Short labels and few modes: show inline chips
        if (entries.length <= 4 && totalLength <= 30) {
            return (
                <Box
                    sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}
                    onClick={e => e.stopPropagation()}
                >
                    {entries.map(([value, label]) => {
                        const selected = currentKey === value;
                        return (
                            <Chip
                                key={value}
                                label={label}
                                size="small"
                                variant={selected ? 'filled' : 'outlined'}
                                color={selected ? 'primary' : 'default'}
                                onClick={() => this.selectMode(value)}
                                sx={
                                    selected && accent
                                        ? {
                                              backgroundColor: accent,
                                              '&:hover': { backgroundColor: accent },
                                          }
                                        : undefined
                                }
                            />
                        );
                    })}
                </Box>
            );
        }

        // Too many or too long: show current mode chip → opens dialog
        const modeName = this.getCurrentModeName();
        return (
            <Chip
                label={modeName}
                size="small"
                color="primary"
                sx={accent ? { backgroundColor: accent, '&:hover': { backgroundColor: accent } } : undefined}
                onClick={e => {
                    e.stopPropagation();
                    this.setState({ modeDialogOpen: true });
                }}
            />
        );
    }

    private renderModeCompact(): React.JSX.Element {
        const { name } = this.state;
        const modeName = this.getCurrentModeName();
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const indicators = this.renderIndicators();

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={theme => WidgetGeneric.getStyleCompact(theme)}
            >
                <ButtonBase
                    component="div"
                    onClick={() => this.setState({ modeDialogOpen: true })}
                    sx={theme => ({
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'stretch',
                        width: '100%',
                        aspectRatio: '1',
                        textAlign: 'left',
                        overflow: 'hidden',
                        ...getTileStyles(theme, isActive, accent),
                        padding: isNeumorphicTheme(theme) ? 'max(12px, 8cqi)' : 'max(16px, 10cqi)',
                    })}
                >
                    {indicators ? (
                        <Box
                            sx={theme => ({
                                position: 'absolute',
                                top: isNeumorphicTheme(theme) ? 'max(12px, 8cqi)' : 'max(16px, 10cqi)',
                                right: isNeumorphicTheme(theme) ? 'max(12px, 8cqi)' : 'max(16px, 10cqi)',
                                zIndex: 1,
                            })}
                        >
                            {indicators}
                        </Box>
                    ) : null}

                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flex: 1,
                            fontSize: 'max(48px, 32cqi)',
                            '& .MuiSvgIcon-root': { fontSize: 'inherit !important' },
                        }}
                    >
                        {this.renderTileIcon()}
                    </Box>

                    <Box>
                        <Typography
                            ref={this.nameRef}
                            variant="body2"
                            sx={theme => ({
                                fontWeight: 600,
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                fontSize: 'max(0.875rem, 9cqi)',
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
                        <Typography
                            variant="caption"
                            sx={theme => ({
                                fontWeight: 500,
                                color: accent || theme.palette.primary.main,
                                transition: 'color 0.25s ease',
                            })}
                        >
                            {modeName}
                        </Typography>
                    </Box>
                    {this.renderChart()}
                </ButtonBase>
                {this.renderSettingsButton()}
                {this.renderModeDialog()}
            </Box>
        );
    }

    // --- Arc knob for wide views ---

    private renderArcKnob(): React.JSX.Element {
        this.verticalDragMode = false;
        const { level, rawValue, unit, dragging } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const vb = 100;
        const sw = 10;
        const r = (vb - sw) / 2;
        const circumference = 2 * Math.PI * r;
        const arcLength = circumference * 0.75;
        const progress = (level / 100) * arcLength;
        const displayValue = unit === '%' ? `${level}%` : `${Math.round(rawValue)} ${unit}`;

        return (
            <Box
                ref={this.arcRef}
                onPointerDown={this.onArcPointerDown}
                onPointerMove={this.onArcPointerMove}
                onPointerUp={this.onArcPointerUp}
                onPointerCancel={this.onArcPointerUp}
                onClick={e => e.stopPropagation()}
                sx={{
                    width: 48,
                    height: 48,
                    flexShrink: 0,
                    touchAction: 'none',
                    userSelect: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
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
                        stroke={isActive ? accent || 'var(--mui-palette-primary-main, #1976d2)' : 'transparent'}
                        strokeWidth={sw}
                        strokeDasharray={`${progress} ${circumference}`}
                        strokeLinecap="round"
                        style={dragging ? undefined : { transition: 'stroke-dasharray 0.3s ease' }}
                    />
                </svg>
                <Typography
                    sx={{
                        position: 'absolute',
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        lineHeight: 1,
                        color: isActive ? accent || 'primary.main' : 'text.secondary',
                    }}
                >
                    {isActive ? displayValue : I18n.t('wm_Off')}
                </Typography>
            </Box>
        );
    }

    protected renderTileAction(): React.JSX.Element {
        if (this.isModeSelectorMode()) {
            return (
                <>
                    {this.renderModeAction()}
                    {this.renderModeDialog()}
                </>
            );
        }

        const { level } = this.state;
        const accent = this.getAccentColor();

        if ((this.props.settings?.wideSliderStyle || 'horizontal') === 'round') {
            return this.renderArcKnob();
        }

        return (
            <MuiSlider
                value={level}
                min={0}
                max={100}
                size="small"
                onClick={e => e.stopPropagation()}
                onChange={this.onSliderDrag}
                onChangeCommitted={this.onSliderCommit}
                sx={theme => ({
                    width: 80,
                    color: accent || theme.palette.primary.main,
                    '& .MuiSlider-thumb': { width: 14, height: 14 },
                })}
            />
        );
    }

    // --- Valve compact: vertical fill bar ---

    private renderValveCompact(): React.JSX.Element {
        this.verticalDragMode = true;
        const { name, level, rawValue, unit, dragging } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const indicators = this.renderIndicators();
        const displayValue = unit === '%' ? `${level}%` : `${Math.round(rawValue)} ${unit}`;
        const accentOrDefault = accent || '#1976d2';

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={theme => WidgetGeneric.getStyleCompact(theme)}
            >
                <Box
                    ref={this.arcRef}
                    onPointerDown={this.onArcPointerDown}
                    onPointerMove={this.onArcPointerMove}
                    onPointerUp={this.onArcPointerUp}
                    onPointerCancel={this.onArcPointerUp}
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
                        touchAction: 'none',
                        userSelect: 'none',
                        position: 'relative',
                        ...getTileStyles(theme, isActive, accent),
                        padding: isNeumorphicTheme(theme) ? 'max(12px, 8cqi)' : 'max(16px, 10cqi)',
                    })}
                >
                    {/* Vertical fill from bottom */}
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: `${level}%`,
                            backgroundColor: accentOrDefault,
                            opacity: 0.15,
                            borderRadius: '0 0 14px 14px',
                            transition: dragging ? 'none' : 'height 0.3s ease',
                        }}
                    />

                    {indicators ? (
                        <Box
                            sx={theme => ({
                                position: 'absolute',
                                top: isNeumorphicTheme(theme) ? 'max(12px, 8cqi)' : 'max(16px, 10cqi)',
                                right: isNeumorphicTheme(theme) ? 'max(12px, 8cqi)' : 'max(16px, 10cqi)',
                                zIndex: 1,
                            })}
                        >
                            {indicators}
                        </Box>
                    ) : null}

                    {/* Center icon + value */}
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flex: 1,
                            position: 'relative',
                            zIndex: 1,
                            fontSize: 'max(48px, 32cqi)',
                            '& .MuiSvgIcon-root': { fontSize: 'inherit !important' },
                        }}
                    >
                        {this.renderTypeIcon()}
                        <Typography
                            variant="body2"
                            sx={theme => ({
                                fontWeight: 700,
                                fontSize: 'max(1.2rem, 14cqi)',
                                mt: 0.5,
                                color: isActive ? accentOrDefault : theme.palette.text.secondary,
                                transition: 'color 0.25s ease',
                            })}
                        >
                            {isActive ? displayValue : I18n.t('wm_Off')}
                        </Typography>
                    </Box>

                    {/* Name at bottom */}
                    <Box sx={{ position: 'relative', zIndex: 1 }}>
                        <Typography
                            ref={this.nameRef}
                            variant="body2"
                            sx={theme => ({
                                fontWeight: 600,
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                fontSize: 'max(0.875rem, 9cqi)',
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
                    </Box>
                    {this.renderChart()}
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    // --- Arc compact: used for normal, fan, gauge ---

    private renderArcCompact(): React.JSX.Element {
        this.verticalDragMode = false;
        const { name, level, dragging } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const indicators = this.renderIndicators();

        const vb = 100;
        const sw = 8;
        const r = (vb - sw) / 2;
        const circumference = 2 * Math.PI * r;
        const arcLength = circumference * 0.75; // 270°
        const progress = (level / 100) * arcLength;

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={theme => WidgetGeneric.getStyleCompact(theme)}
            >
                <Box
                    ref={this.arcRef}
                    onPointerDown={this.onArcPointerDown}
                    onPointerMove={this.onArcPointerMove}
                    onPointerUp={this.onArcPointerUp}
                    onPointerCancel={this.onArcPointerUp}
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
                        touchAction: 'none',
                        userSelect: 'none',
                        ...getTileStyles(theme, isActive, accent),
                        ...(isNeumorphicTheme(theme) ? { padding: 'max(12px, 8cqi)' } : {}),
                    })}
                >
                    {indicators ? (
                        <Box
                            sx={theme => ({
                                position: 'absolute',
                                top: isNeumorphicTheme(theme) ? 'max(12px, 8cqi)' : 16,
                                right: isNeumorphicTheme(theme) ? 'max(12px, 8cqi)' : 16,
                                zIndex: 1,
                            })}
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
                            {/* Background arc */}
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
                            {/* Progress arc */}
                            <circle
                                cx={vb / 2}
                                cy={vb / 2}
                                r={r}
                                fill="none"
                                stroke={isActive ? accent || 'var(--mui-palette-primary-main, #1976d2)' : 'transparent'}
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
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {this.renderTileIcon()}
                        </Box>
                    </Box>

                    <Box>
                        <Typography
                            ref={this.nameRef}
                            variant="body2"
                            sx={theme => ({
                                fontWeight: 600,
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
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
                        {this.renderTileStatus()}
                    </Box>
                    {this.renderChart()}
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    renderCompact(): React.JSX.Element {
        if (this.isModeSelectorMode()) {
            return this.renderModeCompact();
        }
        if (this.getSliderType() === 'valve') {
            return this.renderValveCompact();
        }
        return this.renderArcCompact();
    }
}

export default WidgetSlider;
