import React from 'react';
import { IconButton, Tooltip, Typography } from '@mui/material';

interface TooltipButtonProps {
    tooltip?: string;
    label?: string;
    disabled?: boolean;
    Icon: React.JSX.Element | null;
    onClick?: () => void;
    url?: string;
}

export default function TooltipButton(props: TooltipButtonProps): React.JSX.Element {
    const { tooltip, label, disabled, Icon, onClick, url } = props;

    const text = !!label && (
        <Typography
            variant="button"
            style={{ marginLeft: 4 }}
        >
            {label}
        </Typography>
    );

    const btnProps = url ? { href: url, disabled, target: '_blank' } : { onClick, disabled };

    if (tooltip) {
        return (
            <Tooltip
                title={tooltip}
                slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
            >
                <span>
                    <IconButton
                        {...btnProps}
                        size="small"
                    >
                        {Icon}
                        {text}
                    </IconButton>
                </span>
            </Tooltip>
        );
    }

    return (
        <IconButton
            {...btnProps}
            size="small"
        >
            {Icon}
            {text}
        </IconButton>
    );
}
