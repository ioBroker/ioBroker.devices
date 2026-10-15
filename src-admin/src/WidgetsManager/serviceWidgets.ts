/**
 * Which background services of plugins the app runs, and with which widgets.
 *
 * Pure logic with type-only imports, like `acl.ts`, so `test/serviceWidgets.test.js` can load it without React or
 * the bundler. The component that renders the services is `PluginServices.tsx`.
 */
import type { AclLevel, CustomWidgetBase, CustomWidgetPlugin, WmAcl } from '../../../packages/dm-widgets/src/types';

/** The part of `common.deviceWidgets` this needs; `services` is not in its typings yet (ioBroker.js-controller#3555) */
export interface PluginDescription {
    /** File of the `Components` module, relative to `admin/dm-widgets`. Default is customDevices.js */
    url?: string;
    /** Names of the background services in the `Components` module */
    services?: string[];
}

/** The custom widgets of the categories, as the app keeps them */
export type CustomWidgetsByCategory = Record<string, { customWidgets?: CustomWidgetBase[] } | undefined>;

/** A background service to run */
export interface PluginService {
    adapter: string;
    /** The `Components` module, relative to `admin/dm-widgets` */
    url: string;
    /** Name of the service in the `Components` module */
    name: string;
}

function isPluginOf(widget: CustomWidgetBase, adapter: string): widget is CustomWidgetPlugin {
    return widget.type === 'plugin' && (widget as CustomWidgetPlugin).pluginAdapter === adapter;
}

/**
 * The services of the adapters that have widgets in the categories - an adapter without them has nothing to do, like
 * a widget set in vis-2 that the project does not use.
 *
 * @param adapterWidgets - `common.deviceWidgets` of the adapters
 * @param categorySettings - the settings of the categories with their custom widgets
 * @returns The services in the order of the adapters
 */
export function getPluginServices(
    adapterWidgets: Record<string, PluginDescription | undefined>,
    categorySettings: CustomWidgetsByCategory,
): PluginService[] {
    const used = new Set<string>();
    for (const settings of Object.values(categorySettings)) {
        for (const widget of settings?.customWidgets || []) {
            if (widget.type === 'plugin' && (widget as CustomWidgetPlugin).pluginAdapter) {
                used.add((widget as CustomWidgetPlugin).pluginAdapter!);
            }
        }
    }

    const result: PluginService[] = [];
    for (const [adapter, description] of Object.entries(adapterWidgets)) {
        if (!used.has(adapter) || !Array.isArray(description?.services)) {
            continue;
        }
        for (const name of description.services) {
            if (typeof name === 'string' && name) {
                result.push({ adapter, url: description.url || 'customDevices.js', name });
            }
        }
    }
    return result;
}

/**
 * The widgets a service gets: the plugin widgets of its adapter in all categories that the user may control. A hidden
 * widget is left out, and so is a read-only one - a phone that cannot be answered must not ring.
 *
 * @param categorySettings - the settings of the categories with their custom widgets
 * @param adapter - the adapter of the service
 * @param widgetLevel - the level of a widget for the user, see `AclResolver.widgetLevel`
 * @param virtualCategories - categories that only show widgets of others, like the favourites
 */
export function getServiceWidgets(
    categorySettings: CustomWidgetsByCategory,
    adapter: string,
    widgetLevel: (acl: WmAcl | undefined, categoryId: string | undefined) => AclLevel,
    virtualCategories: string[] = [],
): CustomWidgetPlugin[] {
    const result: CustomWidgetPlugin[] = [];
    const seen = new Set<string>();
    for (const [categoryId, settings] of Object.entries(categorySettings)) {
        if (virtualCategories.includes(categoryId)) {
            continue;
        }
        for (const widget of settings?.customWidgets || []) {
            if (!isPluginOf(widget, adapter) || seen.has(widget.id)) {
                continue;
            }
            if (widgetLevel(widget.acl, categoryId) === 'control') {
                seen.add(widget.id);
                result.push(widget);
            }
        }
    }
    return result;
}

/**
 * The category a widget is placed in, e.g. to show the one of a phone that is ringing
 *
 * @param categorySettings - the settings of the categories with their custom widgets
 * @param widgetId - id of the custom widget
 * @param virtualCategories - categories that only show widgets of others, like the favourites
 */
export function findWidgetCategory(
    categorySettings: CustomWidgetsByCategory,
    widgetId: string,
    virtualCategories: string[] = [],
): string | null {
    for (const [categoryId, settings] of Object.entries(categorySettings)) {
        if (!virtualCategories.includes(categoryId) && settings?.customWidgets?.some(w => w.id === widgetId)) {
            return categoryId;
        }
    }
    return null;
}
