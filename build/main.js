"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const adapter_core_1 = require("@iobroker/adapter-core");
const WidgetsManagement_1 = __importDefault(require("./lib/WidgetsManagement"));
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
    }
    unload(cb) {
        //this.deviceManagement?.destroy();
        cb?.();
    }
    async main() {
        this.deviceManagement = new WidgetsManagement_1.default(this, true);
        const systemConfig = await this.getForeignObjectAsync('system.config');
        this.language = systemConfig?.common?.language || 'en';
        this.subscribeForeignObjects('*');
        // Upload one picture to devices.0, so it will be available in the File selector
        try {
            if (!(await this.fileExistsAsync(this.namespace, 'ioBrokerLogo.png'))) {
                const image = (0, node_fs_1.readFileSync)(`${__dirname}/../img/ioBrokerLogo.png`);
                await this.writeFileAsync(this.namespace, 'ioBrokerLogo.png', image);
            }
        }
        catch (error) {
            this.log.error(`Unable to upload default image: ${error}`);
        }
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