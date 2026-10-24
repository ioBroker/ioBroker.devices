import React from 'react';
import { Tv } from '@mui/icons-material';
import { Types } from '@iobroker/type-detector';
import { DeviceTypeIcon } from '@iobroker/gui-components';

/** `DeviceTypeIcon` plus the types gui-components has no icon for yet */
export default function TypeIcon(props: React.ComponentProps<typeof DeviceTypeIcon>): React.JSX.Element | null {
    if (props.type === Types.tv || (!props.type && props.src === Types.tv)) {
        return (
            <Tv
                style={{ width: 32, height: 32, ...props.style }}
                className={props.className}
                sx={props.sx}
                onClick={props.onClick}
            />
        );
    }
    return <DeviceTypeIcon {...props} />;
}
