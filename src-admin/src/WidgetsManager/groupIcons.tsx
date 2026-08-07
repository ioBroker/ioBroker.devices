import React from 'react';
import type { SvgIconProps } from '@mui/material';
import {
    Blinds,
    Info,
    Lightbulb,
    MusicNote,
    MoreHoriz,
    Security,
    SensorWindow,
    Thermostat,
    Widgets,
} from '@mui/icons-material';

const GROUP_ICONS: Record<string, React.ReactElement<SvgIconProps>> = {
    lights: <Lightbulb sx={{ fontSize: 18 }} />,
    climate: <Thermostat sx={{ fontSize: 18 }} />,
    blinds: <Blinds sx={{ fontSize: 18 }} />,
    openings: <SensorWindow sx={{ fontSize: 18 }} />,
    security: <Security sx={{ fontSize: 18 }} />,
    media: <MusicNote sx={{ fontSize: 18 }} />,
    info: <Info sx={{ fontSize: 18 }} />,
    widgets: <Widgets sx={{ fontSize: 18 }} />,
    other: <MoreHoriz sx={{ fontSize: 18 }} />,
};

export function getGroupIcon(groupId: string): React.ReactElement<SvgIconProps> | null {
    return GROUP_ICONS[groupId] || null;
}
