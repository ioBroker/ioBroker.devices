import React from 'react';
import type { ConfigItemPanel } from '@iobroker/json-config';
import { FilterAlt } from '@mui/icons-material';

import { WidgetFanBase } from './FanBase';

export class WidgetAirPurifier extends WidgetFanBase {
    static override getConfigSchema(): { name: string; schema: ConfigItemPanel } {
        return {
            name: 'wm_Air purifier',
            schema: {
                type: 'panel',
                items: {},
            },
        };
    }

    protected renderTypeIcon(): React.JSX.Element {
        return <FilterAlt sx={{ color: this.isPoweredOff() ? 'text.disabled' : '#66bb6a' }} />;
    }
}

export default WidgetAirPurifier;
