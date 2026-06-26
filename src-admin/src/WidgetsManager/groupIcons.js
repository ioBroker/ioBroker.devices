import React from 'react';
import { Blinds, Info, Lightbulb, MusicNote, MoreHoriz, Security, SensorWindow, Thermostat, Widgets, } from '@mui/icons-material';
const GROUP_ICONS = {
    lights: React.createElement(Lightbulb, { sx: { fontSize: 18 } }),
    climate: React.createElement(Thermostat, { sx: { fontSize: 18 } }),
    blinds: React.createElement(Blinds, { sx: { fontSize: 18 } }),
    openings: React.createElement(SensorWindow, { sx: { fontSize: 18 } }),
    security: React.createElement(Security, { sx: { fontSize: 18 } }),
    media: React.createElement(MusicNote, { sx: { fontSize: 18 } }),
    info: React.createElement(Info, { sx: { fontSize: 18 } }),
    widgets: React.createElement(Widgets, { sx: { fontSize: 18 } }),
    other: React.createElement(MoreHoriz, { sx: { fontSize: 18 } }),
};
export function getGroupIcon(groupId) {
    return GROUP_ICONS[groupId] || null;
}
//# sourceMappingURL=groupIcons.js.map