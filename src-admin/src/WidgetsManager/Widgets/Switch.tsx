import React from 'react';
import { Switch as MuiSwitch, Typography } from '@mui/material';
import { PowerSettingsNew } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';

import WidgetGeneric, { type WidgetGenericProps, type WidgetGenericState } from './Generic';

interface WidgetSwitchState extends WidgetGenericState {
    isOn: boolean;
}

export class WidgetSwitch extends WidgetGeneric<WidgetSwitchState> {
    private readonly setId: string | null;
    private readonly listenId: string | null;

    constructor(props: WidgetGenericProps) {
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

    componentDidMount(): void {
        super.componentDidMount();
        if (this.listenId) {
            this.props.stateContext.getState(this.listenId, this.onSwitchStateChange);
        }
    }

    componentWillUnmount(): void {
        if (this.listenId) {
            this.props.stateContext.removeState(this.listenId, this.onSwitchStateChange);
        }
    }

    onSwitchStateChange = (_id: string, state: ioBroker.State): void => {
        const isOn = !!state.val;
        if (isOn !== this.state.isOn) {
            this.setState({ isOn });
        }
    };

    toggle = (): void => {
        if (this.setId) {
            void this.props.stateContext.getSocket().setState(this.setId, !this.state.isOn);
        }
    };

    protected isTileActive(): boolean {
        return this.state.isOn;
    }

    protected onTileClick(): void {
        this.toggle();
    }

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = super.renderTileIcon();
        if (baseIcon) {
            return baseIcon;
        }

        const { isOn } = this.state;
        const accent = this.getAccentColor();

        return (
            <PowerSettingsNew
                sx={theme => ({
                    fontSize: 32,
                    color: isOn ? accent || theme.palette.primary.main : theme.palette.text.disabled,
                    transition: 'color 0.25s ease',
                })}
            />
        );
    }

    protected renderTileStatus(): React.JSX.Element {
        const { isOn } = this.state;
        const accent = this.getAccentColor();

        return (
            <Typography
                variant="caption"
                sx={theme => ({
                    fontWeight: 500,
                    color: isOn ? accent || theme.palette.primary.main : theme.palette.text.secondary,
                    transition: 'color 0.25s ease',
                })}
            >
                {isOn ? I18n.t('wm_On') : I18n.t('wm_Off')}
            </Typography>
        );
    }

    protected renderTileAction(): React.JSX.Element {
        const { isOn } = this.state;
        const accent = this.getAccentColor();

        return (
            <MuiSwitch
                checked={isOn}
                onClick={e => e.stopPropagation()}
                onChange={this.toggle}
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
        );
    }
}

export default WidgetSwitch;
