/**
 * Dynamic loader for federated widget plugins using @module-federation/runtime.
 *
 * Each adapter that provides widgets exposes a federation remote entry URL.
 * We use registerRemotes / loadRemote from the MF runtime to load components.
 */
import { registerRemotes, loadRemote, init } from '@module-federation/runtime';

import React from 'react';
import * as IconsMaterial from '@mui/icons-material';
import * as AdapterReact from '@iobroker/adapter-react-v5';
import * as DmWidgets from './Widgets/Generic';
import StateContext from './StateContext';

type WidgetComponent = React.ComponentType<Record<string, unknown>>;

// Initialize Module Federation runtime with shared dependencies.
// Plugin widgets receive these from the host — they must NOT bundle them.
init({
    name: 'iobroker_devices',
    shared: {
        react: {
            lib: () => React,
            version: '*',
        },
        '@iobroker/adapter-react-v5': {
            lib: () => AdapterReact,
            version: '*',
        },
        '@mui/icons-material': {
            lib: () => IconsMaterial,
            version: '*',
        },
        '@iobroker/dm-widgets': {
            lib: () => ({ ...DmWidgets, StateContext }),
            version: '*',
        },
    },
    remotes: [],
});

/** In-flight load promises keyed by "url!module" for deduplication */
const runningLoads: Record<string, Promise<{ default: Record<string, WidgetComponent> }>> = {};

/** Cache of already-resolved components */
const componentCache = new Map<string, WidgetComponent>();

/**
 * Load a widget component from a remote plugin.
 *
 * @param url        Remote entry URL (e.g. "/adapter/my-adapter/remoteEntry.js")
 * @param adapterName  Unique scope name for the remote (adapter name)
 * @param componentName Component name exported from the remote module
 */
export async function loadPluginComponent(
    url: string,
    adapterName: string,
    componentName: string,
): Promise<WidgetComponent> {
    const cacheKey = `${adapterName}/${componentName}`;
    const cached = componentCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    // adapterName is also the federation scope / unique remote name
    const uniqueName = adapterName.replace(/[^a-zA-Z0-9_]/g, '_');
    const loadKey = `${url}!${componentName}`;

    let setPromise = runningLoads[loadKey];
    if (!(setPromise instanceof Promise)) {
        try {
            registerRemotes([
                {
                    name: uniqueName,
                    entry: url,
                },
            ]);
            setPromise = loadRemote(`${uniqueName}/${componentName}`) as Promise<{
                default: Record<string, WidgetComponent>;
            }>;
            runningLoads[loadKey] = setPromise;
        } catch (error) {
            throw new Error(`Cannot register remote "${adapterName}" from ${url}: ${error}`);
        }
    }

    const module = await setPromise;
    const Component: WidgetComponent = module?.default
        ? (module.default as unknown as WidgetComponent)
        : (module as unknown as WidgetComponent);

    if (!Component) {
        throw new Error(`Plugin component "${componentName}" not found from adapter "${adapterName}" (url: ${url})`);
    }

    componentCache.set(cacheKey, Component);
    return Component;
}

/** Check if a plugin component is already loaded (cached) */
export function isPluginLoaded(adapterName: string, componentName: string): boolean {
    return componentCache.has(`${adapterName}/${componentName}`);
}
