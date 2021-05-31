import { TableRow } from '@material-ui/core';
import React, { useState } from 'react';
import { useDrop } from 'react-dnd';

const DropWrapper = ({ updateObjects, objects, deleteDevice, onCopyDevice, id, children, className, key, backgroundRow }) => {
    const [error, setError] = useState(false);
    const [{ isOver, canDrop }, drop] = useDrop({
        accept: 'box',
        canDrop: (item) => {
            let parts = item.id.split('.');
            parts = parts.pop();
            if (id?.includes('automatically_detected') || id?.includes('linked_devices') || objects[`${id}.${parts}`]) {
                return false;
            }
            return true;
        },
        collect: (monitor) => ({
            handlerId: monitor.getHandlerId(),
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop()
        }),
        drop: (item) => {
            let parts = item.id.split('.');
            parts = parts.pop();
            setError(false);
            onCopyDevice(item.id, `${id}.${parts}`, () => {
                deleteDevice(item.deviceIdx, () => {
                    updateObjects('delete', item.id);
                });
            })
        },
        hover(item, monitor) {
            let parts = item.id.split('.');
            parts = parts.pop();
            console.log(11223344,objects[`${id}.${parts}`])
            if (id?.includes('automatically_detected') || id?.includes('linked_devices') || objects[`${id}.${parts}`]) {
                setError(true);
            }else{
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
        key={key}
        padding="default" ref={drop} style={{ background, transition: 'background .3s' }}>
        {children}
    </TableRow>;
}

export default DropWrapper;