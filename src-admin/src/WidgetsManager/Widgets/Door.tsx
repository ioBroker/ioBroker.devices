import React from 'react';
import { SensorDoor, MeetingRoom } from '@mui/icons-material';

import { WidgetWindow } from './Window';

export class WidgetDoor extends WidgetWindow {
    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = this.renderBaseIcon();
        if (baseIcon) {
            return baseIcon;
        }

        const { isOpen } = this.state;
        const accent = this.getAccentColor();

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
