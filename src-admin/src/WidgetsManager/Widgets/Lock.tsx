import React from 'react';
import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import { Lock, LockOpen, MeetingRoom, SensorDoor } from '@mui/icons-material';
import { I18n, Icon } from '@iobroker/adapter-react-v5';

import WidgetGeneric, { type WidgetGenericSettings, type WidgetGenericProps, type WidgetGenericState } from './Generic';
import type { ConfigItemPanel } from '@iobroker/json-config';

/** Settings for Lock widget */
export interface LockWidgetSettings extends WidgetGenericSettings {
    /** Confirmation mode: none, pin pad, or simple confirm dialog */
    confirmMode?: 'none' | 'pin' | 'confirm';
    /** When to require confirmation: only unlock, or both lock and unlock */
    confirmScope?: 'unlock' | 'both';
    /** PIN code (only used when confirmMode is 'pin') */
    pin?: string;
    /** Custom confirmation text */
    confirmText?: string;
}

interface WidgetLockState extends WidgetGenericState {
    isLocked: boolean;
    doorOpen: boolean | null;
    pendingAction: 'toggle' | 'open' | null;
}

export class WidgetLock extends WidgetGeneric<WidgetLockState, LockWidgetSettings> {
    private readonly setId: string | null;
    private readonly listenId: string | null;
    private readonly openId: string | null;
    private readonly doorStateId: string | null;

    constructor(props: WidgetGenericProps<LockWidgetSettings>) {
        super(props);
        const states = props.widget.control.states;
        const set = states.find(s => s.name === 'SET');
        const actual = states.find(s => s.name === 'ACTUAL');
        const open = states.find(s => s.name === 'OPEN');
        const doorState = states.find(s => s.name === 'DOOR_STATE');

        this.setId = set?.id ?? null;
        this.listenId = actual?.id ?? set?.id ?? null;
        this.openId = open?.id ?? null;
        this.doorStateId = doorState?.id ?? null;

        this.state = {
            ...this.state,
            isLocked: true,
            doorOpen: null,
            pendingAction: null,
        };
    }

    static getDefaultSettings(): LockWidgetSettings {
        return {
            ...WidgetGeneric.getDefaultSettings(),
            confirmMode: 'none',
            confirmScope: 'unlock',
            pin: '',
            confirmText: '',
        };
    }

    static getConfigSchema(): { name: string; schema: ConfigItemPanel } {
        return {
            name: 'Lock',
            schema: {
                type: 'panel',
                items: {
                    confirmMode: {
                        type: 'select',
                        label: 'wm_Confirmation',
                        options: [
                            { value: 'none', label: 'wm_No confirmation' },
                            { value: 'pin', label: 'wm_PIN code' },
                            { value: 'confirm', label: 'wm_Confirm dialog' },
                        ],
                        default: 'none',
                        format: 'dropdown',
                    },
                    confirmScope: {
                        type: 'select',
                        label: 'wm_Confirm scope',
                        options: [
                            { value: 'unlock', label: 'wm_Unlock only' },
                            { value: 'both', label: 'wm_Lock and unlock' },
                        ],
                        default: 'unlock',
                        format: 'radio',
                        hidden: "data.confirmMode === 'none' || !data.confirmMode",
                    },
                    pin: {
                        type: 'text',
                        label: 'wm_PIN Code',
                        default: '',
                        hidden: "data.confirmMode !== 'pin'",
                    },
                    confirmText: {
                        type: 'text',
                        label: 'wm_Confirmation text',
                        default: '',
                        hidden: "data.confirmMode === 'none' || !data.confirmMode",
                    },
                },
            },
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.listenId) {
            this.props.stateContext.getState(this.listenId, this.onLockStateChange);
        }
        if (this.doorStateId) {
            this.props.stateContext.getState(this.doorStateId, this.onDoorStateChange);
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.listenId) {
            this.props.stateContext.removeState(this.listenId, this.onLockStateChange);
        }
        if (this.doorStateId) {
            this.props.stateContext.removeState(this.doorStateId, this.onDoorStateChange);
        }
    }

    onLockStateChange = (_id: string, state: ioBroker.State): void => {
        const isLocked = !!state.val;
        if (isLocked !== this.state.isLocked) {
            this.setState({ isLocked });
        }
    };

    onDoorStateChange = (_id: string, state: ioBroker.State): void => {
        const doorOpen = state.val != null ? !!state.val : null;
        if (doorOpen !== this.state.doorOpen) {
            this.setState({ doorOpen });
        }
    };

    /** Check if the action needs confirmation based on settings and current state */
    private needsConfirmation(action: 'toggle' | 'open'): boolean {
        const mode = this.props.settings?.confirmMode || 'none';
        if (mode === 'none') {
            // Legacy: support old 'pin' field without confirmMode
            return !!this.props.settings?.pin;
        }
        const scope = this.props.settings?.confirmScope || 'unlock';
        if (scope === 'both') {
            return true;
        }
        // scope === 'unlock': only confirm when unlocking or opening
        return action === 'open' || this.state.isLocked;
    }

    private executeAction(action: 'toggle' | 'open'): void {
        if (action === 'toggle') {
            if (this.setId) {
                void this.props.stateContext.getSocket().setState(this.setId, !this.state.isLocked);
            }
        } else if (action === 'open') {
            if (this.openId) {
                void this.props.stateContext.getSocket().setState(this.openId, true);
            }
        }
    }

    private requestAction = (action: 'toggle' | 'open'): void => {
        if (!this.needsConfirmation(action)) {
            this.executeAction(action);
            return;
        }

        this.setState({ pendingAction: action });

        const mode = this.props.settings?.confirmMode || (this.props.settings?.pin ? 'pin' : 'none');
        if (mode === 'pin') {
            this.showPinPad(this.props.settings?.pin || '');
        } else if (mode === 'confirm') {
            this.showConfirmDialog('dialog', undefined, this.props.settings?.confirmText);
        }
    };

    // --- Callbacks ---

    protected onPinPadSuccess(): void {
        if (this.state.pendingAction) {
            this.executeAction(this.state.pendingAction);
            this.setState({ pendingAction: null });
        }
    }

    protected onConfirmDialogSuccess(): void {
        if (this.state.pendingAction) {
            this.executeAction(this.state.pendingAction);
            this.setState({ pendingAction: null });
        }
    }

    // --- Overrides ---

    protected isTileActive(): boolean {
        return !this.state.isLocked;
    }

    // eslint-disable-next-line class-methods-use-this
    protected hasTileAction(): boolean {
        return true;
    }

    protected onTileClick(): void {
        this.requestAction('toggle');
    }

    protected renderTileIcon(): React.JSX.Element {
        const { isLocked, doorOpen } = this.state;
        const accent = this.getAccentColor();
        const IconComponent = isLocked ? Lock : LockOpen;
        const customIcon = this.state.icon;

        return (
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <IconComponent
                    sx={theme => ({
                        color: isLocked ? theme.palette.success.main : accent || theme.palette.error.main,
                        transition: 'color 0.25s ease',
                    })}
                />
                {customIcon ? (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: -4,
                            left: -4,
                            width: 20,
                            height: 20,
                            borderRadius: '10%',
                            backgroundColor: 'background.paper',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 1,
                            '& img': { width: '14px !important', height: '14px !important' },
                        }}
                    >
                        <Icon
                            src={customIcon}
                            style={{ width: 14, height: 14, opacity: 0.5 }}
                        />
                    </Box>
                ) : null}
                {doorOpen != null ? (
                    <Tooltip title={doorOpen ? I18n.t('wm_Open') : I18n.t('wm_Closed')}>
                        <SensorDoor
                            sx={theme => ({
                                position: 'absolute',
                                bottom: -2,
                                right: -6,
                                fontSize: 18,
                                color: doorOpen ? theme.palette.warning.main : theme.palette.text.disabled,
                                transition: 'color 0.25s ease',
                            })}
                        />
                    </Tooltip>
                ) : null}
            </Box>
        );
    }

    protected renderTileStatus(): React.JSX.Element {
        const { isLocked, doorOpen } = this.state;
        const accent = this.getAccentColor();

        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography
                    variant="caption"
                    sx={theme => ({
                        fontWeight: 500,
                        color: isLocked ? theme.palette.success.main : accent || theme.palette.error.main,
                        transition: 'color 0.25s ease',
                    })}
                >
                    {isLocked ? I18n.t('wm_Locked') : I18n.t('wm_Unlocked')}
                </Typography>
                {doorOpen != null ? (
                    <Typography
                        variant="caption"
                        sx={theme => ({
                            fontWeight: 500,
                            color: doorOpen ? theme.palette.warning.main : theme.palette.text.disabled,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                        })}
                    >
                        <SensorDoor sx={{ fontSize: 12 }} />
                        {doorOpen ? I18n.t('wm_Open') : I18n.t('wm_Closed')}
                    </Typography>
                ) : null}
            </Box>
        );
    }

    protected renderTileAction(): React.JSX.Element {
        const { isLocked, doorOpen } = this.state;
        const accent = this.getAccentColor();

        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                    variant="outlined"
                    size="small"
                    onClick={e => {
                        e.stopPropagation();
                        this.requestAction('toggle');
                    }}
                    sx={theme => ({
                        borderColor: isLocked ? theme.palette.success.main : accent || theme.palette.error.main,
                        color: isLocked ? theme.palette.success.main : accent || theme.palette.error.main,
                        textTransform: 'none',
                        minWidth: 0,
                    })}
                >
                    {isLocked ? I18n.t('wm_Unlock') : I18n.t('wm_Lock')}
                </Button>
                {this.openId ? (
                    <IconButton
                        size="small"
                        onClick={e => {
                            e.stopPropagation();
                            this.requestAction('open');
                        }}
                        sx={{ color: 'text.secondary' }}
                    >
                        <MeetingRoom fontSize="small" />
                    </IconButton>
                ) : null}
                {doorOpen != null ? (
                    <Tooltip title={doorOpen ? I18n.t('wm_Open') : I18n.t('wm_Closed')}>
                        <SensorDoor
                            sx={theme => ({
                                fontSize: 20,
                                color: doorOpen ? theme.palette.warning.main : theme.palette.text.disabled,
                                ml: 'auto',
                            })}
                        />
                    </Tooltip>
                ) : null}
            </Box>
        );
    }

    renderCompact(): React.JSX.Element {
        const base = super.renderCompact();
        if (!this.openId) {
            return base;
        }

        return (
            <Box sx={{ position: 'relative' }}>
                {base}
                <Tooltip title={I18n.t('wm_Open door')}>
                    <IconButton
                        onClick={e => {
                            e.stopPropagation();
                            this.requestAction('open');
                        }}
                        sx={theme => ({
                            position: 'absolute',
                            bottom: 6,
                            right: 6,
                            zIndex: 1,
                            color: theme.palette.text.secondary,
                            opacity: 0.7,
                            '&:hover': {
                                opacity: 1,
                                backgroundColor: theme.palette.action.hover,
                            },
                        })}
                    >
                        <MeetingRoom />
                    </IconButton>
                </Tooltip>
            </Box>
        );
    }
}

export default WidgetLock;
