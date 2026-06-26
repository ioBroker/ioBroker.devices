import { Types } from '@iobroker/type-detector';
const TYPE_TO_GROUP = {
    [Types.socket]: 'lights',
    [Types.light]: 'lights',
    [Types.dimmer]: 'lights',
    [Types.rgbSingle]: 'lights',
    [Types.rgbwSingle]: 'lights',
    [Types.rgb]: 'lights',
    [Types.ct]: 'lights',
    [Types.hue]: 'lights',
    [Types.cie]: 'lights',
    [Types.thermostat]: 'climate',
    [Types.airCondition]: 'climate',
    [Types.blind]: 'blinds',
    [Types.blindButtons]: 'blinds',
    [Types.gate]: 'blinds',
    [Types.window]: 'openings',
    [Types.door]: 'openings',
    [Types.lock]: 'security',
    [Types.motion]: 'security',
    [Types.floodAlarm]: 'security',
    [Types.fireAlarm]: 'security',
    [Types.volume]: 'media',
    [Types.volumeGroup]: 'media',
    [Types.media]: 'media',
    [Types.temperature]: 'info',
    [Types.humidity]: 'info',
    [Types.illuminance]: 'info',
    [Types.info]: 'info',
    [Types.slider]: 'info',
    [Types.location]: 'info',
    [Types.locationOne]: 'info',
    [Types.warning]: 'info',
    [Types.image]: 'info',
    [Types.weatherCurrent]: 'info',
    [Types.weatherForecast]: 'info',
};
export const GROUP_ORDER = [
    { id: 'lights', name: 'wm_group_Lights' },
    { id: 'climate', name: 'wm_group_Climate' },
    { id: 'blinds', name: 'wm_group_Blinds' },
    { id: 'openings', name: 'wm_group_Openings' },
    { id: 'security', name: 'wm_group_Security' },
    { id: 'media', name: 'wm_group_Media' },
    { id: 'info', name: 'wm_group_Info' },
    { id: 'widgets', name: 'wm_group_Widgets' },
    { id: 'other', name: 'wm_group_Other' },
];
export function autoGroupItems(items) {
    const buckets = {};
    for (const item of items) {
        if (item.type === 'category') {
            continue;
        }
        let groupId;
        if (item.type === 'custom') {
            groupId = 'widgets';
        }
        else {
            const widget = item.data;
            groupId = (widget.control?.type && TYPE_TO_GROUP[widget.control.type]) || 'other';
        }
        if (!buckets[groupId]) {
            buckets[groupId] = [];
        }
        buckets[groupId].push(item.id);
    }
    return GROUP_ORDER.filter(g => buckets[g.id]?.length).map(g => ({
        id: g.id,
        name: g.name,
        widgetIds: buckets[g.id],
    }));
}
export function flattenGroups(groups) {
    return groups.flatMap(g => g.widgetIds);
}
/** Move a widget from its current group to a target group. Creates the group if it doesn't exist. Returns a new groups array. */
export function moveWidgetToGroup(groups, widgetId, targetGroupId) {
    const targetExists = groups.some(g => g.id === targetGroupId);
    let result = groups.map(g => {
        const filtered = g.widgetIds.filter(id => id !== widgetId);
        if (g.id === targetGroupId) {
            return { ...g, widgetIds: filtered.includes(widgetId) ? filtered : [...filtered, widgetId] };
        }
        return filtered.length !== g.widgetIds.length ? { ...g, widgetIds: filtered } : g;
    });
    if (!targetExists) {
        // Create the group — insert at the correct position according to GROUP_ORDER
        const groupMeta = GROUP_ORDER.find(g => g.id === targetGroupId);
        const newGroup = {
            id: targetGroupId,
            name: groupMeta?.name || targetGroupId,
            widgetIds: [widgetId],
        };
        const orderIndex = GROUP_ORDER.findIndex(g => g.id === targetGroupId);
        if (orderIndex >= 0) {
            // Find the right insertion point
            let insertAt = result.length;
            for (let i = 0; i < result.length; i++) {
                const existingOrder = GROUP_ORDER.findIndex(g => g.id === result[i].id);
                if (existingOrder > orderIndex) {
                    insertAt = i;
                    break;
                }
            }
            result = [...result.slice(0, insertAt), newGroup, ...result.slice(insertAt)];
        }
        else {
            result.push(newGroup);
        }
    }
    return result;
}
/** Find which group a widget currently belongs to. */
export function findWidgetGroup(groups, widgetId) {
    return groups.find(g => g.widgetIds.includes(widgetId))?.id;
}
// --- Collapsed-state persistence (localStorage, not object) ---
//
// The collapsed/expanded state of widget groups is purely a UI preference and is stored
// per-browser in localStorage. It is not persisted to the ioBroker object so it does not
// sync across devices and does not clutter the object data.
const COLLAPSED_LS_KEY = 'iobroker.devices.groupCollapsed';
function loadCollapsedMap() {
    try {
        const raw = window.localStorage.getItem(COLLAPSED_LS_KEY);
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    }
    catch {
        return {};
    }
}
function saveCollapsedMap(map) {
    try {
        window.localStorage.setItem(COLLAPSED_LS_KEY, JSON.stringify(map));
    }
    catch {
        // ignore quota / unavailable
    }
}
/** Returns the collapsed flag for a given category+group from localStorage. */
export function getGroupCollapsed(categoryId, groupId) {
    const map = loadCollapsedMap();
    return !!map[categoryId]?.[groupId];
}
/** Persists the collapsed flag for a given category+group to localStorage. */
export function setGroupCollapsed(categoryId, groupId, collapsed) {
    const map = loadCollapsedMap();
    if (collapsed) {
        map[categoryId] ||= {};
        map[categoryId][groupId] = true;
    }
    else if (map[categoryId]) {
        delete map[categoryId][groupId];
        if (Object.keys(map[categoryId]).length === 0) {
            delete map[categoryId];
        }
    }
    saveCollapsedMap(map);
}
/** Sets collapsed for all groups in a category at once (e.g. expand-all / collapse-all). */
export function setAllGroupsCollapsed(categoryId, groupIds, collapsed) {
    const map = loadCollapsedMap();
    if (collapsed) {
        map[categoryId] = Object.fromEntries(groupIds.map(id => [id, true]));
    }
    else {
        delete map[categoryId];
    }
    saveCollapsedMap(map);
}
/** Returns a shallow copy of groups with `collapsed` set from localStorage (object value ignored). */
export function applyCollapsedFromStorage(categoryId, groups) {
    const map = loadCollapsedMap();
    const cat = map[categoryId];
    if (!cat) {
        return groups.map(g => (g.collapsed ? { ...g, collapsed: false } : g));
    }
    return groups.map(g => ({ ...g, collapsed: !!cat[g.id] }));
}
/** Strips the `collapsed` field from each group — used before saving to the ioBroker object. */
export function stripCollapsed(groups) {
    if (!groups) {
        return groups;
    }
    return groups.map(({ collapsed: _ignored, ...rest }) => rest);
}
//# sourceMappingURL=groupUtils.js.map