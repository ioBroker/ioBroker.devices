/**
 * Dynamic loader for federated widget plugins using \@module-federation/runtime.
 *
 * Each adapter that provides widgets exposes a federation remote entry URL.
 * We use registerRemotes / loadRemote from the MF runtime to load components.
 */
import React from 'react';
import * as ReactDOM from 'react-dom';
import * as IconsMaterial from '@mui/icons-material';
import * as MuiMaterial from '@mui/material';
import moment from 'moment/min/moment-with-locales';
import { registerRemotes, loadRemote, createInstance } from '@module-federation/runtime';

import * as AdapterReact from '@iobroker/adapter-react-v5';
import type { ConfigItemPanel, ConfigItemTabs } from '@iobroker/json-config';
import type WidgetGeneric from '../../../packages/dm-widgets/src/index';

import * as DmWidgets from './Widgets/Generic';
import StateContext from './StateContext';
type WidgetComponent = typeof WidgetGeneric<any, any>;

// Expose the real modules on window so plugins can access them
// even if MF shared module resolution fails.
(window as any).__iobrokerDmWidgets__ = { ...DmWidgets, StateContext };
(window as any).__iobrokerShared__ = {
    react: React,
    'react-dom': ReactDOM,
    '@mui/material': MuiMaterial,
    '@mui/icons-material': IconsMaterial,
    '@iobroker/adapter-react-v5': AdapterReact,
    moment,
};

// Initialize Module Federation runtime for loading remote plugin widgets.
// Shared modules are provided via window.__iobrokerShared__ (not MF sharing)
// to avoid proxy wrapping issues in production builds.
createInstance({
    name: 'iobroker_devices',
    shared: {},
    remotes: [],
});

// Debug: verify single React instance
console.log(
    '[MF] Host React version:',
    React.version,
    '| React identity:',
    (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED ? 'OK' : 'MISSING INTERNALS',
);

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
 * @param admin Is called from admin or from web
 */
export async function loadPluginComponent(
    url: string,
    adapterName: string,
    componentName: string,
    admin: boolean,
): Promise<WidgetComponent> {
    const cacheKey = `${adapterName}/${componentName}`;
    const cached = componentCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    // adapterName is also the federation scope / unique remote name
    const uniqueName = adapterName.replace(/[^a-zA-Z0-9_]/g, '_');
    // Always load the "Components" module — it's the standard exposed entry point.
    // Individual components are picked from its default export by name.
    const loadKey = `${adapterName}!Components`;

    let setPromise = runningLoads[loadKey];
    if (!(setPromise instanceof Promise)) {
        try {
            registerRemotes([
                {
                    name: uniqueName,
                    entry: admin
                        ? `../adapter/${adapterName}/dm-widgets/${url}`
                        : `../${adapterName}.admin/dm-widgets/${url}`,
                    type: 'module',
                },
            ]);
            setPromise = // load translations
                (
                    loadRemote(`${uniqueName}/translations`) as Promise<{
                        default: {
                            [lang in ioBroker.Languages]?: Record<string, string>;
                        };
                    }>
                )
                    .then(translations => AdapterReact.I18n.extendTranslations(translations.default))
                    .catch(error => console.error(`Cannot load translations for ${uniqueName}: ${error}`))
                    .then(
                        () =>
                            loadRemote(`${uniqueName}/Components`) as Promise<{
                                default: Record<string, WidgetComponent>;
                            }>,
                    );
            runningLoads[loadKey] = setPromise;
        } catch (error) {
            throw new Error(`Cannot register remote "${adapterName}" from ${url}: ${error}`);
        }
    }

    const module = await setPromise;

    // Debug: check if the plugin received the same React
    try {
        const pluginReact = (module as any)?.__esModule ? undefined : (module as any)?.React;
        if (pluginReact && pluginReact !== React) {
            console.error(
                '[MF] REACT MISMATCH! Plugin has different React instance. Host:',
                React.version,
                'Plugin:',
                pluginReact.version,
            );
        }
    } catch {
        // ignore
    }

    // The exposed "Components" module exports { ComponentName: Class, ... } as default
    const components = module?.default as Record<string, WidgetComponent> | undefined;
    const Component = components?.[componentName];

    if (!Component) {
        const available = components ? Object.keys(components).join(', ') : 'none';
        throw new Error(
            `Plugin component "${componentName}" not found from adapter "${adapterName}" (url: ${url}). Available: ${available}`,
        );
    }

    componentCache.set(cacheKey, Component);
    return Component;
}

/** Check if a plugin component is already loaded (cached) */
export function isPluginLoaded(adapterName: string, componentName: string): boolean {
    return componentCache.has(`${adapterName}/${componentName}`);
}

/**
 * Get the config schema from a loaded plugin component's static getConfigSchema() method.
 * Returns null if the component is not loaded or has no getConfigSchema.
 */
export function getPluginConfigSchema(
    adapterName: string,
    componentName: string,
): { name: string; schema: ConfigItemPanel | ConfigItemTabs } | null {
    const Component = componentCache.get(`${adapterName}/${componentName}`);
    if (!Component) {
        return null;
    }
    const getSchema = (Component as unknown as Record<string, unknown>).getConfigSchema;
    if (typeof getSchema === 'function') {
        return getSchema() as { name: string; schema: ConfigItemPanel | ConfigItemTabs } | null;
    }
    return null;
}
