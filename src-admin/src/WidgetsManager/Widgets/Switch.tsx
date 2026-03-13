import React from 'react';
import WidgetGeneric, { type WidgetGenericState } from './Generic';

interface WidgetSwitchState extends WidgetGenericState {
    id?: string;
}

export class WidgetSwitch extends WidgetGeneric<WidgetSwitchState> {
    render(): React.JSX.Element {
        return <div></div>;
    }
}

export default WidgetSwitch;
