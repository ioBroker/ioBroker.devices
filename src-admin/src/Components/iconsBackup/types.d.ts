import type { CSSProperties, MouseEvent } from 'react';
import type { SxProps } from '@mui/material';

export interface IconProps {
    sx?: SxProps;
    className?: string;
    style?: CSSProperties;
    onClick?: (e: MouseEvent) => void;
}
