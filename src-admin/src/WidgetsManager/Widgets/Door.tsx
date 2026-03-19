import React from 'react';
import { SensorDoor, MeetingRoom } from '@mui/icons-material';
import { Icon } from '@iobroker/adapter-react-v5';

import { WidgetWindow } from './Window';

export class WidgetDoor extends WidgetWindow {
    protected renderTileIcon(): React.JSX.Element {
        const { isOpen } = this.state;
        const accent = this.getAccentColor();

        // Active: iconActive, fallback to iconInactive (with active color); Inactive: iconInactive only
        const customIcon = isOpen
            ? (this.props.settings?.iconActive || this.props.settings?.iconInactive)
            : this.props.settings?.iconInactive;
        if (customIcon) {
            return (
                <Icon
                    src={customIcon}
                    style={{
                        width: '1em',
                        height: '1em',
                        color: isOpen ? accent || '#ed6c02' : 'grey',
                        transition: 'color 0.25s ease',
                    }}
                />
            );
        }

        if (isOpen) {
            return (
                <MeetingRoom
                    sx={theme => ({
                        color: accent || theme.palette.warning.main,
                        transition: 'color 0.25s ease',
                    })}
                />
            );
        }

        return (
            <SensorDoor
                sx={theme => ({
                    color: theme.palette.text.disabled,
                    transition: 'color 0.25s ease',
                })}
            />
        );
    }
}

export default WidgetDoor;
