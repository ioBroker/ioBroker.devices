import React, { useCallback, useMemo } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';

import { TableRow } from '@mui/material';

import { Utils, I18n } from '@iobroker/adapter-react-v5';
import type { PatternControlEx } from '../types';
import { getLastPart, getParentId } from './helpers/utils';

export interface DragWrapperProps {
    openFolder: () => void;
    objects: Record<string, ioBroker.Object>;
    deleteDevice: (index: number, devices?: PatternControlEx[]) => Promise<PatternControlEx[]>;
    onCopyDevice: (id: string, newChannelId: string) => Promise<void>;
    id: string;
    children: (React.JSX.Element | null)[];
    sx: Record<string, any>;
    backgroundRow: string | null;
    onClick: () => void;

    deviceIdx: number;
}

export default function DragWrapper(props: DragWrapperProps): React.JSX.Element {
    const language = I18n.getLanguage();

    const {
        attributes,
        listeners,
        setNodeRef: setDragRef,
        isDragging,
    } = useDraggable({
        id: `drag-${props.id}`,
        data: { id: props.id, deviceIdx: props.deviceIdx },
        disabled: !!(props.id?.includes('linked_devices') || props.id?.includes('linkeddevices.0')),
    });

    const {
        setNodeRef: setDropRef,
        isOver,
        active,
    } = useDroppable({
        id: `drop-${props.id}`,
        data: { id: props.id, type: 'device' },
    });

    const canDrop = useMemo(() => {
        if (!active?.data?.current) {
            return false;
        }
        const item = active.data.current as { id: string };
        let lastPart: string;
        if (props.objects[item.id]?.common?.name) {
            lastPart = Utils.getObjectName(props.objects, item.id, language)
                .replace(Utils.FORBIDDEN_CHARS, '_')
                .replace(/\s/g, '_')
                .replace(/\./g, '_');
        } else {
            lastPart = getLastPart(item.id);
        }
        const parentId = getParentId(props.id);
        return !(
            !props.id?.includes('alias.0') ||
            props.id?.includes('automatically_detected') ||
            props.id?.includes('linked_devices') ||
            props.objects[`${parentId}.${lastPart}`]
        );
    }, [active, props.id, props.objects, language]);

    const setNodeRef = useCallback(
        (node: HTMLElement | null) => {
            setDragRef(node);
            setDropRef(node);
        },
        [setDragRef, setDropRef],
    );

    const isActive = isOver && canDrop;
    let background = props.backgroundRow || undefined;
    if (isOver && !canDrop) {
        background = '#e73c3c75';
    } else if (isActive) {
        background = '#00640057';
    }

    const opacity = isDragging ? 0.5 : 1;

    return (
        <TableRow
            sx={props.sx}
            onClick={isDragging ? undefined : () => props.onClick()}
            ref={setNodeRef}
            style={{ opacity, background }}
            {...attributes}
            {...listeners}
        >
            {props.children}
        </TableRow>
    );
}
