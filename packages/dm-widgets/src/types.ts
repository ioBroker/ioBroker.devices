/**
 * Core type definitions for the Widget Manager.
 * These mirror the types from src/widget-utils/types/base.ts
 */
import type { DetectorState, Types } from '@iobroker/type-detector/build/types';
import type { ChartLineType, ChartSeries, IndicatorValues } from './WidgetGeneric';

export type Color = 'primary' | 'secondary' | (string & {});
export type ValueOrObject<T> = T | { objectId: string; property: string };
export type ValueOrState<T> = T | { stateId: string; mapping?: Record<string | number, string> };
export type ValueOrStateOrObject<T> = T | ValueOrObject<T> | ValueOrState<T>;

export type DeviceStatus =
    | 'connected'
    | 'disconnected'
    | {
          // or string '10V',
          // or string '10mV',
          // or string '100' in mV
          // or boolean true (means OK) or false (Battery warning)
          battery?: ValueOrState<number | boolean | 'charging' | (string & {})>;
          connection?: ValueOrState<'connected' | 'disconnected'>;
          rssi?: ValueOrState<number>;
          warning?: ValueOrState<ioBroker.StringOrTranslated | boolean>;
      };

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
    /** common.unit of the underlying state (delivered by the backend; used e.g. for power W/kW). */
    unit?: string;
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
        uiDisabled?: boolean;
        [key: string]: any;
    };
}

export type CustomWidgetType =
    | 'clock'
    | 'weather'
    | 'iframe'
    | 'wind'
    | 'gauge'
    | 'universal'
    | 'plugin'
    | 'newline'
    | 'presence'
    | 'energyFlow';

export interface CategoryInfo extends ItemInfo {
    type: 'category';
    custom?: {
        image?: string;
        imageScope?: 'header' | 'page';
        backgroundColor?: string;
        noStatus?: boolean;
        noHumidity?: boolean;
        noTemperature?: boolean;
        noWindows?: boolean;
        /** Room-value source for the power badge: 'sum' (default) | <stateId>. */
        powerSource?: string;
        /** Room-value source for temperature: 'first' (default) | 'avg' | <stateId>. */
        temperatureSource?: string;
        /** Room-value source for humidity: 'first' (default) | 'avg' | <stateId>. */
        humiditySource?: string;
        customWidgets?: CustomWidgetBase[];
        widgetOrder?: string[];
        /** Explicit toggle for groups-vs-sorted-list view. */
        widgetsGrouped?: boolean;
        widgetGroups?: Array<{
            id: string;
            name: string;
            collapsed?: boolean;
            widgetIds: string[];
        }>;
    };
}

/** Period over which the min/max values are calculated from history */
export type MinMaxPeriod = 'off' | '24h' | 'today';

/**
 * What a subject may do with a widget or a category.
 *
 * `hidden` — not rendered at all; `read` — shown, but every writing interaction is disabled;
 * `control` — unrestricted (the default when no rule matches).
 *
 * This governs the presentation only. Hidden widgets still reach the browser, so this is a view
 * control, not an access control — see `src-admin/src/WidgetsManager/PERMISSIONS.md`.
 */
export type AclLevel = 'hidden' | 'read' | 'control';

/**
 * Access rules of a single node (widget or category).
 *
 * Keys are full ioBroker object IDs — `system.group.kids`, `system.user.lena` — so they can be
 * compared with `system.group.*.common.members` without any conversion.
 */
export interface WmAcl {
    /** Applies to every subject not listed below */
    default?: AclLevel;
    groups?: Record<string, AclLevel>;
    users?: Record<string, AclLevel>;
}

export interface WidgetSettingsBase {
    size: '1x1' | '2x0.5' | '2x1' | '2x2';
    name: string;
    favorite: boolean;

    color: string;
    /** Custom color for inactive state */
    colorActive?: string;

    trendMinutes?: number;
    showTrendArrow?: boolean;
    chartHours: number;
    /** Show min/max values from history: 'off' (default), last 24 hours or since midnight */
    minMaxPeriod?: MinMaxPeriod;

    /** View permissions. Absent means everybody may control the widget. */
    acl?: WmAcl;
    /** Additional categories this widget appears in, besides the one derived from its object tree */
    extraParents?: string[];

    /** Custom widget icon URL/base64 (for non-alarm widgets, stored in `common.icon`) */
    icon: string;
    iconActive: string;

    text: string;
    textActive: string;
}

export interface CustomWidgetBase extends WidgetSettingsBase {
    id: string;
    type: CustomWidgetType;
}

/** Custom widget definition — settings are stored dynamically via JsonConfig schemas */
export interface CustomWidgetPlugin extends CustomWidgetBase {
    type: 'plugin';
    /** Plugin: adapter name that provides the widget */
    pluginAdapter?: string;
    /** Plugin: component name exported by the adapter */
    pluginComponent?: string;
    /** Plugin: URL to load the widget bundle (federation remote entry) */
    pluginUrl?: string;
}

export interface WidgetGenericState {
    name: string | null;
    color: string | null;
    indicators: IndicatorValues;
    chartSeries: ChartSeries[];
    chartDialogOpen: boolean;
    chartType: ChartLineType;
    /** PinPad dialog state */
    pinPadOpen: boolean;
    pinPadPin: string;
    /** Confirmation dialog state */
    confirmDialogOpen: boolean;
    confirmDialogMode: 'dialog' | 'pin';
    confirmDialogPin: string;
    confirmDialogText: string;
}
