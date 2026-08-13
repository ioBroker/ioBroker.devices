import React from 'react';
import { Compress } from '@mui/icons-material';

import type { ConfigItemPanel } from '@iobroker/json-config';

import { WidgetSingleValueSensorBase, type WidgetSingleValueSensorState } from './SingleValueSensorBase';
import type { WidgetGenericProps } from './Generic';
import { hideBaseFields } from '../configUtils';

const ACCENT_COLOR = '#7c4dff';

export class WidgetPressure extends WidgetSingleValueSensorBase<WidgetSingleValueSensorState> {
    static override getConfigSchema(): { name: string; schema: ConfigItemPanel } {
        return {
            name: 'Pressure',
            schema: { type: 'panel', items: { ...hideBaseFields('colorActive', 'color') } },
        };
    }

    constructor(props: WidgetGenericProps) {
        super(props, 'PRESSURE', ACCENT_COLOR);
    }

    // eslint-disable-next-line class-methods-use-this
    protected getDecimals(): number {
        return 1;
    }

    // eslint-disable-next-line class-methods-use-this
    protected renderValueIcon(value: number | null): React.JSX.Element {
        return (
            <Compress
                sx={{
                    color: value == null ? 'text.disabled' : ACCENT_COLOR,
                    transition: 'color 0.25s ease',
                }}
            />
        );
    }
}

export default WidgetPressure;
