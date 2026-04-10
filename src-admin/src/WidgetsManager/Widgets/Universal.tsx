import React, { Component } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    type Theme,
    Typography,
} from '@mui/material';
import { Settings } from '@mui/icons-material';
import { I18n, Icon } from '@iobroker/adapter-react-v5';

import type StateContext from '../StateContext';
import type { StateChangeListener } from '../StateContext';
import WidgetGeneric, { getTileStyles, formatFloat } from './Generic';
import ChartDialog from './ChartDialog';
import type { CustomWidgetBase } from '@iobroker/dm-widgets';

interface ColorLevel {
    value: number;
    color: string;
}

interface IconDef {
    stateId: string;
    icon: string;
    color: string;
}

export interface WidgetUniversalSettings extends CustomWidgetBase {
    secondaryName?: string;
    digits?: number;
    /** Widget icon (inactive / default) */
    widgetIcon?: string;
    /** Widget icon when active (shown when action state is truthy) */
    widgetIconActive?: string;
    stateId?: string;
    secondaryStateId?: string;
    opacityStateId?: string;
    opacityFalse?: number;
    opacityTrue?: number;
    colorLevels?: ColorLevel[];
    icons?: IconDef[];
    actionStateId?: string;
    actionType?: 'value' | 'toggle';
    actionValue?: string | number | boolean;
    /** Confirmation before executing action: 'none', 'dialog', or 'pin' */
    actionConfirm?: 'none' | 'dialog' | 'pin';
    /** Custom confirmation dialog text */
    actionConfirmText?: string;
    /** PIN code required when actionConfirm is 'pin' */
    actionPin?: string;
}

interface WidgetUniversalProps {
    settings: WidgetUniversalSettings;
    stateContext: StateContext;
    onOpenSettings?: (id: string) => void;
    onRemove?: (id: string) => void;
}

interface WidgetUniversalState {
    value: number | null;
    unit: string;
    secondaryValue: number | null;
    secondaryUnit: string;
    opacity: number;
    iconStates: boolean[];
    /** Whether the action state is currently truthy (for active icon) */
    actionActive: boolean;
    confirmOpen: boolean;
    pinInput: string;
    pinError: boolean;
    chartOpen: boolean;
    historyId: string | null;
    historyInstance: string;
}

export class WidgetUniversal extends Component<WidgetUniversalProps, WidgetUniversalState> {
    /** Build WidgetUniversalSettings from a flat CustomWidgetBase (resolves icon1StateId/icon1Name/icon1Color → icons[]) */
    static buildSettings(def: CustomWidgetBase): WidgetUniversalSettings {
        const d = def as Record<string, any>;
        return {
            ...def,
            icons: [
                d.icon1StateId ? { stateId: d.icon1StateId, icon: d.icon1Name || '', color: d.icon1Color || '' } : null,
                d.icon2StateId ? { stateId: d.icon2StateId, icon: d.icon2Name || '', color: d.icon2Color || '' } : null,
                d.icon3StateId ? { stateId: d.icon3StateId, icon: d.icon3Name || '', color: d.icon3Color || '' } : null,
            ].filter(Boolean) as IconDef[],
        } as WidgetUniversalSettings;
    }

    private primaryHandler: StateChangeListener | null = null;
    private actionHandler: StateChangeListener | null = null;
    private secondaryHandler: StateChangeListener | null = null;
    private opacityHandler: StateChangeListener | null = null;
    private iconHandlers: (StateChangeListener | null)[] = [];

    /** Cached object metadata keyed by state ID */
    private objectCache = new Map<string, ioBroker.StateObject>();

    /** Resolved settings with icons[] built from flat icon1/2/3 fields */
    private resolved: WidgetUniversalSettings;

    constructor(props: WidgetUniversalProps) {
        super(props);
        this.resolved = WidgetUniversal.buildSettings(props.settings);
        this.state = {
            value: null,
            unit: '',
            secondaryValue: null,
            secondaryUnit: '',
            opacity: 1,
            iconStates: [false, false, false],
            actionActive: false,
            confirmOpen: false,
            pinInput: '',
            pinError: false,
            chartOpen: false,
            historyId: null,
            historyInstance: '',
        };
    }

    componentDidMount(): void {
        this.subscribe();
    }

    componentDidUpdate(prev: WidgetUniversalProps): void {
        if (prev.settings !== this.props.settings) {
            this.resolved = WidgetUniversal.buildSettings(this.props.settings);
        }
        if (
            prev.settings.stateId !== this.props.settings.stateId ||
            prev.settings.secondaryStateId !== this.props.settings.secondaryStateId ||
            prev.settings.opacityStateId !== this.props.settings.opacityStateId ||
            prev.settings.icons !== this.props.settings.icons
        ) {
            this.unsubscribe();
            this.objectCache.clear();
            this.subscribe();
        }
    }

    componentWillUnmount(): void {
        this.unsubscribe();
    }

    /** Get a StateObject from cache or fetch it once */
    private async getCachedObject(id: string): Promise<ioBroker.StateObject | undefined> {
        const cached = this.objectCache.get(id);
        if (cached) {
            return cached;
        }
        const obj = await this.props.stateContext?.getObject<ioBroker.StateObject>(id);
        if (obj) {
            this.objectCache.set(id, obj);
        }
        return obj;
    }

    private subscribe(): void {
        const ctx = this.props.stateContext;
        if (!ctx) {
            return;
        }

        // Primary value
        if (this.props.settings.stateId) {
            this.primaryHandler = (_id, state) => {
                const val = state?.val;
                this.setState({ value: val != null ? Number(val) : null });
            };
            ctx.getState(this.props.settings.stateId, this.primaryHandler);
            void this.getCachedObject(this.props.settings.stateId).then(obj => {
                if (obj?.common?.unit) {
                    this.setState({ unit: obj.common.unit });
                }
            });
        }

        // Secondary value
        if (this.props.settings.secondaryStateId) {
            this.secondaryHandler = (_id, state) => {
                const val = state?.val;
                this.setState({ secondaryValue: val != null ? Number(val) : null });
            };
            ctx.getState(this.props.settings.secondaryStateId, this.secondaryHandler);
            void this.getCachedObject(this.props.settings.secondaryStateId).then(obj => {
                if (obj?.common?.unit) {
                    this.setState({ secondaryUnit: obj.common.unit });
                }
            });
        }

        // Opacity
        if (this.props.settings.opacityStateId) {
            this.opacityHandler = (_id, state) => {
                const val = state?.val;
                if (typeof val === 'boolean') {
                    this.setState({
                        opacity: val ? (this.props.settings.opacityTrue ?? 1) : (this.props.settings.opacityFalse ?? 0),
                    });
                } else if (val != null) {
                    // Will compute properly once we have min/max from object
                    this.computeNumericOpacity(Number(val));
                }
            };
            ctx.getState(this.props.settings.opacityStateId, this.opacityHandler);
            void this.getCachedObject(this.props.settings.opacityStateId).then(obj => {
                const common = obj?.common;
                this.opacityMeta = {
                    min: common?.min,
                    max: common?.max,
                    type: common?.type,
                };
            });
        }

        // Icons (up to 3)
        const icons = (this.resolved.icons || []).slice(0, 3);
        this.iconHandlers = icons.map((iconDef, idx) => {
            if (!iconDef.stateId) {
                return null;
            }
            const handler: StateChangeListener = (_id, state) => {
                this.setState(prev => {
                    const iconStates = [...prev.iconStates];
                    iconStates[idx] = !!state?.val;
                    return { iconStates };
                });
            };
            ctx.getState(iconDef.stateId, handler);
            return handler;
        });

        // Subscribe to action state for active icon + pre-fetch object
        if (this.props.settings.actionStateId) {
            void this.getCachedObject(this.props.settings.actionStateId);
            if (this.props.settings.widgetIconActive) {
                this.actionHandler = (_id, state) => {
                    this.setState({ actionActive: !!state?.val });
                };
                ctx.getState(this.props.settings.actionStateId, this.actionHandler);
            }
        }

        // Resolve history for chart
        this.resolveHistory();
    }

    private opacityMeta: { min?: number; max?: number; type?: string } = {};

    /** Check if the primary state has history enabled and resolve the history adapter */
    private resolveHistory(): void {
        const { stateId } = this.props.settings;
        const { stateContext } = this.props;
        if (!stateId || !stateContext) {
            this.setState({ historyId: null, historyInstance: '' });
            return;
        }
        const socket = stateContext.getSocket();

        void (async () => {
            let instance = stateContext.defaultHistory || '';
            if (!instance) {
                try {
                    const cfg = await socket.getObject('system.config');
                    instance = ((cfg?.common as unknown as Record<string, unknown>)?.defaultHistory as string) || '';
                } catch {
                    // ignore
                }
            }
            if (!instance) {
                this.setState({ historyId: null, historyInstance: '' });
                return;
            }

            try {
                const obj = await this.getCachedObject(stateId);
                if (obj?.common?.custom?.[instance]?.enabled) {
                    this.setState({ historyId: stateId, historyInstance: instance });
                    return;
                }
                // Follow alias
                const aliasId = obj?.common?.alias?.id;
                if (aliasId) {
                    const targetId = typeof aliasId === 'object' ? (aliasId as { read?: string }).read : aliasId;
                    if (targetId && targetId !== stateId) {
                        const targetObj = await socket.getObject(targetId);
                        if ((targetObj as ioBroker.StateObject)?.common?.custom?.[instance]?.enabled) {
                            this.setState({ historyId: targetId, historyInstance: instance });
                            return;
                        }
                    }
                }
            } catch {
                // ignore
            }
            this.setState({ historyId: null, historyInstance: instance });
        })();
    }

    private computeNumericOpacity(val: number): void {
        const { min, max } = this.opacityMeta;
        let opacity: number;
        if (min != null && max != null && max !== min) {
            opacity = Math.max(0, Math.min(1, (val - min) / (max - min)));
        } else {
            // Assume 0-1 range
            opacity = Math.max(0, Math.min(1, val));
        }
        this.setState({ opacity });
    }

    private unsubscribe(): void {
        const ctx = this.props.stateContext;
        if (!ctx) {
            return;
        }
        if (this.primaryHandler && this.props.settings.stateId) {
            ctx.removeState(this.props.settings.stateId, this.primaryHandler);
            this.primaryHandler = null;
        }
        if (this.secondaryHandler && this.props.settings.secondaryStateId) {
            ctx.removeState(this.props.settings.secondaryStateId, this.secondaryHandler);
            this.secondaryHandler = null;
        }
        if (this.opacityHandler && this.props.settings.opacityStateId) {
            ctx.removeState(this.props.settings.opacityStateId, this.opacityHandler);
            this.opacityHandler = null;
        }
        if (this.actionHandler && this.props.settings.actionStateId) {
            ctx.removeState(this.props.settings.actionStateId, this.actionHandler);
            this.actionHandler = null;
        }
        const icons = (this.resolved.icons || []).slice(0, 3);
        for (let i = 0; i < this.iconHandlers.length; i++) {
            const handler = this.iconHandlers[i];
            if (handler && icons[i]?.stateId) {
                ctx.removeState(icons[i].stateId, handler);
            }
        }
        this.iconHandlers = [];
    }

    private getValueColor(): string | undefined {
        const { value } = this.state;
        const levels = this.props.settings.colorLevels;
        if (value == null || !levels?.length) {
            return this.props.settings.color || undefined;
        }
        const sorted = [...levels].sort((a, b) => a.value - b.value);
        for (const lvl of sorted) {
            if (value <= lvl.value) {
                return lvl.color;
            }
        }
        return sorted[sorted.length - 1].color;
    }

    private formatValue(val: number): string {
        const digits = this.props.settings.digits ?? 1;
        return formatFloat(val, digits, this.props.stateContext.isFloatComma);
    }

    /** Execute the action (send value / toggle) — called after confirmation if needed */
    private executeAction(): void {
        const { actionStateId, actionType, actionValue } = this.props.settings;
        const { stateContext } = this.props;
        if (!actionStateId || !stateContext) {
            return;
        }
        const socket = stateContext.getSocket();
        if (actionType === 'toggle') {
            void socket.getState(actionStateId).then(state => {
                if (state) {
                    void socket.setState(actionStateId, !state.val);
                }
            });
        } else {
            void this.getCachedObject(actionStateId).then(obj => {
                const commonType = obj?.common?.type;
                let val: ioBroker.StateValue;
                if (commonType === 'boolean') {
                    val = actionValue === 'true' || actionValue === true || actionValue === 1;
                } else if (commonType === 'number') {
                    val = Number(actionValue);
                } else {
                    val = actionValue != null ? String(actionValue) : '';
                }
                void socket.setState(actionStateId, val);
            });
        }
    }

    private handleTileClick = (): void => {
        if (this.props.settings.actionStateId && this.props.stateContext) {
            // Action configured — execute (with confirmation if needed)
            const confirm = this.props.settings.actionConfirm || 'none';
            if (confirm === 'dialog' || confirm === 'pin') {
                this.setState({ confirmOpen: true, pinInput: '', pinError: false });
            } else {
                this.executeAction();
            }
        } else if (this.state.historyId) {
            // No action but history available — open chart
            this.setState({ chartOpen: true });
        }
    };

    private handleConfirm = (): void => {
        if (this.props.settings.actionConfirm === 'pin') {
            if (this.state.pinInput === (this.props.settings.actionPin || '')) {
                this.setState({ confirmOpen: false, pinInput: '', pinError: false });
                this.executeAction();
            } else {
                this.setState({ pinError: true });
            }
        } else {
            this.setState({ confirmOpen: false });
            this.executeAction();
        }
    };

    private handleConfirmClose = (): void => {
        this.setState({ confirmOpen: false, pinInput: '', pinError: false });
    };

    private renderSettingsButton(): React.JSX.Element | null {
        if (!this.props.onOpenSettings) {
            return null;
        }
        return (
            <Box
                component="span"
                role="button"
                tabIndex={0}
                onClick={e => {
                    e.stopPropagation();
                    this.props.onOpenSettings!(this.props.settings.id);
                }}
                onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        this.props.onOpenSettings!(this.props.settings.id);
                    }
                }}
                sx={WidgetGeneric.getSettingButtonStyle()}
            >
                <Settings sx={{ fontSize: 16 }} />
            </Box>
        );
    }

    static renderIcon(iconDef: IconDef, active: boolean, iconSize = 18): React.JSX.Element | null {
        if (!active || !iconDef.icon) {
            return null;
        }
        return (
            <Icon
                src={iconDef.icon}
                style={{ width: iconSize, height: iconSize, color: iconDef.color || undefined }}
            />
        );
    }

    render(): React.JSX.Element | null {
        const { opacity, value, unit, secondaryValue, secondaryUnit, iconStates } = this.state;
        const isEditing = !!this.props.onOpenSettings;

        // If opacity is 0, hide completely — but always show in edit mode
        if (opacity <= 0 && !isEditing) {
            return null;
        }

        // In edit mode, ensure minimum visibility
        const displayOpacity = isEditing ? Math.max(opacity, 0.35) : opacity;

        const valueColor = this.getValueColor();
        const icons = (this.resolved.icons || []).slice(0, 3);
        const activeIcons = icons.filter((_, i) => iconStates[i]);
        const clickable = !!this.props.settings.actionStateId || !!this.state.historyId;

        const size = this.props.settings.size || '1x1';
        const isWide = size === '2x1' || size === '2x0.5';

        return (
            <Box
                sx={theme => ({
                    ...(isWide ? WidgetGeneric.getStyleWide(theme) : WidgetGeneric.getStyleCompact(theme)),
                    aspectRatio: size === '2x0.5' ? undefined : isWide ? '2' : '1',
                    ...(size === '2x0.5' && { height: 80 }),
                    opacity: displayOpacity < 1 ? displayOpacity : undefined,
                    transition: 'opacity 0.3s ease',
                })}
            >
                <Box
                    onClick={clickable ? this.handleTileClick : undefined}
                    sx={(theme: Theme) => ({
                        ...getTileStyles(theme, false, this.props.settings.color, clickable),
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                        p: 1.5,
                        cursor: clickable ? 'pointer' : 'default',
                    })}
                >
                    {this.renderSettingsButton()}

                    {/* Secondary value — upper right */}
                    {secondaryValue != null || this.props.settings.secondaryName ? (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 6,
                                right: 8,
                                textAlign: 'right',
                            }}
                        >
                            {secondaryValue != null ? (
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontSize: isWide ? 18 : 14,
                                        lineHeight: 1.2,
                                        color: 'text.secondary',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {this.formatValue(secondaryValue)}
                                    {secondaryUnit ? (
                                        <Typography
                                            component="span"
                                            sx={{ fontSize: '0.8em', ml: 0.25, opacity: 0.7 }}
                                        >
                                            {secondaryUnit}
                                        </Typography>
                                    ) : null}
                                </Typography>
                            ) : null}
                            {this.props.settings.secondaryName ? (
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontSize: 10,
                                        lineHeight: 1,
                                        color: 'text.disabled',
                                        display: 'block',
                                    }}
                                >
                                    {this.props.settings.secondaryName}
                                </Typography>
                            ) : null}
                        </Box>
                    ) : null}

                    {/* Icon indicators — upper left */}
                    {activeIcons.length > 0 ? (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                display: 'flex',
                                gap: 0.5,
                            }}
                        >
                            {icons.map((iconDef, i) => (
                                <React.Fragment key={i}>
                                    {WidgetUniversal.renderIcon(iconDef, iconStates[i], isWide ? 28 : 18)}
                                </React.Fragment>
                            ))}
                        </Box>
                    ) : null}

                    {/* Widget icon + Primary value — center */}
                    {(() => {
                        const iconSrc =
                            this.state.actionActive && this.props.settings.widgetIconActive
                                ? this.props.settings.widgetIconActive
                                : this.props.settings.widgetIcon;
                        const iconSize = isWide ? 48 : 32;
                        return (
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: isWide ? 1.5 : 1,
                                }}
                            >
                                {iconSrc ? (
                                    <Icon
                                        src={iconSrc}
                                        style={{
                                            width: iconSize,
                                            height: iconSize,
                                            color: valueColor || undefined,
                                            flexShrink: 0,
                                        }}
                                    />
                                ) : null}
                                {value != null ? (
                                    <Typography
                                        sx={{
                                            fontSize: isWide ? 56 : 36,
                                            fontWeight: 700,
                                            lineHeight: 1,
                                            color: valueColor,
                                            textAlign: 'center',
                                        }}
                                    >
                                        {this.formatValue(value)}
                                        <Typography
                                            component="span"
                                            sx={{ fontSize: '0.45em', fontWeight: 400, ml: 0.5, opacity: 0.7 }}
                                        >
                                            {unit}
                                        </Typography>
                                    </Typography>
                                ) : (
                                    <Typography sx={{ fontSize: isWide ? 48 : 32, color: 'text.disabled' }}>
                                        —
                                    </Typography>
                                )}
                            </Box>
                        );
                    })()}

                    {/* Name — below value */}
                    {this.props.settings.name ? (
                        <Typography
                            sx={{
                                fontSize: isWide ? 16 : 12,
                                fontWeight: 500,
                                color: 'text.secondary',
                                textAlign: 'center',
                                mt: 0.5,
                                lineHeight: 1.2,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '90%',
                            }}
                        >
                            {this.props.settings.name}
                        </Typography>
                    ) : null}
                </Box>

                {/* Confirmation / PIN dialog */}
                {this.state.confirmOpen ? (
                    <Dialog
                        open
                        onClose={this.handleConfirmClose}
                        maxWidth="xs"
                        onClick={e => e.stopPropagation()}
                    >
                        <DialogTitle>
                            {this.props.settings.actionConfirmText ||
                                I18n.t(
                                    this.props.settings.actionConfirm === 'pin' ? 'wm_Enter PIN' : 'wm_Are you sure',
                                )}
                        </DialogTitle>
                        {this.props.settings.actionConfirm === 'pin' ? (
                            <DialogContent>
                                <TextField
                                    autoFocus
                                    type="password"
                                    inputMode="numeric"
                                    value={this.state.pinInput}
                                    onChange={e => this.setState({ pinInput: e.target.value, pinError: false })}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            this.handleConfirm();
                                        }
                                    }}
                                    error={this.state.pinError}
                                    helperText={this.state.pinError ? I18n.t('wm_Wrong PIN') : undefined}
                                    fullWidth
                                    size="small"
                                    sx={{ mt: 1 }}
                                />
                            </DialogContent>
                        ) : null}
                        <DialogActions>
                            <Button
                                variant="contained"
                                onClick={this.handleConfirm}
                                disabled={this.props.settings.actionConfirm === 'pin' && !this.state.pinInput}
                            >
                                {I18n.t('wm_OK')}
                            </Button>
                            <Button onClick={this.handleConfirmClose}>{I18n.t('wm_Cancel')}</Button>
                        </DialogActions>
                    </Dialog>
                ) : null}

                {/* Chart dialog */}
                {this.state.chartOpen &&
                this.state.historyId &&
                this.state.historyInstance &&
                this.props.stateContext ? (
                    <ChartDialog
                        open
                        onClose={() => this.setState({ chartOpen: false })}
                        title={this.props.settings.name || this.props.settings.id}
                        historyIds={[
                            {
                                id: this.state.historyId,
                                color: this.props.settings.color || '#2196f3',
                                name: this.props.settings.name || this.props.settings.id,
                            },
                        ]}
                        historyInstance={this.state.historyInstance}
                        socket={this.props.stateContext.getSocket()}
                        unit={this.state.unit}
                        isFloatComma={this.props.stateContext.isFloatComma}
                        widgetId={this.props.settings.id}
                        instanceId={this.props.stateContext.instanceId}
                    />
                ) : null}
            </Box>
        );
    }
}
