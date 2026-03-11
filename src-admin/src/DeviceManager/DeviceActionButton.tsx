import React from 'react';
import type { ActionBase, DeviceAction, DeviceId } from './protocol/api';
import TooltipButton from './TooltipButton';
import { getTranslation, renderActionIcon } from './Utils';

interface DeviceActionButtonProps {
    deviceId: DeviceId;
    action: DeviceAction;
    deviceHandler: (deviceId: DeviceId, action: ActionBase) => () => void;
    disabled?: boolean;
}

export default function DeviceActionButton(props: DeviceActionButtonProps): React.JSX.Element {
    const { deviceId, action, deviceHandler, disabled } = props;

    const icon = renderActionIcon(action);

    const tooltip = getTranslation(action.description ?? '') || (icon ? null : action.id);

    return (
        <TooltipButton
            tooltip={tooltip || undefined}
            disabled={disabled || action.disabled}
            Icon={icon}
            onClick={deviceHandler(deviceId, action)}
            url={'url' in action ? getTranslation(action.url) : undefined}
        />
    );
}
