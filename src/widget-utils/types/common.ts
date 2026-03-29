export type Color = 'primary' | 'secondary' | (string & {}); // color (you can use primary, secondary or color rgb value or hex)

export type RetVal<T> = T | Promise<T>;

export type DeviceId = string | number;

export type ValueOrObject<T> = T | { objectId: string; property: string };
export type ValueOrState<T> = T | { stateId: string; mapping?: Record<string | number, string> };
export type ValueOrStateOrObject<T> = T | ValueOrObject<T> | ValueOrState<T>;

export type DeviceStatus =
    | 'connected'
    | 'disconnected'
    | {
          battery?: ValueOrState<number | boolean | 'charging' | (string & {})>; // in percent (0-100), or string 'charging' or value with unit as string,
          // or string '10V',
          // or string '10mV',
          // or string '100' in mV
          // or boolean true (means OK) or false (Battery warning)
          connection?: ValueOrState<'connected' | 'disconnected'>;
          rssi?: ValueOrState<number>; // in dBm
          warning?: ValueOrState<ioBroker.StringOrTranslated | boolean>; // warning text or just boolean true (means warning)
      };

export interface InstanceWidgetDescription {
    url: string;
    components: {
        /** Name of the class */
        name: string;
        /** Title */
        label: ioBroker.StringOrTranslated;
        /** Description */
        description: ioBroker.StringOrTranslated;
        /** Icon as a link to picture imageName.png relative to the admin folder or base64 */
        icon: string;
    }[];
}

/** Config item definition for plugin widget settings */
export interface WidgetConfigItem {
    type: 'select' | 'checkbox' | 'color' | 'text' | 'stateId' | 'instanceSelect' | 'citySearch' | 'colorLevels';
    /** i18n key or translated label for the field */
    label: string;
    /** Default value */
    default?: unknown;
    /** Select options (for type='select') */
    options?: { value: string; label: string }[];
    /** Render select as toggle-button row (for type='select') */
    format?: 'radio';
    /** Placeholder text (for type='text') */
    placeholder?: string;
    /** Helper text below the input (for type='text') */
    helperText?: string;
    /** Input type: 'text' or 'number' (for type='text') */
    inputType?: 'text' | 'number';
    /** Adapter names to list instances for (for type='instanceSelect') */
    adapterNames?: string[];
    /** Auto-populate other fields from the selected object's common properties (for type='stateId') */
    autoFill?: Record<string, string>;
    /** Color level defaults (for type='colorLevels') */
    colorLevels?: { value: number; color: string }[];
    /** Only show this item when the specified key has the specified value */
    visibleWhen?: Record<string, unknown>;
}
