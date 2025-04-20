import type { PatternControlEx } from '../../types';
import { type AdminConnection, I18n, Utils } from '@iobroker/adapter-react-v5';
import type { PatternControl } from '@iobroker/type-detector';

export function renameMultipleEntries(
    channelInfo: PatternControlEx,
    objects: Record<string, ioBroker.Object>,
    language?: ioBroker.Languages,
): void {
    // find if any multiple entries found
    const entries = channelInfo.states.filter(item => item.multiple && item.id);
    if (!entries.length) {
        return;
    }

    // Rename multiple entries to variable names
    entries.forEach(item => {
        const obj = objects[item.id];
        if (obj?.common?.name) {
            let name = obj.common.name;
            if (typeof name === 'object') {
                name =
                    name[language || I18n.getLanguage()] ||
                    name.en ||
                    name[Object.keys(name)[0] as ioBroker.Languages] ||
                    '';
            }
            // make valid name
            name = name.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_');
            item.name = name;
        } else if (obj?._id) {
            item.name = obj._id.split('.').pop() || '';
        }
    });
}

export function getSmartName(
    obj: ioBroker.StateObject,
    iotNoCommon: boolean,
    iotInstance: string,
    language?: ioBroker.Languages,
): string {
    language ||= I18n.getLanguage();
    let smartName;
    if (obj?.common?.custom) {
        if (iotNoCommon) {
            const iot = iotInstance || 'iot.0';
            if (obj.common.custom[iot]?.smartName) {
                smartName = obj.common.custom[iot].smartName;
            }
        } else {
            smartName = obj.common.smartName;
        }
    }

    if (smartName && typeof smartName === 'object') {
        smartName = smartName[language] || smartName.en || '';
    }
    return smartName || '';
}

export function setSmartName(
    obj: ioBroker.StateObject | ioBroker.ChannelObject,
    newSmartName: string | false | undefined,
    iotNoCommon: boolean,
    iotInstance: string,
    language?: ioBroker.Languages,
): void {
    // set smartName
    language ||= I18n.getLanguage();
    if (newSmartName || newSmartName === false) {
        if (iotNoCommon) {
            const iot = iotInstance || 'iot.0';
            obj.common.custom ||= {};
            obj.common.custom[iot] ||= {};
            if (!newSmartName) {
                obj.common.custom[iot].smartName = false;
            } else {
                obj.common.custom[iot].smartName ||= {};
                obj.common.custom[iot].smartName[language] = newSmartName;
            }
        } else {
            const common: ioBroker.StateCommon = obj.common as ioBroker.StateCommon;
            if (!newSmartName) {
                common.smartName = false;
            } else if (common.smartName && typeof common.smartName === 'object') {
                common.smartName[language] = newSmartName;
            } else {
                common.smartName = {};
                common.smartName[language] = newSmartName;
            }
        }
    } else {
        // remove smartName completely
        if (iotNoCommon) {
            const iot = iotInstance || 'iot.0';
            if (obj.common.custom?.[iot]?.smartName) {
                delete obj.common.custom[iot].smartName[language];
            } else if (obj.common.custom?.[iot]?.smartName === false) {
                delete obj.common.custom[iot].smartName;
            }
            if (obj.common.custom?.[iot]) {
                if (Object.keys(obj.common.custom[iot]).length === 0) {
                    // It will be deleted by js-controller
                    obj.common.custom[iot] = null;
                }
            }
        } else {
            const common: ioBroker.StateCommon = obj.common as ioBroker.StateCommon;
            if (common.smartName && typeof common.smartName === 'object') {
                common.smartName[language] = '';
                if (Object.keys(common.smartName).length === 0) {
                    // It will be deleted by js-controller
                    common.smartName = null; // just delete smartName: false setting from common.
                }
            } else {
                common.smartName = null; // just delete smartName: false setting from common.
            }
        }
    }
}

export function findMainStateId(device: PatternControl): string | undefined {
    const state = device.states.find(state => state.id && state.required);
    if (!state) {
        return undefined;
    }
    return state.id;
}

export function getParentId(id: string): string {
    const pos = id.lastIndexOf('.');
    if (pos !== -1) {
        return id.substring(0, pos);
    }
    return '';
}

export function getLastPart(id: string): string {
    const pos = id.lastIndexOf('.');
    if (pos !== -1) {
        return id.substring(pos + 1);
    }

    return id;
}

async function addToEnum(enumId: string, id: string, socket: AdminConnection): Promise<void> {
    const obj: ioBroker.EnumObject | null | undefined = (await socket.getObject(enumId)) as
        | ioBroker.EnumObject
        | null
        | undefined;

    if (obj?.common) {
        obj.common.members ||= [];
        if (!obj.common.members.includes(id)) {
            obj.common.members.push(id);
            obj.common.members.sort();
            return socket.setObject(enumId, obj);
        }
    }
}

async function removeFromEnum(enumId: string, id: string, socket: AdminConnection): Promise<void> {
    const obj: ioBroker.EnumObject | null | undefined = (await socket.getObject(enumId)) as
        | ioBroker.EnumObject
        | null
        | undefined;

    if (obj?.common?.members) {
        const pos = obj.common.members.indexOf(id);
        if (pos !== -1) {
            obj.common.members.splice(pos, 1);
            await socket.setObject(enumId, obj);
        }
    }
}

export async function processTasks(
    tasks: {
        id: string;
        obj: ioBroker.Object;
        enums?: string[];
    }[],
    socket: AdminConnection,
): Promise<void> {
    for (let t = 0; t < tasks.length; t++) {
        const task = tasks[t];

        if (task.obj) {
            if (task.enums) {
                for (let i = 0; i < task.enums.length; i++) {
                    const enumId = task.enums[i];
                    try {
                        await addToEnum(enumId, task.id, socket);
                    } catch (e) {
                        window.alert(`Cannot change enum: ${e}`);
                    }
                }
            }

            try {
                await socket.setObject(task.id, task.obj);
            } catch (e) {
                window.alert(`Cannot change object: ${e}`);
            }
        } else {
            // delete
            if (task.enums) {
                for (let i = 0; i < task.enums.length; i++) {
                    const enumId = task.enums[i];
                    try {
                        await removeFromEnum(enumId, task.id, socket);
                    } catch (e) {
                        window.alert(`Cannot change enum: ${e}`);
                    }
                }
            }
            // Object delete ?
        }
    }
}

export async function copyDevice(
    newChannelId: string,
    options: {
        socket: AdminConnection;
        deviceToCopy: PatternControlEx;
        language?: ioBroker.Languages;
        objects: Record<string, ioBroker.Object>;
        channelObj?: ioBroker.FolderObject | ioBroker.ChannelObject | ioBroker.DeviceObject;
        newName?: string;
    },
): Promise<void> {
    const language = options.language || I18n.getLanguage();
    // if this is a device not from linkeddevices or from alias
    const deviceToCopy: PatternControlEx = JSON.parse(JSON.stringify(options.deviceToCopy));
    renameMultipleEntries(deviceToCopy, options.objects, language);

    const originalChannelId = deviceToCopy.channelId;
    const isAlias = originalChannelId.startsWith('alias.') || originalChannelId.startsWith('linkeddevices.');

    let originalChannelObj: ioBroker.FolderObject | ioBroker.ChannelObject | ioBroker.DeviceObject = options.objects[
        originalChannelId
    ] as ioBroker.FolderObject | ioBroker.ChannelObject | ioBroker.DeviceObject;

    if (!originalChannelObj?.common) {
        if (options.channelObj) {
            originalChannelObj = options.channelObj;
        } else {
            console.error(`Cannot find original channel object ${originalChannelId}`);
            return;
        }
    }

    const { functions, rooms, icon, states, color, type } = deviceToCopy;
    const tasks: {
        id: string;
        obj: ioBroker.Object;
        enums?: string[];
    }[] = [];

    const role = deviceToCopy.states.find(item => item.defaultChannelRole);

    // Channel object
    const newChannelObj: {
        id: string;
        obj: ioBroker.Object;
        enums?: string[];
    } = {
        id: newChannelId,
        obj: {
            _id: newChannelId,
            common: {
                name: options.newName
                    ? ({ [language]: options.newName } as ioBroker.StringOrTranslated)
                    : originalChannelObj.common.name,
                color: color || undefined,
                desc: originalChannelObj.common.desc,
                role: role?.defaultChannelRole || type,
                icon: (icon?.startsWith('adapter/') ? `../../${icon}` : icon) || undefined,
            },
            type: 'channel',
            native: originalChannelObj.native || {},
        },
        enums: rooms.concat(functions),
    };

    if (!newChannelObj.obj.common.color) {
        delete newChannelObj.obj.common.color;
    }

    if (!newChannelObj.obj.common.icon) {
        delete newChannelObj.obj.common.icon;
    }

    if (!isAlias) {
        newChannelObj.obj.native.originalId = originalChannelId;
    }

    // Add a task to create a channel
    tasks.push(newChannelObj);

    // Add a task to create states
    states.forEach(state => {
        if (!state.id) {
            return;
        }
        const obj = JSON.parse(JSON.stringify(options.objects[state.id]));
        obj._id = `${newChannelId}.${state.name}`;

        obj.native ||= {};

        if (obj?.common?.custom) {
            delete obj.common.custom;
        }

        if (obj?.common?.smartName) {
            delete obj.common.smartName;
        }

        if (!isAlias) {
            obj.common.alias = { id: state.id };
        }

        tasks.push({ id: obj._id, obj });
    });

    await processTasks(tasks, options.socket);
}
