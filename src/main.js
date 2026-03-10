"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const adapter_core_1 = require("@iobroker/adapter-core");
const DeviceManagement_1 = require("./lib/DeviceManagement");
class DevicesAdapter extends adapter_core_1.Adapter {
    constructor(options = {}) {
        super(Object.assign(Object.assign({}, options), { name: 'devices', ready: () => this.main(), unload: cb => this.unload(cb) }));
        this.deviceManagement = null;
        this.language = 'en';
        this.deviceManagement = new DeviceManagement_1.default(this);
    }
    unload(cb) {
        //this.deviceManagement?.destroy();
        cb === null || cb === void 0 ? void 0 : cb();
    }
    main() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const systemConfig = yield this.getForeignObjectAsync('system.config');
            this.language = ((_a = systemConfig === null || systemConfig === void 0 ? void 0 : systemConfig.common) === null || _a === void 0 ? void 0 : _a.language) || 'en';
        });
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
