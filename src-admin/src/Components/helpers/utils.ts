import type { PatternControlEx } from '../../types';
import { type AdminConnection, I18n, Utils } from '@iobroker/gui-components';
import type { DetectorState, ExternalDetectorState, PatternControl } from '@iobroker/type-detector';
import { getChannelItems } from './search';

const ROLE_PREFIX_TO_TYPE: Record<string, 'boolean' | 'number'> = {
    button: 'boolean',
    value: 'number',
    level: 'number',
    indicator: 'boolean',
    action: 'boolean',
};

/**
 * `type` is the detection constraint and may be absent or ambiguous; `defaultType` is what the pattern
 * wants the created object to be. Deriving the type from the role prefix alone gets `ERROR` wrong — its
 * role is `indicator.error` but it carries a string.
 */
export function getStateCommonType(
    state: Pick<ExternalDetectorState, 'defaultType' | 'type' | 'defaultRole'>,
): ioBroker.CommonType {
    if (state.defaultType) {
        return state.defaultType;
    }
    if (state.type) {
        return typeof state.type === 'object' ? state.type[0] : state.type;
    }
    return ROLE_PREFIX_TO_TYPE[state.defaultRole?.split('.')[0] || ''] || 'mixed';
}

/**
 * A state is mandatory either on its own (`required`) or as a member of a group of alternatives
 * (`requiredOneOf`, e.g. a thermostat's `SET` / `SET_HEATING` / `SET_COOLING`). Treating only
 * `required` as mandatory leaves types whose every mandatory state sits in a group — `thermostat`
 * and `electricity` — looking as if nothing about them were mandatory at all.
 */
export function isStateRequired(state: Pick<ExternalDetectorState, 'required' | 'requiredOneOf'>): boolean {
    return !!state.required || !!state.requiredOneOf;
}

/**
 * Whether clearing this state's id should keep the state object rather than delete it.
 *
 * A `required` state always stays. A member of a `requiredOneOf` group only has to stay while it is
 * the last one still mapped — the group needs one member, not all of them, so an alternative the
 * user swapped away from should go rather than linger with an empty alias.
 */
export function keepStateWhenCleared(
    state: Pick<ExternalDetectorState, 'name' | 'required' | 'requiredOneOf'>,
    states: Pick<ExternalDetectorState, 'name' | 'requiredOneOf'>[],
    ids: Record<string, string | { read: string; write: string } | undefined>,
): boolean {
    if (state.required) {
        return true;
    }
    if (!state.requiredOneOf) {
        return false;
    }
    const otherMapped = states.some(
        other => other.name !== state.name && other.requiredOneOf === state.requiredOneOf && !!ids[other.name],
    );
    return !otherMapped;
}

/**
 * Pick the states a newly created device should get an object for: every `required` one, plus the
 * first member of each `requiredOneOf` group. Creating every member of a group would give a
 * thermostat three setpoints when the point of the group is that one of them is enough.
 */
export function getStatesToCreate<T extends Pick<ExternalDetectorState, 'required' | 'requiredOneOf' | 'defaultRole'>>(
    states: T[],
): (T & { defaultRole: string })[] {
    const seenGroups = new Set<string>();
    return states.filter((state): state is T & { defaultRole: string } => {
        if (!state.defaultRole) {
            return false;
        }
        if (state.requiredOneOf) {
            if (seenGroups.has(state.requiredOneOf)) {
                return false;
            }
            seenGroups.add(state.requiredOneOf);
            return true;
        }
        return !!state.required;
    });
}

/**
 * A pattern may declare the same state name twice with different types (`airCondition` has SWING as
 * number and as boolean). The detector maps the matched object both onto the entry that really matched
 * and onto the first entry carrying that name, so one object arrives on two entries. Keep the variant
 * whose `defaultRole` is the object's actual role — otherwise the editor shows two rows for one state
 * and they overwrite each other's role and type on save.
 */
function dropDuplicateIdVariants(channelInfo: PatternControlEx, objects: Record<string, ioBroker.Object>): void {
    const groups = new Map<string, DetectorState[]>();
    for (const state of channelInfo.states) {
        if (!state.id) {
            continue;
        }
        const key = `${state.id}\u0000${state.name}`;
        const group = groups.get(key);
        if (group) {
            group.push(state);
        } else {
            groups.set(key, [state]);
        }
    }

    const dropped = new Set<DetectorState>();
    for (const group of groups.values()) {
        if (group.length < 2) {
            continue;
        }
        const role = (objects[group[0].id]?.common as ioBroker.StateCommon | undefined)?.role;
        const keep = group.find(state => state.defaultRole && state.defaultRole === role) || group[0];
        for (const state of group) {
            if (state !== keep) {
                dropped.add(state);
            }
        }
    }

    if (dropped.size) {
        channelInfo.states = channelInfo.states.filter(state => !dropped.has(state));
    }
}

export function renameMultipleEntries(
    channelInfo: PatternControlEx,
    objects: Record<string, ioBroker.Object>,
    language?: ioBroker.Languages,
): void {
    dropDuplicateIdVariants(channelInfo, objects);

    // Rename double names
    const counts: Record<string, number> = {};
    channelInfo.states.forEach(state => {
        counts[state.name] ||= 0;
        counts[state.name]++;
    });

    const double = Object.keys(counts).filter(attr => counts[attr] > 1);
    for (const attr of double) {
        // Rename all but first entry
        let isFirst = 0;
        for (let s = 0; s < channelInfo.states.length; s += 1) {
            if (channelInfo.states[s].name === attr) {
                isFirst++;
                if (isFirst > 1) {
                    const text = (
                        channelInfo.states[s].type ||
                        channelInfo.states[s].defaultRole ||
                        isFirst
                    ).toString();

                    channelInfo.states[s].name = `${attr}_${text.toUpperCase().split('.')[0]}`;
                }
            }
        }
    }

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
    const state = device.states.find(state => state.id && isStateRequired(state));
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

/**
 * Build a valid ioBroker id segment from a free-text (possibly translated) name.
 *
 * Single source of truth for the sanitization that the device manager applies when turning a
 * user-entered name into an object id: drop characters rejected by `Utils.FORBIDDEN_CHARS`, then
 * collapse whitespace and dots to `_`. A dot is a valid id character but acts as a hierarchy
 * separator, so without this a name like "Foo.Bar" would create a nested object path instead of a
 * single channel/folder. Accepts a translated name object as well, so callers don't crash on a
 * multilingual `common.name` value.
 *
 * NOTE: `/` and `:` are also accepted by `FORBIDDEN_CHARS` and not collapsed here, matching the
 * historic behavior of every call site. If we ever want to harden those too, this is now the one
 * place to do it.
 */
export function normalizeName(name: ioBroker.StringOrTranslated | undefined, language?: ioBroker.Languages): string {
    let str: string;
    if (name && typeof name === 'object') {
        str = name[language || I18n.getLanguage()] || name.en || name[Object.keys(name)[0] as ioBroker.Languages] || '';
    } else {
        str = (name as string) || '';
    }
    return str.replace(Utils.FORBIDDEN_CHARS, '_').replace(/\s/g, '_').replace(/\./g, '_');
}

export function getLastPart(id: string): string {
    const pos = id.lastIndexOf('.');
    if (pos !== -1) {
        return id.substring(pos + 1);
    }

    return id;
}

/**
 * Copy display metadata (min/max/unit/step/states) from an aliased *source* state's common into the
 * alias state's common — but only for fields the alias does not define yet, so values edited
 * manually via the "edit state common" dialog are preserved. Fixes issue #22 (aliased states did not
 * inherit e.g. min/max from their source state). Returns true if anything was changed.
 *
 * `states` is the exception to the "only fill what is missing" rule: a freshly created alias already
 * carries the *pattern's* `defaultStates` (for SWING e.g. AUTO/HORIZONTAL/STATIONARY/VERTICAL), so
 * treating them as "already defined" would permanently hide the real value list of a device that
 * uses its own — the widget would then offer options the device does not have (issue #654). The
 * pattern list is a placeholder for an alias without a source; once a source is assigned, its list
 * is the truth.
 *
 * That only holds while the alias forwards values verbatim. With a read/write conversion the alias
 * value range is deliberately a different one, so its own list is kept.
 */
export function inheritCommonFromSource(
    aliasCommon: ioBroker.StateCommon,
    sourceCommon: ioBroker.StateCommon | undefined,
): boolean {
    if (!sourceCommon) {
        return false;
    }
    let changed = false;
    const alias = (aliasCommon as ioBroker.StateCommon & { alias?: { read?: string; write?: string } }).alias;
    const forwardsVerbatim = !alias?.read && !alias?.write;
    if (
        forwardsVerbatim &&
        sourceCommon.states &&
        JSON.stringify(sourceCommon.states) !== JSON.stringify(aliasCommon.states)
    ) {
        aliasCommon.states = sourceCommon.states;
        changed = true;
    }
    if (aliasCommon.min === undefined && sourceCommon.min !== undefined) {
        aliasCommon.min = sourceCommon.min;
        changed = true;
    }
    if (aliasCommon.max === undefined && sourceCommon.max !== undefined) {
        aliasCommon.max = sourceCommon.max;
        changed = true;
    }
    if (!aliasCommon.unit && sourceCommon.unit) {
        aliasCommon.unit = sourceCommon.unit;
        changed = true;
    }
    if (aliasCommon.step === undefined && sourceCommon.step !== undefined) {
        aliasCommon.step = sourceCommon.step;
        changed = true;
    }
    return changed;
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

/**
 * Execute the given object/enum writes one by one.
 *
 * @returns One description per failed write; an empty array means every task succeeded. Callers
 *          that remove a source after a copy must check this — a copy with errors is incomplete,
 *          so deleting the original would lose data.
 */
export async function processTasks(
    tasks: {
        id: string;
        obj: ioBroker.Object;
        enums?: string[];
    }[],
    socket: AdminConnection,
): Promise<string[]> {
    const errors: string[] = [];
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
                        errors.push(`${enumId}: ${e}`);
                    }
                }
            }

            try {
                await socket.setObject(task.id, task.obj);
            } catch (e) {
                window.alert(`Cannot change object: ${e}`);
                errors.push(`${task.id}: ${e}`);
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
                        errors.push(`${enumId}: ${e}`);
                    }
                }
            }
            // Object delete?
        }
    }
    return errors;
}

export function normalizeStates(
    objStates: string | string[] | undefined | null | { [value: string]: string },
): { [value: string]: string } | undefined {
    if (objStates) {
        let states: { [value: string]: string } | undefined;
        if (typeof objStates === 'string') {
            states = {};
            // Old format: 'state1:name1;state2:name2'
            objStates.split(';').forEach(it => {
                const parts = it.split(':');
                states![parts[0].trim()] = parts[1] === undefined ? parts[0].trim() : parts[1].trim();
            });
        } else if (Array.isArray(objStates)) {
            states = {};
            objStates.forEach(it => (states![it] = it));
        } else if (typeof objStates === 'object') {
            states = JSON.parse(JSON.stringify(objStates)) as { [value: string]: string };
        } else {
            console.error(`Invalid States format: ${JSON.stringify(objStates)}`);
        }
        return states;
    }
    return undefined;
}

export function getAddedChannelStates(
    channelInfo: PatternControlEx,
    objects: Record<string, ioBroker.Object>,
): {
    defaultRole?: string;
    id: string;
    noType: boolean;
    name: string;
    type: ioBroker.CommonType;
    write?: boolean;
    indicator: boolean;
    required: boolean;
    states?: { [value: string]: string };
}[] {
    const channelIds: string[] = getChannelItems(objects, channelInfo.channelId);

    // Add states that could not be detected by type-detector
    return channelIds
        .filter(key => !channelInfo.states.find(item => item.id === key) && objects[key].type === 'state')
        .map(key => {
            const objOriginal = objects[key];
            let name: ioBroker.StringOrTranslated = objOriginal?.common?.name;
            if (name && typeof name === 'object') {
                name = name[I18n.getLanguage()] || name.en;
            }
            return {
                defaultRole: objOriginal?.common?.role,
                id: objOriginal?._id,
                noType: true,
                name,
                type: objOriginal?.common?.type,
                write: objOriginal?.common?.write,
                indicator: false,
                required: false,
                states: normalizeStates(objOriginal?.common?.states),
            };
        })
        .filter(item => !channelInfo.states.filter(item => item.defaultRole).find(el => el.name === item.name));
}

/**
 * Decide how to treat `common.custom` / `common.smartName` of a state that is being copied.
 * See the `mode` option of {@link copyDevice}. A `move` keeps everything; only `duplicate` and
 * `import` strip parts of it.
 */
function stripCustomForCopy(common: Record<string, any> | undefined, mode: 'move' | 'duplicate' | 'import'): void {
    if (!common) {
        return;
    }
    if (mode === 'import') {
        delete common.custom;
        delete common.smartName;
    } else if (mode === 'duplicate') {
        delete common.smartName;
        if (common.custom) {
            for (const key of Object.keys(common.custom)) {
                if (common.custom[key]?.smartName !== undefined) {
                    delete common.custom[key].smartName;
                }
            }
        }
    }
    // mode === 'move': keep custom (logging) and smartName — it is the same logical device.
}

/**
 * Copy a device (channel + states) to a new id.
 *
 * @returns One description per failed write; empty = complete copy. Only a complete copy may be
 *          followed by deleting the source.
 */
export async function copyDevice(
    newChannelId: string,
    options: {
        socket: AdminConnection;
        deviceToCopy: PatternControlEx;
        language?: ioBroker.Languages;
        objects: Record<string, ioBroker.Object>;
        channelObj?: ioBroker.FolderObject | ioBroker.ChannelObject | ioBroker.DeviceObject;
        newName?: string;
        /**
         * How to treat `common.custom` of the copied states. Defaults to `'move'`.
         * - `move`: keep everything (same logical device, just relocated) — preserves logging
         *   (history/influxdb/sql) and smartName.
         * - `duplicate`: drop only smartName (so the copy does not share the Alexa/Google name);
         *   keep logging custom.
         * - `import`: drop all custom (a fresh alias from a native source state).
         */
        mode?: 'move' | 'duplicate' | 'import';
        /**
         * Room/function enum membership for the new channel. When omitted, the copied device's
         * existing `rooms`/`functions` are kept. The rename flow passes the values edited in the same
         *  session, so a *deselected* room is dropped on the new channel (the new channel starts with no
         * enum membership, so assigning exactly this set is enough — no separate add/remove needed).
         */
        functions?: string[];
        rooms?: string[];
    },
): Promise<string[]> {
    const language = options.language || I18n.getLanguage();
    const mode = options.mode || 'move';
    // if this is a device not from linkeddevices or from alias
    const deviceToCopy: PatternControlEx = JSON.parse(JSON.stringify(options.deviceToCopy));
    renameMultipleEntries(deviceToCopy, options.objects, language);
    const addedStates = getAddedChannelStates(deviceToCopy, options.objects);

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
            return [`${originalChannelId}: original channel object not found`];
        }
    }

    const { functions, rooms, states, type } = deviceToCopy;
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
                color: originalChannelObj.common.color || undefined,
                desc: originalChannelObj.common.desc,
                role: role?.defaultChannelRole || type,
                icon: originalChannelObj.common.icon || undefined,
            },
            type: 'channel',
            native: originalChannelObj.native || {},
        },
        enums: (options.rooms ?? rooms).concat(options.functions ?? functions),
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

    // Create the channel first and stop when even that fails — the callers must see the copy as
    // failed (and keep the source), and states under a channel that could not be created would
    // only litter the target.
    const channelErrors = await processTasks([newChannelObj], options.socket);
    if (channelErrors.length) {
        return channelErrors;
    }

    // Add a task to create states
    states.forEach(state => {
        if (!state.id) {
            return;
        }
        const obj = JSON.parse(JSON.stringify(options.objects[state.id]));
        obj._id = `${newChannelId}.${state.name}`;

        obj.native ||= {};

        stripCustomForCopy(obj.common, mode);

        if (!isAlias) {
            obj.common.alias = { id: state.id };
        }

        tasks.push({ id: obj._id, obj });
    });

    addedStates.forEach(state => {
        if (!state.id) {
            return;
        }
        const obj = JSON.parse(JSON.stringify(options.objects[state.id]));
        obj._id = `${newChannelId}.${state.name}`;

        obj.native ||= {};

        stripCustomForCopy(obj.common, mode);

        if (!isAlias) {
            obj.common.alias = { id: state.id };
        }

        tasks.push({ id: obj._id, obj });
    });

    return processTasks(tasks, options.socket);
}
