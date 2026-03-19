import React from 'react';
import { Blinds, Info, Lightbulb, MoreHoriz, Security, SensorWindow, Thermostat, Widgets } from '@mui/icons-material';

const GROUP_ICONS: Record<string, React.ReactElement> = {
    lights: <Lightbulb sx={{ fontSize: 18 }} />,
    climate: <Thermostat sx={{ fontSize: 18 }} />,
    blinds: <Blinds sx={{ fontSize: 18 }} />,
    openings: <SensorWindow sx={{ fontSize: 18 }} />,
    security: <Security sx={{ fontSize: 18 }} />,
    info: <Info sx={{ fontSize: 18 }} />,
    widgets: <Widgets sx={{ fontSize: 18 }} />,
    other: <MoreHoriz sx={{ fontSize: 18 }} />,
};

export function getGroupIcon(groupId: string): React.ReactElement | null {
    return GROUP_ICONS[groupId] || null;
}
