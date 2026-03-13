import ChannelDetector, { type PatternControl } from '@iobroker/type-detector';
import type DevicesAdapter from '../main';
import { WidgetsManagement } from '../widget-utils';

const ROOT_CATEGORY = '__root__';
const ALIAS = 'alias.';
const ALIAS_MAX = 'alias.0.\u9999';
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

export default class DevicesWidgetsManagement extends WidgetsManagement<DevicesAdapter> {
    private readonly detector = new ChannelDetector();
    private objects: Record<string, ioBroker.Object> = {};
    private enumIds: string[] = [];
    /** IDs collected from enum members only */
    private enumMemberIds: string[] = [];
    private idsInEnums: string[] = [];
    /** All detected devices */
    private allDevices: InternalDevice[] = [];
    /** Only devices with `common.custom[namespace].enabled === true` */
    private enabledDevices: InternalDevice[] = [];
    private loaded: Promise<void> | null = null;
    private notifyTimeout: ReturnType<typeof setTimeout> | null = null;
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

        const categories = Object.keys(structure).filter(key => structure[key].length);
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
     * Only devices with `common.custom[namespace].enabled === true` are included.
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

    protected async loadItems(): Promise<void> {
        if (!this.loaded) {
            this.loaded = this.initialLoad();
        }
        await this.loaded;
        this.widgets = new Map();

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

            const parentId = getParentId(device.channelId);
            // delete all empty states
            for (let i = device.states.length - 1; i >= 0; i--) {
                // delete empty lines
                if (!device.states[i].id) {
                    device.states.splice(i, 1);
                    continue;
                }
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
            this.widgets.set(device.channelId, {
                type: 'widget',
                id: device.channelId,
                name,
                icon,
                color,
                parent: parentId && parentId !== 'alias.0' ? parentId : undefined,
                control: {
                    type: device.type,
                    states: device.states,
                },
            });
        }

        let someDeleted = false;
        do {
            someDeleted = false;
            // Fo through all categories and remove the empty one (except root)
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
                    this.categories?.delete(id);
                }
            });
        } while (someDeleted);
    }
}
