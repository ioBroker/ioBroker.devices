import type { CategoryInfo, WidgetInfo } from '@iobroker/dm-widgets';

export type RetVal<T> = T | Promise<T>;

export interface BackendToGuiCommandUpdate {
    /** Used for updating and for adding a new widget or category */
    command: 'update';
    /** Widget or Category ID */
    itemId: string;
    /** Backend can directly send new information about a device to avoid extra request from GUI */
    info?: WidgetInfo | CategoryInfo;
}

export interface BackendToGuiCommandDeviceDelete {
    /** Widget or Category was deleted */
    command: 'delete';
    /** Widget or Category ID */
    itemId: string;
}

export interface BackendToGuiCommandNavigate {
    /** Navigate to a specific category */
    command: 'navigate';
    /** Category ID */
    itemId: string;
    /** If no user interactions, change back to the category before change */
    timeout?: number;
}

export interface BackendToGuiCommandAllUpdate {
    /** Read ALL information about all widgets and categories anew */
    command: 'all';
}

export type BackendToGuiCommand =
    | BackendToGuiCommandUpdate
    | BackendToGuiCommandNavigate
    | BackendToGuiCommandDeviceDelete
    | BackendToGuiCommandAllUpdate;
