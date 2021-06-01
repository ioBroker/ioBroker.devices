import { TableRow } from '@material-ui/core';
import React, { useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';

const DragWrapper = ({ openFolder, backgroundRow, objects, onCopyDevice, deleteDevice, updateObjects, deviceIdx, id, children, style, className, key }) => {
    const ref = useRef(null);

    const [{ isDragging }, dragRef] = useDrag({
        type: 'box',
        item: { id, deviceIdx },
        end: async (item, monitor) => {
            // console.log(11223344, id, item, monitor, monitor.didDrop(), monitor.getTargetIds(), monitor.getDropResult())
            let parts = id.split('.');
            parts = parts.pop();
            const result = monitor.getDropResult();
            const targetId = monitor.getTargetIds();
            const didDrop = monitor.didDrop();
            if (id !== `alias.0.${parts}` && !result && !targetId.length && !didDrop) {
                await onCopyDevice(id, `alias.0.${parts}`);
                openFolder()
                if (id.includes('alias.0')) {
                    await deleteDevice(item.deviceIdx);
                    updateObjects('delete', id);
                }

            }

        },
        collect: monitor => ({ isDragging: monitor.isDragging() }),
    });
    const [error, setError] = useState(false);
    const [{ isOver, canDrop }, dropRef] = useDrop({
        accept: 'box',
        canDrop: (item) => {
            let parts = item.id.split('.');
            parts = parts.pop();
            let partsId = id.split('.');
            partsId.pop();
            partsId = partsId.join('.');
            if (!id?.includes('alias.0') || id?.includes('automatically_detected') || id?.includes('linked_devices') || objects[`${partsId}.${parts}`]) {
                return false;
            }
            return true;
        },
        collect: (monitor) => ({
            handlerId: monitor.getHandlerId(),
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop()
        }),
        drop: async (item) => {
            let parts = item.id.split('.');
            parts = parts.pop();
            let partsId = id.split('.');
            partsId.pop();
            partsId = partsId.join('.');
            setError(false);
            await onCopyDevice(item.id, `${partsId}.${parts}`);
            openFolder()
            if (item.id.includes('alias.0')) {
                await deleteDevice(item.deviceIdx);
                updateObjects('delete', item.id);
            }
        },
        hover(item, monitor) {
            let parts = item.id.split('.');
            parts = parts.pop();
            let partsId = id.split('.');
            partsId.pop();
            partsId = partsId.join('.');
            if (!id?.includes('alias.0') || id?.includes('automatically_detected') || id?.includes('linked_devices') || objects[`${partsId}.${parts}`]) {
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

    const opacity = isDragging ? 0.5 : 1;
    dragRef(dropRef(ref));

    return <TableRow
        className={className}
        key={key}
        padding="default"
        ref={ref}
        style={{ ...style, opacity, background }}>
        {children}
    </TableRow>;
}

export default DragWrapper;