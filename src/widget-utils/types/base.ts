import type { PatternControl } from '@iobroker/type-detector';
import type { Color, DeviceStatus, ValueOrObject, ValueOrState } from './common';

export interface ItemInfo {
    type: 'widget' | 'category';
    /** ID of the device. Must be unique only in one adapter. Other adapters could have the same IDs */
    id: string | number;
    /** Name of the device. It will be shown in the card header */
    name: ValueOrObject<ioBroker.StringOrTranslated>;
    /** base64 or url icon for device card */
    icon?: ValueOrState<string>;
    /** Color or 'primary', 'secondary' for the text in the card header */
    color?: ValueOrState<Color>;
    /** Background color of card header (you can use primary, secondary or color rgb value or hex) */
    backgroundColor?: ValueOrState<Color>;
    status?: DeviceStatus | DeviceStatus[];
    /** If this flag is true or false, the according indication will be shown. Additionally, if ACTIONS.ENABLE_DISABLE is implemented, this action will be sent to the backend by clicking on this indication */
    enabled?: ValueOrState<boolean>;
    /** ID of the category to which belongs the widget */
    parent?: string;
}

export interface WidgetInfo extends ItemInfo {
    type: 'widget';
    control: PatternControl;
}

export interface CategoryInfo extends ItemInfo {
    type: 'category';
}

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
