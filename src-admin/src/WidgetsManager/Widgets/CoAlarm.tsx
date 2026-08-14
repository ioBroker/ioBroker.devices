import React from 'react';
import { Co2 } from '@mui/icons-material';
import { I18n } from '@iobroker/gui-components';

import { WidgetFireAlarm } from './FireAlarm';

const CO_COLOR = '#c62828';

/**
 * A coAlarm device has no separate CO state: ACTUAL itself is the carbon-monoxide alarm, unlike a
 * combined smoke+CO detector where WidgetFireAlarm reads CO from a second state. Everything else —
 * the unknown reading, the severity suffix, hideWhenOk — is the base class's.
 */
export class WidgetCoAlarm extends WidgetFireAlarm {
    // eslint-disable-next-line class-methods-use-this
    protected getAlarmAccentColor(): string {
        return CO_COLOR;
    }

    protected isTileActive(): boolean {
        return this.state.alarm;
    }

    protected getAlarmName(): string {
        return this.props.settings?.textActive || I18n.t('wm_Carbon monoxide');
    }

    // eslint-disable-next-line class-methods-use-this
    protected renderAlarmIcon(color: string): React.JSX.Element {
        return (
            <Co2
                sx={{
                    color,
                    transition: 'color 0.25s ease',
                }}
            />
        );
    }
}

export default WidgetCoAlarm;
