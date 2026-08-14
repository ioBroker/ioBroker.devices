import React from 'react';
import { Sensors, SensorsOff } from '@mui/icons-material';

import { WidgetWindow } from './Window';

export class WidgetContact extends WidgetWindow {
    protected renderStateIcon(accent: string | undefined): React.JSX.Element {
        const { isOpen } = this.state;

        if (isOpen) {
            return (
                <Sensors
                    sx={theme => ({
                        color: accent || theme.palette.warning.main,
                        transition: 'color 0.25s ease',
                    })}
                />
            );
        }

        return (
            <SensorsOff
                sx={theme => ({
                    color: theme.palette.text.disabled,
                    transition: 'color 0.25s ease',
                })}
            />
        );
    }
}

export default WidgetContact;
