import { type Connection, I18n, type ThemeType } from '@iobroker/adapter-react-v5';

export type StateChangeListener = (id: string, state: ioBroker.State) => void;
export type ObjectChangeListener = (
    id: string,
    property: string,
    value: string | boolean | number | ioBroker.StringOrTranslated,
) => void;

/** Collect requests for this many ms before sending them as a batch */
const BATCH_DELAY = 200;

export default class StateContext {
    private readonly subscribedStates: { [id: string]: StateChangeListener[] } = {};
    private readonly subscribedObjects: { [id: string]: { property: string; cb: ObjectChangeListener }[] } = {};
    private objects: { [id: string]: ioBroker.Object } = {};
    private states: { [id: string]: ioBroker.State } = {};
    /** Persistent object cache — survives unsubscribe, cleared only on destroy */
    private readonly objectCache: { [id: string]: ioBroker.Object } = {};

    // ── Batching queues ──────────────────────────────────────────────
    private pendingStateIds: string[] = [];
    private stateFlushTimer: ReturnType<typeof setTimeout> | null = null;

    private pendingObjectFetches: { id: string; resolve: (obj: any) => void; reject: (err: Error) => void }[] = [];
    private objectFetchTimer: ReturnType<typeof setTimeout> | null = null;

    private pendingObjPropIds: string[] = [];
    private objPropTimer: ReturnType<typeof setTimeout> | null = null;

    private _language = I18n.getLanguage();
    private _isFloatComma: boolean;
    private _dateFormat: string;
    private readonly _admin: boolean;
    private _instanceId: string;
    protected readonly socket: Connection;
    /** Latitude from system.config for sun calculations */
    private _latitude: number | null = null;
    /** Longitude from system.config for sun calculations */
    private _longitude: number | null = null;
    private _defaultHistory: string | null = null;
    private readonly _imagePrefix: string;
    private readonly _themeType: ThemeType;

    constructor(props: {
        socket: Connection;
        instanceId: string;
        admin: boolean;
        dateFormat: string;
        isFloatComma: boolean;
        latitude: number | null;
        longitude: number | null;
        defaultHistory: string | null;
        themeType: ThemeType;
    }) {
        this.socket = props.socket;
        this._instanceId = props.instanceId;
        this._isFloatComma = props.isFloatComma;
        this._dateFormat = props.dateFormat;
        this._admin = props.admin;
        this._longitude = props.longitude ?? null;
        this._latitude = props.latitude ?? null;
        this._defaultHistory = props.defaultHistory;
        this._imagePrefix = props.admin ? '../../files/' : '../';
        this._themeType = props.themeType;
    }

    public get language(): ioBroker.Languages {
        return this._language;
    }
    public setLanguage(language: ioBroker.Languages): void {
        this._language = language;
    }

    public get isFloatComma(): boolean {
        return this._isFloatComma;
    }
    public setFloatComma(isFloatComma: boolean): void {
        this._isFloatComma = isFloatComma;
    }
    public get themeType(): ThemeType {
        return this._themeType;
    }

    public get dateFormat(): string {
        return this._dateFormat;
    }
    public setDateFormat(dateFormat: string): void {
        this._dateFormat = dateFormat;
    }

    public get admin(): boolean {
        return this._admin;
    }

    public get instanceId(): string {
        return this._instanceId;
    }

    public setInstanceId(instanceId: string): void {
        this._instanceId = instanceId;
    }

    public setDefaultHistory(defaultHistory: string | null): void {
        this._defaultHistory = defaultHistory;
    }
    public get defaultHistory(): string | null {
        return this._defaultHistory;
    }

    public get longitude(): number | null {
        return this._longitude;
    }
    public get latitude(): number | null {
        return this._latitude;
    }
    public setCoordinates(latitude: number | null, longitude: number | null): void {
        this._latitude = latitude;
        this._longitude = longitude;
    }

    public get imagePrefix(): string {
        return this._imagePrefix;
    }

    private onStateChange = (id: string, state: ioBroker.State | null | undefined): void => {
        if (this.subscribedStates[id]) {
            this.states[id] = state || ({ val: null, ts: Date.now(), ack: true } as ioBroker.State);
            this.subscribedStates[id].forEach(cb =>
                cb(id, this.states[id] || ({ val: null, ts: Date.now(), ack: true } as ioBroker.State)),
            );
        }
    };

    getImagePath(fileName: string | null | undefined): string | null {
        if (typeof fileName === 'string') {
            if (fileName.startsWith('data:image') || fileName.match(/^https?:\/\//) || fileName.length < 4) {
                return fileName;
            }
            return this._imagePrefix + fileName.replace(/^\//, '');
        }
        return null;
    }

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
            this.objectCache[id] = this.objects[id];
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

    // ── Batched getState + subscribeState ────────────────────────────

    private flushStates(): void {
        const ids = this.pendingStateIds.splice(0);
        this.stateFlushTimer = null;
        if (!ids.length) {
            return;
        }

        void this.socket.getStates(ids).then(async result => {
            for (const id of ids) {
                this.states[id] = result?.[id] || ({ val: null, ts: Date.now(), ack: true } as ioBroker.State);
                this.subscribedStates[id]?.forEach(cb => cb(id, this.states[id]));
            }
            await this.socket.subscribeState(ids, this.onStateChange);
        });
    }

    getState(id: string, handler: StateChangeListener): void {
        if (!this.subscribedStates[id]) {
            this.subscribedStates[id] = [handler];
            this.pendingStateIds.push(id);
            if (!this.stateFlushTimer) {
                this.stateFlushTimer = setTimeout(() => this.flushStates(), BATCH_DELAY);
            }
        } else {
            this.subscribedStates[id].push(handler);
            if (this.states[id]) {
                setTimeout(() => handler(id, this.states[id]), 0);
            }
            // else: fetch still in progress — handler will be called when it resolves
        }
    }

    // ── Batched getObject ───────────────────────────────────────────

    private flushObjectFetches(): void {
        const pending = this.pendingObjectFetches.splice(0);
        this.objectFetchTimer = null;
        if (!pending.length) {
            return;
        }

        const ids = pending.map(p => p.id);
        void this.socket
            .getObjectsById(ids)
            .then((result: Record<string, ioBroker.Object> | undefined) => {
                for (const { id, resolve, reject } of pending) {
                    const obj = result?.[id];
                    if (obj) {
                        this.objects[id] = obj;
                        this.objectCache[id] = obj;
                        resolve(obj);
                    } else {
                        reject(new Error(`Object with id ${id} not found`));
                    }
                }
            })
            .catch(err => {
                for (const { reject } of pending) {
                    reject(err instanceof Error ? err : new Error(String(err)));
                }
            });
    }

    async getObject<T>(id: string): Promise<T | undefined> {
        if (this.objects[id]) {
            return this.objects[id] as T;
        }
        if (this.objectCache[id]) {
            return this.objectCache[id] as T;
        }
        return new Promise<T>((resolve, reject) => {
            this.pendingObjectFetches.push({ id, resolve, reject });
            if (!this.objectFetchTimer) {
                this.objectFetchTimer = setTimeout(() => this.flushObjectFetches(), BATCH_DELAY);
            }
        });
    }

    // ── Batched getObjectProperty + subscribeObject ─────────────────

    private flushObjectProperties(): void {
        const ids = this.pendingObjPropIds.splice(0);
        this.objPropTimer = null;
        if (!ids.length) {
            return;
        }

        const toFetch = ids.filter(id => !this.objects[id] && !this.objectCache[id]);
        const cached = ids.filter(id => this.objects[id] || this.objectCache[id]);

        // Notify cached ones immediately
        for (const id of cached) {
            this.onObjectChange(id, this.objects[id] || this.objectCache[id]);
        }

        const subscribeAll = async (): Promise<void> => {
            await this.socket.subscribeObject(ids, this.onObjectChange);
        };

        if (toFetch.length) {
            void this.socket
                .getObjectsById(toFetch)
                .then(async (result: Record<string, ioBroker.Object> | undefined) => {
                    for (const id of toFetch) {
                        this.onObjectChange(id, result?.[id] || null);
                    }
                    await subscribeAll();
                });
        } else {
            void subscribeAll();
        }
    }

    getObjectProperty(id: string, property: string, cb: ObjectChangeListener): void {
        if (!this.subscribedObjects[id]) {
            this.subscribedObjects[id] = [{ property, cb }];
            if (this.objects[id]) {
                setTimeout(() => this.onObjectChange(id, this.objects[id]), 0);
            } else {
                this.pendingObjPropIds.push(id);
                if (!this.objPropTimer) {
                    this.objPropTimer = setTimeout(() => this.flushObjectProperties(), BATCH_DELAY);
                }
            }
        } else if (this.objects[id]) {
            setTimeout(() => this.onObjectChange(id, this.objects[id]), 0);
        }
    }

    // ── Remove / unsubscribe ────────────────────────────────────────

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
        if (this.stateFlushTimer) {
            clearTimeout(this.stateFlushTimer);
            this.stateFlushTimer = null;
        }
        if (this.objectFetchTimer) {
            clearTimeout(this.objectFetchTimer);
            this.objectFetchTimer = null;
        }
        if (this.objPropTimer) {
            clearTimeout(this.objPropTimer);
            this.objPropTimer = null;
        }
        this.pendingStateIds.length = 0;
        this.pendingObjectFetches.length = 0;
        this.pendingObjPropIds.length = 0;

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
