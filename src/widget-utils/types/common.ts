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
