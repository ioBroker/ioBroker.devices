import type { Color, DeviceStatus, ValueOrObject, ValueOrState } from './common';
import type { DetectorState, Types } from '@iobroker/type-detector/build/types';

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

export interface DevicesDetectorState extends DetectorState {
    id: string;
    stateRole?: string;
}
export interface DevicesPatternControl {
    states: DevicesDetectorState[];
    type: Types;
    storeId: string;
    parentId: string;
    deviceId: string;
    channelId: string;
}
export interface WidgetInfo extends ItemInfo {
    type: 'widget';
    control: DevicesPatternControl;
    custom?: {
        enabled: true;
        image?: string;
        parent?: string;
        /** Widget is visually disabled in the UI */
        uiDisabled?: boolean;
        /** Arbitrary widget settings (size, chartHours, color, icons, etc.) */
        [key: string]: any;
    };
}

export type CustomWidgetType = 'clock' | 'weather' | 'iframe' | 'wind' | 'gauge';

export interface CustomWidgetDef {
    id: string;
    type: CustomWidgetType;
    size?: '1x1' | '2x0.5' | '2x1';
    color?: string;
    /** Widget-specific style variant (e.g., 'digital' | 'analog' for clock) */
    style?: 'digital' | 'analog';
    /** Show date (day + month). Default: true */
    showDate?: boolean;
    /** Show day of week. Default: true */
    showDow?: boolean;
    /** Show seconds. Default: true */
    showSeconds?: boolean;
    /** Weather adapter instance (e.g., "openweathermap.0") */
    adapterInstance?: string;
    /** Weather data source: adapter-based, open-meteo API, or yr.no API */
    weatherSource?: 'adapter' | 'openmeteo' | 'yrno';
    /** Latitude for open-meteo */
    latitude?: number;
    /** Longitude for open-meteo */
    longitude?: number;
    /** City name for display (open-meteo) */
    cityName?: string;
    /** URL for iframe widget */
    url?: string;
    /** Refresh interval in seconds (0 = no auto-refresh) */
    refreshInterval?: number;
    /** Append ?ts=<timestamp> to URL for cache-busting */
    appendTimestamp?: boolean;
    /** Click action: open in dialog, new tab, or same tab */
    clickAction?: 'dialog' | 'newTab' | 'sameTab';
    /** Wind direction state ID (degrees 0-360) */
    directionStateId?: string;
    /** Wind speed state ID */
    speedStateId?: string;
    /** Wind gusts state ID */
    gustsStateId?: string;
    /** Gauge: state ID to read value from */
    gaugeStateId?: string;
    /** Gauge: display name / label */
    gaugeName?: string;
    /** Gauge: minimum value */
    minValue?: number;
    /** Gauge: maximum value */
    maxValue?: number;
    /** Gauge: display unit */
    gaugeUnit?: string;
    /** Gauge: color level breakpoints — each entry paints the arc up to that value */
    colorLevels?: { value: number; color: string }[];
    /** Gauge: interpret colorLevels values as percentage (0-100) instead of absolute */
    usePercentage?: boolean;
    /** Whether the custom widget is marked as favorite */
    favorite?: boolean;
    /** Widget was created in Favorites — show only there, not in the owning category */
    favoritesOnly?: boolean;
}

export interface CategoryInfo extends ItemInfo {
    type: 'category';
    custom?: {
        image?: string;
        /** 'header' = background only behind header, 'page' = background behind whole page */
        imageScope?: 'header' | 'page';
        backgroundColor?: string;
        noStatus?: boolean;
        noHumidity?: boolean;
        noTemperature?: boolean;
        noWindows?: boolean;
        customWidgets?: CustomWidgetDef[];
        widgetOrder?: string[];
        widgetGroups?: Array<{
            id: string;
            name: string;
            collapsed?: boolean;
            widgetIds: string[];
        }>;
    };
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
