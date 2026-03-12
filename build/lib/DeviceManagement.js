"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dm_utils_1 = require("@iobroker/dm-utils");
const type_detector_1 = __importDefault(require("@iobroker/type-detector"));
const ALIAS = 'alias.';
const LINKEDDEVICES = 'linkeddevices.';
function findMainStateId(device) {
    const state = device.states.find(s => s.id && s.required);
    return state?.id;
}
function getParentId(id) {
    const pos = id.lastIndexOf('.');
    return pos !== -1 ? id.substring(0, pos) : '';
}
/**
 * Create a handler that writes a value to a writable state.
 */
function makeHandler(adapter, writeId) {
    return async (_deviceId, _actionId, value, _context) => {
        await adapter.setForeignStateAsync(writeId, value, false);
        return { val: value, ack: true };
    };
}
/**
 * Create a getStateHandler that reads the current value from a state.
 */
function makeGetStateHandler(adapter, readId, defaultVal = null) {
    return async (_deviceId, _actionId, _context) => {
        const state = await adapter.getForeignStateAsync(readId);
        return state || { val: defaultVal, ack: true };
    };
}
/**
 * Build dm-utils controls from the detected device states.
 * Every writable control gets a handler (writes SET) and getStateHandler (reads ACTUAL or SET).
 * Read-only controls get only getStateHandler.
 */
function buildControls(adapter, device) {
    const controls = [];
    const stateMap = new Map();
    for (const s of device.states) {
        if (s.id) {
            stateMap.set(s.name, s);
        }
    }
    const type = device.type;
    // ── ON/OFF switches ────────────────────────────────────────────
    // light, socket, lock, gate — boolean SET with ACTUAL/ON_ACTUAL feedback
    const setState = stateMap.get('SET');
    if (setState?.id && setState.write) {
        if (type === 'light' || type === 'socket' || type === 'lock' || type === 'gate') {
            const getState = type === 'light' ? stateMap.get('ON_ACTUAL') : stateMap.get('ACTUAL');
            const readId = getState?.id || setState.id;
            controls.push({
                id: 'power',
                type: 'switch',
                stateId: readId,
                label: { en: 'Power', de: 'Strom' },
                handler: makeHandler(adapter, setState.id),
                getStateHandler: makeGetStateHandler(adapter, readId, false),
            });
        }
    }
    // dimmer, ct, hue, cie, rgb*, percentage, volume, volumeGroup — ON_SET or ON switch
    const onSetState = stateMap.get('ON_SET') || stateMap.get('ON');
    if (onSetState?.id && onSetState.write) {
        const onActual = stateMap.get('ON_ACTUAL');
        const readId = onActual?.id || onSetState.id;
        controls.push({
            id: 'power',
            type: 'switch',
            stateId: readId,
            label: { en: 'Power', de: 'Strom' },
            handler: makeHandler(adapter, onSetState.id),
            getStateHandler: makeGetStateHandler(adapter, readId, false),
        });
    }
    // thermostat / airCondition — POWER
    const powerState = stateMap.get('POWER');
    if (powerState?.id && powerState.write) {
        if (!controls.find(c => c.id === 'power')) {
            controls.push({
                id: 'power',
                type: 'switch',
                stateId: powerState.id,
                label: { en: 'Power', de: 'Strom' },
                handler: makeHandler(adapter, powerState.id),
                getStateHandler: makeGetStateHandler(adapter, powerState.id, false),
            });
        }
    }
    // ── Sliders ────────────────────────────────────────────────────
    // dimmer, blind, percentage, etc. — SET (level) with ACTUAL feedback
    if (setState?.id && setState.write) {
        if (type === 'dimmer' ||
            type === 'ct' ||
            type === 'hue' ||
            type === 'cie' ||
            type === 'blind' ||
            type === 'percentage' ||
            type === 'slider') {
            const actualLevel = stateMap.get('ACTUAL');
            const readId = actualLevel?.id || setState.id;
            controls.push({
                id: 'level',
                type: 'slider',
                stateId: readId,
                min: 0,
                max: 100,
                unit: '%',
                label: type === 'blind' ? { en: 'Position', de: 'Position' } : { en: 'Level', de: 'Stufe' },
                handler: makeHandler(adapter, setState.id),
                getStateHandler: makeGetStateHandler(adapter, readId, 0),
            });
        }
    }
    // volume / volumeGroup — SET with ACTUAL feedback
    if (setState?.id && setState.write && (type === 'volume' || type === 'volumeGroup')) {
        const actualVol = stateMap.get('ACTUAL');
        const readId = actualVol?.id || setState.id;
        controls.push({
            id: 'volume',
            type: 'slider',
            stateId: readId,
            min: 0,
            max: 100,
            unit: '%',
            label: { en: 'Volume', de: 'Lautstärke' },
            handler: makeHandler(adapter, setState.id),
            getStateHandler: makeGetStateHandler(adapter, readId, 0),
        });
    }
    // thermostat / airCondition — SET (temperature setpoint) with ACTUAL feedback
    if (setState?.id && setState.write && (type === 'thermostat' || type === 'airCondition')) {
        const actualTemp = stateMap.get('ACTUAL');
        const readId = actualTemp?.id || setState.id;
        controls.push({
            id: 'setpoint',
            type: 'slider',
            stateId: readId,
            min: 5,
            max: 35,
            step: 0.5,
            unit: '°C',
            label: { en: 'Setpoint', de: 'Sollwert' },
            handler: makeHandler(adapter, setState.id),
            getStateHandler: makeGetStateHandler(adapter, readId, 20),
        });
    }
    // DIMMER / BRIGHTNESS state for color devices
    const dimmerState = stateMap.get('DIMMER') || stateMap.get('BRIGHTNESS');
    if (dimmerState?.id && dimmerState.write && !controls.find(c => c.id === 'level')) {
        controls.push({
            id: 'level',
            type: 'slider',
            stateId: dimmerState.id,
            min: 0,
            max: 100,
            unit: '%',
            label: { en: 'Brightness', de: 'Helligkeit' },
            handler: makeHandler(adapter, dimmerState.id),
            getStateHandler: makeGetStateHandler(adapter, dimmerState.id, 0),
        });
    }
    // Color temperature
    const ctState = stateMap.get('TEMPERATURE');
    if (ctState?.id &&
        ctState.write &&
        (type === 'ct' ||
            type === 'hue' ||
            type === 'cie' ||
            type === 'rgb' ||
            type === 'rgbSingle' ||
            type === 'rgbwSingle')) {
        controls.push({
            id: 'colorTemp',
            type: 'slider',
            stateId: ctState.id,
            min: 2700,
            max: 6500,
            unit: 'K',
            label: { en: 'Color temperature', de: 'Farbtemperatur' },
            handler: makeHandler(adapter, ctState.id),
            getStateHandler: makeGetStateHandler(adapter, ctState.id, 4000),
        });
    }
    // ── Color control ──────────────────────────────────────────────
    const rgbState = stateMap.get('RGB') || stateMap.get('RGBW');
    if (rgbState?.id && rgbState.write) {
        controls.push({
            id: 'color',
            type: 'color',
            stateId: rgbState.id,
            label: { en: 'Color', de: 'Farbe' },
            handler: makeHandler(adapter, rgbState.id),
            getStateHandler: makeGetStateHandler(adapter, rgbState.id, '#000000'),
        });
    }
    // ── Mute ───────────────────────────────────────────────────────
    const muteState = stateMap.get('MUTE');
    if (muteState?.id && muteState.write) {
        controls.push({
            id: 'mute',
            type: 'switch',
            stateId: muteState.id,
            label: { en: 'Mute', de: 'Stumm' },
            handler: makeHandler(adapter, muteState.id),
            getStateHandler: makeGetStateHandler(adapter, muteState.id, false),
        });
    }
    // ── Info controls (read-only sensors) ──────────────────────────
    const actualState = stateMap.get('ACTUAL');
    if (actualState?.id) {
        // Sensors: temperature, humidity, door, window, motion, fire, flood
        if (type === 'temperature' ||
            type === 'humidity' ||
            type === 'door' ||
            type === 'window' ||
            type === 'windowTilt' ||
            type === 'motion' ||
            type === 'fireAlarm' ||
            type === 'floodAlarm') {
            let unit;
            let defaultVal = null;
            if (type === 'temperature') {
                unit = '°C';
                defaultVal = 0;
            }
            else if (type === 'humidity') {
                unit = '%';
                defaultVal = 0;
            }
            else {
                defaultVal = false;
            }
            controls.push({
                id: 'value',
                type: 'info',
                stateId: actualState.id,
                unit,
                label: type === 'temperature'
                    ? { en: 'Temperature', de: 'Temperatur' }
                    : type === 'humidity'
                        ? { en: 'Humidity', de: 'Feuchtigkeit' }
                        : type === 'door'
                            ? { en: 'Door', de: 'Tür' }
                            : type === 'window' || type === 'windowTilt'
                                ? { en: 'Window', de: 'Fenster' }
                                : type === 'motion'
                                    ? { en: 'Motion', de: 'Bewegung' }
                                    : type === 'fireAlarm'
                                        ? { en: 'Fire', de: 'Feuer' }
                                        : { en: 'Flood', de: 'Überflutung' },
                getStateHandler: makeGetStateHandler(adapter, actualState.id, defaultVal),
            });
        }
        // Thermostat actual temperature
        if (type === 'thermostat' || type === 'airCondition') {
            controls.push({
                id: 'actualTemp',
                type: 'info',
                stateId: actualState.id,
                unit: '°C',
                label: { en: 'Temperature', de: 'Temperatur' },
                getStateHandler: makeGetStateHandler(adapter, actualState.id, 0),
            });
        }
    }
    // ── Electric power info ────────────────────────────────────────
    const powerInfo = stateMap.get('ELECTRIC_POWER');
    if (powerInfo?.id) {
        controls.push({
            id: 'electricPower',
            type: 'info',
            stateId: powerInfo.id,
            unit: 'W',
            label: { en: 'Power', de: 'Leistung' },
            getStateHandler: makeGetStateHandler(adapter, powerInfo.id, 0),
        });
    }
    // If only one control, the label is redundant — remove it
    if (controls.length === 1) {
        delete controls[0].label;
    }
    return controls;
}
class DevicesDeviceManagement extends dm_utils_1.DeviceManagement {
    detector = new type_detector_1.default();
    objects = {};
    enumIds = [];
    /** IDs collected from enum members only */
    enumMemberIds = [];
    idsInEnums = [];
    /** All detected devices */
    allDevices = [];
    /** Only devices with common.custom[namespace].enabled === true */
    enabledDevices = [];
    loaded = null;
    notifyTimeout = null;
    /** Lazily rebuilt sorted keys cache */
    _sortedKeys = null;
    getInstanceInfo() {
        return {
            apiVersion: 'v3',
            actions: [],
        };
    }
    // ── Sorted keys cache ──────────────────────────────────────────────
    getSortedKeys() {
        this._sortedKeys ||= Object.keys(this.objects).sort();
        return this._sortedKeys;
    }
    invalidateKeys() {
        this._sortedKeys = null;
    }
    // ── Helpers ────────────────────────────────────────────────────────
    /**
     * Resolve the channelId for a detected device (same logic as updateEnumsForOneDevice).
     */
    resolveChannelId(device) {
        const mainStateId = findMainStateId(device);
        if (!mainStateId) {
            device.channelId = '';
            return;
        }
        const statesCount = device.states.filter(s => s.id).length;
        let channelId = mainStateId;
        if (mainStateId.includes('.') &&
            (statesCount > 1 || channelId.startsWith(ALIAS) || channelId.startsWith(LINKEDDEVICES))) {
            channelId = getParentId(mainStateId);
            if (!this.objects[channelId]?.common ||
                (this.objects[channelId].type !== 'channel' &&
                    this.objects[channelId].type !== 'device' &&
                    this.objects[channelId].type !== 'folder')) {
                channelId = mainStateId;
            }
        }
        device.channelId = channelId;
    }
    /**
     * Rebuild enumIds and enumMemberIds by scanning all objects for enums.
     * This is the expensive part — only call when enums actually changed.
     */
    rebuildEnumMemberIds() {
        this.enumIds = [];
        const ids = [];
        for (const [id, obj] of Object.entries(this.objects)) {
            if (obj.type === 'enum') {
                this.enumIds.push(id);
                const members = obj.common?.members;
                if (members) {
                    for (const m of members) {
                        if (!ids.includes(m)) {
                            ids.push(m);
                        }
                    }
                }
            }
        }
        this.enumIds.sort();
        this.enumMemberIds = ids;
    }
    /**
     * Rebuild idsInEnums by adding alias/linkeddevices channels/devices
     * not already covered by enumMemberIds. Cheap — only scans the relevant key range.
     */
    rebuildAliasIds() {
        const ids = [...this.enumMemberIds];
        const keys = this.getSortedKeys();
        const END = `${LINKEDDEVICES}\u9999`;
        for (const key of keys) {
            if (key < ALIAS) {
                continue;
            }
            if (key > END) {
                break;
            }
            if ((key.startsWith(ALIAS) || key.startsWith(LINKEDDEVICES)) && this.objects[key] && !ids.includes(key)) {
                if (this.objects[key].type === 'device') {
                    ids.push(key);
                }
                else if (this.objects[key].type === 'channel') {
                    const parentId = getParentId(key);
                    if (!this.objects[parentId] || !ids.includes(parentId)) {
                        ids.push(key);
                    }
                }
            }
        }
        this.idsInEnums = ids.sort();
    }
    /**
     * Full rebuild of idsInEnums (enum scan + alias scan). Only used for initial load.
     */
    rebuildIdsInEnums() {
        this.rebuildEnumMemberIds();
        this.rebuildAliasIds();
    }
    /**
     * Run ChannelDetector.detect() only for the given IDs. Returns newly detected devices.
     */
    detectForIds(ids) {
        if (!ids.length) {
            return [];
        }
        const keys = this.getSortedKeys();
        const usedIds = [];
        const result = [];
        for (const id of ids) {
            const detected = this.detector.detect({
                id,
                objects: this.objects,
                _usedIdsOptional: usedIds,
                _keysOptional: keys,
                ignoreCache: true,
            });
            if (detected) {
                for (const device of detected) {
                    const d = device;
                    this.resolveChannelId(d);
                    if (d.channelId) {
                        result.push(d);
                    }
                }
            }
        }
        return result;
    }
    /**
     * Remove devices from allDevices whose channelId matches any of the given IDs.
     */
    removeDevicesForChannelIds(channelIds) {
        if (!channelIds.length) {
            return;
        }
        const set = new Set(channelIds);
        this.allDevices = this.allDevices.filter(d => !set.has(d.channelId));
    }
    /**
     * Rebuild enabledDevices from allDevices (cheap, no I/O, no detection).
     * Only devices with common.custom[namespace].enabled === true are included.
     */
    rebuildEnabledDevices() {
        const customKey = this.adapter.namespace;
        this.enabledDevices = this.allDevices.filter(d => d.channelId && this.objects[d.channelId]?.common?.custom?.[customKey]?.enabled);
    }
    /**
     * For a given changed object ID, find the detection IDs (from idsInEnums) that are affected.
     * A state change affects its parent channel/device.
     */
    getAffectedChannelIds(id) {
        // Direct match in idsInEnums
        if (this.idsInEnums.includes(id)) {
            return [id];
        }
        // Parent is a detection ID (state changed under a channel)
        const parentId = getParentId(id);
        if (parentId && this.idsInEnums.includes(parentId)) {
            return [parentId];
        }
        // Grandparent (state under device>channel hierarchy)
        const grandParentId = getParentId(parentId);
        if (grandParentId && this.idsInEnums.includes(grandParentId)) {
            return [grandParentId];
        }
        // Check if any existing device references this ID in its states
        const affected = [];
        for (const device of this.allDevices) {
            if (device.channelId === id || device.states.some(s => s.id === id)) {
                if (!affected.includes(device.channelId)) {
                    affected.push(device.channelId);
                }
            }
        }
        return affected;
    }
    // ── GUI notification ───────────────────────────────────────────────
    /**
     * Debounced GUI notification (100ms) to batch rapid changes.
     */
    scheduleNotify() {
        if (this.notifyTimeout) {
            clearTimeout(this.notifyTimeout);
        }
        this.notifyTimeout = setTimeout(async () => {
            this.notifyTimeout = null;
            try {
                await this.sendCommandToGui({ command: 'all' });
            }
            catch {
                // GUI may not be open — ignore
            }
        }, 100);
    }
    // ── Object change (incremental) ───────────────────────────────────
    objectChange(id, obj) {
        const oldObj = this.objects[id];
        if (!oldObj && !obj) {
            return;
        }
        // Update local cache
        if (obj) {
            this.objects[id] = obj;
        }
        else {
            delete this.objects[id];
        }
        this.invalidateKeys();
        // Case 1: Enum changed — rebuild enum member IDs + alias IDs, detect only the diff
        if (oldObj?.type === 'enum' || obj?.type === 'enum') {
            const oldIds = [...this.idsInEnums];
            this.rebuildEnumMemberIds();
            this.rebuildAliasIds();
            const removed = oldIds.filter(x => !this.idsInEnums.includes(x));
            const added = this.idsInEnums.filter(x => !oldIds.includes(x));
            if (removed.length) {
                this.removeDevicesForChannelIds(removed);
            }
            if (added.length) {
                this.allDevices.push(...this.detectForIds(added));
            }
            this.rebuildEnabledDevices();
            this.scheduleNotify();
            return;
        }
        // Case 2: Object under alias.* or linkeddevices.* — only alias scan needed, enum members unchanged
        if (id.startsWith(ALIAS) || id.startsWith(LINKEDDEVICES)) {
            const oldIds = [...this.idsInEnums];
            this.rebuildAliasIds();
            const affected = this.getAffectedChannelIds(id);
            const removedFromEnums = oldIds.filter(x => !this.idsInEnums.includes(x));
            const addedToEnums = this.idsInEnums.filter(x => !oldIds.includes(x));
            const toRemove = [...new Set([...affected, ...removedFromEnums])];
            this.removeDevicesForChannelIds(toRemove);
            const toDetect = [...new Set([...affected.filter(x => this.idsInEnums.includes(x)), ...addedToEnums])];
            if (toDetect.length) {
                this.allDevices.push(...this.detectForIds(toDetect));
            }
            this.rebuildEnabledDevices();
            this.scheduleNotify();
            return;
        }
        // Case 3: Only the enabled flag changed — just rebuild the filter (no detection)
        const customKey = this.adapter.namespace;
        const oldEnabled = oldObj?.common?.custom?.[customKey]?.enabled;
        const newEnabled = obj?.common?.custom?.[customKey]?.enabled;
        if (oldEnabled !== newEnabled) {
            this.rebuildEnabledDevices();
            this.scheduleNotify();
            return;
        }
        // Case 4: Object referenced by idsInEnums or existing device changed
        const affected = this.getAffectedChannelIds(id);
        if (affected.length) {
            this.removeDevicesForChannelIds(affected);
            if (obj) {
                this.allDevices.push(...this.detectForIds(affected));
            }
            this.rebuildEnabledDevices();
            this.scheduleNotify();
        }
    }
    // ── Initial full detection (called once) ──────────────────────────
    async initialLoad() {
        // Read all objects from DB — only done ONCE
        const res = await this.adapter.getObjectListAsync({ include_docs: true });
        const rows = res?.rows || [];
        for (const row of rows) {
            this.objects[row.doc._id] = row.doc;
        }
        this.invalidateKeys();
        // Build idsInEnums
        this.rebuildIdsInEnums();
        // Detect ALL devices
        this.allDevices = this.detectForIds(this.idsInEnums);
        // Filter enabled
        this.rebuildEnabledDevices();
        // Subscribe to all object changes for incremental updates
        await this.adapter.subscribeForeignObjectsAsync('*');
    }
    // ── loadDevices (called by dm-utils framework) ────────────────────
    async loadDevices(context) {
        if (!this.loaded) {
            this.loaded = this.initialLoad();
        }
        await this.loaded;
        context.setTotalDevices(this.enabledDevices.length);
        for (const device of this.enabledDevices) {
            const obj = this.objects[device.channelId];
            if (!obj) {
                continue;
            }
            const name = typeof obj.common.name === 'object'
                ? obj.common.name[this.adapter.language || 'en'] || obj.common.name.en || device.channelId
                : obj.common.name || device.channelId;
            const icon = obj.common.icon || undefined;
            const color = obj.common.color || undefined;
            const role = 'role' in obj.common ? obj.common.role : undefined;
            const controls = buildControls(this.adapter, device);
            const deviceInfo = {
                id: device.channelId,
                name,
                icon,
                color,
                model: role || device.type || '',
                hasDetails: false,
                actions: [],
                controls,
            };
            context.addDevice(deviceInfo);
        }
    }
}
exports.default = DevicesDeviceManagement;
//# sourceMappingURL=DeviceManagement.js.map