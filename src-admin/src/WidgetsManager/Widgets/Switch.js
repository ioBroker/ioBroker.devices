import React from 'react';
import { Switch as MuiSwitch, Typography } from '@mui/material';
import { PowerSettingsNew } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';
import WidgetGeneric, {} from './Generic';
export class WidgetSwitch extends WidgetGeneric {
    setId;
    listenId;
    constructor(props) {
        super(props);
        const states = props.widget.control.states;
        const set = states.find(s => s.name === 'SET');
        const actual = states.find(s => s.name === 'ACTUAL');
        this.setId = set?.id ?? null;
        this.listenId = actual?.id ?? set?.id ?? null;
        this.state = {
            ...this.state,
            isOn: false,
        };
    }
    componentDidMount() {
        super.componentDidMount();
        if (this.listenId) {
            this.props.stateContext.getState(this.listenId, this.onSwitchStateChange);
        }
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.listenId) {
            this.props.stateContext.removeState(this.listenId, this.onSwitchStateChange);
        }
    }
    onSwitchStateChange = (_id, state) => {
        const isOn = !!state.val;
        if (isOn !== this.state.isOn) {
            this.setState({ isOn });
        }
    };
    toggle = () => {
        if (this.setId) {
            void this.props.stateContext.getSocket().setState(this.setId, !this.state.isOn);
        }
    };
    isTileActive() {
        return this.state.isOn;
    }
    // eslint-disable-next-line class-methods-use-this
    hasTileAction() {
        return true;
    }
    onTileClick() {
        this.toggle();
    }
    renderTileIcon() {
        const baseIcon = super.renderTileIcon();
        if (baseIcon) {
            return baseIcon;
        }
        const { isOn } = this.state;
        const accent = this.getAccentColor();
        return (React.createElement(PowerSettingsNew, { sx: theme => ({
                color: isOn ? accent || theme.palette.primary.main : theme.palette.text.disabled,
                transition: 'color 0.25s ease',
            }) }));
    }
    renderTileStatus() {
        const { isOn } = this.state;
        const accent = this.getAccentColor();
        return (React.createElement(Typography, { variant: "caption", sx: theme => ({
                fontWeight: 500,
                color: isOn ? accent || theme.palette.primary.main : theme.palette.text.secondary,
                transition: 'color 0.25s ease',
            }) }, isOn ? I18n.t('wm_On') : I18n.t('wm_Off')));
    }
    renderTileAction() {
        const { isOn } = this.state;
        const accent = this.getAccentColor();
        return (React.createElement(MuiSwitch, { checked: isOn, onClick: e => e.stopPropagation(), onChange: this.toggle, color: "primary", sx: accent
                ? {
                    '& .MuiSwitch-switchBase.Mui-checked': { color: accent },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: accent,
                    },
                }
                : undefined }));
    }
}
export default WidgetSwitch;
//# sourceMappingURL=Switch.js.map