"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const adapter_core_1 = require("@iobroker/adapter-core");
const DeviceManagement_1 = __importDefault(require("./lib/DeviceManagement"));
class DevicesAdapter extends adapter_core_1.Adapter {
    deviceManagement = null;
    language = 'en';
    constructor(options = {}) {
        super({
            ...options,
            name: 'devices',
            objectChange: (id, obj) => {
                this.deviceManagement?.objectChange(id, obj);
            },
            ready: () => this.main(),
            unload: cb => this.unload(cb),
        });
        this.deviceManagement = new DeviceManagement_1.default(this);
    }
    unload(cb) {
        //this.deviceManagement?.destroy();
        cb?.();
    }
    async main() {
        const systemConfig = await this.getForeignObjectAsync('system.config');
        this.language = systemConfig?.common?.language || 'en';
    }
}
exports.default = DevicesAdapter;
if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options) => new DevicesAdapter(options);
}
else {
    // otherwise start the instance directly
    (() => new DevicesAdapter())();
}
//# sourceMappingURL=main.js.map