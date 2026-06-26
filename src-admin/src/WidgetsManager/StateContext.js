import { I18n } from '@iobroker/adapter-react-v5';
/** Collect requests for this many ms before sending them as a batch */
const BATCH_DELAY = 200;
export default class StateContext {
    subscribedStates = {};
    subscribedObjects = {};
    objects = {};
    states = {};
    /** Persistent object cache — survives unsubscribe, cleared only on destroy */
    objectCache = {};
    // ── Batching queues ──────────────────────────────────────────────
    pendingStateIds = [];
    stateFlushTimer = null;
    pendingObjectFetches = [];
    objectFetchTimer = null;
    pendingObjPropIds = [];
    objPropTimer = null;
    /** Debounce timer for refreshAllStates (reconnect + visibilitychange can fire together) */
    refreshTimer = null;
    _language = I18n.getLanguage();
    _isFloatComma;
    _dateFormat;
    _admin;
    _instanceId;
    socket;
    /** Latitude from system.config for sun calculations */
    _latitude = null;
    /** Longitude from system.config for sun calculations */
    _longitude = null;
    _defaultHistory = null;
    _imagePrefix;
    _themeType;
    constructor(props) {
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
        // Re-read current values when the connection comes back or the tab becomes visible again.
        // On reconnect the socket-client only re-subscribes; it does not re-fetch current values,
        // so states that changed while the tab was in the background would otherwise stay stale.
        this.socket.registerConnectionHandler(this.onConnectionChanged);
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', this.onVisibilityChange);
        }
    }
    get language() {
        return this._language;
    }
    setLanguage(language) {
        this._language = language;
    }
    get isFloatComma() {
        return this._isFloatComma;
    }
    setFloatComma(isFloatComma) {
        this._isFloatComma = isFloatComma;
    }
    get themeType() {
        return this._themeType;
    }
    get dateFormat() {
        return this._dateFormat;
    }
    setDateFormat(dateFormat) {
        this._dateFormat = dateFormat;
    }
    get admin() {
        return this._admin;
    }
    get instanceId() {
        return this._instanceId;
    }
    setInstanceId(instanceId) {
        this._instanceId = instanceId;
    }
    setDefaultHistory(defaultHistory) {
        this._defaultHistory = defaultHistory;
    }
    get defaultHistory() {
        return this._defaultHistory;
    }
    get longitude() {
        return this._longitude;
    }
    get latitude() {
        return this._latitude;
    }
    setCoordinates(latitude, longitude) {
        this._latitude = latitude;
        this._longitude = longitude;
    }
    get imagePrefix() {
        return this._imagePrefix;
    }
    onStateChange = (id, state) => {
        if (this.subscribedStates[id]) {
            this.states[id] = state || { val: null, ts: Date.now(), ack: true };
            this.subscribedStates[id].forEach(cb => cb(id, this.states[id] || { val: null, ts: Date.now(), ack: true }));
        }
    };
    /**
     * Re-read the current values of all subscribed states and notify their listeners.
     * Needed after a reconnect or when the tab becomes visible again, because the
     * socket-client only re-subscribes on reconnect and never re-fetches current values,
     * so any change that happened while the tab was in the background would be missed.
     */
    refreshAllStates = () => {
        if (this.refreshTimer) {
            return; // already scheduled — reconnect and visibilitychange often fire together
        }
        this.refreshTimer = setTimeout(() => {
            this.refreshTimer = null;
            const ids = Object.keys(this.subscribedStates);
            if (!ids.length || !this.socket.isConnected()) {
                return;
            }
            void this.socket.getStates(ids).then(result => {
                for (const id of ids) {
                    if (!this.subscribedStates[id]) {
                        continue; // unsubscribed while the request was in flight
                    }
                    const state = result?.[id] || { val: null, ts: Date.now(), ack: true };
                    this.states[id] = state;
                    this.subscribedStates[id].forEach(cb => cb(id, state));
                }
            });
        }, 100);
    };
    onConnectionChanged = (connected) => {
        if (connected) {
            this.refreshAllStates();
        }
    };
    onVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            this.refreshAllStates();
        }
    };
    getImagePath(fileName) {
        if (typeof fileName === 'string') {
            if (fileName.startsWith('data:image') || fileName.match(/^https?:\/\//) || fileName.length < 4) {
                return fileName;
            }
            return this._imagePrefix + fileName.replace(/^\//, '');
        }
        return null;
    }
    static extractProperty(obj, property) {
        const parts = property.split('.');
        let current = obj;
        for (const part of parts) {
            if (current[part] === undefined) {
                return '';
            }
            current = current[part];
        }
        return current;
    }
    onObjectChange = (id, obj) => {
        if (this.subscribedObjects[id]) {
            this.objects[id] = obj || { _id: id, common: { name: id } };
            this.objectCache[id] = this.objects[id];
            this.subscribedObjects[id].forEach(item => {
                const parts = item.property.split('.');
                let current = this.objects[id];
                for (const part of parts) {
                    if (current[part] === undefined) {
                        item.cb(id, item.property, '');
                        return undefined;
                    }
                    current = current[part];
                }
                item.cb(id, item.property, StateContext.extractProperty(this.objects[id], item.property));
            });
        }
    };
    // ── Batched getState + subscribeState ────────────────────────────
    flushStates() {
        const ids = this.pendingStateIds.splice(0);
        this.stateFlushTimer = null;
        if (!ids.length) {
            return;
        }
        void this.socket.getStates(ids).then(async (result) => {
            for (const id of ids) {
                this.states[id] = result?.[id] || { val: null, ts: Date.now(), ack: true };
                this.subscribedStates[id]?.forEach(cb => cb(id, this.states[id]));
            }
            await this.socket.subscribeState(ids, this.onStateChange);
        });
    }
    getState(id, handler) {
        if (!this.subscribedStates[id]) {
            this.subscribedStates[id] = [handler];
            this.pendingStateIds.push(id);
            if (!this.stateFlushTimer) {
                this.stateFlushTimer = setTimeout(() => this.flushStates(), BATCH_DELAY);
            }
        }
        else {
            this.subscribedStates[id].push(handler);
            if (this.states[id]) {
                setTimeout(() => handler(id, this.states[id]), 0);
            }
            // else: fetch still in progress — handler will be called when it resolves
        }
    }
    // ── Batched getObject ───────────────────────────────────────────
    flushObjectFetches() {
        const pending = this.pendingObjectFetches.splice(0);
        this.objectFetchTimer = null;
        if (!pending.length) {
            return;
        }
        const ids = pending.map(p => p.id);
        void this.socket
            .getObjectsById(ids)
            .then((result) => {
            for (const { id, resolve, reject } of pending) {
                const obj = result?.[id];
                if (obj) {
                    this.objects[id] = obj;
                    this.objectCache[id] = obj;
                    resolve(obj);
                }
                else {
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
    async getObject(id) {
        if (this.objects[id]) {
            return this.objects[id];
        }
        if (this.objectCache[id]) {
            return this.objectCache[id];
        }
        return new Promise((resolve, reject) => {
            this.pendingObjectFetches.push({ id, resolve, reject });
            if (!this.objectFetchTimer) {
                this.objectFetchTimer = setTimeout(() => this.flushObjectFetches(), BATCH_DELAY);
            }
        });
    }
    // ── Batched getObjectProperty + subscribeObject ─────────────────
    flushObjectProperties() {
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
        const subscribeAll = async () => {
            await this.socket.subscribeObject(ids, this.onObjectChange);
        };
        if (toFetch.length) {
            void this.socket
                .getObjectsById(toFetch)
                .then(async (result) => {
                for (const id of toFetch) {
                    this.onObjectChange(id, result?.[id] || null);
                }
                await subscribeAll();
            });
        }
        else {
            void subscribeAll();
        }
    }
    getObjectProperty(id, property, cb) {
        if (!this.subscribedObjects[id]) {
            this.subscribedObjects[id] = [{ property, cb }];
            if (this.objects[id]) {
                setTimeout(() => this.onObjectChange(id, this.objects[id]), 0);
            }
            else {
                this.pendingObjPropIds.push(id);
                if (!this.objPropTimer) {
                    this.objPropTimer = setTimeout(() => this.flushObjectProperties(), BATCH_DELAY);
                }
            }
        }
        else if (this.objects[id]) {
            setTimeout(() => this.onObjectChange(id, this.objects[id]), 0);
        }
    }
    // ── Remove / unsubscribe ────────────────────────────────────────
    async removeObject(id, cb) {
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
    removeState(id, handler) {
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
    getSocket() {
        return this.socket;
    }
    destroy() {
        this.socket.unregisterConnectionHandler(this.onConnectionChanged);
        if (typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', this.onVisibilityChange);
        }
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
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
//# sourceMappingURL=StateContext.js.map