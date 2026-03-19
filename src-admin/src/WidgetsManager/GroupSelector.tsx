import React from 'react';
import { Box, ListItemIcon, ListItemText, MenuItem, Select, Typography } from '@mui/material';
import { I18n } from '@iobroker/adapter-react-v5';

import type { WidgetGroup } from './groupUtils';
import { getGroupIcon } from './groupIcons';

interface GroupSelectorProps {
    availableGroups: WidgetGroup[];
    currentGroupId?: string;
    onGroupChange: (groupId: string) => void;
}

export default function GroupSelector(props: GroupSelectorProps): React.JSX.Element {
    const { availableGroups, currentGroupId, onGroupChange } = props;

    return (
        <Box sx={{ mb: 2 }}>
            <Typography
                variant="body2"
                sx={{ mb: 1, fontWeight: 500 }}
            >
                {I18n.t('wm_Group')}
            </Typography>
            <Select
                value={currentGroupId || ''}
                onChange={e => onGroupChange(e.target.value)}
                size="small"
                fullWidth
                renderValue={value => {
                    const group = availableGroups.find(g => g.id === value);
                    if (!group) {
                        return '';
                    }
                    const icon = getGroupIcon(group.id);
                    return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {icon ? React.cloneElement(icon, { sx: { fontSize: 18, color: 'text.secondary' } }) : null}
                            {I18n.t(group.name)}
                        </Box>
                    );
                }}
            >
                {availableGroups.map(g => {
                    const icon = getGroupIcon(g.id);
                    return (
                        <MenuItem
                            key={g.id}
                            value={g.id}
                        >
                            {icon ? (
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                    {React.cloneElement(icon, { sx: { fontSize: 20, color: 'text.secondary' } })}
                                </ListItemIcon>
                            ) : null}
                            <ListItemText>{I18n.t(g.name)}</ListItemText>
                        </MenuItem>
                    );
                })}
            </Select>
        </Box>
    );
}
