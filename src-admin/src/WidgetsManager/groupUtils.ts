import { Types } from '@iobroker/type-detector';

import type { WidgetInfo } from '../../../src/widget-utils';

export interface WidgetGroup {
    id: string;
    name: string;
    collapsed?: boolean;
    widgetIds: string[];
}

const TYPE_TO_GROUP: Partial<Record<Types, string>> = {
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

    [Types.window]: 'openings',
    [Types.door]: 'openings',

    [Types.lock]: 'security',
    [Types.motion]: 'security',
    [Types.floodAlarm]: 'security',
    [Types.fireAlarm]: 'security',

    [Types.temperature]: 'info',
    [Types.humidity]: 'info',
    [Types.illuminance]: 'info',
    [Types.info]: 'info',
    [Types.slider]: 'info',
    [Types.volume]: 'info',
    [Types.volumeGroup]: 'info',
    [Types.location]: 'info',
    [Types.locationOne]: 'info',
    [Types.warning]: 'info',
    [Types.image]: 'info',
    [Types.weatherCurrent]: 'info',
    [Types.weatherForecast]: 'info',
};

const GROUP_ORDER: { id: string; name: string }[] = [
    { id: 'lights', name: 'wm_group_Lights' },
    { id: 'climate', name: 'wm_group_Climate' },
    { id: 'blinds', name: 'wm_group_Blinds' },
    { id: 'openings', name: 'wm_group_Openings' },
    { id: 'security', name: 'wm_group_Security' },
    { id: 'info', name: 'wm_group_Info' },
    { id: 'widgets', name: 'wm_group_Widgets' },
    { id: 'other', name: 'wm_group_Other' },
];

export function autoGroupItems(
    items: Array<{ type: 'category' | 'widget' | 'custom'; id: string; data: unknown }>,
): WidgetGroup[] {
    const buckets: Record<string, string[]> = {};

    for (const item of items) {
        if (item.type === 'category') {
            continue;
        }

        let groupId: string;
        if (item.type === 'custom') {
            groupId = 'widgets';
        } else {
            const widget = item.data as WidgetInfo;
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

export function flattenGroups(groups: WidgetGroup[]): string[] {
    return groups.flatMap(g => g.widgetIds);
}

/** Move a widget from its current group to a target group. Returns a new groups array. */
export function moveWidgetToGroup(groups: WidgetGroup[], widgetId: string, targetGroupId: string): WidgetGroup[] {
    return groups.map(g => {
        const filtered = g.widgetIds.filter(id => id !== widgetId);
        if (g.id === targetGroupId) {
            // Only add if not already present
            return { ...g, widgetIds: filtered.includes(widgetId) ? filtered : [...filtered, widgetId] };
        }
        return filtered.length !== g.widgetIds.length ? { ...g, widgetIds: filtered } : g;
    });
}

/** Find which group a widget currently belongs to. */
export function findWidgetGroup(groups: WidgetGroup[], widgetId: string): string | undefined {
    return groups.find(g => g.widgetIds.includes(widgetId))?.id;
}
