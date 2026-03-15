import React from 'react';
import { Box, Button, Dialog, IconButton, Tooltip, Typography } from '@mui/material';
import { Backspace, Lock, LockOpen, MeetingRoom, SensorDoor } from '@mui/icons-material';
import { I18n, Icon } from '@iobroker/adapter-react-v5';

import WidgetGeneric, { type WidgetGenericProps, type WidgetGenericState } from './Generic';

interface WidgetLockState extends WidgetGenericState {
    isLocked: boolean;
    doorOpen: boolean | null;
    showPinPad: boolean;
    pinInput: string;
    pinError: boolean;
    pendingAction: 'toggle' | 'open' | null;
}

export class WidgetLock extends WidgetGeneric<WidgetLockState> {
    private readonly setId: string | null;
    private readonly listenId: string | null;
    private readonly openId: string | null;
    private readonly doorStateId: string | null;

    constructor(props: WidgetGenericProps) {
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
            showPinPad: false,
            pinInput: '',
            pinError: false,
            pendingAction: null,
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

    private requirePin(): boolean {
        return !!this.props.settings?.pin;
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
        if (this.requirePin()) {
            this.setState({ showPinPad: true, pinInput: '', pinError: false, pendingAction: action });
        } else {
            this.executeAction(action);
        }
    };

    private onPinDigit = (digit: string): void => {
        const pinInput = this.state.pinInput + digit;
        const pin = this.props.settings?.pin || '';

        if (pinInput.length >= pin.length) {
            if (pinInput === pin) {
                this.setState({ showPinPad: false, pinInput: '', pinError: false });
                if (this.state.pendingAction) {
                    this.executeAction(this.state.pendingAction);
                }
            } else {
                this.setState({ pinInput: '', pinError: true });
                setTimeout(() => this.setState({ pinError: false }), 600);
            }
        } else {
            this.setState({ pinInput, pinError: false });
        }
    };

    private onPinBackspace = (): void => {
        this.setState(prev => ({ pinInput: prev.pinInput.slice(0, -1), pinError: false }));
    };

    private onPinClose = (): void => {
        this.setState({ showPinPad: false, pinInput: '', pinError: false, pendingAction: null });
    };

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
                        fontSize: 48,
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

    // --- Pin Pad ---

    private renderPinPad(): React.JSX.Element | null {
        if (!this.state.showPinPad) {
            return null;
        }

        const { pinInput, pinError } = this.state;
        const pinLength = this.props.settings?.pin?.length || 4;
        const dots = Array.from({ length: pinLength }, (_, i) => i < pinInput.length);

        const keys = [
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['', '0', 'back'],
        ];

        return (
            <Dialog
                open
                onClose={this.onPinClose}
                PaperProps={{
                    sx: {
                        borderRadius: '24px',
                        p: 3,
                        minWidth: 280,
                        maxWidth: 320,
                    },
                }}
            >
                <Typography
                    variant="h6"
                    sx={{ textAlign: 'center', mb: 3, fontWeight: 600 }}
                >
                    {I18n.t('wm_Enter PIN')}
                </Typography>

                {/* PIN dots */}
                <Box
                    sx={{
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
                    }}
                >
                    {dots.map((filled, i) => (
                        <Box
                            key={i}
                            sx={theme => ({
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
                            })}
                        />
                    ))}
                </Box>

                {/* Keypad */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                    {keys.map((row, ri) => (
                        <Box
                            key={ri}
                            sx={{ display: 'flex', gap: 1 }}
                        >
                            {row.map((key, ki) => {
                                if (key === '') {
                                    return (
                                        <Box
                                            key={ki}
                                            sx={{ width: 64, height: 64 }}
                                        />
                                    );
                                }
                                if (key === 'back') {
                                    return (
                                        <IconButton
                                            key={ki}
                                            onClick={this.onPinBackspace}
                                            disabled={pinInput.length === 0}
                                            sx={theme => ({
                                                width: 64,
                                                height: 64,
                                                color: theme.palette.text.secondary,
                                            })}
                                        >
                                            <Backspace />
                                        </IconButton>
                                    );
                                }
                                return (
                                    <Button
                                        key={ki}
                                        variant="text"
                                        onClick={() => this.onPinDigit(key)}
                                        sx={theme => ({
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
                                        })}
                                    >
                                        {key}
                                    </Button>
                                );
                            })}
                        </Box>
                    ))}
                </Box>

                <Button
                    variant="text"
                    onClick={this.onPinClose}
                    sx={{ mt: 2, alignSelf: 'center', textTransform: 'none' }}
                >
                    {I18n.t('wm_Cancel')}
                </Button>
            </Dialog>
        );
    }

    render(): React.JSX.Element {
        return (
            <>
                {super.render()}
                {this.renderPinPad()}
            </>
        );
    }
}

export default WidgetLock;
