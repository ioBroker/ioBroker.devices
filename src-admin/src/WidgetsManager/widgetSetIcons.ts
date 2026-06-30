import { type Connection } from '@iobroker/adapter-react-v5';

import { resolveTranslated } from './Widgets/Generic';

/** A single selectable icon contributed by an adapter's widget set (issue: widget-set icons). */
export interface WidgetSetIcon {
    /** Adapter that ships the icon (e.g. `nmea`). */
    adapter: string;
    /** Display the name of the icon set (translated), used as the group header. */
    setName: string;
    id: string;
    label: string;
    category?: string;
    /** Ready-to-use value: a base64 data URI (preferred) or a resolved URL. Stored verbatim on select. */
    icon: string;
}

interface IconManifest {
    name?: ioBroker.StringOrTranslated;
    icons?: {
        id: string;
        label?: ioBroker.StringOrTranslated;
        category?: string;
        /** Inline base64 data URI (preferred, self-contained manifest). */
        icon?: string;
        /** Legacy: file path relative to `dm-widgets/` (resolved to a URL when `icon` is absent). */
        file?: string;
    }[];
}

let cache: Promise<WidgetSetIcon[]> | null = null;

/**
 * Discover and load all icon sets contributed by installed adapters. An adapter opts in by declaring
 * `common.deviceWidgets.iconsManifest` (a path under its `admin/dm-widgets`). The manifest is read once
 * per session (cached) and flattened into a list the icon picker can render.
 */
export function loadWidgetSetIcons(
    socket: Connection,
    admin: boolean,
    language: ioBroker.Languages,
): Promise<WidgetSetIcon[]> {
    cache ||= doLoad(socket, admin, language);
    return cache;
}

/** Drop the cache so the next {@link loadWidgetSetIcons} re-scans (e.g. after installing an adapter). */
export function clearWidgetSetIconsCache(): void {
    cache = null;
}

async function doLoad(socket: Connection, admin: boolean, language: ioBroker.Languages): Promise<WidgetSetIcon[]> {
    const result: WidgetSetIcon[] = [];
    let view: Record<string, ioBroker.Object> | undefined;
    try {
        view = await socket.getObjectViewSystem('instance', 'system.adapter.', 'system.adapter.香');
    } catch {
        return result;
    }

    const seen = new Set<string>();
    for (const id of Object.keys(view || {})) {
        const common = view[id]?.common as
            | (ioBroker.InstanceCommon & { deviceWidgets?: ioBroker.DevicesWidgets })
            | undefined;
        // @ts-expect-error fixed in js-controller
        const manifestFile = common?.deviceWidgets?.iconsManifest;
        if (!manifestFile) {
            continue;
        }
        const adapter = id.split('.')[2];
        // The manifest is identical across instances of the same adapter — read it once.
        if (!adapter || seen.has(adapter)) {
            continue;
        }
        seen.add(adapter);

        try {
            const file = await socket.readFile(`${adapter}.admin`, `dm-widgets/${manifestFile}`);
            const content = typeof file === 'string' ? file : (file?.file ?? '');
            if (!content) {
                continue;
            }
            const manifest = JSON.parse(content) as IconManifest;
            const setName = resolveTranslated(manifest.name, language) || adapter;
            for (const ic of manifest.icons || []) {
                let icon = ic.icon;
                if (!icon && ic.file) {
                    // Legacy file-based manifest: resolve to the adapter's served path.
                    icon = admin
                        ? `../../adapter/${adapter}/dm-widgets/${ic.file}`
                        : `../${adapter}.admin/dm-widgets/${ic.file}`;
                }
                if (!icon || !ic.id) {
                    continue;
                }
                result.push({
                    adapter,
                    setName,
                    id: ic.id,
                    label: resolveTranslated(ic.label, language) || ic.id,
                    category: ic.category,
                    icon,
                });
            }
        } catch (e) {
            console.warn(`Cannot load icon set from ${adapter}: ${e as Error}`);
        }
    }

    return result;
}
