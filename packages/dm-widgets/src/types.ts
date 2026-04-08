/**
 * Core type definitions for the Widget Manager.
 * These mirror the types from src/widget-utils/types/base.ts
 */
import type { DetectorState, Types } from '@iobroker/type-detector/build/types';

export type Color = 'primary' | 'secondary' | (string & {});
export type ValueOrObject<T> = T | { objectId: string; property: string };
export type ValueOrState<T> = T | { stateId: string; mapping?: Record<string | number, string> };

export type DeviceStatus =
    | 'connected'
    | 'disconnected'
    | {
          battery?: ValueOrState<number | boolean | 'charging' | (string & {})>;
          connection?: ValueOrState<'connected' | 'disconnected'>;
          rssi?: ValueOrState<number>;
          warning?: ValueOrState<ioBroker.StringOrTranslated | boolean>;
      };

export interface ItemInfo {
    type: 'widget' | 'category';
    id: string | number;
    name: ValueOrObject<ioBroker.StringOrTranslated>;
    icon?: ValueOrState<string>;
    color?: ValueOrState<Color>;
    backgroundColor?: ValueOrState<Color>;
    status?: DeviceStatus | DeviceStatus[];
    enabled?: ValueOrState<boolean>;
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

/** Config item definition for plugin widget settings */
export interface WidgetConfigItem {
    type: 'select' | 'checkbox' | 'color' | 'text' | 'stateId' | 'instanceSelect' | 'citySearch' | 'colorLevels';
    label: string;
    default?: unknown;
    options?: { value: string; label: string }[];
    format?: 'radio';
    placeholder?: string;
    helperText?: string;
    inputType?: 'text' | 'number';
    adapterNames?: string[];
    autoFill?: Record<string, string>;
    colorLevels?: { value: number; color: string }[];
    visibleWhen?: Record<string, unknown>;
}

export interface CustomWidgetBase {
    id: string;
    type: CustomWidgetType;
    size?: '1x1' | '2x0.5' | '2x1';
    color?: string;
    favorite?: boolean;
}

export interface ClockWidgetDef extends CustomWidgetBase {
    type: 'clock';
    style?: 'digital' | 'analog';
    showDate?: boolean;
    showDow?: boolean;
    showSeconds?: boolean;
}

export interface WeatherWidgetDef extends CustomWidgetBase {
    type: 'weather';
    adapterInstance?: string;
    weatherSource?: 'adapter' | 'openmeteo' | 'yrno';
    latitude?: number;
    longitude?: number;
    cityName?: string;
}

export interface IframeWidgetDef extends CustomWidgetBase {
    type: 'iframe';
    url?: string;
    refreshInterval?: number;
    appendTimestamp?: boolean;
    clickAction?: 'dialog' | 'newTab' | 'sameTab';
}

export interface WindWidgetDef extends CustomWidgetBase {
    type: 'wind';
    directionStateId?: string;
    speedStateId?: string;
    gustsStateId?: string;
}

export interface GaugeWidgetDef extends CustomWidgetBase {
    type: 'gauge';
    gaugeStateId?: string;
    gaugeStateId2?: string;
    gaugeName?: string;
    minValue?: number;
    maxValue?: number;
    gaugeUnit?: string;
    colorLevels?: { value: number; color: string }[];
    usePercentage?: boolean;
}

export interface UniversalWidgetDef extends CustomWidgetBase {
    type: 'universal';
    name?: string;
    secondaryName?: string;
    digits?: number;
    widgetIcon?: string;
    widgetIconActive?: string;
    stateId?: string;
    secondaryStateId?: string;
    opacityStateId?: string;
    opacityFalse?: number;
    opacityTrue?: number;
    colorLevels?: { value: number; color: string }[];
    actionStateId?: string;
    actionType?: 'value' | 'toggle';
    actionValue?: string | number | boolean;
    actionConfirm?: 'none' | 'dialog' | 'pin';
    actionConfirmText?: string;
    actionPin?: string;
    icon1StateId?: string;
    icon1Name?: string;
    icon1Color?: string;
    icon2StateId?: string;
    icon2Name?: string;
    icon2Color?: string;
    icon3StateId?: string;
    icon3Name?: string;
    icon3Color?: string;
}

export interface PluginWidgetDef extends CustomWidgetBase {
    type: 'plugin';
    pluginAdapter?: string;
    pluginComponent?: string;
    pluginUrl?: string;
    /** Plugin config schema for widget settings */
    pluginConfigItems?: Record<string, WidgetConfigItem>;
    [key: string]: any;
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
