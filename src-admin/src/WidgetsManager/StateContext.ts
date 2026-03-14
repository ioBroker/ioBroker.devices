import type { Connection } from '@iobroker/adapter-react-v5';

export type StateChangeListener = (id: string, state: ioBroker.State) => void;
export type ObjectChangeListener = (
    id: string,
    property: string,
    value: string | boolean | number | ioBroker.StringOrTranslated,
) => void;

export default class StateContext {
    private readonly subscribedStates: { [id: string]: StateChangeListener[] } = {};
    private readonly subscribedObjects: { [id: string]: { property: string; cb: ObjectChangeListener }[] } = {};
    private objects: { [id: string]: ioBroker.Object } = {};
    private states: { [id: string]: ioBroker.State } = {};

    constructor(private readonly socket: Connection) {}

    private onStateChange = (id: string, state: ioBroker.State | null | undefined): void => {
        if (this.subscribedStates[id]) {
            this.states[id] = state || ({ val: null, ts: Date.now(), ack: true } as ioBroker.State);
            this.subscribedStates[id].forEach(cb => cb(id, this.states[id]));
        }
    };

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

    private onObjectChange = (id: string, obj: ioBroker.Object | null | undefined): void => {
        if (this.subscribedObjects[id]) {
            this.objects[id] = obj || ({ _id: id, common: { name: id } } as ioBroker.Object);
            this.subscribedObjects[id].forEach(item => {
                const parts = item.property.split('.');
                let current: any = this.objects[id];
                for (const part of parts) {
                    if (current[part] === undefined) {
                        item.cb(id, item.property, '');
                        return undefined;
                    }
                    current = current[part];
                }
                item.cb(
                    id,
                    item.property,
                    StateContext.extractProperty<string | number | boolean | ioBroker.StringOrTranslated>(
                        this.objects[id],
                        item.property,
                    ),
                );
            });
        }
    };

    getState(id: string, handler: StateChangeListener): void {
        if (!this.subscribedStates[id]) {
            this.subscribedStates[id] = [];
            // read value
            void this.socket.getState(id).then(async state => {
                if (!state) {
                    this.states[id] = { val: null, ts: Date.now(), ack: true } as ioBroker.State;
                } else {
                    this.states[id] = state;
                    this.subscribedStates[id].push(handler);
                    // subscribe for changes
                    await this.socket.subscribeState(id, this.onStateChange);
                }
            });
        } else if (this.states[id]) {
            setTimeout(() => handler(id, this.states[id]), 0);
        } else {
            throw new Error(`State ${id} is not available`);
        }
    }

    async getObject<T>(id: string): Promise<T | undefined> {
        if (!this.objects[id]) {
            const object = await this.socket.getObject(id);
            if (!object) {
                throw new Error(`Object with id ${id} not found`);
            } else {
                this.objects[id] = object;
            }
        }

        return this.objects[id] as T;
    }

    getObjectProperty(id: string, property: string, cb: ObjectChangeListener): void {
        if (!this.subscribedObjects[id]) {
            this.subscribedObjects[id] = [{ property, cb }];
            if (!this.objects[id]) {
                void this.socket.getObject(id).then(async obj => {
                    this.onObjectChange(id, obj);
                    await this.socket.subscribeObject(id, this.onObjectChange);
                });
            } else {
                setTimeout(() => this.onObjectChange(id, this.objects[id]), 0);
            }
        } else if (this.objects[id]) {
            setTimeout(() => this.onObjectChange(id, this.objects[id]), 0);
        }
    }

    async removeObject(id: string, cb: ObjectChangeListener): Promise<void> {
        if (this.subscribedObjects[id]) {
            const pos = this.subscribedObjects[id].findIndex(item => item.cb === cb);
            if (pos !== -1) {
                this.subscribedObjects[id].splice(pos, 1);
            }
            if (!this.subscribedObjects[id].length) {
                await this.socket.unsubscribeObject(id);
                delete this.subscribedObjects[id];
                delete this.objects[id];
            }
        }
    }

    removeState(id: string, handler: StateChangeListener): void {
        if (this.subscribedStates[id]) {
            const pos = this.subscribedStates[id].indexOf(handler);
            if (pos !== -1) {
                this.subscribedStates[id].splice(pos, 1);
            }
            if (!this.subscribedStates[id].length) {
                this.socket.unsubscribeState(id);
                delete this.subscribedStates[id];
                delete this.states[id];
            }
        }
    }

    getSocket(): Connection {
        return this.socket;
    }

    destroy(): void {
        Object.keys(this.subscribedStates).forEach(id => {
            this.socket.unsubscribeState(id);
            delete this.subscribedStates[id];
            delete this.states[id];
        });
        Object.keys(this.objects).forEach(id => {
            delete this.objects[id];
        });
    }
}
