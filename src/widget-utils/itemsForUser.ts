/**
 * What a user may get of the list of widgets.
 *
 * The backend reads all objects with the rights of the adapter, so whoever asks would get every device, its name,
 * its room and the IDs of its states, also the ones the ACLs of the objects keep from them. This takes out what they
 * could not read with `getObject` themselves. It works on the objects in memory: a device has many states, and asking
 * the database for each of them every time a page opens is a lot of work for a rule that fits in a few lines.
 *
 * These are the ACLs of ioBroker. The rules of the widget GUI (`PERMISSIONS.md`) are something else: they only decide
 * what is shown, and work in the browser.
 *
 * Only type imports here, so that the tests can load this file on its own.
 */

import type { WmResponseItems } from './types/api';

/** Who asks, as far as reading objects is concerned */
export interface ObjectReader {
    user: string;
    groups: string[];
    /** The permission `object.read` of the groups of the user: without it no object can be read at all */
    mayReadObjects: boolean;
}

const ADMIN_USER = 'system.user.admin';
const ADMIN_GROUP = 'system.group.administrator';

/** The read bit of `other` in `acl.object`, one digit further for the group and two for the owner */
const READ_OTHERS = 0x4;
const READ_GROUP = 0x40;
const READ_OWNER = 0x400;

/**
 * Whether this user can read this object. The same rule as in `checkObject` and `checkObjectRights` of the objects
 * database.
 *
 * @param obj the object
 * @param reader who asks
 */
export function canReadObject(obj: Partial<ioBroker.Object> | null | undefined, reader: ObjectReader): boolean {
    if (reader.user === ADMIN_USER || reader.groups.includes(ADMIN_GROUP)) {
        return true;
    }
    if (!reader.mayReadObjects) {
        return false;
    }
    const acl = obj?.acl;
    if (!acl) {
        return true;
    }
    if (acl.owner === reader.user) {
        return !!(acl.object & READ_OWNER);
    }
    if (reader.groups.includes(acl.ownerGroup)) {
        return !!(acl.object & READ_GROUP);
    }
    return !!(acl.object & READ_OTHERS);
}

/**
 * The list without what this user cannot read. Nothing of the given list is changed, because its widgets and their
 * states are the ones the adapter keeps in memory.
 *
 * - A category that cannot be read is gone, and what is in it moves up to the next one that can be read: the name of
 *   the room is what is protected, not the lamp the user may see.
 * - A widget that cannot be read is gone, and so is one that lacks a state it cannot work without.
 * - Of the other states only those remain that can be read.
 * - A category that lost all it had is gone too, unless it is meant to be shown empty.
 *
 * The root has no object and nothing to protect, but without it the GUI has no tree to start from, so it stays.
 *
 * @param items the whole list
 * @param canRead whether the user can read the object with this ID
 */
export function itemsForUser(items: WmResponseItems, canRead: (id: string) => boolean): WmResponseItems {
    const all = new Map(items.categories.map(category => [`${category.id}`, category]));
    const root = items.categories.find(category => !category.parent);
    const isVisible = (id: string): boolean => {
        const category = all.get(id);
        return !!category && (category === root || canRead(id));
    };

    /** The category something in this one is shown in, if this one cannot be read */
    const nextVisible = (parent: string | undefined): string | undefined => {
        const seen = new Set<string>();
        let id = parent;
        while (id !== undefined && all.has(id) && !seen.has(id)) {
            if (isVisible(id)) {
                return id;
            }
            seen.add(id);
            id = all.get(id)?.parent;
        }
        return root ? `${root.id}` : undefined;
    };

    const widgets: WmResponseItems['widgets'] = [];
    for (const widget of items.widgets) {
        if (!canRead(`${widget.id}`)) {
            continue;
        }
        const states = widget.control.states;
        const readable = states.filter(state => !state.id || canRead(state.id));
        const lost = states.filter(state => !readable.includes(state));
        const hasOneOf = readable.some(state => state.id && state.requiredOneOf);
        if (lost.some(state => state.required || (state.requiredOneOf && !hasOneOf))) {
            continue;
        }
        widgets.push({
            ...widget,
            parent: nextVisible(widget.parent),
            control: { ...widget.control, states: readable },
        });
    }

    const hadContent = new Set([...items.categories, ...items.widgets].map(item => item.parent));
    let categories: WmResponseItems['categories'] = items.categories
        .filter(category => isVisible(`${category.id}`))
        .map(category => (category === root ? category : { ...category, parent: nextVisible(category.parent) }));

    let someDeleted: boolean;
    do {
        const inUse = new Set([...categories, ...widgets].map(item => item.parent));
        const before = categories.length;
        categories = categories.filter(category => {
            const custom = category.custom as { showEmpty?: boolean; customWidgets?: unknown[] } | undefined;
            return (
                category === root ||
                inUse.has(`${category.id}`) ||
                !hadContent.has(`${category.id}`) ||
                !!custom?.showEmpty ||
                !!custom?.customWidgets?.length
            );
        });
        someDeleted = categories.length !== before;
    } while (someDeleted);

    return { ...items, categories, widgets };
}
