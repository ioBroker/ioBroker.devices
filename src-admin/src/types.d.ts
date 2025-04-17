import type React from 'react';
import type { PatternControl } from '@iobroker/type-detector';

export interface PatternControlEx extends PatternControl {
    channelId: string;
    mainStateId: string;
    usedStates: number;
    functions: string[];
    functionsNames: string; // functions joined by comma
    rooms: string[];
    roomsNames: string; // rooms joined by comma
    name: string;
    icon: string | null;
    color: string | null;
}

export interface ListItem {
    id: string;
    title: string;
    icon?: string | React.JSX.Element | null;
    color?: string | null;
    depth: number;
    type?: ioBroker.ObjectType;
    role?: string | null;
    obj?: ioBroker.Object;
    noEdit: boolean;
    showId: boolean;
    importer: boolean;
    originalId: string | null;
    parent: string | null;
    // instance?: number | null;
    index?: number;

    parentIndex?: number;
    visible?: boolean;
    hasVisibleChildren?: number;
}
