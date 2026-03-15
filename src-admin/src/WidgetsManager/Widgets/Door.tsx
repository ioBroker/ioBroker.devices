import React from 'react';
import { SensorDoor } from '@mui/icons-material';

import WidgetGeneric from './Generic';
import { WidgetWindow } from './Window';

export class WidgetDoor extends WidgetWindow {
    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = WidgetGeneric.prototype.renderTileIcon.call(this);
        if (baseIcon) {
            return baseIcon;
        }

        const { isOpen } = this.state;
        const accent = this.getAccentColor();

        return (
            <SensorDoor
                sx={theme => ({
                    fontSize: 48,
                    color: isOpen ? accent || theme.palette.warning.main : theme.palette.text.disabled,
                    transition: 'color 0.25s ease',
                })}
            />
        );
    }
}

export default WidgetDoor;
