"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class StateContext {
    socket;
    constructor(socket) {
        this.socket = socket;
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
    getState(id, handler) {
        void id;
        void handler;
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    async getObject(id) {
        void id;
        return undefined;
    }
    getObjectProperty(id, property, cb) {
        void id;
        void property;
        void cb;
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    async removeObject(id, cb) {
        void id;
        void cb;
    }
    removeState(id, handler) {
        void id;
        void handler;
    }
    getImagePath(fileName) {
        void fileName;
        return null;
    }
    getSocket() {
        return this.socket;
    }
    // --- Stub getters for IStateContext properties (replaced at runtime by host) ---
    defaultHistory = null;
    instanceId = '';
    admin = false;
    language = 'en';
    longitude = null;
    latitude = null;
    setCoordinates(latitude, longitude) {
        this.latitude = latitude;
        this.longitude = longitude;
    }
    isFloatComma = false;
    dateFormat = 'DD.MM.YYYY';
    imagePrefix = '../../files/';
    destroy() {
        // stub
    }
}
exports.default = StateContext;
//# sourceMappingURL=StateContext.js.map