import React, { useState } from 'react';
import { useDrop } from 'react-dnd';

import { TableRow } from '@mui/material';

import { Utils, I18n } from '@iobroker/adapter-react-v5';

const DropWrapper = ({ openFolder, objects, deleteDevice, onCopyDevice, id, children, className, backgroundRow, onClick }) => {
    const [error, setError] = useState(false);
    const language = I18n.getLanguage();
    const [{ isOver, canDrop }, drop] = useDrop({
        accept: 'box',
        canDrop: (item) => {
            let parts;
            if (objects[item.id]?.common?.name) {
                parts = Utils.getObjectName(objects, item.id, { language }).replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_');
                parts = item.id.split('.');
                parts = parts.pop();
            }
            return !(!id?.includes('alias.0') ||
                id?.includes('automatically_detected') ||
                id?.includes('linked_devices') ||
                objects[`${id}.${parts}`]);
        },
        collect: (monitor) => ({
            handlerId: monitor.getHandlerId(),
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
        drop: async (item) => {
            let parts;
            if (objects[item.id]?.common?.name) {
                parts = Utils.getObjectName(objects, item.id, { language }).replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_');
            } else {
                parts = item.id.split('.');
                parts = parts.pop();
            }
            setError(false);
            await onCopyDevice(item.id, `${id}.${parts}`);
            openFolder();
            if (item.id.includes('alias.0')) {
                await deleteDevice(item.deviceIdx);
            }
        },
        hover(item, monitor) {
            let parts;
            if (objects[item.id]?.common?.name) {
                parts = Utils.getObjectName(objects, item.id, { language }).replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_');
            } else {
                parts = item.id.split('.');
                parts = parts.pop();
            }
            if (!id?.includes('alias.0') || id?.includes('automatically_detected') || id?.includes('linked_devices') || objects[`${id}.${parts}`]) {
                setError(true);
            } else {
                setError(false);
            }
        }
    });

    const isActive = isOver && canDrop;
    let background = backgroundRow;
    if (isOver && error) {
        background = '#e73c3c75';
    } else if (isActive) {
        background = '#00640057';
    }

    return <TableRow
        className={className}
        padding="default"
        ref={drop}
        onClick={e => onClick(e)}
        style={{ background, transition: 'background .3s' }}
    >
        {children}
    </TableRow>;
}

export default DropWrapper;