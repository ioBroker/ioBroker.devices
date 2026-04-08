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

export type CustomWidgetType = 'clock' | 'weather' | 'iframe' | 'wind' | 'gauge' | 'universal' | 'plugin';

export interface CustomWidgetBase {
    id: string;
    type: CustomWidgetType;
    size?: '1x1' | '2x0.5' | '2x1';
    color?: string;
    /** Whether the custom widget is marked as favorite */
    favorite?: boolean;
}

export interface ClockWidgetDef extends CustomWidgetBase {
    type: 'clock';
    /** Style variant: digital or analog */
    style?: 'digital' | 'analog';
    /** Show date (day + month). Default: true */
    showDate?: boolean;
    /** Show day of week. Default: true */
    showDow?: boolean;
    /** Show seconds. Default: true */
    showSeconds?: boolean;
}

export interface WeatherWidgetDef extends CustomWidgetBase {
    type: 'weather';
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
}

export interface IframeWidgetDef extends CustomWidgetBase {
    type: 'iframe';
    /** URL for iframe widget */
    url?: string;
    /** Refresh interval in seconds (0 = no auto-refresh) */
    refreshInterval?: number;
    /** Append ?ts=<timestamp> to URL for cache-busting */
    appendTimestamp?: boolean;
    /** Click action: open in dialog, new tab, or same tab */
    clickAction?: 'dialog' | 'newTab' | 'sameTab';
}

export interface WindWidgetDef extends CustomWidgetBase {
    type: 'wind';
    /** Wind direction state ID (degrees 0-360) */
    directionStateId?: string;
    /** Wind speed state ID */
    speedStateId?: string;
    /** Wind gusts state ID */
    gustsStateId?: string;
}

export interface GaugeWidgetDef extends CustomWidgetBase {
    type: 'gauge';
    /** State ID to read value from */
    gaugeStateId?: string;
    /** Optional second state ID shown as secondary value */
    gaugeStateId2?: string;
    /** Display name / label */
    gaugeName?: string;
    /** Minimum value */
    minValue?: number;
    /** Maximum value */
    maxValue?: number;
    /** Display unit */
    gaugeUnit?: string;
    /** Color level breakpoints — each entry paints the arc up to that value */
    colorLevels?: { value: number; color: string }[];
    /** Interpret colorLevels values as percentage (0-100) instead of absolute */
    usePercentage?: boolean;
}

export interface UniversalWidgetDef extends CustomWidgetBase {
    type: 'universal';
    /** Display name (shown below the value) */
    name?: string;
    /** Secondary display name (shown below secondary value) */
    secondaryName?: string;
    /** Number of decimal digits. Default: 1 */
    digits?: number;
    /** Widget icon (inactive/default) — data URI, file path, or base64 */
    widgetIcon?: string;
    /** Widget icon when active (shown when action state is truthy) */
    widgetIconActive?: string;
    /** Primary value state ID */
    stateId?: string;
    /** Secondary value state ID (shown in upper-right corner) */
    secondaryStateId?: string;
    /** Opacity control state ID (number 0-1 or boolean) */
    opacityStateId?: string;
    /** Opacity when boolean state is false (0-1). Default: 0 */
    opacityFalse?: number;
    /** Opacity when boolean state is true (0-1). Default: 1 */
    opacityTrue?: number;
    /** Color level breakpoints for the primary value */
    colorLevels?: { value: number; color: string }[];
    /** Control object ID — written on click */
    actionStateId?: string;
    /** Control type: 'value' sends a fixed value, 'toggle' inverts boolean */
    actionType?: 'value' | 'toggle';
    /** Value to send when actionType is 'value' */
    actionValue?: string | number | boolean;
    /** Confirmation before executing: 'none', 'dialog', or 'pin' */
    actionConfirm?: 'none' | 'dialog' | 'pin';
    /** Custom text for the confirmation dialog */
    actionConfirmText?: string;
    /** PIN code when actionConfirm is 'pin' */
    actionPin?: string;
    /** Icon 1: boolean state ID */
    icon1StateId?: string;
    /** Icon 1: Material icon name */
    icon1Name?: string;
    /** Icon 1: color when active */
    icon1Color?: string;
    /** Icon 2: boolean state ID */
    icon2StateId?: string;
    /** Icon 2: Material icon name */
    icon2Name?: string;
    /** Icon 2: color when active */
    icon2Color?: string;
    /** Icon 3: boolean state ID */
    icon3StateId?: string;
    /** Icon 3: Material icon name */
    icon3Name?: string;
    /** Icon 3: color when active */
    icon3Color?: string;
}

export interface PluginWidgetDef extends CustomWidgetBase {
    type: 'plugin';
    /** Adapter name that provides the widget */
    pluginAdapter?: string;
    /** Component name exported by the adapter */
    pluginComponent?: string;
    /** URL to load the widget bundle (federation remote entry) */
    pluginUrl?: string;
}

export type CustomWidgetDef =
    | ClockWidgetDef
    | WeatherWidgetDef
    | IframeWidgetDef
    | WindWidgetDef
    | GaugeWidgetDef
    | UniversalWidgetDef
    | PluginWidgetDef;

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
