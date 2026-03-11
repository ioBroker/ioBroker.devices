import {
    DeviceManagement,
    type DeviceLoadContext,
    type DeviceInfo,
    type InstanceDetails,
    type ControlBase,
} from '@iobroker/dm-utils';
import ChannelDetector from '@iobroker/type-detector';
import type { PatternControl, DetectorState } from '@iobroker/type-detector';
import type DevicesAdapter from '../main';

const ALIAS = 'alias.';
const LINKEDDEVICES = 'linkeddevices.';

type InternalDevice = PatternControl & { channelId: string };

function findMainStateId(device: PatternControl): string | undefined {
    const state = device.states.find(s => s.id && s.required);
    return state?.id;
}

function getParentId(id: string): string {
    const pos = id.lastIndexOf('.');
    return pos !== -1 ? id.substring(0, pos) : '';
}

/**
 * Build dm-utils controls from the detected device states.
 * Controls use `stateId` so the GUI reads/writes the ioBroker state directly — no handler needed.
 */
function buildControls(device: InternalDevice): ControlBase[] {
    const controls: ControlBase[] = [];
    const stateMap = new Map<string, DetectorState>();

    for (const s of device.states) {
        if (s.id) {
            stateMap.set(s.name, s);
        }
    }

    const type = device.type;

    // ── ON/OFF switches ────────────────────────────────────────────
    // light, socket, lock, gate — boolean SET
    const setState = stateMap.get('SET');
    if (setState?.id && setState.write) {
        if (type === 'light' || type === 'socket' || type === 'lock' || type === 'gate') {
            controls.push({
                id: 'power',
                type: 'switch',
                stateId: setState.id,
                label: { en: 'Power', de: 'Strom' },
            });
        }
    }

    // dimmer, ct, hue, cie, rgb*, percentage, volume, volumeGroup — ON_SET or ON switch
    const onSetState = stateMap.get('ON_SET') || stateMap.get('ON');
    if (onSetState?.id && onSetState.write) {
        controls.push({
            id: 'power',
            type: 'switch',
            stateId: onSetState.id,
            label: { en: 'Power', de: 'Strom' },
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
            });
        }
    }

    // ── Sliders ────────────────────────────────────────────────────
    // dimmer — SET (level)
    if (setState?.id && setState.write) {
        if (
            type === 'dimmer' ||
            type === 'ct' ||
            type === 'hue' ||
            type === 'cie' ||
            type === 'blind' ||
            type === 'percentage' ||
            type === 'slider'
        ) {
            controls.push({
                id: 'level',
                type: 'slider',
                stateId: setState.id,
                min: 0,
                max: 100,
                unit: '%',
                label: type === 'blind' ? { en: 'Position', de: 'Position' } : { en: 'Level', de: 'Stufe' },
            });
        }
    }

    // volume / volumeGroup — SET (volume level)
    if (setState?.id && setState.write && (type === 'volume' || type === 'volumeGroup')) {
        controls.push({
            id: 'volume',
            type: 'slider',
            stateId: setState.id,
            min: 0,
            max: 100,
            unit: '%',
            label: { en: 'Volume', de: 'Lautstärke' },
        });
    }

    // thermostat / airCondition — SET (temperature setpoint)
    if (setState?.id && setState.write && (type === 'thermostat' || type === 'airCondition')) {
        controls.push({
            id: 'setpoint',
            type: 'slider',
            stateId: setState.id,
            min: 5,
            max: 35,
            step: 0.5,
            unit: '°C',
            label: { en: 'Setpoint', de: 'Sollwert' },
        });
    }

    // DIMMER state for color devices
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
        });
    }

    // Color temperature
    const ctState = stateMap.get('TEMPERATURE');
    if (
        ctState?.id &&
        ctState.write &&
        (type === 'ct' ||
            type === 'hue' ||
            type === 'cie' ||
            type === 'rgb' ||
            type === 'rgbSingle' ||
            type === 'rgbwSingle')
    ) {
        controls.push({
            id: 'colorTemp',
            type: 'slider',
            stateId: ctState.id,
            min: 2700,
            max: 6500,
            unit: 'K',
            label: { en: 'Color temperature', de: 'Farbtemperatur' },
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
        });
    }

    // ── Info controls (read-only sensors) ──────────────────────────
    const actualState = stateMap.get('ACTUAL');
    if (actualState?.id) {
        // Sensors: temperature, humidity, door, window, motion, fire, flood
        if (
            type === 'temperature' ||
            type === 'humidity' ||
            type === 'door' ||
            type === 'window' ||
            type === 'windowTilt' ||
            type === 'motion' ||
            type === 'fireAlarm' ||
            type === 'floodAlarm'
        ) {
            let unit: string | undefined;
            if (type === 'temperature') {
                unit = '°C';
            } else if (type === 'humidity') {
                unit = '%';
            }
            controls.push({
                id: 'value',
                type: 'info',
                stateId: actualState.id,
                unit,
                label:
                    type === 'temperature'
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
            });
        }

        // Thermostat actual temperature
        if ((type === 'thermostat' || type === 'airCondition') && actualState.id) {
            controls.push({
                id: 'actualTemp',
                type: 'info',
                stateId: actualState.id,
                unit: '°C',
                label: { en: 'Temperature', de: 'Temperatur' },
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
        });
    }

    // If only one control, the label is redundant — remove it
    if (controls.length === 1) {
        delete controls[0].label;
    }

    return controls;
}

export default class DevicesDeviceManagement extends DeviceManagement<DevicesAdapter> {
    private readonly detector = new ChannelDetector();
    private objects: Record<string, ioBroker.Object> = {};
    private enumIds: string[] = [];
    /** IDs collected from enum members only */
    private enumMemberIds: string[] = [];
    private idsInEnums: string[] = [];
    /** All detected devices */
    private allDevices: InternalDevice[] = [];
    /** Only devices with common.custom[namespace].enabled === true */
    private enabledDevices: InternalDevice[] = [];
    private loaded: Promise<void> | null = null;
    private notifyTimeout: ReturnType<typeof setTimeout> | null = null;
    /** Lazily rebuilt sorted keys cache */
    private _sortedKeys: string[] | null = null;

    protected getInstanceInfo(): InstanceDetails {
        return {
            apiVersion: 'v3',
            actions: [],
        };
    }

    // ── Sorted keys cache ──────────────────────────────────────────────

    private getSortedKeys(): string[] {
        this._sortedKeys ||= Object.keys(this.objects).sort();
        return this._sortedKeys;
    }

    private invalidateKeys(): void {
        this._sortedKeys = null;
    }

    // ── Helpers ────────────────────────────────────────────────────────

    /**
     * Resolve the channelId for a detected device (same logic as updateEnumsForOneDevice).
     */
    private resolveChannelId(device: InternalDevice): void {
        const mainStateId = findMainStateId(device);
        if (!mainStateId) {
            device.channelId = '';
            return;
        }

        const statesCount = device.states.filter(s => s.id).length;
        let channelId = mainStateId;
        if (
            mainStateId.includes('.') &&
            (statesCount > 1 || channelId.startsWith(ALIAS) || channelId.startsWith(LINKEDDEVICES))
        ) {
            channelId = getParentId(mainStateId);
            if (
                !this.objects[channelId]?.common ||
                (this.objects[channelId].type !== 'channel' &&
                    this.objects[channelId].type !== 'device' &&
                    this.objects[channelId].type !== 'folder')
            ) {
                channelId = mainStateId;
            }
        }

        device.channelId = channelId;
    }

    /**
     * Rebuild enumIds and enumMemberIds by scanning all objects for enums.
     * This is the expensive part — only call when enums actually changed.
     */
    private rebuildEnumMemberIds(): void {
        this.enumIds = [];
        const ids: string[] = [];

        for (const [id, obj] of Object.entries(this.objects)) {
            if (obj.type === 'enum') {
                this.enumIds.push(id);
                const members = (obj as ioBroker.EnumObject).common?.members;
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
    private rebuildAliasIds(): void {
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
                } else if (this.objects[key].type === 'channel') {
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
    private rebuildIdsInEnums(): void {
        this.rebuildEnumMemberIds();
        this.rebuildAliasIds();
    }

    /**
     * Run ChannelDetector.detect() only for the given IDs. Returns newly detected devices.
     */
    private detectForIds(ids: string[]): InternalDevice[] {
        if (!ids.length) {
            return [];
        }
        const keys = this.getSortedKeys();
        const usedIds: string[] = [];
        const result: InternalDevice[] = [];

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
                    const d = device as InternalDevice;
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
    private removeDevicesForChannelIds(channelIds: string[]): void {
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
    private rebuildEnabledDevices(): void {
        const customKey = this.adapter.namespace;
        this.enabledDevices = this.allDevices.filter(
            d => d.channelId && this.objects[d.channelId]?.common?.custom?.[customKey]?.enabled,
        );
    }

    /**
     * For a given changed object ID, find the detection IDs (from idsInEnums) that are affected.
     * A state change affects its parent channel/device.
     */
    private getAffectedChannelIds(id: string): string[] {
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
        const affected: string[] = [];
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
    private scheduleNotify(): void {
        if (this.notifyTimeout) {
            clearTimeout(this.notifyTimeout);
        }
        this.notifyTimeout = setTimeout(async () => {
            this.notifyTimeout = null;
            try {
                await this.sendCommandToGui({ command: 'all' });
            } catch {
                // GUI may not be open — ignore
            }
        }, 100);
    }

    // ── Object change (incremental) ───────────────────────────────────

    public objectChange(id: string, obj: ioBroker.Object | null | undefined): void {
        const oldObj = this.objects[id];
        if (!oldObj && !obj) {
            return;
        }

        // Update local cache
        if (obj) {
            this.objects[id] = obj;
        } else {
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

    private async initialLoad(): Promise<void> {
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

    protected async loadDevices(context: DeviceLoadContext<string>): Promise<void> {
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

            const name =
                typeof obj.common.name === 'object'
                    ? obj.common.name[this.adapter.language || 'en'] || obj.common.name.en || device.channelId
                    : obj.common.name || device.channelId;

            const icon = obj.common.icon || undefined;
            const color = obj.common.color || undefined;
            const role = 'role' in obj.common ? (obj.common as ioBroker.ChannelCommon).role : undefined;

            const controls = buildControls(device);

            const deviceInfo: DeviceInfo<string> = {
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
