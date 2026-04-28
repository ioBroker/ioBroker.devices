import ChannelDetector, { type PatternControl, type DetectorState, type Types } from '@iobroker/type-detector';
import type DevicesAdapter from '../main';
import { WidgetsManagement } from '../widget-utils';

const ROOT_CATEGORY = '__root__';
const ALIAS = 'alias.';
const ALIAS_MAX = 'alias.0.\u9999';
const LINKEDDEVICES = 'linkeddevices.';

export interface DevicesDetectorState extends DetectorState {
    id: string;
    stateRole?: string;
}

export interface DevicesPatternControl {
    states: DevicesDetectorState[];
    type: Types;
    storeId: string;
    parentId: string;
    deviceId: string;
    channelId: string;
}

function findMainStateId(device: PatternControl): string | undefined {
    const state = device.states.find(s => s.id && s.required);
    return state?.id;
}

function getParentId(id: string): string {
    const pos = id.lastIndexOf('.');
    return pos !== -1 ? id.substring(0, pos) : '';
}

export default class DevicesWidgetsManagement extends WidgetsManagement<DevicesAdapter> {
    private readonly detector = new ChannelDetector();
    private objects: Record<string, ioBroker.Object> = {};
    private enumIds: string[] = [];
    /** IDs collected from enum members only */
    private enumMemberIds: string[] = [];
    private idsInEnums: string[] = [];
    /** All detected devices */
    private allDevices: DevicesPatternControl[] = [];
    /** Only devices with `common.custom[namespace].enabled === true` */
    private enabledDevices: DevicesPatternControl[] = [];
    private loaded: Promise<void> | null = null;
    private notifyTimeout: ReturnType<typeof setTimeout> | null = null;
    private invalidatedIds: string[] = [];
    /** Lazily rebuilt sorted keys cache */
    private _sortedKeys: string[] | null = null;

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
    private resolveChannelId(device: DevicesPatternControl): void {
        const mainStateId = findMainStateId(device);
        if (!mainStateId) {
            device.storeId = '';
            return;
        }
        const statesCount = device.states.filter(state => state.id).length;
        let storeId = mainStateId;
        if (
            mainStateId.includes('.') &&
            (statesCount > 1 || storeId.startsWith(ALIAS) || storeId.startsWith(LINKEDDEVICES))
        ) {
            storeId = getParentId(mainStateId);
            if (
                !this.objects[storeId]?.common ||
                (this.objects[storeId].type !== 'channel' &&
                    this.objects[storeId].type !== 'device' &&
                    this.objects[storeId].type !== 'folder')
            ) {
                storeId = mainStateId;
            }
        }

        device.storeId = storeId;

        const channelId = getParentId(storeId);
        if (
            this.objects[channelId]?.common &&
            (this.objects[channelId].type === 'device' || this.objects[channelId].type === 'channel')
        ) {
            device.channelId = channelId;
            if (this.objects[channelId].type === 'channel') {
                const deviceId = getParentId(channelId);
                if (this.objects[deviceId]?.type === 'device') {
                    device.deviceId = deviceId;
                }
            }
        } else {
            device.channelId = storeId;
        }
    }

    /**
     * Rebuild enumIds and enumMemberIds by scanning all objects for enums.
     * This is the expensive part — only call when enums are actually changed.
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

    private rebuildCategories(): void {
        const structure: { [category: string]: string[] } = {
            [ROOT_CATEGORY]: [],
        };

        const keys = this.getSortedKeys();
        for (const key of keys) {
            if (key < ALIAS) {
                continue;
            }
            if (key > ALIAS_MAX) {
                break;
            }
            if (!this.objects[key]) {
                return;
            }
            if (this.objects[key].type === 'folder') {
                structure[key] ||= [];
                const parent = getParentId(key);
                if (this.objects[parent]?.type === 'folder' || parent === 'alias.0') {
                    if (parent === 'alias.0') {
                        structure[ROOT_CATEGORY].push(key);
                    } else {
                        structure[parent] ||= [];
                        structure[parent].push(key);
                    }
                }
            } else if (this.objects[key].type === 'device' || this.objects[key].type === 'channel') {
                // get parent
                const parent = getParentId(key);
                if (this.objects[parent]?.type === 'folder' || parent === 'alias.0') {
                    if (parent === 'alias.0') {
                        structure[ROOT_CATEGORY].push(key);
                    } else {
                        structure[parent] ||= [];
                        structure[parent].push(key);
                    }
                }
            }
        }

        this.categories = new Map();

        const categories = Object.keys(structure).filter(key => {
            if (structure[key].length) {
                return true;
            }
            // Include empty folders marked with showEmpty, or that hold plugin/custom widgets
            if (key !== ROOT_CATEGORY && this.objects[key]) {
                const custom = (this.objects[key].common as Record<string, unknown>)?.custom as
                    | Record<string, Record<string, unknown>>
                    | undefined;
                if (
                    custom &&
                    Object.values(custom).some(
                        c => c?.showEmpty || (Array.isArray(c?.customWidgets) && c.customWidgets.length > 0),
                    )
                ) {
                    return true;
                }
            }
            return false;
        });
        for (const category of categories) {
            const parentId = category === ROOT_CATEGORY ? '' : getParentId(category);
            this.categories.set(category, {
                type: 'category',
                id: category,
                name: this.objects[category]
                    ? this.objects[category].common.name || category.split('.').pop() || ''
                    : '',
                icon: this.objects[category] ? this.objects[category].common.icon : undefined,
                color: this.objects[category] ? this.objects[category].common.color : undefined,
                parent: category === ROOT_CATEGORY ? undefined : parentId !== 'alias.0' ? parentId : ROOT_CATEGORY,
                custom:
                    category !== ROOT_CATEGORY && this.objects[category]
                        ? this.objects[category].common.custom?.[this.adapter.namespace]
                        : undefined,
            });
        }
        // Remove all orphan categories
        for (const [id, category] of this.categories) {
            if (category.parent && !this.categories.has(category.parent)) {
                this.categories.delete(id);
            }
        }
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
        this.rebuildCategories();
    }

    /**
     * Run ChannelDetector.detect() only for the given IDs. Returns newly detected devices.
     */
    private detectForIds(ids: string[]): DevicesPatternControl[] {
        if (!ids.length) {
            return [];
        }
        const keys = this.getSortedKeys();
        const usedIds: string[] = [];
        const result: DevicesPatternControl[] = [];

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
                    const d = device as DevicesPatternControl;
                    this.resolveChannelId(d);
                    if (d.storeId) {
                        result.push(d);
                        break; // ignore "smaller" devices
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
        this.allDevices = this.allDevices.filter(d => !set.has(d.storeId));
    }

    private findIdInEnums(lookForId: string): string {
        // Try to find room to which this device belongs to
        let useEnum = '';
        for (const enumId of this.enumIds) {
            if (enumId.startsWith('enum.rooms.')) {
                const enumObj: ioBroker.EnumObject = this.objects[enumId] as ioBroker.EnumObject;
                if (
                    enumObj?.common?.members?.includes(lookForId) ||
                    enumObj?.common?.members?.find(id => id.startsWith(`${lookForId}.`))
                ) {
                    useEnum = enumId;
                }
            }
        }
        if (!useEnum) {
            for (const enumId of this.enumIds) {
                if (enumId.startsWith('enum.functions.')) {
                    const enumObj: ioBroker.EnumObject = this.objects[enumId] as ioBroker.EnumObject;
                    if (
                        enumObj?.common?.members?.includes(lookForId) ||
                        enumObj?.common?.members?.find(id => id.startsWith(`${lookForId}.`))
                    ) {
                        useEnum = enumId;
                    }
                }
            }
        }

        if (!useEnum) {
            for (const enumId of this.enumIds) {
                const enumObj: ioBroker.EnumObject = this.objects[enumId] as ioBroker.EnumObject;
                if (
                    enumObj?.common?.members?.includes(lookForId) ||
                    enumObj?.common?.members?.find(id => id.startsWith(`${lookForId}.`))
                ) {
                    useEnum = enumId;
                }
            }
        }
        return useEnum;
    }

    /**
     * Rebuild enabledDevices from allDevices (cheap, no I/O, no detection).
     * Only devices with `common.custom[namespace].enabled === true` are included.
     */
    private rebuildEnabledDevices(): boolean {
        const customKey = this.adapter.namespace;
        const oldEnabledDevices = JSON.stringify(this.enabledDevices);
        this.enabledDevices = this.allDevices.filter(
            d => d.storeId && this.objects[d.storeId]?.common?.custom?.[customKey]?.enabled,
        );

        // Special case: the devices not from alias.0
        for (const device of this.enabledDevices) {
            // try to find a parent category
            let parentId = getParentId(device.storeId);
            if (parentId && this.categories?.has(parentId)) {
                device.parentId = parentId;
                continue;
            }
            if (parentId.startsWith(ALIAS) || parentId.startsWith(LINKEDDEVICES)) {
                device.parentId = parentId;
                let parentCategoryId = getParentId(parentId);
                // Create virtual category
                this.categories?.set(parentId, {
                    type: 'category',
                    id: parentId,
                    name: this.objects[parentId]
                        ? this.objects[parentId].common.name || parentId.split('.').pop() || ''
                        : '',
                    icon: this.objects[parentId] ? this.objects[parentId].common.icon : undefined,
                    color: this.objects[parentId] ? this.objects[parentId].common.color : undefined,
                    parent: parentCategoryId === 'alias.0' ? ROOT_CATEGORY : parentCategoryId,
                    custom: this.objects[parentId]?.common.custom?.[this.adapter.namespace],
                });
                parentId = parentCategoryId;
                parentCategoryId = getParentId(parentId);
                while (parentId !== 'alias.0' && parentId && !this.categories?.has(parentId)) {
                    // Create virtual category
                    this.categories?.set(parentId, {
                        type: 'category',
                        id: parentId,
                        name: this.objects[parentId]
                            ? this.objects[parentId].common.name || parentId.split('.').pop() || ''
                            : '',
                        icon: this.objects[parentId] ? this.objects[parentId].common.icon : undefined,
                        color: this.objects[parentId] ? this.objects[parentId].common.color : undefined,
                        parent: parentCategoryId === 'alias.0' ? ROOT_CATEGORY : parentCategoryId,
                        custom: this.objects[parentId]?.common.custom?.[this.adapter.namespace],
                    });
                    parentId = parentCategoryId;
                    parentCategoryId = getParentId(parentId);
                }
            } else {
                // Try to find room to which this device belongs to
                let useEnum = this.findIdInEnums(device.storeId);
                useEnum ||= this.findIdInEnums(device.channelId);
                useEnum ||= this.findIdInEnums(device.deviceId);
                if (useEnum) {
                    device.parentId = useEnum;
                    let parentCategoryId = getParentId(useEnum);
                    // if no parent category, assign to root
                    this.categories?.set(useEnum, {
                        type: 'category',
                        id: useEnum,
                        name: this.objects[useEnum]
                            ? this.objects[useEnum].common.name || useEnum.split('.').pop() || ''
                            : '',
                        icon: this.objects[useEnum] ? this.objects[useEnum].common.icon : undefined,
                        color: this.objects[useEnum] ? this.objects[useEnum].common.color : undefined,
                        parent: parentCategoryId.split('.').length > 2 ? parentCategoryId : ROOT_CATEGORY,
                        custom: this.objects[useEnum]?.common.custom?.[this.adapter.namespace],
                    });
                    parentId = parentCategoryId;
                    parentCategoryId = getParentId(parentId);
                    while (parentId.split('.').length > 2 && parentId && !this.categories?.has(parentId)) {
                        // Create virtual category
                        this.categories?.set(parentId, {
                            type: 'category',
                            id: parentId,
                            name: this.objects[parentId]
                                ? this.objects[parentId].common.name || parentId.split('.').pop() || ''
                                : '',
                            icon: this.objects[parentId] ? this.objects[parentId].common.icon : undefined,
                            color: this.objects[parentId] ? this.objects[parentId].common.color : undefined,
                            parent: parentCategoryId.split('.').length > 2 ? parentCategoryId : ROOT_CATEGORY,
                            custom: this.objects[parentId]?.common.custom?.[this.adapter.namespace],
                        });
                        parentId = parentCategoryId;
                        parentCategoryId = getParentId(parentId);
                    }
                } else {
                    this.adapter.log.warn(`Cannot find parent for "${device.storeId}"!`);
                }
            }
        }

        return JSON.stringify(this.enabledDevices) !== oldEnabledDevices;
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
            if (device.storeId === id || device.states.some(s => s.id === id)) {
                if (!affected.includes(device.storeId)) {
                    affected.push(device.storeId);
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
            this.adapter.log.debug(`Update objects because of: ${this.invalidatedIds.join(', ')}`);
            this.invalidatedIds = [];
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
            // We must compare only common part
            if (JSON.stringify(obj.common) !== JSON.stringify(this.objects[id]?.common)) {
                this.objects[id] = obj;
            }
        } else {
            delete this.objects[id];
        }
        this.invalidateKeys();

        // Case 1: Enum changed — rebuild enum member IDs + alias IDs, detect only the diff
        if (oldObj?.type === 'enum' || obj?.type === 'enum' || obj?.type === 'folder' || oldObj?.type === 'folder') {
            const oldIds = [...this.idsInEnums];
            this.rebuildEnumMemberIds();
            if (obj?.type === 'folder' || oldObj?.type === 'folder') {
                this.rebuildCategories();
            }
            this.rebuildAliasIds();

            const removed = oldIds.filter(x => !this.idsInEnums.includes(x));
            const added = this.idsInEnums.filter(x => !oldIds.includes(x));

            if (removed.length) {
                this.removeDevicesForChannelIds(removed);
            }
            if (added.length) {
                this.allDevices.push(...this.detectForIds(added));
            }

            if (this.rebuildEnabledDevices()) {
                if (!this.invalidatedIds.includes(id)) {
                    this.invalidatedIds.push(id);
                }
                this.scheduleNotify();
            }
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

            if (this.rebuildEnabledDevices()) {
                if (!this.invalidatedIds.includes(id)) {
                    this.invalidatedIds.push(id);
                }
                this.scheduleNotify();
            }
            return;
        }

        // Case 3: Only the enabled flag changed — just rebuild the filter (no detection)
        const customKey = this.adapter.namespace;
        const oldEnabled = oldObj?.common?.custom?.[customKey]?.enabled;
        const newEnabled = obj?.common?.custom?.[customKey]?.enabled;
        if (oldEnabled !== newEnabled) {
            if (this.rebuildEnabledDevices()) {
                if (!this.invalidatedIds.includes(id)) {
                    this.invalidatedIds.push(id);
                }
                this.scheduleNotify();
            }
            return;
        }

        // Case 4: Object referenced by idsInEnums or existing device changed
        const affected = this.getAffectedChannelIds(id);
        if (affected.length) {
            this.removeDevicesForChannelIds(affected);
            if (obj) {
                this.allDevices.push(...this.detectForIds(affected));
            }
            if (this.rebuildEnabledDevices()) {
                if (!this.invalidatedIds.includes(id)) {
                    this.invalidatedIds.push(id);
                }
                this.scheduleNotify();
            }
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

    protected async loadItems(): Promise<void> {
        if (!this.loaded) {
            this.loaded = this.initialLoad();
        }
        await this.loaded;
        this.widgets = new Map();

        for (const device of this.enabledDevices) {
            const obj = this.objects[device.storeId];
            if (!obj) {
                continue;
            }

            const name =
                typeof obj.common.name === 'object'
                    ? obj.common.name[this.adapter.language || 'en'] || obj.common.name.en || device.storeId
                    : obj.common.name || device.storeId;

            const icon = obj.common.icon || undefined;
            const color = obj.common.color || undefined;

            // delete all empty states
            for (let i = device.states.length - 1; i >= 0; i--) {
                // delete empty lines
                if (!device.states[i].id) {
                    device.states.splice(i, 1);
                    continue;
                }
                // We must deliver role, as in some widgets it is used to determine the widget type
                device.states[i].stateRole = this.objects[device.states[i].id]?.common?.role;
                /** Remove useless for GUI information */
                if (device.states[i].original) {
                    delete device.states[i].original;
                }
                if (device.states[i].role) {
                    delete device.states[i].role;
                }
                if (device.states[i].channelRole) {
                    delete device.states[i].channelRole;
                }
                if (device.states[i].ignoreRole) {
                    delete device.states[i].ignoreRole;
                }
                if (device.states[i].statesDefined) {
                    delete device.states[i].statesDefined;
                }
                if (device.states[i].searchInParent) {
                    delete device.states[i].searchInParent;
                }
                if (device.states[i].enums) {
                    delete device.states[i].enums;
                }
                if (device.states[i].noDeviceDetection) {
                    delete device.states[i].noDeviceDetection;
                }
                if (device.states[i].multiple) {
                    delete device.states[i].multiple;
                }
                if (device.states[i].stateName) {
                    delete device.states[i].stateName;
                }
                if (device.states[i].objectType) {
                    delete device.states[i].objectType;
                }
                if (device.states[i].state) {
                    delete device.states[i].state;
                }
            }

            // Support of categories only in aliases.
            const customData = obj.common.custom?.[this.adapter.namespace];
            this.widgets.set(device.storeId, {
                type: 'widget',
                id: device.storeId,
                name,
                icon,
                color,
                parent: customData?.parent || device.parentId,
                control: {
                    type: device.type,
                    states: device.states,
                    storeId: '',
                    parentId: '',
                    deviceId: '',
                    channelId: '',
                },
                custom: obj.common.custom?.[this.adapter.namespace],
            });
        }

        let someDeleted = false;
        do {
            someDeleted = false;
            // go through all categories and remove the empty one (except root)
            this.categories?.forEach((category, id) => {
                if (id === ROOT_CATEGORY) {
                    return;
                }
                let empty = true;
                this.widgets?.forEach(widget => {
                    if (widget.parent === id) {
                        empty = false;
                        return;
                    }
                });
                this.categories?.forEach(c => {
                    if (c.parent === id) {
                        empty = false;
                        return;
                    }
                });
                if (empty) {
                    // Keep categories marked with showEmpty in custom settings,
                    // or that contain plugin / custom widgets.
                    const obj = this.objects[id];
                    const custom = (obj?.common as Record<string, unknown>)?.custom as
                        | Record<string, Record<string, unknown>>
                        | undefined;
                    const keep =
                        custom &&
                        Object.values(custom).some(
                            c => c?.showEmpty || (Array.isArray(c?.customWidgets) && c.customWidgets.length > 0),
                        );
                    if (!keep) {
                        this.categories?.delete(id);
                    }
                }
            });
        } while (someDeleted);
    }
}
