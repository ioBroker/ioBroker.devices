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

export type CustomWidgetType = 'clock' | 'weather' | 'iframe' | 'wind' | 'gauge' | 'universal' | 'plugin';

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
        customWidgets?: CustomWidgetBase[];
        widgetOrder?: string[];
        widgetGroups?: Array<{
            id: string;
            name: string;
            collapsed?: boolean;
            widgetIds: string[];
        }>;
    };
}

export interface WidgetSettingsBase {
    size: '1x1' | '2x0.5' | '2x1';
    name: string;
    favorite: boolean;

    color: string;
    /** Custom color for inactive state */
    colorActive?: string;

    trendMinutes?: number;
    showTrendArrow?: boolean;
    chartHours: number;

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
    /** Any widget-specific settings (managed by JsonConfig) */
    [key: string]: any;
}

export interface WidgetGenericState {
    name: string | null;
    color: string | null;
    indicators: IndicatorValues;
    chartSeries: ChartSeries[];
    chartDialogOpen: boolean;
    chartType: ChartLineType;
}
