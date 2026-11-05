/**
 * The web components of the adapters (`common.webComponents`, contract of `@iobroker/web-components`) as tiles.
 *
 * The backend reports which adapters bring components; where their files are depends on where this page is served
 * from (an admin tab or web), so the URLs are resolved here. The manifests are read once per page - enough for the
 * list of widgets and the settings; a tile imports the module of its component when it is shown
 * (`Widgets/WidgetWebComponent.tsx`).
 */
import type { ConfigItemAny } from '@iobroker/json-config';
import {
    DECORATION_TYPES,
    getDefaultSettings,
    getSettingsGroups,
    getText,
    getSettingTypes,
    getWebComponentSources,
    loadWebComponents,
    toSettings,
    type LoadedWebComponent,
    type WebComponentManifest,
    type WebComponentSettings,
} from '@iobroker/web-components';

import type { CustomWidgetWebComponent, WidgetSettingsBase } from '../../../packages/dm-widgets/src/index';
import type { WmWebComponentInstance } from './protocol/api';

type TileSize = WidgetSettingsBase['size'];

/** The loaded components by tag: a tile that is mounted again draws at once */
const loaded = new Map<string, LoadedWebComponent>();
let loading: Promise<LoadedWebComponent[]> = Promise.resolve([]);
let loadingKey = '';

/**
 * Read the manifests of the components of the adapters; a second call with the same adapters gets the same promise
 *
 * @param instances one instance per adapter, as the backend reports them
 */
export function loadDeviceWebComponents(instances: WmWebComponentInstance[]): Promise<LoadedWebComponent[]> {
    const sources = getWebComponentSources(instances, document.baseURI);
    const key = sources.map(source => source.url).join('\n');
    if (key !== loadingKey) {
        loadingKey = key;
        loading = loadWebComponents(sources).then(list => {
            for (const component of list) {
                loaded.set(component.manifest.tag, component);
            }
            return list;
        });
    }
    return loading;
}

/** The components loaded so far, or being loaded */
export function getDeviceWebComponents(): Promise<LoadedWebComponent[]> {
    return loading;
}

/**
 * A loaded component, if it is loaded already
 *
 * @param tag name of the custom element
 */
export function getLoadedWebComponent(tag: string): LoadedWebComponent | undefined {
    return loaded.get(tag);
}

/** Width of a cell of the grid in px - between its minimum of 135 px and what a wide screen gives it */
const CELL = 160;

/** The tile sizes in cells */
const SIZES: { size: TileSize; columns: number; rows: number }[] = [
    { size: '1x1', columns: 1, rows: 1 },
    { size: '2x0.5', columns: 2, rows: 0.5 },
    { size: '2x1', columns: 2, rows: 1 },
    { size: '2x2', columns: 2, rows: 2 },
];

/**
 * The tile size nearest to the size the component looks best in
 *
 * The tiles of devices have four sizes, measured in cells of the grid, not in px. "Nearest" compares width and
 * height as ratios, so a component twice as wide as a tile counts as far off as one half as wide.
 *
 * @param manifest the manifest of the component
 */
export function getTileSize(manifest: WebComponentManifest): TileSize {
    const width = manifest.size?.width;
    const height = manifest.size?.height;
    if (!width || !height || width <= 0 || height <= 0) {
        return '1x1';
    }
    let best: TileSize = '1x1';
    let bestDistance = Infinity;
    for (const { size, columns, rows } of SIZES) {
        const distance = Math.abs(Math.log(width / (columns * CELL))) + Math.abs(Math.log(height / (rows * CELL)));
        if (distance < bestDistance) {
            best = size;
            bestDistance = distance;
        }
    }
    return best;
}

/**
 * The fields of the component for the settings dialog: all groups in one panel, as the dialog of devices has no
 * tabs for a widget. A group gets a header, so that the fields stay apart.
 *
 * @param manifest the manifest of the component
 * @param reserved names the dialog uses for the tile itself; a setting of the same name cannot be shown
 */
export function getWebComponentConfigItems(
    manifest: WebComponentManifest,
    reserved: string[],
): Record<string, ConfigItemAny> {
    const items: Record<string, ConfigItemAny> = {};
    const groups = getSettingsGroups(manifest);
    for (const { name, label, panel } of groups) {
        if (groups.length > 1 && label) {
            items[`_wcGroup_${name}`] = { type: 'header', text: label, size: 5 };
        }
        for (const [key, setting] of Object.entries(panel.items || {})) {
            if (setting && !reserved.includes(key)) {
                items[key] = setting as ConfigItemAny;
            }
        }
    }
    return items;
}

/**
 * The names of the settings that carry a value
 *
 * @param manifest the manifest of the component
 */
export function getWebComponentValueNames(manifest: WebComponentManifest): string[] {
    const names: string[] = [];
    for (const { panel } of getSettingsGroups(manifest)) {
        for (const [key, setting] of Object.entries(panel.items || {})) {
            if (setting && !DECORATION_TYPES.includes(setting.type)) {
                names.push(key);
            }
        }
    }
    return names;
}

/**
 * What the element gets in `settings`: the defaults of the manifest with what the user set, in the types the
 * manifest declares
 *
 * @param manifest the manifest of the component
 * @param def the tile
 */
export function getElementSettings(
    manifest: WebComponentManifest,
    def: CustomWidgetWebComponent,
): WebComponentSettings {
    return toSettings(getSettingTypes(manifest), { ...getDefaultSettings(manifest), ...(def.wcSettings || {}) });
}

/**
 * The web components the dialog "Add widget" offers: without those whose adapter brings a plugin of the same name,
 * like the "Flow diagram" of flow, which is both. The plugin wins: it is made for devices. Tiles of the component
 * already placed stay as they are.
 *
 * The same name is the name the dialog shows, in the language of the page and without regard to case.
 *
 * @param components - the loaded web components
 * @param adapterWidgets - the plugins, by adapter (`common.deviceWidgets`)
 * @param language - the language of the page
 */
export function withoutComponentsOfPlugins(
    components: LoadedWebComponent[] | undefined,
    adapterWidgets: Record<string, ioBroker.DevicesWidgets> | undefined,
    language: ioBroker.Languages,
): LoadedWebComponent[] | undefined {
    if (!components?.length || !adapterWidgets) {
        return components;
    }
    const key = (adapter: string, name: string): string => `${adapter}
${name.trim().toLowerCase()}`;
    const plugins = new Set<string>();
    for (const [adapter, desc] of Object.entries(adapterWidgets)) {
        for (const comp of desc?.components || []) {
            const name = getText(comp.label, language) || comp.name;
            if (name?.trim()) {
                plugins.add(key(adapter, name));
            }
        }
    }
    const offered = components.filter(
        component =>
            !plugins.has(key(component.adapter, getText(component.manifest.name, language) || component.manifest.tag)),
    );
    return offered.length === components.length ? components : offered;
}
