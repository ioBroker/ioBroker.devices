import {
    DeviceManagement,
    type DeviceLoadContext,
    type DeviceInfo,
    type InstanceDetails,
    type ActionContext,
    type DeviceAction,
} from '@iobroker/dm-utils';
import ChannelDetector from '@iobroker/type-detector';
import type { PatternControl } from '@iobroker/type-detector';
import type DevicesAdapter from '../main';

const ALIAS = 'alias.';
const LINKEDDEVICES = 'linkeddevices.';

function findMainStateId(device: PatternControl): string | undefined {
    const state = device.states.find(s => s.id && s.required);
    return state?.id;
}

function getParentId(id: string): string {
    const pos = id.lastIndexOf('.');
    return pos !== -1 ? id.substring(0, pos) : '';
}

export default class DevicesDeviceManagement extends DeviceManagement<DevicesAdapter> {
    private readonly detector = new ChannelDetector();

    protected getInstanceInfo(): InstanceDetails {
        return {
            apiVersion: 'v3',
            actions: [],
        };
    }

    protected async loadDevices(context: DeviceLoadContext<string>): Promise<void> {
        // 1. Read all objects and enums (same as detectDevices in ListDevices.tsx)
        const objects: { [id: string]: ioBroker.Object } = {};

        const res = await this.adapter.getObjectListAsync({ include_docs: true });
        const rows = res?.rows || [];

        const allEnums: Record<string, ioBroker.EnumObject> = {};
        for (let i = 0; i < rows.length; i++) {
            const id = rows[i].doc._id;
            objects[id] = rows[i].doc;
            if (objects[id].type === 'enum') {
                allEnums[id] = objects[id] as ioBroker.EnumObject;
            }
        }
        const enumIDs = Object.keys(allEnums).sort();

        // 2. Collect all IDs from enum members
        const idsInEnums: string[] = [];
        for (const en of enumIDs) {
            const e = allEnums[en];
            if (e?.common?.members) {
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
            if (
                (key.startsWith(ALIAS) || key.startsWith(LINKEDDEVICES)) &&
                objects[key] &&
                !idsInEnums.includes(key)
            ) {
                if (objects[key].type === 'device') {
                    idsInEnums.push(key);
                } else if (objects[key].type === 'channel') {
                    const parentId = getParentId(key);
                    if (!objects[parentId] || !idsInEnums.includes(parentId)) {
                        idsInEnums.push(key);
                    }
                }
            }
        }

        idsInEnums.sort();

        // 4. Detect devices using ChannelDetector (same as updateListItems)
        const _usedIdsOptional: string[] = [];
        const devices: PatternControl[] = [];
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
            if (
                mainStateId.includes('.') &&
                (statesCount > 1 || channelId.startsWith(ALIAS) || channelId.startsWith(LINKEDDEVICES))
            ) {
                channelId = getParentId(mainStateId);
                if (
                    !objects[channelId]?.common ||
                    (objects[channelId].type !== 'channel' &&
                        objects[channelId].type !== 'device' &&
                        objects[channelId].type !== 'folder')
                ) {
                    channelId = mainStateId;
                }
            }

            (device as PatternControl & { channelId: string }).channelId = channelId;
        }

        const customKey = this.adapter.namespace; // 'devices.0'

        // 6. Filter only enabled devices and report them
        const enabledDevices = devices.filter(device => {
            const channelId = (device as PatternControl & { channelId?: string }).channelId;
            return channelId && objects[channelId]?.common?.custom?.[customKey]?.enabled;
        });

        context.setTotalDevices(enabledDevices.length);

        for (const device of enabledDevices) {
            const channelId = (device as PatternControl & { channelId: string }).channelId;
            const obj = objects[channelId];

            const name =
                typeof obj.common.name === 'object'
                    ? obj.common.name[this.adapter.language || 'en'] || obj.common.name.en || channelId
                    : obj.common.name || channelId;

            const icon = obj.common.icon || undefined;
            const color = obj.common.color || undefined;
            const role = 'role' in obj.common ? (obj.common as ioBroker.ChannelCommon).role : undefined;

            const actions: DeviceAction<string>[] = [
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
                    handler: async (_id: string, _context: ActionContext): Promise<{ refresh: 'devices' }> => {
                        await this.setDeviceEnabled(channelId, false);
                        return { refresh: 'devices' };
                    },
                },
            ];

            const deviceInfo: DeviceInfo<string> = {
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
    }

    /**
     * Set the enabled flag in common.custom[namespace] of the given object
     */
    async setDeviceEnabled(id: string, enabled: boolean): Promise<void> {
        const obj = await this.adapter.getForeignObjectAsync(id);
        if (!obj) {
            this.adapter.log.warn(`Cannot find object ${id}`);
            return;
        }
        obj.common.custom = obj.common.custom || {};
        obj.common.custom[this.adapter.namespace] = obj.common.custom[this.adapter.namespace] || {};
        obj.common.custom[this.adapter.namespace].enabled = enabled;
        await this.adapter.setForeignObjectAsync(id, obj);
    }
}
