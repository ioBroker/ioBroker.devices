import React from 'react';
import { IconButton, Tooltip } from '@mui/material';

import { I18n, IconTrash } from '@iobroker/gui-components';

/**
 * Delete button on a tile that cannot show its widget, e.g. because the plugin or the web component of an adapter
 * cannot be loaded. Only in the edit mode, like the settings button.
 */
export default function RemoveWidgetButton(props: { onRemove: () => void }): React.JSX.Element {
    return (
        <Tooltip
            title={I18n.t('wm_Delete')}
            slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
        >
            <IconButton
                size="small"
                color="error"
                aria-label={I18n.t('wm_Delete')}
                onClick={e => {
                    e.stopPropagation();
                    props.onRemove();
                }}
            >
                <IconTrash fontSize="small" />
            </IconButton>
        </Tooltip>
    );
}
