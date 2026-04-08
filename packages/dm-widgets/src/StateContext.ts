/**
 * StateContext — manages ioBroker state/object subscriptions.
 *
 * This is a compilable mirror of the host's StateContext.
 * At runtime, Module Federation provides the host's real implementation.
 */
import type { Connection } from '@iobroker/adapter-react-v5';

export type StateChangeListener = (id: string, state: ioBroker.State) => void;

export type ObjectChangeListener = (
    id: string,
    property: string,
    value: string | boolean | number | ioBroker.StringOrTranslated,
) => void;

/** Interface for StateContext — used in WidgetGenericProps so host and plugin types are compatible */
export interface IStateContext {
    getState(id: string, handler: StateChangeListener): void;
    getObject<T>(id: string): Promise<T | undefined>;
    getObjectProperty(id: string, property: string, cb: ObjectChangeListener): void;
    removeObject(id: string, cb: ObjectChangeListener): Promise<void>;
    removeState(id: string, handler: StateChangeListener): void;
    getSocket(): Connection;
    destroy(): void;
}

export default class StateContext implements IStateContext {
    constructor(protected readonly socket: Connection) {}

    static extractProperty<T>(obj: ioBroker.Object, property: string): T {
        const parts = property.split('.');
        let current: any = obj;
        for (const part of parts) {
            if (current[part] === undefined) {
                return '' as T;
            }
            current = current[part];
        }
        return current;
    }

    getState(id: string, handler: StateChangeListener): void {
        void id;
        void handler;
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    async getObject<T>(id: string): Promise<T | undefined> {
        void id;
        return undefined;
    }

    getObjectProperty(id: string, property: string, cb: ObjectChangeListener): void {
        void id;
        void property;
        void cb;
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    async removeObject(id: string, cb: ObjectChangeListener): Promise<void> {
        void id;
        void cb;
    }

    removeState(id: string, handler: StateChangeListener): void {
        void id;
        void handler;
    }

    getSocket(): Connection {
        return this.socket;
    }

    destroy(): void {
        // stub
    }
}
