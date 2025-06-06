import React, { useState } from 'react';
import { useDrop } from 'react-dnd';

import { TableRow } from '@mui/material';

import { Utils, I18n } from '@iobroker/adapter-react-v5';

import type { PatternControlEx } from '../types';
import { getLastPart } from './helpers/utils';

export interface DropWrapperProps {
    openFolder: () => void;
    objects: Record<string, ioBroker.Object>;
    deleteDevice: (index: number, devices?: PatternControlEx[]) => Promise<PatternControlEx[]>;
    onCopyDevice: (id: string, newChannelId: string) => Promise<void>;
    id: string;
    children: (React.JSX.Element | null)[];
    sx: Record<string, any>;
    backgroundRow: string | null;
    onClick: () => void;

    deviceIdx?: number;
}

export default function DropWrapper(props: DropWrapperProps): React.JSX.Element {
    const [error, setError] = useState(false);
    const language = I18n.getLanguage();
    const [{ isOver, canDrop }, drop] = useDrop({
        accept: 'box',
        canDrop: item => {
            let lastPart: string;
            if (props.objects[item.id]?.common?.name) {
                lastPart = Utils.getObjectName(props.objects, item.id, language)
                    .replace(Utils.FORBIDDEN_CHARS, '_')
                    .replace(/\s/g, '_')
                    .replace(/\./g, '_');
            } else {
                lastPart = getLastPart(item.id);
            }
            return !(
                !props.id?.includes('alias.0') ||
                props.id?.includes('automatically_detected') ||
                props.id?.includes('linked_devices') ||
                props.objects[`${props.id}.${lastPart}`]
            );
        },
        collect: monitor => ({
            handlerId: monitor.getHandlerId(),
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
        drop: async (item: { id: string; deviceIdx: number }) => {
            let lastPart: string;
            if (props.objects[item.id]?.common?.name) {
                lastPart = Utils.getObjectName(props.objects, item.id, language)
                    .replace(Utils.FORBIDDEN_CHARS, '_')
                    .replace(/\s/g, '_')
                    .replace(/\./g, '_');
            } else {
                lastPart = getLastPart(item.id);
            }
            setError(false);
            await props.onCopyDevice(item.id, `${props.id}.${lastPart}`);
            props.openFolder();
            if (item.id.includes('alias.0')) {
                await props.deleteDevice(item.deviceIdx);
            }
        },
        hover(item: { id: string }) {
            let lastPart: string;
            if (props.objects[item.id]?.common?.name) {
                lastPart = Utils.getObjectName(props.objects, item.id, language)
                    .replace(Utils.FORBIDDEN_CHARS, '_')
                    .replace(/\s/g, '_')
                    .replace(/\./g, '_');
            } else {
                lastPart = getLastPart(item.id);
            }
            if (
                !props.id?.includes('alias.0') ||
                props.id?.includes('automatically_detected') ||
                props.id?.includes('linked_devices') ||
                props.objects[`${props.id}.${lastPart}`]
            ) {
                setError(true);
            } else {
                setError(false);
            }
        },
    });

    const isActive = isOver && canDrop;
    let background = props.backgroundRow;
    if (isOver && error) {
        background = '#e73c3c75';
    } else if (isActive) {
        background = '#00640057';
    }

    return (
        <TableRow
            sx={props.sx}
            ref={drop}
            onClick={() => props.onClick()}
            style={{ background: background || undefined, transition: 'background .3s' }}
        >
            {props.children}
        </TableRow>
    );
}
