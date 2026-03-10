import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';

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
    const language = I18n.getLanguage();

    const { setNodeRef, isOver, active } = useDroppable({
        id: `drop-folder-${props.id}`,
        data: { id: props.id, type: 'folder' },
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
        return !(
            !props.id?.includes('alias.0') ||
            props.id?.includes('automatically_detected') ||
            props.id?.includes('linked_devices') ||
            props.objects[`${props.id}.${lastPart}`]
        );
    }, [active, props.id, props.objects, language]);

    const isActive = isOver && canDrop;
    let background = props.backgroundRow;
    if (isOver && !canDrop) {
        background = '#e73c3c75';
    } else if (isActive) {
        background = '#00640057';
    }

    return (
        <TableRow
            sx={props.sx}
            ref={setNodeRef}
            onClick={() => props.onClick()}
            style={{ background: background || undefined, transition: 'background .3s' }}
        >
            {props.children}
        </TableRow>
    );
}
