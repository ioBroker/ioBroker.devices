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
const dm_utils_1 = require("@iobroker/dm-utils");
const type_detector_1 = require("@iobroker/type-detector");
const ALIAS = 'alias.';
const LINKEDDEVICES = 'linkeddevices.';
function findMainStateId(device) {
    const state = device.states.find(s => s.id && s.required);
    return state === null || state === void 0 ? void 0 : state.id;
}
function getParentId(id) {
    const pos = id.lastIndexOf('.');
    return pos !== -1 ? id.substring(0, pos) : '';
}
class DevicesDeviceManagement extends dm_utils_1.DeviceManagement {
    constructor() {
        super(...arguments);
        this.detector = new type_detector_1.default();
    }
    getInstanceInfo() {
        return {
            apiVersion: 'v3',
            actions: [],
        };
    }
    loadDevices(context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            // 1. Read all objects and enums (same as detectDevices in ListDevices.tsx)
            const objects = yield this.adapter.getForeignObjectsAsync('*');
            const enumGroups = yield this.adapter.getEnumsAsync();
            // Flatten enum groups into a single map
            const allEnums = {};
            for (const groupName of Object.keys(enumGroups)) {
                const group = enumGroups[groupName];
                for (const [id, obj] of Object.entries(group)) {
                    allEnums[id] = obj;
                }
            }
            const enumIDs = Object.keys(allEnums).sort();
            // 2. Collect all IDs from enum members
            const idsInEnums = [];
            for (const en of enumIDs) {
                const e = allEnums[en];
                if ((_a = e === null || e === void 0 ? void 0 : e.common) === null || _a === void 0 ? void 0 : _a.members) {
                    for (const id of e.common.members) {
                        if (!idsInEnums.includes(id)) {
                            idsInEnums.push(id);
                        }
                    }
                }
            }
            // 3. Add all alias and linkeddevices channels/devices that are not yet in enums
            const keys = Object.keys(objects).sort();
            const END = `${LINKEDDEVICES}\u9999`;
            for (const key of keys) {
                if (key < ALIAS) {
                    continue;
                }
                if (key > END) {
                    break;
                }
                if ((key.startsWith(ALIAS) || key.startsWith(LINKEDDEVICES)) &&
                    objects[key] &&
                    !idsInEnums.includes(key)) {
                    if (objects[key].type === 'device') {
                        idsInEnums.push(key);
                    }
                    else if (objects[key].type === 'channel') {
                        const parentId = getParentId(key);
                        if (!objects[parentId] || !idsInEnums.includes(parentId)) {
                            idsInEnums.push(key);
                        }
                    }
                }
            }
            idsInEnums.sort();
            // 4. Detect devices using ChannelDetector (same as updateListItems)
            const _usedIdsOptional = [];
            const devices = [];
            for (const id of idsInEnums) {
                const result = this.detector.detect({
                    id,
                    objects,
                    _usedIdsOptional,
                    _keysOptional: keys,
                    ignoreCache: true,
                });
                if (result) {
                    for (const device of result) {
                        devices.push(device);
                    }
                }
            }
            // 5. Determine channelId for each device (same as updateEnumsForOneDevice)
            for (const device of devices) {
                const mainStateId = findMainStateId(device);
                if (!mainStateId) {
                    continue;
                }
                const statesCount = device.states.filter(s => s.id).length;
                let channelId = mainStateId;
                if (mainStateId.includes('.') &&
                    (statesCount > 1 || channelId.startsWith(ALIAS) || channelId.startsWith(LINKEDDEVICES))) {
                    channelId = getParentId(mainStateId);
                    if (!((_b = objects[channelId]) === null || _b === void 0 ? void 0 : _b.common) ||
                        (objects[channelId].type !== 'channel' &&
                            objects[channelId].type !== 'device' &&
                            objects[channelId].type !== 'folder')) {
                        channelId = mainStateId;
                    }
                }
                device.channelId = channelId;
            }
            const customKey = this.adapter.namespace; // 'devices.0'
            // 6. Filter only enabled devices and report them
            const enabledDevices = devices.filter(device => {
                var _a, _b, _c, _d;
                const channelId = device.channelId;
                return channelId && ((_d = (_c = (_b = (_a = objects[channelId]) === null || _a === void 0 ? void 0 : _a.common) === null || _b === void 0 ? void 0 : _b.custom) === null || _c === void 0 ? void 0 : _c[customKey]) === null || _d === void 0 ? void 0 : _d.enabled);
            });
            context.setTotalDevices(enabledDevices.length);
            for (const device of enabledDevices) {
                const channelId = device.channelId;
                const obj = objects[channelId];
                const name = typeof obj.common.name === 'object'
                    ? obj.common.name[this.adapter.language || 'en'] || obj.common.name.en || channelId
                    : obj.common.name || channelId;
                const icon = obj.common.icon || undefined;
                const color = obj.common.color || undefined;
                const role = 'role' in obj.common ? obj.common.role : undefined;
                const actions = [
                    {
                        id: 'disable',
                        icon: 'stop',
                        description: {
                            en: 'Disable device',
                            de: 'Gerät deaktivieren',
                            ru: 'Отключить устройство',
                            pt: 'Desativar dispositivo',
                            nl: 'Apparaat uitschakelen',
                            fr: "Désactiver l'appareil",
                            it: 'Disattiva dispositivo',
                            es: 'Desactivar dispositivo',
                            pl: 'Wyłącz urządzenie',
                            uk: 'Вимкнути пристрій',
                            'zh-cn': '禁用设备',
                        },
                        confirmation: {
                            en: 'Do you really want to disable this device?',
                            de: 'Möchten Sie dieses Gerät wirklich deaktivieren?',
                            ru: 'Вы действительно хотите отключить это устройство?',
                            pt: 'Deseja realmente desativar este dispositivo?',
                            nl: 'Wilt u dit apparaat echt uitschakelen?',
                            fr: 'Voulez-vous vraiment désactiver cet appareil ?',
                            it: 'Vuoi davvero disattivare questo dispositivo?',
                            es: '¿Realmente desea desactivar este dispositivo?',
                            pl: 'Czy naprawdę chcesz wyłączyć to urządzenie?',
                            uk: 'Ви дійсно хочете вимкнути цей пристрій?',
                            'zh-cn': '您确定要禁用此设备吗？',
                        },
                        handler: (_id, _context) => __awaiter(this, void 0, void 0, function* () {
                            yield this.setDeviceEnabled(channelId, false);
                            return { refresh: 'devices' };
                        }),
                    },
                ];
                const deviceInfo = {
                    id: channelId,
                    name,
                    icon,
                    color,
                    enabled: true,
                    model: role || device.type || '',
                    hasDetails: false,
                    actions,
                };
                context.addDevice(deviceInfo);
            }
        });
    }
    /**
     * Set the enabled flag in common.custom[namespace] of the given object
     */
    setDeviceEnabled(id, enabled) {
        return __awaiter(this, void 0, void 0, function* () {
            const obj = yield this.adapter.getForeignObjectAsync(id);
            if (!obj) {
                this.adapter.log.warn(`Cannot find object ${id}`);
                return;
            }
            obj.common.custom = obj.common.custom || {};
            obj.common.custom[this.adapter.namespace] = obj.common.custom[this.adapter.namespace] || {};
            obj.common.custom[this.adapter.namespace].enabled = enabled;
            yield this.adapter.setForeignObjectAsync(id, obj);
        });
    }
}
exports.default = DevicesDeviceManagement;
