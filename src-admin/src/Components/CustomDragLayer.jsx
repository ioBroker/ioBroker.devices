import React from 'react';
import { useDragLayer } from 'react-dnd';
import { Box } from '@mui/material';

const layerStyles = {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: 100,
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
};

const snapToGrid = (x, y) => {
    const snappedX = Math.round(x / 32) * 32;
    const snappedY = Math.round(y / 32) * 32;
    return [snappedX, snappedY];
};

const getItemStyles = (initialOffset, currentOffset, isSnapToGrid) => {
    if (!initialOffset || !currentOffset) {
        return {
            display: 'none',
        };
    }
    let { x, y } = currentOffset;
    if (isSnapToGrid) {
        x -= initialOffset.x;
        y -= initialOffset.y;
        [x, y] = snapToGrid(x, y);
        x += initialOffset.x;
        y += initialOffset.y;
    }
    const transform = `translate(${x}px, ${y}px)`;
    return {
        transform,
        WebkitTransform: transform,
    };
};

const styles = {
    root: theme => ({
        background: theme.palette.background.default,
    }),
};

const CustomDragLayer = ({ classes }) => {
    const {
        itemType,
        isDragging,
        // item,
        initialOffset,
        currentOffset,
        // targetIds
    } = useDragLayer(monitor => ({
        item: monitor.getItem(),
        itemType: monitor.getItemType(),
        initialOffset: monitor.getInitialSourceClientOffset(),
        currentOffset: monitor.getSourceClientOffset(),
        isDragging: monitor.isDragging(),
        targetIds: monitor.getTargetIds(),
    }));

    const renderItem = () => {
        // console.log(11223344,itemType,
        //     isDragging,
        //     item)
        switch (itemType) {
            case 'box':
                return (
                    <Box
                        sx={styles.root}
                        style={{ width: 200, height: 200, background: 'green' }}
                    ></Box>
                );

            default:
                return null;
        }
    };

    if (!isDragging) {
        return null;
    }

    return (
        <div style={layerStyles}>
            <div style={getItemStyles(initialOffset, currentOffset)}>{renderItem()}</div>
        </div>
    );
};

export default CustomDragLayer;
