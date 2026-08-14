import React from 'react';
import type { ConfigItemPanel } from '@iobroker/json-config';
import { Air } from '@mui/icons-material';

import { WidgetFanBase } from './FanBase';

export class WidgetFan extends WidgetFanBase {
    static override getConfigSchema(): { name: string; schema: ConfigItemPanel } {
        return {
            name: 'wm_Fan',
            schema: {
                type: 'panel',
                items: {},
            },
        };
    }

    protected renderTypeIcon(): React.JSX.Element {
        return <Air sx={{ color: this.isPoweredOff() ? 'text.disabled' : '#4fc3f7' }} />;
    }
}

export default WidgetFan;
