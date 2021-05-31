import { TableRow } from '@material-ui/core';
import React from 'react';
import { useDrag } from 'react-dnd';
// import { getEmptyImage } from 'react-dnd-html5-backend';
// const style = {
//     cursor: 'move',
// };
const DragWrapper = ({ deviceIdx, id, children, style, className, key }) => {

    const [{ isDragging }, dragRef] = useDrag({
        type: 'box',
        item: { id, deviceIdx },
        // canDrag: () => {
        //     if (!id?.includes('alias.0')) {
        //         return false;
        //     }
        //     return true
        // },
        collect: monitor => ({ isDragging: monitor.isDragging() }),
    });

    // useEffect(() => {
    //     // preview(getEmptyImage(), { captureDraggingState: true });
    //     // eslint-disable-next-line react-hooks/exhaustive-deps
    // }, []);
    const opacity = isDragging ? 0.5 : 1;

    return <TableRow
        className={className}
        key={key}
        padding="default"
        ref={dragRef}
        style={{ ...style, opacity }}>
        {children}
    </TableRow>;
}

export default DragWrapper;