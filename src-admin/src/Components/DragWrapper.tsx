import React, { useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';

import { TableRow } from '@mui/material';

import { Utils, I18n } from '@iobroker/adapter-react-v5';
import type { PatternControlEx } from '../types';

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
    const ref = useRef(null);
    const language = I18n.getLanguage();
    const [{ isDragging }, dragRef] = useDrag({
        type: 'box',
        item: { id: props.id, deviceIdx: props.deviceIdx },
        canDrag: () => {
            return !props.id?.includes('linked_devices') && !props.id?.includes('linkeddevices.0');
        },
        end: async (item, monitor) => {
            let parts;
            if (props.objects[item.id]?.common?.name) {
                parts = Utils.getObjectName(props.objects, item.id, language)
                    .replace(Utils.FORBIDDEN_CHARS, '_')
                    .replace(/\s/g, '_')
                    .replace(/\./g, '_');
            } else {
                parts = item.id.split('.');
                parts = parts.pop();
            }
            const result = monitor.getDropResult();
            const targetId = monitor.getTargetIds();
            const didDrop = monitor.didDrop();
            if (props.id !== `alias.0.${parts}` && !result && !targetId.length && !didDrop) {
                await props.onCopyDevice(props.id, `alias.0.${parts}`);
                props.openFolder();
                if (props.id.includes('alias.0')) {
                    await props.deleteDevice(item.deviceIdx);
                }
            }
        },
        collect: monitor => ({ isDragging: monitor.isDragging() }),
    });
    const [error, setError] = useState(false);
    const [{ isOver, canDrop }, dropRef] = useDrop({
        accept: 'box',
        canDrop: (item: { id: string }): boolean => {
            let parts;
            if (props.objects[item.id]?.common?.name) {
                parts = Utils.getObjectName(props.objects, item.id, language)
                    .replace(Utils.FORBIDDEN_CHARS, '_')
                    .replace(/\s/g, '_')
                    .replace(/\./g, '_');
            } else {
                parts = item.id.split('.');
                parts = parts.pop();
            }
            const partsId = props.id.split('.');
            partsId.pop();
            const parentId = partsId.join('.');
            if (
                !props.id?.includes('alias.0') ||
                props.id?.includes('automatically_detected') ||
                props.id?.includes('linked_devices') ||
                props.objects[`${parentId}.${parts}`]
            ) {
                return false;
            }
            return true;
        },
        collect: monitor => ({
            handlerId: monitor.getHandlerId(),
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
        drop: async (item: { id: string; deviceIdx: number }) => {
            let parts;
            if (props.objects[item.id]?.common?.name) {
                parts = Utils.getObjectName(props.objects, item.id, language)
                    .replace(Utils.FORBIDDEN_CHARS, '_')
                    .replace(/\s/g, '_')
                    .replace(/\./g, '_');
            } else {
                parts = item.id.split('.');
                parts = parts.pop();
            }
            const partsId = props.id.split('.');
            partsId.pop();
            const parentId = partsId.join('.');
            setError(false);
            await props.onCopyDevice(item.id, `${parentId}.${parts}`);
            props.openFolder();
            if (item.id.includes('alias.0')) {
                await props.deleteDevice(item.deviceIdx);
            }
        },
        hover(item) {
            let parts;
            if (props.objects[item.id]?.common?.name) {
                parts = Utils.getObjectName(props.objects, item.id, language)
                    .replace(Utils.FORBIDDEN_CHARS, '_')
                    .replace(/\s/g, '_')
                    .replace(/\./g, '_');
            } else {
                parts = item.id.split('.');
                parts = parts.pop();
            }
            const partsId = props.id.split('.');
            partsId.pop();
            const parentId = partsId.join('.');
            if (
                !props.id?.includes('alias.0') ||
                props.id?.includes('automatically_detected') ||
                props.id?.includes('linked_devices') ||
                props.objects[`${parentId}.${parts}`]
            ) {
                setError(true);
            } else {
                setError(false);
            }
        },
    });
    const isActive = isOver && canDrop;
    let background = props.backgroundRow || undefined;
    if (isOver && error) {
        background = '#e73c3c75';
    } else if (isActive) {
        background = '#00640057';
    }

    const opacity = isDragging ? 0.5 : 1;
    dragRef(dropRef(ref));

    return (
        <TableRow
            sx={props.sx}
            onClick={isDragging ? undefined : () => props.onClick()}
            ref={ref}
            style={{ opacity, background }}
        >
            {props.children}
        </TableRow>
    );
}
