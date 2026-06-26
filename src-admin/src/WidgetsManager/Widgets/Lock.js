import React from 'react';
import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import { Lock, LockOpen, MeetingRoom, SensorDoor } from '@mui/icons-material';
import { I18n, Icon } from '@iobroker/adapter-react-v5';
import WidgetGeneric, {} from './Generic';
export class WidgetLock extends WidgetGeneric {
    setId;
    listenId;
    openId;
    doorStateId;
    constructor(props) {
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
    static getDefaultSettings() {
        return {
            ...WidgetGeneric.getDefaultSettings(),
            confirmMode: 'none',
            confirmScope: 'unlock',
            pin: '',
            confirmText: '',
        };
    }
    static getConfigSchema() {
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
    componentDidMount() {
        super.componentDidMount();
        if (this.listenId) {
            this.props.stateContext.getState(this.listenId, this.onLockStateChange);
        }
        if (this.doorStateId) {
            this.props.stateContext.getState(this.doorStateId, this.onDoorStateChange);
        }
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.listenId) {
            this.props.stateContext.removeState(this.listenId, this.onLockStateChange);
        }
        if (this.doorStateId) {
            this.props.stateContext.removeState(this.doorStateId, this.onDoorStateChange);
        }
    }
    onLockStateChange = (_id, state) => {
        const isLocked = !!state.val;
        if (isLocked !== this.state.isLocked) {
            this.setState({ isLocked });
        }
    };
    onDoorStateChange = (_id, state) => {
        const doorOpen = state.val != null ? !!state.val : null;
        if (doorOpen !== this.state.doorOpen) {
            this.setState({ doorOpen });
        }
    };
    /** Check if the action needs confirmation based on settings and current state */
    needsConfirmation(action) {
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
    executeAction(action) {
        if (action === 'toggle') {
            if (this.setId) {
                void this.props.stateContext.getSocket().setState(this.setId, !this.state.isLocked);
            }
        }
        else if (action === 'open') {
            if (this.openId) {
                void this.props.stateContext.getSocket().setState(this.openId, true);
            }
        }
    }
    requestAction = (action) => {
        if (!this.needsConfirmation(action)) {
            this.executeAction(action);
            return;
        }
        this.setState({ pendingAction: action });
        const mode = this.props.settings?.confirmMode || (this.props.settings?.pin ? 'pin' : 'none');
        if (mode === 'pin') {
            this.showPinPad(this.props.settings?.pin || '');
        }
        else if (mode === 'confirm') {
            this.showConfirmDialog('dialog', undefined, this.props.settings?.confirmText);
        }
    };
    // --- Callbacks ---
    onPinPadSuccess() {
        if (this.state.pendingAction) {
            this.executeAction(this.state.pendingAction);
            this.setState({ pendingAction: null });
        }
    }
    onConfirmDialogSuccess() {
        if (this.state.pendingAction) {
            this.executeAction(this.state.pendingAction);
            this.setState({ pendingAction: null });
        }
    }
    // --- Overrides ---
    isTileActive() {
        return !this.state.isLocked;
    }
    // eslint-disable-next-line class-methods-use-this
    hasTileAction() {
        return true;
    }
    onTileClick() {
        this.requestAction('toggle');
    }
    renderTileIcon() {
        const { isLocked, doorOpen } = this.state;
        const accent = this.getAccentColor();
        const IconComponent = isLocked ? Lock : LockOpen;
        const customIcon = this.state.icon;
        return (React.createElement(Box, { sx: { position: 'relative', display: 'inline-flex' } },
            React.createElement(IconComponent, { sx: theme => ({
                    color: isLocked ? theme.palette.success.main : accent || theme.palette.error.main,
                    transition: 'color 0.25s ease',
                }) }),
            customIcon ? (React.createElement(Box, { sx: {
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
                } },
                React.createElement(Icon, { src: customIcon, style: { width: 14, height: 14, opacity: 0.5 } }))) : null,
            doorOpen != null ? (React.createElement(Tooltip, { title: doorOpen ? I18n.t('wm_Open') : I18n.t('wm_Closed') },
                React.createElement(SensorDoor, { sx: theme => ({
                        position: 'absolute',
                        bottom: -2,
                        right: -6,
                        fontSize: 18,
                        color: doorOpen ? theme.palette.warning.main : theme.palette.text.disabled,
                        transition: 'color 0.25s ease',
                    }) }))) : null));
    }
    renderTileStatus() {
        const { isLocked, doorOpen } = this.state;
        const accent = this.getAccentColor();
        return (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
            React.createElement(Typography, { variant: "caption", sx: theme => ({
                    fontWeight: 500,
                    color: isLocked ? theme.palette.success.main : accent || theme.palette.error.main,
                    transition: 'color 0.25s ease',
                }) }, isLocked ? I18n.t('wm_Locked') : I18n.t('wm_Unlocked')),
            doorOpen != null ? (React.createElement(Typography, { variant: "caption", sx: theme => ({
                    fontWeight: 500,
                    color: doorOpen ? theme.palette.warning.main : theme.palette.text.disabled,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                }) },
                React.createElement(SensorDoor, { sx: { fontSize: 12 } }),
                doorOpen ? I18n.t('wm_Open') : I18n.t('wm_Closed'))) : null));
    }
    renderTileAction() {
        const { isLocked, doorOpen } = this.state;
        const accent = this.getAccentColor();
        return (React.createElement(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
            React.createElement(Button, { variant: "outlined", size: "small", onClick: e => {
                    e.stopPropagation();
                    this.requestAction('toggle');
                }, sx: theme => ({
                    borderColor: isLocked ? theme.palette.success.main : accent || theme.palette.error.main,
                    color: isLocked ? theme.palette.success.main : accent || theme.palette.error.main,
                    textTransform: 'none',
                    minWidth: 0,
                }) }, isLocked ? I18n.t('wm_Unlock') : I18n.t('wm_Lock')),
            this.openId ? (React.createElement(IconButton, { size: "small", onClick: e => {
                    e.stopPropagation();
                    this.requestAction('open');
                }, sx: { color: 'text.secondary' } },
                React.createElement(MeetingRoom, { fontSize: "small" }))) : null,
            doorOpen != null ? (React.createElement(Tooltip, { title: doorOpen ? I18n.t('wm_Open') : I18n.t('wm_Closed') },
                React.createElement(SensorDoor, { sx: theme => ({
                        fontSize: 20,
                        color: doorOpen ? theme.palette.warning.main : theme.palette.text.disabled,
                        ml: 'auto',
                    }) }))) : null));
    }
    renderCompact() {
        const base = super.renderCompact();
        if (!this.openId) {
            return base;
        }
        return (React.createElement(Box, { sx: { position: 'relative' } },
            base,
            React.createElement(Tooltip, { title: I18n.t('wm_Open door') },
                React.createElement(IconButton, { onClick: e => {
                        e.stopPropagation();
                        this.requestAction('open');
                    }, sx: theme => ({
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
                    }) },
                    React.createElement(MeetingRoom, null)))));
    }
}
export default WidgetLock;
//# sourceMappingURL=Lock.js.map