import type { CSSProperties, MouseEvent } from 'react';

export interface IconProps {
    sx?: Record<string, any>;
    className?: string;
    style?: CSSProperties;
    onClick?: (e: MouseEvent) => void;
}
