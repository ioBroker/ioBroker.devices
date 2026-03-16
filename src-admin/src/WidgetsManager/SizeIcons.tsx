import React from 'react';
import { Box } from '@mui/material';

const COMMON: React.CSSProperties = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
};

export function SizeIcon1x1(): React.JSX.Element {
    return (
        <Box
            component="svg"
            width={18}
            height={18}
            viewBox="0 0 18 18"
            sx={{ display: 'block' }}
        >
            <rect
                x={1}
                y={1}
                width={16}
                height={16}
                rx={3}
                style={COMMON}
            />
        </Box>
    );
}

export function SizeIcon2x1(): React.JSX.Element {
    return (
        <Box
            component="svg"
            width={32}
            height={18}
            viewBox="0 0 32 18"
            sx={{ display: 'block' }}
        >
            <rect
                x={1}
                y={1}
                width={30}
                height={16}
                rx={3}
                style={COMMON}
            />
        </Box>
    );
}

export function SizeIcon2xHalf(): React.JSX.Element {
    return (
        <Box
            component="svg"
            width={32}
            height={12}
            viewBox="0 0 32 12"
            sx={{ display: 'block' }}
        >
            <rect
                x={1}
                y={1}
                width={30}
                height={10}
                rx={3}
                style={COMMON}
            />
        </Box>
    );
}
